const express = require('express')
const app = express()
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const helmet = require('helmet')
const morgan = require('morgan')
const cors = require('cors')
const fileupload = require('express-fileupload')
const expressSanitizer = require('express-sanitizer')
const sanitize = require('mongo-sanitize')

const userRoute = require('./routes/users')
const authRoute = require('./routes/auth')
const postRoute = require('./routes/posts')

dotenv.config()

// Kiểm tra biến môi trường
console.log("MONGO_URL exists:", process.env.MONGO_URL ? "yes" : "no");
console.log("dotenv path:", require('path').resolve('.env'));

// Sử dụng connection string hardcode tạm thời nếu biến môi trường không tồn tại
const mongoUri = process.env.MONGO_URL || "mongodb+srv://nam_phan_2k4:nam10102004@island.d3uici2.mongodb.net/?retryWrites=true&w=majority&appName=Island";

mongoose.connect(
  mongoUri,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log('connected to mongodb')
  }
)

app.use(express.json())
app.use(helmet())
app.use(morgan('common'))
app.use(cors({ credentials: true, origin: 'http://localhost:8080' }))
app.use(fileupload())
app.use('/uploads', express.static('uploads'))
app.use(expressSanitizer())

app.use('/api/users', userRoute)
app.use('/api/auth', authRoute)
app.use('/api/posts', postRoute)

app.listen(3000, () => {
  console.log('backend server is running!')
})
