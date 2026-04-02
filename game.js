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
  bond:     0,
  coins:    200,
  outfit:   'default',
  lastTick: Date.now(),
  outingCooldown: 0,
  memories:  [],
  diary:     [],
  unlockedOutfits: ['default'],
  totalFeeds: 0,
  loginStreak: 0,
  lastLogin: '',
  musicOn: true,
};

// ─── Global state ──────────────────────────────
let G = loadState();
let speechTimer  = null;
let toastTimer   = null;
let _lastBgSlot  = null; // tracks current background time slot

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
const OUTFITS = [
  { id:'default',  name:'日常便服',   sprite:'char_normal.png',   unlockBond:0,  desc:'清爽自然' },
  { id:'casual',   name:'私服',       sprite:'char_casual.png',   unlockBond:20, desc:'羁绊20解锁' },
  { id:'birthday', name:'生日限定',   sprite:'char_birthday.png', unlockBond:50, desc:'羁绊50解锁' },
  { id:'concert',  name:'演唱会造型', sprite:'char_concert.png',  unlockBond:80, desc:'羁绊80解锁' },
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

// ─── Data: Outing events ──────────────────────
const OUTING_EVENTS = {
  common: [
    { text:'在街角遇见了一只流浪猫，喂了它小鱼干，它蹭了蹭我就跑走了。', emoji:'🐱' },
    { text:'买了杯奶茶，喝到一半发现是半糖，刚好。', emoji:'🧋' },
    { text:'路过书店翻了翻新书，没买，但很满足。', emoji:'📚' },
    { text:'坐公交时，旁边小朋友在画画，画得很好看，跟他比了一个大拇指。', emoji:'🚌' },
    { text:'在超市碰到了打折，买了一堆零食，背包沉甸甸的。', emoji:'🛒' },
  ],
  story: [
    { text:'在公园找到一张没人要的素描，画的是一棵老树。带回来了，一直在想那棵树是谁画的。', emoji:'🌳' },
    { text:'下雨了，躲进一家没去过的小店，老板泡了碗热茶，坐了很久，聊了很多，最后忘了问店名。', emoji:'🍵' },
    { text:'在旧货市场发现一盘旧磁带，不知道是谁的，带回来了。想找个播放机听一听。', emoji:'📼' },
    { text:'路过一所小学，下课铃声响起，孩子们冲出来的声音，把我也一起卷进了那个夏天。', emoji:'🏫' },
  ],
  rare: [
    { text:'意外遇见了好久不见的老朋友，聊了整个下午，拿到了一张合照。', emoji:'👫' },
    { text:'在街头驻足听了一位街头歌手表演，结束后他把手写歌词送给了我。', emoji:'🎸' },
    { text:'找到了传说中的老字号小吃，排了一小时队，值了，真的值了。', emoji:'🍜' },
  ],
};

// ══════════════════════════════════════════════
//   INIT
// ══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  applyOfflineDecay();
  handleDailyLogin();
  buildFoodGrid();
  buildOutfitGrid();
  buildMemoryList();
  buildDiary();
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

  addDiaryEntry(`签到第${G.loginStreak}天，获得${bonus}金币。`);
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
        addDiaryEntry(`达成羁绊${o.unlockBond}，解锁了「${o.name}」！`);
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

  // Daily task: feed reward
  if (G.totalFeeds % 3 === 0) { G.coins += 30; toast('投喂3次任务完成！+30金币'); }

  saveState();
  checkBondUnlocks();
  buildFoodGrid();
  renderAll();
  closePanel();

  if (food.type === 'liked') {
    animSprite('bounce');
    showSpeech(`${food.emoji || '😋'} 好吃！最喜欢了～`);
    addDiaryEntry(`吃到了最爱的${food.name}，心情超好！`);
  } else if (food.type === 'disliked') {
    animSprite('shake');
    showSpeech(`${food.emoji || '😣'} 呜…不喜欢这个…`);
  } else {
    animSprite('spin');
    showSpeech(`${food.emoji || '🍞'} 谢谢投喂～`);
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
  G.coins  += 10; // daily task reward
  saveState();
  renderAll();
  buildOutfitGrid();
  closePanel();
  toast(`换装完成！+10金币 ✨`);
  showSpeech('打扮一下吧～好看嗎？');
}

// ──────────────────────────────────────────────
//   OUTING (挖宝)
// ──────────────────────────────────────────────
function triggerOuting() {
  if (G.energy < 50) { toast('体力不足（需要 ≥ 50）⚡'); return; }
  if (G.mood   < 40) { toast('心情太低落了（需要 ≥ 40）😢'); return; }
  const now = Date.now();
  if (now < G.outingCooldown) {
    const mins = Math.ceil((G.outingCooldown - now) / 60_000);
    toast(`冷却中，还需 ${mins} 分钟`);
    return;
  }

  G.energy          -= 30;
  // 6 minutes real = 6 game-hours cooldown
  G.outingCooldown   = now + 6 * 60_000;

  const roll = Math.random();
  let event, title, tier;

  if (roll < 0.60) {
    event = randomFrom(OUTING_EVENTS.common);
    title = '外出归来';
    tier  = 'common';
  } else if (roll < 0.90) {
    event = randomFrom(OUTING_EVENTS.story);
    title = '📖 小故事';
    tier  = 'story';
    G.memories.unshift({ date: todayStr(), text: event.text });
    buildMemoryList();
    addDiaryEntry(`外出回来，带回了一段故事。`);
  } else {
    event = randomFrom(OUTING_EVENTS.rare);
    title = '✨ 稀有事件！';
    tier  = 'rare';
    G.bond = clamp(G.bond + 5, 0, 100);
    addDiaryEntry(`今天的外出遇到了特别的事！`);
  }

  const baseCoins = rand(20, 50);
  const bonusCoins = tier === 'rare' ? rand(30, 60) : 0;
  G.coins += baseCoins + bonusCoins;

  // Rare drop: special food
  let rewardText = `🪙 获得 ${baseCoins + bonusCoins} 金币`;
  if (tier === 'rare') {
    rewardText += '\n🎀 羁绊 +5';
    checkBondUnlocks();
  }
  if (Math.random() < 0.10) {
    rewardText += '\n🎂 获得特殊食物！';
    addDiaryEntry('外出带回了稀有食物！');
  }

  saveState();
  renderAll();
  showPopup(event.emoji, title, event.text, rewardText);
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

function toggleMusic() {
  G.musicOn = !G.musicOn;
  document.getElementById('btn-music').textContent = G.musicOn ? '🎵' : '🔇';
  toast(G.musicOn ? '音乐已开启' : '音乐已静音');
  saveState();
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

  // Character sprite — with graceful fallback
  const sprite   = document.getElementById('char-sprite');
  const fallback = document.getElementById('char-fallback');
  const outfitData = OUTFITS.find(o => o.id === G.outfit);
  const spriteSrc = (G.outfit !== 'default' && outfitData)
    ? `assets/characters/${outfitData.sprite}`
    : `assets/characters/char_${expr}.png`;

  const testImg = new Image();
  testImg.onload = () => {
    sprite.src = spriteSrc;
    sprite.classList.remove('hidden');
    fallback?.classList.add('hidden');
  };
  testImg.onerror = () => {
    // Try char_normal.png as universal fallback
    const norm = new Image();
    norm.onload  = () => { sprite.src = 'assets/characters/char_normal.png'; sprite.classList.remove('hidden'); fallback?.classList.add('hidden'); };
    norm.onerror = () => { sprite.classList.add('hidden'); fallback?.classList.remove('hidden'); };
    norm.src = 'assets/characters/char_normal.png';
  };
  testImg.src = spriteSrc;

  // Avatar (small top-bar image)
  const avatarImg = document.getElementById('avatar-img');
  if (avatarImg) avatarImg.src = 'assets/characters/char_normal.png';

  // Context label
  document.getElementById('context-label').textContent =
    G.outfit !== 'default' ? '打扮一下吧～' : randomFrom(CONTEXT_LABELS[expr]) || '';

  // Mood tagline
  document.getElementById('mood-tagline').textContent =
    randomFrom(MOOD_TAGLINES[expr]) || '';

  // Outing cooldown status
  const outStatus = document.getElementById('outing-status');
  if (outStatus) {
    const now = Date.now();
    if (now < G.outingCooldown) {
      const mins = Math.ceil((G.outingCooldown - now) / 60_000);
      outStatus.textContent = `🕒 外出冷却中（${mins}分钟后可用）`;
    } else {
      outStatus.textContent = G.energy >= 50 && G.mood >= 40
        ? '✅ 可以外出！'
        : `❌ 外出条件：体力≥50（${Math.round(G.energy)}），心情≥40（${Math.round(G.mood)}）`;
    }
  }
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
    div.innerHTML = `
      <img class="outfit-img" src="assets/characters/${outfit.sprite}" alt="${outfit.name}"
           onerror="this.replaceWith(Object.assign(document.createElement('div'), {
             className:'outfit-img', style:'font-size:60px;line-height:130px;text-align:center',
             textContent:'👤'
           }))" />
      <span class="outfit-name">${active ? '✓ ' : ''}${outfit.name}</span>
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

function buildDiary() {
  const el = document.getElementById('diary-content');
  el.innerHTML = '';
  if (G.diary.length === 0) {
    el.innerHTML = '<div class="empty-msg">📔 还没有日记，多和小企鹅互动吧～</div>';
    return;
  }
  G.diary.slice(0, 30).forEach(d => {
    const div = document.createElement('div');
    div.className = 'diary-entry';
    div.innerHTML = `<div class="mem-date">${d.date}</div><div class="mem-text">${d.text}</div>`;
    el.appendChild(div);
  });
}

function addDiaryEntry(text) {
  G.diary.unshift({ date: todayStr(), text });
  if (G.diary.length > 100) G.diary.pop();
  buildDiary();
}

// ──────────────────────────────────────────────
//   PANELS & POPUPS
// ──────────────────────────────────────────────
let currentPanel = null;

function openPanel(name) {
  closePanel();
  const el = document.getElementById(`panel-${name}`);
  if (!el) return;
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
