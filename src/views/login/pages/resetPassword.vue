<template>
  <div
    v-loading="loading"
    class="reset-password-container"
    :class="{'route-password-container': openType === 'route'}"
  >
    <div
      v-if="resetPassword"
      class="reset-password-tips"
    >
      注意：登录密码为系统默认密码，请修改密码后再登录
    </div>
    <div v-if="!isEdit && isPage" class="reset-password-tips">您尚未登录，无法修改密码</div>
    <el-form
      ref="resetForm"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      class="lapa-login-form"
    >
      <el-form-item
        label="当前账号"
      >
        <span>
          {{ userInfo && userInfo.username ? userInfo.username : '' }}
        </span>
      </el-form-item>
      <el-form-item
        v-if="!resetPassword"
        label="当前使用的密码"
        prop="oldPassword"
      >
        <el-input
          v-model="formData.oldPassword"
          :clearable="true"
          :disabled="!isEdit"
          type="password"
        />
      </el-form-item>
      <el-form-item
        label="设置新密码"
        prop="newPassword"
        :disabled="!isEdit"
        type="newPassword"
      >
        <el-input
          v-model="formData.newPassword"
          :clearable="true"
          :disabled="!isEdit"
          type="password"
        />
        <span style="margin-left: 5px;color: #999;">长度最少6位最多20位，必须包含字母，必须包含数字</span>
      </el-form-item>
      <el-form-item
        label="确认新密码"
        prop="confirmNewPassword"
      >
        <el-input
          v-model="formData.confirmNewPassword"
          :clearable="true"
          :disabled="!isEdit"
          type="password"
        />
      </el-form-item>
    </el-form>
    <div style="text-align: right;">
      <el-button
        type="primary"
        @click="submitForm"
        v-if="isEdit"
      >
        确 定
      </el-button>
      <el-button
        v-if="!resetPassword && !isPage"
        @click="submitForm('close')"
      >
        取 消
      </el-button>
      <el-button
        v-if="!resetPassword && isPage"
        @click="backHome"
      >
        返回首页
      </el-button>
      <el-button
        v-if="isPage"
        @click="goToLogin"
      >
        切换账号
      </el-button>
    </div>
  </div>
</template>
<script>
import { defineComponent } from 'vue';
import authGlobal from '@/utils/authGlobalHand';

export default defineComponent({
  name: 'ResetPassword',
  props: {
    dialogVisible: {
      type: Boolean,
      default: false
    },
    openType: {
      type: String,
      default: 'dialog'
    },
    moduleData: {
      type: Object,
      default: () => {
        return {}
      }
    }
  },
  data() {
    return {
      resetPassword: false,
      loading: false,
      userInfo: {},
      isEdit: true,
      formData: {
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      },
      formRules: {
        oldPassword: [
          { required: true, trigger: 'blur', message: '请输入当前使用的密码' },
          { required: true, trigger: 'change', message: '请输入当前使用的密码' }
        ],
        newPassword: [
          { required: true, validator: this.validatePass, trigger: 'change', msg: '请输入新密码' },
          { required: true, validator: this.validatePass, trigger: 'blur', msg: '请输入新密码' }
        ],
        confirmNewPassword: [
          { required: true, trigger: 'change', message: '请确认新密码' },
          { required: true, validator: this.validateAgain, trigger: 'blur', msg: '请确认新密码' }
        ]
      }
    }
  },
  computed: {
    // 是否路由打开
    isPage () {
      return this.$route.path === '/resetPassword'
    }
  },
  watch: {
    dialogVisible: {
      immediate: true,
      deep: true,
      handler (val) {
        !val && this.$refs.resetForm.resetFields();
        this.localforage.getItem(authGlobal.userInfo).then(res => {
          if (!res) {
            this.isEdit = false;
            return;
          };
          this.localforage.getItem(`resetPasswordTips-${res.username||''}`).then(reset => {
            this.resetPassword = !!reset;
            // 默认密码时，自动填充
            reset && (this.formData['oldPassword'] = 'a123456');
          })
        })
      }
    },
    moduleData: {
      immediate: true,
      deep: true,
      handler (val) {
        if (this.$common.isEmpty(val)) {
          this.localforage.getItem(authGlobal.userInfo).then(res => {
            this.userInfo =  res;
          })
        } else {
          this.userInfo = val;
        }
      }
    },
    resetPassword: {
      immediate: true,
      deep: true,
      handler (val) {
        if (!val) return;
        authGlobal.validationToken().then(res => {
          !res && authGlobal.goToLogin();
        })
      }
    }
  },
  created() {},
  mounted() {},
  // 组件销毁前
  beforeUnmount () {},
  methods: {
    // 提交
    submitForm (str) {
      if(str === 'close') {
        this.$emit('update:dialogVisible', false);
        return;
      }
      this.loading = true;
      const oldPassword = authGlobal.encryption({
        data: {
          oldPassword: this.formData.oldPassword
        },
        key: 'auths.dyt.com.hk',
        param: ['oldPassword']
      })
      const newPassword = authGlobal.encryption({
        data: {
          newPassword: this.formData.newPassword
        },
        key: 'auths.dyt.com.hk',
        param: ['newPassword']
      })
      const confirmNewPassword = authGlobal.encryption({
        data: {
          confirmNewPassword: this.formData.confirmNewPassword
        },
        key: 'auths.dyt.com.hk',
        param: ['confirmNewPassword']
      })
      const reqParams = { ...oldPassword, ...newPassword, ...confirmNewPassword};
      this.$refs.resetForm.validate(valid => {
        if(!valid) {
          this.loading = false;
          return;
        }
        this.$http.post(this.api.upmsAdmin.updatePassword, reqParams).then(res => {
          this.loading = false;
          this.$emit('update:dialogVisible', false);
          this.$nextTick(() => {
            authGlobal.outLogin({
              orher: true,
              callBack: (res) => {
                if (res) {
                  authGlobal.clearRefresh().then(() => {
                    authGlobal.goToLogin();
                  })
                }
              }
            });
          })
        }).catch(() => {
          this.loading = false;
        })
      })
    },
    goToLogin () {
      // 调用退出登录方法
      authGlobal.outLogin().then(res => {
        this.$nextTick(() => {
          res && authGlobal.goToLogin();;
        })
      })
    },
    // 返回首页
    backHome () {
      this.$router.push({
        path: `/home`,
        query: this.$common.getUrlParams()
      });
    },
    validatePass (rule, value, callback) {
      if (!this.$common.isEmpty(this.formData.confirmNewPassword)) {
        this.$refs.resetForm && this.$refs.resetForm.validateField('confirmNewPassword');
      } else {
        this.$refs.resetForm && this.$refs.resetForm.clearValidate('confirmNewPassword');
      }
      if (this.$common.isEmpty(value)) {
        callback(new Error(rule.msg));
        return
      }
      if (value.length < 6 || value.length > 20) {
        callback(new Error('长度最少6位最多20位!'));
        return
      }
      // 包含数字、字母
      if (!/\d/.test(value) || !/[a-z]/i.test(value)) {
        callback(new Error('密码必须包含数字、字母!'));
        return
      }
      if (value === 'a123456') {
        callback(new Error('新密码不能设置为初始密码!'));
        return
      }
      if (this.formData.oldPassword ===  value) {
        callback(new Error('新密码不能和旧密码一致!'));
        return
      }
      callback();
    },
    validateAgain (rule, value, callback) {
      if (this.$common.isEmpty(value)) {
        callback(new Error(rule.msg));
        return
      }
      if (value !== this.formData.newPassword) {
        callback(new Error('2次输入新密码不一致，请重新输入!'));
        return
      }
      callback();
    }
  }
});
</script>
<style lang="scss">
.reset-password-container{
  width:100%;
  height: 100%;
  &.route-password-container{
    margin: 0px auto;
    padding: 20px;
    max-width: 840px;
  }
  .el-form-item__content{
    .el-input{
      display: inline-block;
      width: 50%;
      max-width: 250px;
    }
  }
  .reset-password-tips{
    padding: 15px;
    font-size: 20px;
    color: #f60;
    text-align: center;
  }
}
</style>
