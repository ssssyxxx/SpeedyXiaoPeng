## Context

当前 `#bg-room` 背景图通过 CSS 静态写死为 `url('assets/ui/bg_room_dawn.png')`（黄昏版本），无论玩家何时打开游戏，背景始终一致。本次变更在不引入任何新依赖、不改变 localStorage 结构的前提下，用 JS 按本地时间动态设置背景。

## Goals / Non-Goals

**Goals:**
- 根据玩家设备本地时间将背景分为三个时段：白天（06:00–17:59）、黄昏（18:00–19:59）、夜晚（20:00–05:59）
- 在 `init()` 时立即应用背景，并在每次 `tick()` 时重新检查（每分钟一次）
- 背景切换通过 CSS `transition` 淡入，避免突兀跳变
- 图片缺失时降级为对应时段的纯色/渐变背景（不阻塞游戏运行）

**Non-Goals:**
- 不新增 G 状态字段（背景是纯视觉逻辑，无需持久化）
- 不做连续的天光渐变（时段边界切换足够，保持简单）
- 不引入定时器轮询背景（复用现有 tick 机制）

## Decisions

### 决策 1：在 JS 中切换还是在 CSS 中切换？

**选择：JS 动态设置 `#bg-room` 的 `backgroundImage`**

背景切换依赖运行时时间，CSS 无法读取 `Date()`；用 JS 按时段直接写 inline style 最直接，且与现有「所有 DOM 修改走 JS 函数」的约定一致。

**备选方案：** 在 `<body>` 上切换 class（如 `.time-day` / `.time-dusk` / `.time-night`），由 CSS 定义各 class 下的背景。优点是样式集中于 CSS；缺点是需要在两个文件间协调 class 名，且 `transition` 对 `background-image` 本来就不支持跨图渐变，故两种方案在动画效果上等价，JS 直接设置更简洁。

---

### 决策 2：时段划分

| 时段 | 小时范围 | 背景文件 | Fallback 色调 |
|------|---------|---------|--------------|
| 白天 | 06–17 | `bg_room_day.png` | `#c8e8f0`（晴天蓝白） |
| 黄昏 | 18–19 | `bg_room_dawn.png`（现有） | `#1a2e42`（现有暗蓝） |
| 夜晚 | 20–05 | `bg_room_night.png` | `#0d1220`（深夜蓝黑） |

边界选取参考中国日常作息（黄昏约 18–20 点），与现有黄昏图风格匹配。

---

### 决策 3：过渡动画方案

`background-image` 属性不支持 CSS `transition`。解决方案：给 `#bg-room` 添加 `opacity` 过渡——切换时先将 `opacity` 降至 0，更换图片后再还原为 1（fade-out → swap → fade-in）。整个过渡约 400ms，不影响游戏操作。

## Risks / Trade-offs

- **图片加载延迟** → 首次切换到白天/夜晚时若图片未缓存，可能短暂显示 fallback 色。Mitigation：fallback 色与时段氛围一致，视觉上可接受；后续访问命中缓存。
- **Tick 频率** → 背景检查随 tick 每 60 秒执行一次，理论上切换最多延迟 60 秒。Mitigation：`init()` 时立即执行一次，确保页面加载即正确；60 秒内误差对玩家无感知影响。
- **跨午夜边界** → 夜晚时段跨零点（20:00–05:59），需用 `hour >= 20 || hour < 6` 判断，避免遗漏。

## Migration Plan

纯增量变更，无数据迁移需求：
1. `style.css`：`#bg-room` 移除静态 `background-image`（改由 JS 注入），添加 `transition: opacity 0.4s`
2. `game.js`：新增 `updateBackground()` 纯函数；在 `init()` 末尾和 `tick()` 末尾各调用一次
3. `assets/ui/`：放置 `bg_room_day.png` 和 `bg_room_night.png`（可后期补充，fallback 兜底）

回滚：只需撤销 `style.css` 和 `game.js` 改动，恢复静态背景，无状态影响。

## Open Questions

- 白天/夜晚背景图的具体美术风格待用户生成（尺寸 390×844px，与现有黄昏图一致）。
