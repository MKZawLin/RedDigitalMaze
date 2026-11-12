/* Red's Digital Maze — a scam-awareness pixel-art maze game. Plain JS, no build step. */
(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const START_MONEY = 2000; // change this one number to change the starting money everywhere
// Questions whose "Scam Value" is N/A (personal info, safety, bullying) still cost something:
const INFO_LOSS_FULL = 300;   // Answer 4 (totally scammed)
const INFO_LOSS_PART = 100;   // Answer 3 (scammed a bit)

const ROOMS = [
  { name: 'Hospital', wolf: 'Doctor Wolf', scam: 'Urgency Scam', img: 'wolf1',
    roof: '#26c6da', dark: '#00838f', accent: '#e53935', floor: '#d9f5f7',
    tip: 'Scammers create panic so you act fast. Stop, never pay, and check with a trusted adult using a phone number you already know.' },
  { name: 'Prize Centre', wolf: 'Prize Wolf', scam: 'Prize Scam', img: 'wolf2',
    roof: '#8e24aa', dark: '#4a148c', accent: '#ffd600', floor: '#f1e2f5',
    tip: "If you never entered, you didn't win. Real prizes never ask you to pay a fee or share personal details first." },
  { name: 'Playground', wolf: 'Schoolboy Wolf', scam: 'Online Friend Scam', img: 'wolf3',
    roof: '#fb8c00', dark: '#bf5000', accent: '#fff176', floor: '#fff0dc',
    tip: "Online friends may not be who they say they are. Never send them money, gift cards, passwords or personal info." },
  { name: 'Arcade', wolf: 'Cool Wolf', scam: 'Predatory Danger', img: 'wolf4',
    roof: '#ec407a', dark: '#ad1457', accent: '#40c4ff', floor: '#fbe1ea',
    tip: 'Gifts with secrets, "come alone", private chats and photo requests are danger signs. Say no, block, and tell a trusted adult.' },
  { name: 'Cybercafe', wolf: 'Cyber Wolf', scam: 'Cyberbullying', img: 'wolf5',
    roof: '#3949ab', dark: '#0d1b4c', accent: '#00e5ff', floor: '#1c2566',
    tip: "Don't join in and don't fight back. Screenshot, block, report, and tell a trusted adult." },
  { name: 'Bank', wolf: 'Banker Wolf', scam: 'Phishing Scam', img: 'wolf6',
    roof: '#8d6e63', dark: '#4e342e', accent: '#ffca28', floor: '#eee6e2',
    tip: 'Banks never ask for your PIN, OTP or password, and never send clickable links by SMS. Never share them.' },
  { name: 'Police Station', wolf: 'Police Wolf', scam: 'Authority Scam', img: 'wolf7',
    roof: '#1e88e5', dark: '#0d47a1', accent: '#ffffff', floor: '#deeefc',
    tip: 'Real police and officials never ask for money over the phone. Hang up and call the 1799 Anti-Scam Helpline with an adult.' },
  { name: "Grandma's House", wolf: '"Grandma"', scam: 'Impersonation Scam', img: 'wolf8',
    roof: '#c62828', dark: '#7f0000', accent: '#ffe0b2', floor: '#fbe5df',
    tip: 'Voices, photos and accounts can be faked. Always check by calling the person on the number you already know.' },
];

// What each wolf says when Red walks in (shown before any question, with an "I'm ready" button)
const GREETS = [
  "Hold it right there! I'm a doctor, and I have some URGENT news for you…",
  "Congratulations, lucky winner! Step right up, I have an amazing prize for you…",
  "Hey! Wanna be best friends? I just need to ask you something first…",
  "Psst… you're pretty cool, you know that? Let's chat, just you and me…",
  "Welcome to the Cybercafe! Grab a seat, let's see how you handle what happens online…",
  "Good day! There seems to be a small problem with your account…",
  "Stop right there! This is the police. We need to talk…",
  "Oh my dear, it's me, your Grandma! Come closer, I need a little favour…",
];
const ARM_MS = 650; // newly shown buttons ignore taps for this long (prevents tap-through on mobile)
let armUntil = 0;
function arm(el) {
  armUntil = performance.now() + ARM_MS;
  el.classList.add('arming');
  clearTimeout(el._armT); el._armT = setTimeout(() => el.classList.remove('arming'), ARM_MS);
}
const armed = () => performance.now() >= armUntil;

const GOOD_LINES = ['Scam busted!', 'Great thinking, Red!', 'You saw right through the disguise!', 'Wolf foiled!'];
const IDK_LINES = [
  "It's okay not to know! When you're unsure, the safest move is to stop, don't reply, and ask a trusted adult.",
  "Not sure? That's fine. Never act in a hurry: pause and check with a parent, guardian or teacher.",
];

// ---------------------------------------------------------------- utils
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(arr, rnd = Math.random) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fmt = (n) => n.toLocaleString('en-SG');

// ---------------------------------------------------------------- maze
// Main route is drawn through these corners. Rooms are placed along it so that no stretch
// between Start → Room 1 → … → Room 8 → Grandma is longer than MAX_LEG steps.
const MAX_LEG = 15;
const MW = 23, MH = 17, WALL = 0, PATH = 1, T = 32;
const WAYPOINTS = [[1,1],[9,1],[9,3],[15,3],[15,1],[21,1],[21,5],[11,5],[11,7],[1,7],[1,11],[9,11],[9,9],[15,9],[15,13],[3,13],[3,15],[17,15],[17,11],[21,11],[21,15]];
const grid = Array.from({ length: MH }, () => new Array(MW).fill(WALL));
const key = (x, y) => y * MW + x;
const isWall = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH || grid[y][x] === WALL;

const mainPath = [WAYPOINTS[0].slice()];
for (let i = 0; i < WAYPOINTS.length - 1; i++) {
  const [x1, y1] = WAYPOINTS[i + 1]; let [x, y] = WAYPOINTS[i];
  const dx = Math.sign(x1 - x), dy = Math.sign(y1 - y);
  while (x !== x1 || y !== y1) { x += dx; y += dy; mainPath.push([x, y]); }
}
mainPath.forEach(([x, y]) => { grid[y][x] = PATH; });
const L = mainPath.length - 1;
const START = { x: mainPath[0][0], y: mainPath[0][1] };
const GOAL = { x: mainPath[L][0], y: mainPath[L][1] };
// Rooms sit on straight east-west stretches (so each building backs onto hedge), spaced as
// evenly as possible while keeping every leg ≤ MAX_LEG.
const rooms = [];
(function placeRooms() {
  const straight = (i) => i > 0 && i < L && mainPath[i - 1][1] === mainPath[i][1] && mainPath[i + 1][1] === mainPath[i][1];
  let prev = 0;
  for (let k = 1; k <= 8; k++) {
    const target = prev + (L - prev) / (10 - k); let best = -1;
    for (let i = prev + 1; i <= Math.min(prev + MAX_LEG, L - 1); i++) {
      if (!straight(i) || L - i > (9 - k) * MAX_LEG) continue;
      if (best < 0 || Math.abs(i - target) < Math.abs(best - target)) best = i;
    }
    if (best < 0) throw new Error('Maze route too long for MAX_LEG');
    rooms.push({ x: mainPath[best][0], y: mainPath[best][1], idx: k - 1, cleared: false, poof: 0 }); prev = best;
  }
})();
const roomAt = new Map(rooms.map((r) => [key(r.x, r.y), r]));

// A few short dead-end branches so it feels like a real hedge maze (they never create shortcuts).
(function growBranches() {
  const rnd = mulberry32(20261111);
  const protect = new Set([key(START.x, START.y), key(GOAL.x, GOAL.y), ...rooms.map((r) => key(r.x, r.y))]);
  // keep the hedge around each building untouched so the art never covers a path
  const nearStop = (x, y) => [...rooms, GOAL].some((r) => Math.abs(r.x - x) <= 1 && Math.abs(r.y - y) <= 1);
  const origins = mainPath.filter(([x, y]) => x % 2 && y % 2 && !protect.has(key(x, y)));
  for (let n = 0; n < 22; n++) {
    let [cx, cy] = origins[Math.floor(rnd() * origins.length)];
    const len = 1 + Math.floor(rnd() * 3);
    for (let s = 0; s < len; s++) {
      let moved = false;
      for (const [dx, dy] of shuffle([[1,0],[-1,0],[0,1],[0,-1]], rnd)) {
        const tx = cx + 2 * dx, ty = cy + 2 * dy;
        if (tx < 1 || ty < 1 || tx > MW - 2 || ty > MH - 2 || grid[ty][tx] !== WALL) continue;
        if (nearStop(cx + dx, cy + dy) || nearStop(tx, ty)) continue;
        grid[cy + dy][cx + dx] = PATH; grid[ty][tx] = PATH; cx = tx; cy = ty; moved = true; break;
      }
      if (!moved) break;
    }
  }
})();

// Breadth-first distance (uncleared rooms block the way, except as the destination).
function distance(fx, fy, tx, ty) {
  const dist = new Int16Array(MW * MH).fill(-1); const q = [[fx, fy]]; dist[key(fx, fy)] = 0;
  while (q.length) {
    const [x, y] = q.shift(); const d = dist[key(x, y)];
    if (x === tx && y === ty) return d;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy; if (isWall(nx, ny) || dist[key(nx, ny)] >= 0) continue;
      const r = roomAt.get(key(nx, ny)); if (r && !r.cleared && !(nx === tx && ny === ty)) continue;
      dist[key(nx, ny)] = d + 1; q.push([nx, ny]);
    }
  }
  return -1;
}
(function verify() {
  const stops = [START, ...rooms, GOAL]; const legs = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const saved = rooms.map((r) => r.cleared); rooms.forEach((r, j) => { r.cleared = j < i; });
    legs.push(distance(stops[i].x, stops[i].y, stops[i + 1].x, stops[i + 1].y));
    rooms.forEach((r, j) => { r.cleared = saved[j]; });
  }
  console.log(`[maze] steps per leg (must be ≤ ${MAX_LEG}):`, legs.join(', '));
})();

// ---------------------------------------------------------------- assets
const IMG = {};
const IMG_LIST = ['red', 'grandma', 'woodcutter', ...ROOMS.map((r) => r.img)];
function loadImages() {
  // room backgrounds are only warmed into the cache; the game never waits on them
  ROOMS.forEach((_, i) => { const im = new Image(); im.src = `assets/room${i + 1}.jpg`; });
  const sprites = Promise.all(IMG_LIST.map((n) => new Promise((res) => {
    const im = new Image(); im.onload = () => res(); im.onerror = () => res(); im.src = `assets/${n}.png`; IMG[n] = im;
  })));
  return Promise.race([sprites, new Promise((res) => setTimeout(res, 4000))]);
}

// ---------------------------------------------------------------- pre-rendered maze art
const mapCanvas = document.createElement('canvas');
mapCanvas.width = MW * T; mapCanvas.height = MH * T;
(function paintMap() {
  const g = mapCanvas.getContext('2d');
  const px = (c, x, y, w = 2, h = 2) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const rnd = mulberry32(key(x, y) * 7919 + 13); const ox = x * T, oy = y * T;
    if (grid[y][x] === WALL) {
      // hedge top
      px('#2e7d32', ox, oy, T, T);
      for (let i = 0; i < 70; i++) {
        const r = rnd(); px(r < .35 ? '#1f6b26' : r < .7 ? '#3b8f3e' : r < .9 ? '#4caf50' : '#1b5e20', ox + Math.floor(rnd() * 16) * 2, oy + Math.floor(rnd() * 16) * 2);
      }
      const below = isWall(x, y + 1), above = isWall(x, y - 1), left = isWall(x - 1, y), right = isWall(x + 1, y);
      if (!above) { px('#7ccf6e', ox, oy, T, 2); px('#5cb85c', ox, oy + 2, T, 2); }
      if (!left) px('#5cb85c', ox, oy, 2, T);
      if (!right) px('#1b5e20', ox + T - 2, oy, 2, T);
      if (!below) { // front face of the hedge wall
        px('#1d5a22', ox, oy + 20, T, 12);
        for (let i = 0; i < 18; i++) px(rnd() < .5 ? '#174a1b' : '#256b2a', ox + Math.floor(rnd() * 16) * 2, oy + 20 + Math.floor(rnd() * 6) * 2);
        px('#0f3312', ox, oy + 30, T, 2);
      }
      if (rnd() < .12) { // flowers
        const fx = ox + 6 + Math.floor(rnd() * 8) * 2, fy = oy + 4 + Math.floor(rnd() * 5) * 2, c = pick(['#ff8fb1', '#fff', '#ffe066', '#c77dff']);
        px(c, fx, fy - 2); px(c, fx - 2, fy); px(c, fx + 2, fy); px(c, fx, fy + 2); px('#ffd23f', fx, fy);
      }
      if (rnd() < .07) { px('#38e1ff', ox + 4 + Math.floor(rnd() * 12) * 2, oy + 4 + Math.floor(rnd() * 6) * 2); } // data node
    } else {
      // stone path
      px('#c9c4b0', ox, oy, T, T);
      for (let i = 0; i < 40; i++) { const r = rnd(); px(r < .5 ? '#bab49e' : r < .85 ? '#d6d1bf' : '#a9a28a', ox + Math.floor(rnd() * 16) * 2, oy + Math.floor(rnd() * 16) * 2); }
      // glowing "digital" circuit trace following the corridors
      g.fillStyle = 'rgba(56,225,255,.45)';
      g.fillRect(ox + 14, oy + 14, 4, 4);
      if (!isWall(x, y - 1)) g.fillRect(ox + 15, oy, 2, 16);
      if (!isWall(x, y + 1)) g.fillRect(ox + 15, oy + 16, 2, 16);
      if (!isWall(x - 1, y)) g.fillRect(ox, oy + 15, 16, 2);
      if (!isWall(x + 1, y)) g.fillRect(ox + 16, oy + 15, 16, 2);
      // hedge shadow
      if (isWall(x, y - 1)) { g.fillStyle = 'rgba(0,30,0,.28)'; g.fillRect(ox, oy, T, 6); }
      if (isWall(x - 1, y)) { g.fillStyle = 'rgba(0,30,0,.15)'; g.fillRect(ox, oy, 3, T); }
    }
  }
  // start pad
  const sx = START.x * T, sy = START.y * T;
  px('#1a1530', sx + 3, sy + 5, 26, 22); px('#38e1ff', sx + 5, sy + 7, 22, 18); px('#1a1530', sx + 7, sy + 9, 18, 14);
  g.fillStyle = '#38e1ff'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.fillText('START', sx + 16, sy + 19);
})();

// ---------------------------------------------------------------- canvas / camera
const canvas = $('#world'); const ctx = canvas.getContext('2d');
let VW = 0, VH = 0, tilePx = 64;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  VW = canvas.width = Math.round(window.innerWidth * dpr); VH = canvas.height = Math.round(window.innerHeight * dpr);
  const cssMin = Math.min(window.innerWidth, window.innerHeight);
  tilePx = Math.max(28, Math.round(Math.min(VW, VH) / (cssMin < 520 ? 7.5 : 10)));
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- game state
const S = {
  mode: 'intro', money: START_MONEY, roomIdx: -1, decks: [], current: null, order: null,
  stats: ROOMS.map(() => ({ tries: 0, lost: 0, idk: 0 })), sparks: [], muted: false,
};
const player = { x: START.x, y: START.y, rx: START.x, ry: START.y, fromX: 0, fromY: 0, t: 1, moving: false, face: 1, walk: 0 };
const STEP_MS = 150;

function resetGame() {
  S.money = START_MONEY; S.roomIdx = -1; S.current = null;
  S.stats = ROOMS.map(() => ({ tries: 0, lost: 0, idk: 0 }));
  S.decks = window.QUESTION_BANK.map((room) => shuffle(room.questions.slice()));
  rooms.forEach((r) => { r.cleared = false; r.poof = 0; });
  Object.assign(player, { x: START.x, y: START.y, rx: START.x, ry: START.y, t: 1, moving: false, face: 1 });
  updateHUD(true);
}

// ---------------------------------------------------------------- input
const held = []; // stack of held directions, latest last
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
function press(dir) {
  if (held.includes(dir)) return; // ignore key auto-repeat
  held.push(dir); setPadOn(dir, true);
  queued = dir; tryMove(); // a quick tap always takes at least one step
}
let queued = null;
function release(dir) { const i = held.indexOf(dir); if (i >= 0) held.splice(i, 1); setPadOn(dir, false); }
function setPadOn(dir, on) { const b = document.querySelector(`#dpad [data-dir=${dir}]`); if (b) b.classList.toggle('on', on); }

window.addEventListener('keydown', (e) => {
  if (S.mode === 'maze' && KEYMAP[e.key]) { e.preventDefault(); press(KEYMAP[e.key]); return; }
  if (S.mode === 'room') {
    if (e.repeat || !armed()) { e.preventDefault(); return; }
    const visible = (id) => !$(id).classList.contains('hidden');
    const n = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
    const btns = document.querySelectorAll('#answers .ans');
    const go = e.key === 'Enter' || e.key === ' ';
    if (go && visible('#roomIntro')) { $('#talkBtn').click(); e.preventDefault(); }
    else if (n !== undefined && visible('#answers') && btns[n] && !btns[n].disabled) { btns[n].click(); e.preventDefault(); }
    else if (go && visible('#result')) { $('#resultBtn').click(); e.preventDefault(); }
  }
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.key]) release(KEYMAP[e.key]); });
window.addEventListener('blur', () => { held.slice().forEach(release); });

document.querySelectorAll('#dpad button').forEach((b) => {
  const dir = b.dataset.dir;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); ensureAudio(); press(dir); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => b.addEventListener(ev, () => release(dir)));
  b.addEventListener('contextmenu', (e) => e.preventDefault());
});

// ---------------------------------------------------------------- movement
function tryMove() {
  if (S.mode !== 'maze' || player.moving || (!held.length && !queued)) return;
  const dir = held.length ? held[held.length - 1] : queued; queued = null;
  const [dx, dy] = DIRS[dir];
  if (dx) player.face = dx;
  const nx = player.x + dx, ny = player.y + dy;
  if (isWall(nx, ny)) return;
  const r = roomAt.get(key(nx, ny));
  if (r && !r.cleared) { held.slice().forEach(release); enterRoom(r); return; }
  player.fromX = player.x; player.fromY = player.y; player.x = nx; player.y = ny; player.t = 0; player.moving = true;
}
function onArrive() {
  updateHUD();
  if (player.x === GOAL.x && player.y === GOAL.y) { held.slice().forEach(release); setTimeout(finishGame, 250); }
}

// ---------------------------------------------------------------- audio
let actx = null;
function ensureAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ } } if (actx?.state === 'suspended') actx.resume(); }
function tone(freq, start, dur, type = 'square', vol = 0.06) {
  if (!actx || S.muted) return;
  const o = actx.createOscillator(), g = actx.createGain(); const t0 = actx.currentTime + start;
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
const SFX = {
  good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.18)),
  idk: () => [440, 523].forEach((f, i) => tone(f, i * 0.1, 0.15, 'triangle', 0.08)),
  part: () => [392, 330].forEach((f, i) => tone(f, i * 0.14, 0.2, 'sawtooth', 0.05)),
  full: () => [300, 220, 150, 100].forEach((f, i) => tone(f, i * 0.13, 0.25, 'sawtooth', 0.06)),
  enter: () => [196, 262, 392].forEach((f, i) => tone(f, i * 0.07, 0.12, 'triangle', 0.08)),
  win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, 'triangle', 0.08)),
};

// ---------------------------------------------------------------- HUD
function updateHUD(instant) {
  $('#walletAmt').textContent = fmt(S.money);
  const dots = $('#dots'); dots.innerHTML = '';
  const next = rooms.find((r) => !r.cleared);
  rooms.forEach((r) => { const i = document.createElement('i'); if (r.cleared) i.className = 'done'; else if (r === next) i.className = 'cur'; dots.appendChild(i); });
  const tgt = next || GOAL; const d = distance(player.x, player.y, tgt.x, tgt.y);
  $('#nextInfo').textContent = next ? `NEXT: ROOM ${next.idx + 1} · ${d} STEPS` : `GRANDMA'S HOUSE · ${d} STEPS`;
}
function showLoss(amount) {
  const w = $('#wallet'), d = $('#walletDelta');
  d.textContent = `-SGD ${fmt(amount)}`; d.classList.remove('show'); void d.offsetWidth; d.classList.add('show');
  w.classList.remove('hit'); void w.offsetWidth; w.classList.add('hit');
  // count down
  const from = S.money + amount, to = S.money, t0 = performance.now();
  (function tick(now) { const k = Math.min(1, (now - t0) / 700); $('#walletAmt').textContent = fmt(Math.round(from + (to - from) * k)); if (k < 1) requestAnimationFrame(tick); })(t0);
}
function flash(color) { const f = document.createElement('div'); f.className = 'flash'; f.style.background = color; document.body.appendChild(f); setTimeout(() => f.remove(), 600); }

// ---------------------------------------------------------------- rooms / questions
function enterRoom(r) {
  S.mode = 'room'; S.roomIdx = r.idx; ensureAudio(); SFX.enter();
  const R = ROOMS[r.idx];
  $('#roomBg').style.backgroundImage = `url("assets/room${r.idx + 1}.jpg")`;
  const bg = $('#roomBg'); bg.style.animation = 'none'; void bg.offsetWidth; bg.style.animation = '';
  $('#roomTag').textContent = `ROOM ${r.idx + 1} / 8`;
  $('#roomName').textContent = R.name;
  $('#roomType').textContent = R.scam;
  $('#wolfImg').src = `assets/${R.img}.png`; $('#wolfImg').alt = R.wolf;
  $('#wolfName').textContent = R.wolf.toUpperCase() + ' SAYS:';
  $('#room').classList.remove('hidden'); $('#dpad').classList.add('hidden');
  $('#room').scrollTop = 0;
  // Step 1: the wolf greets Red. Questions only appear after the player taps "I'm ready".
  $('#introName').textContent = R.wolf.toUpperCase() + ':';
  $('#introGreet').textContent = GREETS[r.idx];
  ['#qBubble', '#answers', '#result'].forEach((s) => $(s).classList.add('hidden'));
  $('#roomIntro').classList.remove('hidden');
  arm($('#talkBtn'));
}

$('#talkBtn').addEventListener('click', () => {
  if (!armed() || S.mode !== 'room') return;
  $('#roomIntro').classList.add('hidden'); $('#qBubble').classList.remove('hidden');
  nextQuestion();
});

function drawQuestion(roomIdx) {
  let deck = S.decks[roomIdx];
  if (!deck.length) deck = S.decks[roomIdx] = shuffle(window.QUESTION_BANK[roomIdx].questions.slice());
  return deck.pop();
}

function nextQuestion() {
  const q = S.current = drawQuestion(S.roomIdx);
  // shuffle answer order; never show them in the original 1-2-3-4 layout (Answer 1 top / Answer 4 bottom)
  let order; do { order = shuffle([0, 1, 2, 3]); } while (order[0] === 0 && order[3] === 3);
  S.order = order;
  $('#questionText').textContent = q.q;
  const b = $('#qBubble'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  const box = $('#answers'); box.innerHTML = ''; box.classList.remove('hidden'); $('#result').classList.add('hidden');
  arm(box);
  order.forEach((ai, slot) => {
    const btn = document.createElement('button'); btn.className = 'ans'; btn.type = 'button';
    btn.innerHTML = `<span class="key">${'ABCD'[slot]}</span><span class="txt"></span>`;
    btn.querySelector('.txt').textContent = q.a[ai];
    btn.addEventListener('click', () => choose(ai));
    box.appendChild(btn);
  });
  $('#room').scrollTop = 0;
}

function lossFor(q, ai) {
  if (ai === 3) return q.v ?? INFO_LOSS_FULL;
  if (ai === 2) {
    if (q.v == null) return INFO_LOSS_PART;
    const m = q.a[2].match(/\$\s?([\d,]+)/); let amt = m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
    if (!amt || amt >= q.v) amt = Math.max(10, Math.round(q.v / 2 / 10) * 10);
    return amt;
  }
  return 0;
}

function choose(ai) {
  if (!armed() || !$('#result').classList.contains('hidden')) return;
  document.querySelectorAll('#answers .ans').forEach((b) => { b.disabled = true; });
  const q = S.current, R = ROOMS[S.roomIdx], st = S.stats[S.roomIdx];
  st.tries++;
  const res = $('#result'); res.className = 'result';
  let loss = Math.min(lossFor(q, ai), S.money);
  const safe = q.a[1];
  $('#resultLoss').textContent = ''; $('#resultSafe').textContent = '';
  if (ai === 1) {
    res.classList.add('good'); $('#resultIcon').textContent = '✓';
    $('#resultTitle').textContent = pick(GOOD_LINES);
    $('#resultMsg').textContent = `You avoided the ${R.scam.toLowerCase()}! ${R.wolf} has been unmasked and the way forward is open. ${R.tip}`;
    $('#resultBtn').textContent = 'CONTINUE JOURNEY ▶';
    SFX.good(); flash('rgba(47,191,113,.6)');
  } else if (ai === 0) {
    st.idk++;
    res.classList.add('idk'); $('#resultIcon').textContent = '?';
    $('#resultTitle').textContent = "Let's try another one";
    $('#resultMsg').textContent = pick(IDK_LINES);
    $('#resultSafe').textContent = `A safe choice here would be: "${safe}"`;
    $('#resultBtn').textContent = 'NEW QUESTION ▶';
    SFX.idk();
  } else if (ai === 2) {
    res.classList.add('part'); $('#resultIcon').textContent = '!';
    $('#resultTitle').textContent = 'Careful! You got scammed a bit.';
    $('#resultLoss').textContent = `-SGD ${fmt(loss)}`;
    $('#resultMsg').textContent = `Giving even a little money or information is still getting scammed. ${R.tip}`;
    $('#resultSafe').textContent = `A safer choice: "${safe}"`;
    $('#resultBtn').textContent = 'NEXT QUESTION ▶';
    SFX.part(); flash('rgba(255,159,28,.5)');
  } else {
    res.classList.add('full'); $('#resultIcon').textContent = '✗';
    $('#resultTitle').textContent = 'OH NO! You got totally scammed!';
    $('#resultLoss').textContent = `-SGD ${fmt(loss)}`;
    $('#resultMsg').textContent = `The wolf tricked you completely and that loss is real. Scammers rush you, scare you or tempt you so you don't stop to think. ${R.tip} Always stop, check, and tell a trusted adult before you act.`;
    $('#resultSafe').textContent = `What you should do: "${safe}"`;
    $('#resultBtn').textContent = 'NEXT QUESTION ▶';
    SFX.full(); flash('rgba(229,56,59,.6)');
  }
  if (loss > 0) { S.money -= loss; st.lost += loss; showLoss(loss); }
  if (S.money <= 0) $('#resultBtn').textContent = 'CONTINUE ▶';
  res.dataset.outcome = ai;
  $('#answers').classList.add('hidden'); res.classList.remove('hidden');
  arm($('#resultBtn'));
  res.scrollIntoView({ block: 'nearest' });
  $('#resultBtn').focus({ preventScroll: true });
}

$('#resultBtn').addEventListener('click', () => {
  if (!armed()) return;
  const ai = +$('#result').dataset.outcome;
  if (S.money <= 0) { gameOver(); return; }
  if (ai === 1) leaveRoom(); else nextQuestion();
});

function leaveRoom() {
  const r = rooms[S.roomIdx]; r.cleared = true; r.poof = performance.now();
  $('#room').classList.add('hidden'); $('#dpad').classList.remove('hidden');
  S.mode = 'maze'; updateHUD();
}

function gameOver() {
  S.mode = 'over';
  $('#room').classList.add('hidden'); $('#hud').classList.add('hidden'); $('#dpad').classList.add('hidden');
  $('#over').classList.remove('hidden');
}

function finishGame() {
  S.mode = 'end'; SFX.win();
  $('#hud').classList.add('hidden'); $('#dpad').classList.add('hidden');
  const lost = START_MONEY - S.money;
  $('#endMsg').innerHTML = lost === 0
    ? `Oh Red, you made it with the full <b>SGD ${fmt(S.money)}</b>! Not a single wolf fooled you. I'm so proud of you!`
    : `Thank you, Red! You brought me <b>SGD ${fmt(S.money)}</b>. The wolves scammed away <b>SGD ${fmt(lost)}</b> on the way, so remember the tips below next time!`;
  const stars = S.money >= START_MONEY * 0.9 ? 3 : S.money >= START_MONEY * 0.5 ? 2 : 1;
  $('#stars').innerHTML = [1, 2, 3].map((n) => `<span class="${n <= stars ? 'on' : ''}">★</span>`).join('');
  let rows = '<tr><th>ROOM</th><th>SCAM</th><th>TRIES</th><th>LOST</th></tr>';
  ROOMS.forEach((R, i) => { const s = S.stats[i]; rows += `<tr><td>${i + 1}. ${R.name}</td><td>${R.scam}</td><td class="num">${s.tries}</td><td class="num">SGD ${fmt(s.lost)}</td></tr>`; });
  rows += `<tr class="total"><td colspan="2">Delivered to Grandma</td><td></td><td class="num">SGD ${fmt(S.money)}</td></tr>`;
  $('#summary').innerHTML = rows;
  $('#lessonList').innerHTML = ROOMS.map((R) => `<li><b>${R.scam}:</b> ${R.tip}</li>`).join('');
  $('#end').classList.remove('hidden');
}

function startGame() {
  ensureAudio(); resetGame();
  ['#intro', '#end', '#over', '#room'].forEach((s) => $(s).classList.add('hidden'));
  $('#hud').classList.remove('hidden'); $('#dpad').classList.remove('hidden');
  S.mode = 'maze'; updateHUD();
}
$('#startBtn').addEventListener('click', startGame);
$('#againBtn').addEventListener('click', startGame);
$('#retryBtn').addEventListener('click', startGame);
$('#muteBtn').addEventListener('click', () => { S.muted = !S.muted; $('#muteBtn').classList.toggle('muted', S.muted); });

// ---------------------------------------------------------------- drawing
function drawSprite(im, cx, bottom, h, flip = false) {
  if (!im || !im.naturalWidth) return;
  const w = h * im.naturalWidth / im.naturalHeight;
  ctx.save(); ctx.translate(cx, bottom); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
}
function shadow(cx, cy, rw) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(cx, cy, rw, rw * 0.38, 0, 0, Math.PI * 2); ctx.fill(); }

// ---- pixel-art buildings: each stop is drawn as the real place (48×48 art units, 1.5 tiles),
// standing on its tile with the door at the bottom centre where the wolf waits.
const P = {
  r(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); },
  tri(x1, y1, x2, y2, x3, y3, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); },
  circ(x, y, rad, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); },
  txt(s, x, y, c, size = 5) { ctx.fillStyle = c; ctx.font = `${size}px "Press Start 2P", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + 0.5); },
};
const blink = (now, ms, phase = 0) => Math.floor(now / ms + phase) % 2 === 0;

const BUILDINGS = [
  // 1. Hospital
  (now) => {
    P.r(4, 12, 40, 36, '#f4f7fa'); P.r(3, 11, 42, 1, '#90a4ae'); P.r(3, 12, 1, 36, '#90a4ae'); P.r(44, 12, 1, 36, '#90a4ae');
    P.r(3, 9, 42, 3, '#26c6da'); P.r(3, 12, 42, 1, '#00838f');
    P.r(14, 0, 20, 10, '#ffffff'); P.r(13, 0, 1, 10, '#b0bec5'); P.r(34, 0, 1, 10, '#b0bec5'); P.r(13, 0, 22, 1, '#b0bec5');
    P.r(21, 1, 6, 8, '#e53935'); P.r(18, 3, 12, 4, '#e53935');                          // red cross
    for (const y of [15, 24]) for (const x of [7, 15, 27, 35]) { P.r(x, y, 6, 6, '#4fc3f7'); P.r(x, y, 6, 1, '#b3e5fc'); P.r(x + 2, y + 2, 1, 1, '#e1f5fe'); }
    P.r(14, 33, 20, 3, '#e53935'); P.r(14, 36, 20, 1, '#b71c1c');                        // awning
    P.r(17, 37, 14, 11, '#81d4fa'); P.r(24, 37, 1, 11, '#0277bd'); P.r(17, 37, 14, 1, '#0277bd');
    P.r(6, 36, 8, 6, '#c8e6c9'); P.r(7, 37, 6, 1, '#2e7d32'); P.txt('ER', 10, 39.5, '#e53935', 3);
  },
  // 2. Prize Centre (wheel of fortune)
  (now) => {
    P.r(2, 30, 44, 18, '#4a148c'); P.r(2, 30, 44, 3, '#ffd600');
    for (let i = 0; i < 11; i++) P.r(3 + i * 4, 31, 2, 1, blink(now, 250, i * 0.5) ? '#fff' : '#ff6f00');
    P.r(4, 33, 11, 15, '#8e24aa'); P.r(33, 33, 11, 15, '#8e24aa');
    for (let i = 0; i < 3; i++) { P.r(6 + i * 3, 33, 1, 15, '#6a1b9a'); P.r(35 + i * 3, 33, 1, 15, '#6a1b9a'); }
    P.r(15, 33, 18, 15, '#1a0033');
    // spinning wheel
    const cx = 24, cy = 14, rad = 12, cols = ['#e53935', '#ffd600', '#1e88e5', '#43a047'], spin = now / 700;
    P.circ(cx, cy, rad + 2, '#ffb300');
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = cols[i % 4]; ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, rad, spin + (i * Math.PI) / 4, spin + ((i + 1) * Math.PI) / 4); ctx.closePath(); ctx.fill();
    }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; P.r(Math.round(cx + Math.cos(a) * 13) - 1, Math.round(cy + Math.sin(a) * 13) - 1, 2, 2, blink(now, 200, i) ? '#fff' : '#ff6f00'); }
    P.circ(cx, cy, 2.5, '#fff'); P.tri(21, -1, 27, -1, 24, 4, '#e53935');
    // "WIN!" signs on the curtains, clear of the wolf standing in the doorway
    for (const sx of [3, 33]) { P.r(sx, 37, 12, 7, '#ffd600'); P.r(sx, 37, 12, 1, '#fff59d'); P.txt('WIN', sx + 6, 40.5, '#4a148c', 3); }
  },
  // 3. Playground
  (now) => {
    P.r(0, 38, 48, 10, '#f2d7a0'); for (let i = 0; i < 14; i++) P.r((i * 7) % 46 + 1, 40 + (i * 3) % 7, 1, 1, '#d9b779');
    P.r(6, 18, 2, 28, '#8d6e63'); P.r(18, 18, 2, 28, '#8d6e63'); P.r(5, 28, 16, 3, '#a1887f'); P.r(5, 31, 16, 1, '#6d4c41');
    for (let i = 0; i < 4; i++) P.r(8, 33 + i * 3, 10, 1, '#6d4c41');                   // ladder
    P.tri(3, 19, 13, 8, 23, 19, '#e65100'); P.tri(6, 18, 13, 11, 20, 18, '#fb8c00');    // roof
    P.r(13, 2, 1, 7, '#555'); P.r(14, 2, 5, 3, blink(now, 400) ? '#e53935' : '#ef5350');
    ctx.fillStyle = '#f9a825'; ctx.beginPath(); ctx.moveTo(20, 28); ctx.lineTo(24, 28); ctx.lineTo(34, 45); ctx.lineTo(29, 45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fdd835'; ctx.beginPath(); ctx.moveTo(21, 28); ctx.lineTo(23, 28); ctx.lineTo(33, 44); ctx.lineTo(31, 44); ctx.closePath(); ctx.fill();
    P.r(32, 16, 14, 2, '#1e88e5'); P.r(32, 16, 2, 30, '#1565c0'); P.r(44, 16, 2, 30, '#1565c0');   // swing set
    const sw = Math.round(Math.sin(now / 450) * 2);
    P.r(37 + sw, 18, 1, 14, '#9e9e9e'); P.r(41 + sw, 18, 1, 14, '#9e9e9e'); P.r(36 + sw, 32, 7, 2, '#e53935');
  },
  // 4. Arcade
  (now) => {
    P.r(3, 14, 42, 34, '#2a1b3d'); P.r(3, 14, 42, 2, '#40c4ff');
    const neon = blink(now, 900) || blink(now, 130) ? '#ff4fa3' : '#7a2450';
    P.r(4, 2, 40, 11, '#140b22'); P.r(4, 2, 40, 1, neon); P.r(4, 12, 40, 1, neon); P.r(4, 2, 1, 11, neon); P.r(43, 2, 1, 11, neon);
    P.txt('ARCADE', 24, 7.5, '#40c4ff', 5);
    for (const wx of [6, 32]) {
      P.r(wx, 19, 10, 15, '#0d0d1a'); P.r(wx + 2, 22, 6, 12, '#ec407a'); P.r(wx + 3, 23, 4, 3, ['#40c4ff', '#ffd600', '#69f0ae'][Math.floor(now / 300 + wx) % 3]);
      P.r(wx + 3, 28, 1, 1, '#fff'); P.r(wx + 5, 28, 1, 1, '#ffd600');
    }
    P.r(18, 28, 12, 20, neon); P.r(19, 29, 10, 19, '#3d2357'); P.r(23, 29, 1, 19, '#2a1b3d');
    for (let i = 0; i < 6; i++) P.r(4 + i * 8, 16, 2, 2, blink(now, 300, i) ? '#ffd600' : '#5c4a00');
  },
  // 5. Cybercafe
  (now) => {
    P.r(3, 14, 42, 34, '#1b2a4a');
    for (let i = 0; i < 7; i++) P.r(3 + i * 6, 14, 6, 4, i % 2 ? '#0a1530' : '#00e5ff');  // awning
    P.r(6, 1, 30, 12, '#0a0f24'); P.r(6, 1, 30, 1, '#00e5ff'); P.r(6, 12, 30, 1, '#00e5ff'); P.r(6, 1, 1, 12, '#00e5ff'); P.r(35, 1, 1, 12, '#00e5ff');
    P.txt('CYBER', 21, 5, '#00e5ff', 4); P.txt('CAFE', 21, 10, '#b388ff', 4);
    P.r(38, 6, 5, 5, '#fff'); P.r(43, 7, 1, 3, '#fff'); P.r(39, 7, 3, 2, '#6d4c41');     // coffee cup
    if (blink(now, 500)) { P.r(39, 3, 1, 2, '#cfd8dc'); P.r(41, 2, 1, 2, '#cfd8dc'); }
    for (const wx of [5, 31]) {
      P.r(wx, 21, 12, 15, '#0d1b3a'); P.r(wx, 33, 12, 2, '#5d4037');
      for (const m of [0, 6]) { P.r(wx + 1 + m, 25, 5, 4, blink(now, 700, m + wx) ? '#00e5ff' : '#7c4dff'); P.r(wx + 3 + m, 29, 1, 4, '#90a4ae'); }
    }
    P.r(18, 26, 12, 22, '#00e5ff'); P.r(19, 27, 10, 21, '#0d1b3a'); P.r(19, 27, 10, 3, '#12305e');
  },
  // 6. Bank
  (now) => {
    P.r(2, 44, 44, 4, '#a89f8e'); P.r(4, 42, 40, 2, '#c5bdad');
    P.r(6, 20, 36, 22, '#efe6d2');
    P.tri(2, 20, 24, 4, 46, 20, '#8d7b5a'); P.tri(6, 19, 24, 7, 42, 19, '#e8dcc0');
    P.r(3, 18, 42, 4, '#d4c4a0');
    P.circ(24, 10, 3.5, '#ffca28'); P.circ(24, 10, 2.6, '#ffd54f'); P.txt('$', 24, 10, '#8d6e00', 3);
    P.txt('BANK', 24, 15.5, '#5d4037', 3);
    for (const x of [8, 15, 30, 37]) { P.r(x - 1, 22, 6, 2, '#d4c4a0'); P.r(x, 24, 4, 16, '#fffaf0'); P.r(x + 3, 24, 1, 16, '#d8cfbd'); P.r(x - 1, 40, 6, 2, '#d4c4a0'); }
    P.r(20, 27, 8, 15, '#5d4037'); P.r(24, 27, 1, 15, '#3e2723'); P.r(22, 34, 1, 1, '#ffca28'); P.r(25, 34, 1, 1, '#ffca28');
  },
  // 7. Police Station
  (now) => {
    P.r(3, 14, 42, 34, '#1e4fa3'); P.r(2, 11, 44, 3, '#0d47a1');
    P.r(7, 1, 34, 10, '#ffffff'); P.r(7, 1, 34, 1, '#cfd8dc'); P.txt('POLICE', 24, 6, '#0d47a1', 4);   // rooftop sign
    const on = blink(now, 220);                                                        // flashing lights either side
    P.r(1, 5, 5, 6, on ? '#ff1744' : '#7f0000'); P.r(42, 5, 5, 6, on ? '#0d47a1' : '#2979ff');
    ctx.globalAlpha = 0.25; if (on) P.circ(3.5, 8, 7, '#ff1744'); else P.circ(44.5, 8, 7, '#2979ff'); ctx.globalAlpha = 1;
    for (let i = 0; i < 14; i++) P.r(3 + i * 3, 16, 3, 3, i % 2 ? '#ffffff' : '#0d2b66');   // chequered band
    P.r(14, 21, 20, 6, '#16408a'); P.circ(24, 24, 2.5, '#ffd600'); P.circ(24, 24, 1.2, '#1e4fa3');  // badge
    for (const wx of [6, 33]) { P.r(wx, 31, 9, 8, '#90caf9'); P.r(wx, 31, 9, 1, '#e3f2fd'); P.r(wx + 4, 31, 1, 8, '#1e4fa3'); }
    P.r(19, 31, 10, 17, '#0d2b66'); P.r(23, 31, 1, 17, '#06173a'); P.r(22, 29, 4, 2, '#4fc3f7');
  },
  // 8. "Grandma's" house (the fake one: dim windows, glowing eyes, a wolf tail out the back)
  (now) => {
    const wag = Math.round(Math.sin(now / 160) * 1.5);
    P.r(42, 35 + wag, 4, 3, '#90a4ae'); P.r(44, 33 + wag, 3, 3, '#b0bec5'); P.r(46, 32 + wag, 2, 2, '#eceff1');
    P.r(6, 22, 36, 26, '#cdb592'); P.r(6, 22, 2, 26, '#7b5a44'); P.r(40, 22, 2, 26, '#7b5a44'); P.r(6, 33, 36, 1, '#7b5a44');
    P.r(33, 4, 5, 12, '#5d4037');
    const puff = (now / 60) % 20; ctx.globalAlpha = 0.6 * (1 - puff / 20); P.circ(36 + puff / 4, 2 - puff / 2, 2 + puff / 8, '#9575cd'); ctx.globalAlpha = 1;
    P.tri(1, 24, 24, 4, 47, 24, '#4a1010'); P.tri(5, 23, 24, 7, 43, 23, '#7b1f1f');
    for (let i = 0; i < 3; i++) P.r(10 + i * 4, 14 + i * 3, 28 - i * 8, 1, '#5a1414');
    for (const wx of [10, 30]) {
      P.r(wx, 26, 8, 6, '#2b1d0e'); P.r(wx + 3, 26, 1, 6, '#7b5a44'); P.r(wx, 28, 8, 1, '#7b5a44');
      P.r(wx - 1, 32, 10, 2, '#6d4c41'); P.r(wx, 31, 2, 1, '#ff8fb1'); P.r(wx + 4, 31, 2, 1, '#ce93d8');
    }
    if (!blink(now, 1700) || blink(now, 120)) { P.r(11, 29, 1, 1, '#ffeb3b'); P.r(14, 29, 1, 1, '#ffeb3b'); } // eyes in the window
    P.r(20, 34, 8, 14, '#4e342e'); P.r(21, 33, 6, 1, '#4e342e'); P.r(26, 41, 1, 1, '#ffca28');
    P.r(18, 47, 12, 1, '#8d6e63');
  },
];

function drawBuilding(r, now) {
  ctx.save(); ctx.translate(r.x * T - 8, r.y * T - 16);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(1, 45, 46, 3);
  BUILDINGS[r.idx](now);
  // floating stop number (turns into a green tick once the room is cleared)
  const sy = -16 + Math.round(Math.sin(now / 350 + r.idx));
  P.r(17, sy, 14, 12, '#000'); P.r(18, sy + 1, 12, 10, r.cleared ? '#2fbf71' : ROOMS[r.idx].accent === '#ffffff' ? '#ffd600' : ROOMS[r.idx].accent);
  ctx.fillStyle = r.cleared ? '#fff' : '#1b1530'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(r.cleared ? '✓' : String(r.idx + 1), 24, sy + 6.5);
  ctx.restore();
}

// The REAL Grandma's house: bright, warm and welcoming
function drawHouse(now) {
  ctx.save(); ctx.translate(GOAL.x * T - 8, GOAL.y * T - 16);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(1, 45, 46, 3);
  P.r(6, 22, 36, 26, '#fff3d6'); P.r(6, 22, 36, 2, '#f0d9a8'); for (let i = 0; i < 3; i++) P.r(6, 29 + i * 6, 36, 1, '#f0d9a8');
  P.r(33, 5, 5, 12, '#a1887f');
  P.tri(1, 24, 24, 4, 47, 24, '#b71c1c'); P.tri(5, 23, 24, 7, 43, 23, '#e74c3c');
  P.circ(24, 15, 3, '#ff8fb1'); P.circ(22, 14, 1.6, '#ff4f81'); P.circ(26, 14, 1.6, '#ff4f81'); P.tri(20.5, 14.5, 27.5, 14.5, 24, 18.5, '#ff4f81'); // heart
  for (const wx of [10, 30]) { P.r(wx, 26, 8, 6, '#ffe082'); P.r(wx + 3, 26, 1, 6, '#fff'); P.r(wx, 28, 8, 1, '#fff'); P.r(wx - 1, 32, 10, 2, '#8d6e63'); P.r(wx, 31, 2, 1, '#ff8fb1'); P.r(wx + 4, 31, 2, 1, '#fff176'); }
  P.r(20, 34, 8, 14, '#8d5524'); P.r(21, 33, 6, 1, '#8d5524'); P.r(26, 41, 1, 1, '#ffd54a'); P.r(22, 37, 4, 3, '#ff8fb1');
  P.r(10, 0, 28, 6, '#ff8fb1'); P.r(10, 0, 28, 1, '#ffc1d6'); P.txt('GRANDMA', 24, 3, '#6a1b3a', 3);
  ctx.restore();
}

function spawnSparks(now) {
  if (S.sparks.length < 40 && Math.random() < 0.3) {
    S.sparks.push({ x: Math.random() * MW * T, y: Math.random() * MH * T, vy: -4 - Math.random() * 6, life: 0, max: 2 + Math.random() * 2 });
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  // movement
  if (player.moving) {
    player.t += (dt * 1000) / STEP_MS; player.walk += dt * 12;
    if (player.t >= 1) { player.t = 1; player.moving = false; onArrive(); }
    player.rx = player.fromX + (player.x - player.fromX) * player.t;
    player.ry = player.fromY + (player.y - player.fromY) * player.t;
  }
  if (!player.moving) tryMove();

  // camera
  const f = tilePx / T;
  const viewW = VW / f, viewH = VH / f;
  // always keep Red centred (slightly below centre so the HUD never covers him)
  const cx = (player.rx + 0.5) * T - viewW / 2, cy = (player.ry + 0.5) * T - viewH * 0.45;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0b2410'; ctx.fillRect(0, 0, VW, VH);
  ctx.setTransform(f, 0, 0, f, Math.round(-cx * f), Math.round(-cy * f));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mapCanvas, 0, 0);

  ctx.imageSmoothingEnabled = true;
  rooms.forEach((r) => drawBuilding(r, now));
  drawHouse(now);

  // y-sorted sprites
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const sprites = [];
  rooms.forEach((r) => {
    if (!r.cleared) sprites.push({ y: r.y, draw: () => { const bob = Math.sin(now / 400 + r.idx) * 0.6; shadow(r.x * T + 16, r.y * T + 29, 8); drawSprite(IMG[ROOMS[r.idx].img], r.x * T + 16, r.y * T + 31 + bob, 28); } });
    else if (r.poof && now - r.poof < 700) sprites.push({ y: r.y, draw: () => drawPoof(r, now) });
  });
  sprites.push({ y: GOAL.y + 0.1, draw: () => { shadow(GOAL.x * T + 26, GOAL.y * T + 30, 6); drawSprite(IMG.grandma, GOAL.x * T + 26, GOAL.y * T + 31, 30); } });
  sprites.push({ y: player.ry + 0.2, draw: () => {
    const bob = player.moving ? -Math.abs(Math.sin(player.walk)) * 2.5 : Math.sin(now / 500) * 0.5;
    const px = (player.rx + 0.5) * T, py = player.ry * T + 30;
    shadow(px, py - 1, 9);
    drawSprite(IMG.red, px, py + bob, 44, player.face < 0);
  } });
  sprites.sort((a, b) => a.y - b.y).forEach((s) => s.draw());

  // digital fireflies
  spawnSparks(now);
  ctx.imageSmoothingEnabled = false;
  S.sparks = S.sparks.filter((p) => (p.life += dt) < p.max);
  S.sparks.forEach((p) => { p.y += p.vy * dt; const a = Math.sin((p.life / p.max) * Math.PI); ctx.fillStyle = `rgba(56,225,255,${0.8 * a})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); });

  requestAnimationFrame(frame);
}
function drawPoof(r, now) {
  const k = (now - r.poof) / 700; const cx = r.x * T + 16, cy = r.y * T + 16;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2; const d = 4 + k * 18;
    ctx.fillStyle = `rgba(255,255,255,${1 - k})`; ctx.fillRect(cx + Math.cos(a) * d - 2, cy + Math.sin(a) * d - 2, 4, 4);
  }
}

// ---------------------------------------------------------------- boot
if (!window.QUESTION_BANK || window.QUESTION_BANK.length !== 8) {
  $('#startBtn').textContent = 'QUESTIONS MISSING'; return;
}
document.querySelectorAll(".start-money").forEach((el) => { el.textContent = fmt(START_MONEY); });
resetGame();
requestAnimationFrame(frame);
loadImages().then(() => { const b = $('#startBtn'); b.disabled = false; b.textContent = 'START JOURNEY ▶'; });

// debug hook for testing
window.__game = { S, rooms, player, ROOMS, enterRoom, distance };
})();
