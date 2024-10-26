<template>
  <div
    v-loading="loadingPage"
    class="layout-main-pages"
    :element-loading-text="data.loadingTxt"
  >
    <noAccessView v-if="noAccess" />
    <nonExistView v-else-if="nonExist" />
    <slot v-else />
    <div
      v-if="['/login'].includes(path)"
      class="app-record"
    >
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
      >备案/许可证号：粤ICP备2021002748号</a>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { reactive, computed } from 'vue';
import { useRouter } from "vue-router";
import store from '@/store';
import noAccessView from './401.vue';
import nonExistView from './404.vue';

const $route = useRouter();
let data = reactive({
  loadingTxt: '页面加载中，请稍后...'
});
const loadingPage = computed(() => store.getters['routerModel/routerLoading']);
const noAccess = computed(() => store.getters['layout/noAccess']);
const nonExist = computed(() => store.getters['layout/nonExist']);
const path = computed(() => {
  return $route.currentRoute.value.path;
});
</script>

<style lang="less" scoped>
.layout-main-pages{
  padding: 0;
  height: 100%;
  background: #fff;
  overflow: auto;
  > :deep(*){
    &:first-child{
      height: 100%;
      overflow: auto;
    }
  }
  .app-record{
    position: absolute;
    padding: 2px 0;
    bottom: 0;
    width: 100%;
    font-size: 12px;
    background: #fff;
    text-align: center;
  }
}
</style>