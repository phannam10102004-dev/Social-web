const router = require('express').Router()
const User = require('../models/User.js')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const xoauth2 = require('xoauth2')
const sanitize = require('mongo-sanitize')
const mongoose = require('mongoose')
require('dotenv').config()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'phannam10102004@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD
  }
})

//REGISTER
router.post('/register', async (req, res) => {
  try {
    const sanitizedEmail = sanitize(req.sanitize(req.body.email))
    const sanitizedPassword = sanitize(req.sanitize(req.body.password))
    const sanitizedDisplayName = sanitize(req.sanitize(req.body.displayName))

    // Check if user already exists
    const existingUser = await User.findOne({ email: sanitizedEmail })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPass = await bcrypt.hash(sanitizedPassword, salt)

    // Create user object but don't save yet
    const newUser = new User({
      email: sanitizedEmail,
      password: hashedPass,
      displayName: sanitizedDisplayName
    })
    
    // Generate a temporary ID for the verification link
    const tempId = new mongoose.Types.ObjectId()
    
    // Create email token with the user email and ID
    const emailToken = jwt.sign(
      {
        email: sanitizedEmail,
        userId: tempId,
      },
      process.env.EMAIL_SECRET,
      {
        expiresIn: '1d',
      }
    )
    
    const url = `http://localhost:3000/api/auth/confirmation/${emailToken}`
    
    // Try to send email first
    try {
      await transporter.sendMail({
        from: 'Social Web <phannam10102004@gmail.com>',
        to: sanitizedEmail,
        subject: 'Xác nhận email',
        html: `Vui lòng nhấp vào liên kết này để xác thực email của bạn: <a href="${url}">${url}</a>`,
      })
      
      // Email sent successfully, now save the user
      const user = await newUser.save()
      return res.status(200).json({ 
        user: user,
        message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản của bạn.'
      })
      
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr)
      return res.status(500).json({ 
        error: 'Không thể gửi email xác thực', 
        details: emailErr.message 
      })
    }
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
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err) => {
    if (err) return res.sendStatus(403)
    const accessToken = jwt.sign(
      { userId: userLogin._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1d' }
    )
    res.status(200).json({ token: accessToken })
  })
})

//LOGIN
router.post('/login', async (req, res) => {
  try {
    const userLogin = await User.findOne({
      email: req.body.email,
    })

    if (!userLogin) return res.status(404).json({ error: 'User not found' })

    if (!userLogin.confirmed) return res.status(400).json({ error: 'Email not confirmed' })

    const validPassword = await bcrypt.compare(
      req.body.password,
      userLogin.password
    )
    if (!validPassword) return res.status(400).json({ error: 'Wrong password' })

    const accessToken = jwt.sign(
      { userId: userLogin._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '1d' }
    )

    const refreshToken = jwt.sign(
      { userId: userLogin._id },
      process.env.REFRESH_TOKEN_SECRET
    )

    refreshTokens.push(refreshToken)

    return res
      .status(200)
      .json({ user: userLogin, token: accessToken, refreshToken: refreshToken })
  } catch (err) {
    return res.status(500).json(err)
  }
})

router.get('/user', async (req, res) => {
  let token = req.headers.token

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
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
  try {
    // Verify the token instead of just decoding it
    const decoded = jwt.verify(req.params.token, process.env.EMAIL_SECRET)
    
    // Find user by email since we're using a temporary ID before user creation
    const user = await User.findOne({ email: decoded.email })
    
    if (!user) {
      return res.status(401).json('Email confirmation failed: User not found')
    }

    // Update user confirmation status
    user.confirmed = true
    await user.save()
    
    // Redirect to login page
    return res.redirect('http://localhost:8080/login')
  } catch (err) {
    console.error('Token verification failed:', err)
    return res.status(400).json({
      error: 'Email confirmation failed: Invalid or expired token',
      details: err.message
    })
  }
})

module.exports = router
