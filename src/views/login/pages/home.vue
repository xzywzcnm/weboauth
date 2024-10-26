<template>
  <div v-loading="pageLoading" class="home-container">
    <div class="container-head">
      <div class="head-title" />
      <div class="head-banner">
        <div class="banner-item" />
      </div>
      <div class="head-operation">
        <div class="operation-item">
          <el-popover
            placement="bottom-start"
            title=""
            trigger="hover"
            width="auto"
            popper-class="operation-popper"
          >
            <template v-slot:reference>
              <span>
                <i class="lapa icon-user" />
                {{ (userJson.securityUser && userJson.securityUser.name) ? userJson.securityUser.name : '' }}
              </span>
            </template>
            <div class="user-info">
              <p
                v-for="(item, index) in userInfo"
                :key="`${item.key}-${index}`"
              >
                <span>{{ item.txt }}</span> {{ item.val }}
              </p>
            </div>
          </el-popover>
        </div>
        <div class="operation-item">
          <!-- 公告 -->
          <headNotice :module-data="noticeDataList" />
        </div>
        <div
          class="operation-item"
          @click="changePassword"
        >
          <i class="lapa icon-lock" />
          修改密码
        </div>
        <div
          class="operation-item"
          @click="loginOut"
        >
          <i class="lapa icon-exit" />
          退出
        </div>
      </div>
    </div>
    <div class="container-main">
      <div class="instructions" v-if="rateData.filter(item => !!item.targetCurrencyCode).length > 0">
      <!-- <div class="instructions"> -->
        <div class="instructions-content">
          <p>最新汇率：</p>
          <div class="rate-content-item">
            <template v-for="(item, index) in rateData">
              <p v-if="item.targetCurrencyCode" :key="index">
                {{`${item.targetCurrencyCode} ${item.currencyName || ''} ${item.merchantExchangeRate || '-'}`}}
              </p>
            </template>
          </div>
        </div>
      </div>
      <!-- 天气查看 -->
      <homeWeather/>
      <div class="sys-content">
        <div class="sys-layout">
          <div
            v-for="(item, index) in systemList" :key="`system-${index}`"
            class="item-content"
            @click="openSystem(item)"
          >
            <div
              v-loading="(item.code ? ticketLoading[item.code] : false)"
              class="main-item"
            >
              <div class="main-item-pic">
                <i
                  v-if="item.icon"
                  :class="`lapa icon-${item.icon}`"
                />
              </div>
              <div class="main-item-title">
                {{ item.name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="container-flooter">
      <div class="flooter-other">
        <div
          v-if="otherSys.length > 0"
          class="flooter-row-title"
        >
          其他系统链接
        </div>
        <div
          v-if="otherSys.length > 0"
          class="flooter-row-container"
        >
          <span
            v-for="(item, index) in otherSys"
            :key="`other-sys-${index}`"
            class="container-item"
            @click="openSys(item)"
          >{{ item.title }}</span>
        </div>
      </div>
      <!-- <div class="flooter-main">
        <p>Customer first</p>
        <p>Professional struggle</p>
        <p>Efficient change</p>
      </div> -->
    </div>
    <el-dialog
      title="修改密码"
      v-model="dialogVisible"
      width="800px"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
    >
      <resetPassword
        v-model:dialog-visible="dialogVisible"
        v-model:module-data="userJson"
      />
    </el-dialog>
    <noticeDetails
      v-model:dialog-visible="announcementVisible"
      :module-data="newAnnouncement"
    />
  </div>
</template>
<script>
import { defineComponent } from 'vue';
import resetPassword from './resetPassword.vue';
import noticeDetails from './noticeDetails.vue';
import headNotice from './headNotice.vue';
import homeWeather from './homeWeather.vue';
import authGlobal from '@/utils/authGlobalHand';
import { otherSys } from '../pageConfig'
import { throttle } from 'lodash';

const process = import.meta.env;

export default defineComponent({
  name: 'Home',
  components: {
    resetPassword, noticeDetails, headNotice, homeWeather
  },
  data() {
    return {
      announcementVisible: false,
      pageLoading: false,
      dialogVisible: false,
      superAdmin: false,
      userJson: {},
      newAnnouncement: {},
      noticeDataList: [],
      userInfo: [
        {key: 'username', txt: '账号：', val: ''},
        {key: 'name', txt: '姓名：', val: ''},
        {key: 'phone', txt: '电话：', val: ''},
        {key: 'email', txt: '邮箱：', val: ''},
        {key: 'deptName', txt: '部门：', val: ''},
        {key: 'avatar', txt: '工号：', val: ''},
        {key: 'superAdmin', txt: '管理员：', val: ''}
      ],
      systemList: [],
      ticketLoading: {},
      targetUrlJson: {},
      isiOS: false,
      userOperat: {},
      otherSys: [],
      authInfo: {},
      rateData: [],
      oldQuantity: null,
      rateTime: null
    }
  },
  warch: {},
  created() {
    const userAgent = navigator.userAgent;
    this.isiOS = !!userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
    this.otherSys = (otherSys[process.VITE_CONFIG] || []).filter(item => {
      return !this.$common.isEmpty(item.url);
    })
    this.initPage(true);
  },
  mounted() {
    // 监听添加页面窗口获取到焦点
    // window.open 部分浏览器会被拦截，采用每次激活当前标签时请求最新的数据, 获取浏览器焦点需要注意，当焦点在控制台时(按F12后)部分浏览器失效
    // window.addEventListener('focus', this.windowFocus);
    window.addEventListener('resize', this.rateRolling);
    window.addEventListener('resize', this.sysLayoutHand);
    this.$bus.on('auth-userInfo', throttle(this.windowFocus));
    // 该监听方法在部分浏览器，不是同一窗口打开多标签切换时会失效
    // document.addEventListener('visibilitychange', this.visibilitychange);
  },
  // 组件销毁前
  beforeUnmount () {
    // window.open 部分浏览器会被拦截，采用每次激活当前标签时请求最新的数据, 获取浏览器焦点需要注意，当焦点在控制台时(按F12后)部分浏览器失效
    // window.removeEventListener('focus', this.windowFocus);
    window.removeEventListener('resize', this.rateRolling);
    window.removeEventListener('resize', this.sysLayoutHand);
    this.$bus.off('auth-userInfo', this.windowFocus);
    // document.addEventListener('visibilitychange', this.visibilitychange);
  },
  methods: {
    visibilitychange () {
      const visibility = () => {
        const prefixes = ['webkit', 'moz', 'ms', 'o'];
        let visibility = null;
        if ('visibilityState' in document) {
          visibility = document['visibilityState'];
        } else {
          const getStateVal = prefixes.filter(key => `${key}VisibilityState` in document);
          visibility = getStateVal[0] ? document[`${getStateVal[0]}VisibilityState`] : null;
        }
        return visibility === 'visible';
      }
      visibility();
    },
    
    windowFocus: throttle(function (info) {
      !this.$common.isEmpty(info) && this.initPage(false);
    }),
    initPage (type) {
      type && (this.pageLoading = true);
      // 获取登录用户信息
      // authGlobal.requestUserInfo(type).then(res => {
      this.localforage.getItem(`${authGlobal.userInfo}`).then(res => {
        // 用户信息处理
        this.userInfoHnad(res);
        const getRes = [
          // 从缓存中获取对应环境系统最后访问链接
          {get: () => this.localforage.getItem(`${authGlobal.DBAccess}-${res.username}`), default: {}, key: 'targetUrlJson'},
          // 从缓存中获取登录信息
          {get: () => this.localforage.getItem(authGlobal.DBKey), default: {}, key: 'authInfo'},
          // 获取操作人
          {get: () => this.localforage.getItem(authGlobal.operation), default: {}, key: 'userOperat'},
        ];
        // 获取汇率
        this.getRateList().then(res => {
          this.rateData = res;
          this.$nextTick(() => {
            this.rateRolling();
          })
        });
        this.$common.allSettled(getRes.map(g => g.get)).then(arr => {
          arr.forEach((res, index) => {
            this[getRes[index].key] = res.status === 'fulfilled' ? res.value : getRes[index].default;
          });
          // 获取公告
          this.getNoticeData(type, res, this.authInfo, this.userOperat);
          // 获取有权限的系统
          authGlobal.getUpmsSystem(this.authInfo, type).then(sys => {
            this.systemList = sys;
            this.systemList.forEach(item => {
              item.code && (this.ticketLoading[item.code] = false);
            })
            type && (this.pageLoading = false);
            this.$nextTick(() => {
              this.sysLayoutHand();
            })
          }).catch(() => {
            type && (this.pageLoading = false);
          })
        }).catch(() => {
          type && (this.pageLoading = false);
        });
      }).catch(() => {
        this.pageLoading = false;
        this.$alert('您未登录无权访问，请先登录系统！', '温馨提醒', {
          type: 'error',
          showClose: false,
          callback: action => {
            authGlobal.goToLogin();
          }
        })
      })
    },
    // 计算列
    sysLayoutHand () {
      const colWidth = 390;
      const sysDemo = document.querySelector('.sys-content .sys-layout');
      const sysLength = this.systemList.length;
      if (!sysDemo) return;
      if (sysLength <= 0) {
        sysDemo.style.gridTemplateColumns = `repeat(1, ${colWidth}px)`;
        return;
      }
      let quantity = Math.floor(sysDemo.offsetWidth / colWidth);
      if (quantity > sysLength) {
        quantity = sysLength;
      }
      if (quantity > 4) {
        quantity = 4;
      }
      if (this.oldQuantity == quantity) return;
      this.oldQuantity = quantity;
      sysDemo.style.gridTemplateColumns = `repeat(${quantity}, ${colWidth}px)`;
    },
    // 汇率滚动
    rateRolling () {
      const rate = document.querySelector('.instructions-content .rate-content-item');
      if (!rate) return;
      if (this.rateTime) clearInterval(this.rateTime);
      const h = this.$common.getElementStyle(rate, 'height', true);
      if (h < 24) return;
      const t = Math.abs(this.$common.getElementStyle(rate, 'top', true));
      const difference = h - 24;
      let index = t / 24;
      if (t > difference) {
        rate.style.top = `-${difference}px`;
        index = difference / 24;
      }
      this.rateTime = setInterval(() => {
        const rHeight = this.$common.getElementStyle(rate, 'height', true);
        const amultiple = rHeight / 24;
        if (amultiple > 1) {
          index++;
          if (index >= amultiple) {
            index = 0;
          }
          rate.style.top = `-${index * 24}px`;
        }
      }, 1000 * 5);
    },
    // 获取汇率
    getRateList () {
      return new Promise((resolve, reject) => {
        this.$http.get(this.api.upmsAdmin.listRate, {hiddenError: true, progress: false }).then(res => {
          resolve(res.data || []);
        }).catch(() => {
          resolve([]);
        })
      })
    },
    // 用户信息处理
    userInfoHnad (res) {
      if (this.$common.isEmpty(res)) return;
      this.userJson =  this.$common.copy(res);
      this.userInfo.forEach(item => {
        if (!this.$common.isEmpty(res[item.key])) {
          if (item.key === 'superAdmin') {
            item.val =  [1,'1'].includes(res[item.key]) ? '是' : '否';
            this.superAdmin = [1,'1'].includes(res[item.key]) ? true : false;
          } else {
            item.val = res[item.key];
          }
          // item.val = res[item.key];
        } else if (!this.$common.isEmpty(res.securityUser) && !this.$common.isEmpty(res.securityUser[item.key])) {
          item.val = res.securityUser[item.key];
        }
      })
    },
    openSystem (item) {
      if (this.$common.isEmpty(item) || this.ticketLoading[item.code]) return;
      if (this.$common.isEmpty(item.code)) {
        this.$message.error('未匹配到对应系统链接！');
        return;
      }
      // const sgin = `${this.env.ENV_CONFIG}And${item.code}`;
      let newUrl = item.url;
      if (['tongtool-listing'].includes(item.code)) {
        newUrl = `./#/targetSystem?targetSystem=${newUrl}`;
      } else if (this.targetUrlJson && this.targetUrlJson[item.code]) {
        newUrl = this.targetUrlJson[item.code];
      }
      const origin = window.location.origin;
      // 判断目标地址是否同源。非同源情况下 iframe 是无法读取缓存(session、cookie、indexedDB等)，则需要在iframe下重新登录一次
      if (newUrl.substring(0, origin.length) != origin) {
        newUrl = `${newUrl}${newUrl.includes('?')?'&':'?'}pageName=${this.userOperat.loginName}&pagePass=${this.userOperat.loginpw}`;
      }
      window.open(newUrl);
    },
    // 退出登录
    loginOut () {
      // 调用退出登录方法
      authGlobal.outAuthLogin();
    },
    // 修改密码
    changePassword () {
      this.dialogVisible = true;
    },
    // 图片路径错误处理
    handImgError (e) {
      e.target.src = require('../../../assets/images/placeholder.jpg');
    },
    openSys (sys) {
      window.open(sys.url);
    },
    // 获取公告
    getNoticeData (type, userInfo, auth, operation) {
      this.$http.get(this.api.upmsAdmin.getNoticeList, {
        params: {
          pageNum: 1,
          pageSize: 5,
          status: 1,
          sortField: 'n.gmt_create',
          sortType: 'DESC'
        },
        hiddenError: true,
        progress: type,
      }).then(res => {
        if (res && res.data && res.data.list) {
          if (userInfo.securityUser && [0, '0'].includes(userInfo.securityUser.isIgnoreNotice) && type) {
            if (this.$common.isEmpty(res.data.list[0])) return;
            this.localforage.getItem(`${operation.loginName}-notice`).then(notice => {
              if (`${auth.expires_in.toString()}` === notice) return;
              this.newAnnouncement = res.data.list[0];
              this.$nextTick(() => {
                this.announcementVisible = true;
              })
            })
          }
          this.noticeDataList = res.data.list;
        }
      })
    }
  }
});
</script>
<style lang="scss" scoped>
$headHeight: 90px;
$flooterHeight: 140px;
.home-container{
  width:100%;
  height: 100%;
  // background: #F3F3F3;
  .container-head{
    // position: relative;
    position:sticky;
    top: 0;
    height: $headHeight;
    background-color: #fff;
    z-index: 2;
    // color: #fff;
    // background-color: #0E257C; /* 不支持线性的时候显示 */
    // background-image: linear-gradient(to right, #0E257C , #314696, #2C4396);
    .head-title{
      position: absolute;
      top: 20px;
      left: 40px;
      height: 50px;
      width: 126px;
      background-image: url('../../../assets/images/lapa-logo.png');
      background-size: cover;
      background-repeat: no-repeat;
      background-position: center;
      color: var(--dyt-font-corlor);
      font-weight: bold;
      z-index: 2;
    }
    .head-banner{
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
    }
    .head-operation{
      position: absolute;
      display: -webkit-box;
      display: -ms-flexbox;
      display: flex;
      top: 50%;
      right: 10px;
      z-index: 3;
      transform: translate(0, -50%);
      .operation-item{
        display: inline-block;
        padding: 0 10px;
        cursor: pointer;
      }
    }
    .banner-item{
      height: 100%;
      width: 100%;
      // background-image: url('../../../assets/images/center_banner.png');
      // background-size: cover;
      // background-repeat: no-repeat;
      // background-position: center;
      // opacity: .9;
    }
  }
  .instructions{
    padding: 15px 25px;
    width: 100%;
    margin: 0px auto auto auto;
    line-height: 1.6em;
    background: rgba(#000, 0.15);
    text-align: center;
    z-index: 2;
    .instructions-content{
      display: flex;
      position: relative;
      height: 24px;
      overflow: hidden;
      text-align: left;
      color: #fff;
      .rate-content-item{
        position: absolute;
        top: 0px;
        left: 70px;
        padding-right: 20px;
        line-height: 24px;
        transition: 0.5s;
        p{
          display: inline-block;
          padding-right: 20px;
          &:last-child{
            padding-right: 0;
          }
        }
      }
      
    }
  }
  .container-main{
    position: relative;
    // top: $headHeight;
    min-height: calc(100% - $headHeight - $flooterHeight);
    padding: 0px;
    background-image: url('../../../assets/images/home-bg.png'),linear-gradient( #2175ff, #1673fc);
    background-color: #2175ff;
    background-size: auto calc(100% - 260px);
    // background-size: cover;
    background-repeat: no-repeat;
    background-position: bottom right;
    overflow: auto;
    z-index: 1;
    .sys-content{
      padding: 30px;
      // max-width: 1640px;
      // margin: 0 auto;
      .sys-layout{
        // display: flex;
        // flex-wrap: wrap;
        // justify-content: center;
        display: grid;
        grid-template-columns: repeat(4, 390px);
        gap: 0px;
        justify-content: center;
      }
    }
    .item-content{
      display: inline-block;
      padding: 15px;
      vertical-align: top;
      text-align: left;
    }
    .main-item{
      display: inline-block;
      padding: 40px 35px;
      width: 360px;
      height: 173px;
      // background: #fff;
      color: #fff;
      background-image: url('../../../assets/images/item-bg.png');
      background-size: 100%;
      border-radius: 5px;
      cursor: pointer;
    }
    .main-item-pic{
      height: 50px;
      .lapa {
        font-size: 45px;
        // color: #409EFF;
      }
    }
    .main-item-title{
      padding-top: 10px;
      font-size: 25px;
      font-weight: bold;
    }
  }
  .container-flooter{
    // position: absolute;
    position: sticky;
    bottom: 0;
    height: $flooterHeight;
    width: 100%;
    line-height: 1.6em;
    background-color: #F4F4F4;
    z-index: 2;
    .flooter-other{
      padding: 15px 20px;
      height: 100px;
    }
    .flooter-row-title{
      position: relative;
      color: #999999;
      // font-size: 14px;
      font-weight: bold;
    }
    .flooter-row-container{
      $rowHeight: 30px;
      .container-item{
        position: relative;
        display: inline-block;
        padding: 0 19px;
        height: $rowHeight;
        line-height: $rowHeight;
        color: #999999;
        cursor: pointer;
        &:before{
          position: absolute;
          content: '';
          height: calc(100% - 10px);
          width: 2px;
          left: 0;
          top: 50%;
          transform: translate(0, -50%);
          background: #CFCFCF;
        }
        &:nth-child(1) {
          padding-left: 0;
          &:before{
            display: none;
          }
        }
      }
    }
    .flooter-main{
      display: flex;
      max-width: 700px;
      margin: 0 auto;
      color: #a2a2a2;
      p{
        flex: 100;
        // padding-top: 45px;
        font-size: 16px;
        text-align: center;
      }
    }
  }
}
.operation-popper{
  .user-info{
    min-width: 150px;
    font-size: 12px;
    p{
      padding-bottom: 8px;
      &:nth-last-of-type(1){
        padding: 0;
      }
      span{
        display: inline-block;
        width: 75px;
        text-align: right;
      }
    }
  }
}
</style>
