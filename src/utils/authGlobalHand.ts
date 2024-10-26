// 刷新token 功能
import common from '@/utils/common';
import bus from '@/utils/bus';
import request from '@/utils/request';
import cookieConfig from '@/utils/cookieConfig';
import store from '@/store';
import $api from '$api';
import localforage from 'localforage';
// import Cookies from 'js-cookie';
import * as CryptoJS from 'crypto-js';
import { ElMessageBox, ElMessage } from 'element-plus'

const api:any = $api;
const customEnv = common.getUrlParams({keys: 'targetEnv' });
const process:ImportMetaEnv = import.meta.env;
const env = process.VITE_CONFIG !== 'prod' ? (common.isEmpty(customEnv) ? process.VITE_CONFIG : customEnv) : 'prod';
// 放开菜单权限的系统、账号
const releaseAuthority = {
  'upms-admin': ['admin', 'admin@lapa.com']
}

const tool = {
  // 缓存权限
  loadedPermissions: {},
  loadedMenuTree: {},
  loadedUpmsSystem: [] as Array<any>,
  removeRefreshKeyTime: 5, // 连续刷新 token 时，在第一次刷到之后的时间段内不再刷新(单位: 秒)
  refreshTokenOutTime: 1000 * 10, //刷新 token 超时时间(单位: 毫秒)
  refreshTokenFrequency: 500, // token 刷新时，检查是否已完成刷新频率(单位: 毫秒)
  // 系统信息处理
  systemInfoHand (res:any, newArr:Array<any> = []):Array<any> {
    const arr:Array<any> = res.data ? res.data.childList : [];
    // const hand = (arr:Array<any> = [], newArr:Array<any> = []) => {
      arr.forEach((sys:any) => {
        const children = sys.childList;
        delete sys.childList;
        newArr.push(sys);
        if (!common.isEmpty(children)) {
          this.systemInfoHand(children, newArr);
        }
      })
      return newArr;
    // }
    // return  hand(res.data ? res.data.childList : []);
  },
  // 处理菜单树
  menuTreeHand (arr:Array<any> = [], keys:Array<any> = [], operation:any = {}, newArr:Array<any> = []) {
    arr.forEach(item => {
      typeof item.id === 'number' && (item.id = item.id.toString());
      const children = item.childList;
      delete item.childList;
      if ([1, '1'].includes(item.enable)) {
        if (keys.includes(item.permission) || common.isEmpty(item.permission) ||
          releaseAuthority[operation.systemCode] && releaseAuthority[operation.systemCode].includes(operation.loginName)
        ) {
          newArr.push(item);
          if (!common.isEmpty(children) && !common.isEmpty(newArr[newArr.length - 1])) {
            newArr[newArr.length - 1].childList = [];
            tool.menuTreeHand(children, keys, operation, newArr[newArr.length - 1].childList);
          }
        }
      }
    })
    return newArr;
  },
  // 是否能正常加载对应模块的 js
  isLinkSystem (url:string):Promise<Boolean> {
    return new Promise((resolve, reject) => {
      let link = document.createElement('script');
      link.src = url;
      document.body.appendChild(link);
      // 加载成功
      link.onload = () => {
        link.remove();
        resolve(true);
      }
      // 加载失败
      link.onerror = (e) => {
        link.remove();
        resolve(false);
      }
    })
  }
}

let token = {
  refreshKey: `${env}-refreshAuthCenter`,
  refreshTokenState: 'refreshTokenState',
  DBKey: `${env}-authCenter-token`,
  DBAccess: `${env}-authCenter-access`,
  operation: `${env}-authCenter-operation`,
  firstUrlKey: `${env}-authCenter-first`,
  userInfo: `${env}-authCenter-userInfo`,
  department: `${env}-authCenter-department`,
  resetPassword: ['admin', 'admin@lapa.com'],
  refreshLoginFrequency: 0,
  intervalTime: 3600, // 刷新 token 时长，单位秒
  repeatInterval: 1000 * 5, // 刷新失败，继续刷新间隔时长，单位 毫秒
  // 使用随机数，避免同打开多个窗口时同时刷新 token 造成其他窗口的 token 失效
  beforeTime: 0, // 提前刷新Token时间
  maxRefresh: 1, // 最多刷新次数
  // 不刷新 token 的页面
  refreshOutPath: [
    '/againLogin', '/againLoginAuth', '/targetSystem', '/recordPages', '/testEnvLogin',
    '/login',
  ],
  // noToLogin 不跳转登录页面
  goToLoginOutPath: [
    '/againLogin', '/againLoginAuth', '/targetSystem', '/recordPages', '/testEnvLogin',
    '/login', '/broadcastMessage'
  ],
  refreshPageTime: null,
  repeatTime: null,
  refreshLoginTime: null,
  // 刷新次数
  refresh: 1,
  getHash () {
    let hash = window.location.hash;
    if (hash.substring(0, 1) === '#') {
      hash = hash.substring(1, hash.length);
    }
    if (hash.includes('?')) {
      hash = hash.split('?')[0];
    }
    return hash;
  },
  // 清除缓存中的登录信息
  removeLoginInfo ():Promise<boolean> {
    return new Promise((resolve) => {
      const delItem = {
        clearTimer: () => this.clearRefresh(),
        deState: () => localforage.removeItem(this.refreshTokenState),
        delLogin: () => localforage.removeItem(this.DBKey),
        delOper: () => localforage.removeItem(this.operation),
        delUser: () => localforage.removeItem(this.userInfo),
        delRefresh: () => localforage.removeItem(this.refreshKey)
      }
      common.allSettled(Object.values(delItem)).then(() => {
        common.delCookie([cookieConfig.tokenName]);
        bus.emit('auth-token', null);
        bus.emit('auth-operation', null);
        bus.emit('auth-userInfo', null);
        bus.emit('auth-department', []);
        tool.loadedPermissions = {};
        tool.loadedMenuTree = {};
        tool.loadedUpmsSystem = [];
        resolve(true);
      }).catch((error) => {
        resolve(false);
        console.error(error);
      })
    })
  },
  /**
   * 刷新登录 token
   * @param isDebounce 是否防抖，防止多次刷新
   * @returns 
   */
  refreshLoginToken (isDebounce?:boolean):Promise<Boolean> {
    return new Promise((resolve) => {
      localforage.getItem(this.refreshTokenState).then((state) => {
        localforage.getItem(this.DBKey).then((oldAuth:any) => {
          if (common.isEmpty(oldAuth)) {
            this.removeLoginInfo();
            resolve(false);
            return;
          }
          // 判断是否刚刷新，避免段时间内重复多次刷新
          const refreshState = state as string;
          if (isDebounce && !common.isEmpty(refreshState)) {
            if (refreshState.includes('end-')) {
              const refreshTime = refreshState.split('end-')[1];
              const isDelete = !common.dayjs().subtract(tool.removeRefreshKeyTime, 'second').isBefore(refreshTime);
              if (isDelete) {
                localforage.removeItem(this.refreshTokenState);
              } else {
                resolve(true);
                return;
              }
            } else {
              const refreshTime = refreshState.split('proceed-')[1];
              const isDelete = !common.dayjs().subtract(oldAuth.expires_in || this.intervalTime, 'second').isBefore(refreshTime);
              this.refreshLoginFrequency++;
              if (this.refreshLoginFrequency * tool.refreshTokenFrequency >= tool.refreshTokenOutTime || isDelete) {
                localforage.removeItem(this.refreshTokenState).then(() => {
                  this.refreshLoginFrequency = 0;
                  console.warn('刷新 token 超时, 需要重新登录');
                  !isDebounce && this.removeLoginInfo();
                  resolve(false);
                })
              } else {
                this.refreshLoginTime = setTimeout(() => {
                  this.refreshLoginToken(isDebounce).then(res => {
                    resolve(res);
                  })
                }, tool.refreshTokenFrequency) as any;
              }
              return;
            }
          }
          localforage.setItem(this.refreshTokenState, `proceed-${common.dayjs().format('YYYY-MM-DD HH:mm:ss')}`).then(() => {
            request.post(api.authAdmin.refreshToken, { refreshToken: oldAuth.refresh_token || '' }, {
              hiddenError: true,
              headers : {
                Authorization: `${oldAuth.token_type} ${oldAuth.access_token}`
              }
            }).then(res => {
              // 存储登录时间
              this.refresh = 1;
              this.repeatTime && clearTimeout(this.repeatTime);
              this.repeatTime = null;
              // 存储 token 处理
              this.tokenHand((res.data||{})).then(() => {
                localforage.setItem(this.refreshTokenState, `end-${common.dayjs().format('YYYY-MM-DD HH:mm:ss')}`).then(() => {
                  bus.emit('auth-token', res.data ? {...res.data, isRefresh: true} : null);
                  setTimeout(() => {
                    localforage.removeItem(this.refreshTokenState).then(() => {
                      this.refreshLoginFrequency = 0;
                    });
                  }, 1000 * tool.removeRefreshKeyTime);
                  resolve(true);
                })
              });
            }).catch(() => {
              this.refresh++;
              if (this.refresh > this.maxRefresh) {
                localforage.removeItem(this.refreshTokenState).then(() => {
                  !isDebounce && this.removeLoginInfo();
                  console.warn('刷新 token 失败, 需要重新登录');
                  resolve(false);
                }).catch(() => {
                  !isDebounce && this.removeLoginInfo();
                  console.warn('刷新 token 失败, 需要重新登录');
                  resolve(false);
                })
                return;
              }
              this.repeatTime = setTimeout(() => {
                this.refreshLoginToken(isDebounce).then(res => {
                  resolve(res);
                });
              }, this.repeatInterval) as any;
            })
          })
        })
      })
    })
  },
  // 根据设置时间间隔刷新 token
  againAuthRefresh (initRefresh?:boolean) {
    this.clearRefresh().then(() => {
      const hash = this.getHash();
      if (this.refreshOutPath.includes(hash) && !initRefresh) return;
      if (!['/login'].includes(hash) && initRefresh) return;
      localforage.getItem(this.DBKey).then((authInfo:any) => {
        if (common.isEmpty(authInfo)) {
          return this.removeLoginInfo();
        }
        localforage.getItem(this.refreshKey).then((res:any) => {
          // const random = Number(`${Math.ceil(Math.random() * 9)}${Math.ceil(Math.random() * 9)}`) + Math.ceil(Math.random() * 10);
          // let refreshT = this.intervalTime - random;
          let refreshT = this.intervalTime;
          if (res){
            const results = common.dayjs().subtract(res.intervalTime, 'second').isBefore(res.refreshTime);
            if (results) {
              // refreshT = res.intervalTime - common.dayjs().diff(res.refreshTime, 'second') - random;
              refreshT = res.intervalTime - common.dayjs().diff(res.refreshTime, 'second');
            } else {
              this.refreshLoginToken();
              return;
            }
          } else {
            // 当登录不存在时重新登录一次
            localforage.getItem(this.operation).then((res:any) => {
              // 当不存在登录人时退出登录
              if (common.isEmpty(res)) {
                this.outLogin().then(() => {
                  this.goToLogin();
                });
                return;
              }
              this.authLogin(res.loginName, res.loginpw);
            })
            return;
          }
          refreshT = refreshT > 0 ? refreshT : 0;
          // refreshT = 5;
          console.info(`已启用自动刷新token, 将在${refreshT}秒后(即: ${common.dayjs().add(refreshT,'second').format('YYYY-MM-DD HH:mm:ss')})刷新 token`);
          this.refreshPageTime = setTimeout(() => {
            this.refreshLoginToken();
          }, 1000 * refreshT) as any
        })
      })
    })
  },
  // 清除刷新信息
  clearRefresh (tips?:string):Promise<boolean> {
    return new Promise((resolve) => {
      this.refresh = 1;
      this.refreshPageTime && clearTimeout(this.refreshPageTime);
      this.repeatTime && clearTimeout(this.repeatTime);
      this.refreshLoginTime && clearTimeout(this.refreshLoginTime);
      this.refreshPageTime = null;
      this.repeatTime = null;
      if (!common.isEmpty(tips) && ['tips'].includes(tips)) {
        console.log('自动刷新 token 已被停止');
      }
      resolve(true);
    })
  },
  // 存储 token 处理
  tokenHand (res:any, config?:any) {
    return new Promise((resolve, reject) => {
      common.setCookie([
        { key: cookieConfig.tokenName, value: `${res.token_type} ${res.access_token}` }
      ])
      let awaitList = [];
      if (!common.isEmpty(config) && !common.isEmpty(config.info)) {
        // 存储登录人信息信息
        localforage.setItem(this.operation, config.info).then(() => {
          store.commit('login/operation', config.info);
          bus.emit('auth-operation', config.info);
        })
      }
      // 存储登录时间
      awaitList.push(() => {
        return this.saveLoginTime(res)
      });
      // 存储登 token 信息
      awaitList.push(() => {
        return localforage.setItem(this.DBKey, res)
      });
      common.allSettled(awaitList).then(() => {
        resolve(true);
      }).catch(e => {
        console.error('tokenHand: ', e);
        resolve(false)
      })
    })
  },
  // 存储登录时间
  saveLoginTime (res:any):Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.intervalTime = (res.expires_in && res.expires_in > this.beforeTime) ? (res.expires_in - this.beforeTime) : 0;
      // 存储登录时间
      localforage.setItem(this.refreshKey, {
        refreshTime: common.dayjs().format('YYYY-MM-DD HH:mm:ss'),
        intervalTime: this.intervalTime
      }).then(() => {
        resolve(true);
      }).catch(() => {
        resolve(true);
      })
    })
  },
  // 加密处理
  encryption (params:any) {
    let { data, type, param, key } = params;
    const result = common.copy(data);
    if (type === 'Base64') {
      param.forEach((ele:any) => {
        result[ele] = btoa(result[ele]);
      });
    } else {
      param.forEach((ele:any) => {
        let item = result[ele];
        key = CryptoJS.enc.Latin1.parse(key);
        let iv = key;
        // 加密
        let encrypted = CryptoJS.AES.encrypt(item, key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.ZeroPadding
        });
        result[ele] = encrypted.toString();
      });
    }
    return result;
  },
  // 清空服务器端 token
  removeServerToken ():Promise<{success: boolean, res?: {[key:string]: any}}> {
    return new Promise((resolve, reject) => {
      localforage.getItem(this.DBKey).then((auth:any) => {
        request.post(api.authAdmin.removeToken, {
          accessToken: auth.access_token || '',
          refreshToken: auth.refresh_token || ''
        }, {
          headers : {
            Authorization: `${auth.token_type} ${auth.access_token}`
          }
        }).then(res => {
          resolve({success: true, res: res});
        }).catch(() => {
          resolve({success: false});
        })
      }).catch(() => {
        resolve({success: false});
      })
    })
  },
  // 退出登录
  outLogin (config:any = {}):Promise<boolean> {
    return new Promise((resolve) => {
      // this.removeServerToken().then((res) => {
      //   if (!res.success) return resolve(false);
      this.removeServerToken().finally(() => {
        // 获取用户信息
        localforage.getItem(this.operation).then((db:any) => {
          if (!db) {
            // 清空登录信息
            this.removeLoginInfo().then(() => {
              resolve(true);
            })
            return;
          }
          const val = config.prams || {};
          // 记录退出时页面地址
          localforage.setItem(`${this.DBKey}-target-${db.loginName}`, {
            prams: val.prams || {},
            saveTime: common.dayjs().format('YYYY-MM-DD HH:mm:ss')
          }).then(() => {
            // 清空登录信息
            this.removeLoginInfo().then(() => {
              resolve(true);
            })
          })
        }).catch((e) => {
          resolve(false);
        })
      })
    })
  },
  // 退出交互
  outAuthLogin (config:any = {}):Promise<boolean> {
    return new Promise((resolve) => {
      ElMessageBox.confirm('退出系统中心，已打开的系统将受到影响，是否确认退出？', '温馨提醒', {
        type: 'warning',
        showClose: false,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      }).then(() => {
        this.outLogin(config).then((res) => {
          resolve(res);
        })
      }).catch(() => {
        resolve(false);
      })
    })
  },
  // 验证 token 是否过期
  validationToken ():Promise<boolean> {
    return new Promise((resolve) => {
      localforage.getItem(this.DBKey).then((auth:any) => {
        if (!auth || !auth.access_token) return resolve(false);
        request.get(api.authAdmin.validationToken, {
          params: {accessToken: auth.access_token || ''},
          hiddenError: true,
          headers : {
            Authorization: `${auth.token_type} ${auth.access_token}`
          }
        }).then((res:any) => {
          resolve(true);
        }).catch((error) => {
          this.removeLoginTime().then(() => {
            // 验证失败时，去刷新token
            this.refreshLoginToken().then((res) => {
              !res && console.error('token 验证失败: ', error);
              return resolve(res ? true : false);
            })
          });
        })
      })
    })
  },
  // 移除登录时间
  removeLoginTime ():Promise<boolean> {
    return new Promise((resolve) => {
      localforage.removeItem(this.refreshKey).then(() => {
        resolve(true);
      }).catch(() => {
        resolve(true);
      })
    })
  },
  // 登录处理
  loginHand (userName:string, password:string, againLogin?:boolean):Promise<{[k:string]:any} | null> {
    return new Promise((resolve) => {
      request.post(api.authAdmin.login, { password: password, username: userName }, {isCache: false}).then(res => {
        const operation = { loginName: userName, loginpw: password };
        this.tokenHand(res.data||{}, { info: operation}).then(() => {
          bus.emit('auth-token', res.data ? {...res.data, isRefresh: false} : null);
          againLogin && bus.emit('auth-againLogin', res.data ? {...res.data, isRefresh: false} : null);
        })
        resolve({token: res.data || null, success: true});
      }).catch((err) => {
        localforage.removeItem(this.userInfo).then(() => {
          resolve({token: err, success: false});
        })
      })
    })
  },
  // 登录系统
  authLogin (userName:string, password:string, againLogin?:boolean):Promise<{[k:string]:any} | null> {
    return new Promise((resolve) => {
      localforage.getItem(this.operation).then((info:any) => {
        if (common.isEmpty(info) || (!common.isEmpty(info) && info.loginName !== userName)) {
          tool.loadedPermissions = {};
          tool.loadedMenuTree = {};
          tool.loadedUpmsSystem = [];
          common.allSettled([
            () => {
              return localforage.removeItem(this.userInfo);
            },
            () => {
              return localforage.removeItem(this.department);
            }
          ]).then((arr) => {
            this.loginHand(userName, password, againLogin).then(res => {
              resolve(res);
            })
          })
          return;
        }
        this.loginHand(userName, password, againLogin).then(res => {
          resolve(res);
        })
      }).catch((err) => {
        resolve({token: err, success: false});
      })
    })
  },
  // 获取登录用户信息
  requestUserInfo (type = true):Promise<{[k:string]:any} | null> {
    return new Promise((resolve) => {
      localforage.getItem(this.DBKey).then((auth:any) => {
        if (!auth) {
          localforage.removeItem(this.userInfo).then(() => {
            bus.emit('auth-userInfo', null);
            resolve(null);
          }).catch(() => {
            bus.emit('auth-userInfo', null);
            resolve(null);
          })
          return;
        }
        request.get(api.upmsAdmin.getUserInfo, {
          hiddenError: true,
          progress: type,
          isCache: false,
          headers : {
            Authorization: `${auth.token_type} ${auth.access_token}`
          }
        }).then(res => {
          let newVal = common.copy(res.data);
          newVal.securityUser = newVal.sysUserVO || {};
          delete newVal.sysUserVO;
          localforage.setItem(this.userInfo, newVal).then(() => {
            bus.emit('auth-userInfo', newVal);
            resolve(newVal);
          }).catch(() => {
            bus.emit('auth-userInfo', newVal);
            resolve(newVal);
          })
        }).catch(error => {
          console.error('获取用户信息失败：', error);
          localforage.removeItem(this.userInfo).then(() => {
            bus.emit('auth-userInfo', null);
            resolve(null);
          }).catch(() => {
            bus.emit('auth-userInfo', null);
            resolve(null);
          })
        })
      }).catch(error => {
        console.error('获取用户信息失败：', error);
        localforage.removeItem(this.userInfo).then(() => {
          bus.emit('auth-userInfo', null);
          resolve(null);
        }).catch(() => {
          bus.emit('auth-userInfo', null);
          resolve(null);
        })
      })
    })
  },
  // 获取用户权限
  getPermissionKyes (config:any = {}):Promise<{[k:string]:any}> {
    return new Promise(resolve => {
      localforage.getItem(this.DBKey).then((auth:any) => {
        if (!auth) return resolve({auth: null, keys: [], systemId: ''});
        this.getUpmsSystem(auth).then((sysTree:any) => {
          if (!config.systemCode || !config.type) return resolve({auth: auth, keys: [], systemId: ''});
          const newSys = sysTree.filter((item:any) => item.code === config.systemCode)[0];
          if (!newSys || !newSys.id) return resolve({auth: auth, keys: [], systemId: ''});
          request.get(api.upmsAdmin.getPermissions, {
            hiddenError: true,
            isCache: false,
            headers : {
              Authorization: `${auth.token_type} ${auth.access_token}`
            },
            params: {
              systemId: newSys.id,
              type: config.type
            }
          }).then(res => {
            resolve({auth: auth, keys: res.data && res.data.permissionList ? res.data.permissionList : [], systemId: newSys.id});
          }).catch(error => {
            console.error('获取用户权限信息失败：', error)
            resolve({auth: auth, keys: [], systemId: newSys.id});
          })
        })
      })
    })
  },
  // 获取访问的系统
  getUpmsSystem (auth:{[k:string]: any}, type?:any):Promise<Array<any>> {
    return new Promise(resolve => {
      if (!common.isEmpty(tool.loadedUpmsSystem)) return resolve(tool.loadedUpmsSystem);
      request.get(api.upmsAdmin.getSystemPermission, {
        hiddenError: true,
        progress: type,
        isCache: false,
        headers : {
          Authorization: `${auth.token_type} ${auth.access_token}`
        }
      }).then(res => {
        const sysArr = tool.systemInfoHand(res);
        tool.loadedUpmsSystem = sysArr;
        resolve(sysArr);
      }).catch(() => {
        resolve([]);
      })
    })
  },
  // 获取系统下所有菜单
  getAllMenuTree (auth:any, systemId:any) {
    return new Promise(resolve => {
      if (common.isEmpty(systemId)) return resolve([]);
      request.get(api.upmsAdmin.getMenuTree, {
        hiddenError: true,
        isCache: false,
        headers : {
          Authorization: `${auth.token_type} ${auth.access_token}`
        },
        params: {
          systemId: systemId,
          type: 1
        }
      }).then(res => {
        resolve(res.data && res.data.childList ? res.data.childList : []);
      }).catch(() => {
        resolve([]);
      })
    })
  },
  // 返回对应系统权限
  getPermissions (config:{[k:string]:any}) {
    return new Promise(resolve => {
      if (common.isEmpty(config.systemCode)) return resolve([]);
      // type 固定传 1
      this.getPermissionKyes({...config, type: 1}).then((perInfo:any) => {
        if (common.isEmpty(perInfo.systemId)) {
          resolve([]);
          return;
        }
        const perData = perInfo.keys.filter((item:any) => !common.isEmpty(item));
        tool.loadedPermissions[config.systemCode] = perData;
        resolve(perData);
      })
    })
  },
  // 返回对应系统菜单和权限集合
  getSysMenu (config:{[k:string]:any}) {
    return new Promise(resolve => {
      if (common.isEmpty(config.systemCode)) return resolve([]);
      if (!common.isEmpty(tool.loadedMenuTree[config.systemCode])) return resolve(tool.loadedMenuTree[config.systemCode]);
      localforage.getItem(this.DBKey).then((auth:any) => {
        if (common.isEmpty(auth) || common.isEmpty(auth.access_token)) return resolve([]);
        this.getUpmsSystem(auth).then((sysTree:any) => {
          if (!common.isArray(sysTree)) {
            tool.loadedMenuTree[config.systemCode] = [];
            return resolve([]);
          }
          const nowSys = sysTree.filter(f => f.code === config.systemCode)[0];
          if (common.isEmpty(nowSys)) {
            tool.loadedMenuTree[config.systemCode] = [];
            return resolve([]);
          }
          this.getAllMenuTree(auth, nowSys.id).then((res:any) => {
            localforage.getItem(this.operation).then((operation:any) => {
              if (common.isEmpty(tool.loadedPermissions[config.systemCode])) {
                this.getPermissions(config).then((permissions:any) => {
                  const menuData = tool.menuTreeHand(common.copy(res), permissions || [], {...operation, ...config});
                  tool.loadedMenuTree[config.systemCode] = menuData;
                  resolve(menuData);
                })
                return;
              }
              const menuData = tool.menuTreeHand(common.copy(res), tool.loadedPermissions[config.systemCode], {...operation, ...config});
              tool.loadedMenuTree[config.systemCode] = menuData;
              resolve(menuData);
            })
          })
        })
      })
    })
  },
  // 返回部门树
  getDepartmentTree () {
    return new Promise(resolve => {
      localforage.getItem(this.DBKey).then((auth:any) => {
        request.get(api.upmsAdmin.deptSelect, {
          params: {},
          hiddenError: true,
          isCache: false,
          headers : {
            Authorization: `${auth.token_type} ${auth.access_token}`
          }
        }).then(res => {
          localforage.setItem(this.department, res.data || []).then(() => {
            bus.emit('auth-department', res.data || []);
            resolve(res.data || []);
          }).catch(() => {
            bus.emit('auth-department', res.data || []);
            resolve(res.data || []);
          })
        }).catch(() => {
          localforage.setItem(this.department, []).then(() => {
            bus.emit('auth-department', []);
            resolve([]);
          }).catch(() => {
            bus.emit('auth-department', []);
            resolve([]);
          })
        })
      })
    })
  },
  // 用于获取通途 ticket, 使用 erp 的接口
  getTicket (type?:any) {
    return new Promise((resolve, reject) => {
      localforage.getItem(this.DBKey).then((auth:any) => {
        localforage.getItem(this.userInfo).then((info:any) => {
          if (!info) {
            type && ElMessage({ type: 'error', message: '登录授权失败! 请稍后再试;' });
            return reject(false);
          }
          request.post(api.upmsAdmin.getTicket, {account: info.username, userName: info.securityUser.name}, {
            hiddenError: false,
            isCache: false,
            headers : {
              Authorization: `${auth.token_type} ${auth.access_token}`
            },
          }).then(res => {
            if (res.data) {
              return resolve(res.data || '');
            }
            reject(false);
            type && ElMessage({ type: 'error', message: '登录授权失败! 请稍后再试;' });
          }).catch(() => {
            reject(false);
          })
        })
      }).catch(() => {
        reject(false);
      })
    })
  },
  // 返回登录页面
  goToLogin () {
    const hash = this.getHash();
    if (this.goToLoginOutPath.includes(hash)) return;
    // 终止刷新
    this.clearRefresh().then(() => {
      this.backAauthPage('/login', true);
    });
  },
  // 返回到指定路径, 不带参数返回认证中心登录页面
  backAauthPage (url?:string, isArguments?: boolean) {
    const locat = window.location;
    const path = locat.hash.substring(0, 1) === '#' ? '#' : '';
    let urlParams = '';
    if (isArguments) {
      const params = common.getUrlParams();
      Object.keys(params).forEach((key, index) => {
        urlParams += `${index === 0 ? '?' : '&'}${key}=${params[key]}`
      });
    }
    window.location.href = `${locat.origin}${locat.pathname}${path}${url || '/login'}${urlParams}`;
  },
  // 返回当前 token 信息
  getToken ():Promise<{[k:string]:any} | null> {
    return new Promise((resolve) => {
      localforage.getItem(this.DBKey).then((auth:any) => {
        resolve(auth);
      }).catch(() => {
        resolve(null);
      })
    })
  },
  // 当测试环境用IP登录时
  testLoginAuth (config:any = {}) {
    return new Promise((resolve) => {
      const locat = window.location;
      const isIp = /^([0-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.([0-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.([0-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.([0-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])$/;
      // 本地环境 和 https 环境下
      if (['https:'].includes(locat.protocol) || (common.isBoolean(process.SSR) && process.DEV)) return resolve({});
      if (['dev'].includes(process.VITE_CONFIG) || (['test'].includes(process.VITE_CONFIG) && !isIp.test(locat.hostname))) return resolve({});
      let vh = {
        [locat.hostname]: 'dyt.pms.com.cn',
        'http:': common.isBoolean(process.SSR) && process.DEV ? 'http:' : 'https:'
      }
      localforage.getItem(this.operation).then((res:any) => {
        let url = '';
        let checkUrl = '';
        let baseUrl = '';
        if (['test'].includes(process.VITE_CONFIG)) {
          baseUrl = `${locat.origin.replace(locat.hostname, vh[locat.hostname])}`;
          url = `${baseUrl}${locat.pathname}#/testEnvLogin`;
          checkUrl = `${baseUrl}${locat.pathname.replace('index.html', '')}static/js/networkTest.js`;
        } else if (locat.protocol === 'http:') {
          baseUrl = `${locat.origin.replace(locat.protocol, vh[locat.protocol])}`;
          url = `${baseUrl}${locat.pathname}#/testEnvLogin`;
          checkUrl = `${baseUrl}${locat.pathname.replace('index.html', '')}static/js/networkTest.js`;
        }
        // 是否能打开认证中心文件
        tool.isLinkSystem(checkUrl).then((isPass) => {
          const oldIframe = document.querySelector('#loginOtherAuthIframe');
          if(!isPass) {
            oldIframe && oldIframe.remove();
            return resolve({});
          }
          if (common.isEmpty(oldIframe)) {
            let iframe = document.createElement('iframe');
            iframe.id = 'loginOtherAuthIframe';
            iframe.src = url;
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
          }
        })
      })
    })
  }
}
export default token;

// auth-token              更新账号 token
// auth-operation          更新登录账号
// auth-userInfo           更新登录人信息
// auth-department         更新登录人部门信息


