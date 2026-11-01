# 栖霞山 · 数字游览

源仓库：https://github.com/PepsiCo24/QiXia-Web

## GitHub Pages

公开地址：https://pepsico24.github.io/QiXia-Web/

推送到 `main` 后，GitHub Actions 自动构建并发布。工作流使用 Node.js 24 与 pnpm 12.3.4，开启静态导出，并将资源路径设置为 `/QiXia-Web`。

GitHub Pages 无法运行服务端 API，因此发布时临时排除 `app/api`，公开版 AI 导游显示暂未开放；本地服务仍保留 AI API。不要将 API 密钥写入客户端环境变量或提交到仓库。

## 本地部署

需要 Node.js 20.9 或更高版本。依赖版本以 pnpm-lock.yaml 为准。

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
# 如需 AI 导游，在 .env.local 中填写 AI_GATEWAY_API_KEY
pnpm build
pnpm start --hostname 0.0.0.0 --port 3000
```

本机访问 http://localhost:3000 。同一局域网的设备使用本机局域网 IP 加端口 3000 访问。

开发模式：`pnpm dev`。

## 栖小猫 · 栖霞留影

地图下方点击「开始留影」，或访问 `/photo`。支持四款相框、摄像头三秒倒计时、本机上传、自然滤镜、裁切与高清下载，以及公共大屏超时清理。摄像头需 HTTPS 或 localhost；不上传照片、不生成假领取二维码。

使用、架构、待替换相框设计稿、隐私和后续服务接入说明见 [留影模块说明](docs/photo-studio.md)。回归测试运行 `pnpm exec playwright test tests/photo.spec.ts`（先在 3001 端口启动站点）。

## 外部服务

- AI 导游通过 Vercel AI Gateway 调用 `google/gemini-3.8-flash`，需要有效的 `AI_GATEWAY_API_KEY`。未配置时，浏览页面可以运行，但 AI 对话不可用。
- 使用系统中文字体（苹方、微软雅黑、宋体等）及本机已安装的 Noto 字体，构建无需下载 Google Fonts。
- 地图使用 Esri 卫星影像和 AWS 地形瓦片，需要浏览器能够访问这些外部服务。
- 景点坐标、客流、天气及推荐路线为演示数据，以景区现场与官方信息为准。

## 重新构建和启动

修改代码后重新运行 `pnpm build`，再重启 `pnpm start --hostname 0.0.0.0 --port 3000`。
