const DEFAULT_API_BASE_URL = "https://social-web-hxaf.onrender.com/api";
const DEFAULT_SOCKET_BASE_URL = "https://social-web-hxaf.onrender.com";

const API_BASE_URL = process.env.VUE_APP_API_BASE_URL || DEFAULT_API_BASE_URL;
const SOCKET_BASE_URL =
  process.env.VUE_APP_SOCKET_URL ||
  API_BASE_URL.replace(/\/api\/?$/, "") ||
  DEFAULT_SOCKET_BASE_URL;
const UPLOAD_BASE_URL = process.env.VUE_APP_UPLOAD_BASE_URL || SOCKET_BASE_URL;
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

export {
  API_BASE_URL,
  SOCKET_BASE_URL,
  UPLOAD_BASE_URL,
  GOOGLE_CLIENT_ID,
  buildAssetUrl,
};
