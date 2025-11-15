// Auto-detect environment: local or production
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "");

// Backend URLs
const LOCAL_API_BASE_URL = "http://localhost:3000/api";
const LOCAL_SOCKET_BASE_URL = "http://localhost:3000";
const PROD_API_BASE_URL = "https://social-web-hxaf.onrender.com/api";
const PROD_SOCKET_BASE_URL = "https://social-web-hxaf.onrender.com";

// Use local backend when running locally, production backend when deployed
// Environment variable takes priority (for manual override)
const API_BASE_URL =
  process.env.VUE_APP_API_BASE_URL ||
  (isLocal ? LOCAL_API_BASE_URL : PROD_API_BASE_URL);

const SOCKET_BASE_URL =
  process.env.VUE_APP_SOCKET_URL ||
  (isLocal ? LOCAL_SOCKET_BASE_URL : PROD_SOCKET_BASE_URL) ||
  API_BASE_URL.replace(/\/api\/?$/, "");

const UPLOAD_BASE_URL = process.env.VUE_APP_UPLOAD_BASE_URL || SOCKET_BASE_URL;

// Debug log (only in development)
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  console.log("🔧 Environment config:", {
    isLocal,
    API_BASE_URL,
    SOCKET_BASE_URL,
    hostname: window.location.hostname,
  });
}
const GOOGLE_CLIENT_ID =
  process.env.VUE_APP_GOOGLE_CLIENT_ID ||
  "749220537519-beauagaft0dmdc9uf2ije8fo0mrdc9jd.apps.googleusercontent.com";

const buildAssetUrl = (path = "") => {
  // Nếu path đã là full URL (Cloudinary hoặc external URL), return luôn
  if (path && (path.startsWith("http://") || path.startsWith("https://"))) {
    return path;
  }

  // Nếu là local path, build URL như cũ (cho backward compatibility)
  if (!path) return "";

  const base = UPLOAD_BASE_URL.replace(/\/$/, "");
  const normalized = path.replace(/^\//, "");
  return `${base}/${normalized}`;
};

/**
 * Build URL cho profile picture
 * Xử lý cả Cloudinary URL (full URL) và local path
 */
const buildProfilePictureUrl = (profilePicture = "") => {
  // Nếu đã là full URL (Cloudinary), return luôn
  if (
    profilePicture &&
    (profilePicture.startsWith("http://") ||
      profilePicture.startsWith("https://"))
  ) {
    return profilePicture;
  }

  // Nếu là local path, thêm prefix uploads/user/
  if (!profilePicture) return "";

  return buildAssetUrl(`uploads/user/${profilePicture}`);
};

export {
  API_BASE_URL,
  SOCKET_BASE_URL,
  UPLOAD_BASE_URL,
  GOOGLE_CLIENT_ID,
  buildAssetUrl,
  buildProfilePictureUrl,
};
