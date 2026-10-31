# 栖霞山 · 数字游览

原仓库：https://github.com/PepsiCo24/QiXia-Web

Next.js + MapLibre 的栖霞山数字游览。栖霞灵猫采用二维逐帧 PNG、鼠标/触屏拖拽与流式文字聊天。项目不使用语音识别、语音合成、麦克风或摄像头。

## 本地运行

Node.js 20.9+，pnpm 版本依 lockfile。

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev --hostname 127.0.0.1 --port 3001
```

在本机打开 http://127.0.0.1:3001 。模型密钥仅写入忽略的 `.env.local`。支持 `OPENAI_COMPATIBLE_BASE_URL`、`OPENAI_COMPATIBLE_API_KEY`、`OPENAI_COMPATIBLE_MODEL`，或 Vercel `AI_GATEWAY_API_KEY` / `AI_GATEWAY_MODEL`。未配置模型时仍能展示真实知识库检索摘录，并明确标注没有模型讲解。

```bash
pnpm exec tsc --noEmit
node scripts/check-pet-assets.mjs
node scripts/validate-pet-manifest.cjs
node scripts/test-agent.cjs
pnpm exec playwright test
pnpm build
```

## 知识库与资料边界

Agent 服务端调用公开知识库：https://qixia.winnielyu.com/api/kb 。检索 https://qixia.winnielyu.com/api/kb/search ，卡片列表 https://qixia.winnielyu.com/api/kb/cards?type=place ，详情按 card_id 读取。服务端采用有界缓存、请求合并、超时与取消；上游每 IP 每分钟限 60 次。

来源展示仅使用 API 返回的 `source_url`，附 A/B/C 可信度与 draft 草稿标记。检索文字视作资料而非系统指令。数字或年代冲突须保留多种说法；查询失败显示“资料暂时无法查询”。不访问内部登录数据。地图景点、路线与设施记录为本地演示信息，不能当作知识库历史证据，也不能替代现场步道导航。天气、客流、红叶和设备状态均为演示。

## GitHub Pages 与独立 Agent 服务

GitHub Pages 仅支持静态文件，不能运行 Next API。构建前设置 `NEXT_PUBLIC_AGENT_API_BASE_URL=https://你的-agent-域名`（根地址，不加 `/api/chat`），聊天会请求该服务的 `/api/chat`。未配置时页面明确提示资料无法查询，不伪装成在线知识库回答。本地构建使用同源 `/api/chat`。

Agent 服务可由本仓库的 Next Node/Vercel 部署承担。服务端设置模型密钥和 `AGENT_ALLOWED_ORIGINS=https://pepsico24.github.io`；多个 origin 以逗号分隔，不包含路径。OPTIONS 预检与 POST 均受 allowlist 约束；部署代理应覆盖客户端伪造的 IP 转发头。进程内限流与缓存适用于单实例，多实例生产环境需共享限流存储。凭据不能使用 `NEXT_PUBLIC_` 前缀。

现有 Pages 工作流对 main 推送会自动发布。当前实验工作在 `feat/spirit-cat-kb-agent`，未经明确许可不推送、不部署；外部 Agent 域名与生产验收待提供部署环境后完成。

## 素材与浏览器验证

处理脚本、动作复用和图像限制见 [PET_ASSETS.md](docs/PET_ASSETS.md)。PNG 图集与 GIF 预览已生成；当前执行模型无法读取图像，自动检查仅证明文件/尺寸/引用等结构有效，不能代替逐帧人工视觉验收。

地图影像来自 Esri/AWS 等外部服务；网络不通时底图可能加载失败。请勿把演示路线的台阶、补给、步行距离视为现场承诺。
