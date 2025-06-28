<template>
  <div class="fixed inset-0 min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center">
    <div class="w-full max-w-3xl shadow-2xl rounded-2xl bg-white/80 p-6">
      <!-- 修改条件判断 -->
      <template v-if="!user?.nickname">
        <LoginRegister @login-success="onLoginSuccess" />
      </template>
      <template v-else>
        <!-- 使用可选链防止访问 undefined -->
        <div class="text-green-600 font-bold mb-2">已登录：{{ user.nickname }}</div>
        <ChatMain :user="user" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import LoginRegister from './components/LoginRegister.vue'
import ChatMain from './components/ChatMain.vue'

// 初始化为 null 而不是 {}
const user = ref(null)

function onLoginSuccess(userInfo) {
  console.log('login-success emit:', userInfo)
  user.value = {...userInfo}
  console.log('user updated:', user.value)
}
</script>

<style scoped>
:global(body) {
  margin: 0;
  min-height: 100vh;
  width: 100vw;
  overflow-x: hidden;
}
</style>

