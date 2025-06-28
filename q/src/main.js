import { createApp } from 'vue'
import './style.css'
import './assets/tailwind.css'
import App from './App.vue'
import { loadConfig } from './config'

loadConfig().then(config => {
  window.__APP_CONFIG__ = config
  createApp(App).mount('#app')
}).catch(err => {
  // 配置加载失败时给出提示
  document.body.innerHTML = '<div style="color:red;text-align:center;margin-top:2em">配置文件加载失败：' + err.message + '</div>'
})
