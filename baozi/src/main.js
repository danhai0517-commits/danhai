import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Effects } from './effects.js';
import { OutlinePass } from './outline.js';
import { Game } from './game.js';
import { Hud } from './hud.js';
import { Danmaku } from './danmaku.js';
import { audio } from './audio.js';

const $ = id => document.getElementById(id);
const STAGE_W = 1080, STAGE_H = 1920;
const stage = $('stage');
function fitStage() {
  const s = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
  stage.style.transform = `translate(-50%,-50%) scale(${s})`; stage.style.left = '50%'; stage.style.top = '50%';
  return s;
}
let stageScale = fitStage();

const container = $('scene-container');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { window.BaoziStartup.fail('这台设备暂时无法开启 WebGL', '请更换支持 WebGL 2 的浏览器并开启硬件加速。'); throw e; }
if (!renderer.capabilities.isWebGL2) window.BaoziStartup.fail('需要 WebGL 2', '请使用最新版 Chrome、Edge 或 Firefox。');
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a170e'); scene.fog = new THREE.Fog('#2a170e', 55, 110);
const camera = new THREE.PerspectiveCamera(38, STAGE_W / STAGE_H, 2, 140);
const CAMERA_POS = new THREE.Vector3(0, 44, 30.5); const CAMERA_LOOK = new THREE.Vector3(0, 0, -1.2);
camera.position.copy(CAMERA_POS); camera.lookAt(CAMERA_LOOK);

const world = buildWorld(scene);
const effects = new Effects(scene, STAGE_H);
const hud = new Hud(camera);
const outline = new OutlinePass(renderer, scene, camera);
const game = new Game({ scene, world, effects, ui: hud, audio });
const danmaku = new Danmaku(game, hud);

function resize() {
  stageScale = fitStage();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(STAGE_W * stageScale * dpr), h = Math.round(STAGE_H * stageScale * dpr);
  const maxW = 1620; const k = Math.min(1, maxW / w);
  renderer.setPixelRatio(1); renderer.setSize(Math.round(w * k), Math.round(h * k), false);
  outline.setSize(Math.round(w * k), Math.round(h * k)); effects.setPixelScale(Math.round(h * k));
}
addEventListener('resize', resize); resize();

// ---------- UI wiring ----------
const chatPanel = $('chat-panel');
$('chat-button').addEventListener('click', () => { chatPanel.hidden = !chatPanel.hidden; if (!chatPanel.hidden) $('chat-text').focus(); });
$('chat-close').addEventListener('click', () => { chatPanel.hidden = true; });
$('sound-button').addEventListener('click', e => { const on = audio.toggle(); e.currentTarget.setAttribute('aria-pressed', on); e.currentTarget.textContent = on ? '🔊 音效' : '🔇 音效'; });
$('auto-sim').addEventListener('change', e => { danmaku.setAuto(e.target.checked); danmaku.setMode(e.target.checked ? '本地模拟' : '手动输入', false); });
$('chat-form').addEventListener('submit', e => {
  e.preventDefault(); const user = $('chat-user').value.trim() || '小笼包'; const text = $('chat-text').value.trim(); if (!text) return;
  const r = danmaku.receive({ user, text, id: 'local' + Date.now() + Math.random() }, 'local');
  if (r && r.reason === 'unknown') hud.toast('不认识这条指令，试试 A / 冲 / 666 / 跳舞');
  else if (r && r.reason === 'cooldown') hud.toast('指令冷却中（2 秒）');
  $('chat-text').value = '';
});
$('quick-commands').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('chat-text').value = b.dataset.text; $('chat-form').requestSubmit(); });
$('quick-gifts').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; danmaku.gift({ user: $('chat-user').value.trim() || '小笼包', gift: b.dataset.gift, count: 1, id: 'localgift' + Date.now() }, 'local'); });
$('ws-form').addEventListener('submit', e => { e.preventDefault(); const url = $('ws-url').value.trim(); if (url) danmaku.connect(url); });
$('ws-disconnect').addEventListener('click', () => danmaku.disconnect());
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') { e.target.blur(); chatPanel.hidden = true; } return; }
  if (e.key === 'h' || e.key === 'H') hud.setHidden(!hud.hidden);
  if (e.key === '/' || e.key === 'Enter') { e.preventDefault(); chatPanel.hidden = false; $('chat-text').focus(); }
  if (e.key === 'o' || e.key === 'O') outline.enabled = !outline.enabled;
  if (e.key === 'Escape') chatPanel.hidden = true;
});
window.addEventListener('pointerdown', () => { if (audio.enabled) audio.play('tick'); }, { once: true });

// ---------- Public API for authorised danmaku bridges ----------
window.BaoziGame = {
  receiveDanmaku: data => danmaku.receive(data, 'external'),
  receiveGift: data => danmaku.gift(data, 'external'),
  receiveLike: data => danmaku.like(data, 'external'),
  connectDanmaku: url => danmaku.connect(url),
  disconnectDanmaku: () => danmaku.disconnect(),
  setAutoSim: on => { danmaku.setAuto(!!on); $('auto-sim').checked = !!on; },
  setHudHidden: hidden => hud.setHidden(!!hidden),
  setOutline: on => { outline.enabled = !!on; },
  getState: () => game.snapshot(),
  version: '1.0.0',
  debug: { game, skipToEnd: () => { game.time = Math.max(game.time, 176); } },
};

// ---------- Loop ----------
let last = performance.now(); let frames = 0; let fpsTime = 0; let lowFps = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  game.update(dt); danmaku.update(dt); effects.update(Math.min(dt, 0.05), game.clock);
  for (const l of world.lanterns) if (l.userData.light) l.userData.light.intensity = 20 + Math.sin(now / 160 + l.position.x) * 2.5;
  world.centreGlow.intensity = 8 + Math.sin(now / 300) * 1.5;
  hud.update(game, now);
  outline.render();
  frames++; fpsTime += dt; if (fpsTime > 2) { const fps = frames / fpsTime; frames = 0; fpsTime = 0; if (fps < 28 && outline.enabled) { if (++lowFps >= 2) { outline.enabled = false; renderer.shadowMap.enabled = false; } } }
}
requestAnimationFrame(frame);
window.BaoziStartup.ready();
hud.toast('欢迎来到包子铺！发送 A/B/C/D 加入战队', 4000);
