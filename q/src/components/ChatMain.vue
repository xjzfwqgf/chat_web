<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { io } from 'socket.io-client'
import axios from 'axios'

// 修复1: 直接使用 props.user (不需要 .value)
const props = defineProps({ user: Object })

// 修复2: 使用正确的计算属性
const currentUser = computed(() => props.user)

const socket = ref(null)
const onlineUsers = ref([])
const publicMessages = ref([])
const currentTab = ref('public')
const inputMsg = ref('')
const unreadMap = ref({})
const msgListRef = ref(null)
const emojiList = [
  '😀','😂','😍','😎','😭','😡','👍','🎉','🥳','🤔','😅','😳','😇','😏','😱','😴','🤖','💩','🔥','❤️','👏','🙏','💯','😜','😢'
]
const showEmoji = ref(false)
const fileInputRef = ref(null)

function mapMsgFromDB(msg) {
  return {
    from: msg.fromUser || msg.from,
    nickname: msg.nickname || msg.fromUser || msg.from,
    // 优先用 msg.avatar，没有则尝试从用户表查找
    avatar: msg.avatar || (msg.user && msg.user.avatar) || '',
    text: msg.content || msg.text,
    time: msg.time,
    revoked: !!msg.revoked,
    file: msg.fileName ? {
      name: msg.fileName,
      size: msg.fileSize,
      type: msg.fileType,
      url: msg.fileUrl
    } : undefined
  }
}

onMounted(async () => {
  const socketUrl = window.__APP_CONFIG__?.SOCKET_URL || 'http://localhost:3001'
  socket.value = io(socketUrl)
  
  function doLogin() {
    // 修复4: 使用 currentUser.value.username
    if (socket.value && currentUser.value?.username) {
      socket.value.emit('login', currentUser.value.username)
    }
  }
  
  if (socket.value) {
    socket.value.on('connect', doLogin)
    doLogin()
    
    socket.value.on('online-users', (users) => {
      onlineUsers.value = users
    })
    
    socket.value.on('public-message', (msg) => {
      publicMessages.value.push(mapMsgFromDB(msg))
    })
    
    socket.value.on('revoke-message', ({ type, index, from }) => {
      if (type === 'public' && publicMessages.value[index]) {
        publicMessages.value.splice(index, 1)
      }
    })
    
    socket.value.on('connect_error', (err) => {
      console.error('socket连接失败', err)
      alert('socket.io 连接失败：' + err.message)
    })
  }
  
  try {
    const pubRes = await axios.get('/api/messages/public')
    publicMessages.value = pubRes.data.map(mapMsgFromDB)
  } catch (error) {
    console.error('获取历史消息失败:', error)
  }
})

function getFullTime() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ` +
         `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
}

function sendMsg() {
  if (!inputMsg.value.trim() || !socket.value || socket.value.disconnected || !currentUser.value || !currentUser.value.username) return
  const msg = { 
    from: currentUser.value.username,
    nickname: currentUser.value.nickname,
    avatar: currentUser.value.avatar,
    text: inputMsg.value,
    time: getFullTime()
  }
  socket.value.emit('public-message', msg)
  inputMsg.value = ''
}

// 滚动到底部
watch([publicMessages, currentTab], async () => {
  await nextTick()
  scrollToBottom()
})

function scrollToBottom() {
  if (msgListRef.value) {
    msgListRef.value.scrollTop = msgListRef.value.scrollHeight
  }
}

function handleEmojiSelect(e) {
  inputMsg.value += e
  showEmoji.value = false
}

function triggerFileInput() {
  fileInputRef.value.click()
}

async function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  
  const fileData = { 
    name: file.name, 
    size: file.size, 
    type: file.type 
  }
  
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await axios.post('/api/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    fileData.url = res.data.url
  } catch (err) {
    console.error('文件上传失败:', err)
    alert('文件上传失败')
    return
  }
  
  // 修复6: 使用 currentUser.value
  const msg = {
    from: currentUser.value.username,
    nickname: currentUser.value.nickname,
    avatar: currentUser.value.avatar,
    file: fileData,
    time: getFullTime(),
  }
  
  socket.value.emit('public-message', msg)
  e.target.value = ''
}

// 修复7: 撤回功能使用 username 比较
function canRevoke(msg) {
  return currentUser.value && msg.from === currentUser.value.username && !msg.revoked
}

function revokeMsg(index) {
  if (socket.value) {
    socket.value.emit('revoke-message', { 
      type: 'public', 
      index 
    })
  }
  // 前端直接移除该消息
  publicMessages.value.splice(index, 1)
}

// 1. 修改 isSelfMsg 判断注释
function isSelfMsg(msg) {
  return currentUser.value && msg.nickname === currentUser.value.nickname;
}

function getFileUrl(file) {
  if (!file?.url) return '';
  if (/^https?:\/\//.test(file.url)) return file.url;
  // 兼容 config.json 配置
  const config = window.__APP_CONFIG__ || { API_BASE_URL: 'http://localhost:3001' };
  return config.API_BASE_URL.replace(/\/$/, '') + file.url;
}
</script>

<template>
  <div class="flex flex-col md:flex-row gap-2 md:gap-4 h-[100dvh] md:h-[600px]">
    <!-- 侧边栏 -->
    <div class="w-full md:w-1/4 bg-gradient-to-b from-blue-100 to-blue-50 rounded-xl p-3 md:p-4 flex flex-row md:flex-col gap-2 md:gap-4 shadow-lg items-center md:items-stretch">
      <div class="font-bold text-base md:text-lg text-blue-600 mb-2 flex items-center gap-2">
        <img 
          v-if="currentUser?.avatar" 
          :src="currentUser.avatar" 
          class="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-blue-300 object-cover shadow" 
        />
        <span>你好，{{ currentUser?.nickname }}</span>
      </div>
      <button :class="['tab', 'tab-active']">
        🌐 公共聊天室
      </button>
      <div class="mt-auto text-xs text-gray-400 hidden md:block">
        在线用户：{{ onlineUsers.length }}
      </div>
    </div>
    <!-- 聊天主窗口 -->
    <div class="flex-1 bg-gradient-to-br from-white via-blue-50 to-blue-100 rounded-xl shadow-lg p-2 md:p-4 flex flex-col h-full min-w-0">
      <div 
        class="flex-1 overflow-y-auto mb-2 pr-1 md:pr-2" 
        ref="msgListRef"
      >
        <div v-for="(msg, i) in publicMessages" :key="i">
          <!-- 我的消息（右侧，头像在右） -->
          <div v-if="isSelfMsg(msg)" class="mb-2 md:mb-3 flex items-end gap-1 md:gap-2 group justify-end flex-row">
            <button v-if="canRevoke(msg)" @click="revokeMsg(i)" class="ml-1 md:ml-2 text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition order-first">撤回</button>
            <div class="flex flex-col max-w-[85vw] md:max-w-[70%] items-end">
              <div class="flex items-center mb-1 flex-row-reverse">
                <img v-if="msg.avatar" :src="msg.avatar" class="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-blue-200 object-cover shadow" />
                <span class="font-bold text-blue-600 text-xs md:text-sm">{{ msg.nickname || msg.from }}</span>
                <span class="text-xs text-gray-400 ml-1 md:ml-2">{{ msg.time }}</span>
              </div>
              <div class="px-3 md:px-4 py-2 rounded-2xl shadow transition-all bg-blue-500 text-white rounded-br-none border border-blue-300 msg-bubble">
                <template v-if="msg.revoked">
                  <span class="italic text-gray-400">消息已撤回</span>
                </template>
                <template v-else-if="msg.file">
                  <template v-if="msg.file.type?.startsWith('image/') && msg.file.url">
                    <a :href="msg.file.url" target="_blank" :download="msg.file.name">
                      <img :src="getFileUrl(msg.file)" class="max-w-[40vw] md:max-w-[120px] max-h-[120px] rounded border object-cover hover:opacity-80 transition cursor-pointer" :alt="msg.file.name" />
                    </a>
                  </template>
                  <template v-else>
                    <a :href="msg.file.url" :download="msg.file.name" class="text-blue-100 hover:underline cursor-pointer flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      [文件] {{ msg.file.name }}
                    </a>
                  </template>
                </template>
                <template v-else>
                  {{ msg.text }}
                </template>
              </div>
            </div>
          </div>
          <!-- 他人消息（左侧，头像在左） -->
          <div v-else class="mb-2 md:mb-3 flex items-end gap-1 md:gap-2 group justify-start flex-row">
            <div class="flex flex-col max-w-[85vw] md:max-w-[70%] items-start">
              <div class="flex items-center mb-1">
                <img v-if="msg.avatar" :src="msg.avatar" class="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-blue-200 object-cover shadow" />
                <span class="font-bold text-blue-600 text-xs md:text-sm">{{ msg.nickname || msg.from }}</span>
                <span class="text-xs text-gray-400 ml-1 md:ml-2">{{ msg.time }}</span>
              </div>
              <div class="px-3 md:px-4 py-2 rounded-2xl shadow transition-all bg-white text-gray-800 rounded-bl-none border border-blue-100 msg-bubble">
                <template v-if="msg.revoked">
                  <span class="italic text-gray-400">消息已撤回</span>
                </template>
                <template v-else-if="msg.file">
                  <template v-if="msg.file.type?.startsWith('image/') && msg.file.url">
                    <a :href="msg.file.url" target="_blank" :download="msg.file.name">
                      <img :src="getFileUrl(msg.file)" class="max-w-[40vw] md:max-w-[120px] max-h-[120px] rounded border object-cover hover:opacity-80 transition cursor-pointer" :alt="msg.file.name" />
                    </a>
                  </template>
                  <template v-else>
                    <a :href="msg.file.url" :download="msg.file.name" class="text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      [文件] {{ msg.file.name }}
                    </a>
                  </template>
                </template>
                <template v-else>
                  {{ msg.text }}
                </template>
              </div>
            </div>
            <button v-if="canRevoke(msg)" @click="revokeMsg(i)" class="ml-1 md:ml-2 text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">撤回</button>
          </div>
        </div>
      </div>
      <div class="flex gap-1 md:gap-2 mt-2 items-center relative">
        <button @click="showEmoji = !showEmoji" 
                class="text-xl md:text-2xl hover:bg-blue-100 rounded p-1 border border-blue-200 bg-white shadow">
          😊
        </button>
        <div v-if="showEmoji" 
             class="absolute bottom-12 left-0 bg-white rounded shadow p-2 flex flex-wrap w-60 md:w-72 z-10 border border-blue-200">
          <button v-for="e in emojiList" :key="e" 
                  @click="handleEmojiSelect(e)" 
                  class="text-xl md:text-2xl p-1 hover:bg-blue-100 rounded">
            {{ e }}
          </button>
        </div>
        <button @click="triggerFileInput" 
                class="text-lg md:text-xl hover:bg-blue-100 rounded p-1 border border-blue-200 bg-white shadow" 
                title="发送文件">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5 md:w-6 md:h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a4 4 0 10-5.656-5.656l-6.586 6.586a6 6 0 108.485 8.485l6.586-6.586" />
          </svg>
        </button>
        <input type="file" ref="fileInputRef" class="hidden" @change="handleFileChange" />
        <input v-model="inputMsg" 
               class="input flex-1 min-w-0" 
               placeholder="输入消息..." 
               @keyup.enter="sendMsg" />
        <button class="btn-primary" @click="sendMsg">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab {
  @apply w-full text-left px-3 py-2 rounded hover:bg-blue-100 transition;
}
.tab-active {
  @apply bg-blue-500 text-white;
}
.input {
  @apply border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300;
}
.btn-primary {
  @apply bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 transition;
}
.msg-bubble {
  word-break: break-all;
  white-space: pre-line;
  display: block;
  /* 限制每行最多20字符后自动换行，兼容中英文 */
  overflow-wrap: break-word;
  /* 兼容性处理 */
  /* 下面的 max-width 只是辅助，主逻辑靠 break-all+pre-line */
}

@media (max-width: 768px) {
  .msg-bubble {
    font-size: 15px;
    padding: 10px 12px;
  }
}
</style>