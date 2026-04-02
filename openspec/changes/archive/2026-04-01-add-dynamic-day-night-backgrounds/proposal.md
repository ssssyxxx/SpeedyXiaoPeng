## Why

游戏背景目前固定为黄昏版本，缺乏时间感与沉浸感。根据玩家设备的实际时间动态切换白天、黄昏、夜晚三种背景，能强化"陪伴"体验，让房间随时间流逝真实变化。

## What Changes

- 新增白天背景图 `assets/ui/bg_room_day.png`（用于早晨至下午，06:00–17:59）
- 新增夜晚背景图 `assets/ui/bg_room_night.png`（用于夜间，20:00–05:59）
- 现有 `assets/ui/bg_room_dawn.png` 作为黄昏背景（18:00–19:59）
- `game.js` 在初始化及每次 tick 时读取本地时间，按时间段设置 `#bg-room` 背景图
- 背景切换时加入淡入过渡动画（CSS `transition`）
- 所有背景图保留 emoji/色块 fallback（图片缺失时仍可正常运行）

## Capabilities

### New Capabilities
- `time-based-background`: 根据玩家本地时间动态选择并切换房间背景图（白天 / 黄昏 / 夜晚），含过渡动画与资源缺失降级处理。

### Modified Capabilities

## Impact

- `style.css` — `#bg-room` 添加 `transition` 属性
- `game.js` — 新增 `updateBackground()` 函数；在 `init()` 和 `tick()` 中调用
- `assets/ui/` — 需新增 `bg_room_day.png`、`bg_room_night.png` 两张背景图
