<template>
  <div class="testEnv-login-container">
    模拟登录
  </div>
</template>
<script lang="ts" setup>
import { onBeforeUnmount } from 'vue';
import authGlobal from '@/utils/authGlobalHand';
import cookieConfig from '@/utils/cookieConfig';
import getGlobal from "@/utils/global";

const global = getGlobal();
const receiveOtherMessage = (e) => {
  const data = e.data[`testEnvLoginIframe`];
  if (typeof data === 'undefined') return;
  // 移除登录信息
  if (global.$common.isEmpty(data) || global.$common.isEmpty(data.token)) {
    global.localforage.getItem(authGlobal.DBKey).then(res => {
      if (global.$common.isEmpty(res)) return;
      global.$common.delCookie([cookieConfig.tokenName]);
      authGlobal.removeLoginInfo();
    })
    return;
  }
  // 保存登录信息
  global.localforage.getItem(authGlobal.DBKey).then(res => {
    if (!global.$common.isEmpty(res) && data.token.access_token === res.access_token) return;
    // if (!global.$common.isEmpty(res)) return;
    authGlobal.tokenHand(data.token, {info: data.operation}).then(() => {
      global.$common.setCookie([
        { key: cookieConfig.tokenName, value: `${data.token.token_type} ${data.token.access_token}` }
      ]);
      global.$bus.emit('auth-token', data.token);
      authGlobal.requestUserInfo().catch((e) => {
        console.error('getUserInfo', e);
      })
    })
  })
}

// 绑定方法
window.addEventListener('message', receiveOtherMessage);
// 组件销毁前
onBeforeUnmount(() => {
  window.removeEventListener('message', receiveOtherMessage);
});
</script>
