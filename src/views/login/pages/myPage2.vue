<template>
  <div style="padding: 60px">
    <el-button @click="broadcast">广播信息</el-button>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount } from 'vue';
import getGlobal from "@/utils/global";
const global = getGlobal();

const mytest = (val:any) => {
  console.log(val)
}
// const mytestOnce = (val:any) => {
//   console.log('once', val)
// }
global.$bus.on('mytest', mytest);
let index = 0;
const broadcast = () => {
  index++;
  global.$bus.emit('mytest', {text: `我来自于认证中心 mytest-myPage2.vue 页面, 第 ${index} 次广播`});
  global.$bus.emit('mytest1', {text: `我来自于认证中心 mytest1-myPage2.vue 页面, 第 ${index} 次广播`});
}
// 销毁组件前解绑订阅
onBeforeUnmount(() => {
  global.$bus.off('mytest', mytest);
  // global.$bus.off('mytest', mytestOnce);
})
</script>
