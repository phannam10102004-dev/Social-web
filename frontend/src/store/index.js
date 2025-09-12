import { Commit, createStore } from "vuex";

export default createStore({
  state: {
    user: {},
    posts: [],
    isUserLoaded: false, // Thêm flag để tránh fetch user nhiều lần
  },
  getters: {},
  actions: {
    async fetchUser({ commit, state }) {
      // Nếu user đã được load rồi thì không fetch lại
      if (state.isUserLoaded && state.user?._id) {
        return;
      }

      try {
        const response = await fetch("http://localhost:3000/api/auth/user", {
          method: "GET",
          headers: {
            token: localStorage.getItem("token"),
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          commit("SET_USER", data.user);
          commit("SET_USER_LOADED", true);
        }
      } catch (error) {
        console.error("Fetch user error:", error);
      }
    },
    async fetchPosts({ commit, dispatch, state }) {
      try {
        // Đảm bảo user đã được fetch trước
        if (!state.isUserLoaded) {
          await dispatch("fetchUser");
        }

        const currentUser = state.user?._id;
        if (!currentUser) {
          console.error("No current user found");
          return;
        }

        const responsePosts = await fetch(
          `http://localhost:3000/api/posts/timeline/${currentUser}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (responsePosts.ok) {
          const posts = await responsePosts.json();
          const sortedPosts = posts.sort((p1, p2) => {
            return new Date(p2.createdAt) - new Date(p1.createdAt);
          });
          commit("SET_POSTS", sortedPosts);
        }
      } catch (error) {
        console.error("Fetch posts error:", error);
      }
    },
    async addPost({ commit }, { post, formData = null }) {
      try {
        // Tạo post trước
        const postResponse = await fetch("http://localhost:3000/api/posts/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(post),
        });

        let uploadSuccess = true;

        // Chỉ upload file nếu có formData
        if (formData) {
          const uploadResponse = await fetch(
            "http://localhost:3000/api/posts/upload",
            {
              method: "POST",
              credentials: "include",
              body: formData,
            }
          );
          uploadSuccess = uploadResponse.ok;
        }

        if (postResponse.ok && uploadSuccess) {
          commit("ADD_POST", post);
        }
      } catch (error) {
        console.error("Add post error:", error);
      }
    },
    async refreshToken() {
      try {
        const response = await fetch("http://localhost:3000/api/auth/token", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("token", data.refreshToken);
          return data;
        }
        throw new Error("Refresh token failed");
      } catch (error) {
        console.error("Refresh token error:", error);
        throw error;
      }
    },
  },
  mutations: {
    SET_USER(state, user) {
      state.user = user;
    },
    SET_USER_LOADED(state, isLoaded) {
      state.isUserLoaded = isLoaded;
    },
    SET_POSTS(state, posts) {
      state.posts = posts;
    },
    ADD_POST(state, post) {
      state.posts.push(post);
    },
  },
});
