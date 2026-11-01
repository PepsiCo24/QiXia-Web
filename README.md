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

## 外部服务

- AI 导游通过 Vercel AI Gateway 调用 `google/gemini-3.8-flash`，需要有效的 `AI_GATEWAY_API_KEY`。未配置时，浏览页面可以运行，但 AI 对话不可用。
- 使用系统中文字体（苹方、微软雅黑、宋体等）及本机已安装的 Noto 字体，构建无需下载 Google Fonts。
- 地图使用 Esri 卫星影像和 AWS 地形瓦片，需要浏览器能够访问这些外部服务。
- 景点坐标、客流、天气及推荐路线为演示数据，以景区现场与官方信息为准。

## 高德地图与步行路线：两种密钥必须分开

- `AMAP_KEY`（或 `NEXT_PUBLIC_AMAP_KEY`）：高德「Web端（JS API）」密钥，仅用于浏览器地图；现有配置会将它发布到浏览器。
- `AMAP_SECURITY_JS_CODE`：上述 JS API 密钥对应的安全密钥，或配置可信代理。
- `AMAP_WEB_SERVICE_KEY`：单独申请高德「Web 服务」类型密钥，只配置在运行 `/api/route/walking` 的服务端。**不要加 NEXT_PUBLIC_ 前缀，不要提交真实值，不要填入 JS API 密钥。**

路线服务只读取 `AMAP_WEB_SERVICE_KEY`，不再回退使用 `AMAP_KEY`。仅有浏览器密钥时返回配置缺失提示，不发送错误平台的请求；不会退化成直线导航。

若出现 `USERKEY_PLAT_NOMATCH` / `10009`：

1. 管理员进入高德开放平台控制台，在应用中创建平台类型为「Web 服务」的新密钥（不是「Web端（JS API）」）。
2. 在实际 API 部署项目的环境变量中设置 `AMAP_WEB_SERVICE_KEY`，按需覆盖 Production / Preview，检查步行路线服务权限与服务器白名单。
3. 重新部署 API；仅修改环境变量不一定会更新已有部署。浏览器 JS 密钥保持原值。
4. 在新部署上发起步行路线请求，确认成功返回真实路网。不要通过隐藏报错、改画直线或前端暴露服务端密钥来绕过。

GitHub Pages 不能运行此 API，需在具备服务端能力的平台部署路线服务。代码无法把 JS API 密钥转换为 Web 服务密钥；若没有正确凭证，仍需管理员配置后才能恢复。

路线回归检查：`node tests/routing.test.cjs`。

## 重新构建和启动

修改代码后重新运行 `pnpm build`，再重启 `pnpm start --hostname 0.0.0.0 --port 3000`。
