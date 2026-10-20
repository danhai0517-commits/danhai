import { TEAM_BY_ID, TEAM_ALIASES, GIFTS, COMMAND_COOLDOWN, SIM_NAMES } from './config.js';
import { rand, pick } from './art.js';

const giftIndex = new Map();
for (const [name, g] of Object.entries(GIFTS)) { giftIndex.set(name, name); for (const a of g.aliases) giftIndex.set(a.toLowerCase(), name); }

export function normalize(text) {
  return String(text || '').trim().replace(/[\uff01-\uff5e]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/\s+/g, ' ').toUpperCase();
}
export function parseCommand(raw) {
  const text = normalize(raw); if (!text) return null;
  let m = text.match(/^(?:加入|进|入|来|JOIN)?\s*([ABCD])(?:队|组|队伍)?$/); if (m) return { type: 'join', team: m[1] };
  m = text.match(/^(?:加入|进|入|来)?\s*(红队|蓝队|绿队|紫队|红|蓝|绿|紫)(?:队)?$/); if (m) return { type: 'join', team: TEAM_ALIASES[m[1]] };
  if (/^(冲+|抢+|冲鸭|冲啊|冲冲冲|RUSH|GO+|冲刺|跑)/.test(text)) return { type: 'dash' };
  if (/^(6{2,}|加油|奥利给|牛|顶|冲鸭+|ADD OIL|GOGOGO|好耶)/.test(text)) return { type: 'cheer' };
  if (/^(跳舞|DANCE|扭一个|扭|跳)/.test(text)) return { type: 'dance' };
  if (/^(点赞|赞|LIKE)/.test(text)) return { type: 'like', count: 50 };
  return null;
}
export function resolveGift(name) { if (!name) return null; return giftIndex.get(name) || giftIndex.get(String(name).toLowerCase()) || null; }

export class Danmaku {
  constructor(game, hud) {
    this.game = game; this.hud = hud; this.seen = []; this.seenSet = new Set(); this.cooldowns = new Map(); this.socket = null; this.external = false;
    this.auto = true; this.simTimer = 1; this.simGiftTimer = 14; this.simViewers = [];
  }
  dedupe(id) { if (!id) return true; if (this.seenSet.has(id)) return false; this.seen.push(id); this.seenSet.add(id); if (this.seen.length > 500) this.seenSet.delete(this.seen.shift()); return true; }
  cooled(user, cost = COMMAND_COOLDOWN) { const now = performance.now() / 1000; const last = this.cooldowns.get(user) || 0; if (now - last < cost) return false; this.cooldowns.set(user, now); return true; }
  receive({ user, text, id } = {}, source = 'local') {
    user = String(user || '观众').trim().slice(0, 16) || '观众';
    if (!this.dedupe(id)) return { ok: false, reason: 'duplicate' };
    if (source === 'external') this.markExternal();
    const cmd = parseCommand(text); if (!cmd) return { ok: false, reason: 'unknown' };
    const g = this.game;
    if (cmd.type === 'join') { const r = g.join(user, cmd.team); if (!r.ok && source === 'local') this.hud.toast(r.reason === 'already' ? `${user} 已经在 ${TEAM_BY_ID[cmd.team].name} 里了` : r.reason === 'locked' ? `${user} 已加入其他战队，本场不能换队` : r.reason === 'full' ? '场上满员啦，稍后再来' : '未知战队'); return r; }
    if (!this.cooled(user)) return { ok: false, reason: 'cooldown' };
    if (cmd.type === 'dash') return { ok: g.dash(user) };
    if (cmd.type === 'cheer') return { ok: g.cheer(user) };
    if (cmd.type === 'dance') return { ok: g.dance(user) };
    if (cmd.type === 'like') return { ok: true, dropped: g.like(user, cmd.count) };
    return { ok: false };
  }
  gift({ user, gift, count = 1, id } = {}, source = 'local') {
    if (!this.dedupe(id)) return null; if (source === 'external') this.markExternal();
    const name = resolveGift(gift); if (!name) { if (source === 'local') this.hud.toast(`未配置礼物：${gift}`); return null; }
    return this.game.gift(String(user || '观众').slice(0, 16), name, Number(count) || 1);
  }
  like({ user, count = 1 } = {}, source = 'local') { if (source === 'external') this.markExternal(); return this.game.like(String(user || '观众').slice(0, 16), Math.max(1, Math.floor(Number(count) || 1))); }
  markExternal() { if (!this.external) { this.external = true; this.setAuto(false); document.getElementById('auto-sim').checked = false; this.setMode('接入真实弹幕', true); } }
  setMode(text, online) { const b = document.getElementById('chat-mode'); b.lastChild.textContent = text; b.classList.toggle('online', online); }
  connect(url) {
    this.disconnect();
    try { this.socket = new WebSocket(url); } catch (e) { this.hud.toast('WebSocket 地址无效'); return false; }
    this.hud.toast('正在连接弹幕服务…');
    this.socket.addEventListener('open', () => { this.setMode('WebSocket 已连接', true); this.hud.toast('弹幕服务已连接'); });
    this.socket.addEventListener('message', ev => { try { const data = JSON.parse(ev.data); this.handleExternal(data); } catch { /* ignore malformed */ } });
    this.socket.addEventListener('close', () => { this.setMode(this.external ? '连接已断开' : '本地模拟', false); this.hud.toast('弹幕服务连接已断开（不会自动重连）'); this.socket = null; });
    this.socket.addEventListener('error', () => this.hud.toast('弹幕服务连接失败，请检查地址（HTTPS 页面需使用 wss://）'));
    return true;
  }
  disconnect() { if (this.socket) { this.socket.close(); this.socket = null; } }
  handleExternal(data) {
    if (Array.isArray(data)) { data.forEach(d => this.handleExternal(d)); return; }
    if (!data || typeof data !== 'object') return;
    const type = data.type || (data.gift ? 'gift' : data.likes || data.like ? 'like' : 'danmaku');
    if (type === 'gift') this.gift(data, 'external');
    else if (type === 'like') this.like({ user: data.user, count: data.count ?? data.likes ?? data.like }, 'external');
    else this.receive(data, 'external');
  }
  setAuto(on) { this.auto = on; }
  update(dt) {
    if (!this.auto) return;
    this.simTimer -= dt; this.simGiftTimer -= dt;
    if (this.simTimer <= 0) {
      this.simTimer = rand(0.35, 1.1);
      const g = this.game; const want = Math.min(48, 10 + Math.floor(g.clock / 6));
      if (this.simViewers.length < want && rand() < 0.75) {
        let name = pick(SIM_NAMES); if (g.viewers.has(name)) name = name + Math.floor(rand(1, 99));
        if (!g.viewers.has(name)) { const teams = ['A', 'B', 'C', 'D']; const team = pick(teams); this.simViewers.push({ name, team }); this.receive({ user: name, text: pick(['A', 'B', 'C', 'D']).replace(/./, team), id: 'sim' + Math.random() }, 'sim'); }
      } else if (this.simViewers.length) {
        const v = pick(this.simViewers); const r = rand();
        const text = r < 0.5 ? pick(['冲', '冲冲冲', '抢', '冲鸭']) : r < 0.78 ? pick(['666', '加油', '奥利给']) : r < 0.88 ? '跳舞' : '点赞';
        this.receive({ user: v.name, text, id: 'sim' + Math.random() }, 'sim');
      }
    }
    if (this.simGiftTimer <= 0 && this.simViewers.length) {
      this.simGiftTimer = rand(9, 20); const v = pick(this.simViewers); const r = rand();
      const gift = r < 0.4 ? '小心心' : r < 0.65 ? '玫瑰' : r < 0.8 ? '棒棒糖' : r < 0.9 ? '甜甜圈' : r < 0.96 ? '爱你' : r < 0.99 ? '跑车' : '嘉年华';
      this.gift({ user: v.name, gift, count: gift === '小心心' ? Math.floor(rand(1, 6)) : 1, id: 'simg' + Math.random() }, 'sim');
    }
  }
}
