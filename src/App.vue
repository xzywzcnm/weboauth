<template>
  <layout>
    <router-view v-slot="{ Component, route }">
        <!-- 使用缓存 -->
      <keep-alive>
        <component :is="Component" :key="route.fullPath" v-if="route.meta.keepAlive" />
      </keep-alive>
      <!-- 不使用缓存 -->
      <component :is="Component" :key="route.fullPath" v-if="!route.meta.keepAlive" />
    </router-view>
  </layout>
</template>

<script lang="ts" setup>
import layout from '@/layout/index.vue';
import { onBeforeUnmount, nextTick } from 'vue';
// import { useRouter } from 'vue-router';
import getGlobal from "@/utils/global";
import authGlobal from '@/utils/authGlobalHand';
import pageRouter from "@/router/pageRouter";

const global = getGlobal();
const notAutoRefreshTokenPath = ['/broadcastMessage'];
let isActive = true;
// const $route = useRouter();
// 窗口获得焦点时
const windowFocus = () => {
  const path = authGlobal.getHash();
  isActive = true;
  !notAutoRefreshTokenPath.includes(path) && authGlobal.againAuthRefresh();
}
// 窗口失去焦点时
const windowBlur = () => {
  const path = authGlobal.getHash();
  isActive = false;
  !notAutoRefreshTokenPath.includes(path) && authGlobal.clearRefresh('tips');
}
// 获取所有路由地址
const getRoutersPath = (arr:any, newRoute:Array<string | number> = []) => {
  arr.forEach((item:any) => {
    newRoute.push(item.path);
    !global.$common.isEmpty(item.children) && getRoutersPath(item.children, newRoute)
  })
  return newRoute;
}
const routePath = getRoutersPath(pageRouter);

const authLogined = (token:any) => {
  const path = authGlobal.getHash();
  const loginIframe:HTMLIFrameElement = document.querySelector('#loginOtherAuthIframe') as HTMLIFrameElement;
  if (!global.$common.isEmpty(loginIframe)) {
    global.localforage.getItem(authGlobal.operation).then((operation) => {
      !!loginIframe.contentWindow && loginIframe.contentWindow.postMessage({
        testEnvLoginIframe: {token: token, operation: operation || {}}
      }, loginIframe.src);
    })
  }
  // 判断是否符合跳转到登录页
  if (global.$common.isEmpty(token) && !authGlobal.goToLoginOutPath.includes(path) && routePath.includes(path)) {
    authGlobal.goToLogin();
    return;
  }
  if ((isActive && !notAutoRefreshTokenPath.includes(path))) {
    authGlobal.tokenHand((token||{})).then(() => {
      authGlobal.clearRefresh().then(() => {
        if (global.$common.isEmpty(token)) return;
        authGlobal.againAuthRefresh(!token.isRefresh);
      });
    })
  }
}
nextTick(() => {
  const path = authGlobal.getHash();
  (isActive && !notAutoRefreshTokenPath.includes(path)) && authGlobal.againAuthRefresh();
  global.$bus.on('auth-token', authLogined);
  !['/testEnvLogin'].includes(path) && authGlobal.testLoginAuth(); // 登录当前环境对应的其他地址
});

// 监听窗口
window.addEventListener('focus', windowFocus);
window.addEventListener('blur', windowBlur);
// 组件销毁前
onBeforeUnmount(() => {
  global.$bus.off('auth-token', authLogined);
  window.removeEventListener('focus', windowFocus);
  window.removeEventListener('blur', windowBlur);
});
</script>
