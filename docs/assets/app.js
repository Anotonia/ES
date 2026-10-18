(() => {
  "use strict";

  const DATA_URL = "assets/content.json";
  const VOCAB_URL = "https://raw.githubusercontent.com/Anotonia/ES/main/data/vocabulary_master.csv";
  const STORAGE_KEY = "eslab-review-v1";
  const DAYS = [1, 3, 7, 14, 30, 60];
  const viewNames = {
    scenarios: "生活场景",
    detail: "场景课程",
    vocabulary: "分级词库",
    colloquial: "地道口语",
    maps: "语义与词族图",
    review: "记忆复习"
  };
  const state = {
    data: null, vocab: null, vocabError: "",
    domain: "all", scenarioSearch: "", level: "all", vocabSearch: "", vocabLimit: 60,
    slangTopic: "all", slangSearch: "", mapDomain: "school",
    hideTranslations: false, reviewRevealed: false, reviewOffset: 0,
    progress: loadProgress()
  };

  function el(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function normalize(value) {
    return String(value || "").toLocaleLowerCase("es")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }
  function toast(message) {
    const node = el("toast");
    node.textContent = message;
    node.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => node.classList.remove("show"), 3200);
  }
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const value = raw ? JSON.parse(raw) : {};
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) { return {}; }
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
    catch (error) { toast("浏览器拒绝保存本地记录；练习仍可继续。"); }
  }
  function speak(phrase) {
    if (!("speechSynthesis" in window)) {
      toast("当前浏览器不支持语音朗读，请阅读西语文本。"); return;
    }
    const text = String(phrase || "").slice(0, 250).trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES"; utterance.rate = 0.86;
    window.speechSynthesis.speak(utterance);
  }
  function buttonSpeech(es) {
    return '<button class="mini-action" data-action="speak" data-speak="' + esc(es) +
      '" type="button" aria-label="朗读西班牙语">▷ 听西语</button>';
  }
  function domainLabel(id) {
    const item = state.data.domains.find(d => d.id === id);
    return item ? item.name : id;
  }
  function sectionTitle(kicker, title, subtitle) {
    return '<div class="page-heading"><div><span class="overline">' + esc(kicker) +
      '</span><h1 class="page-title">' + esc(title) +
      '</h1><p class="page-subtitle">' + esc(subtitle) +
      '</p></div></div>';
  }
  function showView(view) {
    const actual = view === "detail" ? "detail" : view;
    document.querySelectorAll(".view").forEach(n => n.classList.toggle("is-visible", n.id === "view-" + actual));
    document.querySelectorAll(".nav-link").forEach(n => {
      const selected = n.dataset.route === (view === "detail" ? "scenarios" : view);
      n.classList.toggle("is-active", selected);
      if (selected) n.setAttribute("aria-current", "page");
      else n.removeAttribute("aria-current");
    });
    el("page-crumb").textContent = viewNames[view] || viewNames.scenarios;
    const side = document.querySelector(".sidebar");
    side.classList.remove("mobile-open");
    el("menu-toggle").setAttribute("aria-expanded", "false");
    window.scrollTo({top: 0, behavior:"instant"});
  }
  function route() {
    const raw = decodeURIComponent((location.hash || "#/scenarios").replace(/^#\/?/, ""));
    const parts = raw.split("/");
    if (!state.data) return;
    const view = parts[0] || "scenarios";
    if (view === "scenarios") { showView("scenarios"); renderScenarios(); }
    else if (view === "detail") {
      const item = state.data.scenarios.find(s => s.id === parts[1]);
      if (!item) { location.hash = "#/scenarios"; return; }
      showView("detail"); renderDetail(item);
    }
    else if (view === "vocabulary") { showView(view); renderVocabulary(); }
    else if (view === "colloquial") { showView(view); renderColloquial(); }
    else if (view === "maps") { showView(view); renderMaps(); }
    else if (view === "review") { showView(view); renderReview(); }
    else location.hash = "#/scenarios";
  }
  function domainButtons(active, action) {
    return [{id:"all",name:"全部场景"}].concat(state.data.domains).map(d =>
      '<button type="button" class="seg-btn ' + (active === d.id ? "active" : "") +
      '" data-action="' + action + '" data-value="' + esc(d.id) + '" aria-pressed="' +
      String(active === d.id) + '">' + esc(d.name) + '</button>').join("");
  }
  function renderScenarios() {
    el("domain-filters").innerHTML = domainButtons(state.domain, "domain-filter");
    el("scenario-search").value = state.scenarioSearch;
    const terms = normalize(state.scenarioSearch);
    const filtered = state.data.scenarios.filter(s =>
      (state.domain === "all" || s.domain === state.domain) &&
      normalize([s.title,s.subtitle,s.brief,...s.vocab.map(v => v.es + " " + v.zh)].join(" ")).includes(terms)
    );
    el("scenario-grid").innerHTML = filtered.length ? filtered.map((s,i) =>
      '<button type="button" class="scenario-card" data-action="open-scenario" data-value="' + esc(s.id) + '">' +
      '<div class="sc-head"><span class="number-label">SCENE ' + String(i+1).padStart(2,"0") +
      '</span><span class="domain-pill ' + esc(s.domain) + '">' + esc(domainLabel(s.domain)) + '</span></div>' +
      '<h3>' + esc(s.title) + '</h3><span class="spanish-caption">' + esc(s.subtitle) + '</span><p>' +
      esc(s.brief) + '</p><div class="card-bottom"><small>' + esc(s.level) + ' · ' +
      s.vocab.length + ' 词汇 · ' + s.dialogue.length + ' 句对话</small><strong>开始练习 ↗</strong></div></button>'
    ).join("") : '<div class="empty-state">暂无符合条件的场景。试试不同的关键词。</div>';
  }
  function percent(s) {
    const keys = s.challenges.map((_,i) => s.id + "#" + i);
    const passed = keys.filter(key => (state.progress[key] || {}).streak > 0).length;
    return {passed, total: keys.length, ratio: keys.length ? Math.round(100*passed/keys.length) : 0};
  }
  function renderDetail(s) {
    const p = percent(s);
    const intro = '<div class="page-heading"><div><button class="back-btn" data-action="back" type="button">← 返回场景列表</button>' +
      '<span class="overline">' + esc(domainLabel(s.domain)) + ' · ' + esc(s.level) +
      ' · SCENARIO</span><h1 class="page-title">' + esc(s.title) + '<span class="es">' +
      esc(s.subtitle) + '</span></h1><p class="page-subtitle">' + esc(s.brief) + '</p></div>' +
      '<div class="page-actions"><button class="outline-btn" type="button" data-action="open-map" data-value="' +
      esc(s.domain) + '">⌘ 查看关系图</button></div></div>';
    const vocab = '<section id="lesson-vocab" class="panel"><div class="panel-head"><h2 class="panel-title">01. 场景高频词与词块</h2><span class="panel-caption">' +
      s.vocab.length + ' WORDS / PHRASES</span></div><div class="vocab-tags">' + s.vocab.map(v =>
      '<div class="vocab-tile"><strong>' + esc(v.es) + '</strong><span>' + esc(v.zh) +
      '</span>' + (v.detail ? '<small>' + esc(v.detail) + '</small>' : '') + '</div>').join("") +
      '</div></section>';
    const dialogue = '<section id="lesson-dialogue" class="panel"><div class="panel-head"><h2 class="panel-title">02. 真实交际对话</h2>' +
      '<label class="switch-label"><input type="checkbox" id="translation-toggle" ' +
      (state.hideTranslations ? 'checked ' : '') + '>隐藏中文，练习听懂</label></div>' +
      '<div class="dialogue">' + s.dialogue.map(d =>
      '<div class="dialogue-line"><span class="speaker">' + esc(d.speaker) +
      '</span><div class="bubble"><div class="bubble-es">' + esc(d.es) + ' ' + buttonSpeech(d.es) +
      '</div><div class="bubble-zh" ' + (state.hideTranslations ? 'hidden' : '') + '>' +
      esc(d.zh) + '</div></div></div>').join("") + '</div></section>';
    const expressions = '<section id="lesson-native" class="panel"><div class="panel-head"><h2 class="panel-title">03. 西班牙人实际怎么说</h2>' +
      '<span class="panel-caption">NEUTRAL → NATURAL</span></div>' +
      '<div class="speech-compare">' + s.expressions.map(e =>
      '<div class="compare-item"><div class="compare-heading"><span class="register">' + esc(e.register) +
      '</span><span class="small-note">' + esc(e.zh) + '</span></div><div class="compare-side">' +
      '<div><label>规范 / 标准表达</label><p>' + esc(e.standard) + ' ' + buttonSpeech(e.standard) + '</p></div>' +
      '<div><label>当地自然表达</label><p>' + esc(e.natural) + ' ' + buttonSpeech(e.natural) +
      '</p></div></div><p>使用说明：' + esc(e.note) + '</p></div>').join("") + '</div></section>';
    const challenges = '<section id="lesson-practice" class="panel"><div class="panel-head"><h2 class="panel-title">04. 闭卷主动回忆</h2>' +
      '<span class="panel-caption">RETRIEVAL PRACTICE</span></div><p class="panel-intro">先尝试在心里或口头用西语表达，再揭晓参考答案；相同意思的自然变体也可能正确，请自行判断。</p>' +
      s.challenges.map((q,i) => '<div class="review-question"><div class="prompt">题 ' + (i+1) + ' · ' + esc(q.prompt) +
      '</div><button class="secondary-btn" type="button" data-action="reveal-detail" data-value="' +
      esc(s.id + "#" + i) + '">查看参考表达</button><div class="answer-area" id="answer-' + esc(s.id + "-" + i) +
      '"><strong>示范：</strong>' + esc(q.answer) + ' ' + buttonSpeech(q.answer) +
      '<div class="rating-row"><button type="button" data-action="rate" data-key="' +
      esc(s.id + "#" + i) + '" data-value="remember">✓ 能独立说出</button>' +
      '<button type="button" class="negative" data-action="rate" data-key="' +
      esc(s.id + "#" + i) + '" data-value="again">× 仍需练习</button></div></div></div>'
      ).join("") + '</section>';
    const aside = '<aside class="detail-sidebar learning-aside"><div class="panel highlight"><span class="aside-kicker">LEARNING PROGRESS</span>' +
      '<h3 class="panel-title" style="margin-top:9px">' + p.passed + ' / ' + p.total + ' 已能主动回忆</h3>' +
      '<div class="progress-ring"><div class="fill" style="width:' + p.ratio + '%"></div></div>' +
      '<p class="small-note">只根据你手动标记的结果统计，保存在当前浏览器。</p></div>' +
      '<div class="panel"><h3 class="panel-title" style="margin-bottom:10px">本课导航</h3><div class="aside-links">' +
      '<button class="lesson-link" type="button" data-action="lesson-jump" data-value="lesson-vocab">01 场景词汇 ↗</button><button class="lesson-link" type="button" data-action="lesson-jump" data-value="lesson-dialogue">02 情景对话 ↗</button>' +
      '<button class="lesson-link" type="button" data-action="lesson-jump" data-value="lesson-native">03 母语自然表达 ↗</button><button class="lesson-link" type="button" data-action="lesson-jump" data-value="lesson-practice">04 闭卷回忆 ↗</button></div></div>' +
      '<div class="panel"><span class="aside-kicker">IMPORTANT</span><div class="tip-list"><p>真实办事的材料、收费、申请期限随地区、机构及年份变化；本页只教授交流表达。</p>' +
      '<p>自然口语不一定适用于正式书信或严肃场合，留意每条的语域标注。</p></div></div></aside>';
    el("view-detail").innerHTML = intro + '<div class="detail-layout"><div class="learning-main">' +
      vocab + dialogue + expressions + challenges + '</div>' + aside + '</div>';
  }
  function parseCSV(text) {
    const rows = []; let row = []; let field = ""; let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i+1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (c === "," && !quoted) { row.push(field); field = ""; }
      else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && text[i+1] === "\n") i++;
        row.push(field);
        if (row.some(v => v !== "")) rows.push(row);
        row = []; field = "";
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    const fields = rows.shift().map(x => x.replace(/^\uFEFF/, ""));
    return rows.filter(row => row.length === fields.length).map(r =>
      Object.fromEntries(fields.map((f,i) => [f, r[i]]))
    );
  }
  async function fetchVocab() {
    try {
      const result = await fetch(VOCAB_URL, {cache:"no-cache"});
      if (!result.ok) throw new Error("HTTP " + result.status);
      const rows = parseCSV(await result.text());
      if (!rows.length) throw new Error("词库为空");
      state.vocab = rows;
      el("sync-label").textContent = "正式词库 · " + rows.length + " 条";
    } catch (error) { state.vocabError = "暂时无法加载 GitHub 主词库（" + error.message + "）。仍可学习当前页面的场景词汇。"; }
    if (location.hash.startsWith("#/vocabulary")) renderVocabulary();
  }
  function renderVocabulary() {
    const view = el("view-vocabulary");
    const localCount = state.data.scenarios.reduce((n,s)=>n+s.vocab.length,0);
    const data = state.vocab || state.data.scenarios.flatMap(s => s.vocab.map(v => ({
      level: s.level, unit: s.title, spanish: v.es, meaning_zh: v.zh, example_es:"", id:"scene-" + s.id
    })));
    const filtered = data.filter(row =>
      (state.level === "all" || row.level === state.level) &&
      normalize([row.spanish,row.meaning_zh,row.unit,row.example_es].join(" ")).includes(normalize(state.vocabSearch))
    );
    const rows = filtered.slice(0,state.vocabLimit);
    view.innerHTML = sectionTitle("VOCABULARY DATABASE", "分级核心词库", "直接检索 GitHub 主词库的正式词条；8,000 个频率候选词元尚待审核，不算作已编写的学习词。") +
      '<div class="accent-block"><strong>' + (state.vocab ? data.length + ' 条已编写记录' : '当前离线场景词汇 ' + localCount + ' 条') +
      '</strong>　·　A1–B2 分级筛选 · 中文检索 · 西语例句。' +
      (state.vocabError ? '<br>' + esc(state.vocabError) : "") +
      '<br><a href="https://github.com/Anotonia/ES/blob/main/data/vocabulary_master.csv" target="_blank" rel="noopener noreferrer">查看 GitHub 完整 CSV ↗</a></div>' +
      '<div class="toolbar"><input type="search" id="vocab-search" aria-label="搜索西语、中文或例句" placeholder="输入西语 / 中文释义 / 场景…" value="' +
      esc(state.vocabSearch) + '"><select id="vocab-level" aria-label="筛选 CEFR 等级">' +
      ['all','A1','A2','B1','B2'].map(v => '<option value="' + v + '" ' +
      (state.level === v ? 'selected' : '') + '>' + (v === 'all' ? '所有等级' : v) + '</option>').join("") +
      '</select></div><div class="result-summary">' + filtered.length + ' 条符合条件 · 显示前 ' +
      rows.length + ' 条</div><div class="data-table-wrap"><table class="data-table"><thead><tr>' +
      '<th scope="col">等级</th><th scope="col">词汇 / 词块</th><th scope="col">中文</th><th scope="col">例句</th><th scope="col">情境</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td><span class="level-tag">' + esc(r.level) + '</span></td><td><strong>' +
      esc(r.spanish) + '</strong> ' + buttonSpeech(r.spanish) + '</td><td>' + esc(r.meaning_zh) +
      '</td><td>' + (r.example_es ? esc(r.example_es) + ' ' + buttonSpeech(r.example_es) : '<small>情境词条</small>') +
      '</td><td><small>' + esc(r.unit) + '</small></td></tr>').join("") +
      '</tbody></table></div>' + (filtered.length > rows.length ?
      '<button class="secondary-btn load-more" data-action="load-more" type="button">加载更多词条 ↓</button>' : '');
  }
  function renderColloquial() {
    const list = state.data.colloquial.filter(c =>
      (state.slangTopic === "all" || c.topic === state.slangTopic) &&
      normalize([c.es,c.zh,c.neutral,c.example].join(" ")).includes(normalize(state.slangSearch))
    );
    el("view-colloquial").innerHTML = sectionTitle("NATURAL SPANISH · ESPAÑA", "听得懂，也能自然地说。", "规范表达是基础；口语和俚语要按关系、地区和场合使用。避免把“不正式”误当成“更高级”。") +
      '<div class="accent-block">这里以西班牙当地常见用语为主，分别标注「自然口语」「校园口语」「俚语」以及不适用场合。' +
      ' 学校用语包括 cole、profe、mates、insti 等，正式申请和家校严肃沟通应切换为规范表达。</div>' +
      '<div class="filter-bar"><div class="seg-tabs">' +
      [{id:"all",name:"全部"},{id:"school",name:"学校相关"},{id:"health",name:"健康"},{id:"bank",name:"银行"},{id:"general",name:"日常闲聊"}].map(d =>
        '<button type="button" class="seg-btn ' + (state.slangTopic === d.id ? "active" : "") +
        '" data-action="slang-filter" data-value="' + d.id + '" aria-pressed="' + (state.slangTopic === d.id) +
        '">' + d.name + '</button>').join("") +
      '</div><label class="search-box"><span>⌕</span><input id="slang-search" aria-label="搜索口语表达" placeholder="搜索本地说法…" value="' +
      esc(state.slangSearch) + '"></label></div><div class="colloquial-grid">' +
      (list.length ? list.map(c => '<article class="slang-card"><span class="register">' + esc(c.register) +
        ' · España</span><h3>' + esc(c.es) + ' ' + buttonSpeech(c.es) + '</h3><p class="meaning">' +
        esc(c.zh) + '</p><p class="baseline">较中性的说法：' + esc(c.neutral) +
        '</p><blockquote>' + esc(c.example) + '</blockquote><div class="usage"><div>✓ 适用：' +
        esc(c.use) + '</div><div class="avoid">! 注意：' + esc(c.avoid) +
        '</div></div></article>').join("") : '<div class="empty-state">没有符合条件的表达。</div>') +
      '</div>';
  }
  function renderMaps() {
    const domain = state.data.domains.find(d => d.id === state.mapDomain) || state.data.domains[0];
    const sc = state.data.scenarios.filter(s=>s.domain === domain.id);
    const branches = sc.map(s =>
      '<div class="mind-row"><span class="mind-arrow">⟶</span><div class="mind-node">' + esc(s.title) +
      '<small>' + esc(s.subtitle) + '</small></div><span class="mind-arrow">⟶</span>' +
      '<div class="mind-leaves">' + s.vocab.slice(0,3).map(v =>
      '<div class="mind-leaf"><button type="button" data-action="open-scenario" data-value="' +
      esc(s.id) + '">' + esc(v.es) + ' <span style="color:#a1b1a1">↗</span></button></div>').join("") +
      '</div></div>').join("");
    const family = state.data.families.filter(f=>state.mapDomain === "school" ? f.group === "school" :
      f.group === state.mapDomain || f.group === "general");
    el("view-maps").innerHTML = sectionTitle("SEMANTIC NETWORKS / WORD FAMILIES", "不是词表，是有联系的语言。", "点击右侧词汇进入对应生活场景；词族关系帮助扩词，但构词并不是任意套用的公式。") +
      '<div class="map-layout"><div class="map-sidebar">' + state.data.domains.map(d =>
      '<button type="button" class="' + (d.id === domain.id ? "active" : "") +
      '" data-action="map-domain" data-value="' + esc(d.id) + '">' + esc(d.name) + '</button>').join("") +
      '</div><div><div class="map-canvas"><div class="mind-root"><div class="mind-center">' + esc(domain.name) +
      '<small>' + esc(domain.es) + '</small></div><div class="mind-branches">' +
      branches + '</div></div></div><p class="legend">思维导图用于归纳与联想；记忆训练请关掉图后，回忆每条分支并自己造句。点击词汇可以打开相关场景。</p></div></div>' +
      '<div class="section-title-block" style="margin-top:40px"><div><span class="overline">MORPHOLOGY CONNECTIONS</span>' +
      '<h2>真实的词根词缀与词族<span class="heading-dash">.</span></h2><p>从一个词扩展到一组相关词，和实际使用的句子绑定记忆。</p></div></div>' +
      '<div class="family-grid">' + family.map(f =>
      '<article class="family-card"><div class="base">' + esc(f.base) +
      ' ↓</div><div class="derived">' + esc(f.derived) + ' ' + buttonSpeech(f.derived) +
      '</div><div class="relation">' + esc(f.relation) + '</div><small>' + esc(f.zh) +
      '</small><small><em>' + esc(f.example) + '</em></small></article>').join("") +
      '</div><div class="footnote-callout">更多 Mermaid 可编辑脑图已提交到 <a href="https://github.com/Anotonia/ES/tree/main/mindmaps" target="_blank" rel="noopener noreferrer">GitHub / mindmaps ↗</a>。</div>';
  }
  function allReviewItems() {
    return state.data.scenarios.flatMap(s => s.challenges.map((q,i)=> ({
      key:s.id + "#" + i, topic:s.title, prompt:q.prompt, answer:q.answer
    })));
  }
  function dueItems() {
    const now = Date.now();
    return allReviewItems().filter(q => {
      const record = state.progress[q.key];
      return !record || !record.next || Number(record.next) <= now;
    });
  }
  function renderReview() {
    const all = allReviewItems(); const due = dueItems();
    const practiced = all.filter(x=>state.progress[x.key]).length;
    const mastered = all.filter(x=>(state.progress[x.key]||{}).streak >= 2).length;
    const item = due[state.reviewOffset % (due.length || 1)];
    el("view-review").innerHTML = sectionTitle("ACTIVE RECALL / SPACED REVIEW", "别只是“看懂”，练到能脱口而出。", "根据中文情境自己说西语，再打开参考表达，自评是否能独立回忆。记录仅保存在当前浏览器。") +
      '<div class="review-dashboard"><div class="review-stat"><strong>' + due.length +
      '</strong><span>当前可复习的题目</span></div><div class="review-stat"><strong>' + practiced +
      '</strong><span>已做过的题目</span></div><div class="review-stat"><strong>' + mastered +
      '</strong><span>连续成功至少两次</span></div></div>' +
      (item ? '<div class="study-card"><h3>' + esc(item.topic) +
      '</h3><p class="study-prompt">' + esc(item.prompt) +
      '</p>' + (state.reviewRevealed ?
       '<div class="answer-area visible"><span class="small-note">示范答案（可能有其他正确说法）</span><p class="study-answer">' +
       esc(item.answer) + ' ' + buttonSpeech(item.answer) +
       '</p><div class="rating-row"><button type="button" data-action="rate-review" data-value="remember" data-key="' +
       esc(item.key) + '">✓ 我能独立说出</button><button type="button" data-action="rate-review" class="negative" data-value="again" data-key="' +
       esc(item.key) + '">× 需要重练</button></div></div>' :
       '<button class="primary-btn" type="button" data-action="reveal-review">我已想好 · 查看答案 →</button>') +
       '</div>' :
       '<div class="review-end"><h2>今天没有到期待复习题</h2><p>新的场景题已学完，已复习项目将按间隔重新出现。</p>' +
       '<button class="secondary-btn" type="button" data-action="reset-review">重置本地练习进度</button></div>') +
      '<div class="footnote-callout"><strong>复习规则：</strong>首次成功建议 1 天后复习，再逐渐延长至 3 / 7 / 14 / 30 / 60 天；答错缩短复习间隔。' +
      '这个日程是教学默认值，不是对每个人都最优。浏览器本地数据不会自动同步到 GitHub 或其他设备。</div>';
  }
  function rate(key, value) {
    const prev = state.progress[key] || {streak:0,attempts:0};
    const streak = value === "remember" ? (prev.streak || 0) + 1 : 0;
    const days = value === "remember" ? DAYS[Math.min(streak - 1,DAYS.length - 1)] : 0;
    state.progress[key] = {
      streak, attempts: (prev.attempts || 0) + 1,
      last: Date.now(),
      next: Date.now() + (days ? days*86400000 : 12*3600000),
      lastRating: value
    };
    saveProgress();
    toast(value === "remember" ? "已记入复习计划 · " + days + " 天后再练" : "已标记为需要强化 · 下次优先练习");
  }
  function bindEvents() {
    window.addEventListener("hashchange", route);
    el("start-school").addEventListener("click", () => {
      state.domain="school";location.hash="#/scenarios";renderScenarios();
      el("scenario-grid").scrollIntoView({behavior:"smooth",block:"start"});
    });
    el("menu-toggle").addEventListener("click", () => {
      const side = document.querySelector(".sidebar");
      side.classList.toggle("mobile-open");
      el("menu-toggle").setAttribute("aria-expanded", String(side.classList.contains("mobile-open")));
    });
    el("scenario-search").addEventListener("input", e => {
      state.scenarioSearch=e.target.value;renderScenarios();
    });
    document.addEventListener("input", e => {
      if (e.target.id === "vocab-search") {
        const cursor = e.target.selectionStart;
        state.vocabSearch=e.target.value;state.vocabLimit=60;renderVocabulary();
        const input=el("vocab-search");input.focus();input.setSelectionRange(cursor,cursor);
      }
      if (e.target.id === "slang-search") {
        const cursor=e.target.selectionStart;state.slangSearch=e.target.value;renderColloquial();
        const input=el("slang-search");input.focus();input.setSelectionRange(cursor,cursor);
      }
    });
    document.addEventListener("change", e => {
      if (e.target.id === "translation-toggle") {
        state.hideTranslations=e.target.checked;
        document.querySelectorAll("#view-detail .bubble-zh").forEach(n => { n.hidden=state.hideTranslations; });
      }
      if (e.target.id === "vocab-level") {
        state.level=e.target.value;state.vocabLimit=60;renderVocabulary();
      }
    });
    document.addEventListener("click", e => {
      const b=e.target.closest("[data-action]");
      if (!b) return;
      const action=b.dataset.action, value=b.dataset.value;
      if (action === "speak") return speak(b.dataset.speak);
      if (action === "lesson-jump") { const destination = el(value); if (destination) destination.scrollIntoView({behavior:"smooth",block:"start"}); return; }
      if (action === "domain-filter") { state.domain=value;renderScenarios(); }
      if (action === "open-scenario") location.hash="#/detail/"+value;
      if (action === "back") location.hash="#/scenarios";
      if (action === "open-map") {state.mapDomain=value;location.hash="#/maps";}
      if (action === "slang-filter") {state.slangTopic=value;renderColloquial();}
      if (action === "map-domain") {state.mapDomain=value;renderMaps();}
      if (action === "load-more") {state.vocabLimit+=60;renderVocabulary();}
      if (action === "reveal-detail") {
        const [scenario,idx]=value.split("#");
        const answer=el("answer-"+scenario+"-"+idx);
        if (answer) {answer.classList.toggle("visible");b.textContent=answer.classList.contains("visible")?"收起参考表达":"查看参考表达";}
      }
      if (action === "rate") {
        rate(b.dataset.key,value);
        const s=state.data.scenarios.find(s=>b.dataset.key.startsWith(s.id+"#"));
        if(s) renderDetail(s);
      }
      if (action === "reveal-review") {state.reviewRevealed=true;renderReview();}
      if (action === "rate-review") {
        rate(b.dataset.key,value);state.reviewRevealed=false;state.reviewOffset=0;renderReview();
      }
      if (action === "reset-review") {
        if (window.confirm("确定清空本浏览器保存的全部练习记录？此操作无法撤销。")) {
          state.progress={};saveProgress();state.reviewOffset=0;state.reviewRevealed=false;renderReview();
        }
      }
    });
  }
  async function init() {
    bindEvents();
    try {
      const response=await fetch(DATA_URL,{cache:"no-cache"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const obj=await response.json();
      if(!Array.isArray(obj.scenarios)||!Array.isArray(obj.domains))throw new Error("内容结构错误");
      state.data=obj;
      route();fetchVocab();
    } catch (error) {
      el("scenario-grid").innerHTML='<div class="empty-state">无法读取学习资料。请从 GitHub Pages 网站地址访问，不要直接双击 HTML 文件。' +
        '<p>' + esc(error.message) + '</p></div>';
      el("sync-label").textContent="载入失败";
    }
  }
  init();
})();
