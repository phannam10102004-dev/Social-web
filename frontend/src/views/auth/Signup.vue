<template>
  <article class="signup">
    <div class="card card--accent">
      <div class="logo-row">
        <img class="card__logo" src="../../assets/logo.png" />
        <span class="joynet-logo-text">Joynet</span>
      </div>

      <h2 class="card__text">Đăng ký để tiếp tục</h2>
      <label class="input">
        <input
          class="input__field"
          type="text"
          placeholder=" "
          v-model="email"
          :class="{
            'input-error': (fillError && !email) || showEmailError,
          }"
        />
        <span class="input__label">E-mail</span>
      </label>
      <label class="input password-input">
        <input
          class="input__field"
          :type="showPassword ? 'text' : 'password'"
          placeholder=" "
          v-model="password"
          :class="{ 'input-error': fillError && !password }"
        />
        <span class="input__label">Mật khẩu</span>
        <button
          type="button"
          class="toggle-password-btn"
          @click="showPassword = !showPassword"
          :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
        >
          <span v-if="showPassword">🙈</span>
          <span v-else>👁️</span>
        </button>
      </label>
      <label class="input">
        <input
          class="input__field"
          type="text"
          placeholder=" "
          v-model="displayName"
          :class="{ 'input-error': fillError && !displayName }"
        />
        <span class="input__label">Tên hiển thị</span>
      </label>
      <p class="warn" v-if="fillError">Vui lòng điền đủ thông tin</p>
      <p class="warn" v-if="email && !emailError && showEmailError">
        Vui lòng nhập địa chỉ email hợp lệ
      </p>
      <p class="warn" v-if="signupError">{{ signupError }}</p>
      <div class="button-group">
        <div class="button-group-left">
          <div class="signup-button-loader" v-if="!signupLoading">
            <button @click="signUp">Đăng ký</button>
          </div>
          <div class="signup-button-loader" v-else>
            <SyncLoader class="signup-loader" :color="color" />
          </div>
        </div>
        <div class="button-group-right">
          <router-link to="/login" v-if="!signupLoading">
            <button>Bạn đã có tài khoản?</button>
          </router-link>
        </div>
      </div>

      <!-- Google Signup Divider -->
      <div class="divider-row">
        <span class="divider-line"></span>
        <span class="divider-text">hoặc</span>
        <span class="divider-line"></span>
      </div>
      <!-- Google Signup Button -->
      <button class="google-login-btn" @click="signUpWithGoogle">
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google logo"
          class="google-logo"
        />
        Đăng ký bằng Google
      </button>
    </div>
  </article>
</template>

<script>
import SyncLoader from "vue-spinner/src/SyncLoader.vue";

export default {
  name: "Signup",
  components: { SyncLoader },
  data() {
    return {
      email: "",
      password: "",
      displayName: "",
      fillError: false,
      emailError: false,
      showEmailError: false,
      signupLoading: false,
      showPassword: false,
      signupError: "",
      color: "pink",
    };
  },
  mounted() {
    // Kiểm tra URL params để xử lý Google OAuth callback
    this.handleGoogleCallback();
  },
  watch: {
    email() {
      this.resetErrors();
    },
    password() {
      this.resetErrors();
    },
    displayName() {
      this.resetErrors();
    },
  },
  methods: {
    resetErrors() {
      this.signupError = "";
      this.fillError = false;
      this.emailError = false;
      this.showEmailError = false;
    },
    async signUpWithGoogle() {
      try {
        this.signupLoading = true;
        this.signupError = "";

        // Sử dụng redirect flow như Login (vì đăng ký và đăng nhập Google về bản chất là giống nhau)
        const clientId =
          "749220537519-beauagaft0dmdc9uf2ije8fo0mrdc9jd.apps.googleusercontent.com";
        const redirectUri = `${this.$uploadBaseUrl}/api/auth/google/callback`;
        const scope = "openid email profile";

        // Tạo nonce để bảo vệ CSRF
        const nonce = this.generateSecureNonce();
        localStorage.setItem("google_auth_nonce", nonce);

        // Tạo Google OAuth URL
        const googleAuthUrl =
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent(scope)}` +
          `&state=${nonce}` +
          `&access_type=offline` +
          `&prompt=consent`;

        console.log("Redirecting to Google OAuth for signup");

        // Redirect đến Google OAuth
        window.location.href = googleAuthUrl;
      } catch (error) {
        console.error("Google signup error:", error);
        this.signupError = "Đăng ký Google thất bại. Vui lòng thử lại.";
        this.signupLoading = false;
      }
    },

    // Tạo nonce an toàn để ngăn chặn CSRF
    generateSecureNonce() {
      const array = new Uint32Array(4);
      window.crypto.getRandomValues(array);
      return Array.from(array, (dec) =>
        ("0" + dec.toString(16)).substr(-2)
      ).join("");
    },

    // Xử lý Google OAuth callback
    handleGoogleCallback() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        const success = urlParams.get("success");
        const error = urlParams.get("error");

        // Log thông tin để debug
        if (success || error || token) {
          console.log("Google signup callback received:", {
            success,
            error,
            hasToken: !!token,
            url: window.location.href,
          });
        }

        // Kiểm tra nonce nếu có state
        const state = urlParams.get("state");
        const storedNonce = localStorage.getItem("google_auth_nonce");
        if (state && storedNonce && state !== storedNonce) {
          console.error("Security warning: OAuth state/nonce mismatch");
          this.signupError = "Lỗi bảo mật: Phiên xác thực không hợp lệ";
          localStorage.removeItem("google_auth_nonce");
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
          return;
        }

        // Xóa nonce sau khi sử dụng
        if (storedNonce) {
          localStorage.removeItem("google_auth_nonce");
        }

        if (token && success === "google_login") {
          // Kiểm tra token hợp lệ
          if (!token || typeof token !== "string" || token.length < 20) {
            console.error("Invalid token format received");
            this.signupError = "Lỗi xác thực: Token không hợp lệ";
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
            return;
          }

          // Lưu token và chuyển hướng
          localStorage.setItem("token", token);
          console.log("Google signup successful - token saved");

          // Clear URL params
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          // Redirect to home
          setTimeout(() => {
            this.$router.push("/home");
          }, 50);
        } else if (error) {
          // Xử lý lỗi
          if (error === "google_auth_failed") {
            this.signupError = "Đăng ký Google thất bại. Vui lòng thử lại.";
          } else {
            this.signupError = `Lỗi xác thực: ${error}`;
          }

          console.warn("Google signup error:", error);
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      } catch (e) {
        console.error("Error processing Google signup callback:", e);
        this.signupError = "Lỗi xử lý phản hồi từ Google. Vui lòng thử lại.";
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
    },
    validateEmail() {
      return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(this.email);
    },
    async signUp() {
      // Reset states
      this.signupLoading = true;
      this.signupError = "";
      this.fillError = false;
      this.showEmailError = false;

      // Validate inputs
      if (!this.email || !this.password || !this.displayName) {
        this.fillError = true;
        this.signupLoading = false;
        return;
      }

      if (!this.validateEmail()) {
        this.showEmailError = true;
        this.signupLoading = false;
        return;
      }

      const axios = (await import("@/utils/axios")).default;
      try {
        const response = await axios.post(
          "/auth/register",
          {
            email: this.email,
            password: this.password,
            displayName: this.displayName,
          },
          {
            withCredentials: true,
          }
        );
        // Reset form
        this.email = "";
        this.password = "";
        this.displayName = "";
        await this.$router.push("/login");
      } catch (error) {
        if (error.response && error.response.status === 400) {
          this.signupError =
            error.response.data.error ||
            error.response.data.message ||
            "Email đã được sử dụng.";
        } else if (error.response && error.response.status === 500) {
          this.signupError = "Lỗi server. Vui lòng thử lại sau.";
        } else if (error.response && error.response.status === 422) {
          this.signupError =
            error.response.data.error ||
            error.response.data.message ||
            "Dữ liệu không hợp lệ.";
        } else if (
          error.response &&
          (error.response.data.error || error.response.data.message)
        ) {
          this.signupError =
            error.response.data.error || error.response.data.message;
        } else {
          this.signupError =
            "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
        }
      } finally {
        this.signupLoading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.signup {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  position: relative;
  overflow: hidden;

  /* Animated Gradient Background */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  &::before {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.1) 1px,
      transparent 1px
    );
    background-size: 50px 50px;
    animation: moveBackground 20s linear infinite;
  }
}

@keyframes moveBackground {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(50px, 50px);
  }
}

.card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 480px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  padding: 2.5rem;
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  animation: slideUp 0.4s ease;

  &--accent {
    --color-background: var(--white);
    color: var(--gray-900);
  }

  &__logo {
    width: 64px;
    height: 64px;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
  }

  &__text {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: 2rem;
    text-align: center;
    font-family: var(--font-display);
  }
}

.logo-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.joynet-logo-text {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 2rem;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 4px rgba(102, 126, 234, 0.2));
}

.input {
  position: relative;
  margin-bottom: 1.75rem;

  &__field {
    box-sizing: border-box;
    display: block;
    width: 100%;
    border: 2px solid var(--gray-200);
    padding: 0.875rem 1rem;
    color: var(--gray-900);
    background: var(--white);
    border-radius: var(--radius-lg);
    font-size: 0.9375rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);

      & + .input__label {
        transform: translate(-0.25rem, -50%) scale(0.85);
        color: var(--primary);
        background: rgba(255, 255, 255, 0.98);
        padding: 0 0.5rem;
        font-weight: 600;
        top: 0;
      }
    }

    &:not(:placeholder-shown) {
      & + .input__label {
        transform: translate(-0.25rem, -50%) scale(0.85);
        color: var(--gray-600);
        background: rgba(255, 255, 255, 0.98);
        padding: 0 0.5rem;
        font-weight: 600;
        top: 0;
      }
    }
  }

  &__label {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--gray-500);
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.9375rem;
    font-weight: 500;
    z-index: 1;
  }
}

.input-error {
  border-color: var(--error) !important;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1) !important;
}

.password-input {
  position: relative;

  .input__field {
    padding-right: 3rem;
  }
}

.toggle-password-btn {
  position: absolute;
  right: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
  padding: 0.375rem;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.toggle-password-btn:hover {
  background: rgba(99, 102, 241, 0.08);
  transform: translateY(-50%) scale(1.05);
}

.toggle-password-btn:active {
  transform: translateY(-50%) scale(0.95);
}

.warn {
  color: var(--error);
  font-size: 0.875rem;
  margin: -0.75rem 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;

  &::before {
    content: "⚠️";
    font-size: 1rem;
  }
}

.button-group {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;

  &-left,
  &-right {
    flex: 1;
  }

  button {
    width: 100%;
    height: 48px;
    border-radius: var(--radius-lg);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    font-family: var(--font-primary);
  }

  &-left button {
    background: var(--gradient-primary);
    color: var(--white);
    box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -5px rgba(102, 126, 234, 0.4);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &-right button {
    background: var(--white);
    color: var(--gray-700);
    border: 2px solid var(--gray-200);

    &:hover {
      background: var(--gray-50);
      border-color: var(--gray-300);
    }
  }
}

.signup-button-loader {
  width: 100%;
}

.signup-loader {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 48px;
}

.divider-row {
  display: flex;
  align-items: center;
  margin: 2rem 0 1.5rem 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: var(--gray-200);
}

.divider-text {
  margin: 0 1rem;
  color: var(--gray-500);
  font-size: 0.875rem;
  font-weight: 500;
}

.google-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  height: 48px;
  padding: 0;
  background: var(--white);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  font-size: 1rem;
  font-weight: 600;
  color: var(--gray-700);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: var(--font-primary);

  &:hover {
    background: var(--gray-50);
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.15);
  }
}

.google-logo {
  width: 22px;
  height: 22px;
}

/* Responsive */
@media (max-width: 480px) {
  .signup {
    padding: 1rem;
  }

  .card {
    padding: 2rem 1.5rem;
    border-radius: var(--radius-xl);
  }

  .card__text {
    font-size: 1.25rem;
  }

  .joynet-logo-text {
    font-size: 1.75rem;
  }

  .button-group {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
