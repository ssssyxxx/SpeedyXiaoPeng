# Work System & Full Rebalance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Work (打工) feature and rebalance the full game economy — food, outing, bond leveling, mood/hunger/energy decay, online mood regen, daily tasks, and outfits.

**Architecture:** All game logic lives in `game.js` (single-file JS game). State is persisted to `localStorage`. UI is plain HTML/CSS with JS DOM manipulation. No build step, no test framework — verification is manual browser console checks. STATE_KEY bumped to `speedypeng_v3` to force a clean-slate migration (bond system changed fundamentally).

**Tech Stack:** Vanilla JS, HTML5, CSS3, localStorage

---

## File Map

| File | Changes |
|---|---|
| `game.js` | Major rewrite of constants, state, tick, outing, bond, food, work, tasks, render |
| `outfits.js` | Bond outfit fields: `unlockBond` → `unlockLevel`; add 5 bond outfit stubs |
| `index.html` | Add work button to nav, work overlay HTML, bond level display, work progress display |
| `style.css` | Style work button, work overlay, bond level pill, work progress bar |
| `docs/game-design.md` | New file: full numerical design reference |

---

## Task 1: State Schema & Constants

**Files:**
- Modify: `game.js:1-75`

- [ ] **Step 1: Replace STATE_KEY and defaultState**

Replace the top section of `game.js` (lines 6–32) with:

```js
const STATE_KEY = 'speedypeng_v3';
const TICK_MS   = 60_000;          // 1 real minute = 1 game-hour (change to 3_600_000 for prod)
const MAX_OFFLINE_TICKS = 48;

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
  // outing daily tracking (reset each calendar day)
  goOutCountToday: 0,
  goOutCountDate:  '',
  // rare event pity counter
  rareFailCount: 0,
  // rare event collection (IDs of collected rare events)
  rareCollectedIds: [],
  // work daily tracking
  workCountToday: 0,
  workCoinsToday: 0,
  workDate: '',
  // online mood regen daily tracking
  onlineMoodGainedToday: 0,
  onlineMoodDate: '',
  // daily tasks (reset each calendar day)
  dailyTasks: {
    date: '',
    loginClaimed:  false,
    feeds:         0,
    feedsClaimed:  false,
    goOutDone:     false,
    goOutClaimed:  false,
  },
};
```

- [ ] **Step 2: Add GAME_CONFIG constant block** (insert after defaultState, before EXPRESSION_SPRITES)

```js
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
```

- [ ] **Step 3: Verify in browser console**

Open `index.html`, open DevTools console, run:
```js
console.log(GAME_CONFIG.goOutEnergyCosts);  // [0, 30, 40, 55, 70]
console.log(G.bondLevel);                    // 1
console.log(G.bondExp);                      // 0
```
Expected: no errors, values match.

- [ ] **Step 4: Commit**
```bash
git add game.js
git commit -m "refactor: bump state to v3, add GAME_CONFIG constants"
```

---

## Task 2: Tick System (Decay & Regen)

**Files:**
- Modify: `game.js` — `tickHour()` function

- [ ] **Step 1: Replace `tickHour` with new formulas**

Find the existing `tickHour` function and replace it entirely:

```js
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
```

- [ ] **Step 2: Verify in browser console**

Set state to edge values and run ticks manually:
```js
// Test 1: hunger >= 30, mood should NOT decay
G.hunger = 50; G.mood = 80; tickHour(true);
console.log(G.hunger, G.mood, G.energy);
// Expected: hunger=44, mood=80 (unchanged), energy increased by 5

// Test 2: hunger < 30, mood should decay
G.hunger = 20; G.mood = 60; G.energy = 50; tickHour(true);
console.log(G.hunger, G.mood, G.energy);
// Expected: hunger=14, mood=56, energy=52 (regen=2 because hunger<30 → 5*0.5=2.5→2)
```

- [ ] **Step 3: Commit**
```bash
git add game.js
git commit -m "feat: new tick decay/regen — hunger-6/h, mood-4/h only when hungry, energy+5/h"
```

---

## Task 3: Bond Level System

**Files:**
- Modify: `game.js` — replace all `G.bond` logic with `bondLevel`/`bondExp`

- [ ] **Step 1: Add bond helper functions** (insert before `checkBondUnlocks`)

```js
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
}
```

- [ ] **Step 2: Update `checkBondUnlocks` to use `bondLevel`**

Replace the existing `checkBondUnlocks` function:

```js
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
```

- [ ] **Step 3: Verify in browser console**

```js
// Test level up chain
G.bondLevel = 1; G.bondExp = 0;
addBondExp(25);
console.log(G.bondLevel, G.bondExp);
// Lv1 needs 20 exp → level up to Lv2, remaining exp = 5
// Expected: bondLevel=2, bondExp=5

// Test exp formula
console.log(bondExpNeeded(1));   // 20
console.log(bondExpNeeded(10));  // 65
console.log(bondExpNeeded(11));  // 70
console.log(bondExpNeeded(25));  // 210
console.log(bondExpNeeded(26));  // 230
```

- [ ] **Step 4: Commit**
```bash
git add game.js
git commit -m "feat: bond level system — exp-based Lv1-40 with level-up coin reward"
```

---

## Task 4: Food System Refactor

**Files:**
- Modify: `game.js` — replace `FOODS` constant and update `feedFood()`, `buildFoodGrid()`

- [ ] **Step 1: Replace FOODS constant**

Find the existing `FOODS` array and replace it entirely (keep the special foods at the end for dev extensibility):

```js
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
```

- [ ] **Step 2: Update `feedFood()` to remove `bond` field references and fix daily task**

Replace the `feedFood` function:

```js
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
    setCharExpression('happy');
    showSpeech(`${food.emoji} 好吃！最喜欢了～`);
    startChewing('happy');
  } else if (food.type === 'disliked') {
    setCharExpression('disgusted');
    showSpeech(`${food.emoji} 呜…不喜欢这个…`);
    startChewing(null);
  } else {
    setCharExpression(moodExpr());
    showSpeech(`${food.emoji} 谢谢投喂～`);
    startChewing(null);
  }
}
```

- [ ] **Step 3: Update `buildFoodGrid()` to show stat bonuses**

Replace `buildFoodGrid`:

```js
function buildFoodGrid() {
  const grid = document.getElementById('food-grid');
  grid.innerHTML = '';

  // Group label order
  const groups = [
    { type: 'normal',   label: '普通食物' },
    { type: 'favorite', label: '最爱食物' },
    { type: 'disliked', label: '不喜欢的食物' },
    { type: 'special',  label: '特殊食物' },
  ];

  groups.forEach(({ type, label }) => {
    const items = FOODS.filter(f => f.type === type);
    if (items.length === 0) return;

    const header = document.createElement('div');
    header.className = 'food-group-header';
    header.textContent = label;
    grid.appendChild(header);

    items.forEach(food => {
      const div = document.createElement('div');
      div.className = `food-item ${food.type}${food.special ? ' locked' : ''}`;

      const moodSign = food.mood >= 0 ? `+${food.mood}` : `${food.mood}`;
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
```

- [ ] **Step 4: Verify in browser**

Open feed panel. Check:
- 3 sections visible (普通/最爱/不喜欢)
- Each item shows hunger and mood bonus in small text
- Buying 便当 (20 coins): hunger +30, mood +1
- Buying 白面包 (12 coins): hunger +25, mood -6 (mood should drop)

- [ ] **Step 5: Commit**
```bash
git add game.js
git commit -m "feat: new 3-category food system with stat bonuses display"
```

---

## Task 5: Outfit System — Bond Level Unlock

**Files:**
- Modify: `outfits.js` — change `unlockBond` → `unlockLevel`, add 5 bond outfit stubs
- Modify: `game.js` — `isOutfitOwned()`, `buildOutfitGrid()` bond locked card

- [ ] **Step 1: Update `outfits.js` bond outfit field and add 5 stubs**

In `outfits.js`, update the comment block to document `unlockLevel`, and add 5 bond outfit stubs below the coin outfits:

```js
//   'bond'     Type 3 — 羁绊等级解锁；未解锁时显示黑色剪影+等级要求
// 字段说明（新增）：
//   unlockLevel number  [仅 bond 类型] 解锁所需羁绊等级（替代旧版 unlockBond）

// ─── Type 3: 羁绊等级解锁 ──────────────────────
{
  id:          'bond_outfit_1',
  type:        'bond',
  name:        '羁绊服装一',
  thumbEmoji:  '🌸',
  thumb:       null,
  overlay:     null,
  unlockLevel: 5,
  effect:      'GO_OUT_COIN_BONUS',      // +10% go-out coins
},
{
  id:          'bond_outfit_2',
  type:        'bond',
  name:        '羁绊服装二',
  thumbEmoji:  '🌙',
  thumb:       null,
  overlay:     null,
  unlockLevel: 10,
  effect:      'RARE_EVENT_CHANCE_BONUS', // +2% rare chance
},
{
  id:          'bond_outfit_3',
  type:        'bond',
  name:        '羁绊服装三',
  thumbEmoji:  '⭐',
  thumb:       null,
  overlay:     null,
  unlockLevel: 18,
  effect:      'GO_OUT_ENERGY_COST_REDUCTION', // -5 energy cost (min 25)
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
```

Also update coin outfit prices to match the new design (common→250, good→400):
```js
// overalls: price 150 → 250
// trendy:   price 200 → 400
```

- [ ] **Step 2: Update `isOutfitOwned()` in game.js for bond type**

The function currently checks `G.bond >= o.unlockBond`. Replace the bond check:

```js
function isOutfitOwned(outfitId) {
  const o = OUTFITS_CONFIG.find(x => x.id === outfitId);
  if (!o) return false;
  if (o.type === 'default') return true;
  if (o.type === 'coin')    return (G.purchasedOutfits || []).includes(outfitId);
  if (o.type === 'bond')    return G.unlockedOutfits.includes(outfitId);
  if (o.type === 'special') return isSpecialOutfitAvailable(o);
  return false;
}
```

- [ ] **Step 3: Update bond-locked card in `buildOutfitGrid()` to show level requirement**

Find the bond-locked card section in `buildOutfitGrid` and update the unlock label:

```js
// Change from: <span class="outfit-unlock">❤ ${outfit.unlockBond} 解锁</span>
// Change to:
div.innerHTML = `
  <div class="outfit-thumb-wrap silhouette">
    <span class="outfit-emoji">${outfit.thumbEmoji}</span>
    ${outfit.thumb ? `<img class="outfit-thumb-img" src="${outfit.thumb}" alt="">` : ''}
  </div>
  <span class="outfit-name">???</span>
  <span class="outfit-unlock">🎀 Lv.${outfit.unlockLevel} 解锁</span>
`;
div.addEventListener('click', () => toast(`🎀 羁绊 Lv.${outfit.unlockLevel} 解锁`));
```

- [ ] **Step 4: Apply bond outfit effects in `goOutEnergyCost` and rare chance helpers**

Add a helper at the top of game.js (after GAME_CONFIG):

```js
function getEquippedBondOutfitEffect() {
  const o = OUTFITS_CONFIG.find(x => x.id === G.outfit && x.type === 'bond');
  return o ? o.effect : null;
}
```

- [ ] **Step 5: Verify in browser**

Open outfit panel. Bond outfits should show silhouette + "🎀 Lv.5 解锁" etc.
In console: `addBondExp(9999)` → G.bondLevel should jump, bond_outfit_1 should unlock.

- [ ] **Step 6: Commit**
```bash
git add outfits.js game.js
git commit -m "feat: bond outfits unlock by level, add 5 bond outfit stubs"
```

---

## Task 6: Go-Out System Refactor

**Files:**
- Modify: `game.js` — `handleOutingClick`, `startOuting`, `calcOutingReward`, `closeReturnModal`, `pickOutingEvent`, daily outing reset

- [ ] **Step 1: Add daily reset helper for outing counter**

Inside `resetDailyTasksIfNeeded()`, add outing counter reset:

```js
function resetDailyTasksIfNeeded() {
  const today = todayStr();
  if (G.dailyTasks.date !== today) {
    G.dailyTasks = {
      date: today,
      loginClaimed: false,
      feeds: 0,
      feedsClaimed: false,
      goOutDone: false,
      goOutClaimed: false,
    };
    saveState();
  }
  // Reset daily outing counter
  if (G.goOutCountDate !== today) {
    G.goOutCountToday = 0;
    G.goOutCountDate  = today;
  }
  // Reset daily work counter
  if (G.workDate !== today) {
    G.workCountToday = 0;
    G.workCoinsToday = 0;
    G.workDate = today;
  }
  // Reset online mood daily gain
  if (G.onlineMoodDate !== today) {
    G.onlineMoodGainedToday = 0;
    G.onlineMoodDate = today;
  }
}
```

- [ ] **Step 2: Add go-out helper functions**

Insert before `handleOutingClick`:

```js
function goOutEnergyCost(countToday) {
  // countToday = AFTER incrementing (1 = first outing today)
  const costs = GAME_CONFIG.goOutEnergyCosts;
  const idx = Math.min(countToday, costs.length - 1);
  return costs[idx];
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

  // Bond outfit: RARE_EVENT_CHANCE_BONUS adds +2%
  if (getEquippedBondOutfitEffect() === 'RARE_EVENT_CHANCE_BONUS') bonus += 0.02;

  const chance = GAME_CONFIG.rareBaseChance + bonus
                 + G.rareFailCount * GAME_CONFIG.rarePityIncreasePerFail;
  return Math.min(chance, GAME_CONFIG.rareMaxChanceCap);
}
```

- [ ] **Step 3: Replace `handleOutingClick`**

```js
function handleOutingClick() {
  resetDailyTasksIfNeeded();

  if (G.hunger < GAME_CONFIG.goOutMinHunger) {
    showOutingBlocked('hunger');
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

  startOuting(cost, nextCount);
}
```

- [ ] **Step 4: Replace `startOuting`**

```js
function startOuting(energyCost, countForThisOuting) {
  G.energy = clamp(G.energy - energyCost, 0, 100);
  G.goOutCountToday = countForThisOuting;
  G.goOutCountDate  = todayStr();
  G.outingStartedAt = Date.now();
  // Store the count so finishOuting knows which reward tier to use
  G._pendingOutingCount = countForThisOuting;
  saveState();

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
```

- [ ] **Step 5: Replace `calcOutingReward` and `pickOutingEvent`**

```js
function pickOutingEvent() {
  const isRare = Math.random() < rareEventChance();

  if (isRare) {
    G.rareFailCount = 0;
    // Pick uncollected rare first; if all collected, allow repeats
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

  // Bond outfit: GO_OUT_COIN_BONUS adds +10%
  if (getEquippedBondOutfitEffect() === 'GO_OUT_COIN_BONUS') {
    coins = Math.floor(coins * 1.1);
  }

  const moodGain   = rand(...GAME_CONFIG.goOutBaseMoodRange);
  const bondExpGain = rand(...GAME_CONFIG.goOutBaseBondExpRange);

  return { coins, moodGain, bondExpGain };
}
```

- [ ] **Step 6: Update `finishOuting` to pass outing count**

```js
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
    showReturnModal(event, baseReward, isRare);
  }, 500);
}
```

- [ ] **Step 7: Update `showReturnModal` and `closeReturnModal` to apply full rewards**

Replace `showReturnModal`:

```js
function showReturnModal(event, baseReward, isRare) {
  _currentOutingEvent  = event;

  // Calculate full reward (base + event extra)
  let { coins, moodGain, bondExpGain } = baseReward;
  if (isRare) {
    coins      += rand(...GAME_CONFIG.rareExtraCoins);
    moodGain   += rand(...GAME_CONFIG.rareExtraMood);
    bondExpGain += rand(...GAME_CONFIG.rareExtraBondExp);
  } else {
    coins      += rand(...GAME_CONFIG.normalEventExtraCoins);
    moodGain   += rand(...GAME_CONFIG.normalEventExtraMood);
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
```

Replace `closeReturnModal`:

```js
function closeReturnModal() {
  const event  = _currentOutingEvent;
  const reward = _currentOutingReward;

  if (reward) {
    G.coins += reward.coins;
    G.mood   = clamp(G.mood + reward.moodGain, 0, 100);
    addBondExp(reward.bondExpGain);
    // Mark go-out daily task done
    G.dailyTasks.goOutDone = true;
  }

  const entry = { date: todayStr(), text: event.text, rarity: event.rarity };
  if (event.img) entry.img = event.img;
  G.diary.unshift(entry);
  if (G.diary.length > 100) G.diary.pop();

  G.outingStartedAt = null;
  G._pendingOutingCount = null;

  saveState();
  renderAll();
  renderDiaryPanel();

  document.getElementById('outing-return-modal').classList.add('hidden');
  _currentOutingEvent  = null;
  _currentOutingReward = null;
}
```

- [ ] **Step 8: Verify in browser console**

```js
// Test outing gates
G.hunger = 15; handleOutingClick(); // should show "hunger" blocked dialog
G.hunger = 50; G.mood = 20; handleOutingClick(); // should show "mood" blocked dialog
G.hunger = 50; G.mood = 50; G.energy = 10; handleOutingClick(); // should show "tired" blocked

// Test cost scaling
G.goOutCountToday = 0; G.goOutCountDate = '';
G.hunger = 50; G.mood = 50; G.energy = 100;
// After first outing: energy should drop by 30
```

- [ ] **Step 9: Commit**
```bash
git add game.js
git commit -m "feat: outing system rebalance — new gates, energy cost scaling, pity system, full reward formula"
```

---

## Task 7: Work System

**Files:**
- Modify: `index.html` — add work button to nav, add work overlay HTML
- Modify: `style.css` — style work button and overlay
- Modify: `game.js` — add work logic

- [ ] **Step 1: Add work button to `index.html` nav and work overlay**

In `index.html`, add the work button after the outing button inside `#nav-plank`:

```html
<button class="nav-btn" id="nav-work" onclick="handleWorkClick()">
  <div class="nav-icon-bg">
    <span class="nav-emoji" style="display:flex">💼</span>
  </div>
  <span class="nav-label">打工</span>
</button>
```

Add work overlay after the outing overlay (`#outing-overlay`):

```html
<!-- ── Work Overlay (shown while working) ── -->
<div id="work-overlay" class="hidden">
  <div id="work-countdown"></div>
  <div id="work-daily-progress"></div>
</div>
```

- [ ] **Step 2: Style work overlay and button in `style.css`**

Add after outing overlay styles:

```css
/* Work overlay — reuses outing overlay visual style */
#work-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(30, 20, 60, 0.82);
  z-index: 20;
  opacity: 0;
  transition: opacity 0.3s;
  border-radius: inherit;
  gap: 12px;
}
#work-overlay:not(.hidden) { opacity: 1; }
#work-countdown {
  color: #fff;
  font-size: 1.4rem;
  font-weight: bold;
  text-align: center;
}
#work-daily-progress {
  color: #aaa;
  font-size: 0.85rem;
}
```

- [ ] **Step 3: Add work logic to `game.js`**

Add after the outing section:

```js
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

  const overlay     = document.getElementById('work-overlay');
  const countdownEl = document.getElementById('work-countdown');
  const progressEl  = document.getElementById('work-daily-progress');
  let seconds = GAME_CONFIG.workDurationSeconds;

  countdownEl.textContent = `💼 打工中... ${seconds}s`;
  progressEl.textContent  = `今日打工收入：${G.workCoinsToday}/${GAME_CONFIG.workDailyCoinCap}🪙`;

  overlay.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => { overlay.style.opacity = '1'; }));

  workTimer = setInterval(() => {
    seconds--;
    countdownEl.textContent = `💼 打工中... ${seconds}s`;
    if (seconds <= 0) {
      clearInterval(workTimer);
      workTimer = null;
      finishWork();
    }
  }, 1000);
}

function finishWork() {
  const overlay = document.getElementById('work-overlay');
  overlay.style.opacity = '0';
  setTimeout(() => overlay.classList.add('hidden'), 300);

  G.workStartedAt = null;

  // Calculate reward (clamp to daily cap)
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
```

- [ ] **Step 4: Verify in browser**

- Click 打工 → 45s countdown overlay appears
- After countdown: coins increase by 10-15, bond exp increases
- Click 打工 again 12 times: 13th click shows "已经打够工啦"
- Console: `G.workCoinsToday` should stay ≤ 150

- [ ] **Step 5: Commit**
```bash
git add game.js index.html style.css
git commit -m "feat: work system — 45s timer, 10-15 coins, daily cap 150/12 times"
```

---

## Task 8: Online Mood Regen

**Files:**
- Modify: `game.js` — add per-minute mood regen interval in `window.addEventListener('DOMContentLoaded')`

- [ ] **Step 1: Add online mood regen interval**

In the `DOMContentLoaded` listener, after the existing `setInterval` for ticks, add:

```js
// Online mood regen: +0.2 mood per real minute (regardless of TICK_MS setting)
setInterval(() => {
  resetDailyTasksIfNeeded();
  const today = todayStr();
  if (G.onlineMoodDate !== today) {
    G.onlineMoodGainedToday = 0;
    G.onlineMoodDate = today;
  }

  // Determine daily cap (base + coin outfit bonus if equipped)
  const equippedOutfit = OUTFITS_CONFIG.find(o => o.id === G.outfit && o.type === 'coin');
  const capBonus = equippedOutfit ? GAME_CONFIG.coinOutfitMoodCapBonus : 0;
  const dailyCap = GAME_CONFIG.onlineMoodDailyCap + capBonus;

  if (G.onlineMoodGainedToday < dailyCap) {
    const gain = Math.min(GAME_CONFIG.onlineMoodGainPerMin, dailyCap - G.onlineMoodGainedToday);
    G.mood = clamp(G.mood + gain, 0, 100);
    G.onlineMoodGainedToday += gain;
    saveState();
  }
}, 60_000); // always 1 real minute
```

- [ ] **Step 2: Verify in browser console**

```js
// Simulate 5 minutes online
G.onlineMoodGainedToday = 0; G.mood = 70;
// After 5 intervals (5 minutes): mood should be ~71
// Check cap: set onlineMoodGainedToday = 14.8, after one more tick it should cap at 15 total
```

- [ ] **Step 3: Commit**
```bash
git add game.js
git commit -m "feat: online mood regen +0.2/min, daily cap 15 (coin outfit +5)"
```

---

## Task 9: Daily Tasks Update

**Files:**
- Modify: `game.js` — `buildTasksPanel()`, `claimTask()`, `handleDailyLogin()`

- [ ] **Step 1: Update `handleDailyLogin()`** — remove old bond manipulation, remove streak bonus

```js
function handleDailyLogin() {
  const today = todayStr();
  if (G.lastLogin === today) return;
  G.lastLogin = today;

  // Mark login task as claimable
  G.dailyTasks.loginClaimed = false;
  saveState();
  setTimeout(() => toast('今日登录成功，领取每日任务奖励吧！'), 800);
}
```

- [ ] **Step 2: Replace `buildTasksPanel()`**

```js
function buildTasksPanel() {
  const list = document.getElementById('tasks-list');
  if (!list) return;
  resetDailyTasksIfNeeded();
  const dt = G.dailyTasks;

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
      name: '今日投喂 1 次',
      progress: `${Math.min(dt.feeds, 1)}/1`,
      done: dt.feedsClaimed,
      canClaim: dt.feeds >= 1 && !dt.feedsClaimed,
      reward: `+${cfg.missionFeedCoins}🪙 +${cfg.missionFeedBondExp}羁绊经验`,
    },
    {
      key: 'goOut',
      name: '今日外出 1 次',
      progress: dt.goOutDone ? '已完成' : '0/1',
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
  resetDailyTasksIfNeeded();
  const workFooter = document.createElement('div');
  workFooter.className = 'task-work-progress';
  workFooter.textContent = `💼 今日打工收入：${G.workCoinsToday}/${GAME_CONFIG.workDailyCoinCap}🪙  (${G.workCountToday}/${GAME_CONFIG.workDailyMaxTimes}次)`;
  list.appendChild(workFooter);
}
```

- [ ] **Step 3: Replace `claimTask()`**

```js
function claimTask(key) {
  resetDailyTasksIfNeeded();
  const dt  = G.dailyTasks;
  const cfg = GAME_CONFIG;

  if (key === 'login' && !dt.loginClaimed) {
    dt.loginClaimed = true;
    G.coins += cfg.missionLoginCoins;
    addBondExp(cfg.missionLoginBondExp);
    toast(`登录签到 +${cfg.missionLoginCoins}🪙 +${cfg.missionLoginBondExp}羁绊经验`);

  } else if (key === 'feeds' && dt.feeds >= 1 && !dt.feedsClaimed) {
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
```

- [ ] **Step 4: Verify in browser**

Open 每日任务 panel:
- 3 tasks visible: 登录签到, 投喂1次, 外出1次
- Work progress shown at bottom
- Claim login → +10 coins, bond exp increases

- [ ] **Step 5: Commit**
```bash
git add game.js
git commit -m "feat: daily tasks — login/feed/go-out each give coins+bond-exp, remove dress task"
```

---

## Task 10: Render & UI Updates

**Files:**
- Modify: `game.js` — `renderAll()`, add bond level display
- Modify: `index.html` — bond level pill, work progress
- Modify: `style.css` — bond level display styles, food group headers, rare badge

- [ ] **Step 1: Update bond display in `index.html` top bar**

Replace the `#bond-pill` element:

```html
<div id="bond-pill">
  <img src="assets/ui/icon_bond.png" class="pill-img" alt=""
       onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">
  <span class="pill-emoji" style="display:none">🎀</span>
  <span id="bond-val">Lv.1</span>
</div>
```

Replace the bond stat row in `#panel-stats`:

```html
<div class="stat-row">
  <span class="stat-label">🎀 羁绊</span>
  <div class="stat-bar-wrap">
    <div class="stat-bar" id="bar-bond" style="background:linear-gradient(90deg,#bb6bd9,#9b51e0)"></div>
  </div>
  <span class="stat-val" id="val-bond2">Lv.1</span>
</div>
<div class="bond-exp-info" id="bond-exp-info"></div>
```

- [ ] **Step 2: Update `renderAll()` in `game.js`**

Update the bond-related lines in `renderAll()`:

```js
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
  document.getElementById('val-bond2').textContent  = bondLevelStr;
  document.getElementById('bond-val').textContent   = bondLevelStr;

  const bondExpInfoEl = document.getElementById('bond-exp-info');
  if (bondExpInfoEl) {
    if (G.bondLevel < GAME_CONFIG.bondLevelMax) {
      bondExpInfoEl.textContent = `经验 ${G.bondExp} / ${bondExpMax}`;
    } else {
      bondExpInfoEl.textContent = '羁绊满级！';
    }
  }

  document.getElementById('val-mood').textContent   = Math.round(G.mood);
  document.getElementById('val-hunger').textContent = Math.round(G.hunger);
  document.getElementById('val-energy').textContent = Math.round(G.energy);
  document.getElementById('coin-val').textContent   = G.coins;
  document.getElementById('coin-val2').textContent  = G.coins;
  document.getElementById('mini-hunger-val').textContent = Math.round(G.hunger) + '%';
  document.getElementById('mini-energy-val').textContent = Math.round(G.energy) + '%';
  document.getElementById('mini-mood-val').textContent   = Math.round(G.mood)   + '%';

  if (!_chewTimer) setCharExpression(expr);
  applyOutfitOverlay(G.outfit);

  document.getElementById('context-label').textContent =
    G.outfit !== 'default' ? '打扮一下吧～' : randomFrom(CONTEXT_LABELS[expr]) || '';
  document.getElementById('mood-tagline').textContent =
    randomFrom(MOOD_TAGLINES[expr]) || '';
}
```

- [ ] **Step 3: Add CSS for new UI elements**

```css
/* Food group headers */
.food-group-header {
  width: 100%;
  font-size: 0.78rem;
  font-weight: bold;
  color: #888;
  padding: 8px 4px 4px;
  border-bottom: 1px solid #f0f0f0;
  margin-top: 6px;
}
.food-bonus {
  font-size: 0.7rem;
  display: block;
  line-height: 1.2;
}

/* Bond EXP info line */
.bond-exp-info {
  text-align: right;
  font-size: 0.72rem;
  color: #aaa;
  margin-top: -4px;
  margin-bottom: 6px;
  padding-right: 4px;
}

/* Rare event badge */
.rare-badge {
  background: linear-gradient(90deg, #f7971e, #ffd200);
  color: #333;
  font-size: 0.72rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 8px;
}

/* Task work progress footer */
.task-work-progress {
  margin-top: 12px;
  font-size: 0.78rem;
  color: #888;
  text-align: center;
  padding: 6px;
  border-top: 1px solid #f0f0f0;
}
```

- [ ] **Step 4: Verify full render**

Reload game, check:
- Top bar shows "🎀 Lv.1"
- Stats panel shows bond level + exp bar + "经验 0 / 20"
- Feed panel shows food group headers with stat bonuses
- After going out: return modal shows "🪙+XX 🩷+XX 🎀经验+XX"
- Rare events show gold "✨ 稀有" badge

- [ ] **Step 5: Commit**
```bash
git add game.js index.html style.css
git commit -m "feat: UI updates — bond level display, food bonuses, rare badge, work progress"
```

---

## Task 11: Design Document

**Files:**
- Create: `docs/game-design.md`

- [ ] **Step 1: Create design document**

Create `docs/game-design.md` with the complete numerical spec (see content below). This should be a clean reference document, not a plan.

- [ ] **Step 2: Commit**
```bash
git add docs/game-design.md
git commit -m "docs: add game design numerical spec"
```

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Task |
|---|---|
| Work system (45s, 10-15 coins, 2 bond exp, daily cap 150/12) | Task 7 |
| Hunger decay -6/h | Task 2 |
| Mood decay -4/h only when hunger<30 | Task 2 |
| Energy regen +5/h, ×0.5 when hunger<30 | Task 2 |
| Online mood regen +0.2/min, cap 15/day | Task 8 |
| Coin outfit: mood cap +5 | Task 8 |
| Bond level system Lv1-40 with EXP formula | Task 3 |
| Level-up reward +20 coins | Task 3 |
| New food system (3 categories + special) | Task 4 |
| Food bonuses shown in UI | Task 4 |
| Go-out gates: hunger≥20, mood≥30 | Task 6 |
| Go-out energy cost 30/40/55/70 | Task 6 |
| Go-out coin formula with multipliers | Task 6 |
| Rare event pity system | Task 6 |
| Rare event collection (no duplicates, allow repeat after all collected) | Task 6 |
| Normal/rare event rewards with base+extra | Task 6 |
| Bond outfits unlock by level (5/10/18/26/35) | Task 5 |
| Bond outfit effects (coin bonus/rare chance/energy reduction) | Task 5 + Task 6 |
| Daily tasks: login+feed+go-out (no dress task) | Task 9 |
| Bond level display in UI | Task 10 |
| Work daily progress in tasks panel | Task 9 |
| STATE_KEY bump to v3 (clean migration) | Task 1 |
| `goOutCountToday` reset daily | Task 6 |
| Special foods kept extensible | Task 4 |
| Rare events repeat after all 20 collected | Task 6 |

All requirements covered. ✓

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-17-work-system-and-rebalance.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks

**2. Inline Execution** — Execute all tasks in this session with checkpoints

**Which approach?**
