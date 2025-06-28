<script setup>
import { ref } from 'vue'
import axios from 'axios'

// 动态设置 axios 基础地址
axios.defaults.baseURL = window.__APP_CONFIG__?.API_BASE_URL || '/api'

const mode = ref('login') // 'login' or 'register'
const username = ref('')
const password = ref('')
const nickname = ref('')
const avatar = ref('')
const error = ref('')

const emit = defineEmits(['login-success'])

function handleAvatar(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    avatar.value = ev.target.result
  }
  reader.readAsDataURL(file)
}

async function handleSubmit() {
  error.value = ''
  try {
    if (mode.value === 'register') {
      await axios.post('/api/register', {
        username: username.value,
        password: password.value,
        nickname: nickname.value,
        avatar: avatar.value
      })
      // 注册成功后自动登录
      const res = await axios.post('/api/login', {
        username: username.value,
        password: password.value
      })
      console.log('auto login after register:', res.data)
      if (res.data && res.data.nickname) {
        // 先清空 user，确保响应式跳转
        emit('login-success', { username: username.value, nickname: res.data.nickname, avatar: res.data.avatar })
      } else {
        error.value = '自动登录失败，返回数据异常'
      }
    } else {
      const res = await axios.post('/api/login', {
        username: username.value,
        password: password.value
      })
      if (res.data && res.data.nickname) {
        emit('login-success', { username: username.value, nickname: res.data.nickname, avatar: res.data.avatar })
      } else {
        error.value = '登录失败，返回数据异常'
      }
    }
  } catch (e) {
    error.value = e.response?.data?.message || '请求失败'
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-6">
    <div class="text-3xl font-bold text-blue-600 mb-2">Chat Web 聊天室</div>
    <div class="w-full max-w-xs bg-white rounded-xl shadow p-6 flex flex-col gap-4">
      <div class="flex gap-2 justify-center mb-2">
        <button :class="['px-4 py-1 rounded', mode==='login' ? 'bg-blue-500 text-white' : 'bg-gray-100']" @click="mode='login'">登录</button>
        <button :class="['px-4 py-1 rounded', mode==='register' ? 'bg-blue-500 text-white' : 'bg-gray-100']" @click="mode='register'">注册</button>
      </div>
      <input v-model="username" class="input" placeholder="用户名" />
      <input v-model="password" class="input" type="password" placeholder="密码" />
      <input v-if="mode==='register'" v-model="nickname" class="input" placeholder="昵称" />
      <div v-if="mode==='register'" class="flex flex-col gap-2">
        <input type="file" accept="image/*" @change="handleAvatar" />
        <img v-if="avatar" :src="avatar" class="w-16 h-16 rounded-full object-cover mx-auto border" />
      </div>
      <button class="btn-primary mt-2" @click="handleSubmit">{{ mode==='login' ? '登录' : '注册' }}</button>
      <div v-if="error" class="text-red-500 text-sm text-center">{{ error }}</div>
    </div>
  </div>
</template>

<style scoped>
.input {
  @apply border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300;
}
.btn-primary {
  @apply bg-blue-500 text-white rounded px-4 py-2 w-full hover:bg-blue-600 transition;
}
</style>
