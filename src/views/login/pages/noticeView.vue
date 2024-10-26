<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="notice-view">
    <div class="notice-crumbs">
      系统中心 > 公告
    </div>
    <div class="notice-main">
      <div class="notice-list">
        <div class="notice-search-box">
          <el-form
            @submit.prevent
            ref="noticeForm"
            :model="formData"
            :rules="formRules"
            label-width="0"
            class="notice-form"
          >
            <el-form-item label="" prop="titleOrContent">
              <el-input
                v-model="formData.titleOrContent"
                :clearable="true"
                @keyup.enter="searchHand"
                placeholder="请输入关键字(支持查询公告标题、内容)"
              />
            </el-form-item>
          </el-form>
          <el-button type="primary" @click="searchHand" :disabled="pageLoading">
            查 询
          </el-button>
        </div>
        <template v-if="noticeDataList.length > 0">
          <div class="list-container" v-loading="pageLoading">
            <div
              v-for="(item, index) in noticeDataList"
              :key="`notice-${index}`"
              class="notice-row"
              :class="{'check-row': pageId === (item.id).toString()}"
              @click="noticeView(item)"
            >
              
              <span class="notice-title-text">
                <el-popover
                  placement="right-start"
                  title=""
                  trigger="hover"
                  popper-class="notice-operation-popper"
                  width="auto"
                >
                  <template v-slot:reference>
                    <span class="notice-text">
                      {{ item.title }}
                    </span>
                  </template>
                  <span @click="noticeView(item)" class="asg11">
                    {{ item.title }}
                  </span>
                </el-popover>
              </span>
              <span class="notice-create-time">{{ item.gmtCreate ? item.gmtCreate.substr(0, 11) : '' }}</span>
            </div>
          </div>
          <el-pagination
            :disabled="pageLoading"
            v-model:current-page="pageNum"
            :page-size="pageSize"
            layout="total, prev, pager, next"
            :total="total"
            @current-change="handleCurrentChange"
          />
        </template>
        <div
          v-else
          class="empty-content"
        >
          暂无公告数据
        </div>
      </div>
      <div
        v-loading="detailsLoading || pageLoading"
        class="notice-content"
      >
        <template v-if="!$common.isEmpty(noticeDetails)">
          <div class="details-title">
            <p class="title-content">
              {{ noticeDetails.title }}
            </p>
            <p class="title-time">
              {{ noticeDetails.gmtCreate }}
            </p>
          </div>
          <div
            class="details-container"
            v-html="noticeDetails.content"
          />
        </template>
        <div
          v-else
          class="empty-content"
        >
          暂无公告信息
        </div>
      </div>
    </div>
    <dytImage ref="dytImage" target-container=".notice-content" />
  </div>
</template>
<script>
import { defineComponent } from 'vue';
import dytImage from '@/components/dytImageView/dytImage.vue';

export default defineComponent({
  name: 'NoticeView',
  components: { dytImage },
  data() {
    return {
      pageLoading: false,
      detailsLoading: false,
      pageNum: 1,
      pageSize: 20,
      total: 0,
      noticeDataList: [],
      noticeJson: {},
      noticeDetails: {},
      pageId: '',
      formData: {
        titleOrContent: ''
      },
      formRules: {}
    };
  },
  created() {
    this.getNoticeDataList();
  },
  mounted() {},
  // 组件销毁前
  beforeUnmount () {},
  methods: {
    // 获取公告列表
    getNoticeDataList () {
      this.pageLoading = true;
      this.$http.get(this.api.upmsAdmin.getNoticeList, {
        params: {
          pageNum: this.pageNum,
          pageSize: this.pageSize,
          status: 1,
          sortField: 'n.gmt_create',
          sortType: 'DESC',
          ...this.formData
        }
      }).then(res => {
        if (res && res.data && res.data.list) {
          res.data.list.forEach(item => {
            this.noticeJson[item.id] = item;
          });
          this.noticeDataList = res.data.list || [];
          this.total = res.data.total || this.noticeDataList.length;
          this.localforage.getItem('authNoticeId').then(notice => {
            const checkRow = this.noticeDataList.find(f => notice === f.id);
            if (this.noticeDataList.length > 0) {
              this.getNoticeDetails(!this.$common.isEmpty(checkRow) ? checkRow.id : this.noticeDataList[0].id);
              return;
            }
            this.noticeDetails = {};
            this.pageLoading = false;
          }).catch(error => {
            console.error(error)
          })
        }
      }).catch((error) => {
        console.error(error)
        this.pageLoading = false;
      })
    },
    // 获取详情
    getNoticeDetails (id) {
      this.pageId = id.toString();
      this.detailsLoading = true;
      if (!this.pageId) return;
      this.$http.get(this.api.upmsAdmin.getDetails, {params: {id: this.pageId}}).then(res => {
        Object.keys(res.data).forEach(key => {
          this.noticeDetails[key] = res.data[key];
        });
        this.pageLoading = false;
        this.detailsLoading = false;
        this.$nextTick(() => {
          this.$refs.dytImage.initImageView();
        })
      }).catch(() => {
        this.pageLoading = false;
        this.detailsLoading = false;
      })
    },
    // 查看
    noticeView (notice) {
      this.localforage.setItem('authNoticeId', notice.id).then(res => {
        this.getNoticeDetails(notice.id);
      }).catch(() => {
        this.noticeDataList[0] && this.getNoticeDetails(this.noticeDataList[0].id);
      })
    },
    // 翻页
    handleCurrentChange (val) {
      this.pageNum = val;
      this.$nextTick(() => {
        this.getNoticeDataList();
      })
    },
    searchHand () {
      if (this.pageLoading) return;
      this.pageNum = 1;
      this.$nextTick(() => {
        this.getNoticeDataList();
      })
    }
  }
});
</script>
<style lang="less" scoped>
@crumbsHeight: 40px;
@leftWidth: 400px;
.notice-view{
  height: 100%;
  background: #f2f3f4;
  .notice-crumbs{
    padding: 0 20px;
    height: @crumbsHeight;
    line-height: @crumbsHeight;
  }
  .notice-main{
    height: calc(100% - @crumbsHeight);
    // /deep/img{
    //   max-width: 100%;
    // }
    .empty-content{
      padding-top: 20px;
      text-align: center;
      color: #b3b3b3;
    }
    .notice-list{
      display: inline-block;
      margin: 0 8px 0 5px;
      width: @leftWidth;
      height: 100%;
      padding: 10px 2px;
      border-radius: 5px 5px 0 0;
      vertical-align: top;
      background: #fff;
      .list-container{
        max-height: calc(100% - 79px);
        margin-bottom: 15px;
        overflow: auto;
      }
      .notice-row{
        display: flex;
        width: 100%;
        padding:10px;
        cursor: pointer;
        border-bottom: 1px #ccc dashed;
        &.check-row{
          color: #409EFF;
          background: #f2f3f4;
        }
        .notice-title-text{
          flex: 100;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          line-height: 1.6em;
          .notice-text{
            max-width: 100%;
            display: inline-block;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
          }
        }
        .notice-create-time{
          width: 70px;
          margin-left: 5px;
          font-size: 12px;
          line-height: 22px;
          color: #afafaf;
          overflow: hidden;
        }
      }
    }
    .notice-search-box{
      display: flex;
      margin: 0 10px;
      .notice-form{
        flex: 100;
        margin-right: 10px;
        .el-form-item{
          &:last-child{
            margin-bottom: 0;
          }
        }
      }
    }
    .notice-content{
      display: inline-block;
      height: 100%;
      width: calc(100% - @leftWidth - 18px);
      background: #fff;
      vertical-align: top;
      overflow: auto;
      .details-title{
        padding: 20px 30px 0 30px;
        text-align: center;
        .title-content {
          display: inline-block;
          margin-bottom: 10px;
          font-size: 18px;
          font-weight: bold;
          text-align: left;
        }
        .title-time {
          color: #afafaf;
        }
      }
      .details-container{
        padding: 0 30px 10px 30px;
        margin-top: 20px;
        white-space: pre-wrap;
      }
    }
  }
}
</style>
<style>
.notice-operation-popper{
  max-width: 500px;
}
</style>