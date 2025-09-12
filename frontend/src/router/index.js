import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  createWebHashHistory,
} from "vue-router";
import Home from "../views/Home.vue";
import Login from "../views/auth/Login.vue";
import Signup from "../views/auth/Signup.vue";
import PostDetail from "../views/PostDetail.vue";
import Profile from "../views/Profile.vue";
import store from "../store/index.js";

const requireAuth = (to, from, next) => {
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    let user = localStorage.getItem("token");
    if (!user) {
      next({
        name: "Login",
        query: { redirect: to.fullPath },
      });
    } else {
      next();
    }
  } else {
    next();
  }
};

const routes = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/home",
    name: "Home",
    component: Home,
    beforeEnter: requireAuth,
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
  },
  {
    path: "/signup",
    name: "Signup",
    component: Signup,
  },
  {
    path: "/profile/:id",
    name: "Profile",
    component: Profile,
    props: true,
    beforeEnter: requireAuth,
  },
  {
    path: "/post-detail/:id",
    name: "PostDetail",
    component: PostDetail,
    props: true,
    beforeEnter: requireAuth,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Route guard to handle 401 errors
router.beforeEach(async (to, from, next) => {
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    let user = localStorage.getItem("token");
    if (!user) {
      next({
        name: "Login",
        query: { redirect: to.fullPath },
      });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
