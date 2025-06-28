# Chat Web 项目

本项目是一个基于 Vue3 + TailwindCSS 的现代化聊天室网站，后端采用 Express + Socket.IO，支持登录注册、公共聊天、消息撤回、表情、文件发送、移动端适配等功能，UI 风格类似 QQ。

## 目录结构

```
q/         # 前端源码（Vue3 + Vite + TailwindCSS）
server/    # 后端源码（Node.js + Express + Socket.IO）
```

## 功能特性
- 用户注册/登录
- 公共聊天室，消息归属区分（气泡、头像、昵称）
- 消息撤回（前后端彻底删除）
- 表情、图片、文件发送
- 聊天历史自动滚动、内容自动换行
- 移动端响应式适配
- 头像、昵称展示，历史消息补全
- 前后端一体化 Docker 部署

## 快速开始

### 1. 前端开发

```powershell
cd q
npm install
npm run dev
```
访问 http://localhost:5173

### 2. 后端开发

```powershell
cd server
npm install
node index.js
```
访问 http://localhost:3001

### 3. 前后端整合部署（推荐 Docker）

#### 1）前端打包并拷贝到后端

```powershell
cd q
npm install
npm run build
# 将 dist 目录内容拷贝到 server/public
cp -r dist/* ../server/public/
```

#### 2）构建并运行 Docker 镜像

```powershell
cd ../server
docker build -t chat-full .
docker run -d -p 3001:3001 -v ${PWD}\uploads:/app/uploads --name chat-full chat-full
```

访问 http://localhost:3001 即可使用前后端一体化服务。

## 重要说明
- 上传的图片/文件会保存在 server/uploads 目录，建议用 Docker 卷挂载持久化。
- 前端静态资源由后端 Express 提供（server/public）。
- 如需自定义端口、数据库等，可修改 server/index.js。

## 生产部署建议
- 推荐使用 Docker 部署，方便迁移和升级。
- 可配合 Nginx 做反向代理和 HTTPS。
- 如需分布式部署，前后端可独立容器化。

## License
MIT
