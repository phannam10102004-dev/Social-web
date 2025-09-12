<template>
  <div class="user-post-name">
    <a>
      {{ displayName }}
    </a>
  </div>
</template>

<script>
export default {
  name: "PostDisplayName",
  props: ["id"],
  data() {
    return {
      user: [],
      displayName: "",
    };
  },
  async created() {
    try {
      const response = await fetch(
        `http://localhost:3000/api/users/${this.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (response.ok) {
        this.user = await response.json();
        this.displayName = this.user.displayName;
      }
    } catch (error) {
      console.error("Fetch user error:", error);
    }
  },
};
</script>

<style scoped>
.user-post-name {
  font-weight: bold;
  font-size: 1rem;
}
</style>
