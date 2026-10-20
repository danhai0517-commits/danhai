# 开心农场

明亮的程序化 Three.js 卡通农场，包含不规则地形、池塘、菜园、谷仓、风车、果树、围栏、独轮车与散落的小物件。六种动物全部由几何体建模，使用卡通光照、手绘纹理与实时阴影。旧的鹈鹕动画保留在 `pelican.html`。

## 运行

**直接玩：下载最新版 `index.html`，双击即可打开。** 这个文件已经包含全部样式、Three.js 和游戏代码，无需安装 Node.js，也无需下载其他文件或联网。请使用支持 WebGL 2 的最新版 Chrome、Edge 或 Firefox；启动失败时页面会显示原因和重试按钮。

也可以通过静态服务器访问。需要 Node.js 18 或更新版本：

```sh
cd /workspace/danhai
npm run dev
```

在浏览器打开服务器输出的端口（默认 3000）。也可以用 `python3 -m http.server 3000` 提供静态服务，或把 `index.html` 放到自己的静态网站。

Three.js **0.186.1** 的源码模块已保存在 `vendor/`，并打包进 `index.html`，运行时无需 npm 安装或访问 CDN。第三方许可证见 `vendor/THREE-LICENSE.txt`，打包文件也保留版权声明。

双击本地文件和通过网站打开时，浏览器可能分别保存存档；部分浏览器不允许本地文件保存数据，页面会提示，但仍可游玩。

## 玩法

- 拖动下方食物到动物身上，或先点击食物，再点击动物。匹配动物口味才会消耗食物并奖励 15 农场币；同一动物有 2 秒咀嚼时间。
- 兔子吃胡萝卜，牛羊吃青草，小鸡吃玉米，小猪吃苹果，小鸭吃谷物。库存耗尽后，点击对应食物可用 20 农场币补充 10 份。
- 在动物市场购买新伙伴，实际扣除余额并加入场景，最多 24 位。每日喂食 5 次可获得一次 150 农场币奖励。
- 点击动物打招呼；拖动场景旋转，滚轮或按钮缩放；支持重置视角、下载农场截图和可选互动音效。
- 农场币、经验、食物库存、动物和当日目标使用 localStorage 保存。浏览器清除网站数据会删除该存档。
- 手机端点顶部「弹幕」打开互动面板，触屏拖动或点击也可喂食。

## 弹幕互动与抖音接入

当前应用提供本地弹幕输入、自动模拟与 WebSocket 接口，**尚未连接真实抖音直播间**。真实直播需要你提供经授权的弹幕数据服务。应用不会自行获取抖音账号、cookie、签名或直播凭据。

支持命令：`喂食 兔子`、`喂食 牛`、`喂食 小猪`、`跳舞`、`下雨`、`浇水`、`爱心`、`点赞`、`买 羊`、`购买 小鸭`。每个观众的互动命令冷却 2.5 秒；消息 ID 去重保留最近 500 条。跳舞、下雨和爱心各奖励 8 农场币，购买命令使用当前农场的钱包。

将授权弹幕服务的事件转换为以下格式，通过页面接口发送：

```js
window.HappyFarm.receiveDanmaku({
  user: '向日葵同学',
  text: '喂食 兔子',
  id: 'unique-message-id'
});
```

也可以连接自己的 WebSocket 桥接服务，每个文本帧发送一个上述 JSON 对象：

```js
window.HappyFarm.connectDanmaku('wss://your-authorized-service.example/danmaku');
window.HappyFarm.disconnectDanmaku();
```

地址由你主动提供，默认不联网。HTTPS 页面需要 WSS 服务；连接失败会显示提示，不会自动重连。支持 `getState()` 获取存档副本。观众文本按普通文本渲染，禁止注入 HTML。

本地币和存档是休闲玩法数据，不适用于有真实价值的付费或礼物结算；这类场景需由服务端验证事件与余额。

## 文件

- `index.html`：可独立运行的完整游戏，由构建脚本生成。
- `index.template.html` / `style.css`：界面模板与响应式样式源码。
- `farm.js`：程序化建模、动画、喂食、市场、存档及弹幕适配。
- `startup.js`：启动状态与失败提示。
- `build.mjs`：使用 esbuild 生成单文件 HTML，避免本地 ES 模块加载限制。
- `server.mjs`：开发静态服务器，可通过 `PORT` 指定端口。
- `vendor/`：固定版本的 Three.js、OrbitControls、几何合并工具及许可证。

修改源码后，需要重新生成 `index.html`：

```sh
npm ci
npm run build
npm run check
```

`npm run check` 检查脚本语法和生成文件是否与源码一致。开发时在支持 WebGL 2 的浏览器中验证动画和交互；静态场景按材质合并，降低丰富物件的绘制开销，移动端限制渲染像素比。

---

# 抢包子大作战（`baozi/`）

第二个独立的抖音弹幕互动 3D 游戏，与开心农场共用 `vendor/` 里的 Three.js，构建产物是单文件 `baozi/index.html`，双击即可打开，无需服务器。

## 运行

```bash
npm run build:baozi        # 生成 baozi/index.html
npm run check:baozi        # 语法 + 打包检查
npm run dev                # 启动静态服务器后访问 http://localhost:3000/baozi/index.html
```

页面是固定 1080×1920 逻辑竖屏舞台，会按窗口自适应等比缩放，适合直播伴侣/OBS 以 9:16 画布采集。

## 玩法

- 场景是夜市包子铺，竞技场是一只巨型竹蒸笼，分 **A 红 / B 蓝 / C 绿 / D 紫** 四个扇区，中央大厨定时掀盖出锅。
- 弹幕发 `A` / `B` / `C` / `D` 或「加入A」「红队」等，即可生成带名字的 Q 版包子侠，永久在场、跨回合保留。
- 包子侠自动抢包子并运回本队竹篓计分：普通包子 1 分、肉包 3 分、辣包子 2 分并加速、金包子 10 分（扛着变慢）、超级大包子 50 分。
- 个人战功 5 / 15 / 35 升到 L2 / L3 / L4：更快、能同时扛 1 → 3 个包子，并换上帽子与光环。
- 弹幕指令：`冲` / `抢` 冲刺（2 秒冷却）、`666` / `加油` 全队加速、`跳舞` 表情、`点赞` 累计每 50 次掉一个包子。
- 馋嘴老鼠会定时扑向领先队的竹篓偷分，附近包子侠或英雄会自动揍回，老鼠数量随难度增加。
- 每轮 3 分钟，难度与积分倍率随时间 ×1.0 → ×2.0；结算展示冠军队、前三名领奖台，8 秒后自动开下一轮。
- 礼物映射（见 `baozi/src/config.js` 的 `GIFTS`）：小心心→全队加油；玫瑰→本队包子雨；棒棒糖→全队冲锋；甜甜圈→本轮英雄；爱你→金包子雨；跑车→永久英雄 + 全队升级；嘉年华→超级大包子 + 烟花。

快捷键：`H` 隐藏/显示界面，`/` 或回车打开弹幕面板，`O` 开关描边后处理。

## 弹幕接入

页面自带「本地模拟」和手动输入面板用于演示。接入真实直播间请在弹幕面板填入你自备的授权 WebSocket 服务地址，或通过以下 API 推送：

```js
window.BaoziGame.receiveDanmaku({ user: '观众昵称', text: 'A', id: '可选的去重 id' });
window.BaoziGame.receiveGift({ user: '观众昵称', gift: '玫瑰', count: 1 });
window.BaoziGame.receiveLike({ user: '观众昵称', count: 10 });
window.BaoziGame.connectDanmaku('wss://your-authorized-service/ws'); // 消息为 JSON：{type:'danmaku'|'gift'|'like', user, text|gift|count}
window.BaoziGame.disconnectDanmaku();
window.BaoziGame.getState(); // 当前回合、队伍分、观众战功、包子/老鼠/英雄数量
```

与开心农场一样，本项目**不包含**任何抓取抖音数据、模拟登录或处理账号凭据的代码。

## 文件

- `baozi/index.template.html` / `baozi/style.css` / `baozi/startup.js`：竖屏 HUD 模板、样式、加载与错误提示。
- `baozi/src/main.js`：渲染器、相机、主循环、UI 事件、`window.BaoziGame` API。
- `baozi/src/world.js`：程序化夜市包子铺场景（蒸笼竞技场、灯笼、招牌、碗筷等），静态物件合批。
- `baozi/src/actors.js`：包子侠、英雄、大厨、老鼠、包子、竹篓建模与动画。
- `baozi/src/game.js`：组队、抢包子、运送、升级、老鼠、礼物、回合结算等核心逻辑。
- `baozi/src/danmaku.js`：弹幕指令解析、礼物别名、WebSocket 接入、本地自动模拟。
- `baozi/src/hud.js`：HUD、战功榜、事件流、结算面板。
- `baozi/src/art.js` / `outline.js` / `effects.js` / `audio.js`：手绘贴图与卡通材质、深度描边后处理、粒子特效、合成音效。
- `baozi/build.mjs`：esbuild 打包成单文件 `baozi/index.html`。
