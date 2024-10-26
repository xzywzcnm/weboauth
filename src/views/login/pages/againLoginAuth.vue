<template>
  <div class="again-login-container">
    <div class="login-head">
      LAPA
    </div>
    <div class="login-main">
      <div class="login-banner">
        <div class="banner-item" />
      </div>
      <div class="form-container">
        <el-form
          ref="loginForm"
          :model="formData"
          :rules="formRules"
          label-width="0"
          class="lapa-login-form"
        >
          <p
            class="lapa-login-title"
            style="padding: 0px 0 20px 0; text-align: center; font-size: 28px;"
          >
            登录超时，请重新登录
          </p>
          <el-form-item
            label=""
            prop="userName"
          >
            <el-input
              v-model="formData.userName"
              :clearable="true"
              class="login-name"
              @focus="inputFocus"
              @keyup.enter="submitForm()"
            >
              <template v-slot:prefix>
                <Icon name="user-filled" />
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
              :clearable="true"
              type="password"
              @focus="inputFocus"
              @keyup.enter="submitForm()"
            >
              <template v-slot:prefix>
                <Icon name="lock" />
              </template>
            </el-input>
            <span
              v-if="errorTips"
              class="el-form-item__error"
            >{{ errorTips }}</span>
          </el-form-item>
          <el-form-item>
            <el-button
              style="width:100%"
              type="primary"
              :disabled="loading"
              @click="submitForm('ruleForm')"
            >
              {{ loading ? '登录中...' : '登录' }}
            </el-button>
          </el-form-item>
        </el-form>
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

export default defineComponent({
  name: 'Login',
  data() {
    return {
      oldLoginInfo: {},
      loading: false,
      errorTips: '',
      oldUserInfo: '',
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
      }
    };
  },
  created() {
    // this.$bus.on('auth-token', this.authLogined);
  },
  mounted() {},
  // 组件销毁前
  beforeUnmount () {
    // this.$bus.off('auth-token', this.authLogined);
  },
  methods: {
    // authLogined () {},
    // 获取缓存记录信息
    getOldLogin (reqParams) {
      this.localforage.getItem(authGlobal.operation).then(res => {
        this.oldLoginInfo = res;
        this.againLogin(reqParams);
      });
    },
    // 重新登录
    againLogin (reqParams) {
      this.loading = true;
      authGlobal.authLogin(reqParams.username, reqParams.password, true).then(res => {
        this.loading = false;
        if (res && res.success) {
          authGlobal.requestUserInfo();
          return;
        }
        console.error(res.token);
        const errorText = '未知错误，请检查网络是否可用或联系管理员!';
        this.errorTips = res.token ? res.token.msg || errorText : errorText;
        // 登录失败，清空记录
        // authGlobal.removeLoginInfo();
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
        this.getOldLogin({...reqParams, username: formData.userName});
      })
    },
    inputFocus() {
      this.errorTips = '';
    }
  }
});
</script>
<style lang="less" scoped>
@headHeight: 40px;
@footerHeight: 65px;
@marginSpan: 0px;
@marginSpanh: 0px;
.again-login-container{
  position: relative;
  width:100%;
  height: 100%;
  // min-width: 700px;
  background: #F3F3F3;
  .login-head{
    position: relative;
    height: @headHeight;
    padding: 0 30px;
    line-height: @headHeight;
    font-size: 25px;
    font-weight: bold;
    color: #fff;
    background-color: #0F267D; /* 不支持线性的时候显示 */
    background-image: linear-gradient(to right, #0F267D , #314696, #2C4396);
  }
  .login-main{
    position: relative;
    margin: @marginSpan @marginSpanh;
    padding: 0;
    height: calc(100% - (@marginSpan * 2 + @headHeight + @footerHeight));
    background: #fff;
    // display: flex;
    .login-banner{
      // flex: 60;
      height: 100%;
      width: 100%;
      .banner-item{
        height: 100%;
        width: 100%;
        background-image: url('../../../assets/images/login-big.png');
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center;
        opacity: .9;
      }
    }
    .form-container{
      position: absolute;
      top: 50%;
      left: 50%;
      width: 50%;
      // flex: 40;
      display: inline-block;
      max-width: 550px;
      min-width: 260px;
      border-radius: 5px;
      transform: translate(-50%,-50%);
      background-color: rgba(#fff, 0.6);
      box-shadow: 0 1px 5px 0px #999;
      z-index: 9;
      .lapa-login-form{
        position: relative;
        padding: 20px 60px;
      }
    }
  }
  .login-flooter{
    position: relative;
    height: @footerHeight;
    padding: 0 120px;
    .flooter-main{
      display: flex;
      height: 100%;
      padding-top: 15px;
      p{
        flex: 10;
        font-size: 18px;
        text-align: center;
      }
    }
  }
}
@media screen and(max-width: 600px) {
  .again-login-container{
    .login-main{
      .form-container{
        width: 95%;
        .lapa-login-form{
          padding: 10px;
        }
      }
    }
    .login-flooter{
      display: none;
    }
  }
}
@media screen and(max-height: 300px) {
  .again-login-container{
    .login-main{
      .form-container{
        .lapa-login-title{
          display: none;
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
.again-login-container{
  .el-input__prefix{
    font-size: 22px;
    color: #3855C7;
  }
  .el-input__inner{
    border: none;
  }
  .el-input-group--append .el-input__inner, .el-input-group__prepend {
    border-radius: 4px;
  }
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
</style>