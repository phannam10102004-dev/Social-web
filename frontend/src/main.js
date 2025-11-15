import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import "ant-design-vue/dist/reset.css";
import Antd from "ant-design-vue";
import vue3GoogleLogin from "vue3-google-login";
import {
  GOOGLE_CLIENT_ID,
  UPLOAD_BASE_URL,
  buildAssetUrl,
  buildProfilePictureUrl,
} from "./config/env";

const app = createApp(App);

// Initialize Google Login với Client ID
app.use(vue3GoogleLogin, {
  clientId: GOOGLE_CLIENT_ID,
});

app.use(store);
app.use(router);
app.use(Antd);

app.config.globalProperties.$uploadBaseUrl = UPLOAD_BASE_URL;
app.config.globalProperties.$buildAssetUrl = buildAssetUrl;
app.config.globalProperties.$buildProfilePictureUrl = buildProfilePictureUrl;

app.mount("#app");
