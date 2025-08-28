<template>
  <div class="timeline">
    <!-- Các khối Skeletor để hiển thị hiệu ứng loading -->
    <Skeletor circle size="50" class="skeletor" v-if="isLoading" />
    <Skeletor v-if="isLoading" class="skeletor" width="100%" height="20" />
    <Skeletor v-if="isLoading" class="skeletor" width="100%" height="300" />
    <Skeletor circle size="50" class="skeletor" v-if="isLoading" />
    <Skeletor v-if="isLoading" class="skeletor" width="100%" height="20" />
    <Skeletor v-if="isLoading" class="skeletor" width="100%" height="300" />
    <Skeletor circle size="50" class="skeletor" v-if="isLoading" />
    <Skeletor v-if="isLoading" class="skeletor" width="100%" height="20" />
    <Skeletor v-if="isLoading" class="skeletor" width="100%" height="300" />
    <!-- Sau khi load xong sẽ hiển thị danh sách bài post -->
    <div class="timeline__post" v-for="post in posts" :key="post._id" v-else>
      <router-link
        :to="{
          name: 'PostDetail',
          params: { id: post._id },
        }"
      >
        <div class="post">
          <!-- ảnh đại diện user -->
          <div class="user-post-img">
            <ProfileImage :id="post.userId" class="post__img" />
          </div>

          <!-- Nếu là bài post text -->
          <div class="post__user-post" v-if="post.isTextPost">
            <PostDisplayName :id="post.userId" />
            <div class="user-post-desc">
              <p
                class="post__content"
                :class="{
                  'post__content--truncated': isPostTruncated(post.description),
                }"
              >
                {{ getTruncatedText(post.description) }}
              </p>
              <router-link
                v-if="isPostTruncated(post.description)"
                :to="{ name: 'PostDetail', params: { id: post._id } }"
                class="read-more-link"
                @click.stop
              >
                Xem thêm
              </router-link>
            </div>
          </div>

          <!-- Nếu là bài post có ảnh -->
          <div class="image-post__user-post" v-else>
            <PostDisplayName :id="post.userId" />
            <div class="user-post-desc img-desc">
              <p
                class="post__content"
                :class="{
                  'post__content--truncated': isPostTruncated(post.description),
                }"
              >
                {{ getTruncatedText(post.description) }}
              </p>
              <router-link
                v-if="isPostTruncated(post.description)"
                :to="{ name: 'PostDetail', params: { id: post._id } }"
                class="read-more-link"
                @click.stop
              >
                Xem thêm
              </router-link>
            </div>
            <div class="user-post-image">
              <img
                v-if="post.file"
                class="image-post__img"
                :src="`http://localhost:3000/uploads/${post.file}`"
              />
            </div>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script>
import ProfileImage from "@/components/ProfileImage";
import PostDisplayName from "@/components/PostDisplayName";
import { Skeletor } from "vue-skeletor";
export default {
  name: "Timeline",
  components: { ProfileImage, Skeletor, PostDisplayName },
  data() {
    return {
      description: "",
      img: "",
      displayName: "",
      isTextPost: false,
      isImagePost: false,
      isLoading: false,
    };
  },
  async mounted() {
    this.isLoading = true;
    this.$store.dispatch("fetchPosts");
    this.isLoading = false;
  },
  computed: {
    posts() {
      return this.$store.state.posts;
    },
  },
  methods: {
    isPostTruncated(description) {
      const maxLength = 200; // Giới hạn 200 ký tự
      return description && description.length > maxLength;
    },
    getTruncatedText(description) {
      const maxLength = 200;
      if (!description) return "";
      if (description.length <= maxLength) return description;

      // Cắt tại vị trí không phá vỡ từ
      let truncated = description.substring(0, maxLength);
      const lastSpaceIndex = truncated.lastIndexOf(" ");
      if (lastSpaceIndex > maxLength * 0.8) {
        // Chỉ cắt tại space nếu không quá ngắn
        truncated = truncated.substring(0, lastSpaceIndex);
      }

      return truncated + "...";
    },
  },
};
</script>

<style class="scss" scoped>
.timeline {
  width: 100%;
  height: 100%;
}

.timeline__post {
  display: flex;
  justify-content: flex-start;
  background-color: white;
  border-radius: 1rem;
  margin-bottom: 2rem;
  transform: translate(0, 3px);
  transition: 0.4s;
}

.timeline__post:hover {
  transition: 0.4s;
  box-shadow: rgb(211, 155, 155) 3px 3px 6px 0px inset,
    rgba(255, 255, 255, 0.5) -3px -3px 6px 1px inset;
  transform: translate(0, -3px);
  cursor: pointer;
}

.text-post__img {
  width: 54px;
  height: 54px;
  border-radius: 35%;
  margin-right: 1rem;
}

.post {
  display: flex;
  justify-content: flex-start;
  width: 700px;
  padding: 1.5rem;
}

.user-post-desc {
  max-width: 100%;
  overflow: hidden;
  flex: 1;
}

.post__user-post a {
  font-weight: bold;
  font-size: 1rem;
}

.post__content {
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
  margin-bottom: 0.5rem;
}

.post__content--truncated {
  max-height: 120px;
  overflow: hidden;
  position: relative;
}

.read-more-link {
  color: #007bff;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.85rem;
  transition: color 0.3s ease;
  display: inline-block;
  margin-top: 0.5rem;
}

.read-more-link:hover {
  color: #0056b3;
  text-decoration: underline;
}

.timeline__image-post {
  display: flex;
  justify-content: flex-start;
  background-color: white;
  border-radius: 1rem;
  margin-bottom: 2rem;
  transform: translate(0, 3px);
  transition: 0.4s;
}

.timeline__image-post:hover {
  transition: 0.4s;
  box-shadow: rgb(233, 191, 191) 3px 3px 6px 0px inset,
    rgba(255, 255, 255, 0.5) -3px -3px 6px 1px inset;
  transform: translate(0, -3px);
  cursor: pointer;
}

.img-desc {
  margin-top: 1rem;
}

.image-post__user-post {
  display: flex;
  flex-direction: column;
  flex: 1;
  max-width: 100%;
}

.image-post__user-post a {
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.image-post__avatar {
  width: 54px;
  height: 54px;
  border-radius: 35%;
  margin-right: 1rem;
}

.image-post__user-post img {
  width: 100%;
  height: 100%;
  margin-right: 1rem;
  border-radius: 7px;
  max-height: 350px;
  max-width: 600px;
  margin-top: 1rem;
}

.image-post__img {
  width: 100%;
  height: 100%;
  border-radius: 7px;
  max-height: 350px;
  object-fit: cover;
  margin-bottom: 1rem;
}

.skeletor {
  margin-bottom: 1rem;
  margin-top: 1rem;
  margin-left: 1rem;
}

.skeletor-content {
  margin-left: 1rem;
}
</style>
