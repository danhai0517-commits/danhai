// Gameplay constants, teams, bun types, danmaku commands and gift mapping.
export const ARENA_RADIUS = 10;
export const CENTER_RADIUS = 2.4;
export const BASKET_RADIUS = 7.9;
export const ROUND_SECONDS = 180;
export const RESULT_SECONDS = 8;
export const MAX_UNITS = 140;
export const MAX_BUNS = 90;
export const COMMAND_COOLDOWN = 2;
export const LIKES_PER_BUN = 50;

export const TEAMS = [
  { id: 'A', name: '红队', color: '#ff6b57', dark: '#c0392b', light: '#ffb3a6', dir: [-1, -1] },
  { id: 'B', name: '蓝队', color: '#4fa6ff', dark: '#2a6fc4', light: '#b3d7ff', dir: [1, -1] },
  { id: 'C', name: '绿队', color: '#6fd36f', dark: '#3c9a44', light: '#bdf0bd', dir: [-1, 1] },
  { id: 'D', name: '紫队', color: '#b57bff', dark: '#7a4ccc', light: '#dcc6ff', dir: [1, 1] },
];
export const TEAM_BY_ID = Object.fromEntries(TEAMS.map(t => [t.id, t]));
export const TEAM_ALIASES = { 红: 'A', 红队: 'A', 蓝: 'B', 蓝队: 'B', 绿: 'C', 绿队: 'C', 紫: 'D', 紫队: 'D' };

export const BUN_TYPES = {
  plain: { name: '包子', value: 1, weight: 60, color: '#fff6e6', tip: '#f3dcc0', scale: 1, slow: 1 },
  meat: { name: '肉包', value: 3, weight: 24, color: '#ffeedb', tip: '#c98a4b', scale: 1.12, slow: 1 },
  spicy: { name: '辣包子', value: 2, weight: 9, color: '#ff8a6a', tip: '#d33b2a', scale: 1.05, slow: 1, dash: true },
  gold: { name: '金包子', value: 10, weight: 7, color: '#ffd35a', tip: '#e39a1b', scale: 1.25, slow: 0.72 },
  super: { name: '超级大包子', value: 50, weight: 0, color: '#ffe08a', tip: '#ff7a3d', scale: 2.4, slow: 0.5 },
};

export const LEVELS = [
  { level: 1, need: 0, speed: 1, capacity: 1, scale: 1 },
  { level: 2, need: 5, speed: 1.14, capacity: 1, scale: 1.1 },
  { level: 3, need: 15, speed: 1.26, capacity: 2, scale: 1.2 },
  { level: 4, need: 35, speed: 1.36, capacity: 3, scale: 1.3 },
];

// Gift names follow common Douyin gifts; `effect` keys are handled in game.js.
export const GIFTS = {
  小心心: { icon: '💗', aliases: ['心心', 'heart', '爱心'], effect: 'cheer', label: '送出 全队加油鼓', tier: 1 },
  玫瑰: { icon: '🌹', aliases: ['rose', '花'], effect: 'bunRain', label: '送出 蒸笼雨', tier: 1 },
  棒棒糖: { icon: '🍭', aliases: ['lollipop'], effect: 'teamDash', label: '送出 辣椒冲锋', tier: 2 },
  甜甜圈: { icon: '🍩', aliases: ['donut'], effect: 'hero', label: '召唤 英雄包子侠', tier: 3 },
  爱你: { icon: '💞', aliases: ['loveyou'], effect: 'goldRain', label: '送出 金包子雨', tier: 3 },
  跑车: { icon: '🏎️', aliases: ['car', '豪车'], effect: 'heroForever', label: '英雄 永久加入 + 全队升级', tier: 4 },
  嘉年华: { icon: '🎡', aliases: ['carnival'], effect: 'superBun', label: '召唤 超级大包子 + 烟花', tier: 5 },
};

export const COMMAND_HELP = [
  { text: 'A', desc: '加入红队' }, { text: 'B', desc: '加入蓝队' }, { text: 'C', desc: '加入绿队' }, { text: 'D', desc: '加入紫队' },
  { text: '冲', desc: '个人冲刺' }, { text: '666', desc: '全队加油' }, { text: '跳舞', desc: '表情动作' }, { text: '点赞', desc: '模拟 50 个赞' },
];

export const SIM_NAMES = ['小笼包', '葡萄', '奶茶不加糖', '星星', '柠檬汽水', '椰蓉球', '桃花酿', '小熊软糖', '豆沙包', '辣条侠', '芒果布丁', '云朵', '糯米团子', '西瓜汁', '芝士焗饭', '可乐', '花卷', '麻薯', '蛋黄酥', '蟹黄包', '叉烧包', '黑芝麻汤圆', '椒盐月饼', '芋泥啵啵', '栗子', '核桃酥', '龟苓膏', '糖葫芦', '桂花糕', '绿豆冰', '酸梅汤', '奶黄包', '虾饺', '烧卖', '肠粉', '油条', '豆浆', '生煎', '锅贴', '馄饨'];
