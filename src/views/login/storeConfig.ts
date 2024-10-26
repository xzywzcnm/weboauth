export default {
  // 模块名称
  moduleName: 'login',
  // 全局数据
  state: {
    exitWebOauth: false,
    operation: {}
  },
  // 对数据同步更新
  mutations: {
    exitWebOauth (state:any, data:any) {
      state.exitWebOauth = data;
    },
    operation (state:any, data:any) {
      state.operation = data;
    }
  },
  // 对数据异步更新
  actions: {},
  // 可以理解为computed ，对 state 进行计算处理, 直接对 参数修改会更改到 state
  getters: {
    exitWebOauth: (state:any) => {
      return state.exitWebOauth
    },
    operation: (state:any) => {
      return state.operation
    }
  }
}