import { ElMessageBox } from 'element-plus';
import common from '@/utils/common';
import authGlobal from '@/utils/authGlobalHand';
import axios from 'axios';
import cookieConfig from '@/utils/cookieConfig';

const process:ImportMetaEnv = import.meta.env;

export default {
  // 匹配不同模块服务地址
  baseHand: (url:string) => {
    if (url.includes('/erp/')) {
      return process.VITE_ERP ? `${window.location.protocol}//${process.VITE_ERP}` : '/';
    }
    if (url.includes('/dyt-cloud-upms-admin/')) {
      return process.VITE_UPMS ? `${window.location.protocol}//${process.VITE_UPMS}` : '/';
    }
    return process.VITE_AUTH ? `${window.location.protocol}//${process.VITE_AUTH}` : '/';
  },
  // 返回提示文本, 此次可使用方法
  tipsTxt: {
    // 401: '您暂无访问权限，如需要访问请联系管理员！',
    // 500: '服务出错，请稍后再试！',
    401: '前方限行，需联系管理员授权方可通行！',
    404: '当前接口不存在或服务器故障，请稍后再试或联系管理员！',
    500: '前方有故障，请稍后再试！',
    504: '前方拥堵，请稍后再试！'
  },
  // 处理方法, 执行后不会继续执行后面代码
  hand: {
    200: (response:any) => {
      return new Promise((resolve, reject) => {
        resolve(response);
      });
    },
    451: (response:any) => {
      return new Promise((resolve, reject) => {
        authGlobal.refreshLoginToken(true).then((res) => {
          if (!res) {
            // authGlobal.removeLoginInfo().then(() => {})
            const isHash = () => {
              const relUrl = [
                '/setting-service/auth/refreshToken', '/setting-service/auth/getToken', '/setting-service/auth/outLogin'
              ];
              const wHash = authGlobal.getHash();
              let isHash = authGlobal.goToLoginOutPath.includes(wHash);
              relUrl.forEach(item => {
                if (!isHash && response.config.url.includes(item)) isHash = true;
              })
              return isHash;
            }
            if(isHash()) return reject(response);
            ElMessageBox.alert('抱歉，登陆已超时！您可以点击重新登录。', '系统提示', {
              type: 'error',
              showClose: false,
              callback: (action:any) => {
                authGlobal.goToLogin();
              }
            })
            return reject(response);
          }
          // 刷新token之后重新发起请求
          let config = response.config;
          authGlobal.getToken().then((auth) => {
            if (!common.isEmpty(auth)) {
              common.setCookie(cookieConfig.tokenName, `${auth.token_type} ${auth.access_token}`);
              config.headers = {...config.headers, Authorization: `${auth.token_type} ${auth.access_token}`};
            }
            return resolve(axios(config));
          })
        })
      })
    }
  },
  // 其他
  other: {
    unknown: '系统未知错误,请反馈给管理员'
  },
  // 下载文件
  downLoadFile: (response:{[i:string]:any}) => {
    let str = response.headers['content-disposition'];
    if (!response || !str) return response.data;
    // let suffix = '';
    let fileName = '';
    // 截取文件名和文件类型
    if (str.lastIndexOf('.')) {
      fileName = decodeURI(str.substring(str.indexOf('=') + 1, str.lastIndexOf('.')));
    }
    common.downloadFile(response.data, {name: fileName});
    return response.data;
  }
}