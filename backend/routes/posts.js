const router = require('express').Router()
const Post = require('../models/Post.js')
const User = require('../models/User.js')
const Comment = require('../models/Comment.js')
const mongoSanitize = require('express-mongo-sanitize')
const sanitize = require('mongo-sanitize')

//CREATE POST
router.post('/', async (req, res) => {
  try {
    const sanitizedDesc = sanitize(req.sanitize(req.body.description))
    const sanitizedUserId = sanitize(req.sanitize(req.body.userId))
    const sanitizedFile = sanitize(req.sanitize(req.body.file))

    const newPost = new Post({
      description: sanitizedDesc,
      userId: sanitizedUserId,
      file: sanitizedFile
    })

    const createPost = await newPost.save()
    return res.status(200).json(createPost)
  } catch (err) {
    return res.status(500).json(err)
  }
})

//UPLOAD
router.post('/upload', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: "Không tìm thấy file" });
  }
  
  const file = req.files.file;
  
  // Tạo tên file an toàn (tránh trùng lặp)
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filename = uniqueSuffix + '-' + file.name;
  
  file.mv('uploads/' + filename, function (err) {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Lỗi khi upload file" });
    } else {
      console.log('uploaded');
      return res.json({ file: filename });
    }
  });
})

//COMMENT POST
router.put('/:id/comment', async (req, res) => {
  try {
    const sanitizedUserId = sanitize(req.sanitize(req.body.userId))
    const sanitizedPostId = sanitize(req.sanitize(req.params.id))
    const sanitizedComment = sanitize(req.sanitize(req.body.comment))
    const sanitizedDisplayName = sanitize(req.sanitize(req.body.displayName))
    const sanitizedFile = sanitize(req.sanitize(req.body.file))
    const sanitizedisText = sanitize(req.sanitize(req.body.isTextComment))

    const post = await Post.findById(req.params.id)

    const comment = await new Comment({
      userId: sanitizedUserId,
      postId: sanitizedPostId,
      comment: sanitizedComment,
      isTextComment: sanitizedisText,
      displayName: sanitizedDisplayName,
      file: sanitizedFile,
    })
    await post.updateOne({ $push: { comments: req.body } })
    const addComment = await comment.save()
    return res.status(200).json(addComment)
  } catch (err) {
    return res.status(500).json(err)
  }
})

//GET POSTS COMMENTS
router.get('/:id/comments', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    const comment = await Comment.find({ postId: post._id })
    return res.status(200).json(comment)
  } catch (err) {
    return res.status(500).json(err)
  }
})

//GET A POST
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    return res.status(200).json(post)
  } catch (err) {
    return res.status(500).json(err)
  }
})

//GET FRIENDS POSTS
router.get('/timeline/:userId', async (req, res) => {
  try {
    const currentUser = await User.findById(req.params.userId)
    const userPosts = await Post.find({ userId: currentUser._id })
    const friendPosts = await Promise.all(
      currentUser.followings.map((friendId) => {
        return Post.find({ userId: friendId })
      })
    )
    return res.json(userPosts.concat(...friendPosts))
  } catch (err) {
    return res.status(500).json(err)
  }
})

//GET USER'S POSTS
router.get('/:userId/posts', async (req, res) => {
  try {
    const currentUser = await User.findById(req.params.userId)
    const userPosts = await Post.find({ userId: currentUser._id })

    return res.status(200).json(userPosts)
  } catch (err) {
    return res.status(500).json(err)
  }
})
module.exports = router
