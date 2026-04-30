// ═══════════════════════════════════════════════
//   FOODS — 食物配置（开发者在此添加/修改食物）
// ═══════════════════════════════════════════════
//
// 食物类型（type）：
//   'normal'   普通食物 — 日常维持，饱食+心情小幅提升
//   'favorite' 最爱食物 — 心情大幅提升
//   'disliked' 讨厌食物 — 便宜但心情下降
//   'special'  特殊食物 — price:0，只通过事件获得（special:true），无法直接购买
//
// 字段说明：
//   id      string        唯一标识符（保存在存档中，不可更改）
//   name    string        显示名称
//   type    string        见上方类型
//   price   number        购买价格（金币）；special 类型填 0
//   emoji   string        图片加载失败时的 emoji 降级显示
//   img     string|null   食物图片路径，放在 assets/food/ 下；null 则直接显示 emoji
//   hunger  number        饱食度增量
//   mood    number        心情增量（可为负数）
//   special boolean       [仅 special 类型] true 表示事件专属，不可购买

const FOODS = [
  // ─── Normal (日常维持) ────────────────────────
  { id:'f_normal_1', name:'便当',     type:'normal',    price:20,  emoji:'🍱', img:null, hunger:30, mood: 5 },
  { id:'f_normal_2', name:'家常菜',   type:'normal',    price:30,  emoji:'🍲', img:null, hunger:40, mood: 7 },
  { id:'f_normal_3', name:'大套餐',   type:'normal',    price:42,  emoji:'🍛', img:null, hunger:55, mood: 9 },

  // ─── Favorite (心情大幅提升) ──────────────────
  { id:'f_fav_1', name:'海蛎煎',   type:'favorite',  price:55,  emoji:'🦞', img:'assets/food/hailijian.png', hunger:20, mood:12 },
  { id:'f_fav_2', name:'泸州白糕', type:'favorite',  price:75,  emoji:'🍰', img:'assets/food/baigao.png',    hunger:35, mood:16 },
  { id:'f_fav_3', name:'芝心披萨', type:'favorite',  price:100, emoji:'🍕', img:'assets/food/pizza.png',     hunger:45, mood:22 },

  // ─── Disliked (便宜但心情下降) ────────────────
  { id:'f_dis_1', name:'健康沙拉', type:'disliked', price:12,  emoji:'🥗', img:'assets/food/salad.png',   hunger:25, mood:-6  },
  { id:'f_dis_2', name:'豆丹拌饭', type:'disliked', price:18,  emoji:'🍚', img:'assets/food/doudan.png',  hunger:35, mood:-8  },
  { id:'f_dis_3', name:'香菜饺子', type:'disliked', price:25,  emoji:'🥟', img:'assets/food/dumpling.png', hunger:45, mood:-10 },

  // ─── Special (事件专属，不可购买) ────────────
  { id:'f_sp_1', name:'演出甜品', type:'special', price:0, emoji:'⭐', img:null, hunger:15, mood:30, special:true },
  { id:'f_sp_2', name:'节日蛋糕', type:'special', price:0, emoji:'🎂', img:null, hunger:15, mood:30, special:true },
];
