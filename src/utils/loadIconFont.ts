// 将所有的字体图标导入
const files = import.meta.globEager("../assets/iconFont/**/iconfont.css");
const filesJs = import.meta.globEager("../assets/iconFont/**/iconfont.js");
Object.keys({...files, ...filesJs});
export default {};
