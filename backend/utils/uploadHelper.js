const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

/**
 * Upload file to Cloudinary
 * @param {Object} file - File object from express-fileupload
 * @param {String} folder - Folder name in Cloudinary (e.g., 'user', 'posts', 'messages')
 * @returns {Promise<Object>} Cloudinary upload result with secure_url and public_id
 */
const uploadToCloudinary = (file, folder = "uploads") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto", // auto-detect image, video, raw
        transformation: [
          { quality: "auto" }, // Auto optimize quality
          { fetch_format: "auto" }, // Auto format (webp, etc)
        ],
      },
      (error, result) => {
        if (error) {
          console.error("❌ Lỗi upload lên Cloudinary:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Convert file buffer to stream
    const bufferStream = new Readable();
    bufferStream.push(file.data);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Cloudinary public_id
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
};
