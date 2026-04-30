// ═══════════════════════════════════════════════
//   OUTINGS — 外出事件配置（开发者在此添加外出事件）
// ═══════════════════════════════════════════════
//
// ─── OUTING_BLOCKED_DIALOGUES ────────────────
// 体力不足或心情太差时，点击外出按钮显示的拒绝台词。

const OUTING_BLOCKED_DIALOGUES = [
  '小猪好累，不想出门 😴',
  '人家今天不想动嘛～',
  '呜呜，走不动了啦…',
  '再让我躺一会儿嘛！',
  '心情不好，不要出门啦',
  '好累哦，让我休息一下嘛～',
  '现在不想出去，陪陪我嘛 🥺',
];

// ─── OUTING_DEPARTURE_MESSAGES ───────────────
// 成功出门时显示的出发台词。

const OUTING_DEPARTURE_MESSAGES = [
  '出门啦，帮我照看一下两只猫猫 🐱',
  '去逛逛，一会儿回来～',
  '出去买点东西，很快的！',
  '外面天气不错，去透透气～',
  '溜出去一下，别找我哦 🎵',
  '出门啦，记得等我回来！',
  '去外面走走，马上就回来～',
];

// ─── OUTING_EVENTS ───────────────────────────
// 外出返回时随机触发的事件。
//
// 稀有度（rarity）：
//   'common' — 普通事件，仅文字，随机抽取
//   'rare'   — 稀有事件，低概率（含怜悯保底），有配图，图片放在 assets/outing/rare/
//
// 字段说明：
//   id      string  唯一标识符（不可更改）
//   rarity  string  'common' | 'rare'
//   text    string  事件描述文本
//   img     string  [仅 rare] 配图路径

const OUTING_EVENTS = [
  // ── Common (仅文字，随机抽取) ─────────────────
  { id:'c1', rarity:'common', text:'在街角遇见了一只流浪猫，喂了它小鱼干，它蹭了蹭我就跑走了。' },
  { id:'c2', rarity:'common', text:'买了杯奶茶，喝到一半发现是半糖，刚好。' },
  { id:'c3', rarity:'common', text:'路过书店翻了翻新书，没买，但心里很满足。' },
  { id:'c4', rarity:'common', text:'坐公交时，旁边小朋友在画画，画得很好看，我们比了一个大拇指。' },
  { id:'c5', rarity:'common', text:'在超市碰到了打折，买了一堆零食，背包沉甸甸的。' },
  { id:'c6', rarity:'common', text:'在公园找到一张没人要的素描，画的是一棵老树，带回来了。' },
  { id:'c7', rarity:'common', text:'下雨了，躲进一家没去过的小店，老板泡了碗热茶，坐了很久。' },
  { id:'c8', rarity:'common', text:'路过一所小学，下课铃声响起，孩子们冲出来，把我也卷进了那个夏天。' },
  { id:'c9', rarity:'common', text:'在旧货市场发现了一盘旧磁带，不知道是谁的，带回来了。' },

  // ── Rare (有配图，图片放在 assets/outing/rare/) ─
  { id:'r1', rarity:'rare', text:'在公园遇到一只小狗，它一直摇尾巴，好像在跟我打招呼～', img:'assets/outing/rare/rare_friends.jpg' },
  { id:'r2', rarity:'rare', text:'爬长城好累T T，腿都快不是我的了。坐了缆车之后一下子就不累了～', img:'assets/outing/rare/rare_climbing.jpg' },
  { id:'r3', rarity:'rare', text:'去逛了早市，人特别多！草莓又红又甜，我一口气吃了好几颗！', img:'assets/outing/rare/rare_market.jpg' },
];

// ─── BOND_EVENTS ─────────────────────────────
// 羁绊等级提升时触发的专属剧情事件。
// 达到 minBondLevel 时立即弹出（或下次加载时补发）。
// 图片放在 assets/outing/bond/
//
// 字段说明：
//   id           string  唯一标识符（不可更改）
//   minBondLevel number  触发所需最低羁绊等级
//   date         string  日记中显示的日期（作者自定义，如 '2026年3月1日'）
//   text         string  事件描述文本
//   img          string  配图路径（可选）
//
// 添加示例：
// { id:'b2', minBondLevel:5, date:'2026年3月1日', text:'…', img:'assets/outing/bond/b2.jpg' }

const BOND_EVENTS = [
  { id:'b1', minBondLevel:2, date:'2025年7月20日', text:'“烂命一条就是干！”', img:'assets/outing/bond/yancheng_yyj.jpg' },
  { id:'b2', minBondLevel:4, date:'2025年7月29日', text:'“我妈咪呢！”', img:'assets/outing/bond/first_film.jpg' },
];
