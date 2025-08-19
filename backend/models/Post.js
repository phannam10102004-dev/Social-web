const mongoose = require('mongoose')

const PostSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      max: 500,
      default: '',
    },
    displayName: {
      type: String,
      default: '',
    },
    file: {
      type: String,
      default: '',
    },
    comments: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Post', PostSchema)
