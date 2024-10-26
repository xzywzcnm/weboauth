<template>
  <el-popover
    v-model:visible="popoverVisible"
    placement="bottom-start"
    title=""
    trigger="manual"
    width="auto"
    popper-class="head-notice-popper"
  >
    <template v-slot:reference>
      <!-- <span @click="handVisible"> -->
      <span @click="handVisible({})">
        <i class="auth auth-notice" />
        公告
      </span>
    </template>
    <div class="popover-close-botton">
      <i
        class="lapa icon-close"
        @click="handVisible"
      />
    </div>
    <div
      v-for="(item, index) in moduleData"
      :key="`notice-${index}`"
      class="notice-row"
    >
      <span
        class="notice-title"
        @click="openNotice(item)"
      >{{ item.title }}</span>
      <span class="notice-create-time">{{ item.gmtCreate ? item.gmtCreate.substr(0, 11) : '' }}</span>
    </div>
  </el-popover>
</template>
<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AnnouncementDetails',
  props: {
    moduleData: {
      type: Array,
      default: () => {
        return []
      }
    }
  },
  data() {
    return {
      popoverVisible: false
    };
  },
  computed: {},
  watch: {},
  created() {},
  mounted() {},
  // 组件销毁前
  beforeUnmount () {},
  methods: {
    openNotice (notice) {
      // const params = this.$common.isEmpty(notice) ? '': `?noticeId=${notice.id}`;
      this.localforage.setItem('authNoticeId', notice.id).then(res => {
        window.open(`${window.location.origin}${window.location.pathname}#/noticeView`);
        this.popoverVisible = false;
      })
    },
    handVisible () {
      this.popoverVisible = !this.popoverVisible;
    }
  }
});
</script>
<style lang="less" scoped>
.notice-row{
  display: flex;
  width: 500px;
  padding: 5px 7px;
  border-bottom: 1px #ccc dashed;
  .notice-title{
    flex: 100;
    padding-right: 10px;
    cursor: pointer;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    // color: #4363D0;
    // text-decoration: underline;
  }
  .notice-create-time{
    width: 65px;
    overflow: hidden;
    font-size: 12px;
    color: #9f9f9f;
  }
}
.popover-close-botton{
  height: 30px;
  text-align: right;
  i.lapa{
    cursor: pointer;
  }
}
</style>

