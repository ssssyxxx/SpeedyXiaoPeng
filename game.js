// ═══════════════════════════════════════════════
//   SPEEDYPENG  —  Game Logic
// ═══════════════════════════════════════════════

// ─── Constants ────────────────────────────────
const STATE_KEY = 'speedypeng_v3';
// Tick = 60 real seconds = 1 game-hour.
// Change to 3_600_000 for production (1 real hour = 1 game-hour).
const TICK_MS   = 60_000;
const MAX_OFFLINE_TICKS = 48; // cap at 48 game-hours offline

// ─── Default State ────────────────────────────
const defaultState = {
  mood:     80,
  hunger:   60,
  energy:   70,
  bondLevel: 1,
  bondExp:   0,
  coins:    200,
  outfit:   'default',
  lastTick: Date.now(),
  outingStartedAt: null,
  workStartedAt:   null,
  memories:  [],
  diary:     [],
  unlockedOutfits:  ['default'],
  purchasedOutfits: ['default'],
  totalFeeds:   0,
  loginStreak:  0,
  lastLogin:    '',
  goOutCountToday: 0,
  goOutCountDate:  '',
  rareFailCount: 0,
  rareCollectedIds: [],
  workCountToday: 0,
  workCoinsToday: 0,
  workDate: '',
  onlineMoodGainedToday: 0,
  onlineMoodDate: '',
  seenBondEvents: [],
  dailyTasks: {
    date: '',
    loginClaimed:  false,
    feeds:         0,
    feedsClaimed:  false,
    goOutDone:     false,
    goOutClaimed:  false,
  },
};

// ─── Game Config ─────────────────────────────
const GAME_CONFIG = {
  // Stats
  hungerMax: 100, moodMax: 100, energyMax: 100,
  // Decay / regen per tick (1 tick = 1 game-hour)
  hungerDecayPerHour:           6,
  moodDecayTriggerHunger:       30,
  moodDecayPerHourWhenHungry:   4,
  energyRegenPerHour:           5,
  lowHungerEnergyRegenMult:     0.5,
  lowHungerThreshold:           30,
  // Go-out gates
  goOutMinHunger: 20,
  goOutMinMood:   30,
  // Go-out energy costs by daily count (1-indexed; index 4+ → cost 70)
  goOutEnergyCosts: [0, 30, 40, 55, 70],
  // Go-out base coin ranges by daily count (1-indexed; index 4+ → last entry)
  goOutBaseCoinRanges: [[0,0], [60,90], [55,85], [45,70], [20,35]],
  // Go-out base reward ranges
  goOutBaseMoodRange:    [8, 15],
  goOutBaseBondExpRange: [6, 10],
  // Normal event extra rewards
  normalEventExtraCoins:   [15, 30],
  normalEventExtraMood:    [3, 6],
  normalEventExtraBondExp: [2, 4],
  // Rare event
  rareBaseChance:          0.12,
  rareMoodBonus70:         0.04,
  rareMoodBonus90:         0.06,
  rarePityIncreasePerFail: 0.04,
  rareMaxChanceCap:        0.35,
  rareExtraCoins:   [25, 50],
  rareExtraMood:    [8, 12],
  rareExtraBondExp: [12, 16],
  // Coin multipliers
  hungerCoinPenaltyMult:  0.7,
  moodCoinMult70:         1.15,
  moodCoinMult90:         1.25,
  // Work
  workDurationSeconds: 45,
  workCoinRange:       [10, 15],
  workBondExp:         2,
  workDailyMaxTimes:   12,
  workDailyCoinCap:    150,
  // Online mood regen
  onlineMoodGainPerMin:    0.2,
  onlineMoodDailyCap:      15,
  coinOutfitMoodCapBonus:  5,
  // Bond level
  bondLevelMax:    40,
  levelUpRewardCoins: 20,
  // Daily missions
  missionLoginCoins:    10, missionLoginBondExp:   3,
  missionFeedCoins:     10, missionFeedBondExp:    3,
  missionGoOutCoins:    20, missionGoOutBondExp:   6,
};

function getEquippedBondOutfitEffect() {
  const o = OUTFITS_CONFIG.find(x => x.id === G.outfit && x.type === 'bond');
  return o ? o.effect : null;
}

// ─── Expression sprites map ────────────────────
// Maps expression key → filename in assets/characters/
const EXPRESSION_SPRITES = {
  happy:       'char_happy.png',
  normal:      'char_normal.png',
  cold:        'char_sad.png',
  sad:         'char_sad.png',
  disgusted:   'char_disgusted.png',
  pouty_tired: 'char_pouty_tired.png',
  pouty_mood:  'char_sad.png',
  chew1:       'char_chew1.png',
  chew2:       'char_chew2.png',
};

// ─── Global state ──────────────────────────────
let G = loadState();
let speechTimer  = null;
let toastTimer   = null;
let _lastBgSlot  = null; // tracks current background time slot
let outingTimer  = null; // countdown interval reference
let _currentOutingEvent  = null;
let _currentOutingReward = null;
let _chewTimer   = null; // chewing animation interval
let _chewTimeout = null; // chewing animation stop timeout

// ─── Data: Foods ──────────────────────────────
const FOODS = [
  // ─── Normal (daily maintenance) ───────────────
  { id:'normal_bento',     name:'便当',     type:'normal',    price:20,  emoji:'🍱', hunger:30, mood: 1 },
  { id:'normal_home_meal', name:'家常菜',   type:'normal',    price:30,  emoji:'🍲', hunger:40, mood: 2 },
  { id:'normal_big_set',   name:'大套餐',   type:'normal',    price:42,  emoji:'🍛', hunger:55, mood: 3 },
  // ─── Favorite (mood boost) ────────────────────
  { id:'fav_dessert',      name:'甜点',     type:'favorite',  price:55,  emoji:'🍰', hunger:20, mood:12 },
  { id:'fav_bbq',          name:'烤肉',     type:'favorite',  price:75,  emoji:'🍖', hunger:35, mood:16 },
  { id:'fav_luxury_meal',  name:'豪华套餐', type:'favorite',  price:100, emoji:'🦞', hunger:45, mood:22 },
  // ─── Disliked (cheap survival, mood penalty) ──
  { id:'dislike_bread',      name:'白面包',  type:'disliked', price:12,  emoji:'🍞', hunger:25, mood:-6  },
  { id:'dislike_canned',     name:'罐头',    type:'disliked', price:18,  emoji:'🥫', hunger:35, mood:-8  },
  { id:'dislike_cold_rice',  name:'冷米饭',  type:'disliked', price:25,  emoji:'🍚', hunger:45, mood:-10 },
  // ─── Special (dev-added, event drops only) ────
  { id:'perf_sweet',    name:'演出甜品', type:'special', price:0, emoji:'⭐', hunger:15, mood:30, special:true },
  { id:'holiday_cake',  name:'节日蛋糕', type:'special', price:0, emoji:'🎂', hunger:15, mood:30, special:true },
];

// OUTFITS_CONFIG is loaded from outfits.js (must be included before game.js in HTML)

// ─── Data: Dialogue ────────────────────────────
const DIALOGUES = {
  happy:  ['嘿嘿～好开心！', '今天也很满足！', '最喜欢你了！', '笑死，太快乐了。', '感觉可以做任何事！'],
  normal: ['嗯嗯，还不错哦～', '有什么事嗎？', '今天也要加油呀', '天气还行哦', '在呢在呢～'],
  cold:   ['……', '现在不想说话。', '别烦我啦', '嗯。', '随便。'],
  sad:    ['好难受…', '你能陪陪我嗎…', '呜呜…', '心情不太好…', '想吃点好吃的。'],
};

// ─── Data: Context labels (like 打扮一下吧) ──
const CONTEXT_LABELS = {
  happy:  ['好开心呀～', '开心到飞起！', '嗯！很满足。', '笑死了～'],
  normal: ['我在这里哦', '有什么事嗎？', '今天也好好的'],
  cold:   ['……', '别烦我', '不想说话'],
  sad:    ['好难受…', '呜呜…', '心情不好'],
};


// ─── Data: Outing blocked dialogues ──────────
const OUTING_BLOCKED_DIALOGUES = [
  '小猪好累，不想出门 😴',
  '人家今天不想动嘛～',
  '呜呜，走不动了啦…',
  '再让我躺一会儿嘛！',
  '心情不好，不要出门啦',
  '好累哦，让我休息一下嘛～',
  '现在不想出去，陪陪我嘛 🥺',
];

// ─── Data: Outing departure messages ─────────
const OUTING_DEPARTURE_MESSAGES = [
  '出门啦，帮我照看一下两只猫猫 🐱',
  '去逛逛，一会儿回来～',
  '出去买点东西，很快的！',
  '外面天气不错，去透透气～',
  '溜出去一下，别找我哦 🎵',
  '出门啦，记得等我回来！',
  '去外面走走，马上就回来～',
];

// ─── Data: Outing events ──────────────────────
// common  — always in the pool, text only, picked randomly
// rare    — low probability (pity system), text + img in assets/outing/rare/
const OUTING_EVENTS = [
  // ── Common (text only) ───────────────────────
  { id:'c1', rarity:'common', text:'在街角遇见了一只流浪猫，喂了它小鱼干，它蹭了蹭我就跑走了。' },
  { id:'c2', rarity:'common', text:'买了杯奶茶，喝到一半发现是半糖，刚好。' },
  { id:'c3', rarity:'common', text:'路过书店翻了翻新书，没买，但心里很满足。' },
  { id:'c4', rarity:'common', text:'坐公交时，旁边小朋友在画画，画得很好看，我们比了一个大拇指。' },
  { id:'c5', rarity:'common', text:'在超市碰到了打折，买了一堆零食，背包沉甸甸的。' },
  { id:'c6', rarity:'common', text:'在公园找到一张没人要的素描，画的是一棵老树，带回来了。' },
  { id:'c7', rarity:'common', text:'下雨了，躲进一家没去过的小店，老板泡了碗热茶，坐了很久。' },
  { id:'c8', rarity:'common', text:'路过一所小学，下课铃声响起，孩子们冲出来，把我也卷进了那个夏天。' },
  { id:'c9', rarity:'common', text:'在旧货市场发现了一盘旧磁带，不知道是谁的，带回来了。' },

  // ── Rare (img in assets/outing/rare/) ────────
  { id:'r1', rarity:'rare', text:'意外遇见了好久不见的老朋友，聊了整个下午，还拿到了一张合照。', img:'assets/outing/rare/rare_friends.jpg' },
  { id:'r2', rarity:'rare', text:'在街头驻足听了一位街头歌手表演，结束后他把手写歌词送给了我。', img:'assets/outing/rare/rare_singer.jpg' },
  { id:'r3', rarity:'rare', text:'找到了传说中的老字号小吃，排了一小时队，值了，真的值了。', img:'assets/outing/rare/rare_food.jpg' },
];

// ─── Data: Bond events ────────────────────────
// Triggered when player reaches minBondLevel.
// Shown immediately after level-up toast (5s delay), or on next page load if missed.
// img lives in assets/outing/bond/
// date: author-defined display date shown in diary (e.g. '2026年3月1日'), not trigger date.
// To add: { id:'b1', minBondLevel:5, date:'2026年3月1日', text:'…', img:'assets/outing/bond/b1.jpg' }
const BOND_EVENTS = [
  { id:'b1', minBondLevel:2, date:'2025年7月20日', text:'第一次站上这么大的舞台！', img:'assets/outing/bond/yancheng_yyj.png' },
];

// ══════════════════════════════════════════════
//   INIT
// ══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  resetDailyTasksIfNeeded();
  applyOfflineDecay();
  checkBondUnlocks(true); // ensure bond-0 outfits are unlocked on every load
  handleDailyLogin();
  resumeOutingIfNeeded();
  resumeWorkIfNeeded();
  checkMissedBondEvents();
  buildFoodGrid();
  buildOutfitGrid();
  buildMemoryList();
  renderDiaryPanel();
  renderAll();
  updateBackground();

  // Periodic tick
  setInterval(() => { tickHour(); saveState(); }, TICK_MS);

  // Online mood regen: +0.2 mood per real minute, capped per day
  // This interval always runs at 60s regardless of TICK_MS (which may be 1h in production)
  setInterval(() => {
    resetDailyTasksIfNeeded();

    // Determine daily cap (base + bonus if coin outfit equipped)
    const equippedOutfit = OUTFITS_CONFIG.find(o => o.id === G.outfit && o.type === 'coin');
    const capBonus = equippedOutfit ? GAME_CONFIG.coinOutfitMoodCapBonus : 0;
    const dailyCap = GAME_CONFIG.onlineMoodDailyCap + capBonus;

    if (G.onlineMoodGainedToday < dailyCap) {
      const gain = Math.min(GAME_CONFIG.onlineMoodGainPerMin, dailyCap - G.onlineMoodGainedToday);
      G.mood = clamp(G.mood + gain, 0, 100);
      G.onlineMoodGainedToday += gain;
      saveState();
    }
  }, 60_000);

  // Tap character = interact
  document.getElementById('char-sprite').addEventListener('click', interact);

  // Start idle chatter — randomly shows CONTEXT_LABELS lines when label is hidden
  scheduleIdleChatter();

  // Online mood regen visual indicator
  scheduleMoodRegenTip();
});

// ──────────────────────────────────────────────
//   TICK / TIME DECAY
// ──────────────────────────────────────────────
function applyOfflineDecay() {
  const now     = Date.now();
  const elapsed = Math.floor((now - G.lastTick) / TICK_MS);
  if (elapsed <= 0) return;
  const ticks = Math.min(elapsed, MAX_OFFLINE_TICKS);
  for (let i = 0; i < ticks; i++) tickHour(true);
  G.lastTick = now;
}

function tickHour(silent = false) {
  // Hunger decay
  G.hunger = clamp(G.hunger - GAME_CONFIG.hungerDecayPerHour, 0, 100);

  // Mood decay — only when hunger is low
  if (G.hunger < GAME_CONFIG.moodDecayTriggerHunger) {
    G.mood = clamp(G.mood - GAME_CONFIG.moodDecayPerHourWhenHungry, 0, 100);
  }

  // Energy regen (halved when hunger low)
  let energyRegen = GAME_CONFIG.energyRegenPerHour;
  if (G.hunger < GAME_CONFIG.lowHungerThreshold) {
    energyRegen = Math.floor(energyRegen * GAME_CONFIG.lowHungerEnergyRegenMult);
  }
  G.energy = clamp(G.energy + energyRegen, 0, 100);

  G.lastTick = Date.now();
  checkBondUnlocks(silent);
  if (!silent) { renderAll(); updateBackground(); }
}

// ──────────────────────────────────────────────
//   BACKGROUND (time-based)
// ──────────────────────────────────────────────
function updateBackground() {
  const hour = new Date().getHours();
  const slot = (hour >= 6 && hour < 18) ? 'day'
             : (hour >= 18 && hour < 20) ? 'dusk'
             : 'night';
  if (slot === _lastBgSlot) return;
  _lastBgSlot = slot;

  const bgMap = {
    day:  { img: "url('assets/ui/bg_room_day.png')",  fallback: '#c8e8f0' },
    dusk: { img: "url('assets/ui/bg_room_dawn.png')",       fallback: '#1a2e42' },
    night:{ img: "url('assets/ui/bg_room_night.png')", fallback: '#0d1220' },
  };

  const { img, fallback } = bgMap[slot];
  const el = document.getElementById('bg-room');
  if (!el) return;

  el.style.opacity = '0';
  setTimeout(() => {
    el.style.backgroundImage = img;
    el.style.backgroundColor = fallback;
    el.style.opacity = '1';
  }, 400);
}

// ──────────────────────────────────────────────
//   DAILY LOGIN
// ──────────────────────────────────────────────
function handleDailyLogin() {
  const today = todayStr();
  if (G.lastLogin === today) return;
  G.lastLogin = today;

  // Mark login task as claimable
  G.dailyTasks.loginClaimed = false;
  saveState();
  setTimeout(() => toast('今日登录成功，领取每日任务奖励吧！'), 800);
}

// ──────────────────────────────────────────────
//   OUTFIT HELPERS
// ──────────────────────────────────────────────

/** True when a 'special' outfit's unlockDate has been reached. */
function isSpecialOutfitAvailable(outfit) {
  if (!outfit.unlockDate) return false;
  return todayStr() >= outfit.unlockDate;
}

/**
 * True when an outfit can be worn (purchased / unlocked / available).
 * Used to distinguish "can equip" from "shown in panel".
 */
function isOutfitOwned(outfitId) {
  const o = OUTFITS_CONFIG.find(x => x.id === outfitId);
  if (!o) return false;
  if (o.type === 'default')  return true;
  if (o.type === 'coin')     return (G.purchasedOutfits || []).includes(outfitId);
  if (o.type === 'bond')     return G.unlockedOutfits.includes(outfitId);
  if (o.type === 'special')  return isSpecialOutfitAvailable(o);
  return false;
}

// ──────────────────────────────────────────────
//   BOND LEVEL SYSTEM
// ──────────────────────────────────────────────
function bondExpNeeded(level) {
  if (level <= 10)  return 20 + (level - 1) * 5;
  if (level <= 25)  return 70 + (level - 11) * 10;
  return 230 + (level - 26) * 15;
}

function addBondExp(amount) {
  if (G.bondLevel >= GAME_CONFIG.bondLevelMax) return;
  G.bondExp += amount;
  while (G.bondLevel < GAME_CONFIG.bondLevelMax) {
    const need = bondExpNeeded(G.bondLevel);
    if (G.bondExp >= need) {
      G.bondExp -= need;
      G.bondLevel++;
      grantLevelUpReward();
    } else {
      break;
    }
  }
  checkBondUnlocks();
}

function grantLevelUpReward() {
  G.coins += GAME_CONFIG.levelUpRewardCoins;
  toast(`🎉 羁绊 Lv.${G.bondLevel}！+${GAME_CONFIG.levelUpRewardCoins}🪙`);
  const level = G.bondLevel;
  setTimeout(() => {
    const event = BOND_EVENTS.find(e => e.minBondLevel === level && !(G.seenBondEvents || []).includes(e.id));
    if (event) showBondEventModal(event);
  }, 5000);
}

// ──────────────────────────────────────────────
//   BOND UNLOCKS  (bond-type outfits only)
// ──────────────────────────────────────────────
function checkBondUnlocks(silent = false) {
  OUTFITS_CONFIG.forEach(o => {
    if (o.type !== 'bond') return;
    if (G.bondLevel >= o.unlockLevel && !G.unlockedOutfits.includes(o.id)) {
      G.unlockedOutfits.push(o.id);
      if (!silent) {
        toast(`✨ 解锁新服装：${o.name}！`);
        buildOutfitGrid();
      }
    }
  });
}

// ──────────────────────────────────────────────
//   FEED
// ──────────────────────────────────────────────
function feedFood(foodId) {
  const food = FOODS.find(f => f.id === foodId);
  if (!food) return;

  if (food.special) {
    toast('通过特殊事件获得！');
    return;
  }
  if (G.coins < food.price) {
    toast('金币不足！');
    animSprite('shake');
    return;
  }

  G.coins  -= food.price;
  G.hunger  = clamp(G.hunger + food.hunger, 0, 100);
  G.mood    = clamp(G.mood   + food.mood,   0, 100);
  G.totalFeeds++;
  G.dailyTasks.feeds = (G.dailyTasks.feeds || 0) + 1;

  saveState();
  buildFoodGrid();
  renderAll();
  closePanel();

  if (food.type === 'favorite') {
    showSpeech(`${food.emoji} 好吃！最喜欢了～`);
    startChewing('happy', 3000);
  } else if (food.type === 'disliked') {
    showSpeech(`${food.emoji} 呜…不喜欢这个…`);
    startChewing('disgusted', 3000);
  } else {
    showSpeech(`${food.emoji} 谢谢投喂～`);
    startChewing(null);
  }
}

// ──────────────────────────────────────────────
//   OUTFIT
// ──────────────────────────────────────────────

/** Actually put the outfit on (called after ownership is confirmed). */
function equipOutfit(outfitId) {
  const outfit = OUTFITS_CONFIG.find(o => o.id === outfitId);
  if (!outfit) return;

  // Guard: bond-type still locked
  if (outfit.type === 'bond' && !G.unlockedOutfits.includes(outfitId)) {
    toast(`🎀 羁绊 Lv.${outfit.unlockLevel} 解锁`);
    return;
  }
  // Guard: coin-type not purchased — route to purchase instead
  if (outfit.type === 'coin' && !(G.purchasedOutfits || []).includes(outfitId)) {
    purchaseOutfit(outfitId);
    return;
  }

  if (G.outfit === outfitId) { closePanel(); return; }

  G.outfit = outfitId;
  saveState();
  renderAll();
  buildOutfitGrid();
  closePanel();
  toast('换装完成！✨');
  showSpeech('打扮一下吧～好看嗎？');
}

/** Purchase a coin-type outfit: deduct coins and unlock. */
function purchaseOutfit(outfitId) {
  const outfit = OUTFITS_CONFIG.find(o => o.id === outfitId);
  if (!outfit || outfit.type !== 'coin') return;

  if (G.coins < outfit.price) {
    toast(`金币不足！还差 ${outfit.price - G.coins} 🪙`);
    animSprite('shake');
    return;
  }

  G.coins -= outfit.price;
  if (!G.purchasedOutfits) G.purchasedOutfits = ['default'];
  G.purchasedOutfits.push(outfitId);
  saveState();
  buildOutfitGrid();
  toast(`购买成功！🪙-${outfit.price}`);

  // Equip immediately after purchase
  G.outfit = outfitId;
  saveState();
  renderAll();
  buildOutfitGrid();
  closePanel();
  showSpeech('打扮一下吧～好看嗎？');
}

// ──────────────────────────────────────────────
//   OUTING (外出)
// ──────────────────────────────────────────────
function goOutEnergyCost(countToday) {
  const costs = GAME_CONFIG.goOutEnergyCosts;
  const idx = Math.min(countToday, costs.length - 1);
  let cost = costs[idx];
  if (getEquippedBondOutfitEffect() === 'GO_OUT_ENERGY_COST_REDUCTION') {
    cost = Math.max(25, cost - 5);
  }
  return cost;
}

function goOutBaseCoinRange(countToday) {
  const ranges = GAME_CONFIG.goOutBaseCoinRanges;
  const idx = Math.min(countToday, ranges.length - 1);
  return ranges[idx];
}

function hungerCoinMult() {
  return G.hunger < GAME_CONFIG.lowHungerThreshold
    ? GAME_CONFIG.hungerCoinPenaltyMult
    : 1.0;
}

function moodCoinMult() {
  if (G.mood >= 90) return GAME_CONFIG.moodCoinMult90;
  if (G.mood >= 70) return GAME_CONFIG.moodCoinMult70;
  return 1.0;
}

function rareEventChance() {
  let bonus = 0;
  if (G.mood >= 90)      bonus = GAME_CONFIG.rareMoodBonus90;
  else if (G.mood >= 70) bonus = GAME_CONFIG.rareMoodBonus70;

  if (getEquippedBondOutfitEffect() === 'RARE_EVENT_CHANCE_BONUS') bonus += 0.02;

  const chance = GAME_CONFIG.rareBaseChance + bonus
                 + G.rareFailCount * GAME_CONFIG.rarePityIncreasePerFail;
  return Math.min(chance, GAME_CONFIG.rareMaxChanceCap);
}

function handleOutingClick() {
  resetDailyTasksIfNeeded();

  if (G.hunger < GAME_CONFIG.goOutMinHunger) {
    showOutingBlocked('tired');
    return;
  }
  if (G.mood < GAME_CONFIG.goOutMinMood) {
    showOutingBlocked('mood');
    return;
  }

  const nextCount = G.goOutCountToday + 1;
  const cost = goOutEnergyCost(nextCount);

  if (G.energy < cost) {
    showOutingBlocked('tired');
    return;
  }

  // Show departure message, then start outing after 2s
  showSpeech(randomFrom(OUTING_DEPARTURE_MESSAGES), 2000);
  document.getElementById('nav-outing').disabled = true;
  setTimeout(() => startOuting(cost, nextCount), 2000);
}

function showOutingBlocked(reason) {
  const text = randomFrom(OUTING_BLOCKED_DIALOGUES);
  const exprKey = reason === 'tired' ? 'pouty_tired' : 'pouty_mood';
  setCharExpression(exprKey);
  showSpeech(text, 3000);
  setTimeout(() => renderAll(), 3000);
}

function resumeOutingIfNeeded() {
  if (!G.outingStartedAt) return;
  const elapsed = Math.floor((Date.now() - G.outingStartedAt) / 1000);
  const remaining = 20 - elapsed;
  if (remaining <= 0) {
    // Outing already over — finish immediately
    finishOuting();
    return;
  }
  // Resume countdown from remaining seconds
  document.getElementById('char-sprite-wrap').classList.add('char-hidden');
  const overlay = document.getElementById('outing-overlay');
  const countdownEl = document.getElementById('outing-countdown');
  let seconds = remaining;
  countdownEl.textContent = `${seconds} 小猪出门中....`;
  overlay.classList.remove('hidden');
  overlay.classList.add('outing-visible');
  outingTimer = setInterval(() => {
    seconds--;
    countdownEl.textContent = `${seconds} 小猪出门中....`;
    if (seconds <= 0) {
      clearInterval(outingTimer);
      outingTimer = null;
      finishOuting();
    }
  }, 1000);
}

function setWorkProgressRing(elapsedSeconds) {
  const ring = document.getElementById('work-progress-ring');
  if (!ring) return;
  const pct = Math.min(elapsedSeconds / GAME_CONFIG.workDurationSeconds * 100, 100);
  ring.style.setProperty('--work-pct', `${pct}%`);
}

function resumeWorkIfNeeded() {
  if (!G.workStartedAt) return;
  const elapsed = Math.floor((Date.now() - G.workStartedAt) / 1000);
  const remaining = GAME_CONFIG.workDurationSeconds - elapsed;
  if (remaining <= 0) {
    finishWork();
    return;
  }
  let elapsedSec = elapsed;
  setWorkProgressRing(elapsedSec);
  workTimer = setInterval(() => {
    elapsedSec++;
    setWorkProgressRing(elapsedSec);
    if (elapsedSec >= GAME_CONFIG.workDurationSeconds) {
      clearInterval(workTimer);
      workTimer = null;
      finishWork();
    }
  }, 1000);
}

function startOuting(energyCost, countForThisOuting) {
  G.energy = clamp(G.energy - energyCost, 0, 100);
  G.goOutCountToday = countForThisOuting;
  G.goOutCountDate  = todayStr();
  G.outingStartedAt = Date.now();
  G._pendingOutingCount = countForThisOuting;
  saveState();
  renderAll();

  document.getElementById('char-sprite-wrap').classList.add('char-hidden');

  const overlay = document.getElementById('outing-overlay');
  const countdownEl = document.getElementById('outing-countdown');
  let seconds = 20;
  countdownEl.textContent = `${seconds} 小猪出门中....`;
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('outing-visible')));

  outingTimer = setInterval(() => {
    seconds--;
    countdownEl.textContent = `${seconds} 小猪出门中....`;
    if (seconds <= 0) {
      clearInterval(outingTimer);
      outingTimer = null;
      finishOuting();
    }
  }, 1000);
}

function finishOuting() {
  const overlay    = document.getElementById('outing-overlay');
  const spriteWrap = document.getElementById('char-sprite-wrap');

  overlay.classList.remove('outing-visible');
  spriteWrap.classList.remove('char-hidden');
  G.outingStartedAt = null;
  renderAll();

  setTimeout(() => {
    overlay.classList.add('hidden');
    const { event, isRare } = pickOutingEvent();
    const baseReward = calcOutingReward(G._pendingOutingCount || 1);
    saveState(); // persist pity state before showing modal
    showReturnModal(event, baseReward, isRare);
  }, 500);
}

function pickOutingEvent() {
  const isRare = Math.random() < rareEventChance();
  if (isRare) {
    G.rareFailCount = 0;
    const rares = OUTING_EVENTS.filter(e => e.rarity === 'rare');
    const uncollected = rares.filter(e => !G.rareCollectedIds.includes(e.id));
    const pool = uncollected.length > 0 ? uncollected : rares;
    const event = randomFrom(pool);
    if (!G.rareCollectedIds.includes(event.id)) {
      G.rareCollectedIds.push(event.id);
    }
    return { event, isRare: true };
  } else {
    G.rareFailCount++;
    const commons = OUTING_EVENTS.filter(e => e.rarity === 'common');
    return { event: randomFrom(commons), isRare: false };
  }
}

function calcOutingReward(outingCount) {
  const [baseLow, baseHigh] = goOutBaseCoinRange(outingCount);
  let coins = rand(baseLow, baseHigh);
  coins = Math.floor(coins * hungerCoinMult() * moodCoinMult());

  if (getEquippedBondOutfitEffect() === 'GO_OUT_COIN_BONUS') {
    coins = Math.floor(coins * 1.1);
  }

  const moodGain    = rand(...GAME_CONFIG.goOutBaseMoodRange);
  const bondExpGain = rand(...GAME_CONFIG.goOutBaseBondExpRange);

  return { coins, moodGain, bondExpGain };
}

// ──────────────────────────────────────────────
//   BOND EVENT — MISSED / CATCH-UP
// ──────────────────────────────────────────────
function checkMissedBondEvents() {
  if (!BOND_EVENTS.length) return;
  const seen = G.seenBondEvents || [];
  const missed = BOND_EVENTS
    .filter(e => e.minBondLevel <= G.bondLevel && !seen.includes(e.id))
    .sort((a, b) => a.minBondLevel - b.minBondLevel);
  if (missed.length === 0) return;
  // Show one per session, after a short delay so the UI has settled
  setTimeout(() => showBondEventModal(missed[0]), 1500);
}

// ──────────────────────────────────────────────
//   BOND EVENT MODAL
// ──────────────────────────────────────────────
let _pendingBondEvent = null;

function showBondEventModal(event) {
  _pendingBondEvent = event;
  document.getElementById('return-modal-title').textContent = '🎀 羁绊记忆';
  const eventArea = document.getElementById('return-event-area');
  if (event.img) {
    eventArea.innerHTML = `
      <img class="return-event-img" src="${event.img}" alt=""
           onerror="this.style.display='none'">
      <div class="return-event-text">${event.text}</div>
    `;
  } else {
    eventArea.innerHTML = `<div class="return-event-text">${event.text}</div>`;
  }
  document.getElementById('return-reward-area').classList.add('hidden');
  document.getElementById('return-close-btn').onclick = closeBondEventModal;
  document.getElementById('outing-return-modal').classList.remove('hidden');
}

function closeBondEventModal() {
  const event = _pendingBondEvent;
  if (event) {
    if (!G.seenBondEvents) G.seenBondEvents = [];
    G.seenBondEvents.push(event.id);
    G.diary.unshift({ date: event.date || todayStr(), text: event.text, ...(event.img ? { img: event.img } : {}), rarity: 'bond', bondEventId: event.id });
    if (G.diary.length > 100) G.diary.pop();
    saveState();
    renderDiaryPanel();
  }
  _pendingBondEvent = null;
  document.getElementById('return-modal-title').textContent = '📔 外出归来';
  document.getElementById('return-close-btn').onclick = closeReturnModal;
  document.getElementById('outing-return-modal').classList.add('hidden');
}

function showReturnModal(event, baseReward, isRare) {
  _currentOutingEvent  = event;

  let { coins, moodGain, bondExpGain } = baseReward;
  if (isRare) {
    coins       += rand(...GAME_CONFIG.rareExtraCoins);
    moodGain    += rand(...GAME_CONFIG.rareExtraMood);
    bondExpGain += rand(...GAME_CONFIG.rareExtraBondExp);
  } else {
    coins       += rand(...GAME_CONFIG.normalEventExtraCoins);
    moodGain    += rand(...GAME_CONFIG.normalEventExtraMood);
    bondExpGain += rand(...GAME_CONFIG.normalEventExtraBondExp);
  }
  _currentOutingReward = { coins, moodGain, bondExpGain, isRare };

  const eventArea = document.getElementById('return-event-area');
  if (event.img) {
    eventArea.innerHTML = `
      <img class="return-event-img" src="${event.img}" alt=""
           onerror="this.style.display='none'">
      <div class="return-event-text">${event.text}</div>
    `;
  } else {
    eventArea.innerHTML = `<div class="return-event-text">${event.text}</div>`;
  }

  const rewardArea = document.getElementById('return-reward-area');
  const rareBadge = isRare ? '<span class="rare-badge">✨ 稀有</span> ' : '';
  rewardArea.innerHTML = `${rareBadge}🪙+${coins} &nbsp; 🩷+${moodGain} &nbsp; 🎀经验+${bondExpGain}`;
  rewardArea.classList.remove('hidden');

  document.getElementById('outing-return-modal').classList.remove('hidden');
}

function closeReturnModal() {
  const event  = _currentOutingEvent;
  const reward = _currentOutingReward;

  if (reward && event) {
    G.coins += reward.coins;
    G.mood   = clamp(G.mood + reward.moodGain, 0, 100);
    addBondExp(reward.bondExpGain);
    if (G.goOutCountToday >= 2) G.dailyTasks.goOutDone = true;

    const entry = { date: todayStr(), text: event.text, rarity: event.rarity };
    if (event.img) entry.img = event.img;
    G.diary.unshift(entry);
    if (G.diary.length > 100) G.diary.pop();
  }

  G.outingStartedAt = null;
  G._pendingOutingCount = null;

  saveState();
  renderAll();
  renderDiaryPanel();

  document.getElementById('outing-return-modal').classList.add('hidden');
  _currentOutingEvent  = null;
  _currentOutingReward = null;
}

// ──────────────────────────────────────────────
//   WORK (打工)
// ──────────────────────────────────────────────
let workTimer = null;

function handleWorkClick() {
  resetDailyTasksIfNeeded();

  if (G.workCountToday >= GAME_CONFIG.workDailyMaxTimes) {
    toast('今天已经打够工啦！明天再来 💪');
    return;
  }
  if (G.workCoinsToday >= GAME_CONFIG.workDailyCoinCap) {
    toast('今日打工收入已达上限 150🪙');
    return;
  }
  if (G.workStartedAt) return; // already working

  startWork();
}

function startWork() {
  G.workStartedAt = Date.now();
  saveState();
  renderAll();

  let elapsedSec = 0;
  setWorkProgressRing(0);
  workTimer = setInterval(() => {
    elapsedSec++;
    setWorkProgressRing(elapsedSec);
    if (elapsedSec >= GAME_CONFIG.workDurationSeconds) {
      clearInterval(workTimer);
      workTimer = null;
      finishWork();
    }
  }, 1000);
}

function finishWork() {
  setWorkProgressRing(0);
  G.workStartedAt = null;

  const remaining = GAME_CONFIG.workDailyCoinCap - G.workCoinsToday;
  let earnedCoins = rand(...GAME_CONFIG.workCoinRange);
  earnedCoins = Math.min(earnedCoins, remaining);

  const earnedBondExp = earnedCoins > 0 ? GAME_CONFIG.workBondExp : 0;

  G.workCountToday++;
  if (earnedCoins > 0) {
    G.workCoinsToday += earnedCoins;
    G.coins          += earnedCoins;
    addBondExp(earnedBondExp);
    toast(`打工完成！+${earnedCoins}🪙 +${earnedBondExp}羁绊经验`);
  } else {
    toast('今日打工收入已达上限 150🪙');
  }

  saveState();
  renderAll();
}

// ──────────────────────────────────────────────
//   INTERACT (聊天 / tap)
// ──────────────────────────────────────────────
function interact() {
  const expr  = moodExpr();
  const lines = DIALOGUES[expr];
  const line  = randomFrom(lines);
  showSpeech(line);

  if (expr === 'sad' || expr === 'cold') {
    animSprite('shake');
  } else {
    animSprite(Math.random() > 0.5 ? 'bounce' : 'spin');
  }
}

// music button removed; keeping stub for compatibility
function toggleMusic() {}

// ──────────────────────────────────────────────
//   CHARACTER EXPRESSION & OUTFIT OVERLAY
// ──────────────────────────────────────────────

/** Set the bottom-layer expression image without touching the outfit overlay. */
function setCharExpression(key) {
  const file   = EXPRESSION_SPRITES[key] || 'char_normal.png';
  const src    = `assets/characters/${file}`;
  const sprite  = document.getElementById('char-sprite');
  const fallback = document.getElementById('char-fallback');
  if (!sprite) return;

  const testImg = new Image();
  testImg.onload = () => {
    sprite.src = src;
    sprite.classList.remove('hidden');
    fallback?.classList.add('hidden');
  };
  testImg.onerror = () => {
    // Fall back to char_normal.png, then emoji
    const norm = new Image();
    norm.onload  = () => { sprite.src = 'assets/characters/char_normal.png'; sprite.classList.remove('hidden'); fallback?.classList.add('hidden'); };
    norm.onerror = () => { sprite.classList.add('hidden'); fallback?.classList.remove('hidden'); };
    norm.src = 'assets/characters/char_normal.png';
  };
  testImg.src = src;
}

/** Show or hide the outfit overlay image above the character. */
function applyOutfitOverlay(outfitId) {
  const outfit = OUTFITS_CONFIG.find(o => o.id === outfitId);
  const el = document.getElementById('char-outfit-overlay');
  if (!el) return;
  if (outfit && outfit.overlay) {
    el.src = outfit.overlay;
    el.style.display = 'block';
  } else {
    el.src = '';
    el.style.display = 'none';
  }
}

// ──────────────────────────────────────────────
//   CHEWING ANIMATION
// ──────────────────────────────────────────────

/**
 * Alternate chew1/chew2 frames to create a chewing animation.
 * @param {string|null} afterExprKey — expression to show after chewing ends (null = moodExpr)
 * @param {number} holdDuration — ms to hold afterExprKey before reverting to moodExpr (0 = no revert)
 * @param {number} chewDuration — chewing animation duration in ms (default 3000)
 */
function startChewing(afterExprKey = null, holdDuration = 0, chewDuration = 3000) {
  stopChewing();
  let frame = 0;
  _chewTimer = setInterval(() => {
    frame = 1 - frame;
    setCharExpression(frame === 0 ? 'chew1' : 'chew2');
  }, 350);
  _chewTimeout = setTimeout(() => {
    stopChewing();
    if (afterExprKey) {
      setCharExpression(afterExprKey);
      if (holdDuration > 0) setTimeout(() => renderAll(), holdDuration);
    } else {
      renderAll();
    }
  }, chewDuration);
}

function stopChewing() {
  if (_chewTimer)   { clearInterval(_chewTimer);   _chewTimer   = null; }
  if (_chewTimeout) { clearTimeout(_chewTimeout);  _chewTimeout = null; }
}

// ──────────────────────────────────────────────
//   RENDER
// ──────────────────────────────────────────────
function renderAll() {
  const expr = moodExpr();

  setBar('mood',   G.mood);
  setBar('hunger', G.hunger);
  setBar('energy', G.energy);

  // Bond EXP bar: fill relative to current level's required EXP
  const bondExpMax = G.bondLevel < GAME_CONFIG.bondLevelMax
    ? bondExpNeeded(G.bondLevel)
    : 1;
  const bondBarPct = G.bondLevel >= GAME_CONFIG.bondLevelMax
    ? 100
    : Math.round((G.bondExp / bondExpMax) * 100);
  const bondBar = document.getElementById('bar-bond');
  if (bondBar) bondBar.style.width = `${bondBarPct}%`;

  const bondLevelStr = `Lv.${G.bondLevel}`;
  // const elBond2 = document.getElementById('val-bond2');
  // if (elBond2) elBond2.textContent = bondLevelStr;
  document.getElementById('bond-val').textContent = bondLevelStr;

  const bondExpInfoEl = document.getElementById('bond-exp-info');
  const bondExpFillEl = document.getElementById('bond-exp-bar-fill');
  if (bondExpInfoEl) {
    if (G.bondLevel < GAME_CONFIG.bondLevelMax) {
      bondExpInfoEl.textContent = `${G.bondExp} / ${bondExpMax}`;
      if (bondExpFillEl) bondExpFillEl.style.width = `${bondBarPct}%`;
    } else {
      bondExpInfoEl.textContent = '满级';
      if (bondExpFillEl) bondExpFillEl.style.width = '100%';
    }
  }

  // const elMood   = document.getElementById('val-mood');
  // const elHunger = document.getElementById('val-hunger');
  // const elEnergy = document.getElementById('val-energy');
  // const elCoin2  = document.getElementById('coin-val2');
  // if (elMood)   elMood.textContent   = Math.round(G.mood);
  // if (elHunger) elHunger.textContent = Math.round(G.hunger);
  // if (elEnergy) elEnergy.textContent = Math.round(G.energy);
  // if (elCoin2)  elCoin2.textContent  = G.coins;
  document.getElementById('coin-val').textContent = G.coins;
  document.getElementById('mini-hunger-val').textContent = Math.round(G.hunger) + '%';
  document.getElementById('mini-energy-val').textContent = Math.round(G.energy) + '%';
  document.getElementById('mini-mood-val').textContent   = Math.round(G.mood)   + '%';

  if (!_chewTimer) setCharExpression(expr);
  applyOutfitOverlay(G.outfit);

  const outingBtn = document.getElementById('nav-outing');
  const workBtn   = document.getElementById('nav-work');
  if (outingBtn) outingBtn.disabled = !!G.outingStartedAt;
  if (workBtn)   workBtn.disabled   = !!G.workStartedAt;
}

function setBar(stat, val) {
  const bar = document.getElementById(`bar-${stat}`);
  if (bar) bar.style.width = `${clamp(val, 0, 100)}%`;
}

// ──────────────────────────────────────────────
//   BUILD GRIDS
// ──────────────────────────────────────────────
function buildFoodGrid() {
  const grid = document.getElementById('food-grid');
  grid.innerHTML = '';

  const groups = [
    { type: 'normal',   label: '普通食物' },
    { type: 'favorite', label: '最爱食物' },
    { type: 'disliked', label: '不喜欢的食物' },
    { type: 'special',  label: '特殊食物' },
  ];

  groups.forEach(({ type }) => {
    const items = FOODS.filter(f => f.type === type);
    if (items.length === 0) return;

    items.forEach(food => {
      const div = document.createElement('div');
      div.className = `food-item ${food.type}${food.special ? ' locked' : ''}`;

      const moodSign  = food.mood >= 0 ? `+${food.mood}` : `${food.mood}`;
      const moodColor = food.mood >= 0 ? '#ff6b9d' : '#e74c3c';

      div.innerHTML = `
        <img class="food-img" src="assets/food/food_${food.id}.png" alt="${food.name}"
             onerror="this.replaceWith(Object.assign(document.createElement('div'), {
               className:'food-img', style:'font-size:36px;line-height:60px;text-align:center',
               textContent:'${food.emoji}'
             }))" />
        <span class="food-name">${food.name}</span>
        <span class="food-bonus" style="color:#ffb347">🍚+${food.hunger}</span>
        <span class="food-bonus" style="color:${moodColor}">🩷${moodSign}</span>
        <span class="food-price">${food.price > 0 ? `🪙${food.price}` : '事件获得'}</span>
      `;
      if (!food.special) div.addEventListener('click', () => feedFood(food.id));
      grid.appendChild(div);
    });
  });
}

function buildOutfitGrid() {
  const grid = document.getElementById('outfit-grid');
  grid.innerHTML = '';
  const purchased = G.purchasedOutfits || ['default'];

  OUTFITS_CONFIG.forEach(outfit => {
    // Type 4 (special): hide completely when not yet available
    if (outfit.type === 'special' && !isSpecialOutfitAvailable(outfit)) return;

    const active  = G.outfit === outfit.id;
    const owned   = isOutfitOwned(outfit.id);
    const div     = document.createElement('div');

    // --- Type 3 (bond) locked: silhouette card ---
    if (outfit.type === 'bond' && !owned) {
      div.className = 'outfit-item bond-locked';
      div.innerHTML = `
        <div class="outfit-thumb-wrap silhouette">
          <span class="outfit-emoji">${outfit.thumbEmoji}</span>
          ${outfit.thumb ? `<img class="outfit-thumb-img" src="${outfit.thumb}" alt="">` : ''}
        </div>
        <span class="outfit-name">???</span>
        <span class="outfit-unlock">🎀 Lv.${outfit.unlockLevel} 解锁</span>
      `;
      div.addEventListener('click', () => toast(`🎀 羁绊 Lv.${outfit.unlockLevel} 解锁`));
      grid.appendChild(div);
      return;
    }

    // --- Type 2 (coin) not purchased: for-sale card ---
    if (outfit.type === 'coin' && !owned) {
      div.className = 'outfit-item coin-for-sale';
      div.innerHTML = `
        <div class="outfit-thumb-wrap">
          <span class="outfit-emoji">${outfit.thumbEmoji}</span>
          ${outfit.thumb ? `<img class="outfit-thumb-img" src="${outfit.thumb}" alt="${outfit.name}">` : ''}
        </div>
        <span class="outfit-name">${outfit.name}</span>
        <span class="outfit-price">🪙 ${outfit.price}</span>
      `;
      div.addEventListener('click', () => purchaseOutfit(outfit.id));
      grid.appendChild(div);
      return;
    }

    // --- Owned / default / special-available: normal card ---
    div.className = `outfit-item${active ? ' active' : ''}`;
    div.innerHTML = `
      <div class="outfit-thumb-wrap">
        <span class="outfit-emoji">${outfit.thumbEmoji}</span>
        ${outfit.thumb ? `<img class="outfit-thumb-img" src="${outfit.thumb}" alt="${outfit.name}">` : ''}
        ${active ? '<span class="outfit-check">✓</span>' : ''}
      </div>
      <span class="outfit-name">${outfit.name}</span>
      <span class="outfit-unlock">${active ? '当前穿着' : '点击穿着'}</span>
    `;
    div.addEventListener('click', () => equipOutfit(outfit.id));
    grid.appendChild(div);
  });
}

function buildMemoryList() {
  const list = document.getElementById('memory-list');
  list.innerHTML = '';
  if (G.memories.length === 0) {
    list.innerHTML = '<div class="empty-msg">🌸 还没有回忆，快去外出吧～</div>';
    return;
  }
  G.memories.slice(0, 20).forEach(m => {
    const div = document.createElement('div');
    div.className = 'memory-entry';
    div.innerHTML = `<div class="mem-date">${m.date}</div><div class="mem-text">${m.text}</div>`;
    list.appendChild(div);
  });
}

function renderDiaryPanel() {
  const el = document.getElementById('diary-content');
  if (!el) return;
  el.innerHTML = '';

  const outingEntries = G.diary.filter(d => d.rarity !== 'bond' && d.img);
  const bondEntries   = G.diary.filter(d => d.rarity === 'bond')
    .sort((a, b) => {
      // Sort by minBondLevel via BOND_EVENTS lookup, fallback to diary order
      const la = BOND_EVENTS.find(e => e.id === a.bondEventId)?.minBondLevel ?? 0;
      const lb = BOND_EVENTS.find(e => e.id === b.bondEventId)?.minBondLevel ?? 0;
      return la - lb;
    });

  const hasOuting = outingEntries.length > 0;
  const hasBond   = bondEntries.length > 0;

  if (!hasOuting && !hasBond) {
    el.innerHTML = '<div class="empty-msg">📷 还没有珍贵回忆，多去外出探险吧～</div>';
    return;
  }

  // ── Section: Outing photos ──
  if (hasOuting) {
    const section = document.createElement('div');
    section.className = 'diary-section';
    section.innerHTML = '<div class="diary-section-title">📷 外出记忆</div>';
    const grid = document.createElement('div');
    grid.className = 'diary-thumb-grid';
    outingEntries.forEach(d => {
      const div = document.createElement('div');
      div.className = 'diary-thumb';
      div.innerHTML = `
        <img class="diary-thumb-img" src="${d.img}" alt="" onerror="this.style.display='none'">
        <div class="diary-thumb-date">${d.date}</div>
      `;
      div.addEventListener('click', () => openDiaryDetail(d));
      grid.appendChild(div);
    });
    section.appendChild(grid);
    el.appendChild(section);
  }

  // ── Section: Bond timeline ──
  if (hasBond) {
    const section = document.createElement('div');
    section.className = 'diary-section';
    section.innerHTML = '<div class="diary-section-title">🎀 羁绊时间轴</div>';
    const timeline = document.createElement('div');
    timeline.className = 'bond-timeline';
    bondEntries.forEach(d => {
      const item = document.createElement('div');
      item.className = 'bond-timeline-item';
      const level = BOND_EVENTS.find(e => e.id === d.bondEventId)?.minBondLevel;
      item.innerHTML = `
        <div class="bond-timeline-dot"></div>
        <div class="bond-timeline-body" ${d.img ? 'style="cursor:pointer"' : ''}>
          <div class="bond-timeline-meta">
            ${level ? `<span class="bond-timeline-lv">Lv.${level}</span>` : ''}
            <span class="bond-timeline-date">${d.date}</span>
          </div>
          <div class="bond-timeline-text diary-handwriting">${d.text}</div>
          ${d.img ? `<img class="bond-timeline-img" src="${d.img}" alt="" onerror="this.style.display='none'">` : ''}
        </div>
      `;
      if (d.img) item.querySelector('.bond-timeline-body').addEventListener('click', () => openDiaryDetail(d));
      timeline.appendChild(item);
    });
    section.appendChild(timeline);
    el.appendChild(section);
  }
}

function openDiaryDetail(d) {
  document.getElementById('diary-detail-img').src   = d.img;
  document.getElementById('diary-detail-date').textContent = d.date;
  document.getElementById('diary-detail-text').textContent = d.text;
  document.getElementById('diary-detail-modal').classList.remove('hidden');
}

function closeDiaryDetail() {
  document.getElementById('diary-detail-modal').classList.add('hidden');
}


// ──────────────────────────────────────────────
//   DAILY TASKS
// ──────────────────────────────────────────────
function resetDailyTasksIfNeeded() {
  const today = todayStr();
  let changed = false;

  if (G.dailyTasks.date !== today) {
    G.dailyTasks = {
      date: today,
      loginClaimed: false,
      feeds: 0,
      feedsClaimed: false,
      goOutDone: false,
      goOutClaimed: false,
    };
    changed = true;
  }
  if (G.goOutCountDate !== today) {
    G.goOutCountToday = 0;
    G.goOutCountDate  = today;
    changed = true;
  }
  if (G.workDate !== today) {
    G.workCountToday = 0;
    G.workCoinsToday = 0;
    G.workDate = today;
    changed = true;
  }
  if (G.onlineMoodDate !== today) {
    G.onlineMoodGainedToday = 0;
    G.onlineMoodDate = today;
    changed = true;
  }
  if (changed) saveState();
}

function buildTasksPanel() {
  const list = document.getElementById('tasks-list');
  if (!list) return;
  resetDailyTasksIfNeeded();
  const dt  = G.dailyTasks;
  const cfg = GAME_CONFIG;

  const tasks = [
    {
      key: 'login',
      name: '今日登录签到',
      progress: dt.loginClaimed ? '已完成' : '完成登录即可领取',
      done: dt.loginClaimed,
      canClaim: !dt.loginClaimed,
      reward: `+${cfg.missionLoginCoins}🪙 +${cfg.missionLoginBondExp}羁绊经验`,
    },
    {
      key: 'feeds',
      name: '今日投喂 3 次',
      progress: `${Math.min(dt.feeds, 3)}/3`,
      done: dt.feedsClaimed,
      canClaim: dt.feeds >= 3 && !dt.feedsClaimed,
      reward: `+${cfg.missionFeedCoins}🪙 +${cfg.missionFeedBondExp}羁绊经验`,
    },
    {
      key: 'goOut',
      name: '今日外出 2 次',
      progress: dt.goOutClaimed ? '已完成' : `${Math.min(G.goOutCountToday, 2)}/2`,
      done: dt.goOutClaimed,
      canClaim: dt.goOutDone && !dt.goOutClaimed,
      reward: `+${cfg.missionGoOutCoins}🪙 +${cfg.missionGoOutBondExp}羁绊经验`,
    },
  ];

  list.innerHTML = '';
  tasks.forEach(t => {
    const row = document.createElement('div');
    row.className = `task-row${t.done ? ' done' : ''}`;
    row.innerHTML = `
      <span class="task-check">${t.done ? '✅' : '⬜'}</span>
      <div class="task-info">
        <div class="task-name">${t.name}</div>
        <div class="task-progress">${t.progress}</div>
      </div>
      <button class="task-claim-btn" ${!t.canClaim ? 'disabled' : ''}
              onclick="claimTask('${t.key}')">
        ${t.done ? '已领取' : t.reward}
      </button>
    `;
    list.appendChild(row);
  });

  // Work progress footer
  const workFooter = document.createElement('div');
  workFooter.className = 'task-work-progress';
  workFooter.textContent = `💼 今日打工收入：${G.workCoinsToday}/${GAME_CONFIG.workDailyCoinCap}🪙  (${G.workCountToday}/${GAME_CONFIG.workDailyMaxTimes}次)`;
  list.appendChild(workFooter);
}

function claimTask(key) {
  resetDailyTasksIfNeeded();
  const dt  = G.dailyTasks;
  const cfg = GAME_CONFIG;

  if (key === 'login' && !dt.loginClaimed) {
    dt.loginClaimed = true;
    G.coins += cfg.missionLoginCoins;
    addBondExp(cfg.missionLoginBondExp);
    toast(`登录签到 +${cfg.missionLoginCoins}🪙 +${cfg.missionLoginBondExp}羁绊经验`);

  } else if (key === 'feeds' && dt.feeds >= 3 && !dt.feedsClaimed) {
    dt.feedsClaimed = true;
    G.coins += cfg.missionFeedCoins;
    addBondExp(cfg.missionFeedBondExp);
    toast(`投喂任务 +${cfg.missionFeedCoins}🪙 +${cfg.missionFeedBondExp}羁绊经验`);

  } else if (key === 'goOut' && dt.goOutDone && !dt.goOutClaimed) {
    dt.goOutClaimed = true;
    G.coins += cfg.missionGoOutCoins;
    addBondExp(cfg.missionGoOutBondExp);
    toast(`外出任务 +${cfg.missionGoOutCoins}🪙 +${cfg.missionGoOutBondExp}羁绊经验`);
  }

  saveState();
  renderAll();
  buildTasksPanel();
}

// ──────────────────────────────────────────────
//   PANELS & POPUPS
// ──────────────────────────────────────────────
let currentPanel = null;

function openPanel(name) {
  closePanel();
  const el = document.getElementById(`panel-${name}`);
  if (!el) return;
  if (name === 'tasks') buildTasksPanel();
  if (name === 'diary') renderDiaryPanel();
  el.classList.remove('hidden');
  document.getElementById('backdrop').classList.remove('hidden');
  currentPanel = name;
}

function closePanel() {
  if (currentPanel) {
    document.getElementById(`panel-${currentPanel}`)?.classList.add('hidden');
    currentPanel = null;
  }
  document.getElementById('backdrop').classList.add('hidden');
}

function showPopup(emoji, title, text, rewards) {
  document.getElementById('popup-emoji').textContent   = emoji  || '🚪';
  document.getElementById('popup-title').textContent   = title  || '';
  document.getElementById('popup-text').textContent    = text   || '';
  document.getElementById('popup-rewards').textContent = rewards || '';
  document.getElementById('popup-outing').classList.remove('hidden');
}

function closePopup() {
  document.getElementById('popup-outing').classList.add('hidden');
}

// ──────────────────────────────────────────────
//   SPEECH / CONTEXT LABEL
// ──────────────────────────────────────────────
function showSpeech(text, duration = 3200) {
  const el = document.getElementById('context-label');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('label-hidden');
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => el.classList.add('label-hidden'), duration);
}

// Show floating mood regen tip if daily cap not yet reached. Reschedules itself.
function scheduleMoodRegenTip() {
  const delay = 2000 + Math.random() * 1000; // 2–3 s
  setTimeout(() => {
    const equippedOutfit = getEquippedBondOutfitEffect();
    const capBonus = equippedOutfit === 'COIN_OUTFIT_MOOD_CAP' ? GAME_CONFIG.coinOutfitMoodCapBonus : 0;
    const dailyCap = GAME_CONFIG.onlineMoodDailyCap + capBonus;
    if (G.onlineMoodGainedToday < dailyCap && G.mood < 100) {
      const tip = document.getElementById('mood-regen-tip');
      if (tip) {
        tip.textContent = '+';
        tip.classList.remove('hidden');
        // Restart animation by removing and re-adding
        tip.style.animation = 'none';
        void tip.offsetWidth;
        tip.style.animation = '';
        setTimeout(() => tip.classList.add('hidden'), 2000);
      }
    }
    scheduleMoodRegenTip();
  }, delay);
}

// Randomly show an idle CONTEXT_LABELS line. Reschedules itself.
function scheduleIdleChatter() {
  const delay = 20000 + Math.random() * 40000; // 20–60 s
  setTimeout(() => {
    const el = document.getElementById('context-label');
    if (el && el.classList.contains('label-hidden')) {
      const expr = moodExpr();
      const line = G.outfit !== 'default' ? '打扮一下吧～' : randomFrom(CONTEXT_LABELS[expr] || []);
      if (line) showSpeech(line, 3000);
    }
    scheduleIdleChatter();
  }, delay);
}

// ──────────────────────────────────────────────
//   TOAST
// ──────────────────────────────────────────────
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ──────────────────────────────────────────────
//   SPRITE ANIMATION
// ──────────────────────────────────────────────
function animSprite(cls) {
  // Animate the whole wrapper so character + outfit overlay move together
  const s = document.getElementById('char-sprite-wrap');
  if (!s) return;
  s.classList.remove('bounce', 'shake', 'spin');
  void s.offsetWidth;
  s.classList.add(cls);
  s.addEventListener('animationend', () => s.classList.remove(cls), { once: true });
}

// ──────────────────────────────────────────────
//   PERSISTENCE
// ──────────────────────────────────────────────
function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(G)); } catch {}
}

function loadState() {
  try {
    const s = localStorage.getItem(STATE_KEY);
    if (s) return { ...defaultState, ...JSON.parse(s) };
  } catch {}
  return { ...defaultState };
}

// ──────────────────────────────────────────────
//   UTILS
// ──────────────────────────────────────────────
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function todayStr() { return new Date().toLocaleDateString('zh-CN'); }
function moodExpr() {
  if (G.mood >= 50) return 'normal';
  if (G.mood >= 20) return 'cold';
  return 'sad';
}
function tagLabel(type) {
  return { liked:'喜欢', disliked:'不喜欢', special:'特殊' }[type] || '';
}
