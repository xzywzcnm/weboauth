const api = {
  // loginApi: 
  authAdmin: {
    // 登录接口
    login: '/common/token',
    // 退出登录接口(执行该接口，移除token的有效性，多用户会T)
    removeToken: '/common/removeToken',
    // 刷新 token
    refreshToken: '/common/refreshToken',
    // 验证token是否有效
    validationToken: '/common/checkToken'
  },
  upmsAdmin: {
    // 更改密码
    updatePassword: '/sys/account/updatePassword',
    // 获取个人详细信息
    getUserInfo: '/sys/user/getUserInfo',
    // 获取系统
    getSystemPermission: '/sys/system/treeListForUser',
    // 获取系统树
    getSystemTree: '/sys/system/treeList',
    // 获取部门树
    deptSelect: '/sys/dept/treeList',
    // 获取系统下所有菜单
    getMenuTree: '/sys/permission/treeList',
    // 获取系统下菜单权限
    getPermissions: '/sys/permission/listForUser',
    // ERP获取ticket接口
    getTicket: '/api/erp/common/getTicket',
    // 获取公告列表
    getNoticeList:  '/sys/notice/list',
    // 获取公告详情
    getDetails: '/sys/notice/get',
    // 修改当前用户忽略公告状态
    updateIgnoreNotice: '/sys/user/updateIgnoreNotice',
    // 获取ERP汇率
    listRate: '/api/erp/common/listRate'
  },
  erpApi: {
    getTicket: '/setting-service/auth/getTicket'
  },
  // 天气管理
  weatherApi: {
    /**
     * 获取天气管理列表
     * @param country 国家名称，非必传
     */
    getCountryAdminList: '/weather/sysCountryCity/getCountryList',
    /**
     * 获取国家已设置城市
     * @param country 国家名称，必传
     */
    getCountryListDetail: '/weather/sysCountryCity/getCountryListDetail',
    /**
     * 获取单个国家全部城市的天气
     * @param country 国家名称，必传
     */
    getCountryAllCityWeather: '/weather/weather/getCountryAllCityWeather',
    // 获取每个国家排在第一的城市的天气
    getFirstWeather: '/weather/weather/getFirstWeather'
  }
}

const auth = '/dyt-cloud-auth-admin';
const upms = '/dyt-cloud-upms-admin';
// 接口处理
const apiHand = (obj:any, str:string) => {
  for (let key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = `${str}${obj[key]}`;
    } else {
      apiHand(obj[key], str);
    }
  }
}
apiHand(api.authAdmin, auth);
apiHand(api.upmsAdmin, upms);
apiHand(api.weatherApi, upms);
// console.log(api)
export default api