// ═══════════════════════════════════════════════
//   OUTFITS_CONFIG — 服装配置（开发者在此添加服装）
// ═══════════════════════════════════════════════
//
// 服装类型（type）：
//   'default'  Type 1 — 原始服装，无蒙版，始终可用，不显示价格
//   'coin'     Type 2 — 硬币一次性购买；未购买时显示缩略图+价格，可点击购买
//   'bond'     Type 3 — 羁绊等级解锁；未解锁时显示黑色剪影+等级要求
//   'special'  Type 4 — 开发者设定解锁日期；未到日期时完全不显示在面板
//
// 字段说明：
//   id          string       唯一标识符（保存在存档中，不可更改）
//   type        string       见上方类型
//   name        string       显示名称
//   thumbEmoji  string       缩略图加载失败时的 emoji 降级显示
//   thumb       string|null  卡片缩略图路径（null 则只显示 emoji）
//   overlay     string|null  无头蒙版图路径（null 则不叠加，仅展示原装形象）
//   price       number       [仅 coin 类型] 购买价格（金币）
//   unlockLevel number       [仅 bond 类型] 解锁所需羁绊等级
//   unlockDate  string       [仅 special 类型] 'YYYY-MM-DD' 开放日期（当天及之后可见）

const OUTFITS_CONFIG = [

  // ─── Type 1: 默认（始终可用，无需解锁）─────────────────────────
  {
    id:         'default',
    type:       'default',
    name:       '原装',
    thumbEmoji: '🐟',
    thumb:      null,
    overlay:    null,
  },

  // ─── Type 2: 硬币购买（添加新硬币服装在此区域）─────────────────
  {
    id:         'overalls',
    type:       'coin',
    name:       '背带裤',
    thumbEmoji: '👖',
    thumb:      null,
    overlay:    'assets/characters/overalls_overlay.png',
    price:      250,
  },
  {
    id:         'trendy',
    type:       'coin',
    name:       '冷酷潮男',
    thumbEmoji: '🕶️',
    thumb:      null,
    overlay:    'assets/characters/trendy_overlay.png',
    price:      400,
  },

  // ─── Type 3: 羁绊度解锁（添加新羁绊服装在此区域）──────────────
  // 未解锁时：缩略图显示为黑色剪影，名称显示为 "???"
  {
    id:          'bond_outfit_1',
    type:        'bond',
    name:        '羁绊服装一',
    thumbEmoji:  '🌸',
    thumb:       null,
    overlay:     null,
    unlockLevel: 5,
    effect:      'GO_OUT_COIN_BONUS',
  },
  {
    id:          'bond_outfit_2',
    type:        'bond',
    name:        '羁绊服装二',
    thumbEmoji:  '🌙',
    thumb:       null,
    overlay:     null,
    unlockLevel: 10,
    effect:      'RARE_EVENT_CHANCE_BONUS',
  },
  {
    id:          'bond_outfit_3',
    type:        'bond',
    name:        '羁绊服装三',
    thumbEmoji:  '⭐',
    thumb:       null,
    overlay:     null,
    unlockLevel: 18,
    effect:      'GO_OUT_ENERGY_COST_REDUCTION',
  },
  {
    id:          'bond_outfit_4',
    type:        'bond',
    name:        '羁绊服装四',
    thumbEmoji:  '🌺',
    thumb:       null,
    overlay:     null,
    unlockLevel: 26,
    effect:      'GO_OUT_COIN_BONUS',
  },
  {
    id:          'bond_outfit_5',
    type:        'bond',
    name:        '羁绊服装五',
    thumbEmoji:  '💫',
    thumb:       null,
    overlay:     null,
    unlockLevel: 35,
    effect:      'RARE_EVENT_CHANCE_BONUS',
  },

  // ─── Type 4: 特殊日期解锁（添加新特殊服装在此区域）────────────
  // 未到解锁日期：完全不在服装面板中显示
  // {
  //   id:         'holiday',
  //   type:       'special',
  //   name:       '节日特别版',
  //   thumbEmoji: '🎄',
  //   thumb:      'assets/outfits/holiday_thumb.png',
  //   overlay:    'assets/characters/holiday_overlay.png',
  //   unlockDate: '2025-12-25',
  // },

];
