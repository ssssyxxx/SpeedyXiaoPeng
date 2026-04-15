## 1. 数据层：常量与状态字段

- [x] 1.1 在 `game.js` 中添加 `OUTING_BLOCKED_DIALOGUES` 数组（至少 5 条撒娇文本）
- [x] 1.2 在 `game.js` 中添加 `OUTING_DEPARTURE_MESSAGES` 数组（至少 5 条出行提示文本）
- [x] 1.3 在 `game.js` 中添加 `OUTING_EVENTS` 数组（至少 5 条常见事件，字段：id、rarity、text）
- [x] 1.4 确认 `G` 默认状态包含 `diary: []` 和 `outingStartedAt: null` 字段（不存在则在 `initState` 中补全）
- [x] 1.5 引入手写体字体（在 `index.html` `<head>` 中添加 Google Fonts `Ma Shan Zheng` 的 `<link>`）

## 2. HTML 结构

- [x] 2.1 在 `index.html` 底部导航栏 `#nav-feed` 和 `#nav-outfit` 之间插入外出按钮 `#nav-outing`（图标 🚪，标签"外出"）
- [x] 2.2 在 `index.html` 中添加出行覆盖层 `#outing-overlay`（含倒计时数字 `#outing-countdown`、提示文本 `#outing-msg`、副标题"小猪出门中…"）
- [x] 2.3 在 `index.html` 中添加撒娇拦截对话框 `#outing-blocked-dialog`（含文本 `#outing-blocked-text`）
- [x] 2.4 在 `index.html` 中添加归来弹框 `#outing-return-modal`（含事件区 `#return-event-area`、奖励区 `#return-reward-area`、关闭按钮 `#return-close-btn`）
- [x] 2.5 确认 `index.html` 已有日记面板 `#panel-diary` 入口（左侧边栏 📔 按钮 `#btn-diary`），若无则新增

## 3. CSS 样式

- [x] 3.1 为 `#nav-outing` 添加底部导航按钮样式，与喂食/换装按钮视觉一致
- [x] 3.2 为 `#outing-overlay` 添加全屏居中覆盖层样式（半透明背景、倒计时大字号、副标题）
- [x] 3.3 为 `#outing-blocked-dialog` 添加居中对话框样式（与现有弹框风格一致）
- [x] 3.4 为 `#outing-return-modal` 添加弹框样式（上下两区、关闭按钮）
- [x] 3.5 为日记面板 `#panel-diary` 内的条目添加样式（日期浅色小字、事件文字手写体、图文混排布局）
- [x] 3.6 为冷却状态下的 `#nav-outing` 添加禁用样式（灰色、pointer-events: none）

## 4. 外出流程逻辑（game.js）

- [x] 4.1 实现 `handleOutingClick()` 函数：检查冷却 → 检查 energy/mood → 分支调用撒娇或出行
- [x] 4.2 实现 `showOutingBlocked()` 函数：随机选文案、切换角色图片为 `char_pouty.png`、2 秒后恢复
- [x] 4.3 实现 `startOuting()` 函数：扣 energy、保存 `outingStartedAt`、隐藏角色图片、展示出行覆盖层（随机选提示文本）
- [x] 4.4 在 `startOuting()` 中启动 `setInterval` 倒计时（每秒更新 `#outing-countdown`），归零后调用 `finishOuting()`
- [x] 4.5 实现 `finishOuting()` 函数：清除计时器、隐藏出行覆盖层、恢复角色图片、调用 `showReturnModal()`
- [x] 4.6 在 `renderAll()` 中更新外出按钮状态（冷却中则禁用并显示提示）

## 5. 归来弹框与奖励逻辑（game.js）

- [x] 5.1 实现 `pickOutingEvent()` 函数：按 80/20 权重从 `OUTING_EVENTS` 中随机选取一个事件
- [x] 5.2 实现 `calcOutingReward()` 函数：80% 概率返回金币 5–20 枚，20% 概率返回物品名称，其余返回 null
- [x] 5.3 实现 `showReturnModal(event, reward)` 函数：渲染事件区（纯文字或图文）、渲染奖励区（有则显示），展示弹框
- [x] 5.4 实现归来弹框关闭按钮事件：发放奖励（`G.coins +=`）、写入日记、设置冷却、`saveState()`、关闭弹框

## 6. 日记面板（game.js + HTML）

- [x] 6.1 实现 `renderDiaryPanel()` 函数：读取 `G.diary` 倒序渲染条目，空时显示空状态提示
- [x] 6.2 在 `renderDiaryPanel()` 中对含 `img` 字段的条目渲染图文混排，对无 `img` 字段的条目渲染纯文字
- [x] 6.3 为所有日记条目的 `<img>` 添加 `onerror` 处理（隐藏图片元素）
- [x] 6.4 将 `#btn-diary` 点击事件绑定到 `openPanel('diary')`，在 `openPanel` 中调用 `renderDiaryPanel()`

## 7. 收尾与验证

- [x] 7.1 验证撒娇流程：体力<50 或心情<40 时点击外出，确认动画和文案正确
- [x] 7.2 验证出行流程：条件满足时点击外出，确认角色消失、倒计时运行、归来弹框弹出
- [x] 7.3 验证日记写入：关闭归来弹框后，打开日记面板确认新条目已出现并含正确日期
- [x] 7.4 验证冷却逻辑：关闭弹框后确认外出按钮进入禁用状态，6 分钟后恢复
- [x] 7.5 验证 emoji 降级：将 `char_pouty.png`、稀有事件图片路径设为无效，确认回退正常
