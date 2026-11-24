(() => {
  "use strict";
  const C = WorkCore, $ = (s) => document.querySelector(s), esc = C.escape;
  const paths = { mic: "M12 15a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v7a3 3 0 0 0 3 3Zm-7-4v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8", spark: "M12 3 14.5 9.5 21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z", search: "m20 20-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0", table: "M4 4h16v16H4zM4 10h16M10 4v16M4 15h16", slides: "M3 4h18v13H3zM8 22l4-5 4 5M8 9h8M8 12h5", file: "M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8M8 16h6", people: "M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M16 3a4 4 0 0 1 0 8M18 15a4 4 0 0 1 3 4v2", check: "M4 4h16v16H4zM8 12l3 3 6-7", pen: "m4 16-1 5 5-1L21 7l-4-4L4 16Zm10-10 4 4M4 16l4 4", book: "M12 5v16M12 5C9 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-7-2-10 1", home: "m3 10 9-7 9 7v11h-6v-7H9v7H3V10Z", grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z", folder: "M3 6h7l2 3h9v12H3V6Z", settings: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2", clip: "m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l8-8", arrow: "M4 12h16M14 6l6 6-6 6", back: "m15 5-7 7 7 7", close: "m6 6 12 12M6 18 18 6", download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5", plus: "M12 4v16M4 12h16", shield: "M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6" };
  const icon = (n) => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'.concat(paths[n] || paths.spark, '"/></svg>');
  let config = { hasKey: false, base: "https://api.deepseek.com", model: "deepseek-flash", confirm: false, search: true, big: false };
  try {
    if (window.Android) config = JSON.parse(Android.getConfig());
    else config = { ...config, ...JSON.parse(localStorage.getItem("preview-config") || "{}") };
  } catch (e) {
  }
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem("work-history") || "[]");
    if (!Array.isArray(history)) history = [];
  } catch (e) {
  }
  let page = "home", selected = C.skills[0], draft = "", attachments = [], importing = false, viewed = null, sources = [], lastSaved = null;
  let chatIds = [], pendingTurn = null, chatContextFiles = [], chatStickBottom = true;
  try {
    const ids = JSON.parse(localStorage.getItem("work-chat-v1") || "[]");
    if (Array.isArray(ids)) chatIds = ids.filter((id) => history.some((h) => h.id === id)).slice(-30);
  } catch (e) {
  }
  if (chatIds.length) {
    const last = history.find((h) => h.id === chatIds[chatIds.length - 1]);
    selected = C.skills.find((s) => s.id === (last == null ? void 0 : last.skill)) || selected;
  }
  let pending = /* @__PURE__ */ new Map(), seq = 0, toastTimer;
  let searchNote = "", voicePending = null;
  const busy = () => !!voicePending || ["optimizing", "executing"].includes(pipeline.state);
  function toast(s) {
    $("#toast").textContent = s;
    $("#toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 4500);
  }
  function nativeRequest(action, body) {
    return new Promise((resolve, reject) => {
      if (!window.Android) return reject(Error("当前为浏览器界面预览；请在 Android 安装包中连接 API。"));
      const id = String(++seq);
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(Error("请求超时，请检查网络后重试这一步。"));
      }, 21e4);
      pending.set(id, { resolve, reject, timer });
      Android.request(id, action, JSON.stringify(body));
    });
  }
  window.onNative = function(e) {
    if (e.type === "voice") {
      if (!voicePending || String(e.id) !== voicePending.id) return;
      voicePending = null;
      if (e.keyboard) {
        render();
        if (page === "home") {
          const input = $("#prompt");
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
          setTimeout(() => {
            if (page === "home" && window.Android && typeof Android.showVoiceKeyboard === "function") Android.showVoiceKeyboard();
          }, 150);
        }
        toast(e.message || "请点击输入法键盘上的麦克风进行语音输入。");
        return;
      }
      if (e.error || e.cancelled) {
        render();
        toast(e.error || "已取消语音输入，原有文字已保留。");
        return;
      }
      const merged = WorkVoice.appendDraft(draft, e.text);
      draft = merged.text;
      render();
      if (page === "home") {
        const input = $("#prompt");
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
      toast(merged.truncated ? "输入框最多12000字，已保留可容纳的文字，请检查后发送。" : merged.added ? "语音文字已填入，请确认后发送。" : "没有识别到文字，请再说一次。");
    }
    if (e.type === "response") {
      const p = pending.get(e.id);
      if (!p) return;
      clearTimeout(p.timer);
      pending.delete(e.id);
      e.error ? p.reject(Error(e.error)) : p.resolve(e.data);
    }
    if (e.type === "attachments") {
      importing = false;
      for (const a of e.files || []) {
        if (attachments.length < 6) attachments.push(a);
      }
      render();
      if (e.error) toast(e.error);
      else toast("附件已读入，发送时会交给 AI。");
    }
    if (e.type === "importCancelled") {
      importing = false;
      render();
    }
    if (e.type === "export") {
      toast(e.error || (e.cancelled ? "已取消保存" : "文件已保存到您选择的位置。"));
    }
    if (e.type === "config") {
      config = e.config;
      render();
      toast("设置已保存，API Key 已在本机加密。");
    }
  };
  async function transport(stage, payload) {
    if (stage === "execute") {
      searchNote = "";
      const query = payload.originalPrompt || pipeline.prompt;
      if (C.needsSearch(payload.skill, query, payload.prompt)) {
        if (config.search) {
          try {
            const r = await nativeRequest("search", { query: Array.from(query).slice(0, 128).join("") });
            sources = Array.isArray(r.results) ? r.results : [];
            if (!sources.length) searchNote = "本次联网检索没有返回可核实来源，不能声称已查到真实记录。";
          } catch (e) {
            sources = [];
            searchNote = "本次联网检索未完成：" + e.message + "。以下只能基于现有材料整理，缺少已核实记录时保留空表。";
            toast("检索未完成，将明确说明并保留可用的文档结构。");
          }
        } else searchNote = "联网检索已关闭；以下内容未联网核验，只能基于已有资料整理。";
      }
    }
    const body = { model: config.model, messages: C.messages(stage, { ...payload, sources: stage === "optimize" ? [] : sources, searchNote: stage === "optimize" ? "" : searchNote }), max_tokens: stage === "optimize" ? 1800 : 1e4, stream: false, thinking: { type: "disabled" } };
    if (stage !== "optimize") body.response_format = { type: "json_object" };
    const response = await nativeRequest("chat", body);
    const choice = response.choices && response.choices[0];
    if (!choice) throw Error("接口没有返回有效内容。");
    if (choice.finish_reason === "length") throw Error("内容超出单次长度，请缩小任务或页数后重试。");
    return choice.message.content || "";
  }
  const pipeline = new C.Pipeline(transport, () => {
    var _a;
    try {
      localStorage.setItem("work-running", JSON.stringify({ prompt: pipeline.prompt || "", skill: (_a = pipeline.skill) == null ? void 0 : _a.id, optimized: pipeline.optimized || "", state: pipeline.state }));
    } catch (e) {
    }
    render();
  });
  function persistHistory() {
    try {
      localStorage.setItem("work-history", JSON.stringify(history));
    } catch (e) {
      toast("本机存储已满，请先导出并删除部分历史成果。");
    }
  }
  function saveResult(r) {
    if (searchNote && !sources.length) r.summary = searchNote + "\n\n" + r.summary;
    sources = sources.map((s) => ({ title: s.title, url: s.url, date: s.date }));
    const entry = { id: Date.now(), date: (/* @__PURE__ */ new Date()).toLocaleString("zh-CN"), skill: pipeline.skill.id, prompt: pipeline.prompt, optimized: pipeline.optimized, result: r, sources, attachmentNames: (pendingTurn == null ? void 0 : pendingTurn.attachmentNames) || [] };
    history.unshift(entry);
    history = history.slice(0, 30);
    lastSaved = entry.id;
    persistHistory();
    chatIds.push(entry.id);
    chatIds = chatIds.filter((id) => history.some((h) => h.id === id)).slice(-30);
    pendingTurn = null;
    persistChat();
    localStorage.removeItem("work-running");
    chatStickBottom = true;
    render();
  }
  function persistChat() {
    try {
      localStorage.setItem("work-chat-v1", JSON.stringify(chatIds));
    } catch (e) {
    }
  }
  function contextExcerpt(value, limit) {
    const text = String(value || "");
    return text.length <= limit ? text : text.slice(0, Math.floor(limit / 2)) + "\n[长内容中段已节选；需要原文时请重新提供]\n" + text.slice(-Math.floor(limit / 2));
  }
  function beginTask(prompt, skill, files = [], seed = null) {
    const entries = chatIds.map((id) => history.find((h) => h.id === id)).filter(Boolean), seedIndex = seed ? entries.findIndex((h) => h.id === seed.id) : -1;
    const contextEntries = (seed ? seedIndex >= 0 ? entries.slice(0, seedIndex + 1) : [seed] : entries).slice(-8);
    const retained = seed ? [] : chatContextFiles;
    const seen = /* @__PURE__ */ new Set();
    chatContextFiles = [...files, ...retained].filter((a) => {
      if (seen.has(a)) return false;
      seen.add(a);
      return true;
    }).slice(0, 6);
    const material = chatContextFiles.slice();
    if (contextEntries.length) {
      const text = contextEntries.map((h, i) => "第".concat(i + 1, "轮\n用户原话：").concat(contextExcerpt(h.prompt, 3e3), "\n已确认的优化需求：").concat(contextExcerpt(h.optimized, 1e3), "\nAI成果：").concat(contextExcerpt(C.resultText(h.result), i === contextEntries.length - 1 ? 18e3 : 1e3))).join("\n\n");
      material.push({ name: "上一版工作成果与对话记录", text, note: "近期最多8轮对话，包含用户约束、确认后的需求与成果，长内容有节选标记。以用户当前消息为准；改变话题时不沿用旧任务。", images: [] });
    }
    pendingTurn = { prompt, skill: skill.id, attachmentNames: files.map((a) => a.name) };
    draft = "";
    attachments = [];
    sources = [];
    lastSaved = null;
    viewed = null;
    page = "home";
    chatStickBottom = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    run(() => pipeline.start(prompt, skill, material, config.confirm));
  }
  async function run(fn) {
    try {
      const r = await fn();
      if (r) saveResult(r);
    } catch (e) {
      toast(e.message);
    }
  }
  function nav() {
    return '<nav aria-label="主导航">'.concat([["home", "home", "工作台"], ["skills", "grid", "工作流"], ["history", "folder", "我的成果"], ["settings", "settings", "设置"]].map(([id, i, t]) => '<button data-nav="'.concat(id, '" class="').concat(page === id || page === "task" && id === "home" ? "active" : "", '" ').concat(page === id ? 'aria-current="page"' : "", ">").concat(icon(i)).concat(t, "</button>")).join(""), "</nav>");
  }
  function top() {
    return '<header class="topbar"><div class="brand"><span class="logo">'.concat(icon("spark"), '</span>AI工作</div><button class="icon-button" data-nav="settings" aria-label="API 与显示设置">').concat(icon("settings"), "</button></header>");
  }
  function attachmentList() {
    return attachments.map((a, i) => {
      var _a;
      return '<div class="attachment">'.concat(icon(((_a = a.images) == null ? void 0 : _a.length) ? "file" : "clip"), "<div><strong>").concat(esc(a.name), "</strong><small>").concat(esc(a.note || "已读取文字"), '</small></div><button data-remove="').concat(i, '" aria-label="移除 ').concat(esc(a.name), '" ').concat(busy() ? "disabled" : "", ">").concat(icon("close"), "</button></div>");
    }).join("");
  }
  function composer() {
    return '<section class="chat-composer" aria-label="聊天输入栏"><div class="compose-box"><div class="compose-header"><button class="chat-skill" data-nav="skills" aria-label="选择工作流">'.concat(icon(selected.icon), "<strong>").concat(selected.name, '</strong><span>⌄</span></button><button id="chat-search" class="chat-search" type="button" aria-pressed="').concat(!!config.search, '" aria-label="联网搜索：').concat(config.search ? "开" : "关", '" title="开启后按需求联网检索；关闭后只使用已有资料" ').concat(busy() ? "disabled" : "", ">").concat(icon("search"), "<span>联网搜索：").concat(config.search ? "开" : "关", '</span></button><button class="chat-example" id="example">填入示例</button></div><div id="attachments">').concat(attachmentList(), '</div><textarea id="prompt" aria-label="您想完成什么工作" maxlength="12000" rows="1" placeholder="发消息，或添加文件、图片、视频…">').concat(esc(draft), '</textarea><div class="compose-actions"><button id="attach" class="attach-btn" aria-label="添加资料" ').concat(busy() || importing ? "disabled" : "", ">").concat(icon("clip")).concat(importing ? "正在读取…" : "添加资料", '</button><button id="voice-input" class="voice-btn" type="button" aria-label="语音输入" aria-busy="').concat(!!voicePending, '" ').concat(busy() || importing ? "disabled" : "", ">").concat(icon("mic"), "<span>").concat(voicePending ? "正在识别…" : "语音输入", '</span></button><span class="chat-two-step">先优化 · 再执行</span><button id="start" class="primary" aria-label="发送消息" ').concat(busy() || importing || pipeline.state === "review" ? "disabled" : "", ">发送</button></div></div></section>");
  }
  function userMessage(prompt, names = []) {
    return '<div class="chat-user-row"><div class="chat-user"><p>'.concat(esc(prompt), "</p>").concat(names.length ? '<div class="chat-file-names">'.concat(names.map((n) => "<span>".concat(icon("clip")).concat(esc(n), "</span>")).join(""), "</div>") : "", "</div></div>");
  }
  function home() {
    const entries = chatIds.map((id) => history.find((h) => h.id === id)).filter(Boolean);
    return '<header class="chat-header"><div class="chat-identity"><span class="chat-avatar">'.concat(icon("spark"), '</span><div><strong>AI工作</strong><span>您的 AI 工作助手</span></div></div><button id="new-task" class="chat-new" aria-label="新对话" ').concat(busy() ? "disabled" : "", ">").concat(icon("plus"), '<span>新对话</span></button></header><section id="chat-timeline" class="chat-timeline" role="log" aria-label="对话记录" aria-live="polite">').concat(!entries.length && !pendingTurn ? '<div class="chat-welcome"><span class="chat-welcome-icon">'.concat(icon("spark"), '</span><h1>今天有什么可以帮您？</h1><p>直接说需求，资料、表格、PPT 和 PDF<br>都可以在这里完成。</p><button class="secondary" data-nav="skills">选择工作流 ').concat(icon("arrow"), "</button></div>") : "").concat(entries.map((h) => {
      var _a;
      return '<section class="chat-turn" data-chat-entry="'.concat(h.id, '">').concat(userMessage(h.prompt, h.attachmentNames || []), '<div class="chat-ai-row"><span class="chat-avatar">').concat(icon("spark"), '</span><div class="chat-ai"><div class="chat-author">AI工作 <small>').concat(((_a = C.skills.find((s) => s.id === h.skill)) == null ? void 0 : _a.name) || "工作成果", '</small></div><details class="optimized"><summary>查看优化后的需求</summary><p>').concat(esc(h.optimized || h.prompt), "</p></details>").concat(resultHtml(h.result, h.sources), "</div></div></section>");
    }).join("")).concat(pendingTurn ? task() : "", "</section>").concat(composer());
  }
  function skills() {
    return "".concat(top(), '<div class="eyebrow">BUILT-IN SKILLS</div><h1>选个顺手的工作流</h1><p class="lead">不必琢磨提示词，专业步骤已经为您备好。</p><div class="list">').concat(C.skills.map((s) => '<button class="workflow" data-use="'.concat(s.id, '"><span class="ico" style="color:').concat(s.color, '">').concat(icon(s.icon), "</span><div><h3>").concat(s.name, "</h3><p>").concat(s.description, '</p><span class="tagline">').concat(s.tag, " · ").concat(s.format.toUpperCase(), " 成果 ↗</span></div></button>")).join(""), "</div>");
  }
  function settings() {
    return "".concat(top(), '<div class="eyebrow">MAKE IT YOURS</div><h1>简单设置，安心使用</h1><p class="lead">填入您自己的 DeepSeek API Key，即可开始。</p><form id="config-form"><section class="card"><h3>连接 DeepSeek</h3><span class="badge">').concat(config.hasKey ? "已保存 API Key" : "尚未连接", '</span><div class="field"><label for="api-key">API Key</label><input id="api-key" type="password" autocomplete="off" autocapitalize="off" placeholder="').concat(config.hasKey ? "已加密保存，留空则保持不变" : "粘贴您的 API Key", '"></div><button type="button" id="show-key" class="small">显示 / 隐藏本次输入的 Key</button><div class="field"><label for="api-base">API 地址（HTTPS）</label><input id="api-base" type="url" value="').concat(esc(config.base), '" spellcheck="false"></div><div class="field"><label for="model">模型名称</label><input id="model" value="').concat(esc(config.model), '" spellcheck="false"></div><p class="hint">默认模型支持图片。更换模型或接入其他兼容服务后，图片与联网能力取决于该服务。</p><button type="submit" class="primary wide">保存设置</button><button type="button" id="test-api" class="secondary wide" style="margin-top:12px">检测已保存的连接</button><div id="connection-status" class="statusline" role="status"></div></section><section class="card"><h3>按您的习惯来</h3><div class="toggle-row"><label for="confirm">执行前先让我确认<p>AI 优化完，您可以修改需求再执行。</p></label><input id="confirm" type="checkbox" ').concat(config.confirm ? "checked" : "", '></div><div class="toggle-row"><label for="search-toggle">信息查询使用联网检索<p>调用 DeepSeek 搜索接口，可能额外计费。</p></label><input id="search-toggle" type="checkbox" ').concat(config.search ? "checked" : "", '></div><div class="toggle-row"><label for="big">更大字体<p>让文字更清楚，阅读更轻松。</p></label><input id="big" type="checkbox" ').concat(config.big ? "checked" : "", '></div><p class="hint">修改偏好后，请点上方“保存设置”。</p></section></form><section class="card"><h3>资料与隐私</h3><p class="hint">API Key 使用手机系统密钥加密，不内置于安装包。任务文字、附件解析内容及图像会发送至您设置的 API 服务；历史成果仅保存在本机，最多 30 条。附件不写入历史，建议及时导出重要成果。</p><hr class="divider"><p class="hint">图片：视觉理解。PDF：前 8 页转图。视频：均匀抽取 6 帧，不含音频识别。文件：TXT / MD / CSV / JSON / DOCX / XLSX / PPTX。每个文件最多 25 MB；Office 仅提取文字、数值或公式缓存，不运行宏，不读取旧版 DOC / XLS / PPT。</p><hr class="divider"><button id="delete-key" class="secondary wide">删除本机 API Key</button><p class="hint" style="margin-top:14px">AI工作 2.3.4 · Android 8.0 及以上<br>AI 生成内容请结合实际核对后使用。</p></section>');
  }
  function resultHtml(r, src) {
    var _a;
    return '<article class="result"><h2>'.concat(esc(r.title), "</h2><p>").concat(esc(r.summary), "</p>").concat((r.sections || []).map((s) => "<h3>".concat(esc(s.heading), "</h3><p>").concat(esc(s.body), "</p>")).join("")).concat(r.table ? '<h3>工作表</h3><div class="table-wrap"><table><thead><tr>'.concat(r.table.columns.map((c) => "<th>".concat(esc(c), "</th>")).join(""), "</tr></thead><tbody>").concat(r.table.rows.map((row) => "<tr>".concat(row.map((c) => "<td>".concat(esc(c), "</td>")).join(""), "</tr>")).join(""), "</tbody></table></div>") : "").concat((r.slides || []).map((s, i) => '<div class="card"><span class="eyebrow">SLIDE '.concat(String(i + 1).padStart(2, "0"), "</span><h3>").concat(esc(s.title), "</h3><ul>").concat(s.bullets.map((b) => "<li>".concat(esc(b), "</li>")).join(""), "</ul>").concat(s.notes ? '<details><summary class="small">查看本页讲稿</summary><p class="small">'.concat(esc(s.notes), "</p></details>") : "", "</div>")).join("")).concat((src == null ? void 0 : src.length) ? '<div class="sources"><h3>检索来源</h3>'.concat(src.filter((s) => /^https?:\/\//i.test(s.url)).map((s, i) => '<a href="'.concat(esc(s.url), '" rel="noreferrer">[').concat(i + 1, "] ").concat(esc(s.title), " ↗</a>")).join(""), "</div>") : "", '</article><div class="export-row">').concat(r.table ? '<button class="primary" data-export="xlsx">导出 Excel</button>' : "").concat(((_a = r.slides) == null ? void 0 : _a.length) ? '<button class="primary" data-export="pptx">导出 PPT</button>' : "", '<button class="secondary" data-export="pdf">导出 PDF</button><button class="secondary" data-export="txt">导出文字</button></div><p class="note">点击导出后，在系统窗口选择文件的保存位置。</p>');
  }
  function refineBox() {
    return '<section class="card"><h3>还想改一改？</h3><textarea id="refine-text" aria-label="继续修改这份成果" maxlength="6000" placeholder="比如：语言再简洁些，补一段下周计划…"></textarea><button id="refine" class="primary wide" '.concat(busy() ? "disabled" : "", ">继续修改 ").concat(icon("arrow"), '</button><p class="note">携带当前成果，重新完成“优化需求 → 执行”两步。</p></section>');
  }
  function task() {
    var _a;
    const state = pipeline.state;
    return '<section class="chat-turn" data-active-chat>'.concat(userMessage(pipeline.prompt, (pendingTurn == null ? void 0 : pendingTurn.attachmentNames) || []), '<div class="chat-ai-row"><span class="chat-avatar">').concat(icon("spark"), '</span><div class="chat-ai"><div class="chat-author">AI工作 <small>').concat(((_a = pipeline.skill) == null ? void 0 : _a.name) || selected.name, "</small></div>").concat(state === "optimizing" ? '<div class="chat-progress"><span class="spinner"></span><div>正在优化您的需求…<small>第 1 步，共 2 步</small></div></div>' : "").concat(pipeline.optimized ? '<details class="optimized" '.concat(state === "review" ? "open" : "", "><summary>已优化的需求 · 可查看</summary>").concat(state === "review" ? '<textarea id="optimized" class="review-input" aria-label="编辑优化后的需求">'.concat(esc(pipeline.optimized), '</textarea><button id="execute" class="primary wide">用这份需求开始制作 ').concat(icon("arrow"), "</button>") : "<p>".concat(esc(pipeline.optimized), "</p>"), "</details>") : "").concat(state === "executing" ? '<div class="chat-progress"><span class="spinner"></span><div>'.concat(pipeline.repairing ? "正在补全成果结构…" : "正在制作您的工作成果…", "<small>第 2 步，共 2 步 · 请保持 App 打开</small></div></div>") : "").concat(state === "error" ? '<div class="card error"><h3>这一步没有完成</h3><p>'.concat(esc(pipeline.error), "</p>").concat(pipeline.partialResult ? '<details class="optimized"><summary>查看已返回的文字（结构未完成）</summary><p>'.concat(esc(C.resultText(pipeline.partialResult)), "</p></details>") : "", '<button id="retry" class="primary">重试这一步</button><p class="note">只继续失败的步骤。连接设置仍在“设置”页。</p></div>') : "").concat(state === "done" && pipeline.result ? resultHtml(pipeline.result, sources) : "", "</div></div></section>");
  }
  function updateChatLayout() {
    const main = $(".chat-page"), navBar = $("nav");
    if (!main || !navBar) return;
    main.style.height = Math.max(200, window.innerHeight - navBar.getBoundingClientRect().height) + "px";
  }
  function sizeInput() {
    const input = $("#prompt");
    if (!input) return;
    input.style.height = "auto";
    input.style.height = Math.min(112, Math.max(38, input.scrollHeight)) + "px";
  }
  function historyPage() {
    if (viewed) {
      const s = C.skills.find((s2) => s2.id === viewed.skill);
      return '<div class="titlebar"><button id="back-history" class="back" aria-label="返回成果列表">'.concat(icon("back"), '</button><h2>工作成果</h2></div><p class="small">').concat(esc(viewed.date), " · ").concat((s == null ? void 0 : s.name) || "工作成果", "</p>").concat(resultHtml(viewed.result, viewed.sources)).concat(refineBox());
    }
    return "".concat(top(), '<div class="eyebrow">YOUR WORK, WELL DONE</div><h1>每一份成果，都在这里</h1><p class="lead">本机保存最近 30 份成果，随时查看和导出。</p>').concat(!history.length ? '<div class="empty">'.concat(icon("folder"), '<h3>还没有工作成果</h3><p class="small">从一句简单的需求开始，<br>第一份成果很快就会出现在这里。</p><button class="primary" data-nav="home" style="margin-top:24px">去完成一项工作</button></div>') : history.map((h) => {
      var _a;
      return '<div class="history"><button data-history="'.concat(h.id, '"><span class="pill">').concat(((_a = C.skills.find((s) => s.id === h.skill)) == null ? void 0 : _a.name) || "工作成果", "</span><h3>").concat(esc(h.result.title), "</h3><p>").concat(esc(h.date), ' · 点击查看与导出 ↗</p></button><button class="delete" data-delete="').concat(h.id, '">删除这份本机记录</button></div>');
    }).join(""));
  }
  function render() {
    const scroll = window.scrollY, old = $("#chat-timeline"), oldTop = (old == null ? void 0 : old.scrollTop) || 0, nearBottom = !old || old.scrollHeight - old.scrollTop - old.clientHeight < 100;
    document.body.classList.toggle("bigtext", !!config.big);
    document.body.classList.toggle("chat-mode", page === "home");
    $("#app").innerHTML = '<main class="page '.concat(page === "home" ? "chat-page" : "", '">').concat(({ home, skills, settings, task, history: historyPage }[page] || home)(), "</main>").concat(nav());
    bind();
    updateChatLayout();
    sizeInput();
    const timeline = $("#chat-timeline");
    if (timeline) {
      timeline.scrollTop = chatStickBottom || nearBottom ? timeline.scrollHeight : oldTop;
      chatStickBottom = false;
      window.scrollTo(0, 0);
    } else window.scrollTo(0, scroll);
  }
  function navigate(to) {
    page = to === "task" ? "home" : to;
    viewed = null;
    render();
    window.scrollTo(0, 0);
  }
  function bind() {
    document.querySelectorAll("[data-nav]").forEach((b) => b.onclick = () => navigate(b.dataset.nav));
    document.querySelectorAll("[data-skill]").forEach((b) => b.onclick = () => {
      selected = C.skills.find((s) => s.id === b.dataset.skill);
      render();
    });
    document.querySelectorAll("[data-use]").forEach((b) => b.onclick = () => {
      if (busy() || pipeline.state === "review") {
        navigate("task");
        return toast("请先完成当前任务。");
      }
      selected = C.skills.find((s) => s.id === b.dataset.use);
      navigate("home");
      setTimeout(() => {
        var _a;
        return (_a = $("#prompt")) == null ? void 0 : _a.focus();
      }, 50);
    });
    if ($("#prompt")) $("#prompt").oninput = (e) => {
      draft = e.target.value;
      sizeInput();
    };
    if ($("#chat-search")) $("#chat-search").onclick = () => {
      if (busy()) return;
      const enabled = !config.search;
      try {
        if (window.Android) {
          if (!Android.setSearchEnabled(enabled)) throw Error("联网搜索设置保存失败，请重试。");
        } else localStorage.setItem("preview-config", JSON.stringify({ ...config, search: enabled }));
        config.search = enabled;
        render();
        toast(enabled ? "已开启联网搜索" : "已关闭联网搜索");
      } catch (e) {
        toast(e.message || "联网搜索设置保存失败，请重试。");
      }
    };
    if ($("#example")) $("#example").onclick = () => {
      draft = selected.example;
      $("#prompt").value = draft;
      sizeInput();
      $("#prompt").focus();
    };
    if ($("#voice-input")) $("#voice-input").onclick = () => {
      if (busy() || importing) return;
      if (!window.Android || typeof Android.startVoiceInput !== "function") return toast("请在新版手机安装包中使用语音输入。");
      voicePending = { id: String(++seq) };
      render();
      try {
        Android.startVoiceInput(voicePending.id);
      } catch (e) {
        voicePending = null;
        render();
        toast("语音输入未能启动，请再试一次。");
      }
    };
    if ($("#attach")) $("#attach").onclick = () => {
      if (!window.Android) return toast("请在 Android 安装包中添加资料。");
      if (attachments.length >= 6) return toast("最多添加 6 个附件，请先移除部分资料。");
      importing = true;
      render();
      Android.pickAttachments(6 - attachments.length);
    };
    document.querySelectorAll("[data-remove]").forEach((b) => b.onclick = () => {
      attachments.splice(+b.dataset.remove, 1);
      render();
    });
    if ($("#start")) $("#start").onclick = () => {
      if (busy() || pipeline.state === "review") return toast("请先完成当前任务。");
      if (!draft.trim()) return toast("请先写一句您想完成的工作。");
      if (!config.hasKey) {
        navigate("settings");
        return toast("先填入 API Key，保存后就能开始。");
      }
      beginTask(draft, selected, attachments.slice());
    };
    if ($("#execute")) $("#execute").onclick = () => run(() => pipeline.execute($("#optimized").value));
    if ($("#retry")) $("#retry").onclick = () => run(() => pipeline.retry());
    if ($("#new-task")) $("#new-task").onclick = () => {
      if (busy()) return;
      pipeline.state = "idle";
      pipeline.result = null;
      pipeline.optimized = "";
      pendingTurn = null;
      chatIds = [];
      chatContextFiles = [];
      draft = "";
      attachments = [];
      sources = [];
      persistChat();
      localStorage.removeItem("work-running");
      navigate("home");
    };
    document.querySelectorAll("[data-history]").forEach((b) => b.onclick = () => {
      viewed = history.find((h) => h.id === +b.dataset.history);
      render();
      window.scrollTo(0, 0);
    });
    if ($("#back-history")) $("#back-history").onclick = () => {
      viewed = null;
      render();
    };
    document.querySelectorAll("[data-delete]").forEach((b) => b.onclick = () => {
      if (confirm("删除这份本机记录？已经导出的文件不会被删除。")) {
        history = history.filter((h) => h.id !== +b.dataset.delete);
        persistHistory();
        render();
      }
    });
    document.querySelectorAll("[data-export]").forEach((b) => b.onclick = () => {
      const owner = b.closest("[data-chat-entry]"), entry = owner ? history.find((h) => h.id === +owner.dataset.chatEntry) : null;
      const r = (entry == null ? void 0 : entry.result) || (viewed == null ? void 0 : viewed.result) || pipeline.result;
      const src = (entry == null ? void 0 : entry.sources) || (viewed == null ? void 0 : viewed.sources) || sources;
      if (!r) return;
      if (!window.Android) return toast("文件导出需在 Android 安装包中使用。");
      Android.exportFile(b.dataset.export, JSON.stringify({ ...r, sources: src }));
      toast("正在准备文件，请选择保存位置…");
    });
    if ($("#refine")) $("#refine").onclick = () => {
      const edit = $("#refine-text").value.trim();
      if (!edit) return toast("请写下您想调整的地方。");
      if (!config.hasKey) {
        navigate("settings");
        return toast("请先保存 API Key。");
      }
      if (busy() || pipeline.state === "review") {
        navigate("home");
        return toast("请先完成当前任务。");
      }
      const entry = viewed || { result: pipeline.result, prompt: pipeline.prompt, optimized: pipeline.optimized };
      selected = C.skills.find((s) => s.id === ((viewed == null ? void 0 : viewed.skill) || pipeline.skill.id)) || selected;
      beginTask("请基于上一版工作成果，按以下修改要求重新给出完整版本：" + edit, selected, [], entry);
    };
    if ($("#show-key")) $("#show-key").onclick = () => $("#api-key").type = $("#api-key").type === "password" ? "text" : "password";
    if ($("#config-form")) $("#config-form").onsubmit = (e) => {
      e.preventDefault();
      try {
        const base = $("#api-base").value.trim().replace(/\/+$/, "");
        const u = new URL(base);
        if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash) throw Error("API 地址须为 HTTPS，且不包含账号、查询参数或片段。");
        const model = $("#model").value.trim();
        if (!model) throw Error("请填写模型名称。");
        const key = $("#api-key").value.trim();
        if (base !== config.base && config.hasKey && !key) throw Error("更换 API 地址时，请重新输入用于该服务的 Key。");
        const c = { base, model, confirm: $("#confirm").checked, search: $("#search-toggle").checked, big: $("#big").checked, key };
        if (window.Android) Android.saveConfig(JSON.stringify(c));
        else {
          config = { ...c, hasKey: !!key || config.hasKey };
          delete config.key;
          localStorage.setItem("preview-config", JSON.stringify(config));
          render();
          toast("已保存预览设置；实际连接请使用 APK。");
        }
      } catch (e2) {
        toast(e2.message);
      }
    };
    if ($("#test-api")) $("#test-api").onclick = async () => {
      const b = $("#test-api"), status = $("#connection-status");
      b.disabled = true;
      status.textContent = "正在检测已保存的 Key 与模型…";
      try {
        await nativeRequest("chat", { model: config.model, messages: [{ role: "user", content: "请只回复：连接成功" }], max_tokens: 64, thinking: { type: "disabled" } });
        status.textContent = "连接成功，可以开始工作。";
      } catch (e) {
        status.textContent = e.message;
      } finally {
        b.disabled = false;
      }
    };
    if ($("#delete-key")) $("#delete-key").onclick = () => {
      if (confirm("删除手机上保存的 API Key？")) {
        if (window.Android) Android.deleteKey();
        else {
          config.hasKey = false;
          localStorage.setItem("preview-config", JSON.stringify(config));
          render();
        }
      }
    };
  }
  try {
    const interrupted = JSON.parse(localStorage.getItem("work-running") || "null");
    if (interrupted && interrupted.state !== "done" && interrupted.state !== "idle") {
      draft = interrupted.prompt || "";
      selected = C.skills.find((s) => s.id === interrupted.skill) || selected;
      setTimeout(() => toast("上次任务被中断，原始需求已恢复；请重新添加附件后开始。"), 500);
      localStorage.removeItem("work-running");
    }
  } catch (e) {
  }
  window.addEventListener("resize", updateChatLayout);
  window.workmateBack = function() {
    if (page === "home") return false;
    navigate("home");
    return true;
  };
  render();
})();
