const routes = [
  {
    name: '登录',
    path: '/login',
    component: () => import('./pages/login.vue'),
    meta: {requireAuth: false, keepAlive: false}
  },
  {
    name: '首页',
    path: '/home',
    component: () => import('./pages/home.vue'),
    meta: {requireAuth: true}
  },
  {
    name: 'testEnvLogin',
    path: '/testEnvLogin',
    component: () => import('./pages/testEnvLogin.vue'),
    meta: {requireAuth: false, keepAlive: false}
  },
  {
    name: '系统跳转处理',
    path: '/targetSystem',
    component: () => import('./pages/targetSystem.vue'),
    meta: {requireAuth: false, keepAlive: false}
  },
  {
    name: '重登',
    path: '/againLoginAuth',
    component: () => import('./pages/againLoginAuth.vue'),
    meta: {requireAuth: false, keepAlive: false}
  },
  {
    name: '修改密码',
    path: '/resetPassword',
    component: () => import('./pages/resetPassword.vue'),
    meta: {requireAuth: false, keepAlive: false},
    props: {
      dialogVisible: true,
      openType: 'route'
    }
  },
  {
    name: '查看公告',
    path: '/noticeView',
    component: () => import('./pages/noticeView.vue'),
    meta: {requireAuth: true, keepAlive: false}
  },
  {
    name: '广播消息',
    path: '/broadcastMessage',
    component: () => import('./pages/broadcastMessage.vue'),
    meta: {requireAuth: false, keepAlive: false}
  },
  {
    name: '测试1',
    path: '/test1',
    component: () => import('./pages/myPage1.vue'),
    meta: {requireAuth: false, keepAlive: false}
  },
  {
    name: '测试2',
    path: '/test2',
    component: () => import('./pages/myPage2.vue'),
    meta: {requireAuth: false, keepAlive: false}
  },
];
export default routes
