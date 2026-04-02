# Spec: time-based-background

## Purpose

根据玩家设备的本地时间，动态切换游戏房间背景图（白天 / 黄昏 / 夜晚），并在时段变化时提供平滑的淡入淡出过渡效果。

---

## Requirements

### Requirement: 按本地时间选择背景时段
系统 SHALL 根据玩家设备的本地小时数将当前时间映射到三个时段之一：白天（06–17）、黄昏（18–19）、夜晚（20–05）。

#### Scenario: 白天时段识别
- **WHEN** 本地时间小时数在 6–17（含）之间
- **THEN** `updateBackground()` 返回时段标识 `'day'`

#### Scenario: 黄昏时段识别
- **WHEN** 本地时间小时数在 18–19（含）之间
- **THEN** `updateBackground()` 返回时段标识 `'dusk'`

#### Scenario: 夜晚时段识别（跨零点）
- **WHEN** 本地时间小时数 ≥ 20 或 < 6
- **THEN** `updateBackground()` 返回时段标识 `'night'`

---

### Requirement: 应用对应时段的背景图
系统 SHALL 将 `#bg-room` 元素的 `background-image` 设置为对应时段的背景图路径。

#### Scenario: 白天背景应用
- **WHEN** 当前时段为 `'day'`
- **THEN** `#bg-room` 的 `backgroundImage` 被设置为 `url('assets/ui/bg_room_day.png')`

#### Scenario: 黄昏背景应用
- **WHEN** 当前时段为 `'dusk'`
- **THEN** `#bg-room` 的 `backgroundImage` 被设置为 `url('assets/ui/bg_room_dawn.png')`

#### Scenario: 夜晚背景应用
- **WHEN** 当前时段为 `'night'`
- **THEN** `#bg-room` 的 `backgroundImage` 被设置为 `url('assets/ui/bg_room_night.png')`

---

### Requirement: 背景切换时的淡入过渡
系统 SHALL 在时段发生变化时，通过 opacity 淡入淡出（fade-out → 换图 → fade-in）实现平滑过渡，过渡时长约 400ms。

#### Scenario: 时段未变化时不触发过渡
- **WHEN** `updateBackground()` 被调用且时段与上一次相同
- **THEN** 不执行任何 DOM 修改或动画

#### Scenario: 时段变化时触发过渡动画
- **WHEN** `updateBackground()` 被调用且检测到时段变化
- **THEN** `#bg-room` 先过渡至 `opacity: 0`，更换背景图后过渡回 `opacity: 1`

---

### Requirement: 背景图缺失时的降级处理
系统 SHALL 在背景图资源不可用时，回退到对应时段的纯色背景色，不阻塞游戏功能。

#### Scenario: 白天背景图缺失
- **WHEN** `bg_room_day.png` 无法加载
- **THEN** `#bg-room` 显示 fallback 背景色 `#c8e8f0`，游戏界面正常运行

#### Scenario: 夜晚背景图缺失
- **WHEN** `bg_room_night.png` 无法加载
- **THEN** `#bg-room` 显示 fallback 背景色 `#0d1220`，游戏界面正常运行

---

### Requirement: 初始化时立即应用背景
系统 SHALL 在 `init()` 执行时调用 `updateBackground()`，确保页面加载后立即呈现正确时段的背景。

#### Scenario: 页面加载时背景正确
- **WHEN** 玩家打开游戏页面，`init()` 执行完毕
- **THEN** `#bg-room` 立即显示与当前本地时间对应的背景，无需等待下一次 tick

---

### Requirement: 每次 tick 时检查并更新背景
系统 SHALL 在每次 `tick()` 结束时调用 `updateBackground()`，使背景随时段边界自动切换。

#### Scenario: Tick 触发背景更新
- **WHEN** `tick()` 函数执行（每 60 秒一次）
- **THEN** `updateBackground()` 被调用，若时段已变更则执行切换，否则无操作
