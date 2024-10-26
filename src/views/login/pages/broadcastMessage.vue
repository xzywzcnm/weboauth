<template>
  <div class="broadcast-message-pages">
    不展示页面，用来处理数据
  </div>
</template>
<script lang="ts" setup>
import { onMounted, onBeforeUnmount, nextTick, reactive } from 'vue';
import authGlobal from '@/utils/authGlobalHand';
import getGlobal from "@/utils/global";

const process = import.meta.env;
const global = getGlobal();
const constant = {
  linkAuth: 'getAuthInfoKey',
  linkOtherSys: 'linkOtherSys'
}
const exclusiveKey = ['authTokenChange', 'sedMessage', 'receiveOtherMessage'];
const DBKey = authGlobal.DBKey;
let base = reactive({
  isAutoRefresh: true
});
const tool = {
  // 自动刷新 token 时处理
  authTokenChange (token:{[key:string]:any}) {
    if (!base.isAutoRefresh) return;
    authGlobal.tokenHand((token||{})).then(() => {
      authGlobal.clearRefresh().then(() => {
        if (global.$common.isEmpty(token)) return;
        authGlobal.againAuthRefresh(!token.isRefresh);
      });
    })
  },
  // 广播消息
  sedMessage (message:{[key:string]:any}) {
    if (global.$common.isEmpty(message.key)) return;     
    window.parent.postMessage({ key: message.key, value: message.value }, '*');
  },
  // 接收其他系统发送到
  receiveOtherMessage (message:{[key:string]:any}) {
    if (global.$common.isEmpty(message.data) || global.$common.isEmpty(message.data.key) || !global.$common.isString(message.data.key)) return;
    // 返回当前系统页面对应的数据
    if (message.data.type === constant.linkAuth) {
      if (exclusiveKey.includes(message.data.key) || global.$common.isEmpty(tool[message.data.key]) || !global.$common.isFunction(tool[message.data.key])) {
        window.parent.postMessage({ key: message.data.key, type: message.data.type, value: null }, '*');
        return;
      }
      tool[message.data.key](message.data);
      return;
    }
    // 只作为中间桥梁传递消息
    global.$bus.emit(message.data.key, message.data.value);
  },
  // 保存访问地址,开发环境时不保存
  saveTarget (data:{[key:string]:any}) {
    const customEnv = global.$common.getUrlParams({keys: 'targetEnv' }) as string;
    const env = process.VITE_CONFIG !== 'prod' ? (global.$common.isEmpty(customEnv) ? process.VITE_CONFIG : customEnv) : 'prod';
    if (!data.value || global.$common.isEmpty(data.value.systemCode) || ['dev'].includes(env)) return;
    global.localforage.getItem(authGlobal.operation).then((info) => {
      const newInfo = info as {[key:string]:any};
      if (global.$common.isEmpty(newInfo)) {
        window.parent.postMessage({ key: data.key, type: data.type, value: false }, '*');
        return;
      }
      global.localforage.getItem(`${authGlobal.DBAccess}-${newInfo.loginName}`).then(tag => {
        const newTag = tag as {[key:string]:any};
        if (global.$common.isEmpty(newTag)) {
          window.parent.postMessage({ key: data.key, type: data.type, value: false }, '*');
          return;
        }
        global.localforage.setItem(`${authGlobal.DBAccess}-${newInfo.loginName}`, {
          ...newTag,
          [`${data.value.systemCode}`]: data.value.target
        }).then(() => {
          window.parent.postMessage({ key: data.key, type: data.type, value: true }, '*');
        }).catch(() => {
          window.parent.postMessage({ key: data.key, type: data.type, value: false }, '*');
        })
      })
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: false }, '*');
    })
  },
  // 登录系统中心
  loginAuth (data:{[key:string]:any}) {
    let pagePame = data.value.pagePame || '';
    if (pagePame.includes('#/')) {
      pagePame = `${pagePame.substring(0, pagePame.indexOf('#/'))}`;
    }
    if(global.$common.isEmpty(pagePame) || global.$common.isEmpty(data.value.pageName)) {
      return window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    }
    authGlobal.authLogin(data.value.pageName, pagePame).then(res => {
      if (res && res.success) {
        if (!data.value.getUserInfo) {
          return window.parent.postMessage({ key: data.key, type: data.type, value: res.token }, '*');
        }
        authGlobal.requestUserInfo(false).then((newRes) => {
          window.parent.postMessage({ key: data.key, type: data.type, value: res.token }, '*');
        })
        return;
      }
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  },
  // 返回 token
  getToken (data:{[key:string]:any}) {
    authGlobal.getToken().then(res => {
      window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  },
  // 获取用户信息
  getUserInfo (data:{[key:string]:any}) {
    global.localforage.getItem(authGlobal.userInfo).then(res => {
      if (global.$common.isEmpty(res)) {
        authGlobal.requestUserInfo(false).then((newRes) => {
          window.parent.postMessage({ key: data.key, type: data.type, value: newRes }, '*');
        }).catch(() => {
          window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
        })
        return;
      }
      window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  },
  // 返回 登录人
  getOperation (data:{[key:string]:any}) {
    global.localforage.getItem(authGlobal.operation).then(res => {
      window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  },
  // 验证 token 是否过期
  validationToken(data:{[key:string]:any}) {
    authGlobal.validationToken().then(res => {
      window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  },
  // 退出登录
  outLogin (data:{[key:string]:any}) {
    authGlobal.outLogin({ prams: data.value || {} }).then(res => {
      nextTick(() => {
        window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
      })
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  },
  // 获取系统权限
  getPermissions (data:{[key:string]:any}) {
    authGlobal.getPermissions(data.value).then(res => {
      window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  },
  // 获取系统菜单
  getSysMenu (data:{[key:string]:any}) {
    authGlobal.getSysMenu(data.value).then(res => {
      window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  },
  // 获取部门树
  getDepartment (data:{[key:string]:any}) {
    global.localforage.getItem(authGlobal.department).then(res => {
      if (global.$common.isEmpty(res)) {
        authGlobal.getDepartmentTree().then(res => {
          window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
        })
        return;
      }
      window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
    })
  },
  // 用于获取通途 ticket, erp、listing等通途系统用到
  getTicket (data:{[key:string]:any}) {
    authGlobal.getTicket().then(res => {
      window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: false }, '*');
    })
  },
  // 对字符串进行加密
  encryption (data:{[key:string]:any}) {
    if (!global.$common.isString(data.value)) {
      window.parent.postMessage({ key: data.key, type: data.type, value: {success: false, errorMessage: '只接受字符串格式'} }, '*');
      return;
    }
    const reqParams = authGlobal.encryption({
      data: {
        password: data.value
      },
      key: 'auths.dyt.com.hk',
      param: ['password']
    });
    window.parent.postMessage({
      key: data.key,
      type: data.type,
      value: {
        success: true, value: reqParams.password
      }
    }, '*');
  },
  // 移除登录时间
  removeLoginTime (data:{[key:string]:any}) {
    authGlobal.removeLoginTime().then((res) => {
      window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  },
  // 刷新 token (刷新会广播到当前浏览器打开的所有已连接到认证中心的系统)
  refreshToken (data:{[key:string]:any}) {
    authGlobal.refreshLoginToken(data.value).then(res => {
      if (res) {
        global.localforage.getItem(DBKey).then(token => {
          window.parent.postMessage({ key: data.key, type: data.type, value: token }, '*');
        }).catch(() => {
          window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
        })
        return;
      }
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  },
  // 停止认证中心默认刷新token (如果同时打开的系统里面有不停止刷新, 其他系统刷新也会接收刷新token的广播)
  clearRefreshToekn (data:{[key:string]:any}) {
    if (!base.isAutoRefresh) return;
    base.isAutoRefresh = false;
    authGlobal.clearRefresh('tips').then((res) => {
      window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  },
  // 启用自动刷新 token
  enableAutoRefresh () {
    if (base.isAutoRefresh) return;
    base.isAutoRefresh = true;
    authGlobal.againAuthRefresh();
  },
  // 清空登录信息(和退出登录一样)
  clearToekn (data:{[key:string]:any}) {
    authGlobal.removeLoginInfo().then((res) => {
      window.parent.postMessage({ key: data.key, type: data.type, value: res }, '*');
    }).catch(() => {
      window.parent.postMessage({ key: data.key, type: data.type, value: null }, '*');
    })
  }
}

// 单独启用
authGlobal.againAuthRefresh();
// 订阅事件
window.addEventListener('message', tool.receiveOtherMessage);
global.$bus.on('broadcast-channel-insert-auth-allSysytem', tool.sedMessage);
global.$bus.on('auth-token', tool.authTokenChange);
// 渲染完成后
onMounted (() => {
  // 通知连接系统：连接成功
  window.parent.postMessage({ [`${process.VITE_BROADCASTKEY}`]: true }, '*');
});
// 组件销毁前
onBeforeUnmount (() => {
  // 解除绑定
  global.localforage.removeItem(authGlobal.refreshTokenState).then(() => {
    authGlobal.refreshLoginFrequency = 0;
  });
  global.$bus.off('broadcast-channel-insert-auth-allSysytem', tool.sedMessage);
  window.removeEventListener('message', tool.receiveOtherMessage);
  global.$bus.off('auth-token', tool.authTokenChange);
});
</script>