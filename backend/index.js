const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:8080"];
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const fileupload = require("express-fileupload");
const expressSanitizer = require("express-sanitizer");
const sanitize = require("mongo-sanitize");
const session = require("express-session");
const passport = require("./config/passport");

const userRoute = require("./routes/users");
const authRoute = require("./routes/auth");
const postRoute = require("./routes/posts");
const notificationRoute = require("./routes/notifications");
const messageRoute = require("./routes/messages");
const followRequestRoute = require("./routes/followRequests");

dotenv.config();
console.log("MONGO_URL after load:", process.env.MONGO_URL);

mongoose.connect(
  process.env.MONGO_URL,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log("✅ Đã kết nối MongoDB");
  }
);

app.use(express.json());
app.use(
  helmet({
    crossOriginOpenerPolicy: false, // Disable COOP for Google OAuth compatibility
    crossOriginEmbedderPolicy: false, // Disable COEP for Google OAuth compatibility
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
        connectSrc: ["'self'", "https://accounts.google.com"],
      },
    },
  })
);
app.use(morgan("common"));
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:8080"];
app.use(
  cors({
    credentials: true,
    origin: corsOrigins,
    optionsSuccessStatus: 200,
  })
);
app.use(fileupload());

// Serve static files from uploads directory with fallback for missing files
app.get("/uploads/*", (req, res) => {
  try {
    // Extract the file path after /uploads/ and decode URL encoding (e.g., %20 -> space)
    let relativePath = req.path.replace("/uploads/", "");
    try {
      relativePath = decodeURIComponent(relativePath);
    } catch (decodeError) {
      // If decode fails, use original path
      console.warn("⚠️  Lỗi giải mã đường dẫn URL:", relativePath);
    }

    const filePath = path.join(__dirname, "uploads", relativePath);

    // Security: prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    const uploadsDir = path.resolve(path.join(__dirname, "uploads"));
    if (!resolvedPath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if file exists
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      // File exists, serve it
      return res.sendFile(filePath);
    } else {
      // File doesn't exist (old image on ephemeral file system)
      // Return 404 with helpful message
      console.warn(
        `⚠️  Không tìm thấy ảnh: ${req.path} - Đây có thể là ảnh cũ được lưu cục bộ`
      );
      return res.status(404).json({
        error: "Image not found",
        message:
          "This image was stored locally and is no longer available on the server. Please re-upload your profile picture.",
        path: req.path,
      });
    }
  } catch (error) {
    console.error("❌ Lỗi khi phục vụ file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.use(expressSanitizer());

// Session & Passport middleware
app.use(
  session({
    secret: process.env.ACCESS_TOKEN_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Make io available globally
app.set("io", io);

app.use("/api/users", userRoute);
app.use("/api/auth", authRoute);
app.use("/api/posts", postRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/messages", messageRoute);
app.use("/api/follow-requests", followRequestRoute);

// WebSocket Authentication & Events
require("./socket/socketHandler")(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Backend server đang chạy trên cổng ${PORT}!`);
});
