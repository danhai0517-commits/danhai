import * as THREE from 'three';
import { TEAMS, GIFTS, COMMAND_HELP } from './config.js';

const $ = id => document.getElementById(id);
const STAGE_W = 1080, STAGE_H = 1920;
const esc = s => String(s);
function avatarEl(name, color, cls = 'avatar') { const a = document.createElement('span'); a.className = cls; a.style.background = color; a.textContent = (name || '?').slice(0, 1); return a; }
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

export class Hud {
  constructor(camera) {
    this.camera = camera; this.stage = $('stage'); this.floatLayer = $('float-layer'); this.feed = $('event-feed'); this.hidden = false; this.lastDom = 0;
    this.teamBoard = $('team-board'); this.rankList = $('rank-list'); this.toastTimer = 0;
    for (const team of TEAMS) {
      const row = el('div', 'team-row'); row.dataset.team = team.id;
      const tag = el('span', 'team-tag', team.id); tag.style.background = team.color; row.append(tag, el('small', null, team.name), el('span', 'team-score', '0')); this.teamBoard.append(row);
    }
    const quick = $('quick-commands'); for (const c of COMMAND_HELP) { const b = el('button', null, `${c.text} · ${c.desc}`); b.type = 'button'; b.dataset.text = c.text; quick.append(b); }
    const gifts = $('quick-gifts'); for (const [name, g] of Object.entries(GIFTS)) { const b = el('button', 'gift', `${g.icon} ${name}`); b.type = 'button'; b.dataset.gift = name; gifts.append(b); }
    $('hide-button').addEventListener('click', () => this.setHidden(true)); $('show-button').addEventListener('click', () => this.setHidden(false));
  }
  setHidden(hidden) { this.hidden = hidden; $('hud').classList.toggle('hidden', hidden); $('show-button').hidden = !hidden; }
  project(pos) { const v = new THREE.Vector3(pos.x, (pos.y || 0) + 1.6, pos.z).project(this.camera); return [(v.x + 1) / 2 * STAGE_W, (1 - v.y) / 2 * STAGE_H]; }
  float(pos, text, cls = '') {
    if (this.floatLayer.children.length > 40) this.floatLayer.firstChild.remove();
    const [x, y] = this.project(pos); const e = el('div', 'float-text ' + cls, text); e.style.left = x + 'px'; e.style.top = y + 'px'; this.floatLayer.append(e); setTimeout(() => e.remove(), 1300);
  }
  event({ icon, who, what, combo = 0, big = false, small = false, team = null }) {
    const item = el('div', 'event-item' + (big ? ' big' : ''));
    const ic = el('span', 'gift-icon', icon); if (team && icon === team.id) { ic.style.background = team.color; ic.style.color = '#fff'; ic.style.fontWeight = '900'; }
    item.append(ic, el('span', 'who', esc(who)), el('span', 'what', esc(what))); if (combo) item.append(el('span', 'combo', `x${combo}`));
    if (small) item.style.fontSize = '18px';
    this.feed.prepend(item);
    while (this.feed.children.length > 4) this.feed.lastChild.remove();
    setTimeout(() => { item.classList.add('fade'); setTimeout(() => item.remove(), 500); }, big ? 12000 : 7000);
  }
  toast(text, ms = 2600) { const t = $('toast'); t.textContent = text; t.hidden = false; clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { t.hidden = true; }, ms); }
  update(game, now) {
    if (now - this.lastDom < 120) return; this.lastDom = now;
    $('round-no').textContent = game.round; $('bun-count').textContent = game.bunsReleased; $('bun-total').textContent = game.bunTotal;
    $('bun-progress').style.width = Math.min(100, game.bunsReleased / Math.max(1, game.bunTotal) * 100) + '%';
    $('difficulty').textContent = game.difficulty.toFixed(2); $('multiplier').textContent = game.multiplier.toFixed(2); $('hero-count').textContent = game.heroCount;
    $('total-score').textContent = game.totalScore.toLocaleString('en-US'); $('unit-count').textContent = game.units.length;
    const lead = Math.max(...game.teams.map(t => t.score));
    for (const row of this.teamBoard.children) { const t = game.teamById[row.dataset.team]; row.querySelector('.team-score').textContent = t.score; row.classList.toggle('leading', lead > 0 && t.score === lead); row.querySelector('small').textContent = `${t.name} · ${t.members}人`; }
    const ranked = [...game.viewers.values()].sort((a, b) => b.score - a.score).slice(0, 5);
    this.rankList.replaceChildren(...(ranked.length ? ranked.map((v, i) => { const li = el('li'); const team = game.teamById[v.teamId]; li.append(el('span', 'medal', ['🥇', '🥈', '🥉', '🎖️', '🎖️'][i]), avatarEl(v.name, team.color), el('span', 'name', v.name), el('span', 'level', `L${v.level}·${v.score}`)); return li; }) : [el('li', 'empty', '等待第一位包子侠加入…')]));
    const rem = game.remaining; $('timer').textContent = `${String(Math.floor(rem / 60)).padStart(2, '0')}:${String(Math.floor(rem % 60)).padStart(2, '0')}`; $('timer-fill').style.width = (rem / 180 * 100) + '%';
    $('join-hint').style.opacity = game.units.length > 20 ? 0.5 : 1;
  }
  showResult({ round, teams, top, tie, teamById }) {
    const panel = $('result'); panel.hidden = false;
    $('result-title').textContent = tie ? '平分秋色，包子大家分！' : `${teams[0].name} 夺得第 ${round} 轮包子王！`;
    const order = [top[1], top[0], top[2]];
    $('podium').replaceChildren(...order.map((v, i) => { const slot = el('div', 'podium-slot'); if (!v) { slot.append(el('div', 'pname', '—'), el('div', 'block', ['2', '1', '3'][i])); return slot; } const team = teamById[v.teamId]; slot.append(avatarEl(v.name, team.color), el('div', 'pname', v.name), el('div', 'pscore', `本轮战功 ${v.roundScore} · L${v.level}`), el('div', 'block', ['2', '1', '3'][i])); return slot; }));
    $('result-teams').replaceChildren(...teams.map(t => { const d = el('div'); d.style.background = t.color; d.append(el('span', null, `${t.id} ${t.name}`), el('b', null, t.score)); return d; }));
  }
  resultCountdown(n) { $('result-countdown').textContent = Math.max(0, n); }
  hideResult() { $('result').hidden = true; }
}
