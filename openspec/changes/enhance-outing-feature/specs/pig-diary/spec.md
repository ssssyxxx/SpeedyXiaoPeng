## ADDED Requirements

### Requirement: 小猪日记面板入口
左侧边栏的 📔 按钮 SHALL 打开小猪日记面板（`openPanel('diary')`），面板以底部滑出样式展示，标题为"小猪日记"。

#### Scenario: 打开日记面板
- **WHEN** 玩家点击左侧边栏 📔 按钮
- **THEN** 日记面板从底部滑出展示，显示标题"小猪日记"和日记列表

#### Scenario: 无日记时显示空状态
- **WHEN** `G.diary` 为空数组
- **THEN** 面板显示"还没有日记哦，出去走走吧~"等空状态提示

---

### Requirement: 日记条目展示日期
每条日记条目 SHALL 在顶部显示对应日期，格式为 `G.diary[i].date`（如 "2026/4/3"），日期样式与正文区分（颜色较浅或字号较小）。

#### Scenario: 日记条目显示日期
- **WHEN** 日记面板渲染一条 `G.diary` 条目
- **THEN** 条目顶部显示该条目的 `date` 字段内容

---

### Requirement: 纯文字日记条目渲染
当 `G.diary` 条目不含 `img` 字段时，系统 SHALL 以纯文字形式渲染该条目：仅显示日期和 `text` 内容，字体为手写体。

#### Scenario: 渲染纯文字条目
- **WHEN** 日记面板渲染一条 `rarity === 'common'` 或无 `img` 字段的条目
- **THEN** 条目只包含日期文本和事件文字，无图片元素

---

### Requirement: 图文混排日记条目渲染
当 `G.diary` 条目含有 `img` 字段时，系统 SHALL 以图文混排形式渲染：图片（`<img>`）显示在文字下方或侧边，图片加载失败时隐藏图片元素（`onerror`），字体为手写体。

#### Scenario: 渲染图文条目
- **WHEN** 日记面板渲染一条含 `img` 字段的条目
- **THEN** 条目显示日期、事件文字和图片，图片有 `onerror` 隐藏回退

#### Scenario: 图文条目图片缺失时降级
- **WHEN** 日记条目的 `img` 图片加载失败
- **THEN** 图片元素隐藏，仅显示日期和文字，布局不破坏

---

### Requirement: 日记条目按时间倒序排列
日记面板 SHALL 将 `G.diary` 条目按最新在前（倒序）排列，最新的外出记录显示在最顶部。

#### Scenario: 多条日记倒序显示
- **WHEN** `G.diary` 包含多条条目
- **THEN** 面板中最顶部条目的 `date` 为最新日期

---

### Requirement: 外出归来时自动写入日记
用户关闭归来弹框后，系统 SHALL 自动将本次事件构造为日记条目并 push 至 `G.diary`：
- `date`：`new Date().toLocaleDateString('zh-CN')` 格式化的当前日期
- `text`：本次事件的 `text` 字段
- `img`（可选）：若为稀有事件且图片存在，则包含 `img` 字段
- `rarity`：本次事件的 `rarity` 字段

写入后调用 `saveState()`。

#### Scenario: 关闭归来弹框后日记自动写入
- **WHEN** 玩家点击归来弹框关闭按钮
- **THEN** `G.diary` 新增一条条目，包含正确的 `date`、`text`、`rarity` 字段，`saveState()` 被调用
