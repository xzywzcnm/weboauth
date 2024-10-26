<template>
  <div style="padding: 60px">
    common.js 测试
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount } from 'vue';
import getGlobal from "@/utils/global";
const global = getGlobal();

const mytest = (val:any) => {
  console.log('on---', val)
}

global.$bus.on('mytest', mytest);
global.$bus.on('mytest1', mytest);
global.$bus.on('mytest2', mytest);

// 销毁组件前解绑订阅
onBeforeUnmount(() => {
  global.$bus.off('mytest', mytest);
  global.$bus.off('mytest1', mytest);
  global.$bus.off('mytest2', mytest);
})

</script>
