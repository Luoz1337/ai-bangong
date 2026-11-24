# AI工作 Android 源码

Java 原生 Activity / WebView / HTTPS / Keystore / 系统文件选择器 / 原生 PDF；纯 Java OOXML 写入器生成 XLSX 与 PPTX。所有界面资源已包含在 APK，运行时不依赖 CDN、Node 或自建服务。

## 构建

Windows，JDK 17，Android SDK platform 34 和 build-tools 34.0.0。

```powershell
$env:ANDROID_HOME='E:\AndroidSdk'
npm install
.\build.ps1
```

脚本默认在源码目录的上一级 `build` 文件夹生成 APK 及本地签名证书。可以通过 `-Sdk`、`-BuildDir`、`-OutputApk` 参数更改。现在构建依赖 Node 和 esbuild：先转译、仅发布副本压缩 JS，再四层加密打包资源，最后用 R8 缩减并混淆 Java。每次构建使用独立 release 时间戳目录，保留 mapping.txt，避免旧 class 混入。

构建脚本生成的签名只适用于本地侧载。保管 `local-signing.p12`，后续覆盖更新必须复用原证书。该私钥未包含在源码压缩包中；重新生成不同证书的包无法直接覆盖本次交付的 APK。发布到应用商店之前，请设置您自己的正式签名、包名与版本策略。

## 修改界面和 Skill

- `web-src/core.js`：8 个 Skill、示例、模型指令、JSON 校验、两阶段状态机。
- `skills/prompt-enhancer.md`：Prompt Enhancer 办公适配版的来源、规则与验证边界。全部 8 个工作流在需求优化阶段共用，不新增菜单或请求轮次。
- `web-src/app.js`：界面与交互、原生桥调用、成果历史、修改与重试。
- `assets/style.css`：深色设计、大字模式、响应式布局。
- `assets/chat.css`：仅用于工作台的聊天布局、消息气泡、固定输入栏及键盘适配；不改变另外三个页面。
- `assets/polish.css` / `assets/motion.js`：独立视觉动效层，负责页面和消息入场、面板展开/收起、按钮及提示反馈；不访问 API 或修改业务状态。软件界面为深海蓝/冰蓝配色，文档导出版式不随 UI 换色。
- `src/cn/gongzuodazi/app/MainActivity.java`：Android 生命周期、原生桥、异步 API、保存/选择文件。
- `AttachmentReader.java`：文本、Office、图片、PDF、视频抽帧。
- `OfficeWriter.java`：真实 XLSX/PPTX 的 ZIP/XML 生成。
- `DocumentExporter.java`：PDF、TXT 导出和文件生成调度。
- `KeyVault.java`：Android Keystore AES-GCM 加密。
- `SecretEnvelope.java` / `LayeredCrypto.java`：API Key 四层独立数据密钥加密、Keystore 信封封装及认证数据绑定。旧记录首次实际使用时迁移，新记录写入并校验成功后才清理旧记录。设置页的已保存状态不解密 Key。
- `AssetVault.java` / `ProtectedPage.java`：仅在内存中解包、内联资源与随机 nonce CSP；保留旧 file origin 和历史记录。`tools/PackAssets.java` 为构建工具，资源解锁密钥和用户 API Key 分离。
- `assets/density.css` / `assets/compact.css`：四页适度缩小字号、间距和卡片；聊天框高度约减少22.5%。保留大字体和主要操作44px点击区域。

修改 `web-src` 后，在源码目录执行：

```powershell
npm install
npm run build:web
.\build.ps1
```

脚本转译为 Chrome / Android WebView 61+ 可运行的语法。修改 CSS、Java 或资源 XML 后直接重新构建即可。

## 联网搜索

聊天输入栏有“联网搜索：开 / 关”按钮，点击立即保存，与设置页同一偏好同步；不触发 API 调用，不更改 Key。开启后按原始口语需求及优化后的任务书判断检索需要，关闭后只使用已有资料。明确不联网和只整理本地附件的需求不触发检索。

复现修复：原先“武汉这边有哪些鲜食工厂，整理成表格”因不含“查询”等固定关键词而漏掉检索；现已补齐口语清单识别，并把优化后的任务书传入判定。

## 语音输入与 vivo 兼容

聊天输入栏的“语音输入”按钮把最终识别文字追加到已有草稿，用户确认后自行发送。取消、失败、重复或过期回调不会覆盖草稿；不自动调用 DeepSeek，不在 App 中保存录音。系统语音组件可能使用自身网络服务，联网搜索开关仅控制资料检索，不控制语音组件是否联网。

兼容顺序：Android 系统识别界面 → 可发现且已启用的 RecognitionService → 打开系统输入法并提示点击键盘麦克风。不硬编码小米、vivo 或 Google 包名。直接使用 RecognitionService 时才申请本 App 的麦克风权限；外部识别界面使用其自身权限。Android 11+ 已声明 Activity 和 Service 的可见性查询。权限拒绝、无匹配结果、网络错误和识别超时均给出提示；后台退出时清理本 App 启动的识别服务。

vivo/OriginOS 机型是否开放标准语音接口取决于系统配置，未开放时需要用户再点输入法麦克风。没有连接 vivo 真机，未宣称全机型或真实识别准确率已验证。

`assets/roundness.css` 是独立圆角层：胶囊按钮、24px 卡片、18px 表单输入框、28px 聊天输入容器。只改 border-radius，不改颜色、间距、字体或业务逻辑。

## 测试

```powershell
npm test
```

浏览器测试需安装 package.json 中的开发依赖；Chrome 路径可用 `CHROME_PATH` 环境变量指定。先在一个终端启动：

```powershell
python -m http.server 8775 --bind 127.0.0.1 --directory assets
```

另一个终端运行：

```powershell
npm run test:ui
```

UI 测试明确使用测试夹具，不访问真实 DeepSeek。测试会把截图写入当前目录 outputs。Office 独立测试：

```powershell
New-Item -ItemType Directory -Force testclasses | Out-Null
javac -encoding UTF-8 -d testclasses src/cn/gongzuodazi/app/OfficeWriter.java tests/OfficeWriterTest.java
java -cp testclasses OfficeWriterTest office-test
python -m pip install openpyxl python-pptx
python tests/verify_office.py office-test
```

聊天布局与其他三个页面保持不变的检查可执行 `node tests/chat-layout.test.cjs`（同样需要先启动本地测试服务器）。

冷色与动效回归可执行 `node tests/visual-polish.test.cjs`：逐项检查四个页面的原布局尺寸和文字、受保护的业务文件哈希（保护基线包含已授权的优化器、联网修复、聊天开关和语音接入，首页几何基线随新增按钮更新，另外三个页面的布局和文字保持原值，圆角层不改变几何；独立 prompt-enhancer 测试仍逐项对照原执行/修复消息与其他生产文件）、展开/收起中间帧、同页重绘不重复淡入、减少动态效果支持。

所有真实 API Key 都在安装后由用户输入。不要把 Key 写入源码、测试或版本库。已在 Android 13 真机检查安装、启动、聊天/键盘布局、工作流入口和更新后保存 Key 的状态指示；按用户要求未读取 Key 或调用真实 API。PDF、附件阅读与系统保存仍需要在目标手机上完整回归。浏览器测试使用测试夹具，不替代真实 API 测试。

联网路由与按钮回归：`npm run test:search-ui`、`npm run test:search-button`；先启动上述本地服务器。测试响应均为夹具，不读取或调用真实 Key。

语音与圆角回归：`npm run test:voice-ui`、`npm run test:roundness`；先启动本地测试服务器。`npm test` 包含语音草稿追加的长度和 Unicode 边界测试。

本次 29 项单元测试和 8 项浏览器回归命令通过。真机已覆盖安装并确认语音入口可见；独立测试 APK 的安装被手机拒绝，所以 `tests/VoiceInstrumentation.java` 对应的原生回填测试未执行。识别文字回填/取消/失败已用浏览器固定结果验证，不等于真实语音识别测试。用户明确表示不在手机身边，语音和 vivo 真机效果由用户自行测试，不再继续操作手机。

## 2026-11-02 本次更新边界

新增 density、compact、protected-bootstrap 浏览器回归和真实 JCA 加密测试。此前真机结论不代表本次加密/混淆包已在手机验证。本次未操作手机、未读取真实 API Key、未发出真实 AI 请求；Android Keystore 旧记录迁移、真机性能及原生导出仍需用户自行验收。

保护属于四层 AES-256-GCM **UI资源加密加载**、API Key 信封加密及 R8/JS 混淆，不是四种商业 DEX/虚拟机壳。资源解锁材料必须随应用存在，可被逆向分析；API Key 的根密钥留在 Android Keystore，硬件后备取决于设备。运行请求期间仍会短暂存在明文 Key，并非抵御已控制运行进程的绝对保护。额外计算开销已尽量控制，不能把桌面 JCA 测量等同于手机零性能影响。

vivo 语音状态：用户没有 SDK。官方 [JoviKit SpeechSDK 文档](https://developers.vivo.com/doc/d/4338b892cab5461abf78a79c97dba788) 确有 `ASREngine` 与 vivo-only IPC 模式，但公开资料未给可下载 SpeechSDK AAR/JAR、IPC 准入契约和机型系统兼容表。[接入流程](https://developers.vivo.com/doc/d/0c980c184ceb4e7ca1708bc177635e29) 需开发者账号及应用创建。此次没有接入该 SDK；现有系统识别/键盘回退原样保留，不等于 vivo 问题已修复。
