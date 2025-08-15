const router = require('express').Router()
const User = require('../models/User.js')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const xoauth2 = require('xoauth2')
const sanitize = require('mongo-sanitize')

// Comment out email transporter
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     type: 'OAuth2',
//     user: process.env.AUTH_USER_EMAIL,
//     clientId: process.env.AUTH_CLIENT_ID,
//     clientSecret: process.env.AUTH_CLIENT_SECRET,
//     refreshToken: process.env.AUTH_REFRESH_TOKEN,
//     accessToken: process.env.AUTH_ACCESS_TOKEN,
//   },
// })

//REGISTER
router.post('/register', async (req, res) => {
  try {
    const sanitizedEmail = sanitize(req.sanitize(req.body.email))
    const sanitizedPassword = sanitize(req.sanitize(req.body.password))
    const sanitizedDisplayName = sanitize(req.sanitize(req.body.displayName))

    const salt = await bcrypt.genSalt(10)
    const hashedPass = await bcrypt.hash(sanitizedPassword, salt)

    const newUser = new User({
      email: sanitizedEmail,
      password: hashedPass,
      displayName: sanitizedDisplayName,
      confirmed: true // Automatically set to true
    })

    const user = await newUser.save()

    // Comment out email verification
    // jwt.sign(
    //   {
    //     userId: user._id,
    //   },
    //   process.env.EMAIL_SECRET,
    //   {
    //     expiresIn: '1d',
    //   },
    //   (err, emailToken) => {
    //     const url = `http://localhost:3000/api/auth/confirmation/${emailToken}`
    //
    //     transporter.sendMail({
    //       from: 'Island <ceylan.furkan100@gmail.com>',
    //       to: user.email,
    //       subject: 'Confirm Email',
    //       html: `Please click this email to confirm your email: <a href="${url}">${url}</a>`,
    //     })
    //   }
    // )

    return res.status(200).json(user)
  } catch (err) {
    return res.status(500).json(err)
  }
})

//UPLOAD
router.post('/upload', (req, res) => {
  const file = req.files.file
  file.mv('uploads/user/' + file.name, function (err) {
    if (err) {
      console.log(err)
    } else {
      console.log('uploaded')
    }
  })
  return res.json({ file: req.body.file })
})

let refreshTokens = []

//REFRESH TOKENS
router.post('/token', async (req, res) => {
  const refreshToken = req.body.token
  if (refreshToken == null) return res.sendStatus(401)
  if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403)
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || "default_refresh_secret_key_123456", (err) => {
    if (err) return res.sendStatus(403)
    const accessToken = jwt.sign(
      { userId: userLogin._id },
      process.env.ACCESS_TOKEN_SECRET || "default_access_secret_key_123456",
      { expiresIn: '1d' }
    )
    res.status(200).json({ token: accessToken })
  })
})

//LOGIN
router.post('/login', async (req, res) => {
  try {
    console.log("Login attempt with:", req.body.email);
    
    // Kiểm tra biến môi trường
    console.log("ACCESS_TOKEN_SECRET exists:", process.env.ACCESS_TOKEN_SECRET ? "yes" : "no");
    
    const userLogin = await User.findOne({
      email: req.body.email,
    })

    if (!userLogin) {
      console.log("User not found");
      return res.status(404).json({ error: 'User not found' });
    }

    // Comment out email confirmation check
    // if (!userLogin.confirmed) return res.status(400).json({ error: 'Email not confirmed' })
    
    console.log("User found, checking password");
    const validPassword = await bcrypt.compare(
      req.body.password,
      userLogin.password
    )
    
    if (!validPassword) {
      console.log("Invalid password");
      return res.status(400).json({ error: 'Wrong password' });
    }

    // Sử dụng giá trị mặc định nếu biến môi trường không tồn tại
    const secretKey = process.env.ACCESS_TOKEN_SECRET || "default_access_secret_key_123456";
    const refreshSecretKey = process.env.REFRESH_TOKEN_SECRET || "default_refresh_secret_key_123456";
    
    console.log("Creating tokens");
    
    const accessToken = jwt.sign(
      { userId: userLogin._id },
      process.env.ACCESS_TOKEN_SECRET || "default_access_secret_key_123456",
      { expiresIn: '1d' }
    )

    const refreshToken = jwt.sign(
      { userId: userLogin._id },
      process.env.REFRESH_TOKEN_SECRET || "default_refresh_secret_key_123456"
    )

    refreshTokens.push(refreshToken)
    
    console.log("Login successful");
    return res
      .status(200)
      .json({ user: userLogin, token: accessToken, refreshToken: refreshToken })
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" })
  }
})

router.get('/user', async (req, res) => {
  let token = req.headers.token

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || "default_access_secret_key_123456", async (err, decoded) => {
    if (err) {
      return res.status(401).json({
        message: 'unauthorized',
      })
    }

    await User.findOne({ _id: decoded.userId }, (err, user) => {
      if (err) return console.log(err)
      return res.status(200).json({
        title: 'user grabbed',
        user: user,
      })
    })
  })
})

router.post('/logout', async (req, res) => {
  refreshTokens = refreshTokens.filter((token) => token !== req.body.token)

  res.cookie('jwt', '', {
    maxAge: 0,
  })

  res.send({
    message: 'logout success',
  })
})

router.get('/confirmation/:token', async (req, res) => {
  const decoded = jwt.decode(req.params.token, process.env.EMAIL_SECRET)
  await User.findOne({ _id: decoded.userId }).then((user) => {
    if (!user) {
      return res.status(401).json('Email confirmation failed')
    }

    user.confirmed = true
    user.save().then((user) => {
      return res.send(user)
    })

    return res.redirect('http://localhost:8080/login')
  })
})

module.exports = router