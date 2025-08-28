<template>
  <div class="post-detail">
    <div class="timeline__text-post">
      <Skeletor circle size="50" class="skeletor" v-if="isSkeletorLoading" />
      <Skeletor
        v-if="isSkeletorLoading"
        class="skeletor"
        width="600"
        height="20"
      />
      <Skeletor
        v-if="isSkeletorLoading"
        class="skeletor"
        width="600"
        height="300"
      />
      <div class="main-post" v-else>
        <ProfileImage :id="posts.userId" class="text-post__img" />
        <div class="post__user-content">
          <PostDisplayName :id="posts.userId" />
          <p class="text-post__content" v-if="posts.description">
            {{ posts.description }}
          </p>
          <img
            v-if="posts.file"
            class="post-detail-main-img"
            :src="`http://localhost:3000/uploads/${posts.file}`"
          />
        </div>
      </div>
      <div class="comments">
        <div class="comment" v-for="comment in comments" :key="comment._id">
          <ProfileImage :id="comment.userId" class="text-post__img" />
          <div class="comment__content">
            <PostDisplayName :id="comment.userId" />
            <p class="text-post__content" v-if="comment.comment">
              {{ comment.comment }}
            </p>
            <img
              v-if="comment.file"
              class="post-detail-main-img"
              :src="`http://localhost:3000/uploads/${comment.file}`"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Comment input box luôn hiển thị -->
    <div class="comment-input-box">
      <ProfileImage :id="user._id" class="comment-avatar" />
      <div class="comment-input-container">
        <textarea
          v-model="commentModel"
          placeholder="Viết bình luận..."
          class="comment-textarea"
          @keydown.enter.exact.prevent="addComment"
          rows="1"
        ></textarea>
        <div class="comment-actions">
          <input
            type="file"
            @change="onFileChange"
            ref="file"
            name="file"
            class="file-input"
            accept="image/*"
          />
          <button @click="$refs.file.click()" class="attach-btn" type="button">
            📷
          </button>
          <button
            @click="addComment"
            class="send-btn"
            type="button"
            :disabled="!commentModel.trim() && !file"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ProfileImage from "@/components/ProfileImage";
import PostDisplayName from "@/components/PostDisplayName";
import SyncLoader from "vue-spinner/src/SyncLoader.vue";
import { Skeletor } from "vue-skeletor";
import { createToast } from "mosha-vue-toastify";

export default {
  name: "PostDetail",
  props: ["id"],
  components: { ProfileImage, SyncLoader, Skeletor, PostDisplayName },
  data() {
    return {
      posts: [],
      comments: [],
      user: [],
      commentModel: "",
      fillError: false,
      file: "",
      isLoading: false,
      isSkeletorLoading: false,
      color: "pink",
    };
  },
  async created() {
    this.isSkeletorLoading = true;

    try {
      this.$store.dispatch("fetchUser");
      this.user = this.$store.state.user;

      const responsePost = await fetch(
        `http://localhost:3000/api/posts/${this.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (responsePost.ok) {
        this.posts = await responsePost.json();
      }

      const responseComment = await fetch(
        `http://localhost:3000/api/posts/${this.id}/comments`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (responseComment.ok) {
        this.comments = await responseComment.json();
      }
    } catch (error) {
      console.error("Fetch post detail error:", error);
    }

    this.isSkeletorLoading = false;
  },
  methods: {
    onFileChange() {
      const file = this.$refs.file.files[0];
      this.file = file;
    },
    async addComment() {
      // Kiểm tra có comment text hoặc file
      if (!this.commentModel.trim() && !this.file) {
        this.fillError = true;
        return;
      }

      this.isLoading = true;
      this.fillError = false;

      try {
        // Nếu có file, upload file trước
        if (this.file) {
          const formData = new FormData();
          formData.append("file", this.file);

          const uploadResponse = await fetch(
            "http://localhost:3000/api/posts/upload",
            {
              method: "POST",
              credentials: "include",
              body: formData,
            }
          );

          if (!uploadResponse.ok) {
            throw new Error("File upload failed");
          }
        }

        // Thêm comment với text và/hoặc file
        const response = await fetch(
          `http://localhost:3000/api/posts/${this.id}/comment`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              comment: this.commentModel.trim() || undefined,
              userId: this.$store.state.user._id,
              postId: this.id,
              displayName: this.user.displayName,
              file: this.file ? this.file.name : undefined,
              isTextComment: !this.file, // true nếu chỉ có text, false nếu có file
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          this.comments.push(data);

          // Reset form
          this.commentModel = "";
          this.file = "";
          this.$refs.file.value = "";
        }
      } catch (error) {
        console.error("Add comment error:", error);
        createToast(
          {
            title: "Có lỗi xảy ra khi thêm bình luận",
          },
          {
            type: "error",
            showIcon: true,
          }
        );
      }

      this.isLoading = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.post-detail {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  position: relative;
}
.timeline__text-post {
  padding: 1.5rem;
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  background-color: white;
  border-radius: 1rem;
  margin-bottom: 2rem;
  transform: translate(0, 3px);
  transition: 0.4s;
}

.timeline__text-post:hover {
  transition: 0.4s;
  box-shadow: rgb(233, 191, 191) 3px 3px 6px 0px inset,
    rgba(255, 255, 255, 0.5) -3px -3px 6px 1px inset;
  transform: translate(0, -3px);
  cursor: pointer;
}

.timeline__text-post img {
  width: 54px;
  height: 54px;
  border-radius: 35%;
  margin-right: 1rem;
}

.text-post__user-post a {
  font-weight: bold;
  font-size: 1rem;
}

.text-post__content {
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
  max-width: 100%;
  font-family: inherit;
  letter-spacing: normal;
  word-spacing: normal;
  margin-bottom: 1rem;
  margin-top: 1rem;
}

.main-post {
  display: flex;
}

.post__user-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  max-width: 100%;
}

.comments {
  margin-top: 1rem;
  margin-left: 2rem;
}

.comment {
  margin-top: 1rem;
  display: flex;
  flex-direction: row;
  border: 1px solid rgb(214, 214, 214);
  border-radius: 35px;
  box-shadow: 0px 0px 0px 1px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.comment__content {
  display: flex;
  flex-direction: column;
  flex: 1;
  max-width: 100%;
}

.btn-textadd {
  transform: translate(0, 3px);
  transition: 0.4s;
  background-color: var(--green);
  width: 8rem;
  font-size: 0.85rem;
  margin-right: 1rem;
}

.btn-textadd:hover {
  background-color: #59b956;
  transition: 0.4s;
  box-shadow: 0px 15px 15px -5px rgba(0, 0, 0, 0.2);
  transform: translate(0, -3px);
}

.add-post {
  position: fixed;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  width: auto;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 1.6rem 3rem;
  border: 3px solid black;
  border-radius: 5px;
  background: white;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.2);
  z-index: 1;
  &__title {
    margin-bottom: 1rem;
    margin-top: 1rem;
  }
}

.description {
  font-size: 1.1rem;
  margin-bottom: 1.6rem;
  margin-top: 0;
}
.btn-addpost {
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

.btn-addpost:last-child {
  margin: 0;
}

.btn-addpost:hover {
  box-shadow: 0.4rem 0.4rem 0 black;
  transform: translate(-0.4rem, -0.4rem);
}

.btn-addpost:active {
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

.image-post__user-post {
  display: flex;
  flex-direction: column;
}

.image-post__user-post a {
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.image-post__avatar {
  width: 54px;
  height: 54px;
  border-radius: 35%;
  margin-right: 1rem;
}

.post-detail-main-img {
  min-width: 360px;
  width: auto !important;
  height: auto !important;
  border-radius: 0 !important;
  display: block;
  margin: 0.5rem 0;
}

.comment-input-box {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  border-top: 1px solid #e0e0e0;
  margin-top: 1rem;
  gap: 0.75rem;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.comment-input-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.comment-textarea {
  width: 100%;
  min-height: 40px;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  resize: none;
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.3s ease;
}

.comment-textarea:focus {
  border-color: #007bff;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
}

.file-input {
  display: none;
}

.attach-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.attach-btn:hover {
  background-color: #f0f0f0;
}

.send-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s ease;
}

.send-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.send-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.comment-buttons {
  display: flex;
  justify-content: flex-end;
}
</style>
