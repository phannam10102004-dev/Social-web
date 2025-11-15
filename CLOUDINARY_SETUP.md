# Hướng dẫn tích hợp Cloudinary cho dự án

## Bước 1: Đăng ký tài khoản Cloudinary

1. Truy cập: **https://cloudinary.com/users/register/free**
2. Đăng ký bằng email (có thể dùng email sinh viên)
3. Sau khi đăng ký, vào **Dashboard** → **Settings** → **Account Details**
4. Copy các thông tin sau:
   - **Cloud name** (ví dụ: `dabc123`)
   - **API Key** (ví dụ: `123456789012345`)
   - **API Secret** (ví dụ: `abcdefghijklmnopqrstuvwxyz123456`)

## Bước 2: Thêm Environment Variables vào Render.com

1. Vào **Render Dashboard** → Chọn service backend của bạn
2. Vào tab **Environment**
3. Thêm 3 biến môi trường mới:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Lưu ý:** Thay `your_cloud_name`, `your_api_key`, `your_api_secret` bằng giá trị thật từ Cloudinary Dashboard.

4. Click **Save Changes**
5. Render sẽ tự động redeploy service

## Bước 3: Test local (tùy chọn)

Nếu muốn test local, thêm vào file `.env` trong thư mục `backend/`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Bước 4: Kiểm tra hoạt động

Sau khi deploy xong, test các chức năng:

1. **Upload ảnh đại diện:**

   - Vào profile → Edit → Upload avatar
   - Kiểm tra URL trả về có dạng: `https://res.cloudinary.com/your_cloud_name/image/upload/v1234567890/user/...`

2. **Upload ảnh bài viết:**

   - Tạo post mới với ảnh
   - Kiểm tra ảnh hiển thị đúng

3. **Upload file tin nhắn:**
   - Gửi ảnh/file trong chat
   - Kiểm tra file hiển thị và download được

## Cấu trúc thư mục trên Cloudinary

Sau khi upload, ảnh sẽ được tổ chức như sau:

```
your_cloud_name/
├── user/          (Ảnh đại diện)
│   └── [auto-generated-id].jpg
├── posts/         (Ảnh bài viết)
│   └── [auto-generated-id].jpg
└── messages/      (File/ảnh tin nhắn)
    └── [auto-generated-id].jpg
```

## Lưu ý quan trọng

### 1. Backward Compatibility

- Code đã được cập nhật để hỗ trợ cả Cloudinary URL (full URL) và local path
- Ảnh cũ trong database vẫn hoạt động bình thường
- Ảnh mới sẽ tự động upload lên Cloudinary

### 2. Image Optimization

Cloudinary tự động:

- ✅ Optimize quality (giảm dung lượng)
- ✅ Convert sang WebP nếu browser support
- ✅ Resize theo nhu cầu (có thể thêm transformation)

### 3. Xóa ảnh cũ (Tùy chọn - nâng cao)

Nếu muốn xóa ảnh cũ khi user cập nhật avatar/post, có thể:

1. Lưu `publicId` vào database:

   ```javascript
   // User model - thêm field
   profilePicturePublicId: String;

   // Post model - thêm field
   filePublicId: String;
   ```

2. Khi upload mới, xóa ảnh cũ:

   ```javascript
   const { deleteFromCloudinary } = require("../utils/uploadHelper");

   if (oldPublicId) {
     await deleteFromCloudinary(oldPublicId);
   }
   ```

### 4. Migration dữ liệu cũ (Tùy chọn)

Nếu muốn upload lại ảnh cũ lên Cloudinary:

- Cần script migration để đọc ảnh từ local và upload lên Cloudinary
- Update database với URL mới
- Có thể làm sau, không bắt buộc

## Chi phí

- **Free tier**:
  - 25GB storage
  - 25GB bandwidth/tháng
  - Đủ cho project nhỏ/medium
- **Nếu vượt quá**: $89/tháng cho 25GB thêm (nhưng free tier đã rất nhiều)

## Troubleshooting

### Lỗi: "Invalid API Key"

- Kiểm tra lại environment variables trên Render
- Đảm bảo không có khoảng trắng thừa
- Redeploy service sau khi thêm env vars

### Lỗi: "Upload failed"

- Kiểm tra file size (Cloudinary free tier giới hạn 10MB/file)
- Kiểm tra file format (hỗ trợ: jpg, png, gif, webp, pdf, etc.)
- Xem logs trên Render để biết lỗi chi tiết

### Ảnh không hiển thị

- Kiểm tra URL trả về có đúng format Cloudinary không
- Kiểm tra CORS settings (Cloudinary tự động cho phép)
- Kiểm tra browser console có lỗi gì không

## Tài liệu tham khảo

- Cloudinary Docs: https://cloudinary.com/documentation
- Node.js SDK: https://cloudinary.com/documentation/node_integration
- Image Transformations: https://cloudinary.com/documentation/image_transformations

## Kết luận

Sau khi setup xong:

- ✅ Ảnh sẽ được lưu trên Cloudinary (không mất khi server restart)
- ✅ Có CDN tự động (tải ảnh nhanh hơn)
- ✅ Tự động optimize ảnh (giảm dung lượng)
- ✅ Hỗ trợ nhiều format (WebP, AVIF, etc.)

**Lưu ý:** Sau khi thêm environment variables trên Render, nhớ **redeploy** service để áp dụng thay đổi!
