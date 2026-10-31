# 栖霞灵猫 Sprite 资产

素材位于 `public/pet/qixia-cat/`。运行时通过 `manifest.json` 加载，`src` / `sheet` 路径相对该目录。

## 当前素材来源

原始动作图：`6682def1-a017-471b-a77d-e04cab5f53ad_副本.png`（1122 × 1402，RGBA，透明底）。

检测到 9 条行带，目前按每行 8 个候选区域导出 72 张裁片；这不等于已经确认 72 个完整角色，且不是严格等分网格。当前模型无法读取图像，方向、动作与接缝质量仍需人工查看预览确认：

- 行与行之间有 11–20 px 的透明横向间隔，9 条行带边界干净；
- 每行 8 个角色的横向位置与宽度各不相同，无法用 `1122 ÷ 8` 均分；
- 第 5–8 行（`jump`、`sleep`、`curious`、`thinking`）相邻角色身体或尾巴相接，块检测会合并成 4–7 块。

因此本项目**不使用固定网格裁切**，而是逐帧提取：

1. 按 alpha > 60 的占用检测 9 条行带（不声称间隔完全透明）；
2. 每行用「列占用最低点」作为切缝，强制得到 8 个角色；
3. 用 8-连通区域分析丢弃跨切缝的邻帧碎片（小于主体 25% 且贴边的连通块），保留角色本体与飘落的枫叶、云朵等内部装饰；
4. 每帧放到同一块 172 × 165 画布上，保持统一缩放与底部基线，同时保留该帧在行带内的原始纵向偏移——这样跳跃弧线和待机起伏才不会丢失。

## 生成命令

```bash
python3 scripts/process-pet-sheet.py        # 重新裁切，输出 frames/ + manifest.json + QA 图
node scripts/check-pet-assets.mjs           # 静态检查 manifest 与文件引用
node scripts/validate-pet-manifest.cjs      # 用应用内真实校验器复验
```

脚本依赖 Pillow 与 numpy。连通区域周围保留 2px 的原始软透明边缘；这减少硬阈值导致的锯齿，但不构成视觉质量验收。输出：

- `public/pet/qixia-cat/frames/*.png`：72 张逐帧 PNG，全部 172 × 165；
- `public/pet/qixia-cat/manifest.json`：17 个动作的清单；
- `docs/pet-qa/contact-sheet.png`：深色底 contact sheet，用于检查抠图与帧一致性；
- `docs/pet-qa/<action>.gif`：每个动作的播放预览。

## 动作映射

下表全部动作含义与行映射均为暂定，尚未经过人工视觉核验；说明仅代表预期用途。运行时 `idle` 默认静止，仅在交互时播放动作。

| 动作 | 来源行 | 帧数 | 循环 | 说明 |
|---|---|---|---|---|
| `idle` | 0 | 8 | 是 | 正面坐姿，眨眼与尾巴变化 |
| `walk-right` | 1 | 8 | 是 | 侧身行走 |
| `walk-left` | 2 | 8 | 是 | 侧身行走（另一侧） |
| `wave` | 3 | 8 | 是 | 后腿站立、前爪挥动 |
| `jump` | 4 | 7 | 否 | 暂定跳跃；1 帧墨量低于行中位数60%，暂时排除，是否完整须人工确认 |
| `sleep` | 5 | 8 | 是 | 趴卧闭眼，带云朵/汗滴/玫瑰符号 |
| `curious` | 6 | 8 | 是 | 抬头看飘落枫叶，含一帧背影 |
| `thinking` | 7 | 8 | 是 | 边行边衔枫叶，用作「处理中」 |
| `happy` | 8 | 8 | 是 | 抱枫叶、眯眼微笑 |
| `dragged` | 4 复用 | 3 | 是 | 取腾空帧，表现悬空 |
| `landing` | 4 复用 | 2 | 否 | 取收势帧 |
| `guide` | 3 复用 | 3 | 是 | 取抬爪帧作指路 |
| `talking` | 0 复用 | 4 | 是 | 取张口帧作说话 |
| `celebrate` | 8 复用 | 8 | 否 | 与 `happy` 同源 |
| `listen` / `think` / `talk` | 别名 | — | — | 兼容旧播放器命名，分别指向 `curious` / `thinking` / `talking` |

`dragged`、`landing`、`guide`、`talking`、`celebrate` **不是独立绘制**，而是复用最接近的现有帧。它们可以正常播放，但动作语义不如专门绘制的素材准确——后续若有正式素材，只需替换 `frames/` 下的文件并更新 manifest，无需改动 Agent 或交互代码。

## 已知限制

- 原图为生成式角色图，第 5–8 行角色互相接触，切缝处可能有极少量残影；
- 部分飘落枫叶属于相邻格，会出现在相邻帧中，属装饰元素，不影响主体；
- 图为 1122 × 1402，低于 Codex Pet 契约的 1536 × 1872，因此**不能**声明符合官方 Hatch Pet 图集规格；如需严格合规，需以同一角色基准重新生成 192 × 208 单帧的 8 × 9 图集；
- 图像本身无帧标签，动作归属依据画面内容与官方 9 行契约推定。

## manifest 格式

`version` 必须为 `1`。`animations` 包含 `PET_ANIMATIONS` 的全部17个键：14个交互动作与 `listen` / `think` / `talk` 兼容别名。播放器直接使用 `walk-left`、`walk-right`、`dragged`、`landing`、`thinking`、`talking`、`happy` 等动作。每个动画含布尔 `loop` 与非空 `frames`，每帧含正数 `duration`（毫秒）以及下列二选一：

- 独立帧：`{ "src": "frames/idle-0.png", "duration": 190 }`
- 图集裁切：`{ "sheet": "cat-sheet.png", "crop": { "x": 0, "y": 0, "width": 128, "height": 128 }, "duration": 160 }`

帧可单独设置 `anchor: { "x": 0.5, "y": 1 }` 覆盖清单锚点，坐标归一化到 0–1。渲染时按统一比例缩放到固定画布并对齐底部中心，避免不同尺寸帧之间的抖动。

## 替换方式

保持文件名与 manifest 结构不变，直接替换 `frames/` 中的 PNG 即可；若帧数或时长变化，同步修改 `manifest.json` 的 `frames` 数组。切勿提交与景区官方吉祥物相同或高度近似的素材。
