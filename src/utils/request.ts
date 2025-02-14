import axios, { AxiosRequestHeaders, AxiosRequestConfig } from 'axios';
// import router from '@/router';
import { ElMessage } from 'element-plus'
import common from '@/utils/common';
import store from "@/store";
import requestHand from './requestHand.js'
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import cookieConfig from '@/utils/cookieConfig';
import authGlobal from '@/utils/authGlobalHand';
import qs from 'qs';
import md5 from 'blueimp-md5';

const resultExceedTime = 1000 * 0.5; // 单位: 毫秒
const checkResTime = 10; // 单位: 毫秒
const removeRqueryKey = 1000 * 60 * 2; // 超时移除
let awaitTime:{[key:string]:number} = {};
let resultList:{[k:string]:any} = {};

const isFormData = (data:any) => {
  if (common.isEmpty(data)) return false;
  return Object.prototype.toString.call(data) === '[object FormData]';
}
const getrequestKey = (config:AxiosRequestConfig) => {
  let newParams:{[key:string]:any} = {};
  let newData:{[key:string]:any} = {};
  if (config) {
    if (common.isString(config.params) && !isFormData(config.params)) {
      try {
        newParams = JSON.parse(config.params || '{}');
      } catch (e) {
        newParams = { keyParams: config.params }
      }
    } else if (!common.isEmpty(config.params)) {
      newParams = JSON.parse(JSON.stringify(config.params));
    }
    if (common.isString(config.data) && !isFormData(config.data)) {
      try {
        newData = JSON.parse(config.data || '{}');
      } catch (e) {
        newData = { keyData: config.data }
      }
    } else if (!common.isEmpty(config.data)) {
      newData = JSON.parse(JSON.stringify(config.data));
    }
  }
  if (isFormData(newParams)) {
    let obj = {};
    newParams.forEach((item:any, key:string) => {
      obj[key] = common.isFile(item) ? {
        lastModified: item.lastModified,
        name: item.name,
        size: item.size,
        type: item.type,
      } : item;
    })
    newParams = obj;
  }
  if (isFormData(newData)) {
    let obj = {};
    newData.forEach((item:any, key:string) => {
      obj[key] = common.isFile(item) ? {
        lastModified: item.lastModified,
        name: item.name,
        size: item.size,
        type: item.type,
      } : item;
    })
    newData = obj;
  }
  // 排序, 将参数一样顺序不一样的情况处理成一样
  const params = qs.stringify(newParams, {
    sort: (a: string, b: string) => {
      return a.localeCompare(b);
    }
  });
  const dataParams = qs.stringify(newData, {
    sort: (a: string, b: string) => {
      return a.localeCompare(b);
    }
  });
  const responseType = config ? config.responseType || '' : '';
  const key = [(config ? config.method || '' : ''), responseType, (config ? config.url || '' : ''), params, dataParams].join('&');
  return `${md5(key)}${config ? `-${config.url}` || '' : ''}`;
}

// 移除请求
const removePending = (requestKey:string, isRemove?:boolean) => {
  const pendingList = store.getters['getPendingList'];
  // 如果在 pending 中存在当前请求标识，取消当前请求，并且移除
  if (pendingList.has(requestKey)) {
    if (!isRemove) {
      store.commit('deletePending', requestKey);
      delete resultList[requestKey];
      delete awaitTime[requestKey];
    } else {
      setTimeout(() => {
        store.commit('deletePending', requestKey);
        delete resultList[requestKey];
        delete awaitTime[requestKey];
      }, 20);
    }
  }
}

// 添加请求
const addPending = (config:AxiosRequestConfig) => {
  const requestKey = getrequestKey(config);
  const pendingList = store.getters['getPendingList'];
  if (pendingList.has(requestKey)) {
    const thisTime = new Date().getTime();
    if (resultList[requestKey]) {
      const isReject:boolean = resultList[requestKey].status === 'reject' || resultList[requestKey].remove;
      const requestCacheTime = (resultList[requestKey].resultTime || 0) + (config.cacheTime || resultExceedTime);
      // 过期或异常的移除缓存
      if (thisTime - requestCacheTime > 0 || isReject) {
        removePending(requestKey, isReject);
        // 移除之后再次添加进来
        config.cancelToken = config.cancelToken || new axios.CancelToken(cancel => {
          store.commit('pushPending', {requestKey: requestKey, cancel: cancel});
        })
        return;
      }
    }
    // 如果 pending 中存在当前请求则取消后面的请求
    config.cancelToken = new axios.CancelToken(cancel => {
      return cancel(requestKey);
    });
    return;
  }
  // 移除 pendingList 中不存在对应的结果值
  resultList[requestKey] && delete resultList[requestKey];
  // 如果 pending 中不存在当前请求，则添加进去
  config.cancelToken = config.cancelToken || new axios.CancelToken(cancel => {
    store.commit('pushPending', {requestKey: requestKey, cancel: cancel});
  })
}
// 请求配置处理
const requestConfig = (config:AxiosRequestConfig, token:string) => {
  let headersConfig:AxiosRequestHeaders  = {};
  // let curr_url = window.location.protocol + '//' + window.location.host;
  // config.headers.OriginUrl = curr_url;
  if (!common.isEmpty(token)) {
    headersConfig.Authorization = token;
  }
  config.headers = {...headersConfig, ...config.headers};
  config.baseURL = requestHand.baseHand(config.url as string);
  config.timeout = typeof config.timeout === 'number' && config.timeout > 1000 ? config.timeout : 1000 * 120;
  // 移除参数中的空值
  if(common.isEmpty(config.removeEmpty) || (common.isBoolean(config.removeEmpty) && config.removeEmpty)) {
    // 当非 FormData 或 默认提交时对参数处理
    if (!isFormData(config.data)) {
      config.data = !common.isEmpty(config.data) ? common.removeEmpty(config.data) : undefined;
    }
    if (!isFormData(config.params)) {
      config.params = !common.isEmpty(config.params) ? common.removeEmpty(config.params) : undefined;
    }
  }
  // 当下载文件时
  if ((common.isBoolean(config.downLoadFile) && config.downLoadFile) || (common.isBoolean(config.isFile) && config.isFile)) {
    config.responseType = 'blob';
  }
  // 缓存请求值
  if (!common.isBoolean(config.isCache) || config.isCache) {
    addPending(config);
  }
  return config;
}
// axios 默认配置
const instance = axios.create({
  headers: {
    withCredentials: true,
    'Accept-Language': 'zh-CN'
    // 'Access-Control-Allow-Origin': '*',
    // 'Access-Control-Allow-Credentials': true
  }
});

// axios 其他自定义配置
instance.interceptors.request.use((config) => {
  //配置发送请求的信息
  if (typeof config.progress === 'boolean' && config.progress || typeof config.progress !== 'boolean') {
    NProgress.start();
  }
  return new Promise((resolve, reject) => {
    if (common.isEmpty(config.url)) return reject(new Error('请求地址不能为空'));
    // 每次请求前都去判断是否有cookie，如没有则去缓存获取
    let token = common.getCookie(cookieConfig.tokenName) as string;
    if (common.isEmpty(token)) {
      authGlobal.getToken().then((auth) => {
        if (!common.isEmpty(auth)) {
          token = `${auth.token_type} ${auth.access_token}`;
          common.setCookie([
            { key: cookieConfig.tokenName, value: token }
          ])
        }
        resolve(requestConfig(config, token));
      }).catch(() => {
        resolve(requestConfig(config, token));
      })
    } else {
      resolve(requestConfig(config, token));
    }
  })
});

// 添加响应拦截器
instance.interceptors.response.use((response) => {
  return new Promise((resolve, reject) => {
    const config = response.config;
    const requestKey = getrequestKey(config);
    NProgress.done();
    const responseData = response.data || {};
    const code = responseData.status || responseData.code || response.status;
    let newMsg = responseData.msg;
    // 状态码处理
    if (!common.isEmpty(requestHand.hand[code])) {
      requestHand.hand[code](response).then((res:any) => {
        if ((common.isBoolean(config.downLoadFile) && config.downLoadFile) || (common.isBoolean(config.isFile) && config.isFile)) {
          resultList[requestKey] = {
            resultTime: new Date().getTime(),
            result: res,
            downLoadFile: true
          };
          return resolve(common.copy(requestHand.downLoadFile(res)));
        }
        resultList[requestKey] = { resultTime: new Date().getTime(), result: res.data || {}};
        resolve(common.copy(res.data || {}));
      }).catch((err:any) => {
        const newErr = err.response && err.response.data ? err.response.data : err.data || err;
        resultList[requestKey] = { resultTime: new Date().getTime(), status: 'reject', result: newErr };
        reject(common.copy(newErr));
      });
      return;
    }
    // 错误处理
    if(common.isEmpty(newMsg)) {
      if (requestHand.tipsTxt[code]) {
        newMsg = common.isFunction(requestHand.tipsTxt[code]) ?
        requestHand.tipsTxt[code](response, response.data) : requestHand.tipsTxt[code];
      } else {
        newMsg = requestHand.other.unknown;
      }
    }
    !config.hiddenError && ElMessage({
      message: newMsg,
      duration: 3000,
      showClose: true,
      type: 'error'
    });
    console.error(response);
    resultList[requestKey] = { resultTime: new Date().getTime(), status: 'reject', result: responseData};
    return reject(common.copy(responseData));
  })
}, (error) => {
  return new Promise((resolve, reject) => {
    const config = error.config;
    const requestKey = getrequestKey(config);
    NProgress.done();
    if (error.response) {
      const responseData = error.response.data || {};
      const code = responseData.status || responseData.code || error.response.status;
      let newMsg = responseData.msg;
      // 状态码处理
      if (!common.isEmpty(requestHand.hand[code])) {
        requestHand.hand[code](error.response).then((res:any) => {
          if ((common.isBoolean(config.downLoadFile) && config.downLoadFile) || (common.isBoolean(config.isFile) && config.isFile)) {
            resultList[requestKey] = {
              resultTime: new Date().getTime(),
              result: res,
              downLoadFile: true
            };
            return resolve(common.copy(requestHand.downLoadFile(res)));
          }
          resultList[requestKey] = { resultTime: new Date().getTime(), result: res.data || {}};
          return resolve(common.copy(res.data || {}));
        }).catch((err:any) => {
          const newErr = err.response && err.response.data ? err.response.data : err.data || err;
          resultList[requestKey] = { resultTime: new Date().getTime(), status: 'reject', result: newErr};
          reject(common.copy(newErr));
        });
        return;
      }
      // 错误处理
      if(common.isEmpty(newMsg)) {
        if (requestHand.tipsTxt[code]) {
          newMsg = common.isFunction(requestHand.tipsTxt[code]) ?
          requestHand.tipsTxt[code](error.response, error.response.data) : requestHand.tipsTxt[code];
        } else {
          newMsg = requestHand.other.unknown;
        }
      }
      !config.hiddenError && ElMessage({
        message: newMsg || '未知错误，请检查网络是否可用或联系管理员!',
        duration: 3000,
        showClose: true,
        type: 'error'
      });
      console.error(error.response);
      resultList[requestKey] = { resultTime: new Date().getTime(), status: 'reject', result: responseData};
      return reject(common.copy(responseData));
    }
    const pendingList = store.getters['getPendingList'];
    if (error.message && pendingList.has(error.message) && common.isEmpty(config)) {
      // 使用定时器获取接口返回值
      const thisRequest = setInterval(() => {
        awaitTime[error.message] = common.isEmpty(awaitTime[error.message]) ? 0 : awaitTime[error.message] + checkResTime;
        if (!pendingList.has(error.message) || awaitTime[error.message] > removeRqueryKey) {
          clearInterval(thisRequest);
          removePending(error.message, true);
          return reject(common.copy({}));
        }
        if (!common.isEmpty(resultList[error.message])) {
          clearInterval(thisRequest);
          const resultObj = resultList[error.message];
          if (!['reject'].includes(resultObj.status)) {
            resultObj.downLoadFile ? resolve(common.copy(requestHand.downLoadFile(resultObj.result))) : resolve(common.copy(resultObj.result));
          } else {
            reject(common.copy(resultObj.result));
          }
        }
      }, checkResTime)
      return;
    }
    config && !config.hiddenError && ElMessage({
      message: '未知错误，请检查网络是否可用或联系管理员!',
      duration: 3000,
      showClose: true,
      type: 'error'
    });
    console.error(JSON.parse(JSON.stringify(error)));
    resultList[requestKey] = { resultTime: new Date().getTime(), status: 'reject', result: error};
    return reject(common.copy(error));
  })
});
export default instance;
