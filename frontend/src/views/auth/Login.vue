<template>
  <article class="login">
    <div class="card card--accent">
      <div class="logo-row">
        <img class="card__logo" src="../../assets/logo.png" />
        <span class="joynet-logo-text">Joynet</span>
      </div>
      <h2 class="card__text">Đăng nhập để tiếp tục</h2>
      <label class="input">
        <input
          class="input__field"
          type="text"
          placeholder=" "
          v-model="email"
        />
        <span class="input__label">E-mail</span>
      </label>
      <label class="input" style="position: relative">
        <input
          class="input__field"
          :type="showPassword ? 'text' : 'password'"
          placeholder=" "
          v-model="password"
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
      <div class="button-group">
        <div class="button-group-left">
          <div class="login-button-loader" v-if="!loginLoading">
            <button @click="login">Đăng nhập</button>
          </div>
          <div class="login-button-loader" v-else>
            <SyncLoader class="login-loader" :color="color" />
          </div>
          <button type="reset" v-if="!loginLoading">Quên mật khẩu?</button>
        </div>
        <div class="button-group-right" v-if="!loginLoading">
          <router-link to="/signup"> <button>Đăng ký</button></router-link>
        </div>
      </div>
      <p class="warn" v-if="error">
        {{ error }}
      </p>
      <p class="warn" v-if="fillError">Vui lòng điền vào tất cả các trường</p>
    </div>
  </article>
</template>

<script>
import axios from "axios";
import SyncLoader from "vue-spinner/src/SyncLoader.vue";

export default {
  name: "Login",
  components: { SyncLoader },
  data() {
    return {
      email: "",
      password: "",
      error: "",
      color: "pink",
      loginLoading: false,
      fillError: false,
      showPassword: false,
    };
  },
  methods: {
    async login() {
      this.loginLoading = true;

      if (!this.email || !this.password) {
        this.fillError = true;
        this.loginLoading = false;
      } else {
        this.fillError = false;
        const data = {
          email: this.email,
          password: this.password,
        };
        await axios.post("auth/login", data).then(
          (res) => {
            if (res.status === 200) {
              this.error = false;
              localStorage.setItem("token", res.data.token);
              this.$router.push("/");
            }
          },
          (err) => {
            this.error = err.response.data.error;
            this.password = "";
          }
        );
        this.loginLoading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.card {
  background: var(--white);
  padding: calc(4 * var(--size-bezel));
  border-radius: var(--size-radius);
  border: 3px solid var(--color-shadow, currentColor);
  box-shadow: 0.5rem 0.5rem 0 var(--color-shadow, currentColor);
  margin-top: 5rem;

  &--inverted {
    --color-background: var(--color-dark);
    color: var(--color-light);
    --color-shadow: var(--color-accent);
  }

  &--accent {
    --color-background: var(--color-signal);
    --color-accent: var(--color-light);
    color: var(--color-dark);
  }

  &__logo {
    width: 60px;
    height: 60px;
    margin-bottom: 1rem;
  }

  *:first-child {
    margin-top: 0;
  }

  &__text {
    margin-bottom: 1rem;
  }
}

.login {
  max-width: 40rem;
  padding: 1rem;
  margin-left: auto;
  margin-right: auto;
}

.input {
  position: relative;

  &__label {
    position: absolute;
    left: 0;
    top: 0;
    padding: calc(var(--size-bezel) * 0.75) calc(var(--size-bezel) * 0.5);
    margin: calc(var(--size-bezel) * 0.75 + 3px) calc(var(--size-bezel) * 0.5);
    white-space: nowrap;
    transform: translate(0, 0);
    transform-origin: 0 0;
    transition: transform 120ms ease-in;
    font-weight: bold;
    line-height: 1.2;
  }
  &__field {
    box-sizing: border-box;
    display: block;
    width: 100%;
    border: 3px solid currentColor;
    padding: calc(var(--size-bezel) * 1.5) var(--size-bezel);
    color: currentColor;
    background: transparent;
    border-radius: var(--size-radius);
    margin-bottom: 1rem;

    &:focus,
    &:not(:placeholder-shown) {
      & + .input__label {
        transform: translate(0.25rem, -65%) scale(0.8);
        color: var(--pink);
        background: var(--white);
        padding: 0 0.3em;
        z-index: 2;
      }
    }
  }
}

.toggle-password-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0 0.25em;
  color: var(--txt-darkest);
  z-index: 3;
}
.button-group {
  margin-top: calc(var(--size-bezel) * 2.5);
  display: flex;
  justify-content: space-between;
}

button {
  color: currentColor;
  padding: var(--size-bezel) calc(var(--size-bezel) * 2);
  background: var(--light);
  border: none;
  border-radius: var(--size-radius);
  font-weight: 900;
  font-family: "Roboto", "Arial", "Helvetica Neue", "Segoe UI", "Tahoma",
    "Geneva", "Verdana", "sans-serif";
}

button + button {
  margin-left: calc(var(--size-bezel) * 2);
}

.icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-right: 0.5em;
}

.hidden {
  display: none;
}

.warn {
  color: var(--red);
  margin-top: 1rem;
}

.button-group-left {
  display: flex;
}

.login-button-loader {
  margin-right: 2em;
}
// Logo và chữ Joynet trên một dòng, căn giữa đẹp
.logo-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.joynet-logo-text {
  font-family: "Montserrat", "Segoe UI", "Arial", "Helvetica Neue", sans-serif;
  font-weight: 900;
  font-size: 2rem;
  background: linear-gradient(90deg, #fe7b77 0%, #fea94f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 2px 2px 8px rgba(254, 123, 119, 0.1),
    0 2px 8px rgba(254, 169, 79, 0.1);
  display: inline-block;
}
</style>
