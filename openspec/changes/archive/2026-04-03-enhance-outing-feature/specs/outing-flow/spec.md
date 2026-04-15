## ADDED Requirements

### Requirement: 外出按钮显示在底部导航栏
底部导航栏 SHALL 在"喂食"和"换装"按钮之间新增"外出"按钮，图标为半开的门（🚪 或对应 PNG），文字标签为"外出"。

#### Scenario: 底部导航显示外出按钮
- **WHEN** 游戏主界面加载完成
- **THEN** 底部导航栏显示三个按钮：喂食 | 外出 | 换装，外出按钮居中

---

### Requirement: 条件不足时展示撒娇拦截
当玩家点击外出按钮时，若 `G.energy < 50` 或 `G.mood < 40`，系统 SHALL 从 `OUTING_BLOCKED_DIALOGUES` 集合中随机选取一条提示文本，在对话框中展示，同时将角色图片切换为 `char_pouty.png`，持续 2 秒后恢复原状态，不触发外出流程。

#### Scenario: 体力不足触发拦截
- **WHEN** 玩家点击外出按钮且 `G.energy < 50`
- **THEN** 展示随机撒娇对话框，角色图片切换为 `char_pouty.png`，2 秒后对话框关闭，角色图片恢复

#### Scenario: 心情不足触发拦截
- **WHEN** 玩家点击外出按钮且 `G.mood < 40`
- **THEN** 展示随机撒娇对话框，角色图片切换为 `char_pouty.png`，2 秒后对话框关闭，角色图片恢复

#### Scenario: 撒娇图片缺失时的降级
- **WHEN** `char_pouty.png` 加载失败
- **THEN** 角色图片显示 🥺 emoji 作为回退，功能正常运行

---

### Requirement: 冷却期间禁止重复外出
若 `G.outingCooldown` 时间戳大于当前时间，系统 SHALL 禁用外出按钮并展示冷却剩余提示，不触发撒娇动画也不触发出行流程。

#### Scenario: 冷却中点击外出
- **WHEN** 玩家点击外出按钮且 `Date.now() < G.outingCooldown`
- **THEN** 按钮显示为禁用状态，展示"小猪还没休息好，稍后再出门吧"等提示，不执行任何外出逻辑

---

### Requirement: 条件满足时触发出行流程
当 `G.energy >= 50`、`G.mood >= 40` 且冷却已结束时，点击外出按钮 SHALL 触发出行流程：
1. 扣除 `G.energy -= 20`（clamp 至 0）并调用 `saveState()`
2. 设置 `G.outingStartedAt = Date.now()`
3. 隐藏角色图片（`#char-img` 透明度为 0 或 `display:none`）
4. 在画面中央显示出行覆盖层，包含：随机出行提示文本（从 `OUTING_DEPARTURE_MESSAGES` 随机选取）、20 秒倒计时数字、固定副标题"小猪出门中…"
5. 倒计时由 `setInterval` 每秒递减，归零后清除计时器并触发归来流程

#### Scenario: 出行流程启动
- **WHEN** 玩家点击外出按钮且条件满足
- **THEN** `G.energy` 减少 20，角色图片隐藏，出行覆盖层显示，倒计时从 20 开始递减

#### Scenario: 倒计时完成
- **WHEN** 出行倒计时归零
- **THEN** 出行覆盖层消失，角色图片恢复显示，触发归来弹框

---

### Requirement: 归来弹框展示事件与奖励
倒计时结束后，系统 SHALL 在画面中央弹出归来弹框，弹框内容分为两部分：
- **上部**：随机选取的外出事件（详见 outing-events spec）
- **下部**：本次外出获得的奖励（金币奖励 80% 概率，随机 5–20 枚；物品奖励 20% 概率，仅展示名称）；若无奖励则不显示下部

弹框有关闭按钮（"收下啦 ✓"），点击后触发日记写入并更新 `G.outingCooldown`。

#### Scenario: 弹框显示事件与金币奖励
- **WHEN** 归来弹框弹出且奖励随机结果包含金币
- **THEN** 弹框上部显示事件文本，下部显示"获得金币 +N 枚"，`G.coins` 增加对应数量

#### Scenario: 弹框无奖励时只显示事件
- **WHEN** 归来弹框弹出且奖励随机结果为空
- **THEN** 弹框只显示事件文本，不显示奖励区域

#### Scenario: 关闭弹框触发日记写入与冷却
- **WHEN** 玩家点击归来弹框的关闭按钮
- **THEN** 本次事件条目 push 至 `G.diary`，`G.outingCooldown` 设置为 `Date.now() + 6 * 60 * 1000`，调用 `saveState()`，弹框关闭

---

### Requirement: 撒娇对话与出行提示从集合随机选取
系统 SHALL 维护以下文案集合，每次使用时随机选取一条：
- `OUTING_BLOCKED_DIALOGUES`：至少 5 条撒娇拦截文本（示例："小猪好累，不想出门 😴"、"人家今天不想动~"）
- `OUTING_DEPARTURE_MESSAGES`：至少 5 条出行提示文本（示例："出门啦，帮我照看一下两只猫猫 🐱"、"去逛逛，一会儿回来~"）

#### Scenario: 随机选取文案
- **WHEN** 触发撒娇拦截或出行流程
- **THEN** 展示的文本为对应集合中随机选取的一条，非固定文本
