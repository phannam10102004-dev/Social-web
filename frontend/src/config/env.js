const DEFAULT_API_BASE_URL = "https://social-web-hxaf.onrender.com/api";
const DEFAULT_SOCKET_BASE_URL = "https://social-web-hxaf.onrender.com";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
const SOCKET_BASE_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API_BASE_URL.replace(/\/api\/?$/, "") ||
  DEFAULT_SOCKET_BASE_URL;
const UPLOAD_BASE_URL = import.meta.env.VITE_UPLOAD_BASE_URL || SOCKET_BASE_URL;
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "749220537519-beauagaft0dmdc9uf2ije8fo0mrdc9jd.apps.googleusercontent.com";

const buildAssetUrl = (path = "") => {
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
