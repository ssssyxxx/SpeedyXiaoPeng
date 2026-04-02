## 1. CSS 修改

- [x] 1.1 在 `style.css` 的 `#bg-room` 规则中移除静态 `background-image: url('assets/ui/bg_room_dawn.png')` 声明（改由 JS 注入）
- [x] 1.2 在 `#bg-room` 规则中添加 `transition: opacity 0.4s ease` 以支持淡入淡出过渡

## 2. JS 核心函数实现

- [x] 2.1 在 `game.js` 中新增 `updateBackground()` 函数，读取 `new Date().getHours()` 并映射到 `'day'`（6–17）、`'dusk'`（18–19）、`'night'`（20–5）三个时段
- [x] 2.2 在函数内用模块级变量 `_lastBgSlot` 记录上一次的时段，若时段未变则提前返回（避免重复操作 DOM）
- [x] 2.3 实现时段变化时的过渡：设 `#bg-room` `opacity` 为 `0`，延迟 400ms 后更换 `backgroundImage`，再设 `opacity` 为 `1`
- [x] 2.4 为三个时段配置 fallback 背景色（白天 `#c8e8f0`、黄昏保持现有深色、夜晚 `#0d1220`），当图片路径已知时优先使用图片

## 3. 挂载调用点

- [x] 3.1 在 `init()` 函数末尾调用 `updateBackground()`，确保页面加载即应用正确背景
- [x] 3.2 在 `tick()` 函数末尾调用 `updateBackground()`，使背景随时段边界自动切换

## 4. 资源准备（美术）

- [ ] 4.1 生成或放置 `assets/ui/bg_room_day.png`（白天版房间背景，390×844px，风格与现有黄昏图一致）
- [ ] 4.2 生成或放置 `assets/ui/bg_room_night.png`（夜晚版房间背景，390×844px）

## 5. 验证

- [ ] 5.1 在浏览器中手动将系统时间调整至 08:00，刷新页面，确认 `#bg-room` 应用白天背景
- [ ] 5.2 将系统时间调整至 18:30，确认应用黄昏背景（`bg_room_dawn.png`）
- [ ] 5.3 将系统时间调整至 22:00，确认应用夜晚背景
- [ ] 5.4 删除 `bg_room_day.png` 和 `bg_room_night.png`，确认白天和夜晚时段均显示 fallback 背景色，游戏功能正常
- [ ] 5.5 等待或模拟 tick 跨时段边界，确认过渡动画正常执行（opacity 淡出→换图→淡入）
