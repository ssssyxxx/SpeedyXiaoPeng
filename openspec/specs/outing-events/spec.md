# Spec: outing-events

## Purpose

Defines the data structure, selection logic, and initial content for outing events that are presented in the return dialog after a pig outing.

## Requirements

### Requirement: 外出事件数据结构
系统 SHALL 维护 `OUTING_EVENTS` 常量数组，每个事件对象包含：
- `id`：字符串，唯一标识
- `rarity`：`'common'`（常见）或 `'rare'`（稀有）
- `text`：字符串，1–2 句以第一人称口吻描述的事件内容
- `img`（仅稀有事件）：字符串，图片路径（`assets/outing/<filename>`），由用户提供

#### Scenario: 常见事件结构完整
- **WHEN** 解析 `OUTING_EVENTS` 中 `rarity === 'common'` 的条目
- **THEN** 每条条目包含 `id`、`rarity`、`text` 字段，不包含 `img` 字段

#### Scenario: 稀有事件结构完整
- **WHEN** 解析 `OUTING_EVENTS` 中 `rarity === 'rare'` 的条目
- **THEN** 每条条目包含 `id`、`rarity`、`text`、`img` 字段

---

### Requirement: 归来时随机选取一个事件
系统 SHALL 在外出归来时，从 `OUTING_EVENTS` 中按加权概率随机选取一个事件：常见事件权重 80%，稀有事件权重 20%（若无稀有事件图片资源则退回常见权重）。

#### Scenario: 随机选取常见事件
- **WHEN** 归来弹框弹出且随机结果为常见事件
- **THEN** 弹框上部显示纯文字事件内容，字体为手写体样式

#### Scenario: 随机选取稀有事件
- **WHEN** 归来弹框弹出且随机结果为稀有事件
- **THEN** 弹框上部显示事件图片（`<img>`）及文字内容，字体为手写体样式

#### Scenario: 稀有事件图片缺失时降级
- **WHEN** 稀有事件的 `img` 图片加载失败（`onerror`）
- **THEN** 隐藏 `<img>` 元素，仅显示文字内容，外观与常见事件一致

---

### Requirement: 初始事件集合至少包含 5 条常见事件
`OUTING_EVENTS` SHALL 预置至少 5 条 `rarity: 'common'` 的事件，文字以第一人称口吻，内容轻松治愈（示例：今天在街角看到一只橘猫，它对我眨了眨眼。/ 路过奶茶店，买了一杯草莓多多，好甜！）。

#### Scenario: 初始数据可用
- **WHEN** 游戏首次加载且用户触发外出归来
- **THEN** 弹框能展示有效事件内容，不出现空文本

---

### Requirement: 事件文字使用手写体字体
归来弹框和日记中展示的事件文字 SHALL 使用手写风格 CSS 字体（如 `'Ma Shan Zheng'` Google Fonts 或 `cursive` 回退），与主界面字体区分。

#### Scenario: 手写体字体应用
- **WHEN** 归来弹框或日记面板渲染事件文字
- **THEN** 文字 CSS `font-family` 包含手写体字体声明
