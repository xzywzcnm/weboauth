import common from '@/utils/common';
import { BroadcastChannel } from 'broadcast-channel';

const process:ImportMetaEnv = import.meta.env;
// const AUTHUrl = window.location.origin.includes('172.20.200.14') ? process.VITE_AUTH.replace('dyt.pms.com.cn', '172.20.200.14') : process.VITE_AUTH;

class commonTool {
  subscribe: {[key:string]:Array<(value?:any) => void>}
  broadcast: BroadcastChannel | boolean
  constructor () {
    this.subscribe = {};
    // this.broadcast = window.BroadcastChannel ? new window.BroadcastChannel(`${process.VITE_SYSTEMCODE}-broadcast-channel`) : false
    // 部分浏览器不支持 window.BroadcastChannel 使用 BroadcastChannel 库， 当不支持 BroadcastChannel 时，采用监听LocalStorage 和 IndexedDB 实现通讯
    this.broadcast = new BroadcastChannel(`${process.VITE_SYSTEMCODE}-broadcast-channel`);
  }
}
const tool = new commonTool();

export class busCtrl {
  subscribeKey: Array<{[k:string]:any}>;
  constructor() {
    this.subscribeKey = []; // 通讯 KEY
  }
  /**
   * 订阅全局消息广播(支持同源跨浏览器标签，部分浏览器不支持跨标签)
   * @param key 事件 key 值
   * @param callBack 回调函数
   */
   on (key:string, callBack:(value?:any) => void) {
    if (common.isEmpty(key) || common.isEmpty(callBack)) return;
    if (common.isEmpty(tool.subscribe[key])) {
      tool.subscribe[key] = [callBack];
    } else {
      tool.subscribe[key].push(callBack);
    }
  }
  /**
   * 触发全局消息广播(支持同源跨浏览器标签，部分浏览器不支持跨标签)
   * @param key 事件 key 值
   * @param value 调用订阅事件的参数
   * @param isAstride 是否跨域跨浏览器标签进行广播（默认跨域跨浏览器标签进行广播）
   */
  emit (key:string, value?:any, isAstride?: boolean) {
    this.subscribeKey.push({key: key, value: value});
    // 广播信息
    if (typeof isAstride === 'undefined' || isAstride) {
      if (!common.isBoolean(tool.broadcast)) {
        tool.broadcast.postMessage({[key]: value}); // 广播到同源所有窗口
        tool.broadcast.postMessage({['broadcast-channel-insert-auth-allSysytem']: { key: key, value:value }}); // 广播到所有接入认证中心的系统
      } else {
        console.warn('当前浏览器不支持同源跨浏览器标签通讯');
      }
    }
    if (!common.isEmpty(tool.subscribe[key])) {
      for (let i = 0, len = tool.subscribe[key].length; i < len; i++) {
        tool.subscribe[key][i](value);
      }
    }
  }
  /**
   * 通过 key 和 callBack 解除订阅全局消息广播(和 window.removeEventListener 用法相似)
   * @param key 订阅的 key
   * @param callBack 回调方法
   * @returns 
   */
  off (key:string, callBack?:(value?:any) => void) {
    if (!common.isEmpty(tool.subscribe[key])) {
      if (!common.isEmpty(callBack)) {
        tool.subscribe[key].splice(tool.subscribe[key].indexOf(callBack), 1);
      } else {
        tool.subscribe[key] = [];
      }
    }
  }
}

const bus = new busCtrl();

// 通讯监听
if (!common.isBoolean(tool.broadcast)) {
  const listenerMessage = (observer:{[key:string]:Array<(value?:any) => void>}, message:MessageEvent) => {
    const key = Object.keys(observer);
    const messageData = message.data || message || {};
    const messageKey = Object.keys(messageData);
    for (let i = 0, len = key.length; i < len; i++) {
      for (let j = 0, len = observer[key[i]].length; j < len; j++) {
        if (!common.isEmpty(key[i]) && messageKey.includes(key[i]) && !common.isEmpty(observer[key[i]][j])) {
          observer[key[i]][j](messageData[key[i]]);
        }
      }
    }
  }
  // 监听广播
  tool.broadcast.addEventListener('message', (message:MessageEvent) => {
    listenerMessage(tool.subscribe, message);
  })
} else {
  console.warn('当前浏览器不支持跨跨域标签通讯');
}

export default bus;