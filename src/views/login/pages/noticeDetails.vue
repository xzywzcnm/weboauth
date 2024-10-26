<template>
  <!-- eslint-disable vue/no-v-html -->
  <el-dialog
    title="最新公告"
    v-model="dVisible"
    width="90%"
    top="5vh"
    :close-on-press-escape="false"
    :close-on-click-modal="false"
    custom-class="announcement-details-dialog"
  >
    <div
      v-loading="pageLoading"
      class="announcement-details"
    >
      <div class="details-title">
        {{ noticeDetails.title }}
      </div>
      <p style="margin-top: 5px;color: #afafaf;">
        {{ noticeDetails.gmtCreate }}
      </p>
      <div
        class="details-container"
        v-html="noticeDetails.content"
      />
      <dytImage ref="dytImage" target-container=".details-container" />
    </div>
    <template v-slot:footer>
      <div class="foolter-button">
        <el-button
          type="primary"
          @click="closeDialog('noLonger')"
        >
          不再显示
        </el-button>
        <el-button @click="closeDialog()">
          关 闭
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
<script>
import { defineComponent } from 'vue';
import authGlobal from '@/utils/authGlobalHand';
import dytImage from '@/components/dytImageView/dytImage.vue';

export default defineComponent({
  name: 'AnnouncementDetails',
  components: { dytImage },
  props: {
    moduleData: {
      type: Object,
      default: () => {
        return {}
      }
    },
    dialogVisible: {
      type: Boolean,
      default: false
    },
  },
  data() {
    return {
      dVisible: false,
      pageLoading: false,
      noticeDetails: {
        title: '',
        content: ''
      }
    };
  },
  computed: {},
  watch: {
    dialogVisible: {
      immediate: true,
      deep: true,
      handler(val) {
        this.dVisible = val;
      }
    },
    dVisible: {
      deep: true,
      handler(val) {
        this.$emit('update:dialogVisible', val);
        this.$nextTick(() => {
          val && this.dataInit(this.moduleData);
        });
      }
    }
  },
  created() {},
  mounted() {},
  // 组件销毁前
  beforeUnmount () {},
  methods: {
    // 初始化数据
    dataInit (val) {
      if (!val.id) return;
      this.pageLoading = true;
      this.$http.get(this.api.upmsAdmin.getDetails, {params: {id: val.id}}).then(res => {
        Object.keys(res.data).forEach(key => {
          this.noticeDetails[key] = res.data[key];
        });
        this.$nextTick(() => {
          this.$refs.dytImage.initImageView();
        })
        this.pageLoading = false;
      }).catch(() => {
        this.pageLoading = false;
      })
    },
    // 不再显示
    closeDialog (type) {
      this.dVisible = false;
      if (type !== 'noLonger') return;
      this.$http.post(this.api.upmsAdmin.updateIgnoreNotice, {}, {hiddenError: true, progress: false}).then(res => {
        const auth = this.localforage.getItem(authGlobal.DBKey);
        const operation = this.localforage.getItem(authGlobal.operation);
        Promise.all([auth, operation]).then(arr => {
          this.localforage.setItem(`${arr[1].loginName}-notice`, `${arr[0].expires_in.toString()}`);
        })
      })
    }
  }
});
</script>
<style lang="less" scoped>
.announcement-details{
  .details-title{
    padding: 5px 0 10px 0;
    font-size: 18px;
    font-weight: bold;
    border-bottom: 1px #ccc dashed;
  }
  .details-container{
    margin-top: 25px;
    white-space: pre-wrap;
  }
  // /deep/img{
  //   max-width: 100%;
  // }
}
</style>
<style lang="less">
.announcement-details-dialog{
  max-width: 1200px;
  .el-dialog__header{
    position: relative;
    padding: 10px 20px;
    margin: 0;
    background: #efefef;
  }
  .el-dialog__headerbtn{
    top: 0;
    padding: 10px;
    width: auto;
    height: auto;
  }
  .el-dialog__body{
    padding: 10px 20px;
    max-height: calc(90vh - 120px);
    overflow: auto;
  }
}
</style>

