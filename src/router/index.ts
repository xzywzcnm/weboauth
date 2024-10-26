import { createRouter, createWebHashHistory, NavigationGuardNext, RouteLocationNormalized } from "vue-router";
import NProgress from "nprogress";
import pageRouter from "./pageRouter";
import common from '@/utils/common';
import authGlobal from '@/utils/authGlobalHand';
import localforage from 'localforage';
import "nprogress/nprogress.css";
import store from "@/store";

const customEnv = common.getUrlParams({keys: 'targetEnv' });
const process:ImportMetaEnv = import.meta.env;
const targetEnv = process.VITE_CONFIG !== 'prod' && !common.isEmpty(customEnv) ? {targetEnv: customEnv} : {};

const tool = {
  hand: (to:RouteLocationNormalized, from:RouteLocationNormalized, next:NavigationGuardNext, userInfo:any = {}) => {
    // 当登录密码为默认密码时，跳转到修改密码页面
    localforage.getItem(`resetPasswordTips-${userInfo.username||''}`).then(res => {
      NProgress.done();
      const urlParams = common.getUrlParams();
      // @ts-ignore
      res ? next({ path: `/resetPassword`, query: urlParams }) : next();
    })
  },
  // 获取所有路由地址
  getRoutersPath: (arr:any, newRoute:Array<string | number> = []) => {
    arr.forEach((item:any) => {
      newRoute.push(item.path);
      !common.isEmpty(item.children) && tool.getRoutersPath(item.children, newRoute)
    })
    return newRoute;
  }
}

const router = createRouter({
  /* 
    history 配置： createWebHashHistory 使用 hash 模式， createWebHistory html5 历史模式, 
    均需在 import vue-router 时定义方法名称
  */
  history: createWebHashHistory(), // 使用 hash 模式
  routes: [
    {
      path: "/",
      redirect: "/login"
    },
    ...pageRouter,
  ],
});
// 路由跳转前
router.beforeEach((to, from, next) => {
  // 移除所有等待请求的方法
  store.commit('cancelAllPending', '页面跳转，取消正在请求或还未请求的接口');
  NProgress.start();
  store.commit('routerModel/routerLoading', true);
  /* 路由发生变化修改页面title */
  document.title = `LAPA 系统中心${to.name ? `-${String(to.name)}` : ''}`;
  
  const routePath = tool.getRoutersPath(pageRouter);
  const nonExist = routePath.includes(to.path);
  store.commit('layout/nonExist', !nonExist);
  if (!nonExist) {
    next();
    return;
  }
  //  默认requireAuth: true，即验证登录；
  if (to.meta && typeof to.meta.requireAuth === 'boolean' && !to.meta.requireAuth) {
  // 当不需要检验时直接跳转
    NProgress.done();
    return next();
  }
  // 验证 token 可用性
  authGlobal.validationToken().then((res) => {
    if (!res) {
      NProgress.done();
      store.commit('routerModel/routerLoading', false);
      // 停止刷新token
      authGlobal.clearRefresh().then(() => {
        // @ts-ignore
        next({ path: '/login', query: targetEnv });
      })
      return;
    }
    localforage.getItem(authGlobal.userInfo).then((userInfo:any) => {
      if (common.isEmpty(userInfo)) {
        authGlobal.requestUserInfo().then((newRes:any) => {
          tool.hand(to, from, next, newRes || {});
        })
      } else {
        tool.hand(to, from, next, userInfo || {})
      }
    }).catch(() => {
      tool.hand(to, from, next, {});
    })
  })
})

// 路由跳转后
router.afterEach((to, from) => {
  NProgress.done();
  store.commit('routerModel/routerLoading', false);
});

export default router;
