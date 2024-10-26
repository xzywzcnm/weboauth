<template>
  <div class="login-container" v-loading="pageLoading">
    <div class="login-head">
      <div style="display: inline-block; width: 90px;">
        <img
          src="@images/lapa-logo.png"
          width="100%"
        >
      </div>
      <div class="login-head-tips">
        <img
          src="@images/loginLog.png"
          width="100%"
        >
      </div>
    </div>
    <div class="login-main">
      <div class="login-view-modal">
        <div class="login-banner">
          <div class="banner-item" />
        </div>
        <div class="login-main-right">
          <div class="form-container">
            <el-form
              ref="loginForm"
              :model="formData"
              :rules="formRules"
              label-width="0"
              class="lapa-login-form"
            >
              <p class="lapa-login-tips">
                欢迎登录
              </p>
              <el-form-item
                label=""
                prop="userName"
              >
                <el-input
                  v-model="formData.userName"
                  :clearable="true"
                  placeholder="请输入账号"
                  size="large"
                  class="login-name"
                  :disabled="loading"
                  :class="{
                    'login-name-includes': formData.userName.includes('@')
                  }"
                  @focus="inputFocus"
                  @keyup.enter="submitForm()"
                >
                  <template v-slot:prefix>
                    <Icon name="user-filled"></Icon>
                  </template>
                  <template
                    v-if="!formData.userName.includes('@')"
                    v-slot:append
                  >
                    @lapa.com
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item
                label=""
                prop="password"
              >
                <el-input
                  v-model="formData.password"
                  :show-password="true"
                  :clearable="true"
                  type="password"
                  size="large"
                  :disabled="loading"
                  placeholder="请输入密码"
                  @focus="inputFocus"
                  @keyup.enter="submitForm()"
                >
                  <template v-slot:prefix>
                    <Icon name="lock"></Icon>
                  </template>
                </el-input>
                <span
                  v-if="errorTips"
                  class="el-form-item__error"
                >{{ errorTips }}</span>
              </el-form-item>
              <el-form-item style="padding-top: 40px; margin: 0;">
                <el-button
                  style="width:100%; height: 48px;font-size: 16px;background-color: #4363D0; border-radius: 30px;"
                  type="primary"
                  :disabled="loading"
                  @click="submitForm()"
                >
                  {{ loading ? '登录中...' : '登 录' }}
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
    </div>
    <div class="login-flooter">
      <div class="flooter-main">
        <p>Customer first</p>
        <p>Professional struggle</p>
        <p>Efficient change</p>
      </div>
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue';
import authGlobal from '@/utils/authGlobalHand';
import cookieConfig from '@/utils/cookieConfig';

export default defineComponent({
  name: 'Login',
  data() {
    return {
      // beforeUnloadTime: null,
      pageLoading: false,
      loading: false,
      errorTips: '',
      formData: {
        userName: '',
        password: ''
      },
      formRules: {
        userName: [
          { required: true, message: '请输入账号', trigger: 'change' },
          { required: true, message: '请输入账号', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'change' },
          { required: true, message: '请输入密码', trigger: 'blur' }
        ]
      },
      isiOS: false
    };
  },
  created() {
    this.pageLoading = true;
    const userAgent = navigator.userAgent;
    this.isiOS = !!userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端
    const pageUrl = window.location.href;
    const urlParams = this.$common.getUrlParams({url: pageUrl});
    this.$bus.on('auth-token', this.authLogined);
    if (!this.$common.isEmpty(urlParams.outLogin)) {
      const newUrl =  `${pageUrl.substring(0, pageUrl.indexOf('?'))}`;
      delete urlParams.outLogin;
      authGlobal.outLogin().then(() => {
        this.pageLoading = false;
        window.location.replace(this.$common.isEmpty(urlParams) ? newUrl : `${newUrl}?${this.$common.getParams(urlParams)}`);
      });
      return;
    }
    // 如果已存在token，检测 token 是否过期, 防止多次登录
    authGlobal.validationToken().then((res) => {
      // 已登录并且token未到期,获取用户信息后跳转主页
      this.authLogined(res);      
    });
  },
  mounted() {
    // 绑定事件
    // window.addEventListener('beforeunload', this.onbeforeClose);
  },
  // 组件销毁前
  beforeUnmount () {
    // 解除绑定
    // window.removeEventListener('beforeunload', this.onbeforeClose);
    this.$bus.off('auth-token', this.authLogined);
  },
  methods: {
    authLogined (isLogin) {
      // if (this.loading) return;
      this.pageLoading = true;
      if (!isLogin) {
        // 检查 失败时清空数据
        this.$common.delCookie([cookieConfig.tokenName]);
        this.pageLoading = false;
        this.loading = false;
        return;
      }
      authGlobal.requestUserInfo().then(res => {
        this.pageLoading = false;
        this.loading = false;
        this.$nextTick(() => {
          this.localforage.getItem(`resetPasswordTips-${res.username||''}`).then(reset => {
            this.exitTarget({loginName: res.username}, true, reset);
          })
        })
      }).catch(e => {
        this.pageLoading = false;
        this.loading = false;
        this.$confirm('已登录，但获取用户信息失败，是否进入系统？', '登录成功', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.$nextTick(() => {
            this.localforage.getItem('resetPasswordTips-').then(reset => {
              this.exitTarget({loginName: ''}, true, reset);
            })
          })
        }).catch((e) => {
          console.error(e);
          this.pageLoading = false;
          this.loading = false;
        })
      })
    },
    // 提交登录
    submitForm () {
      this.$refs.loginForm.validate(valid => {
        if(!valid) return;
        this.loading = true;
        const formData = this.$common.copy(this.formData);
        const newVal = formData.userName.split('@');
        if (newVal.length === 1 || (newVal.length === 2 && newVal[1].length === 0)) {
          formData.userName = `${newVal[0]}@lapa.com`;
        }
        const reqParams = authGlobal.encryption({
          data: {
            password: formData.password
          },
          key: 'auths.dyt.com.hk',
          param: ['password']
        });
        const restPs = formData.password === 'a123456';
        this.localforage.setItem(`resetPasswordTips-${formData.userName}`, restPs).then(() => {
          // 登录
          authGlobal.authLogin(formData.userName, reqParams.password).then((token) => {
            this.loading = false;
            if (token.success) return;
            console.error(token.token);
            const errorText = '未知错误，请检查网络是否可用或联系管理员!';
            this.errorTips = token.token ? token.token.msg || errorText : errorText;
          })
        })
      })
    },
    // 跳转
    exitTarget (data = {}, type = false, restPs = false) {
      // authGlobal.testEnvLogin({type: 'loginAuth'}).then(() => {
        this.localforage.getItem(authGlobal.operation).then((userOperat) => {
          // 如果是默认密码，则跳转到修改密码页面
          if (restPs) {
            this.localforage.setItem(`resetPasswordTips-${data.loginName}`, true);
            const params = this.$common.getUrlParams();
            this.$router.push({
              path: `/resetPassword`,
              query: params
            });
            return;
          }
          this.localforage.removeItem(`resetPasswordTips-${data.loginName}`);
          const getUrlParams = this.$common.getUrlParams();
          const routerAdd = this.$common.getUrlParams();
          const outLoginTarget = `${authGlobal.DBKey}-target-${data.loginName}`;
          // 当检测到直接打开页面并且未登录，登录之后打开目标页面，并清空上次退出登录时的地址
          if (getUrlParams && getUrlParams.target && getUrlParams.systemKey) {
            this.localforage.removeItem(outLoginTarget);
            this.localforage.removeItem(authGlobal.firstUrlKey);
            // 新标签页面打开 目标链接
            // window.open(getUrlParams.target);
            // window.name = `${this.env.ENV_CONFIG}And${getUrlParams.systemKey}Id${data.userId || ''}`;
            let newTarget = getUrlParams.target;
            const origin = window.location.origin;
            // 判断目标地址是否同源。非同源情况下 iframe 是无法读取缓存(session、cookie、indexedDB等)，则需要在iframe下重新登录一次
            if (newTarget.substring(0, origin.length) != origin) {
              newTarget = `${newTarget}${newTarget.includes('?')?'&':'?'}pageName=${userOperat.loginName}&pagePass=${userOperat.loginpw}`;
            }
            window.location = newTarget;
            return;
          }
          if (type) {
            // 进入系统中心主页
            this.$router.push({
              path: `/home`,
              query: routerAdd
            });
            return;
          }
          // 正常登录，检测上次退出登录页面
          this.localforage.getItem(outLoginTarget).then(res => {
            // 移除退出登录信息
            this.localforage.removeItem(outLoginTarget);
            if (res && res.saveTime) {
              const timeInterval = this.$common.dayjs().diff(res.saveTime, 'second');
              if (timeInterval < 60 && res.prams && res.prams.targetUrl) {
                this.$confirm('是否前往上次退出系统页面？', '登录成功', {
                  confirmButtonText: '确定',
                  cancelButtonText: '取消',
                  type: 'warning'
                }).then(() => {
                  let newTarget = res.prams.targetUrl;
                  const origin = window.location.origin;
                  // 判断目标地址是否同源。非同源情况下 iframe 是无法读取缓存(session、cookie、indexedDB等)，则需要在iframe下重新登录一次
                  if (newTarget.substring(0, origin.length) != origin) {
                    newTarget = `${newTarget}${newTarget.includes('?')?'&':'?'}pageName=${userOperat.loginName}&pagePass=${userOperat.loginpw}`;
                  }
                  window.location = newTarget;
                }).catch(() => {
                  // 进入系统中心主页
                  this.$router.push({
                    path: `/home`,
                    query: routerAdd
                  });
                })
                return;
              }
            }
            // 进入系统中心主页
            this.$router.push({
              path: `/home`,
              query: routerAdd
            });
          })
        })
      // })
    },
    inputFocus () {
      this.errorTips = '';
    }
  }
});
</script>
<style lang="scss" scoped>
// @use "sass:math";

$headHeight: 90px;
$flooterHeight: 50px;
$marginSpanh: 80px;
$paddingSpan: 60px;
$formPadding: 160px;
.login-container{
  position: relative;
  width:100%;
  height: 100%;
  background: #F3F3F3;
  .login-head{
    .login-head-tips{
      display: inline-block;
      margin-left: 10px;
      width: 180px;
    }
    position: absolute;
    width: 100%;
    height: $headHeight;
    padding: 0 30px 0 80px;
    line-height: $headHeight;
    font-size: 50px;
    font-weight: bold;
    // background-color: #0F267D; /* 不支持线性的时候显示 */
    // background-image: linear-gradient(to right, #0F267D , #314696, #2C4396);
    z-index: 2;
    // border-bottom: 1px solid rgba(0,0,0,.1);
  }
  .login-main{
    position: relative;
    // display: flex;
    height: 100%;
    padding: $headHeight 0 100px 0;
    background-image: url('../../../assets/images/bg-login.png');
    background-color: #fff;
    background-repeat: no-repeat;
    background-position: top;
    background-size: 100% 65%;
    .login-view-modal{
      position: relative;
      display: flex;
      margin: 0 auto;
      width: 70%;
      height: 100%;
      // min-width: 700px;
    }
    .login-banner{
      flex: 41.1;
      // opacity: 0.8;
      border-radius: 5px 0 0 5px;
      box-shadow: 0 1px 6px #c7c7c7;
      overflow: hidden;
      .banner-item{
        height: 100%;
        width: 100%;
        background-image: url('../../../assets/images/fl-login.png');
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center;
        opacity: .9;
      }
    }
    .login-main-right{
      position: relative;
      flex: 58.9;
      display: inline-block;
      min-width: 260px;
      border-radius: 0 5px 5px 0;
      background-color: #fff;
      box-shadow: 0 1px 6px #c7c7c7;
      .lapa-login-form{
        position: absolute;
        padding: 0 60px;
        width: 100%;
        max-width: 550px;
        top: calc(50% - $headHeight);
        left: 50%;
        transform: translate(-50%, calc(-50% + $headHeight / 3));
        // background: #fbfbfb;
        .lapa-login-tips{
          padding: 20px 0 90px 0;
          text-align: center;
          font-size: 28px;
          font-weight: bold;
        }
      }
    }
    .form-container{
      position: relative;
      // margin-top: math.div($formPadding, 2) + $headHeight;
      margin: 0;
      width: 100%;
      min-height: 400px;
      // height: calc(100% - $headHeight - $flooterHeight - $formPadding);
      height: 100%;
      // background: #fbfbfb;
    }
  }
  .login-flooter{
    position: absolute;
    height: $flooterHeight;
    width: 100%;
    left: 0;
    bottom: 0;
    padding: 0 120px;
    .flooter-main{
      display: flex;
      height: 100%;
      p{
        flex: 10;
        font-size: 16px;
        // font-weight: bold;
        color: #999;
        text-align: center;
      }
    }
  }
}
@media screen and(max-width: 900px) {
  .login-container{
    .login-main{
      display: block;
      padding: 0;
      .login-banner{
        position: absolute;
        flex: none;
        height: calc(100% - 220px);
        width: 100%;
        margin-top: 100px;
        border-radius: 5px;
      }
      .login-main-right{
        position: absolute;
        flex: none;
        height: calc(100% - 220px);
        width: 100%;
        margin-top: 100px;
        border-radius: 5px;
        max-width: none;
        min-width: initial;
        background-color: initial;
        box-shadow: none;
        .form-container{
          // margin: $headHeight + ($formPadding / 2) auto 0 auto;
          width: auto;
          background: none;
        }
        .lapa-login-form{
          top: 50%;
          width: 80%;
          transform: translate(-50%, -50%);
          max-width: 500px;
          padding: 20px 40px;
          background: rgba(#fff, 0.5);
          border-radius: 5px;
          box-shadow: 0 2px 5px #949494;
        }
      }
    }
  }
}
@media screen and(max-width: 600px) {
  .login-container{
    .login-head{
      padding: 0 5%;
      .login-head-tips{
        display: none;
      }
    }
    .login-main{
      .login-main-right{
        height: 100%;
        .form-container{
          position: absolute;
          margin: 0;
          width: 100%;
          height: calc(100% - 220px);
          min-height: auto;
          z-index: 99;
          .lapa-login-form{
            width: 90%;
            padding: 20px;
            .lapa-login-tips{
              padding: 20px 0 50px 0;
              text-align: center;
              font-size: 28px;
              font-weight: bold;
            }
          }
        }
      }
    }
    .login-flooter{
      display: none;
    }
  }
}
</style>
<style lang="scss">
.login-container{
  .el-input__prefix{
    font-size: 22px;
    color: #3855C7;
  }
  .el-input__inner{
    border-top: none;
    border-right: none;
    border-left: none;
    border-radius: 0;
    // background: #fbfbfb;
  }
  .login-name{
    .el-input__wrapper{
      padding: 0 82px 0 0;
    }
    &.login-name-includes{
      .el-input__wrapper{
        padding: 0;
      }
    }
  }
  .el-input__wrapper{
    padding: 0;
    box-shadow: none;
    border-radius: 0;
    border-bottom: 1px solid var(--el-input-border-color,var(--el-border-color));
    &.is-focus{
      border-bottom: 1px solid var(--el-color-primary);
    }
  }
  .el-input-group__append{
    box-shadow: none;
  }
  .el-form-item.is-error .el-input__wrapper{
    box-shadow: none;
    border-bottom: 1px solid var(--el-color-danger);
  }
  .el-form-item{
    margin-bottom: 30px;
    .login-name{
      .el-input-group__append{
        padding: 0 10px 0 0;
        color: #333;
        background: #fff;
        border: none;
        position: absolute;
        height: 100%;
        top: 0;
        right: 0;
        width: 80px;
        background: none;
        line-height: 32px;
        border-radius: 4px;
      }
    }
  }
}
</style>