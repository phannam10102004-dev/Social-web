<template>
  <form
    class="edit-profile"
    @submit.prevent="editProfile"
    v-if="openEditProfile"
  >
    <div class="edit-profile-wrapper">
      <h2 class="edit-profile__title">Chỉnh sửa thông tin cá nhân</h2>
      <label class="input">
        <input
          class="input__field"
          type="text"
          placeholder=" "
          v-model="displayName"
        />
        <span class="input__label">Tên hiển thị</span>
      </label>
      <label class="input">
        <input
          class="input__field"
          type="text"
          placeholder=" "
          v-model="description"
        />
        <span class="input__label">Giới thiệu bản thân</span>
      </label>
      <label class="input">
        <input
          class="input__field"
          type="text"
          placeholder=" "
          v-model="hobbies"
        />
        <span class="input__label">Sở thích</span>
      </label>
      <input
        class="input__field"
        type="date"
        placeholder=" "
        v-model="birthDate"
      />
      <label class="input">
        <input
          class="input__field"
          type="file"
          @change="onFileChange"
          ref="file"
          name="file"
          accept="image/*"
        />
        <span class="input__label">Tải lên ảnh đại diện</span>
      </label>
      <span class="input__label warn" v-if="fillError"
        >Vui lòng điền tất cả thông tin</span
      >
      <div class="options">
        <button class="btn-edit" type="submit" v-if="!isLoading">Thêm</button>
        <sync-loader :color="color" v-if="isLoading"></sync-loader>
        <button
          @click="openEditProfile = !openEditProfile"
          class="btn-edit"
          v-if="!isLoading"
          type="button"
        >
          Đóng
        </button>
      </div>
    </div>
  </form>
</template>

<script>
import SyncLoader from "vue-spinner/src/SyncLoader.vue";
import { createToast } from "mosha-vue-toastify";

export default {
  name: "ProfileEdit",
  components: {
    SyncLoader,
  },
  data() {
    return {
      displayName: "",
      description: "",
      birthDate: "",
      hobbies: "",
      openEditProfile: true,
      isLoading: false,
      fillError: false,
      color: "pink",
      editingSuccess: "",
    };
  },
  props: ["id"],
  computed: {
    user() {
      return this.$store.state.user;
    },
  },
  async mounted() {
    this.$store.dispatch("fetchUser");
    this.displayName = this.user.displayName;
    this.description = this.user.description;
    this.birthDate = this.user.birthDate;
    this.hobbies = this.user.hobbies;
  },
  methods: {
    onFileChange() {
      const file = this.$refs.file.files[0];
      this.file = file;
    },
    async editProfile() {
      const currentUser = this.id;

      const formData = new FormData();
      formData.append("file", this.file);

      if (
        this.file == null ||
        this.displayName === "" ||
        this.description === "" ||
        this.birthDate === "" ||
        this.hobbies === ""
      ) {
        this.fillError = true;
      } else {
        this.isLoading = true;

        try {
          const responseUser = await fetch(
            `http://localhost:3000/api/users/${currentUser}/edit`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                displayName: this.displayName,
                description: this.description,
                birthDate: this.birthDate,
                hobbies: this.hobbies,
                profilePicture: this.file.name,
              }),
            }
          );

          if (responseUser.ok) {
            await fetch("http://localhost:3000/api/auth/upload", {
              method: "POST",
              credentials: "include",
              body: formData,
            });

            const getUser = await fetch(
              `http://localhost:3000/api/users/${currentUser}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
              }
            );

            if (getUser.ok) {
              const userData = await getUser.json();
              this.$emit("updateUser", userData);
              this.$store.dispatch("fetchUser");
              this.displayName = "";
              this.description = "";
              this.birthDate = "";
              this.hobbies = "";
              this.openEditProfile = false;
              this.editingSuccess = "Your profile was successfully edited!";
              createToast(
                {
                  title: this.editingSuccess,
                },
                {
                  type: "success",
                  showIcon: true,
                }
              );
            }
          }
        } catch (error) {
          console.error("Edit profile error:", error);
        }

        this.isLoading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@keyframes slide {
  from {
    background-position: 0 0;
  }

  to {
    background-position: -120px 60px;
  }
}

.edit-profile {
  position: fixed;
  left: 45%;
  top: 50%;
  transform: translate(-50%, -50%);

  &__title {
    margin-bottom: 1rem;
    margin-top: 1rem;
  }
}

.edit-profile-wrapper {
  width: 400px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 1.6rem 3rem;
  border: 3px solid black;
  border-radius: 5px;
  background: white;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.2);
  z-index: 1;
}

.description {
  font-size: 1.1rem;
  margin-bottom: 1.6rem;
  margin-top: 0;
}
.btn-edit {
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  background: white;
  padding: 0.3rem 3.4rem;
  border: 3px solid black;
  margin-right: 2.6rem;
  box-shadow: 0 0 0 black;
  transition: all 0.2s;
}

.btn-edit:last-child {
  margin: 0;
}

.btn-edit:hover {
  box-shadow: 0.4rem 0.4rem 0 black;
  transform: translate(-0.4rem, -0.4rem);
}

.btn-edit:active {
  box-shadow: 0 0 0 black;
  transform: translate(0, 0);
}

.options {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
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
    width: 300px;
    border: 3px solid currentColor;
    padding: calc(var(--size-bezel) * 1.5) var(--size-bezel);
    color: currentColor;
    background: transparent;
    border-radius: var(--size-radius);
    margin-bottom: 1rem;

    &:focus,
    &:not(:placeholder-shown) {
      & + .input__label {
        transform: translate(0.25rem, -90%) scale(0.8);
        color: var(--pink);
      }
    }
  }
}

.warn {
  color: var(--red);
}
</style>
