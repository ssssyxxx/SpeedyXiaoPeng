// ═══════════════════════════════════════════════
//   SPEEDYPENG  —  Game Logic
// ═══════════════════════════════════════════════

// ─── Constants ────────────────────────────────
const STATE_KEY  = 'speedypeng_v2';
// Tick = 60 real seconds = 1 game-hour.
// Change to 3_600_000 for production (1 real hour = 1 game-hour).
const TICK_MS    = 60_000;
const MAX_OFFLINE_TICKS = 48; // cap at 48 game-hours offline

// ─── Default State ────────────────────────────
const defaultState = {
  mood:     80,
  hunger:   60,
  energy:   70,
  bond:     1,
  coins:    200,
  outfit:   'default',
  lastTick: Date.now(),
  outingCooldown: 0,
  outingStartedAt: null,
  memories:  [],
  diary:     [],
  unlockedOutfits: ['default'],
  totalFeeds: 0,
  loginStreak: 0,
  lastLogin: '',
  // Daily tasks: reset each day
  dailyTasks: { date: '', loginClaimed: false, feeds: 0, feedsClaimed: false, dressed: false, dressClaimed: false },
};

// ─── Expression sprites map ────────────────────
// Maps expression key → filename in assets/characters/
const EXPRESSION_SPRITES = {
  happy:       'char_happy.png',
  normal:      'char_normal.png',
  cold:        'char_sad.png',
  sad:         'char_sad.png',
  disgusted:   'char_disgusted.png',
  pouty_tired: 'char_pouty_tired.png',
  pouty_mood:  'char_pouty_mood.png',
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
  // Regular
  { id:'bread',          name:'面包',    type:'regular',  price:60,  emoji:'🍞', hunger:20, mood: 5, bond: 0 },
  { id:'milk',           name:'牛奶',    type:'regular',  price:50,  emoji:'🥛', hunger:20, mood: 5, bond: 0 },
  { id:'fruit',          name:'水果',    type:'regular',  price:70,  emoji:'🍓', hunger:20, mood: 5, bond: 0 },
  // Liked
  { id:'oyster_omelet',  name:'海蛎煎',  type:'liked',    price:80,  emoji:'🥘', hunger:25, mood:20, bond: 5 },
  { id:'white_cake',     name:'白糕',    type:'liked',    price:75,  emoji:'🍡', hunger:25, mood:20, bond: 5 },
  // Disliked
  { id:'cilantro',       name:'香菜',    type:'disliked', price:10,  emoji:'🌿', hunger:20, mood:-5, bond:-1 },
  { id:'tubeworm_jelly', name:'土笋冻',  type:'disliked', price:20,  emoji:'🫙', hunger:20, mood:-5, bond:-1 },
  // Special (event drops only)
  { id:'perf_sweet',     name:'演出甜品', type:'special',  price:0,   emoji:'⭐', hunger:15, mood:30, bond:10, special:true },
  { id:'holiday_cake',   name:'节日蛋糕', type:'special',  price:0,   emoji:'🎂', hunger:15, mood:30, bond:10, special:true },
];

// ─── Data: Outfits ─────────────────────────────
// ── 开发者在此处新增衣服 ─────────────────────────
// thumb:      衣服卡片缩略图路径（null 则显示 thumbEmoji）
// thumbEmoji: 缩略图加载失败时的 emoji 降级
// overlay:    无头身体+衣服蒙版路径（null 则不叠加）
// unlockBond: 解锁所需羁绊值
const OUTFITS = [
  { id:'default',  name:'原装',     thumbEmoji:'🐧', thumb:null,                                  overlay:null,                                     unlockBond:0,  desc:'清爽自然' },
  { id:'overalls', name:'背带裤',   thumbEmoji:'👖', thumb:'assets/outfits/overalls_thumb.png',  overlay:'assets/characters/overalls_overlay.png', unlockBond:0,  desc:'清爽可爱' },
  { id:'trendy',   name:'潮男衣服', thumbEmoji:'🧥', thumb:'assets/outfits/trendy_thumb.png',    overlay:'assets/characters/trendy_overlay.png',   unlockBond:0, desc:'羁绊20解锁' },
];

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

// ─── Data: Mood taglines ──────────────────────
const MOOD_TAGLINES = {
  happy:  ['立誓做一只快乐小企鹅！', '今天也元气满满！', '啊啊啊开心！'],
  normal: ['平平淡淡才是真', '嗯，挺好的', ''],
  cold:   ['已进入省电模式', '不想说话谢谢', ''],
  sad:    ['需要一个拥抱…', '求投喂…', '心情有点低落'],
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
const OUTING_EVENTS = [
  // Common events (text-only)
  { id:'c1', rarity:'common', text:'在街角遇见了一只流浪猫，喂了它小鱼干，它蹭了蹭我就跑走了。' },
  { id:'c2', rarity:'common', text:'买了杯奶茶，喝到一半发现是半糖，刚好。' },
  { id:'c3', rarity:'common', text:'路过书店翻了翻新书，没买，但心里很满足。' },
  { id:'c4', rarity:'common', text:'坐公交时，旁边小朋友在画画，画得很好看，我们比了一个大拇指。' },
  { id:'c5', rarity:'common', text:'在超市碰到了打折，买了一堆零食，背包沉甸甸的。' },
  { id:'c6', rarity:'common', text:'在公园找到一张没人要的素描，画的是一棵老树，带回来了。' },
  { id:'c7', rarity:'common', text:'下雨了，躲进一家没去过的小店，老板泡了碗热茶，坐了很久。' },
  { id:'c8', rarity:'common', text:'路过一所小学，下课铃声响起，孩子们冲出来，把我也卷进了那个夏天。' },
  { id:'c9', rarity:'common', text:'在旧货市场发现了一盘旧磁带，不知道是谁的，带回来了。' },
  // Rare events (text + user-provided img)
  { id:'r1', rarity:'rare', text:'意外遇见了好久不见的老朋友，聊了整个下午，还拿到了一张合照。', img:'assets/outing/rare_friends.jpg' },
  { id:'r2', rarity:'rare', text:'在街头驻足听了一位街头歌手表演，结束后他把手写歌词送给了我。', img:'assets/outing/rare_singer.jpg' },
  { id:'r3', rarity:'rare', text:'找到了传说中的老字号小吃，排了一小时队，值了，真的值了。', img:'assets/outing/rare_food.jpg' },
];

// ══════════════════════════════════════════════
//   INIT
// ══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  resetDailyTasksIfNeeded();
  applyOfflineDecay();
  checkBondUnlocks(true); // ensure bond-0 outfits are unlocked on every load
  handleDailyLogin();
  buildFoodGrid();
  buildOutfitGrid();
  buildMemoryList();
  renderDiaryPanel();
  renderAll();
  updateBackground();

  // Periodic tick
  setInterval(() => { tickHour(); saveState(); }, TICK_MS);

  // Tap character = interact
  document.getElementById('char-sprite').addEventListener('click', interact);
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
  // Hunger falls
  G.hunger = clamp(G.hunger - 5, 0, 100);
  // Mood falls (faster if hungry)
  const moodDrain = G.hunger < 30 ? 5 : 2;
  G.mood = clamp(G.mood - moodDrain, 0, 100);
  // Energy recovers
  G.energy = clamp(G.energy + 5, 0, 100);
  // Mood bonus every hour if very happy
  if (G.mood > 80) G.coins = Math.min(G.coins + 10, 999999);

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

  // Streak logic
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toLocaleDateString('zh-CN');
  G.loginStreak = (G.lastLogin === yStr) ? G.loginStreak + 1 : 1;
  G.lastLogin   = today;

  // Rewards
  let bonus = 20;
  let msg   = '每日签到 +20金币';
  if (G.loginStreak >= 5) {
    bonus = 40; msg = `连续${G.loginStreak}天签到！+40金币🎉`;
  } else if (G.loginStreak >= 3) {
    bonus = 30; msg = `连续${G.loginStreak}天签到！+30金币`;
  }
  G.coins += bonus;
  G.bond   = clamp(G.bond + 3, 0, 100);

  // Mark login task as claimable (not auto-claimed — user claims in tasks panel)
  G.dailyTasks.loginClaimed = false;
  saveState();
  setTimeout(() => toast(msg), 800);
}

// ──────────────────────────────────────────────
//   BOND UNLOCKS
// ──────────────────────────────────────────────
function checkBondUnlocks(silent = false) {
  OUTFITS.forEach(o => {
    if (G.bond >= o.unlockBond && !G.unlockedOutfits.includes(o.id)) {
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
    toast('通过特殊事件或外出获得！');
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
  G.bond    = clamp(G.bond   + food.bond,   0, 100);
  G.totalFeeds++;
  G.dailyTasks.feeds = (G.dailyTasks.feeds || 0) + 1;

  saveState();
  checkBondUnlocks();
  buildFoodGrid();
  renderAll();
  closePanel();

  if (food.type === 'liked') {
    setCharExpression('happy');
    showSpeech(`${food.emoji || '😋'} 好吃！最喜欢了～`);
    startChewing('happy');        // chewing ends → stay happy until next renderAll
  } else if (food.type === 'disliked') {
    setCharExpression('disgusted');
    showSpeech(`${food.emoji || '😣'} 呜…不喜欢这个…`);
    startChewing(null);           // chewing ends → renderAll restores mood expression
  } else {
    setCharExpression(moodExpr());
    showSpeech(`${food.emoji || '🍞'} 谢谢投喂～`);
    startChewing(null);
  }
}

// ──────────────────────────────────────────────
//   OUTFIT
// ──────────────────────────────────────────────
function equipOutfit(outfitId) {
  const outfit = OUTFITS.find(o => o.id === outfitId);
  if (!outfit) return;
  if (!G.unlockedOutfits.includes(outfitId)) {
    toast(`需要羁绊值 ${outfit.unlockBond} 才能解锁`);
    return;
  }
  if (G.outfit === outfitId) { closePanel(); return; }

  G.outfit  = outfitId;
  G.dailyTasks.dressed = true;
  saveState();
  renderAll();
  buildOutfitGrid();
  closePanel();
  toast(`换装完成！+10金币 ✨`);
  showSpeech('打扮一下吧～好看嗎？');
}

// ──────────────────────────────────────────────
//   OUTING (外出)
// ──────────────────────────────────────────────
function handleOutingClick() {
  if (G.energy < 50 || G.mood < 40) {
    // Priority: low energy > low mood when both fail
    showOutingBlocked(G.energy < 50 ? 'tired' : 'mood');
    return;
  }
  startOuting();
}

function showOutingBlocked(reason) {
  const text = randomFrom(OUTING_BLOCKED_DIALOGUES);
  const dialog = document.getElementById('outing-blocked-dialog');
  document.getElementById('outing-blocked-text').textContent = text;
  dialog.classList.remove('hidden');

  // Pick expression: tired (体力不足) vs pouty (心情不足)
  const exprKey = reason === 'tired' ? 'pouty_tired' : 'pouty_mood';
  setCharExpression(exprKey);

  setTimeout(() => {
    dialog.classList.add('hidden');
    renderAll(); // restore sprite to mood-based expression
  }, 2000);
}

function startOuting() {
  G.energy = clamp(G.energy - 20, 0, 100);
  G.outingStartedAt = Date.now();
  saveState();

  // Hide character
  document.getElementById('char-sprite-wrap').classList.add('char-hidden');

  // Show countdown text with fade-in
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
  const overlay   = document.getElementById('outing-overlay');
  const spriteWrap = document.getElementById('char-sprite-wrap');

  // Fade out overlay, fade in character simultaneously
  overlay.classList.remove('outing-visible');
  spriteWrap.classList.remove('char-hidden');
  G.outingStartedAt = null;
  renderAll();

  // After transition completes, clean up and show return modal
  setTimeout(() => {
    overlay.classList.add('hidden');
    const event  = pickOutingEvent();
    const reward = calcOutingReward();
    showReturnModal(event, reward);
  }, 500);
}

function pickOutingEvent() {
  const rares   = OUTING_EVENTS.filter(e => e.rarity === 'rare');
  const commons = OUTING_EVENTS.filter(e => e.rarity === 'common');
  if (rares.length > 0 && Math.random() < 0.2) {
    return randomFrom(rares);
  }
  return randomFrom(commons);
}

function calcOutingReward() {
  const r = Math.random();
  if (r < 0.80) {
    return { type: 'coins', amount: rand(5, 20) };
  }
  return { type: 'item', name: '神秘小礼物 🎁' };
}

function showReturnModal(event, reward) {
  _currentOutingEvent  = event;
  _currentOutingReward = reward;

  // Render event area (top)
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

  // Render reward area (bottom)
  const rewardArea = document.getElementById('return-reward-area');
  if (reward.type === 'coins') {
    rewardArea.textContent = `🪙 获得金币 +${reward.amount} 枚`;
  } else {
    rewardArea.textContent = `🎁 获得：${reward.name}`;
  }
  rewardArea.classList.remove('hidden');

  document.getElementById('outing-return-modal').classList.remove('hidden');
}

function closeReturnModal() {
  const event  = _currentOutingEvent;
  const reward = _currentOutingReward;

  // Apply reward
  if (reward && reward.type === 'coins') {
    G.coins += reward.amount;
  }

  // Write diary entry (with optional img for rare events)
  const entry = { date: todayStr(), text: event.text, rarity: event.rarity };
  if (event.img) entry.img = event.img;
  G.diary.unshift(entry);
  if (G.diary.length > 100) G.diary.pop();

  G.outingStartedAt = null;

  saveState();
  renderAll();
  renderDiaryPanel();

  document.getElementById('outing-return-modal').classList.add('hidden');
  _currentOutingEvent  = null;
  _currentOutingReward = null;
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
  const outfit = OUTFITS.find(o => o.id === outfitId);
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
 * @param {string|null} afterExprKey — expression to restore after chewing ends
 *                                     (null = call renderAll to restore mood-based expr)
 * @param {number} duration — animation duration in ms (default 3000)
 */
function startChewing(afterExprKey = null, duration = 3000) {
  stopChewing();
  let frame = 0;
  _chewTimer = setInterval(() => {
    frame = 1 - frame;
    setCharExpression(frame === 0 ? 'chew1' : 'chew2');
  }, 350);
  _chewTimeout = setTimeout(() => {
    stopChewing();
    if (afterExprKey) setCharExpression(afterExprKey);
    else renderAll();
  }, duration);
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

  // Stats bars
  setBar('mood',   G.mood);
  setBar('hunger', G.hunger);
  setBar('energy', G.energy);
  setBar('bond',   G.bond);

  // Values
  document.getElementById('val-mood').textContent   = Math.round(G.mood);
  document.getElementById('val-hunger').textContent = Math.round(G.hunger);
  document.getElementById('val-energy').textContent = Math.round(G.energy);
  document.getElementById('val-bond2').textContent  = Math.round(G.bond);
  document.getElementById('coin-val').textContent   = G.coins;
  document.getElementById('coin-val2').textContent  = G.coins;
  document.getElementById('bond-val').textContent   = Math.round(G.bond);
  document.getElementById('mini-hunger-val').textContent = Math.round(G.hunger) + '%';
  document.getElementById('mini-energy-val').textContent = Math.round(G.energy) + '%';
  document.getElementById('mini-mood-val').textContent   = Math.round(G.mood)   + '%';

  // Character expression (bottom layer) + outfit overlay (top layer).
  // Skip expression update while chewing animation is running.
  if (!_chewTimer) setCharExpression(expr);
  applyOutfitOverlay(G.outfit);

  // Context label
  document.getElementById('context-label').textContent =
    G.outfit !== 'default' ? '打扮一下吧～' : randomFrom(CONTEXT_LABELS[expr]) || '';

  // Mood tagline
  document.getElementById('mood-tagline').textContent =
    randomFrom(MOOD_TAGLINES[expr]) || '';


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
  FOODS.forEach(food => {
    const div = document.createElement('div');
    div.className = `food-item ${food.type}${food.special ? ' locked' : ''}`;
    div.innerHTML = `
      ${food.type !== 'regular' ? `<span class="food-tag tag-${food.type}">${tagLabel(food.type)}</span>` : ''}
      <img class="food-img" src="assets/food/food_${food.id}.png" alt="${food.name}"
           onerror="this.replaceWith(Object.assign(document.createElement('div'), {
             className:'food-img', style:'font-size:36px;line-height:60px;text-align:center',
             textContent:'${food.emoji}'
           }))" />
      <span class="food-name">${food.name}</span>
      <span class="food-price">${food.price > 0 ? `🪙${food.price}` : '事件获得'}</span>
    `;
    if (!food.special) div.addEventListener('click', () => feedFood(food.id));
    grid.appendChild(div);
  });
}

function buildOutfitGrid() {
  const grid = document.getElementById('outfit-grid');
  grid.innerHTML = '';
  OUTFITS.forEach(outfit => {
    const unlocked = G.unlockedOutfits.includes(outfit.id);
    const active   = G.outfit === outfit.id;
    const div = document.createElement('div');
    div.className = `outfit-item${active ? ' active' : ''}${!unlocked ? ' locked' : ''}`;

    // Emoji is always the base layer (always visible).
    // Thumbnail image is absolutely positioned on top; if it fails the emoji shows through.
    div.innerHTML = `
      <div class="outfit-thumb-wrap">
        <span class="outfit-emoji">${outfit.thumbEmoji}</span>
        ${outfit.thumb ? `<img class="outfit-thumb-img" src="${outfit.thumb}" alt="${outfit.name}">` : ''}
        ${active ? '<span class="outfit-check">✓</span>' : ''}
      </div>
      <span class="outfit-name">${outfit.name}</span>
      <span class="outfit-unlock">${unlocked ? (active ? '当前穿着' : '点击穿着') : outfit.desc}</span>
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
  if (G.diary.length === 0) {
    el.innerHTML = '<div class="empty-msg">📔 还没有日记，出去走走吧～</div>';
    return;
  }
  // G.diary is stored newest-first (unshift), so slice directly
  G.diary.slice(0, 30).forEach(d => {
    const div = document.createElement('div');
    div.className = 'diary-entry';
    if (d.img) {
      div.innerHTML = `
        <div class="mem-date">${d.date}</div>
        <img class="diary-entry-img" src="${d.img}" alt="" onerror="this.style.display='none'">
        <div class="mem-text diary-handwriting">${d.text}</div>
      `;
    } else {
      div.innerHTML = `
        <div class="mem-date">${d.date}</div>
        <div class="mem-text diary-handwriting">${d.text}</div>
      `;
    }
    el.appendChild(div);
  });
}


// ──────────────────────────────────────────────
//   DAILY TASKS
// ──────────────────────────────────────────────
function resetDailyTasksIfNeeded() {
  const today = todayStr();
  if (G.dailyTasks.date !== today) {
    G.dailyTasks = { date: today, loginClaimed: false, feeds: 0, feedsClaimed: false, dressed: false, dressClaimed: false };
    saveState();
  }
}

function buildTasksPanel() {
  const list = document.getElementById('tasks-list');
  if (!list) return;
  resetDailyTasksIfNeeded();
  const dt = G.dailyTasks;

  const tasks = [
    {
      key: 'login',
      name: '今日登录签到',
      progress: dt.loginClaimed ? '已完成' : '完成登录即可领取',
      done: dt.loginClaimed,
      canClaim: !dt.loginClaimed,
      reward: '+20🪙',
    },
    {
      key: 'feeds',
      name: '今日投喂3次',
      progress: `${Math.min(dt.feeds, 3)}/3`,
      done: dt.feedsClaimed,
      canClaim: dt.feeds >= 3 && !dt.feedsClaimed,
      reward: '+30🪙',
    },
    {
      key: 'dress',
      name: '今日换装1次',
      progress: dt.dressed ? '已完成' : '0/1',
      done: dt.dressClaimed,
      canClaim: dt.dressed && !dt.dressClaimed,
      reward: '+10🪙',
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

}

function claimTask(key) {
  resetDailyTasksIfNeeded();
  const dt = G.dailyTasks;
  if (key === 'login' && !dt.loginClaimed) {
    dt.loginClaimed = true;
    G.coins += 20;
    toast('登录签到奖励 +20🪙');
  } else if (key === 'feeds' && dt.feeds >= 3 && !dt.feedsClaimed) {
    dt.feedsClaimed = true;
    G.coins += 30;
    toast('投喂任务完成 +30🪙');
  } else if (key === 'dress' && dt.dressed && !dt.dressClaimed) {
    dt.dressClaimed = true;
    G.coins += 10;
    toast('换装任务完成 +10🪙');
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
//   SPEECH BUBBLE
// ──────────────────────────────────────────────
function showSpeech(text) {
  const bubble = document.getElementById('speech-bubble');
  const span   = document.getElementById('speech-text');
  span.textContent = text;
  bubble.classList.remove('hidden');
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => bubble.classList.add('hidden'), 3200);
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
  // Animate whichever element is currently visible (img or emoji fallback)
  const img = document.getElementById('char-sprite');
  const fb  = document.getElementById('char-fallback');
  const s   = (img && !img.classList.contains('hidden')) ? img : fb;
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
  if (G.mood >= 80) return 'happy';
  if (G.mood >= 50) return 'normal';
  if (G.mood >= 20) return 'cold';
  return 'sad';
}
function tagLabel(type) {
  return { liked:'喜欢', disliked:'不喜欢', special:'特殊' }[type] || '';
}
