/* app.js */
/* ==========================================================================
   龙高考 · 商业版 — 应用逻辑
   数据：黑龙江省招生考试院 2024–2026 年普通类（本/专/提前批）与艺术类（本/专科）平行志愿投档分数线 / 一分段统计表
   会员体系：账号与志愿表接入云服务（手机验证码 / 微信授权登录，数据云端同步）；支付流程仍为模拟
   ========================================================================== */
(function () {
  'use strict';

  var D = window.GK_DATA;
  var YZ = window.YZ_DATA || { majors: [], majorCats: [], news: [] };
  var META = D.meta;
  var SCHOOLS = D.schools;   // [name, code, prov, city, lv]
  var GROUPS = D.groups;     // [si, kind, gcode, gno, score, rank, req, types, batch, yearIdx, art]
  var SEG_ALL = D.seg;
  var YEARS = META.years || [META.latest];
  var YIDX = {};
  YEARS.forEach(function (y, i) { YIDX[y] = i; });

  var KIND = ['物', '史', '艺'];
  var KIND_NAME = { '物': '物理类', '史': '历史类', '艺': '艺术类' };
  var ART = META.art || [['ms', '美术与设计类'], ['yy', '音乐类'], ['wd', '舞蹈类'], ['by', '播音与主持类'], ['bd', '表（导）演类'], ['sf', '书法类'], ['xq', '戏曲类']];
  var ART_NAME = {};
  ART.forEach(function (a) { ART_NAME[a[0]] = a[1]; });
  // 投档数据批次：groups[8] → 0 本科批 / 1 高职（专科）批 / 2 高职（专科）提前批 / 3 本科提前批 / 4 艺术类本科批 / 5 艺术类专科批
  var BATCH_CN = { '本': '本科批', '专': '高职（专科）批', '本提': '本科提前批', '专提': '专科提前批', '艺本': '艺术类本科批', '艺专': '艺术类专科批' };
  var BATCH_ARR = ['本', '专'];
  var BATCH_ART = ['艺本', '艺专'];
  var LS = 'ljgk.v1';
  var ULS = 'ljyz.user.v1';
  var CAP = 40;

  var SPECIAL = ['国家专项', '地方专项', '高校专项', '预科', '民族班', '振兴龙江', '边防', '八省区', '定向'];
  var STYLES = {
    steady: { name: '稳健型', c: [10, 18, 12], d: '冲 10 / 稳 18 / 保 12' },
    attack: { name: '冲击型', c: [16, 14, 10], d: '冲 16 / 稳 14 / 保 10' },
    safe:   { name: '保守型', c: [6, 18, 16],  d: '冲 6 / 稳 18 / 保 16' }
  };

  var PLANS = {
    mon:  { key: 'mon',  name: '单月体验卡', price: 68,  orig: 98,  unit: '/ 30天', days: 30,
            desc: '出分季临时使用，快速查数据、排志愿' },
    vip:  { key: 'vip',  name: 'VIP 志愿卡', price: 298, orig: 398, unit: '/ 年', days: 365,
            desc: '智能填报全套功能，绝大多数考生的选择' },
    svip: { key: 'svip', name: '尊享 VIP 卡', price: 598, orig: 898, unit: '/ 年', days: 365,
            desc: 'VIP 全部权益 + 专家一对一咨询 1 次' }
  };
  var PLAN_TAG = { trial: '体验', mon: '月卡', vip: 'VIP', svip: 'SVIP' };

  var ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M6 14h12v7H6z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 5 5-5M4 21h16"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
    cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 9L12 4 2 9l10 5 10-5z"/><path d="M6 11.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h13v18H6a2 2 0 01-2-2z"/><path d="M9 3v18"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-8M21 20H3"/></svg>',
    line: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 3 6-8"/><path d="M21 3v18H3"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/></svg>',
    crown: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.5 11h-15z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 16.9 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z"/></svg>',
    wx: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 4C5.1 4 2 6.7 2 10c0 1.9 1 3.5 2.6 4.6L4 17l2.8-1.4c.7.2 1.4.3 2.2.3h.4A5.9 5.9 0 019 13.5c0-3.3 3.1-6 7-6h.4C15.7 5.6 12.6 4 9 4zM6.8 7.3a.9.9 0 110 1.8.9.9 0 010-1.8zm4.4 0a.9.9 0 110 1.8.9.9 0 010-1.8zM16 8.5c-3.3 0-6 2.2-6 5s2.7 5 6 5c.7 0 1.3-.1 1.9-.3L20.5 19l-.5-2c1.2-.9 2-2.1 2-3.5 0-2.8-2.7-5-6-5zm-2.2 2.7a.8.8 0 110 1.6.8.8 0 010-1.6zm4.4 0a.8.8 0 110 1.6.8.8 0 010-1.6z"/></svg>',
    ali: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm10.6 11.7c1.5.7 3.2 1.6 4.4 2.3V6.5h-2v2.6h-2V6.4h-2v6.9c-.8.2-1.6.3-2.3.3V8.9H8.9v4.7c-1.1-.1-2-.5-2.7-1.2l-1 1.5c1.2 1.2 3.1 1.8 5.9 1.8.7 0 1.5-.1 2.3-.2l1.2 1.6h2.4l-2.4-3z" fill-rule="evenodd"/></svg>',
    reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 12a8.5 8.5 0 11-2.6-6.1"/><path d="M20.5 4.5V11h-6.5"/></svg>'
  };

  /* ---------------- 状态 ---------------- */
  var st = load();
  // 老数据兼容：有分数但缺位次时按当前年份分段表补算
  if (st.score && !st.rank) st.rank = rankOf(st.score, st.kind);
  var user = loadUser();
  var recFilter = 'all';
  var recLimit = 20;
  var view = { sf: { q: '', batch: '', req: '', ty: '', lv: '', prov: '', min: '', max: '', sort: 'score-desc', page: 1 } };
  var mv = { q: '', cat: '全部', cls: '全部', tab: 'all' };
  var authMode = 'login';
  var authMethod = 'phone';   // 'phone' 手机验证码 | 'wx' 微信授权
  var payOrder = null;

  function load() {
    var base = { kind: '物', art: 'ms', batch: '本', year: META.latest, score: null, rank: null, subjects: ['化学', '生物'], preferLocal: false, style: 'steady', list: [] };
    try {
      var raw = JSON.parse(localStorage.getItem(LS) || 'null');
      if (raw && typeof raw === 'object') {
        for (var k in raw) if (base.hasOwnProperty(k)) base[k] = raw[k];
      }
    } catch (e) {}
    if (!Array.isArray(base.subjects) || !base.subjects.length) base.subjects = ['化学', '生物'];
    if (!Array.isArray(base.list)) base.list = [];
    if (YEARS.indexOf(base.year) < 0) base.year = META.latest;
    return base;
  }
  function saveLocal() { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) {} }
  function save() { saveLocal(); cloudPush(); }

  /* 云端同步：登录后把成绩档案与志愿表推到云端（防抖，失败不打断本地操作） */
  function cloudPush() {
    if (!window.GKCloud || !GKCloud.available || !user) return;
    GKCloud.queueProfile(profileRow());
    GKCloud.queueWishlist(st.list || []);
  }

  /* ---------------- 用户与会员 ---------------- */
  function loadUser() {
    try { return JSON.parse(localStorage.getItem(ULS) || 'null'); } catch (e) { return null; }
  }
  function saveUser(silent) {
    try { localStorage.setItem(ULS, JSON.stringify(user)); } catch (e) {}
    if (!silent) cloudPush();
  }
  function isVIP() { return !!(user && user.vip && user.vip.expire > Date.now()); }
  function planTag() {
    if (!user || !user.vip || user.vip.expire <= Date.now()) return '免费';
    return PLAN_TAG[user.vip.plan] || 'VIP';
  }
  function daysLeft() {
    if (!isVIP()) return 0;
    return Math.max(1, Math.ceil((user.vip.expire - Date.now()) / 86400000));
  }
  function recShowCount() { return isVIP() ? 999999 : (user ? 5 : 3); }
  function listCap() { return isVIP() ? 40 : (user ? 12 : 6); }

  /* ---------------- 工具 ---------------- */
  function nf(n) { return (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('en-US'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function isArt() { return st.kind === '艺'; }
  function artName() { return ART_NAME[st.art] || '艺术类'; }
  function KI(k) { return k === '物' ? 0 : (k === '史' ? 1 : 2); }
  function segOf(kind) { return kind === '艺' ? [] : ((SEG_ALL[String(dataYear())] || {})[kind] || []); }
  function linesOf(kind) { return (META.lines[String(dataYear())] || {})[kind] || {}; }
  function rankOf(score, kind) {
    if (kind === '艺') return null;           // 艺术类按综合分投档，不使用文化课位次
    score = parseInt(score, 10);
    if (!score || isNaN(score)) return null;
    var seg = segOf(kind);
    if (!seg || !seg.length) return null;
    if (score >= seg[0][0]) return seg[0][1];
    for (var i = 0; i < seg.length; i++) {
      if (seg[i][0] === score) return seg[i][1];
      if (seg[i][0] < score) return seg[i][1];
    }
    return null;
  }
  function scoreOfRank(rank, kind) {
    var seg = segOf(kind);
    if (!seg || !rank) return null;
    for (var i = 0; i < seg.length; i++) {
      if (seg[i][1] >= rank) return seg[i][0];
    }
    return seg[seg.length - 1][0];
  }
  function abovePct(rank, kind) {
    if (kind === '艺') return 0;
    var total = linesOf(kind).total || 1;
    return Math.max(0, Math.min(99.99, (1 - rank / total) * 100));
  }
  function lineOf(kind) { return linesOf(kind); }

  /* ---------------- 数据年份 ---------------- */
  function dataYear() { return st.year || META.latest; }
  function yearIdx() { return YIDX[dataYear()] != null ? YIDX[dataYear()] : YEARS.length - 1; }
  function isLatestYear() { return dataYear() === META.latest; }
  function yearOf(g) { return YEARS[g[9]] || META.latest; }
  function yearStat() {
    var b = (META.byYear || {})[String(dataYear())];
    return b || { groups: META.groupCount, schools: META.schoolCount };
  }
  function yearRange() { return YEARS.length > 1 ? YEARS[0] + '–' + YEARS[YEARS.length - 1] : String(YEARS[0]); }

  /* ---------------- 批次 ---------------- */
  function curBatch() {
    if (isArt()) return st.batch === '专' ? '艺专' : '艺本';
    return st.batch === '专' ? '专' : '本';
  }
  function batchName(b) { return BATCH_CN[b || curBatch()]; }
  function batchOf(g) {
    var m = ['本', '专', '专提', '本提', '艺本', '艺专'];
    return m[g[8]] || '本';
  }
  // 专科提前批并入「高职（专科）批」一起展示；本科提前批独立于本科批
  function inBatch(g) {
    if (isArt()) return g[8] === (st.batch === '专' ? 5 : 4);
    return st.batch === '专' ? (g[8] === 1 || g[8] === 2) : g[8] === 0;
  }
  function batchBadge(g) {
    var b = batchOf(g);
    if (b === '艺本') return '<span class="badge bt bt-art">艺术本科</span>';
    if (b === '艺专') return '<span class="badge bt bt-art">艺术专科</span>';
    if (b === '专提') return '<span class="badge bt bt-pre">专科提前批</span>';
    if (b === '专') return '<span class="badge bt">专科</span>';
    if (b === '本提') return '<span class="badge bt bt-pre">提前批</span>';
    return '';
  }
  // 成绩卡里的批次切换
  function batchSeg() {
    var arr = isArt() ? BATCH_ART : BATCH_ARR;
    return '<div class="seg seg-batch" role="group" aria-label="批次">' +
      arr.map(function (b) {
        var on = isArt() ? (curBatch() === b) : (curBatch() === b);
        return '<button type="button" data-act="batch" data-arg="' + b + '" aria-pressed="' + on + '">' + BATCH_CN[b] + '</button>';
      }).join('') +
      '</div>';
  }

  // 科类 + 艺术门类选择
  function kindSeg() {
    var html = '<div class="seg" role="group" aria-label="科类">' +
      KIND.map(function (k) {
        return '<button type="button" data-act="kind" data-arg="' + k + '" aria-pressed="' + (st.kind === k) + '">' + KIND_NAME[k] + '</button>';
      }).join('') +
      '</div>';
    if (isArt()) {
      html += '<div class="art-pick">' +
        '<div class="label-line"><span>艺术门类（决定投档综合分口径）</span><span>' + artName() + '</span></div>' +
        '<div class="chips chips-art">' +
        ART.map(function (a) {
          return '<button type="button" class="chip' + (st.art === a[0] ? ' on' : '') + '" data-act="art" data-arg="' + a[0] + '" aria-pressed="' + (st.art === a[0]) + '">' + a[1] + '</button>';
        }).join('') +
        '</div></div>';
    }
    return html;
  }
  // 分数 / 位次（艺术类为综合分）
  function scoreFields(mode) {
    var l = lineOf(st.kind);
    var zn = mode === 'zn';
    var html = '<div class="field-row">' +
      '<div class="field"><label for="scoreInput">' + (isArt() ? '艺考综合分' : (zn ? '高考总分' : '预估总分')) + '</label>' +
        '<div class="input-wrap"><input id="scoreInput" type="number" inputmode="decimal" min="0" max="750" step="0.25" placeholder="' + (isArt() ? '如 512.5' : '如 528') + '" value="' + (st.score || '') + '"><span class="unit">分</span></div>' +
        '<div class="field-hint"><span>' + (isArt() ? '文化 + 专业折算' : '满分 750') + '</span><span id="scoreHint"></span></div></div>';
    if (isArt()) {
      html += '<div class="field"><label>投档依据</label><div class="art-tip">' + ICON.info +
        '<span>艺术类按 <b>综合分</b> 平行志愿投档，系统以「综合分差」评估录取可能，不换算文化课位次</span></div></div>';
    } else {
      html += '<div class="field"><label for="rankInput">全省位次</label>' +
        '<div class="input-wrap"><input id="rankInput" type="number" inputmode="numeric" min="1" placeholder="' + (zn ? '如 20000' : '自动换算') + '" value="' + (st.rank || '') + '"><span class="unit">名</span></div>' +
        '<div class="field-hint"><span>可反推分数</span><span>' + kindShort() + '共 ' + nf(l.total) + ' 人</span></div></div>';
    }
    html += '</div>';
    if (!isArt()) {
      html += '<div class="subject-row">' +
        '<div class="label-line"><span>再选科目（选 2 门）</span><span>首选' + (st.kind === '物' ? '物理' : '历史') + '</span></div>' +
        '<div class="chips" id="subjChips">' +
        ['化学', '生物', '思想政治', '地理'].map(function (s) {
          return '<button type="button" class="chip" data-act="subj" data-arg="' + s + '" aria-pressed="' + (st.subjects.indexOf(s) >= 0) + '">' + s + '</button>';
        }).join('') +
        '</div></div>';
    }
    return html;
  }

  function typesOf(g) { return g[7] ? g[7].split('、').filter(Boolean) : []; }
  function isSpecial(g) {
    var t = typesOf(g);
    for (var i = 0; i < t.length; i++) if (SPECIAL.indexOf(t[i]) >= 0) return true;
    return false;
  }
  function isSino(g) { return typesOf(g).indexOf('中外合作') >= 0; }
  function eligible(g, subs) {
    if (!subs || !subs.length) return true;
    var req = g[6];
    if (!req || req === '不限') return true;
    var need = req.split('和');
    for (var i = 0; i < need.length; i++) if (subs.indexOf(need[i]) < 0) return false;
    return true;
  }
  function probOf(g) {
    // 艺术类按综合分投档，用「我的综合分 − 该组投档综合分」的分差模型估算
    if (isArt()) {
      if (!st.score || g[4] == null) return null;
      var dd = st.score - g[4];
      var pa = 1 / (1 + Math.exp(-dd / 7));
      return Math.max(0.02, Math.min(0.985, pa));
    }
    if (!st.rank || !g[5]) return null;
    // 分母取「考生位次」与「距队尾剩余人数」中较小者：
    // 高分段与经典位次比一致；低分段（位次接近总数）避免概率被压缩、永远凑不出「保」
    var total = linesOf(st.kind).total || st.rank * 2;
    var denom = Math.min(st.rank, Math.max(1, total - st.rank)) || st.rank;
    var d = (g[5] - st.rank) / denom;
    var p = 1 / (1 + Math.exp(-9 * d));
    return Math.max(0.02, Math.min(0.985, p));
  }
  function bucketOf(p) {
    if (p == null) return 'wen';
    if (p >= 0.85) return 'bao';
    if (p >= 0.6) return 'wen';
    return 'chong';
  }
  var BUCKET_NAME = { chong: '冲', wen: '稳', bao: '保' };

  function lvBadge(s) {
    var lv = s[4];
    if (lv === 985) return '<span class="badge lv985">985</span>';
    if (lv === 211) return '<span class="badge lv211">211</span>';
    if (lv === 1) return '<span class="badge lv1">双一流</span>';
    return '';
  }
  function typeBadges(g) {
    return typesOf(g).map(function (t) {
      var warn = SPECIAL.indexOf(t) >= 0;
      return '<span class="badge ty' + (warn ? ' ty-warn' : '') + '">' + esc(t) + '</span>';
    }).join('');
  }
  function matchBadge(p) {
    if (!isVIP()) return '<button type="button" class="badge lock" data-act="goto" data-arg="vip" title="开通VIP查看录取概率">VIP</button>';
    if (p == null) return '';
    var b = bucketOf(p);
    return '<span class="badge match ' + b + '">' + BUCKET_NAME[b] + ' ' + Math.round(p * 100) + '%</span>';
  }

  function toast(msg) {
    var el = document.getElementById('toast');
    el.innerHTML = ICON.ok + '<span>' + esc(msg) + '</span>';
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }
  function kindShort() { return st.kind === '物' ? '物理类' : (st.kind === '史' ? '历史类' : '艺术类 · ' + artName()); }
  function scoreLabel() { return isArt() ? '综合分' : '总分'; }

  /* ---------------- 推荐池 ---------------- */
  function allEligible() {
    var ki = KI(st.kind);
    var yj = yearIdx();
    var out = [];
    for (var i = 0; i < GROUPS.length; i++) {
      var g = GROUPS[i];
      if (g[1] !== ki || g[9] !== yj) continue;
      if (ki === 2 && g[10] !== st.art) continue;
      if (!inBatch(g)) continue;
      if (!eligible(g, st.subjects)) continue;
      out.push({ i: i, g: g, s: SCHOOLS[g[0]] });
    }
    return out;
  }
  function recommendPool() {
    var base = allEligible().filter(function (x) { return !isSpecial(x.g); });
    if (isArt() ? !st.score : !st.rank) return base;
    return base.filter(function (x) {
      var p = probOf(x.g);
      return p != null && p >= 0.16 && p <= 0.97;
    });
  }
  function bucketed() {
    var groups = { chong: [], wen: [], bao: [] };
    recommendPool().forEach(function (x) {
      var p = probOf(x.g);
      groups[bucketOf(p)].push({ i: x.i, g: x.g, s: x.s, p: p });
    });
    groups.chong.sort(function (a, b) { return b.p - a.p || b.g[4] - a.g[4]; });
    groups.wen.sort(function (a, b) { return b.g[4] - a.g[4] || b.p - a.p; });
    groups.bao.sort(function (a, b) { return b.g[4] - a.g[4]; });
    return groups;
  }

  /* ================================================================
     视图：首页
     ================================================================ */
  var hv = { tab: 'ben' };
  function hotSchoolList(ben) {
    var ki = KI(st.kind), yj = yearIdx(), out = {};
    for (var i = 0; i < GROUPS.length; i++) {
      var g = GROUPS[i];
      if (g[1] !== ki || g[9] !== yj) continue;
      var b = g[8];
      var isBen = b === 0, isZhuan = b === 1 || b === 2;
      if (ben ? !isBen : !isZhuan) continue;
      if (isSpecial(g) || isSino(g) || !g[4]) continue;
      var name = SCHOOLS[g[0]][0];
      if (!out[name] || g[4] > out[name].g[4]) out[name] = { i: i, g: g, s: SCHOOLS[g[0]] };
    }
    return Object.keys(out).map(function (k) { return out[k]; })
      .sort(function (a, b) { return b.g[4] - a.g[4]; }).slice(0, 10);
  }

  function viewHome() {
    var l = lineOf(st.kind);
    var filled = (isArt() ? st.score : st.rank) ? '<div class="rc-result" style="background:#e6f7f0;color:#0a6b51">' + ICON.ok +
      '<span>已保存：' + kindShort() + ' ' + (st.score ? st.score + ' 分 · ' : '') + (isArt() ? '综合分' : '位次 <b class="num">' + nf(st.rank) + '</b>') + '</span></div>' : '';

    var html = '' +
      '<section class="home-hero">' +
          '<div class="hh-banner">' +
            '<div class="hh-slide hh-s1">' +
              '<span class="hh-pill">黑龙江省招生考试院 ' + yearRange() + ' 年官方投档数据</span>' +
              '<h2>龙高考<br>让每一分都<em>用在刀刃上</em></h2>' +
              '<p><b>' + nf(META.groupCount) + '</b> 个院校专业组真实投档数据 · 冲稳保 40 个平行志愿方案 · 普通类与艺术类全批次覆盖</p>' +
              '<button class="btn btn-lg hh-btn" type="button" data-act="goto" data-arg="zhineng">' + ICON.spark + '免费开始龙高考填报</button>' +
            '</div>' +
            '<div class="hh-slide hh-s2">' +
              '<span class="hh-pill">智能填报引擎</span>' +
              '<h2>输入分数 · 自动换算位次<br><em>10 秒生成志愿方案</em></h2>' +
              '<p>依据 ' + dataYear() + ' 年一分一段表与院校专业组投档线，按位次生成冲、稳、保三档梯度</p>' +
              '<button class="btn btn-gold btn-lg" type="button" data-act="goto" data-arg="zhineng">' + ICON.spark + '立即模拟填报</button>' +
            '</div>' +
            '<div class="hh-slide hh-s3">' +
              '<span class="hh-pill">全部功能永久免费</span>' +
              '<h2>找大学 · 查专业 · 分数线<br><em>一分一段 · 软科排名</em></h2>' +
              '<p>不收费、不卖卡，只做黑龙江学子自己的高考志愿填报平台</p>' +
              '<button class="btn btn-lg hh-btn" type="button" data-act="goto" data-arg="schools">' + ICON.cap + '开始找大学</button>' +
            '</div>' +
          '</div>' +
          '<div class="fill-card">' +
            '<h2>2027 志愿模拟填报 <span class="fc-prov">黑龙江</span>' + (isVIP() ? '' : '<span class="fc-vip">注册送3天VIP</span>') + '</h2>' +
            '<p class="sub">输入分数或位次，10 秒生成志愿方案</p>' +
            batchSeg() +
            kindSeg() +
            scoreFields('home') +
            '<div style="margin-top:16px"><button class="btn btn-primary btn-lg btn-block" type="button" data-act="calc">' + ICON.spark + '生成我的志愿方案</button></div>' +
            '<div id="homeSaved">' + filled + '</div>' +
          '</div>' +
        '</section>' +

      // 快讯滚动条（优志愿风格）
      '<div class="notice-bar">' +
        '<span class="nb-tag">' + ICON.spark + '龙高考快讯</span>' +
        '<div class="nb-roll"><div class="nb-track">' +
          newsAll().slice(0, 2).map(function (n) {
            return '<span><b>' + esc(n.d.slice(5)) + '</b> ' + esc(n.t) + '</span>';
          }).join('') +
        '</div></div>' +
        '<a href="#/news" style="font-size:12.5px;color:var(--brand);font-weight:600;flex-shrink:0">更多 &gt;</a>' +
      '</div>' +

      // 快捷入口宫格（优志愿 9 宫格：找大学/查专业/分数线/批次线/提前批/测评/测录取概率/位次查询/高招云直播）
      '<div class="quick-grid">' +
        qgItem('schools', ICON.cap, '找大学', '按分数位次筛选') +
        qgItem('majors', ICON.book, '查专业', '883 个本科专业') +
        qgItem('lines', ICON.chart, '分数线', '批次线 · 一分一段') +
        qgItem('lines', ICON.line, '批次线', '本专艺体各批次') +
        qgItem('schools', ICON.target, '提前批', '军检 · 公费 · 航海') +
        qgItem('ce', ICON.user, '测评', '兴趣 · 专业 · 生涯', 'new') +
        qgItem('zhineng', ICON.spark, '测录取概率', '冲稳保智能测算', 'hot') +
        qgItem('zhineng', ICON.line, '位次查询', '分数位次互查') +
        qgItem('live', ICON.play, '高招云直播', '宣讲 · 专业解读') +
      '</div>' +

      // 数据统计条
      '<div class="num-strip">' +
        '<div class="ns-item"><div class="ns-num">' + nf(META.schoolCount) + '<small>所</small></div><span>全国院校在黑招生<br>' + yearRange() + ' 年官方数据</span></div>' +
        '<div class="ns-item"><div class="ns-num">' + nf(META.groupCount) + '<small>个</small></div><span>院校专业组投档数据<br>本 / 专 / 提前批 / 艺术类</span></div>' +
        '<div class="ns-item"><div class="ns-num">883<small>种</small></div><span>2026 版本科专业目录<br>软科院校专业排名同步</span></div>' +
        '<div class="ns-item"><div class="ns-num">40<small>个</small></div><span>平行志愿一键编排<br>冲稳保三档梯度</span></div>' +
      '</div>' +

      // 讲堂 + 热播院校（优志愿版面：左讲堂 / 右热播院校+专题）
      '<div class="home-cols">' +
        '<div class="panel-card">' +
          '<div class="panel-hd"><h3>' + ICON.play + '讲堂</h3><a data-act="goto" data-arg="ketang" href="javascript:void(0)">全部讲堂 ' + ICON.arrow + '</a></div>' +
          '<div class="kc-grid kc-grid-sm">' + LRN.courses.slice(0, 6).map(courseCard).join('') + '</div>' +
        '</div>' +
        '<div class="panel-card">' +
          '<div class="panel-hd"><h3>' + ICON.star + '热播院校</h3>' +
            '<div class="hs-seg">' +
              '<button type="button" class="' + (hv.tab === 'ben' ? 'on' : '') + '" data-act="hstab" data-arg="ben">本科</button>' +
              '<button type="button" class="' + (hv.tab === 'zk' ? 'on' : '') + '" data-act="hstab" data-arg="zk">专科</button>' +
            '</div>' +
          '</div>' +
          '<div class="hs-list hs-compact">' +
            hotSchoolList(hv.tab !== 'zk').slice(0, 8).map(function (x, idx) {
              return '<div class="hs-row" data-act="openSchool" data-arg="' + x.g[0] + '">' +
                '<span class="hs-no' + (idx < 3 ? ' t' + (idx + 1) : '') + '">' + (idx + 1) + '</span>' +
                '<div class="hs-name">' + esc(x.s[0]) + lvBadge(x.s) + (x.s[2] === '黑龙江' ? '<span class="badge local">省内</span>' : '') + '</div>' +
                '<div class="hs-heat">投档分 <b class="num">' + x.g[4] + '</b></div>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<div class="panel-hd hs-sub-hd"><h3>' + ICON.book + '政策专题</h3><a data-act="goto" data-arg="news/zc" href="javascript:void(0)">更多 ' + ICON.arrow + '</a></div>' +
          '<div class="hs-list hs-compact">' +
            (SUB.policy || []).slice(0, 6).map(function (p) {
              return '<div class="hs-row" data-act="news" data-arg="' + esc(p.t) + '">' +
                '<span class="hs-no" style="background:var(--brand-soft);color:var(--brand)">策</span>' +
                '<div class="hs-name" style="font-weight:500;font-size:13px">' + esc(p.t) + '</div>' +
                '<div class="hs-heat" style="color:var(--ink-4)">' + esc(p.tag) + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +

      // 高招直播（优志愿版面）
      '<div class="panel-card">' +
        '<div class="panel-hd"><h3>' + ICON.spark + '高招直播</h3><a data-act="goto" data-arg="live" href="javascript:void(0)">全部直播 ' + ICON.arrow + '</a></div>' +
        '<div class="lv-grid">' + LRN.lives.slice(0, 4).map(liveCard).join('') + '</div>' +
      '</div>' +

      // 高考资讯（优志愿版面：全宽列表）
      '<div class="panel-card">' +
        '<div class="panel-hd"><h3>高考资讯</h3><a data-act="goto" data-arg="news" href="javascript:void(0)">更多资讯 ' + ICON.arrow + '</a></div>' +
        '<div class="news-list-full">' +
          newsAll().slice(0, 6).map(function (n) {
            return '<div class="news-item" data-act="news" data-arg="' + esc(n.t) + '">' +
              '<h4>' + esc(n.t) + '</h4>' +
              '<div class="news-meta"><span class="ntag">' + esc(n.tag) + '</span><span>' + esc(n.d) + '</span><span>' + esc(n.src) + '</span></div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      // 热门专业解读（优志愿版面：全宽两列）
      '<div class="panel-card">' +
        '<div class="panel-hd"><h3>热门专业解读</h3><a data-act="goto" data-arg="majors" href="javascript:void(0)">全部专业 ' + ICON.arrow + '</a></div>' +
        '<div class="mp-grid">' +
          YZ.majors.slice(0, 8).map(function (m) {
            return '<div class="hm-major" data-act="mjrow" data-arg="' + esc(m.n) + '">' +
              '<div class="hm-mn"><b>' + esc(m.n) + '</b><span>' + esc(m.k || '') + '</span></div>' +
              '<span class="hm-tag">' + esc(m.c) + ' · ' + esc(m.y) + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      // VIP 横幅
      '<div class="vip-banner">' +
        '<div class="vb-copy">' +
          '<h3><span class="vb-vip">VIP</span>开通会员，解锁智能填报全部功能</h3>' +
          '<p>完整冲稳保推荐不设限 · 录取概率测算 · 40 个志愿一键智能编排 · 志愿表导出打印。注册即送 3 天 VIP 体验，出分季单月卡仅需 68 元。</p>' +
        '</div>' +
        '<button class="btn btn-gold btn-lg" type="button" data-act="goto" data-arg="vip">查看会员权益</button>' +
      '</div>';
    return html;
  }

  function qgItem(route, icon, name, sub, badge) {
    return '<button type="button" class="qg-item" data-act="goto" data-arg="' + route + '">' +
      (badge ? '<span class="qg-badge' + (badge === 'new' ? ' new' : '') + '">' + (badge === 'new' ? '新' : '热') + '</span>' : '') +
      '<span class="qg-ico">' + icon + '</span><b>' + name + '</b><i>' + sub + '</i></button>';
  }

  /* ================================================================
     视图：智能填报
     ================================================================ */
  function viewZhineng(sub) {
    sub = sub || '';
    var l = lineOf(st.kind);
    var heads = {
      '': ['龙高考 · 智能筛选志愿', kindShort() + ' · ' + batchName() + ' · 依据 ' + dataYear() + ' 年真实投档线' + (isArt() ? '，按综合分差生成冲稳保梯度方案。' : '与一分一段表，按位次生成冲稳保梯度方案。')],
      'quiz': ['专业倾向测评', '用 18 道题测出你的学科兴趣结构，换算成匹配的学科门类与专业方向。测完可一键跳到「查专业」核实开设院校与录取分数。'],
      'report': ['我的志愿报告', '基于你的成绩档案与志愿表自动生成：梯度结构是否合理、保底是否足够、有哪些退档风险，并输出可直接打印的志愿清单。'],
      'shengya': ['生涯发展测评', '基于霍兰德职业兴趣理论（RIASEC）的 24 题测评，得出你的兴趣代码，匹配职业方向、本科专业与长期发展路径。'],
      'career': ['职业前景', '收录 ' + (SUB.careers || []).length + ' 个常见职业：对应本科专业、主要就业去向、起薪区间与需求趋势。先看职业，再倒推专业与选科。'],
      'baokao': ['报考指南', '择校、选专业、看章程、避坑的方法论与名词速查。与「填报指南」互补：那里讲规则，这里讲怎么决策。']
    };
    var head = heads[sub] || heads[''];
    var nav = subNav([
      ['智能筛选志愿', 'zhineng'], ['专业倾向测评', 'zhineng/quiz'], ['我的志愿报告', 'zhineng/report'],
      ['志愿填报指南', 'guide'], ['生涯发展测评', 'zhineng/shengya'], ['职业前景', 'zhineng/career'], ['报考指南', 'zhineng/baokao']
    ], 'zhineng' + (sub ? '/' + sub : ''));
    var body;
    if (sub === 'report') body = reportHTML();
    else if (sub === 'quiz') { qzInit('major'); body = quizIntroHTML('major') + quizHTML('major'); }
    else if (sub === 'shengya') { qzInit('holland'); body = quizIntroHTML('holland') + quizHTML('holland'); }
    else if (sub === 'career') body = careerHTML();
    else if (sub === 'baokao') body = baokaoHTML();
    else body = '' +
      '<div class="fill-card">' +
        '<h2>填写你的成绩</h2>' +
        '<p class="sub">' + (isArt() ? '选择艺术门类，填写综合分即可评估' : '分数自动换算全省位次，无需手动查表') + '</p>' +
        batchSeg() +
        kindSeg() +
        scoreFields('zn') +
        '<div class="subject-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
          '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2);cursor:pointer">' +
            '<input type="checkbox" id="preferLocal" ' + (st.preferLocal ? 'checked' : '') + ' style="width:15px;height:15px;accent-color:var(--brand)">优先推荐省内院校' +
          '</label>' +
          '<span style="font-size:11.5px;color:var(--ink-4)">' + (isArt() ? '艺术类本科文化线 ' + l.ben + ' 分' : (curBatch() === '专' ? '专科线 ' + l.zk : '本科线 ' + l.ben)) + ' 分</span>' +
        '</div>' +
        '<div style="margin-top:15px"><button class="btn btn-primary btn-lg btn-block" type="button" data-act="calc">' + ICON.spark + '生成我的志愿方案</button></div>' +
      '</div>' +
      '<div id="znResult">' + znResultHTML() + '</div>';
    return '<div class="page-head"><h1>' + head[0] + '</h1><p>' + head[1] + '</p></div>' + nav + body;
  }

  /* ---------------- 我的志愿报告 ---------------- */
  function reportHTML() {
    var items = listItems();
    var hasScore = isArt() ? !!st.score : !!st.rank;
    if (!items.length) {
      return '<div class="empty"><div class="ico">' + ICON.list + '</div><h3>志愿表还是空的，暂时无法生成报告</h3>' +
        '<p>先用智能筛选填写成绩并生成冲稳保方案，或到院校库逐个挑选加入志愿表，再回来查看报告。</p>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
          '<button class="btn btn-primary" type="button" data-act="goto" data-arg="zhineng">' + ICON.spark + '去智能筛选</button>' +
          '<button class="btn btn-ghost" type="button" data-act="goto" data-arg="schools">去院校库挑选</button></div></div>';
    }
    var counts = { chong: 0, wen: 0, bao: 0 }, sum = 0, sumProb = 0, nProb = 0;
    var rows = items.map(function (x) {
      var p = probOf(x.g);
      if (p != null) { counts[bucketOf(p)]++; sumProb += p; nProb++; }
      sum += x.g[4] || 0;
      return { x: x, p: p, b: p == null ? 'wen' : bucketOf(p), diff: (x.g[5] && st.rank) ? (st.rank - x.g[5]) : null };
    });
    var avg = Math.round(sum / items.length);
    var avgProb = nProb ? Math.round(sumProb / nProb * 100) : null;
    var cap = listCap();
    var line = st.batch === '专' ? lineOf(st.kind).zk : lineOf(st.kind).ben;

    var risks = [];
    if (!hasScore) risks.push(['warn', '尚未填写' + (isArt() ? '综合分' : '分数 / 位次') + '，无法计算录取概率与梯度，报告仅供参考。']);
    if (hasScore && counts.bao === 0) risks.push(['warn', '志愿表中没有「保」档院校，一旦前面全部落空就可能滑档。建议至少补 6–10 个保底院校专业组。']);
    else if (hasScore && counts.bao < 6) risks.push(['warn', '「保」档只有 ' + counts.bao + ' 个，建议补到 8 个以上，并确认近三年位次都明显低于你。']);
    if (hasScore && counts.chong > items.length * 0.5) risks.push(['warn', '「冲」档占比超过一半（' + counts.chong + '/' + items.length + '），方案偏激进，建议增加稳与保的比例。']);
    if (items.length < cap) risks.push(['info', '当前只填了 ' + items.length + ' 个志愿，容量为 ' + cap + ' 个。平行志愿下多填一个就多一次机会，建议填满。']);
    var sameSchool = {};
    items.forEach(function (x) { sameSchool[x.s[0]] = (sameSchool[x.s[0]] || 0) + 1; });
    Object.keys(sameSchool).forEach(function (k) {
      if (sameSchool[k] >= 4) risks.push(['info', '「' + k + '」占了 ' + sameSchool[k] + ' 个志愿，过度集中会放大该校招生计划波动的风险，建议分散到 2–3 所同层次院校。']);
    });
    if (hasScore && !isArt() && st.score && st.batch === '本' && st.score < line) risks.push(['warn', '你的分数低于本科批控制线 ' + line + ' 分，本科批志愿可能全部无效，请同步准备高职（专科）批。']);
    if (!risks.length) risks.push(['ok', '梯度结构看起来比较均衡：冲 ' + counts.chong + ' 个、稳 ' + counts.wen + ' 个、保 ' + counts.bao + ' 个，保底数量充足。']);

    var riskIcon = { warn: ICON.warn, info: ICON.info, ok: ICON.ok };
    return '' +
      '<div class="rep-head">' +
        '<div class="rep-title"><h2>黑龙江省普通高考志愿分析报告</h2><p>生成时间 ' + esc(new Date().toLocaleString('zh-CN', { hour12: false })) + ' · 数据年份 ' + dataYear() + ' 年 · 本报告由龙高考自动生成，仅供参考</p></div>' +
        '<div class="rep-acts">' +
          '<button class="btn btn-ghost btn-sm" type="button" data-act="print">' + ICON.print + '打印 / 存 PDF' + (isVIP() ? '' : ' 🔒') + '</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-act="export">' + ICON.download + '导出 CSV' + (isVIP() ? '' : ' 🔒') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="rep-info">' +
        repKV('考生', user ? user.name : '未登录访客') +
        repKV('科类', kindShort()) +
        repKV('批次', batchName()) +
        repKV(isArt() ? '综合分' : '高考总分', (isArt() ? st.score : st.score) ? st.score + ' 分' : '未填写') +
        repKV(isArt() ? '评估方式' : '全省位次', isArt() ? '综合分差' : (st.rank ? nf(st.rank) : '未填写')) +
        repKV('再选科目', isArt() ? '—' : st.subjects.join(' + ')) +
        repKV('志愿数量', items.length + ' / ' + cap) +
        repKV('本科/专科控制线', line + ' 分') +
      '</div>' +
      '<div class="rep-overview">' +
        '<div class="ro-card chong"><b class="num">' + counts.chong + '</b><span>冲</span><i>投档分高于你</i></div>' +
        '<div class="ro-card wen"><b class="num">' + counts.wen + '</b><span>稳</span><i>与你基本匹配</i></div>' +
        '<div class="ro-card bao"><b class="num">' + counts.bao + '</b><span>保</span><i>低于你，兜底</i></div>' +
        '<div class="ro-card"><b class="num">' + (avg || '—') + '</b><span>平均投档分</span><i>' + (avg && line ? (avg - line >= 0 ? '线上 ' : '线下 ') + Math.abs(avg - line) + ' 分' : '—') + '</i></div>' +
        '<div class="ro-card"><b class="num">' + (avgProb == null ? '—' : avgProb + '<small>%</small>') + '</b><span>平均录取概率</span><i>' + (isVIP() ? '按位次模型估算' : '估算值') + '</i></div>' +
      '</div>' +
      '<div class="rep-risks"><h3>' + ICON.warn + '风险与建议</h3>' + risks.map(function (r) {
        return '<div class="rep-risk ' + r[0] + '">' + riskIcon[r[0]] + '<p>' + esc(r[1]) + '</p></div>';
      }).join('') + '</div>' +
      '<div class="rep-list"><h3>' + ICON.list + '志愿清单（按填报顺序）</h3>' +
        '<div class="table-wrap"><table class="info-table rep-table"><thead><tr><th>序</th><th>院校</th><th>专业组</th><th>批次</th><th>投档分</th><th>位次</th><th>我的位次差</th><th>录取概率</th><th>梯度</th></tr></thead><tbody>' +
          rows.map(function (r, i) {
            var s = r.x.s, g = r.x.g;
            return '<tr><td class="mono">' + (i + 1) + '</td>' +
              '<td><b>' + esc(s[0]) + '</b>' + (s[3] && s[3] !== s[2] ? '<i class="rep-sub">' + esc(s[3]) + '</i>' : '') + '</td>' +
              '<td>第 ' + g[3] + ' 组</td>' +
              '<td>' + esc(BATCH_CN[batchOf(g)] || '本科批') + '</td>' +
              '<td class="num">' + (g[4] || '—') + '</td>' +
              '<td class="num">' + (g[5] ? nf(g[5]) : '—') + '</td>' +
              '<td class="num ' + (r.diff == null ? '' : r.diff >= 0 ? 'up' : 'down') + '">' + (r.diff == null ? '—' : (r.diff >= 0 ? '+' : '') + nf(r.diff)) + '</td>' +
              '<td class="num">' + (r.p == null ? '—' : Math.round(r.p * 100) + '%') + '</td>' +
              '<td><span class="bdg ' + r.b + '">' + BUCKET_NAME[r.b] + '</span></td></tr>';
          }).join('') +
        '</tbody></table></div>' +
      '</div>' +
      '<div class="rep-foot">说明：录取概率由「你的位次与该院校专业组' + dataYear() + ' 年最低投档位次」的相对差，经逻辑斯蒂模型估算，不含招生计划变动、报考热度波动与专业调剂因素；位次差为正表示你的位次更靠前。本报告不构成录取承诺，最终以省招考院投档与高校录取结果为准。</div>';
  }
  function repKV(k, v) {
    return '<div class="rep-kv"><span>' + esc(k) + '</span><b>' + esc(v == null ? '—' : String(v)) + '</b></div>';
  }

  /* ---------------- 职业前景 ---------------- */
  var cv = { q: '', cat: '全部' };
  function careerCats() {
    var seen = ['全部'];
    (SUB.careers || []).forEach(function (c) { if (seen.indexOf(c.cat) < 0) seen.push(c.cat); });
    return seen;
  }
  function careerFiltered() {
    var q = (cv.q || '').trim();
    return (SUB.careers || []).filter(function (c) {
      if (cv.cat !== '全部' && c.cat !== cv.cat) return false;
      if (q && c.n.indexOf(q) < 0 && c.cat.indexOf(q) < 0 && c.majors.join('').indexOf(q) < 0) return false;
      return true;
    });
  }
  function careerHTML() {
    var arr = careerFiltered();
    var grow = (SUB.careers || []).filter(function (c) { return c.trend === '增长' || c.trend === '紧缺'; }).length;
    var cats = careerCats();
    return '' +
      '<div class="career-top">' +
        '<div class="ct-card"><b class="num">' + (SUB.careers || []).length + '</b><span>收录职业</span></div>' +
        '<div class="ct-card"><b class="num">' + grow + '</b><span>需求增长或紧缺</span></div>' +
        '<div class="ct-card"><b class="num">' + (cats.length - 1) + '</b><span>行业大类</span></div>' +
        '<div class="ct-card wide"><p>职业前景取决于<strong>行业周期 + 个人能力 + 地域</strong>三重因素。下表起薪为一线与新一线城市本科/硕士应届的常见区间，其他城市与中小企业会明显下浮，仅作相对比较。</p></div>' +
      '</div>' +
      '<div class="nw-bar">' +
        '<div class="nw-search">' + ICON.search + '<input id="careerQ" type="search" placeholder="搜职业 / 行业 / 对应专业，如 算法、医生、电气" value="' + esc(cv.q) + '" aria-label="搜索职业"></div>' +
        '<div class="cat-chips">' + cats.map(function (c) {
          return '<button type="button" class="chip" aria-pressed="' + (cv.cat === c) + '" data-act="cvcat" data-arg="' + esc(c) + '">' + esc(c) + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="career-grid" id="careerList">' + careerCards(arr) + '</div>' +
      '<div class="tip info">' + ICON.info + '<div>不确定自己适合什么职业？先做 <a href="#/zhineng/shengya">生涯发展测评</a>（霍兰德兴趣）或 <a href="#/zhineng/quiz">专业倾向测评</a>，再回到本页看具体职业的学历门槛与专业要求。</div></div>';
  }
  function careerCards(arr) {
    if (!arr.length) return '<div class="empty" style="grid-column:1/-1">' + ICON.search + '<p>没有匹配的职业，换个关键词试试</p></div>';
    return arr.map(function (c) {
      var tr = c.trend === '紧缺' ? 'hot' : c.trend === '增长' ? 'up' : c.trend === '收紧' ? 'down' : 'flat';
      return '<article class="career-card">' +
        '<div class="cc-hd"><h3>' + esc(c.n) + '</h3><span class="cc-h">霍兰德 ' + esc(c.h) + '</span></div>' +
        '<div class="cc-meta"><span class="cc-cat">' + esc(c.cat) + '</span><span class="cc-pay">起薪 ' + esc(c.pay) + '</span><i class="fc-trend ' + tr + '">' + esc(c.trend) + '</i></div>' +
        '<p class="cc-note">' + esc(c.note) + '</p>' +
        '<div class="fc-sec"><h4>对应本科专业</h4><div class="fc-majors">' + majorChips(c.majors, 'mj-chip sm') + '</div></div>' +
        '<div class="cc-to"><b>主要去向</b>' + esc(c.to) + '</div>' +
      '</article>';
    }).join('');
  }

  /* ---------------- 报考指南 ---------------- */
  function baokaoHTML() {
    return '<div class="guide-grid">' +
      '<article class="article">' +
        '<section id="b1"><h2><span class="no">1</span>五步定位法：从分数到志愿表</h2>' +
          '<div class="flow">' +
            '<div class="step"><b>定位次</b><span>用一分一段表把分数换成位次</span><i>' + ICON.arrow + '</i></div>' +
            '<div class="step"><b>定方向</b><span>圈定 5–8 个可接受的专业方向</span><i>' + ICON.arrow + '</i></div>' +
            '<div class="step"><b>建院校池</b><span>按位次上下浮动 20% 捞院校专业组</span><i>' + ICON.arrow + '</i></div>' +
            '<div class="step"><b>排梯度</b><span>冲 10–16、稳 16–20、保 10–14</span><i>' + ICON.arrow + '</i></div>' +
            '<div class="step"><b>逐条核对</b><span>章程、选科、单科、体检、学费</span></div>' +
          '</div>' +
          '<p>顺序很重要：<strong>先定专业方向，再选学校</strong>。反过来先锁定学校再挑专业，很容易被调剂到完全不接受的方向。本站「智能筛选志愿」可以一次完成前三步，剩下的梯度与核对必须自己把关。</p></section>' +
        '<section id="b2"><h2><span class="no">2</span>院校层次与标签怎么看</h2>' +
          '<table class="info-table"><thead><tr><th>标签</th><th>含义</th><th>参考价值</th></tr></thead><tbody>' +
            '<tr><td><b>985 / 211</b></td><td>上世纪的重点建设高校名单，已不再新增</td><td>社会认知度高、保研与选调机会多；但部分 211 的普通专业分数并不高于强势双非</td></tr>' +
            '<tr><td><b>双一流</b></td><td>世界一流大学和一流学科建设，分「一流大学」与「一流学科」两类，按学科动态调整</td><td>看学科而非只看学校：一流学科专业往往才是该校真正的强项</td></tr>' +
            '<tr><td><b>部属 / 省属</b></td><td>主管部门不同，经费来源与招生规模不同</td><td>部属院校整体资源更足；省属院校在本省招生计划多、录取更友好</td></tr>' +
            '<tr><td><b>行业特色高校</b></td><td>如电力、铁道、民航、医学、财经、政法、邮电类院校</td><td>特定行业内校友网络强、校招对口，性价比常高于综合排名</td></tr>' +
            '<tr><td><b>中外合作办学</b></td><td>与境外高校合作的专业或机构，学费高，部分可获双学位</td><td>同校中外合作组投档分通常低于普通组，是低分进好学校的路径之一</td></tr>' +
            '<tr><td><b>职业本科</b></td><td>本科层次职业教育，侧重技术技能，2026 版目录外单独设置专业</td><td>适合明确走技术路线、希望早就业的考生，学费与学制需确认</td></tr>' +
          '</tbody></table></section>' +
        '<section id="b3"><h2><span class="no">3</span>专业怎么选：三个维度 + 四个必看</h2>' +
          '<p><strong>三个维度</strong>：①能力——这门专业的核心课程你学得动吗（数学、化学、绘图、写作）；②兴趣——愿意在无人督促时也花时间钻研吗；③前景——对应行业的岗位是在增加还是在收缩。</p>' +
          '<ul>' +
            '<li><b>看培养方案</b>：同样叫「人工智能」，有的偏算法数学，有的偏硬件与嵌入式，课程表差异极大。</li>' +
            '<li><b>看主干课程</b>：把大一到大三的核心课列出来，能接受再报。</li>' +
            '<li><b>看转专业与分流政策</b>：大类招生如何分流、转专业比例与门槛，直接决定「进错门」的补救空间。</li>' +
            '<li><b>看保研率与深造去向</b>：想读研的考生，保研率比学校名气更实在。</li>' +
          '</ul>' +
          '<div class="note">名称相近的专业差别可能很大：<b>电子信息工程</b>偏信号与电路，<b>电子科学与技术</b>偏器件与材料，<b>集成电路设计与集成系统</b>专攻芯片设计。查专业时务必看「专业类」与主干课程，而不只是名字。</div></section>' +
        '<section id="b4"><h2><span class="no">4</span>地域与就业：要不要出省</h2>' +
          '<p>校招有明显的<strong>地域半径</strong>：本地企业更愿意去本地高校宣讲，实习也更容易兼顾学业。留省的优势是生活成本低、省内院校招生计划多、录取更友好、涉农与装备制造岗位对口；出省的优势是视野、行业密度与薪资上限。</p>' +
          '<p>判断方法：先想清楚毕业后大概率在哪个区域工作，再看目标院校在该区域的校招质量。若计划回黑龙江就业，省内重点高校与行业特色院校的性价比往往高于同分数的外省普通院校。</p></section>' +
        '<section id="b5"><h2><span class="no">5</span>七个常见误区</h2>' +
          '<div class="faq">' +
            faq('只看分数不看位次', '每年题目难度不同，同一分数的含义完全不同。跨年比较必须用位次，本站所有推荐都基于位次模型。') +
            faq('唯名校论，宁去名校冷门专业', '名校的弱势专业在保研、师资、校招资源上可能不如普通院校的强势专业。除非确定要走「学校牌子」路线（如考公、选调），否则优先看专业实力。') +
            faq('追热门，不看四年后的供需', '热门专业会因扩招而饱和。判断标准不是「现在火不火」，而是「这个领域的岗位增速能否消化毕业生增量」。') +
            faq('不看招生章程', '单科成绩、外语语种、体检、学费、专业级差都写在章程里。每年都有人因「英语单科未达 90 分」或「色弱限报」被退档。') +
            faq('40 个志愿全填同一层次', '平行志愿一轮投档，全填冲刺院校等于把命运交给运气。冲稳保必须有真实梯度，保底要能兜住。') +
            faq('家长包办，考生不参与', '要在大学读四年、从事一辈子的是考生本人。兴趣与能力错配带来的转专业、退学成本，远高于多花两周讨论。') +
            faq('相信「内部指标」「花钱保录」', '高考录取全部通过省级系统投档，不存在任何内部操作空间。此类承诺 100% 是诈骗，发现即可报警。') +
          '</div></section>' +
        '<section id="b6"><h2><span class="no">6</span>关键名词速查</h2>' +
          '<table class="info-table"><thead><tr><th>名词</th><th>含义</th></tr></thead><tbody>' +
            '<tr><td><b>院校专业组</b></td><td>高校把选科要求相同的专业打包成的投档单位，一个组就是一个志愿</td></tr>' +
            '<tr><td><b>投档线</b></td><td>某院校专业组当年投档的最低分（或最低位次），不是学校自己划的「录取线」</td></tr>' +
            '<tr><td><b>一分一段表</b></td><td>省招考院公布的分数—累计人数对照表，用于把分数换算成全省位次</td></tr>' +
            '<tr><td><b>平行志愿</b></td><td>分数优先、遵循志愿、一轮投档的投档方式，黑龙江本科批与专科批均实行</td></tr>' +
            '<tr><td><b>顺序志愿（梯度志愿）</b></td><td>先看第一志愿，招不满才看第二志愿，多用于提前批部分段次</td></tr>' +
            '<tr><td><b>专业级差</b></td><td>部分高校在组内安排专业时，对非第一专业志愿扣减一定分数后排序</td></tr>' +
            '<tr><td><b>服从专业调剂</b></td><td>所填专业都无法录取时，是否同意调到该组内其他未满专业；不服从是退档主因</td></tr>' +
            '<tr><td><b>征集志愿</b></td><td>批次录取后未完成计划再次公开征集，窗口通常只有 1 天</td></tr>' +
            '<tr><td><b>大小年</b></td><td>某校某组报考人数一年高一年低导致投档线波动的现象，参考三年数据可平滑</td></tr>' +
            '<tr><td><b>强基计划</b></td><td>39 所双一流高校的基础学科拔尖人才选拔，高考成绩占 85% 以上，入校后本硕博衔接</td></tr>' +
            '<tr><td><b>专项计划</b></td><td>国家/高校/地方专项，面向农村和脱贫地区考生，须提前通过资格审核</td></tr>' +
          '</tbody></table></section>' +
      '</article>' +
      '<aside class="guide-toc"><h4>目录</h4>' +
        [['b1', '五步定位法'], ['b2', '院校层次与标签'], ['b3', '专业怎么选'], ['b4', '地域与就业'], ['b5', '常见误区'], ['b6', '名词速查']]
          .map(function (x) { return '<a href="javascript:void(0)" data-act="toc" data-arg="' + x[0] + '">' + x[1] + '</a>'; }).join('') +
      '</aside>' +
    '</div>';
  }


  function znResultHTML() {
    if (isArt() ? !st.score : !st.rank) return '';
    var l = lineOf(st.kind);
    var isBen = curBatch() === '本' || curBatch() === '艺本';
    var baseLine = isBen ? l.ben : l.zk;
    var groups = bucketed();
    var all = allEligible();
    var diff = st.score ? Math.round((st.score - baseLine) * 100) / 100 : null;
    var total = groups.chong.length + groups.wen.length + groups.bao.length;

    var html = '' +
      '<div class="section-head">' +
        '<div><h2>我的方案</h2><p>' + kindShort() + ' · ' + batchName() + ' · ' + (st.score ? st.score + ' 分 · ' : '') + (isArt() ? '综合分' : '位次 ' + nf(st.rank)) + (isArt() ? '' : ' · 再选 ' + st.subjects.join('+')) + '</p></div>' +
        '<div class="actions">' +
          '<button class="btn btn-ghost btn-sm" type="button" data-act="goto" data-arg="schools">' + ICON.search + '查院校库</button>' +
          '<button class="btn btn-primary btn-sm" type="button" data-act="autofill">' + ICON.spark + (isVIP() ? '一键排 40 个志愿' : '智能编排') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="overview">' +
        (isArt()
          ? '<div class="ov-card"><div class="k">艺考综合分</div><div class="v num">' + st.score + '</div><div class="t">' + artName() + '</div></div>' +
            '<div class="ov-card"><div class="k">可报专业组</div><div class="v num">' + nf(all.length) + '</div><div class="t">' + batchName() + ' · 综合分可冲</div></div>'
          : '<div class="ov-card"><div class="k">全省位次</div><div class="v num">' + nf(st.rank) + '</div><div class="t">' + kindShort() + '共 ' + nf(l.total) + ' 人</div></div>' +
            '<div class="ov-card"><div class="k">超过考生</div><div class="v num">' + abovePct(st.rank, st.kind).toFixed(1) + '<small>%</small></div><div class="t">位次越靠前比例越高</div></div>') +
        (isArt()
          ? '<div class="ov-card"><div class="k">' + (isBen ? '本科文化线' : '专科文化线') + '</div><div class="v num">' + baseLine + '<small>分</small></div><div class="t">文化课须达线，综合分另行折算</div></div>'
          : '<div class="ov-card"><div class="k">' + (isBen ? '本科线' : '专科线') + (diff >= 0 ? '上' : '下') + '</div><div class="v num">' + (diff == null ? '—' : (diff >= 0 ? '+' : '') + diff) + '<small>分</small></div><div class="t">' + (isBen ? '本科批' : '高职专科批') + '控制线 ' + baseLine + ' 分</div></div>') +
        (isArt()
          ? '<div class="ov-card"><div class="k">评估方式</div><div class="v num" style="font-size:20px">综合分差</div><div class="t">与各组投档综合分对比</div></div>'
          : '<div class="ov-card"><div class="k">可报专业组</div><div class="v num">' + nf(all.length) + '</div><div class="t">' + batchName() + ' · 选科相符</div></div>') +
      '</div>' +
      (st.score && !isArt() && isBen && st.score < l.ben ?
        '<div class="tip warn" style="margin-top:13px">' + ICON.warn + '<div><b>你的分数（' + st.score + ' 分）低于本科批控制线 ' + l.ben + ' 分。</b>建议改看高职（专科）批院校，那里同样有公办本科院校的专科专业与优质高职。<button type="button" class="link-btn" data-act="batch" data-arg="专">切换到高职（专科）批 ' + ICON.arrow + '</button></div></div>' : '') +
      (st.score && !isArt() && !isBen && st.score >= l.ben ?
        '<div class="tip info" style="margin-top:13px">' + ICON.info + '<div>你的分数已达本科批控制线 <b>' + l.ben + '</b> 分，本科批院校仍可冲刺。<button type="button" class="link-btn" data-act="batch" data-arg="本">回到本科批 ' + ICON.arrow + '</button></div></div>' : '') +
      '<div class="buckets">' +
        bucketCard('chong', groups.chong, isArt() ? '投档综合分高于你，需要博弈' : '录取位次高于你，需要博弈') +
        bucketCard('wen', groups.wen, isArt() ? '综合分基本匹配，主力志愿' : '位次基本匹配，主力志愿') +
        bucketCard('bao', groups.bao, isArt() ? '投档综合分低于你，兜底保障' : '位次低于你，兜底保障') +
      '</div>' +
      '<div class="toolbar">' +
        '<div class="seg mini" role="group">' +
          ['all', 'chong', 'wen', 'bao'].map(function (k) {
            var label = k === 'all' ? '全部' : BUCKET_NAME[k];
            var n = k === 'all' ? total : groups[k].length;
            return '<button type="button" data-act="recfilter" data-arg="' + k + '" aria-pressed="' + (recFilter === k) + '">' + label + ' ' + n + '</button>';
          }).join('') +
        '</div>' +
        '<div class="spacer"></div>' +
        '<div class="seg mini" role="group">' +
          Object.keys(STYLES).map(function (k) {
            return '<button type="button" data-act="style" data-arg="' + k + '" aria-pressed="' + (st.style === k) + '" title="' + STYLES[k].d + '">' + STYLES[k].name + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="result-list" id="recList">' + recListHTML(groups) + '</div>';
    return html;
  }

  function bucketCard(k, arr, desc) {
    var top = arr.length ? arr[0].g[4] : null;
    var bottom = arr.length ? arr[arr.length - 1].g[4] : null;
    var range = arr.length ? (top === bottom ? top + ' 分' : bottom + '–' + top + ' 分') : '暂无匹配';
    return '<button type="button" class="bucket ' + k + '" data-act="recfilter" data-arg="' + k + '" aria-pressed="' + (recFilter === k) + '">' +
      '<span class="bt"><i>' + BUCKET_NAME[k] + '</i>' + ({ chong: '冲一冲', wen: '稳一稳', bao: '保一保' })[k] + '</span>' +
      '<span class="bn">' + arr.length + '<small>个专业组</small></span>' +
      '<span class="bd">' + range + ' · ' + desc + '</span>' +
      '</button>';
  }

  function recListHTML(groups) {
    var list = [];
    if (recFilter === 'all') list = groups.chong.concat(groups.wen, groups.bao);
    else list = groups[recFilter];
    if (!list.length) {
      return '<div class="empty"><div class="ico">' + ICON.search + '</div><h3>没有符合条件的院校专业组</h3><p>可能是选科限制过严或位次区间过窄，试试调整再选科目或方案风格。</p></div>';
    }

    var html = '';
    if (isVIP()) {
      var shown = list.slice(0, recLimit);
      html = shown.map(function (x, idx) { return recRow(x, idx + 1); }).join('');
      if (list.length > shown.length) {
        html += '<div style="text-align:center;margin-top:13px"><button class="btn btn-ghost btn-sm" type="button" data-act="more">查看更多（还有 ' + (list.length - shown.length) + ' 个）</button></div>';
      }
      return html;
    }

    // 免费墙：前 N 条真实 + 模糊锁定
    var limit = recShowCount();
    var real = list.slice(0, limit);
    var locked = list.slice(limit, limit + 2);
    html = real.map(function (x, idx) { return recRow(x, idx + 1); }).join('');
    html += locked.map(function (x, idx) { return recRow(x, limit + idx + 1, true); }).join('');
    html += '<div class="lock-banner">' +
      '<div class="lb-ico">' + ICON.lock + '</div>' +
      '<h4>解锁全部 ' + list.length + ' 个推荐院校专业组</h4>' +
      '<p>当前为' + (user ? '免费注册版（可看 ' + limit + ' 条）' : '未登录体验（可看 ' + limit + ' 条）') + '，开通 VIP 立即查看完整冲稳保推荐、录取概率与一键编排。</p>' +
      (user
        ? '<button class="btn btn-gold" type="button" data-act="goto" data-arg="vip">' + ICON.crown + '开通 VIP 解锁</button>'
        : '<div style="display:flex;gap:10px;justify-content:center"><button class="btn btn-primary" type="button" data-act="openAuth" data-arg="reg">注册领 3 天VIP体验</button><button class="btn btn-gold" type="button" data-act="goto" data-arg="vip">开通 VIP</button></div>') +
      '</div>';
    return html;
  }

  function recRow(x, idx, locked) {
    var g = x.g, s = x.s, p = x.p;
    var b = bucketOf(p);
    var inList = st.list.indexOf(x.i) >= 0;
    var prov = s[2] ? s[2] + (s[3] && s[3] !== s[2] ? ' · ' + s[3] : '') : '—';
    return '<div class="rec' + (locked ? ' locked' : '') + '" style="--c:var(--' + b + ')"' + (locked ? '' : ' data-act="openSchool" data-arg="' + g[0] + '"') + '>' +
      '<div class="idx num">' + pad2(idx) + '</div>' +
      '<div class="main">' +
        '<div class="name"><b>' + esc(s[0]) + '</b>' + lvBadge(s) + (s[2] === '黑龙江' ? '<span class="badge local">省内</span>' : '') + typeBadges(g) + '</div>' +
        '<div class="meta"><span>第 ' + esc(g[3]) + ' 组</span><span class="sep"></span><span>选科 ' + esc(g[6] || '不限') + '</span><span class="sep"></span><span>' + esc(prov) + '</span></div>' +
      '</div>' +
      '<div class="cell"><span class="l">' + dataYear() + (isArt() ? ' 综合分' : ' 投档分') + '</span><span class="n num">' + g[4] + '</span></div>' +
      '<div class="cell hide-s"><span class="l">' + (isArt() ? '批次' : '位次') + '</span><span class="n dim num">' + (isArt() ? BATCH_CN[batchOf(g)] : nf(g[5])) + '</span></div>' +
      '<div class="prob" style="--c:var(--' + b + ')">' +
        '<div class="bar"><i style="width:' + Math.round(p * 100) + '%"></i></div>' +
        '<div class="pl"><b>' + Math.round(p * 100) + '%</b> ' + BUCKET_NAME[b] + '</div>' +
      '</div>' +
      '<div class="ops"><button class="add' + (inList ? ' done' : '') + '" type="button" data-act="add" data-arg="' + x.i + '" title="' + (inList ? '已在志愿表' : '加入志愿表') + '">' + (inList ? ICON.check : ICON.plus) + '</button></div>' +
    '</div>';
  }

  /* ================================================================
     视图：找大学
     ================================================================ */
  function viewSchools() {
    var provs = {};
    SCHOOLS.forEach(function (s) { if (s[2]) provs[s[2]] = 1; });
    var provList = Object.keys(provs).sort(function (a, b) {
      if (a === '黑龙江') return -1;
      if (b === '黑龙江') return 1;
      return a.localeCompare(b, 'zh');
    });
    var reqs = ['不限', '化学', '化学和生物', '生物', '思想政治', '地理', '思想政治和地理', '生物和思想政治'];

    return '' +
      '<div class="page-head"><h1>找大学</h1><p>' + dataYear() + ' 年黑龙江' + (isArt() ? '艺术类本科批、专科批' : '本科批、高职（专科）批与本科/专科提前批') + '共 ' + nf(yearStat().groups) + ' 个院校专业组投档线，可按批次、分数、' + (isArt() ? '综合分' : '位次') + '、选科与计划类型筛选。切换顶部「数据年份」可查 2024–2026 历年数据。</p></div>' +
      '<div class="filters" id="filters">' +
        '<div class="filter-row">' +
          '<div class="search">' + ICON.search + '<input id="qInput" type="search" placeholder="搜索院校名称，如 哈尔滨工业大学" value="' + esc(view.sf.q) + '"></div>' +
          '<select class="select" id="fKind">' +
            KIND.map(function (k) { return '<option value="' + k + '"' + (st.kind === k ? ' selected' : '') + '>' + KIND_NAME[k] + '</option>'; }).join('') +
          '</select>' +
          (isArt() ? '<select class="select" id="fArt">' +
            ART.map(function (a) { return '<option value="' + a[0] + '"' + (st.art === a[0] ? ' selected' : '') + '>' + a[1] + '</option>'; }).join('') +
            '</select>' : '') +
          '<select class="select" id="fBatch">' +
            (isArt()
              ? [['', '全部批次'], ['艺本', '艺术类本科批'], ['艺专', '艺术类专科批']]
              : [['', '全部批次'], ['本', '本科批'], ['专', '高职（专科）批'], ['提', '提前批（本/专科）']]).map(function (v) {
              return '<option value="' + v[0] + '"' + (view.sf.batch === v[0] ? ' selected' : '') + '>' + v[1] + '</option>';
            }).join('') +
          '</select>' +
          '<select class="select" id="fProv">' +
            '<option value="">全部省份</option>' +
            provList.map(function (p) { return '<option value="' + esc(p) + '"' + (view.sf.prov === p ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') +
          '</select>' +
          '<select class="select" id="fLv">' +
            ['', '985', '211', '1'].map(function (v) {
              var label = v === '' ? '全部层次' : v === '985' ? '985 高校' : v === '211' ? '211 高校' : '双一流';
              return '<option value="' + v + '"' + (view.sf.lv === v ? ' selected' : '') + '>' + label + '</option>';
            }).join('') +
          '</select>' +
          '<select class="select" id="fReq">' +
            '<option value="">全部选科</option>' +
            reqs.map(function (r) { return '<option value="' + r + '"' + (view.sf.req === r ? ' selected' : '') + '>' + (r === '不限' ? '不限选科' : '需 ' + r) + '</option>'; }).join('') +
          '</select>' +
          '<select class="select" id="fTy">' +
            ['', '普通', '中外合作', '国家专项', '地方专项', '少数民族预科', '振兴龙江', '民族班'].map(function (v) {
              var label = v === '' ? '全部计划' : v === '普通' ? '普通类计划' : v;
              return '<option value="' + v + '"' + (view.sf.ty === v ? ' selected' : '') + '>' + label + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="filter-extra">' +
          '<div class="range">投档分 <input id="fMin" type="number" placeholder="最低" value="' + esc(view.sf.min) + '"> — <input id="fMax" type="number" placeholder="最高" value="' + esc(view.sf.max) + '"> 分</div>' +
          '<div class="spacer" style="flex:1"></div>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-act="resetFilter">重置筛选</button>' +
        '</div>' +
      '</div>' +
      '<div id="schoolResults">' + schoolResultsHTML() + '</div>';
  }

  function filteredSchools() {
    var f = view.sf;
    var ki = KI(st.kind);
    var q = f.q.trim().toLowerCase();
    var min = f.min === '' ? null : parseFloat(f.min);
    var max = f.max === '' ? null : parseFloat(f.max);
    var out = [];
    for (var i = 0; i < GROUPS.length; i++) {
      var g = GROUPS[i], s = SCHOOLS[g[0]];
      if (g[1] !== ki || g[9] !== yearIdx()) continue;
      if (isArt()) {
        if (g[10] !== st.art) continue;
        if (f.batch === '艺本' && g[8] !== 4) continue;
        if (f.batch === '艺专' && g[8] !== 5) continue;
      } else {
        if (g[8] > 3) continue;
        if (f.batch === '本' && g[8] !== 0) continue;
        if (f.batch === '专' && g[8] !== 1 && g[8] !== 2) continue;
        if (f.batch === '提' && g[8] !== 2 && g[8] !== 3) continue;
      }
      if (q && s[0].toLowerCase().indexOf(q) < 0) continue;
      if (f.prov && s[2] !== f.prov) continue;
      if (f.lv === '985' && s[4] !== 985) continue;
      if (f.lv === '211' && s[4] !== 211 && s[4] !== 985) continue;
      if (f.lv === '1' && s[4] !== 1 && s[4] !== 211 && s[4] !== 985) continue;
      if (f.req && g[6] !== f.req) continue;
      if (f.ty) {
        var t = typesOf(g);
        if (f.ty === '普通') { if (t.length) continue; }
        else if (t.indexOf(f.ty) < 0) continue;
      }
      if (min != null && !isNaN(min) && g[4] < min) continue;
      if (max != null && !isNaN(max) && g[4] > max) continue;
      out.push({ i: i, g: g, s: s });
    }
    var dir = f.sort.indexOf('asc') > 0 ? 1 : -1;
    out.sort(function (a, b) {
      if (f.sort.indexOf('rank') === 0) return dir * (a.g[5] - b.g[5]) || dir * (a.g[4] - b.g[4]);
      return dir * (a.g[4] - b.g[4]) || dir * (a.g[5] - b.g[5]);
    });
    return out;
  }

  function schoolResultsHTML() {
    var list = filteredSchools();
    var per = 20;
    var pages = Math.max(1, Math.ceil(list.length / per));
    if (view.sf.page > pages) view.sf.page = pages;
    var page = view.sf.page;
    var slice = list.slice((page - 1) * per, page * per);
    var sortKey = view.sf.sort;

    function th(key, label, cls) {
      var on = sortKey.indexOf(key) === 0;
      return '<th class="sortable' + (on ? ' on' : '') + ' ' + (cls || '') + '" data-act="sort" data-arg="' + key + '">' + label +
        '<span class="ar">' + (on ? (sortKey.indexOf('asc') > 0 ? '▲' : '▼') : '↕') + '</span></th>';
    }

    var body = slice.map(function (x) {
      var g = x.g, s = x.s, p = probOf(g);
      return '<tr data-act="openSchool" data-arg="' + g[0] + '">' +
        '<td><div class="tb-school"><b>' + esc(s[0]) + lvBadge(s) + (s[2] === '黑龙江' ? '<span class="badge local">省内</span>' : '') + '</b>' +
          '<span>' + ({ 本: '本科批', 专: '高职专科', 专提: '专科提前', 本提: '本科提前', 艺本: '艺术本科批', 艺专: '艺术专科批' }[batchOf(g)] || '本科批') + ' 第 ' + esc(g[3]) + ' 组 · ' + esc(s[2] || '—') + (s[3] && s[3] !== s[2] ? ' ' + esc(s[3]) : '') + '</span></div></td>' +
        '<td>' + (g[6] === '不限' ? '<span style="color:var(--ink-3)">不限</span>' : esc(g[6])) + '</td>' +
        '<td>' + (typesOf(g).length ? typeBadges(g) : '<span style="color:var(--ink-4)">普通</span>') + '</td>' +
        '<td><span class="tb-num">' + g[4] + '</span><span class="tb-sub"> 分</span></td>' +
        '<td><span class="tb-num" style="font-size:13px;color:var(--ink-2)">' + (isArt() ? BATCH_CN[batchOf(g)] : nf(g[5])) + '</span></td>' +
        '<td>' + (p == null && isVIP() ? '<span style="color:var(--ink-4)">—</span>' : matchBadge(p)) + '</td>' +
        '</tr>';
    }).join('');

    if (!slice.length) {
      body = '<tr><td colspan="6"><div class="empty" style="border:0;padding:44px 20px"><div class="ico">' + ICON.search + '</div><h3>没有找到匹配的院校</h3><p>试试更换筛选条件，或清空搜索关键词。</p></div></td></tr>';
    }

    var pageBtns = '';
    var start = Math.max(1, page - 2), end = Math.min(pages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (var p = start; p <= end; p++) {
      pageBtns += '<button type="button" data-act="page" data-arg="' + p + '"' + (p === page ? ' aria-current="true"' : '') + '>' + p + '</button>';
    }

    return '<div class="table-wrap">' +
      '<table class="tb"><thead><tr>' +
        '<th>院校 · 院校专业组</th><th>选科要求</th><th>计划类型</th>' +
        th('score', isArt() ? '投档综合分' : '投档分', 'num') + th('rank', isArt() ? '批次' : '位次', 'num') + '<th style="text-align:right">匹配度</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table>' +
      '<div class="pager"><div class="info">共 <b>' + nf(list.length) + '</b> 个院校专业组 · 第 ' + page + ' / ' + pages + ' 页' + (isVIP() ? '' : ' · <span class="badge lock" data-act="goto" data-arg="vip">VIP</span> 匹配度需开通会员') + '</div>' +
        '<div class="pages">' +
          '<button type="button" data-act="page" data-arg="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>上一页</button>' +
          pageBtns +
          '<button type="button" data-act="page" data-arg="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + '>下一页</button>' +
        '</div></div></div>';
  }

  /* ---------------- 院校详情弹窗 ---------------- */
  function openSchool(si) {
    var s = SCHOOLS[si];
    var ki = KI(st.kind);
    var yj = yearIdx();
    var all = [];
    for (var i = 0; i < GROUPS.length; i++) {
      if (GROUPS[i][0] !== si || GROUPS[i][1] !== ki) continue;
      if (ki === 2 && GROUPS[i][10] !== st.art) continue;
      all.push({ i: i, g: GROUPS[i] });
    }
    // 往年同批次同组号 -> 分数，用于显示涨跌
    var prevMap = {};
    all.forEach(function (x) {
      if (x.g[9] === yj) return;
      prevMap[batchOf(x.g) + '|' + x.g[3]] = x.g;
    });
    var rows = all.filter(function (x) { return x.g[9] === yj; });
    var prevRows = all.filter(function (x) { return x.g[9] !== yj; });
    rows.sort(function (a, b) { return b.g[4] - a.g[4]; });
    prevRows.sort(function (a, b) { return b.g[4] - a.g[4]; });

    var cur = rows.filter(function (x) { return inBatch(x.g); });
    if (!cur.length) cur = rows;
    var top = cur[0], low = cur[cur.length - 1];

    function rowHTML(x, withDelta) {
      var g = x.g, p = probOf(g);
      var inList = st.list.indexOf(x.i) >= 0;
      var pg = prevMap[batchOf(g) + '|' + g[3]];
      var delta = '';
      if (withDelta && pg) {
        var d = g[4] - pg[4];
        delta = '<span class="yd' + (d > 0 ? ' up' : (d < 0 ? ' down' : '')) + '">' + (d > 0 ? '+' : '') + d + '</span>';
      }
      return '<div class="grp">' +
        '<div class="g1"><b>第 ' + esc(g[3]) + ' 组 ' + batchBadge(g) + matchBadge(p) + '</b>' +
          '<span>选科 ' + esc(g[6] || '不限') + ' · ' + (typesOf(g).length ? esc(typesOf(g).join('、')) : '普通类计划') + '</span></div>' +
        '<div class="g2">' + g[4] + ' 分' + delta + '<small>' + (isArt() ? '综合分' : '位次 ' + nf(g[5])) + '</small></div>' +
        '<div style="text-align:right">' + (g[9] === yj
          ? '<button class="btn btn-sm ' + (inList ? 'btn-soft' : 'btn-ghost') + '" type="button" data-act="add" data-arg="' + x.i + '">' + (inList ? '已加入' : '加入') + '</button>'
          : '<span class="badge yr">' + yearOf(g) + '</span>') + '</div>' +
      '</div>';
    }

    var body = rows.length
      ? '<div class="grp-year">' + dataYear() + ' 年 · ' + rows.length + ' 个专业组</div>' + rows.map(function (x) { return rowHTML(x, true); }).join('')
      : '';
    var prevBody = prevRows.length
      ? '<div class="grp-year">往年数据 · ' + prevRows.length + ' 个专业组（仅供参考，不可加入志愿表）</div>' + prevRows.map(function (x) { return rowHTML(x, false); }).join('')
      : '';

    showModal(
      '<div class="modal-head"><div class="top"><div>' +
        '<h3>' + esc(s[0]) + lvBadge(s) + '</h3>' +
        '<div class="sub"><span>' + esc(s[2] || '—') + (s[3] && s[3] !== s[2] ? ' · ' + esc(s[3]) : '') + '</span><span>院校代号 ' + esc(s[1]) + '</span><span>' + kindShort() + ' · ' + (rows.length + prevRows.length) + ' 个专业组</span></div>' +
        '</div><button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
      '<div class="modal-body">' +
        '<div class="modal-stats">' +
          '<div><span>' + dataYear() + ' 年最高分</span><b>' + (top ? top.g[4] : '—') + '</b></div>' +
          '<div><span>' + dataYear() + ' 年最低分</span><b>' + (low ? low.g[4] : '—') + '</b></div>' +
          '<div><span>' + (isArt() ? '最低综合分' : '最低位次') + '</span><b>' + (isArt() ? (low ? low.g[4] : '—') : (low ? nf(low.g[5]) : '—')) + '</b></div>' +
        '</div>' +
        '<div class="grp-list">' + body + prevBody + '</div>' +
        rkSchoolSection(s[0], 14) +
        '<div class="tip info" style="margin-top:15px">' + ICON.info + '<div>以上为该院校在黑龙江' + kindShort() + '的院校专业组投档最低分，已收录 ' + YEARS.join(' / ') + ' 年' + (isArt() ? '艺术类本科批、专科批（综合分）' : '普通类本科批、高职（专科）批、本科/专科提前批') + '数据。绿色/红色角标为与上一年度同组号的分数差。同一专业组内不同专业录取分可能不同，志愿表以「院校专业组」为单位填报。</div></div>' +
      '</div>'
    );
  }

  function showModal(html, narrow) {
    var root = document.getElementById('modalRoot');
    root.innerHTML = '<div class="modal-mask" data-act="close"></div><div class="modal' + (narrow ? ' narrow' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    root.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    var root = document.getElementById('modalRoot');
    root.hidden = true;
    root.innerHTML = '';
    document.body.style.overflow = '';
  }

  /* ================================================================
     视图：军检标准（军队院校招收学员体格检查标准 2017版）
     ================================================================ */
  var jv = { q: '', ch: '全部' };

  function jcItems() {
    var JC = window.GK_JC || { chapters: [] };
    var q = jv.q.trim().toLowerCase();
    var out = [];
    JC.chapters.forEach(function (c) {
      if (jv.ch !== '全部' && c.t !== jv.ch) return;
      c.items.forEach(function (it) {
        if (q && (it[0] + it[1] + c.t).toLowerCase().indexOf(q) < 0) return;
        out.push({ ch: c.t, no: it[0], txt: it[1] });
      });
    });
    return out;
  }

  function viewJc() {
    var JC = window.GK_JC || { chapters: [], meta: {} };
    var total = 0;
    JC.chapters.forEach(function (c) { total += c.items.length; });
    var chips = ['全部'].concat(JC.chapters.map(function (c) { return c.t; })).map(function (t) {
      return '<button type="button" class="chip" data-act="jcch" data-arg="' + esc(t) + '" aria-pressed="' + (jv.ch === t) + '">' + esc(t) + '</button>';
    }).join('');

    return '' +
      '<div class="page-head"><h1>军检标准</h1><p>《军队院校招收学员体格检查标准》全文（' + esc((JC.meta && JC.meta.effect) || '2017年1月1日起施行') + '），共十章 ' + total + ' 条。报考军队院校（提前批）的考生可先用下方工具自检身高体重与视力，再逐章速查原文。来源：' + esc((JC.meta && JC.meta.source) || '阳光高考平台') + '。</p></div>' +
      '<div class="rank-calc jc-tools">' +
        '<div class="rc-card">' +
          '<h3>身高体重自检</h3>' +
          '<div class="field-row" style="margin-top:0">' +
            '<div class="field"><label>性别</label><select class="select" id="jcSex" style="width:100%"><option value="m">男</option><option value="f">女</option></select></div>' +
            '<div class="field"><label>身高</label><div class="input-wrap"><input id="jcH" type="number" min="140" max="210" placeholder="如 175"><span class="unit">cm</span></div></div>' +
            '<div class="field"><label>体重</label><div class="input-wrap"><input id="jcW" type="number" min="30" max="150" placeholder="如 65"><span class="unit">kg</span></div></div>' +
          '</div>' +
          '<div class="rc-result" id="jcBmiOut" hidden></div>' +
        '</div>' +
        '<div class="rc-card">' +
          '<h3>视力自检</h3>' +
          '<div class="field-row" style="margin-top:0">' +
            '<div class="field"><label>较差一眼裸眼视力</label><div class="input-wrap"><input id="jcV" type="number" step="0.1" min="4.0" max="5.3" placeholder="如 4.6"></div></div>' +
            '<div class="field"><label>矫正度数（选填）</label><div class="input-wrap"><input id="jcD" type="number" min="0" max="2000" placeholder="超过600不合格"><span class="unit">度</span></div></div>' +
          '</div>' +
          '<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-2);margin-top:8px;cursor:pointer"><input type="checkbox" id="jcOp" style="width:15px;height:15px;accent-color:var(--brand)">做过准分子激光手术且满半年、无并发症</label>' +
          '<div class="rc-result" id="jcVisOut" hidden></div>' +
        '</div>' +
      '</div>' +
      '<div class="cat-chips">' + chips + '</div>' +
      '<div class="filters"><div class="search">' + ICON.search + '<input id="jcSearch" type="search" placeholder="搜索条文关键词，如 身高 / 视力 / 文身 / 血压" value="' + esc(jv.q) + '"></div></div>' +
      '<div id="jcResults">' + jcResultsHTML() + '</div>';
  }

  function jcResultsHTML() {
    var items = jcItems();
    if (!items.length) {
      return '<div class="empty"><div class="ico">' + ICON.search + '</div><h3>没有匹配的条文</h3><p>换个关键词试试，比如「身高」「视力」「文身」。</p></div>';
    }
    return '<div class="jc-count">共 <b class="num">' + nf(items.length) + '</b> 条' + (jv.ch !== '全部' ? ' · ' + esc(jv.ch) : '') + '</div>' +
      '<div class="jc-list">' + items.map(function (x) {
        return '<div class="jc-item"><div class="jc-no">' + esc(x.no) + '<span>' + esc(x.ch) + '</span></div><div class="jc-txt">' + esc(x.txt) + '</div></div>';
      }).join('') + '</div>';
  }

  function jcBmiText(m, h, w) {
    var minH = m ? 162 : 160;
    if (h < minH) {
      return '<span style="color:#a32d2d"><b>身高未达基本线</b></span>：' + (m ? '男性' : '女性') + '要求 ' + minH + 'cm 以上。' +
        (m ? '特种作战专业体格条件优秀者可放宽至 165cm。' : '特种作战专业要求 165cm 以上。') + '部分专业另有区间要求（装甲 162～178、水面舰艇/潜艇 ' + (m ? '162～182' : '160～182') + '、潜水 168～185、空降 168 以上）。';
    }
    var std = h - 110;
    var lo = std * 0.85, hi = std * (m ? 1.30 : 1.20);
    var rel = w < lo ? '偏轻' : (w > hi ? '超重' : 'ok');
    var head = rel === 'ok'
      ? '<span style="color:#0a6b51"><b>体重达标</b></span>'
      : '<span style="color:#a32d2d"><b>体重' + rel + '</b></span>';
    var extra = '';
    if (m && w > hi && w <= std * 1.35) extra = '报考音乐学专业上限放宽至标准体重的 35%。';
    return head + '：标准体重 = 身高 - 110 = <b class="num">' + std + '</b> kg，合格区间 <b class="num">' + lo.toFixed(1) + '～' + hi.toFixed(1) + '</b> kg（不低于标准体重 15%、不超过 ' + (m ? '30' : '20') + '%）。' + extra + '音乐学、舞蹈学等专业另有放宽/收紧，见第四条原文。';
  }

  function jcVisText(v, deg, op) {
    if (!v || v < 4.0 || v > 5.3) return '';
    var blind = ['指挥', '装甲', '测绘', '雷达', '水面舰艇', '潜艇', '潜水', '空降', '特种作战'];
    var okTxt = '可报除 <b>' + blind.join('、') + '</b> 以外的专业';
    if (v < 4.5) {
      return '<span style="color:#a32d2d"><b>不合格</b></span>：任一眼裸眼视力低于 4.5 即不合格（第三十九条）。';
    }
    if (op) {
      if (v >= 4.9) {
        return '<span style="color:#0a6b51"><b>手术矫正合格</b></span>：准分子激光手术后半年以上、无并发症且裸眼达 4.9、眼底正常者，' + okTxt + '（手术后不能报考上述 9 类专业）。另需注意色觉、斜视等其他眼科条件。';
      }
      return '<span style="color:#a32d2d"><b>不合格</b></span>：手术后任意一眼裸眼视力仍需达到 4.9（第三十九条）。';
    }
    if (v >= 5.0) {
      return '<span style="color:#0a6b51"><b>全部专业视力达标</b></span>：指挥、装甲、测绘、雷达、水面舰艇、潜艇要求裸眼 ≥ 4.9；潜水、空降、特种作战要求裸眼 ≥ 5.0，均满足。';
    }
    if (v >= 4.9) {
      return '<span style="color:#0a6b51"><b>大部分专业达标</b></span>：可报指挥、装甲、测绘、雷达、水面舰艇、潜艇（裸眼 ≥ 4.9）；潜水、空降、特种作战要求裸眼 ≥ 5.0，暂不满足。';
    }
    var dOk = deg !== null && deg <= 600;
    var corr = '裸眼低于 4.9 需矫正视力检查：矫正视力 ≥ 4.9 且矫正度数 ≤ 600 度，' + okTxt + '（第三十九条）。';
    if (deg === null) {
      return '<span style="color:#854f0b"><b>需补充矫正信息</b></span>：' + corr + '请在上方填写矫正度数。';
    }
    if (!dOk) {
      return '<span style="color:#a32d2d"><b>不合格</b></span>：矫正度数超过 600 度（或矫正视力不足 4.9）即不合格。';
    }
    return '<span style="color:#0a6b51"><b>矫正后合格</b></span>：' + okTxt + '。色弱、色盲不合格；能识别红、绿、黄、蓝、紫各单色者，除指挥、水面舰艇、潜艇、空降、装甲、测绘、雷达专业外合格（第四十条）。';
  }

  /* ================================================================
     视图：查专业
     ================================================================ */
  /* ---------------- 教育部《本科专业目录（2026年）》全量 883 种（含交叉学科门类） ---------------- */
  var CAT = window.GK_MAJORS || { menlei: [], classes: [], rows: [], meta: {} };
  var PROF = {};
  YZ.majors.forEach(function (m) { PROF[m.n] = m; });

  function catOf(r) { return { ml: CAT.menlei[r[3]] || '', cls: CAT.classes[r[4]] || '' }; }
  function catTotal() { return (CAT.meta && CAT.meta.total) || CAT.rows.length; }
  function codeFlag(code) {
    if (code.indexOf('TK') >= 0) return 'tk';
    if (code.indexOf('T') >= 0) return 't';
    if (code.indexOf('K') >= 0) return 'k';
    return '';
  }

  /* ---------------- 2023 软科中国大学专业排名（GK_RK） ----------------
     数据：data/ruanke（PDF 版面解析）→ assets/ruanke.js
     RK.m[专业] = [门类序号, 专业类序号, 开设院校数, 上榜院校数, 记录串]
     记录串每 5 字符一条：院校序号(2, base36) + 排名(2, base36) + 等级(1) */
  var RK = window.GK_RK || { meta: {}, ml: [], cl: [], s: [], m: {} };
  var RK_G = ['A+', 'A', 'B+', 'B'];
  var RK_CLS = ['ap', 'a', 'bp', 'b'];
  var _rkMaj = {}, _rkSchool = null, _codeOfName = null;

  function rkHas(m) { return !!RK.m[m]; }
  function rkMeta(m) { return RK.m[m] || null; }
  function rkMaj(m) {
    if (_rkMaj[m]) return _rkMaj[m];
    var a = RK.m[m];
    if (!a) return (_rkMaj[m] = []);
    var t = a[4], out = [];
    for (var i = 0; i < t.length; i += 5) {
      out.push({ s: RK.s[parseInt(t.substr(i, 2), 36)], r: parseInt(t.substr(i + 2, 2), 36), g: +t[i + 4] });
    }
    return (_rkMaj[m] = out);
  }
  function rkSchoolMap() {
    if (_rkSchool) return _rkSchool;
    var map = {};
    Object.keys(RK.m).forEach(function (m) {
      var t = RK.m[m][4];
      for (var i = 0; i < t.length; i += 5) {
        var s = RK.s[parseInt(t.substr(i, 2), 36)];
        (map[s] || (map[s] = [])).push({ m: m, r: parseInt(t.substr(i + 2, 2), 36), g: +t[i + 4] });
      }
    });
    Object.keys(map).forEach(function (s) {
      map[s].sort(function (a, b) { return a.g - b.g || a.r - b.r || a.m.localeCompare(b.m); });
    });
    return (_rkSchool = map);
  }
  function rkLvTag(g, r) {
    return '<i class="rk-lv ' + RK_CLS[g] + '">' + RK_G[g] + '</i>' + (r ? '<span class="rk-pos">第' + r + '名</span>' : '');
  }
  function codeOfMajor(name) {
    if (!_codeOfName) {
      _codeOfName = {};
      CAT.rows.forEach(function (r) { if (!_codeOfName[r[2]]) _codeOfName[r[2]] = r[1]; });
    }
    return _codeOfName[name] || null;
  }

  // 专业弹窗里的全国排名区块
  function rkMajorSection(name) {
    var a = rkMeta(name);
    if (!a) return '';
    var list = rkMaj(name);
    var ap = list.filter(function (x) { return x.g === 0; });
    var lvA = list.filter(function (x) { return x.g === 1; });
    function chips(arr, max) {
      var n = max ? Math.min(arr.length, max) : arr.length;
      return '<div class="rk-chips">' + arr.slice(0, n).map(function (x) {
        return '<button type="button" class="rk-chip" data-act="rkschool" data-arg="' + esc(x.s) + '">' +
          '<b>' + esc(x.s) + '</b><span>第 ' + x.r + ' 名</span></button>';
      }).join('') + '</div>';
    }
    return '<div class="mj-sec rk-sec">' +
      '<h4>全国排名 <i class="rk-src">' + RK.meta.src + '</i></h4>' +
      '<div class="rk-sum">全国 <b class="num">' + nf(a[2]) + '</b> 所高校开设，<b class="num">' + nf(a[3]) + '</b> 所上榜 · ' +
        '<span class="rk-lv ap">A+</span> ' + ap.length + ' 所 · <span class="rk-lv a">A</span> ' + lvA.length + ' 所</div>' +
      (ap.length ? chips(ap, 12) : '') +
      (lvA.length ? chips(lvA, 8) : '') +
      (list.length > Math.min(ap.length, 12) + Math.min(lvA.length, 8)
        ? '<button class="btn btn-ghost btn-sm rk-more" type="button" data-act="rkfull" data-arg="' + esc(name) + '">查看全部 ' + nf(list.length) + ' 所上榜院校</button><div class="rk-all" id="rkAll" hidden></div>'
        : '') +
    '</div>';
  }

  function rkFullHTML(name) {
    var list = rkMaj(name);
    var groups = [[], [], [], []];
    list.forEach(function (x) { groups[x.g].push(x); });
    return groups.map(function (arr, g) {
      if (!arr.length) return '';
      return '<div class="rk-grp"><div class="rk-gh"><i class="rk-lv ' + RK_CLS[g] + '">' + RK_G[g] + '</i><span>' + arr.length + ' 所</span></div>' +
        '<div class="rk-glist">' + arr.map(function (x, i) {
          var pre = i > 0 && arr[i - 1].r === x.r;
          return '<span class="rk-gi"><b class="num">' + (pre ? '=' : '') + x.r + '</b>' + esc(x.s) + '</span>';
        }).join('') + '</div></div>';
    }).join('');
  }

  // 院校弹窗里的优势专业区块
  function rkSchoolSection(name, limit) {
    var list = rkSchoolMap()[name];
    if (!list) {
      return '<div class="mj-sec rk-sec"><h4>优势专业 <i class="rk-src">' + RK.meta.src + '</i></h4>' +
        '<div class="rk-none">该校未进入 ' + RK.meta.y + ' 年软科专业排名榜单（或校名与榜单口径不一致）。</div></div>';
    }
    var ap = list.filter(function (x) { return x.g === 0; });
    var lvA = list.filter(function (x) { return x.g === 1; });
    function chip(x) {
      var has = codeOfMajor(x.m);
      return '<' + (has ? 'button' : 'span') + ' class="rk-mj' + (has ? '' : ' plain') + '"' +
        (has ? ' type="button" data-act="rkmaj" data-arg="' + esc(x.m) + '"' : '') + '>' +
        esc(x.m) + '<i class="rk-lv ' + RK_CLS[x.g] + '">' + RK_G[x.g] + '</i><em>第' + x.r + '名</em></' + (has ? 'button' : 'span') + '>';
    }
    var n = limit || 0;
    var show = n ? list.slice(0, n) : list;
    return '<div class="mj-sec rk-sec"><h4>优势专业 <i class="rk-src">' + RK.meta.src + '</i></h4>' +
      '<div class="rk-sum">上榜 <b class="num">' + list.length + '</b> 个专业 · <span class="rk-lv ap">A+</span> ' + ap.length + ' 个 · <span class="rk-lv a">A</span> ' + lvA.length + ' 个</div>' +
      '<div class="rk-mjs">' + show.map(chip).join('') + '</div>' +
      (n && list.length > n ? '<div class="rk-none">仅显示前 ' + n + ' 个，按等级与名次排序。</div>' : '') +
      '</div>';
  }

  // 查专业页「院校优势」列表
  function rkSchoolRows() {
    var q = mv.q.trim().toLowerCase();
    var map = rkSchoolMap();
    var arr = [];
    Object.keys(map).forEach(function (s) {
      var l = map[s];
      if (mv.cat !== '全部') {
        l = l.filter(function (x) { return (RK.ml[RK.m[x.m][0]] || '') === mv.cat; });
        if (!l.length) return;
      }
      var ap = 0, a = 0;
      l.forEach(function (x) { if (x.g === 0) ap++; else if (x.g === 1) a++; });
      if (q && s.toLowerCase().indexOf(q) < 0) return;
      var top = l.filter(function (x) { return x.g === 0; }).slice(0, 3);
      arr.push({ s: s, n: l.length, ap: ap, a: a, top: top });
    });
    arr.sort(function (a, b) { return b.ap - a.ap || b.a - a.a || b.n - a.n || a.s.localeCompare(b.s); });
    return arr;
  }

  function rkSchoolsHTML() {
    var arr = rkSchoolRows();
    if (!arr.length) {
      return '<div class="empty"><div class="ico">' + ICON.search + '</div><h3>没有匹配的院校</h3><p>试试「哈尔滨」「工业」等关键词。</p></div>';
    }
    var cap = mv.q.trim() ? arr.length : Math.min(arr.length, 60);
    var body = arr.slice(0, cap).map(function (x) {
      var prov = '';
      for (var i = 0; i < SCHOOLS.length; i++) { if (SCHOOLS[i][0] === x.s) { prov = SCHOOLS[i][2]; break; } }
      return '<button type="button" class="rk-srow" data-act="rklist" data-arg="' + esc(x.s) + '">' +
        '<span class="rk-sn"><b>' + esc(x.s) + '</b>' + (prov ? '<i class="rk-prov">' + esc(prov) + '</i>' : '') + '</span>' +
        '<span class="rk-sc"><i class="rk-lv ap">A+</i><b class="num">' + x.ap + '</b><i class="rk-lv a">A</i><b class="num">' + x.a + '</b><em>上榜 ' + x.n + '</em></span>' +
        '<span class="rk-st">' + x.top.map(function (t) { return '<i>' + esc(t.m) + '</i>'; }).join('') + '</span>' +
      '</button>';
    }).join('');
    return '<div class="mj-count">共 <b class="num">' + nf(arr.length) + '</b> 所院校上榜' +
      (mv.cat !== '全部' ? ' · ' + esc(mv.cat) : '') + '<span>' + (cap < arr.length ? '按 A+ 数量排序，仅显示前 ' + cap + ' 所，可用搜索精确定位' : '按 A+ 数量排序，点击查看全部上榜专业') + '</span></div>' +
      '<div class="rk-slist">' + body + '</div>';
  }

  // 单独的院校优势专业弹窗
  function openSchoolRk(name) {
    var list = rkSchoolMap()[name] || [];
    var ap = list.filter(function (x) { return x.g === 0; });
    var lvA = list.filter(function (x) { return x.g === 1; });
    var prov = '', code = '';
    for (var i = 0; i < SCHOOLS.length; i++) { if (SCHOOLS[i][0] === name) { prov = SCHOOLS[i][2] || ''; code = SCHOOLS[i][1] || ''; break; } }
    var groups = [[], [], [], []];
    list.forEach(function (x) { groups[x.g].push(x); });
    var body = groups.map(function (arr, g) {
      if (!arr.length) return '';
      return '<div class="rk-grp"><div class="rk-gh"><i class="rk-lv ' + RK_CLS[g] + '">' + RK_G[g] + '</i><span>' + arr.length + ' 个专业</span></div>' +
        '<div class="rk-glist">' + arr.map(function (x, i) {
          var has = codeOfMajor(x.m);
          return '<span class="rk-gi"><b class="num">' + x.r + '</b>' +
            (has ? '<a href="javascript:void(0)" data-act="rkmaj" data-arg="' + esc(x.m) + '">' + esc(x.m) + '</a>' : esc(x.m)) + '</span>';
        }).join('') + '</div></div>';
    }).join('');
    showModal(
      '<div class="modal-head"><div class="top"><div>' +
        '<h3>' + esc(name) + '</h3>' +
        '<div class="sub"><span>' + (prov ? esc(prov) + ' · ' : '') + (code ? '院校代号 ' + esc(code) : '软科榜单院校') + '</span><span>上榜 ' + list.length + ' 个专业</span><span>A+ ' + ap.length + ' · A ' + lvA.length + '</span></div>' +
        '</div><button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
      '<div class="modal-body">' +
        (list.length ? body : '<div class="empty"><div class="ico">' + ICON.search + '</div><h3>无上榜专业</h3><p>该校未进入 ' + RK.meta.y + ' 年软科专业排名榜单。</p></div>') +
        '<div class="tip info" style="margin-top:14px">' + ICON.info + '<div>排名为 ' + RK.meta.src + '（' + RK.meta.pub + '）结果，仅覆盖参评专业；未上榜不等于该专业弱，部分专业因参评院校不足未列入。点击专业名可查看该专业的全国完整榜单。</div></div>' +
      '</div>'
    );
  }

  function catRows() {
    var q = mv.q.trim().toLowerCase();
    var out = [];
    for (var i = 0; i < CAT.rows.length; i++) {
      var r = CAT.rows[i], c = catOf(r);
      if (mv.cat !== '全部' && c.ml !== mv.cat) continue;
      if (mv.cls !== '全部' && c.cls !== mv.cls) continue;
      if (q) {
        var p = PROF[r[2]];
        var hay = (r[2] + r[1] + c.cls + c.ml + (p ? p.d + p.k + p.j : '')).toLowerCase();
        if (hay.indexOf(q) < 0) continue;
      }
      out.push(r);
    }
    return out;
  }

  function viewMajors() {
    var M = CAT.meta || {};
    var stats = [
      [catTotal(), '本科专业'],
      [M.classCount || CAT.classes.length, '专业类'],
      [M.menleiCount || CAT.menlei.length, '学科门类'],
      [M.tCount || 0, '特设专业 T'],
      [M.kCount || 0, '国控专业 K']
    ].map(function (x) {
      return '<div><b class="num">' + nf(x[0]) + '</b><span>' + x[1] + '</span></div>';
    }).join('');

    var chips = ['全部'].concat(CAT.menlei).map(function (c) {
      return '<button type="button" class="chip" data-act="mjcat" data-arg="' + esc(c) + '" aria-pressed="' + (mv.cat === c) + '">' + esc(c) + '</button>';
    }).join('');

    var clsList = CAT.classes.filter(function (c) {
      if (mv.cat === '全部') return true;
      for (var i = 0; i < CAT.rows.length; i++) {
        if (CAT.classes[CAT.rows[i][4]] === c && CAT.menlei[CAT.rows[i][3]] === mv.cat) return true;
      }
      return false;
    });
    var clsOpts = '<option value="全部">全部专业类</option>' + clsList.map(function (c) {
      return '<option value="' + esc(c) + '"' + (mv.cls === c ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');

    return '' +
      '<div class="page-head"><h1>查专业</h1><p>依据教育部' + esc((CAT.meta && CAT.meta.source || '《普通高等学校本科专业目录》').replace('教育部', '')) + '（' + esc((CAT.meta && CAT.meta.pub) || '') + '公布）：共 <b>' + nf(catTotal()) + '</b> 种本科专业、' + (CAT.meta && CAT.meta.classCount || CAT.classes.length) + ' 个专业类、' + (CAT.meta && CAT.meta.menleiCount || CAT.menlei.length) + ' 个学科门类（新增「交叉学科」）；同时收录 ' + RK.meta.src + ' 的 ' + nf(RK.meta.nRows) + ' 条院校专业排名（' + nf(RK.meta.nSchools) + ' 所高校、' + nf(RK.meta.n) + ' 个专业）。可按门类逐级筛选、搜专业，或切到「院校优势」看某所大学哪些专业最强。</p></div>' +
      '<div class="mj-stats">' + stats + '</div>' +
      '<div class="mj-tabs" role="tablist">' +
        '<button type="button" role="tab" data-act="mjtab" data-arg="all" aria-selected="' + (mv.tab === 'all') + '">完整目录 <i>' + nf(catTotal()) + '</i></button>' +
        '<button type="button" role="tab" data-act="mjtab" data-arg="read" aria-selected="' + (mv.tab === 'read') + '">专业解读 <i>' + YZ.majors.length + '</i></button>' +
        '<button type="button" role="tab" data-act="mjtab" data-arg="rk" aria-selected="' + (mv.tab === 'rk') + '">院校优势 <i>' + nf(RK.meta.nSchools || 0) + '</i></button>' +
      '</div>' +
      '<div class="filters mj-filters">' +
        '<div class="search">' + ICON.search + '<input id="mjSearch" type="search" placeholder="' + (mv.tab === 'rk' ? '搜索院校名称，如 哈尔滨工业大学' : '搜索专业名称、代码或专业类，如 计算机 / 080901') + '" value="' + esc(mv.q) + '"></div>' +
        (mv.tab === 'all' ? '<select class="select" id="mjCls">' + clsOpts + '</select>' : '') +
      '</div>' +
      '<div class="cat-chips">' + chips + '</div>' +
      '<div id="majorResults">' + majorResultsHTML() + '</div>';
  }

  function mjEmpty() {
    return '<div class="empty"><div class="ico">' + ICON.search + '</div><h3>没有找到匹配的专业</h3><p>换个关键词试试，比如「计算机」「医学」「0809」。</p></div>';
  }

  function majorResultsHTML() {
    if (mv.tab === 'read') return majorCardsHTML();
    if (mv.tab === 'rk') return rkSchoolsHTML();
    var rows = catRows();
    if (!rows.length) return mjEmpty();
    var head = '<div class="mj-count">共 <b class="num">' + nf(rows.length) + '</b> 个专业' +
      (mv.cat !== '全部' ? ' · ' + esc(mv.cat) : '') + (mv.cls !== '全部' ? ' · ' + esc(mv.cls) : '') +
      '<span>点击任意专业查看代码、学位与解读</span></div>';
    var thead = '<div class="mj-head"><span>专业名称</span><span>专业类</span><span>学位授予</span><span>学制</span><span>代码</span></div>';
    var body = rows.map(function (r) {
      var c = catOf(r), f = codeFlag(r[1]);
      return '<button type="button" class="mj-row" data-act="mjrow" data-arg="' + esc(r[1]) + '">' +
        '<span class="mj-name">' + esc(r[2]) +
          (f ? '<i class="tk ' + f + '">' + (f === 'tk' ? 'TK' : f.toUpperCase()) + '</i>' : '') +
          (PROF[r[2]] ? '<i class="mj-has">解读</i>' : '') +
        '</span>' +
        '<span class="mj-cls">' + esc(c.cls) + '</span>' +
        '<span class="mj-deg">' + esc(r[5]) + '</span>' +
        '<span class="mj-yrs">' + esc(r[6]) + '</span>' +
        '<span class="mj-code num">' + esc(r[1]) + '</span>' +
      '</button>';
    }).join('');
    return head + thead + '<div class="mj-list">' + body + '</div>';
  }

  function majorCardsHTML() {
    var q = mv.q.trim().toLowerCase();
    var list = YZ.majors.filter(function (m) {
      if (mv.cat !== '全部' && m.c !== mv.cat) return false;
      if (!q) return true;
      return (m.n + m.k + m.j + m.d).toLowerCase().indexOf(q) >= 0;
    });
    if (!list.length) return mjEmpty();
    return '<div class="mj-count">共 <b class="num">' + list.length + '</b> 个专业解读' +
      (mv.cat !== '全部' ? ' · ' + esc(mv.cat) : '') + '<span>解读为通用性描述，培养方案以院校当年招生章程为准</span></div>' +
      '<div class="majors-grid">' + list.map(function (m) {
      return '<div class="major-card">' +
        '<div class="mc-head"><b>' + esc(m.n) + '</b><span class="mc-badge">' + esc(m.c) + '</span><span class="mc-badge year">' + esc(m.y) + '</span></div>' +
        '<div class="mc-row">' + esc(m.d) + '</div>' +
        '<div class="mc-row mr"><b>核心课程</b><span>' + esc(m.k) + '</span></div>' +
        '<div class="mc-row mr"><b>就业方向</b><span>' + esc(m.j) + '</span></div>' +
        '<div class="mc-schools"><span class="lbl">省内推荐院校</span>' +
          m.s.map(function (s) { return '<span class="ms">' + esc(s) + '</span>'; }).join('') +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function openMajor(code) {
    var r = null;
    for (var i = 0; i < CAT.rows.length; i++) { if (CAT.rows[i][1] === code) { r = CAT.rows[i]; break; } }
    if (!r) return;
    var c = catOf(r), p = PROF[r[2]];
    var tags = '';
    if (r[1].indexOf('T') >= 0) tags += '<span class="tk t">特设</span>';
    if (r[1].indexOf('K') >= 0) tags += '<span class="tk k">国控</span>';
    var info = [
      ['专业代码', r[1]], ['学科门类', c.ml], ['专业类', c.cls],
      ['学位授予门类', r[5]], ['修业年限', r[6]], ['增设年度', r[7] || '目录原有']
    ].map(function (x) {
      return '<div><span>' + x[0] + '</span><b' + (x[0] === '专业代码' ? ' class="num"' : '') + '>' + esc(x[1]) + '</b></div>';
    }).join('');

    var deep = p
      ? '<div class="mj-sec"><h4>专业解读</h4><p>' + esc(p.d) + '</p></div>' +
        '<div class="mj-sec"><h4>核心课程</h4><p>' + esc(p.k) + '</p></div>' +
        '<div class="mj-sec"><h4>就业方向</h4><p>' + esc(p.j) + '</p></div>' +
        '<div class="mj-sec"><h4>省内推荐院校</h4><div class="mj-schools">' +
          p.s.map(function (s) { return '<span class="ms">' + esc(s) + '</span>'; }).join('') + '</div></div>'
      : '<div class="tip info" style="margin-top:14px">' + ICON.info + '<div>该专业暂无深度解读。院校投档线以「院校专业组」为单位公布，不区分组内专业，可在 <a href="#/schools" style="color:var(--brand);text-decoration:underline">找大学</a> 中按投档分筛选。</div></div>';

    showModal(
      '<div class="modal-head"><div class="top"><div>' +
        '<h3>' + esc(r[2]) + tags + '</h3>' +
        '<div class="sub"><span>' + esc(c.ml) + ' · ' + esc(c.cls) + '</span><span>' + esc(r[5]) + ' 学位</span><span>' + esc(r[6]) + '</span></div>' +
        '</div><button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
      '<div class="modal-body">' +
        '<div class="mj-grid">' + info + '</div>' +
        rkMajorSection(r[2]) +
        deep +
        '<div class="tip info" style="margin-top:14px">' + ICON.info + '<div>代码后缀：<b>T</b> 特设专业（按特定需求设置、动态调整）；<b>K</b> 国家控制布点专业（招生规模受控，如临床医学、公安类、部分师范类）。来源：' + esc((CAT.meta && CAT.meta.source) || '教育部本科专业目录') + '。</div></div>' +
      '</div>', true
    );
  }

  /* ================================================================
     视图：专科（高职）专区
     专业目录：教育部《职业教育专业目录（2021年）》—— 高职专科 754 个专业 / 97 专业类 / 19 大类
               同目录中的职业本科 321 个专业 / 92 专业类
     院校排名：软科 2026 中国高职专科院校排名（总榜 971 所）
     ================================================================ */
  var ZK = window.GK_ZK || { meta: { zy: {}, ben: {} }, cat: [], cls: [], m: [], bc: [], bcl: [], b: [], prov: [], ty: [], s: [], zb: [] };
  var zv = { q: '', cat: '全部', cls: '全部', tab: 'zy', prov: '黑龙江', ty: '全部' };

  function zkIsBen() { return zv.tab === 'ben'; }
  function zkRows() { return zkIsBen() ? ZK.b : ZK.m; }
  function zkClsOf(r) { return (zkIsBen() ? ZK.bcl : ZK.cls)[r[3]] || ''; }
  function zkCats() { return ZK.cat || []; }
  function zkTypes() { return ZK.ty || []; }

  function zkProvList() {
    var rest = (ZK.prov || []).filter(function (p) { return p !== '黑龙江'; });
    rest.sort(function (a, b) { return a.localeCompare(b, 'zh-Hans-CN'); });
    return ['黑龙江', '全国'].concat(rest);
  }
  function zkHlCount() {
    return (ZK.s || []).filter(function (s) { return ZK.prov[s[1]] === '黑龙江'; }).length;
  }
  function zkRankNum(v) {
    var n = parseInt(String(v == null ? '' : v).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? 99999 : n;
  }
  function zkDelta(d) {
    if (!d) return '<i class="zk-d">持平</i>';
    return d > 0
      ? '<i class="zk-d up">▲ ' + d + '</i>'
      : '<i class="zk-d dn">▼ ' + (-d) + '</i>';
  }

  function zkMajorList() {
    var q = zv.q.trim().toLowerCase();
    return zkRows().filter(function (r) {
      if (zv.cat !== '全部' && zkCats()[r[2]] !== zv.cat) return false;
      if (zv.cls !== '全部' && zkClsOf(r) !== zv.cls) return false;
      if (!q) return true;
      return (r[0] + r[1] + zkClsOf(r)).toLowerCase().indexOf(q) >= 0;
    });
  }

  function zkSchoolList() {
    var q = zv.q.trim().toLowerCase();
    var arr = (ZK.s || []).filter(function (s) {
      if (zv.prov !== '全国' && ZK.prov[s[1]] !== zv.prov) return false;
      if (zv.ty !== '全部' && zkTypes()[s[2]] !== zv.ty) return false;
      if (q && s[0].toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    arr.sort(function (a, b) { return zkRankNum(a[3]) - zkRankNum(b[3]); });
    return arr;
  }

  function zkClsOptions() {
    var seen = {}, opts = [];
    zkRows().forEach(function (r) {
      if (zv.cat !== '全部' && zkCats()[r[2]] !== zv.cat) return;
      var c = zkClsOf(r);
      if (c && !seen[c]) { seen[c] = 1; opts.push(c); }
    });
    return '<option value="全部">全部专业类</option>' + opts.map(function (c) {
      return '<option value="' + esc(c) + '"' + (zv.cls === c ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
  }

  function viewZk() {
    var M = ZK.meta || {}, zy = M.zy || {}, ben = M.ben || {};
    var isSch = zv.tab === 'sch';
    var stats = [
      [zy.n || ZK.m.length, '高职专科专业'],
      [zy.cls || ZK.cls.length, '专业类'],
      [zy.cat || ZK.cat.length, '专业大类'],
      [M.sch || ZK.s.length, '高职院校（软科）'],
      [zkHlCount(), '省内高职入围']
    ].map(function (x) {
      return '<div><b class="num">' + nf(x[0]) + '</b><span>' + x[1] + '</span></div>';
    }).join('');

    var chips = (isSch ? ['全部'].concat(zkTypes()) : ['全部'].concat(zkCats())).map(function (c) {
      var on = isSch ? zv.ty === c : zv.cat === c;
      return '<button type="button" class="chip" data-act="zkchip" data-arg="' + esc(c) + '" aria-pressed="' + on + '">' + esc(c) + '</button>';
    }).join('');

    var provOpts = zkProvList().map(function (p) {
      return '<option value="' + esc(p) + '"' + (zv.prov === p ? ' selected' : '') + '>' + (p === '全国' ? '全国（不限省份）' : p) + '</option>';
    }).join('');

    var ph = isSch ? '搜索高职院校名称，如 黑龙江职业学院' : '搜索专业名称、代码或专业类，如 护理 / 520201';

    return '' +
      '<div class="page-head"><h1>高职招生</h1><p>面向专科批考生：' + esc(M.catSrc || '教育部《职业教育专业目录（2021年）》') + ' 收录 <b>' + nf(zy.n || 754) + '</b> 个高职专科专业（' + (zy.cat || 19) + ' 个专业大类、' + (zy.cls || 97) + ' 个专业类），并含同目录下 <b>' + nf(ben.n || 321) + '</b> 个职业本科专业；院校侧接入 ' + esc(M.src || '软科中国高职专科院校排名') + '（' + nf(M.sch || 971) + ' 所，含黑龙江 ' + zkHlCount() + ' 所）。</p></div>' +
      '<div class="mj-stats">' + stats + '</div>' +
      '<div class="mj-tabs" role="tablist">' +
        '<button type="button" role="tab" data-act="zktab" data-arg="zy" aria-selected="' + (zv.tab === 'zy') + '">高职专科目录 <i>' + nf(zy.n || ZK.m.length) + '</i></button>' +
        '<button type="button" role="tab" data-act="zktab" data-arg="ben" aria-selected="' + (zv.tab === 'ben') + '">职业本科目录 <i>' + nf(ben.n || ZK.b.length) + '</i></button>' +
        '<button type="button" role="tab" data-act="zktab" data-arg="sch" aria-selected="' + isSch + '">高职院校排名 <i>' + nf(M.sch || ZK.s.length) + '</i></button>' +
      '</div>' +
      '<div class="filters mj-filters">' +
        '<div class="search">' + ICON.search + '<input id="zkSearch" type="search" placeholder="' + ph + '" value="' + esc(zv.q) + '"></div>' +
        (isSch ? '<select class="select" id="zkProv">' + provOpts + '</select>' : '<select class="select" id="zkCls">' + zkClsOptions() + '</select>') +
      '</div>' +
      '<div class="cat-chips">' + chips + '</div>' +
      '<div id="zkResults">' + zkResultsHTML() + '</div>' +
      (isSch ? '' : '<div class="tip info zk-tip">' + ICON.info + '<div>代码规则：6 位专业代码的前 2 位为专业大类、前 4 位为专业类。例如 <b>520201 护理</b> → 52 医药卫生大类 → 5202 护理类。目录仅规定专业名称与代码，各校实际招生专业、选科要求与计划以当年《黑龙江省普通高等学校招生计划》为准。</div></div>');
  }

  function zkResultsHTML() {
    return zv.tab === 'sch' ? zkSchoolsHTML() : zkMajorsHTML();
  }

  function zkMajorsHTML() {
    var rows = zkMajorList();
    if (!rows.length) {
      return '<div class="empty"><div class="ico">' + ICON.search + '</div><h3>没有找到匹配的专业</h3><p>换个关键词试试，比如「护理」「机电」「5202」。</p></div>';
    }
    var head = '<div class="mj-count">共 <b class="num">' + nf(rows.length) + '</b> 个' + (zkIsBen() ? '职业本科' : '高职专科') + '专业' +
      (zv.cat !== '全部' ? ' · ' + esc(zv.cat) : '') + (zv.cls !== '全部' ? ' · ' + esc(zv.cls) : '') +
      '<span>点击查看代码、所属专业类与同专业类其他专业</span></div>';
    var thead = '<div class="mj-head zk-mhead"><span>专业名称</span><span>专业类</span><span>专业大类</span><span>代码</span></div>';
    var body = rows.map(function (r) {
      return '<button type="button" class="mj-row zk-mrow" data-act="zkrow" data-arg="' + esc(r[0]) + '">' +
        '<span class="mj-name">' + esc(r[1]) + '</span>' +
        '<span class="mj-cls">' + esc(zkClsOf(r)) + '</span>' +
        '<span class="mj-deg">' + esc(zkCats()[r[2]] || '') + '</span>' +
        '<span class="mj-code num">' + esc(r[0]) + '</span>' +
      '</button>';
    }).join('');
    return head + thead + '<div class="mj-list">' + body + '</div>';
  }

  function zkSchoolsHTML() {
    var arr = zkSchoolList();
    if (!arr.length) {
      return '<div class="empty"><div class="ico">' + ICON.search + '</div><h3>没有匹配的院校</h3><p>换个省份或关键词试试。</p></div>';
    }
    var cap = (zv.q.trim() || zv.prov !== '全国') ? arr.length : Math.min(arr.length, 80);
    var body = arr.slice(0, cap).map(function (s) {
      var tags = (s[5] || '').split(',').filter(Boolean);
      return '<button type="button" class="zk-srow" data-act="zksch" data-arg="' + esc(s[0]) + '">' +
        '<span class="zk-rank"><b class="num">' + esc(s[3]) + '</b><em>全国</em></span>' +
        '<span class="zk-sname"><b>' + esc(s[0]) + '</b>' +
          '<span class="zk-tags">' +
            '<i class="zk-ty">' + esc(zkTypes()[s[2]] || '') + '类</i>' +
            '<i class="zk-provtag">' + esc(ZK.prov[s[1]] || '') + '</i>' +
            tags.map(function (t) { return '<i class="zk-badge">' + esc(t) + '</i>'; }).join('') +
          '</span>' +
        '</span>' +
        '<span class="zk-smeta"><em>类型内第 ' + esc(s[4]) + '</em>' + zkDelta(s[6]) + '</span>' +
      '</button>';
    }).join('');
    var note = zv.prov === '全国'
      ? (cap < arr.length ? '按全国总榜名次排序，仅显示前 ' + cap + ' 所，可用搜索精确定位' : '按全国总榜名次排序')
      : '按全国总榜名次排序 · ' + esc(zv.prov) + '共 ' + arr.length + ' 所入围';
    return '<div class="mj-count">共 <b class="num">' + nf(arr.length) + '</b> 所高职院校' +
      (zv.ty !== '全部' ? ' · ' + esc(zv.ty) + '类' : '') + '<span>' + note + '</span></div>' +
      '<div class="zk-slist">' + body + '</div>';
  }

  function openZkMajor(code) {
    var layers = [[ZK.m, '高职专科', ZK.cls], [ZK.b, '职业本科', ZK.bcl]];
    var hit = null;
    layers.forEach(function (L) {
      (L[0] || []).forEach(function (r) { if (r[0] === code) hit = { r: r, lv: L[1], cls: L[2] }; });
    });
    if (!hit) return;
    var r = hit.r, cat = zkCats()[r[2]] || '', cls = hit.cls[r[3]] || '';
    var sibs = (hit.lv === '职业本科' ? ZK.b : ZK.m).filter(function (x) { return x[3] === r[3] && x[0] !== r[0]; });
    var info = [
      ['专业代码', r[0]], ['学历层次', hit.lv], ['专业大类', cat], ['专业类', cls]
    ].map(function (x) {
      return '<div><span>' + x[0] + '</span><b' + (x[0] === '专业代码' ? ' class="num"' : '') + '>' + esc(x[1]) + '</b></div>';
    }).join('');

    showModal(
      '<div class="modal-head"><div class="top"><div>' +
        '<h3>' + esc(r[1]) + '</h3>' +
        '<div class="sub"><span>' + esc(cat) + '大类</span><span>' + esc(cls) + '</span><span>' + esc(hit.lv) + '</span></div>' +
        '</div><button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
      '<div class="modal-body">' +
        '<div class="mj-grid">' + info + '</div>' +
        '<div class="mj-sec"><h4>同专业类其他专业 <i class="rk-src">' + esc(cls) + ' · 共 ' + (sibs.length + 1) + ' 个</i></h4>' +
          '<div class="rk-mjs">' + sibs.map(function (x) {
            return '<button type="button" class="rk-mj" data-act="zkrow" data-arg="' + esc(x[0]) + '">' + esc(x[1]) + '<em>' + esc(x[0]) + '</em></button>';
          }).join('') + '</div>' +
        '</div>' +
        '<div class="tip info" style="margin-top:14px">' + ICON.info + '<div>该专业代码与名称取自' + esc((ZK.meta && ZK.meta.catSrc) || '教育部职业教育专业目录') + '。软科排名仅针对院校整体实力，<b>不区分专科层次的专业</b>；判断某校该专业强弱，可结合「双高计划」标记、院校行业背景与省内投档分综合看。</div></div>' +
      '</div>', true
    );
  }

  function openZkSchool(name) {
    var s = null;
    (ZK.s || []).forEach(function (x) { if (x[0] === name) s = x; });
    var isZb = false;
    if (!s) (ZK.zb || []).forEach(function (x) { if (x[0] === name) { s = x; isZb = true; } });
    if (!s) return;
    var ty = zkTypes()[s[2]] || '', prov = ZK.prov[s[1]] || '';
    var tags = (s[5] || '').split(',').filter(Boolean);
    var info = [
      ['全国总榜', s[3] + ' 名'], ['类型内名次', s[4] + ' 名'], ['院校类型', ty + '类'], ['所在省份', prov]
    ].map(function (x) {
      return '<div><span>' + x[0] + '</span><b>' + esc(x[1]) + '</b></div>';
    }).join('');
    var same = (ZK.s || []).filter(function (x) { return x[1] === s[1] && x[0] !== s[0]; })
      .sort(function (a, b) { return zkRankNum(a[3]) - zkRankNum(b[3]); }).slice(0, 6);

    showModal(
      '<div class="modal-head"><div class="top"><div>' +
        '<h3>' + esc(name) + '</h3>' +
        '<div class="sub"><span>' + esc(prov) + '</span><span>' + esc(ty) + '类</span>' +
          tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' +
        '</div><button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
      '<div class="modal-body">' +
        '<div class="mj-grid">' + info + '</div>' +
        (isZb ? '' : '<div class="mj-sec"><h4>较上年名次 <i class="rk-src">' + esc((ZK.meta && ZK.meta.src) || '') + '</i></h4><p>' + (s[6] > 0 ? '上升 ' + s[6] + ' 位' : (s[6] < 0 ? '下降 ' + (-s[6]) + ' 位' : '与上年基本持平或新上榜')) + '</p></div>') +
        (same.length ? '<div class="mj-sec"><h4>同省其他入围院校</h4><div class="rk-mjs">' + same.map(function (x) {
          return '<button type="button" class="rk-mj" data-act="zksch" data-arg="' + esc(x[0]) + '">' + esc(x[0]) + '<em>第' + esc(x[3]) + '</em></button>';
        }).join('') + '</div></div>' : '') +
        '<div class="mj-sec"><h4>招生与投档</h4><p>本站「找大学」收录了该校在黑龙江的高职（专科）批投档分与位次，可按年份与科目对比。</p>' +
          '<button class="btn btn-primary btn-sm" type="button" data-act="zkgoto" data-arg="' + esc(name) + '" style="margin-top:8px">查看该校在黑龙江的投档情况 ' + ICON.arrow + '</button></div>' +
        '<div class="tip info" style="margin-top:14px">' + ICON.info + '<div>排名为软科中国高职专科院校排名（' + (ZK.meta && ZK.meta.y) + '），评价对象为院校整体，不含专业层面；「双高」指入选教育部中国特色高水平高职学校和专业建设计划。</div></div>' +
      '</div>', true
    );
  }

  /* ================================================================
     视图：高考资讯 / 招生动态
     ================================================================ */
  var NEWS = window.GK_NEWS || { zx: [], zd: [], meta: { monthTips: [] } };
  var SUB = window.GK_SUB || { policy: [], fields: [], careers: [], quiz: {}, meta: {} };
  var nv = { q: '', tag: '全部' };

  function newsAll() {
    return NEWS.zx.concat(NEWS.zd).sort(function (a, b) { return a.d < b.d ? 1 : -1; });
  }
  function newsOf(cat) {
    if (cat === 'zd') return NEWS.zd;
    if (cat === 'zc') return SUB.policy || [];
    return NEWS.zx;
  }
  var NEWS_CN = { zx: '高考资讯', zc: '招生政策', zd: '招生动态' };

  function newsTags(cat) {
    var seen = ['全部'];
    newsOf(cat).forEach(function (n) { if (seen.indexOf(n.tag) < 0) seen.push(n.tag); });
    return seen;
  }

  function newsListHTML(cat) {
    var q = (nv.q || '').trim();
    var arr = newsOf(cat).filter(function (n) {
      if (nv.tag !== '全部' && n.tag !== nv.tag) return false;
      if (q && n.t.indexOf(q) < 0 && (n.sum || '').indexOf(q) < 0) return false;
      return true;
    });
    if (!arr.length) return '<div class="empty">' + ICON.search + '<p>没有符合条件的资讯</p></div>';
    return arr.map(function (n, i) {
      return '<button type="button" class="nw-item' + (n.hl ? ' hot' : '') + '" data-act="news" data-arg="' + esc(n.t) + '">' +
        (n.hl ? '<span class="nw-hot">置顶</span>' : '') +
        '<div class="nw-body">' +
          '<h4>' + esc(n.t) + '</h4>' +
          '<p>' + esc((n.sum || '').slice(0, 92)) + '…</p>' +
          '<div class="nw-meta"><span class="ntag">' + esc(n.tag) + '</span><span>' + esc(n.d) + '</span><span>' + esc(n.src) + '</span>' +
          (n.url ? '<span class="nw-src">官方原文 ' + ICON.arrow + '</span>' : '') + '</div>' +
        '</div>' +
      '</button>';
    }).join('');
  }

  function viewNews(cat) {
    cat = cat || 'zx';
    var isZc = cat === 'zc', isZd = cat === 'zd';
    var tips = (NEWS.meta && NEWS.meta.monthTips) || [];
    var tipHTML = tips.map(function (m) {
      return '<div class="nw-tip"><b>' + esc(m[0]) + '</b><span>' + m[1].map(esc).join(' · ') + '</span></div>';
    }).join('');
    var heads = {
      zx: ['高考资讯', '整理自教育部阳光高考信息平台与黑龙江省招生考试院公开发布的公告资讯。当前收录高考资讯 ' + NEWS.zx.length + ' 条、招生动态 ' + NEWS.zd.length + ' 条、招生政策 ' + (SUB.policy || []).length + ' 条；点击条目查看摘要并前往官方原文渠道。'],
      zc: ['招生政策', '汇集国家招生规定、省级实施办法、高校招生章程与专项计划政策 ' + (SUB.policy || []).length + ' 条。政策是填报的「游戏规则」：先看国家规定，再看黑龙江省实施办法，最后逐校核对招生章程。'],
      zd: ['招生动态', '整理自教育部阳光高考信息平台与黑龙江省招生考试院公开发布的公告资讯。当前收录高考资讯 ' + NEWS.zx.length + ' 条、招生动态 ' + NEWS.zd.length + ' 条；点击条目查看摘要并前往官方原文渠道。']
    };
    var polPanel = !isZc ? '' :
      '<div class="pol-steps">' +
        '<div class="pol-step"><span class="ps-no">1</span><h4>国家层面 · 教育部</h4><p>《普通高等学校招生工作规定》《体检工作指导意见》《选考科目要求指引》与年度专业目录，规定全国统一的基本规则。</p></div>' +
        '<div class="pol-step"><span class="ps-no">2</span><h4>省级层面 · 省招考院</h4><p>招生工作实施办法、批次与志愿设置、投档规则、加分审核、征集志愿公告，是黑龙江学子最直接的操作依据。</p></div>' +
        '<div class="pol-step"><span class="ps-no">3</span><h4>高校层面 · 招生章程</h4><p>录取规则、单科与体检要求、外语语种、专业调剂办法、学费标准，具有法律效力，逐校核对。</p></div>' +
      '</div>';
    var zdTip = !isZd ? '' :
      '<div class="tip info" style="margin-bottom:14px">' + ICON.info + '<div>招生动态更新频率高（报名、考试、录取期间几乎每天有新公告）。建议把 <a href="https://www.lzk.hl.cn" target="_blank" rel="noopener">黑龙江省招生考试信息港</a> 设为浏览器首页，录取期间每天查看一次。</div></div>';
    return '' +
      '<div class="page-head"><h1>' + heads[cat][0] + '</h1><p>' + heads[cat][1] + '</p></div>' +
      '<div class="nw-calendar">' +
        '<div class="nw-cal-hd">' + ICON.spark + '<b>高考月历</b><span>高三全年关键节点</span></div>' +
        '<div class="nw-cal-body">' + tipHTML + '</div>' +
      '</div>' +
      '<div class="mj-tabs nw-tabs">' +
        '<button type="button" class="' + (!isZc && !isZd ? 'on' : '') + '" data-act="nvtab" data-arg="zx">高考资讯</button>' +
        '<button type="button" class="' + (isZc ? 'on' : '') + '" data-act="nvtab" data-arg="zc">招生政策</button>' +
        '<button type="button" class="' + (isZd ? 'on' : '') + '" data-act="nvtab" data-arg="zd">招生动态</button>' +
      '</div>' +
      polPanel + zdTip +
      '<div class="nw-bar">' +
        '<div class="nw-search">' + ICON.search +
          '<input id="newsQ" type="search" placeholder="搜标题 / 关键词，如 强基、章程、选科、征集" value="' + esc(nv.q || '') + '" aria-label="搜索资讯">' +
        '</div>' +
        '<div class="cat-chips nw-chips">' +
          newsTags(cat).map(function (t) {
            return '<button type="button" class="chip" aria-pressed="' + (t === nv.tag) + '" data-act="nvtag" data-arg="' + esc(t) + '">' + esc(t) + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="nw-list" id="newsList">' + newsListHTML(cat) + '</div>' +
      '<div class="tip info">' + ICON.info + '<div>内容为静态收录快照（更新于 ' + esc((NEWS.meta && NEWS.meta.updated) || '') + '），最新政策与公告请以 <a href="https://gaokao.chsi.com.cn/gkxx/zszc/" target="_blank" rel="noopener">阳光高考招生政策</a>、<a href="https://gaokao.chsi.com.cn/zsgs/zhangcheng/" target="_blank" rel="noopener">高校招生章程</a> 与 <a href="https://www.lzk.hl.cn" target="_blank" rel="noopener">黑龙江省招生考试信息港</a> 为准。</div></div>';
  }

  function openNewsItem(title) {
    var n = null;
    NEWS.zx.concat(NEWS.zd).concat(SUB.policy || []).concat(YZ.news || []).forEach(function (x) { if (x.t === title) n = x; });
    if (!n) { toast('未找到该条资讯'); return; }
    showModal('' +
      '<div class="modal-head"><h3>' + esc(n.t) + '</h3><button class="modal-x" type="button" data-act="close">' + ICON.close + '</button></div>' +
      '<div class="nw-detail">' +
        '<div class="nw-meta" style="margin-bottom:12px"><span class="ntag">' + esc(n.tag) + '</span><span>' + esc(n.d) + '</span><span>' + esc(n.src) + '</span></div>' +
        '<p class="nw-full">' + esc(n.sum || '（暂无摘要）') + '</p>' +
        '<div class="nw-actions">' +
          (n.url ? '<a class="btn btn-primary btn-sm" href="' + esc(n.url) + '" target="_blank" rel="noopener">前往官方原文 ' + ICON.arrow + '</a>' : '<span class="nw-nourl">官方渠道：' + esc(n.src) + ' 官网</span>') +
          '<button class="btn btn-ghost btn-sm" type="button" data-act="close">关闭</button>' +
        '</div>' +
      '</div>', true);
  }

  /* ================================================================
     视图：龙高考选科（黑龙江 3+1+2）
     ================================================================ */
  /* 门类典型选科要求（教育部《选考科目要求指引（通用版）》，2024年起适用）
     any=不限 | phys=首选物理 | phychem=物理+化学 */
  var XK_RULES = {
    '哲学': 'any', '经济学': 'any', '法学': 'any', '教育学': 'any', '文学': 'any',
    '历史学': 'any', '理学': 'phychem', '工学': 'phychem', '农学': 'phychem',
    '医学': 'phychem', '管理学': 'any', '艺术学': 'any', '交叉学科': 'phychem'
  };
  var XK_NOTES = {
    '法学': '公安学类、政治学类多数院校要求再选政治',
    '历史学': '考古等部分专业要求再选历史',
    '医学': '中医学、护理学等少部分专业不限或仅要求物理',
    '管理学': '金融工程等少部分专业要求首选物理',
    '经济学': '个别院校经济金融类专业要求首选物理'
  };
  var XK_COMMENTS = {
    '物理+化学+生物': '覆盖面最广的组合，理、工、农、医、交叉学科全部开放，学霸首选；高分段竞争也最激烈。',
    '物理+化学+政治': '理工农医全开，政治再选对报考军警公安类、将来考研深造都占优，是「理工+从警」的黄金搭配。',
    '物理+化学+地理': '理工农医全开，地理赋分难度相对友好，记忆负担小于生物，适合理科思维但不想背生物的考生。',
    '物理+生物+政治': '缺化学，理、工、农、医大部分专业受限；适合目标法学、军警、师范生物类的偏理考生。',
    '物理+生物+地理': '缺化学，理工农医受限；组合偏应用，适合目标地理科学、心理学、建筑类等的考生。',
    '物理+政治+地理': '缺化学，理工农医受限；物理保住部分经管理工科边缘专业，主攻文管法方向。',
    '历史+化学+生物': '传统文科组合加双理科，但首选历史使理、工、农、医依然关闭；适合目标护理、中医（不限选科院校）等的文科生。',
    '历史+化学+政治': '历史类中专业面较宽的一档，化学对医学边缘专业略有帮助，政治利于军警与法学。',
    '历史+化学+地理': '偏文的化学组合，适合目标地理、化工相关专科、文物保护等方向的考生。',
    '历史+生物+政治': '典型文科组合，适合目标法学、汉语言、新闻传播、师范类的考生。',
    '历史+生物+地理': '记忆负担最轻的文科组合，专业面集中在文、史、哲、经、管、法、艺。',
    '历史+政治+地理': '纯文组合，学习难度最低，但可报专业面最窄；适合明确走文史哲或艺术路线的考生。'
  };
  var xv = { first: '', picks: [] };

  function xkMlCount() {
    var cnt = {}, rows = (CAT && CAT.rows) || [];
    rows.forEach(function (r) {
      var ml = CAT.menlei[r[3]] || '其他';
      cnt[ml] = (cnt[ml] || 0) + 1;
    });
    return cnt;
  }
  function xkOpen(first, picks, ml) {
    var rule = XK_RULES[ml] || 'any';
    if (rule === 'any') return true;
    if (rule === 'phys') return first === '物理';
    return first === '物理' && picks.indexOf('化学') >= 0;
  }
  function xkCoverage(first, picks) {
    var cnt = xkMlCount(), open = 0, mls = [];
    Object.keys(cnt).forEach(function (ml) {
      var ok = xkOpen(first, picks, ml);
      if (ok) { open += cnt[ml]; mls.push(ml); }
    });
    var total = 0;
    Object.keys(cnt).forEach(function (k) { total += cnt[k]; });
    return { n: open, total: total, pct: total ? Math.round(open / total * 1000) / 10 : 0, mls: mls };
  }

  function xkHomeHTML() {
    var cnt = xkMlCount();
    var total = 0; Object.keys(cnt).forEach(function (k) { total += cnt[k]; });
    var FIRST = ['物理', '历史'], SECOND = ['化学', '生物', '政治', '地理'];
    // 12 组合
    var combos = [];
    FIRST.forEach(function (f) {
      for (var i = 0; i < SECOND.length; i++) for (var j = i + 1; j < SECOND.length; j++) {
        combos.push({ f: f, a: SECOND[i], b: SECOND[j] });
      }
    });
    var comboHTML = combos.map(function (c) {
      var key = c.f + '+' + c.a + '+' + c.b;
      var cov = xkCoverage(c.f, [c.a, c.b]);
      var on = xv.first === c.f && xv.picks.length === 2 && xv.picks.indexOf(c.a) >= 0 && xv.picks.indexOf(c.b) >= 0;
      return '<button type="button" class="xk-combo' + (on ? ' on' : '') + '" data-act="xkgo" data-arg="' + esc(key) + '">' +
        '<div class="xk-ch"><b>' + esc(c.f) + '</b><i>+</i><b>' + esc(c.a) + '</b><i>+</i><b>' + esc(c.b) + '</b></div>' +
        '<div class="xk-bar"><span style="width:' + cov.pct + '%"></span></div>' +
        '<div class="xk-cov"><b class="num">' + cov.pct + '%</b><span>可报 ' + nf(cov.n) + '/' + nf(total) + ' 个专业</span></div>' +
        '<p>' + esc(XK_COMMENTS[key] || '') + '</p>' +
      '</button>';
    }).join('');

    // 自查结果
    var resultHTML = '';
    if (xv.first && xv.picks.length === 2) {
      var cov = xkCoverage(xv.first, xv.picks);
      var closed = Object.keys(cnt).filter(function (ml) { return cov.mls.indexOf(ml) < 0; });
      resultHTML = '<div class="xk-result">' +
        '<div class="xk-rh">' + ICON.check + '<b>你的选科：' + esc(xv.first) + ' + ' + esc(xv.picks[0]) + ' + ' + esc(xv.picks[1]) + '</b></div>' +
        '<div class="xk-rstats">' +
          '<div><b class="num">' + cov.pct + '%</b><span>本科专业覆盖率（' + nf(cov.n) + '/' + nf(total) + '）</span></div>' +
          '<div><b class="num">' + cov.mls.length + '</b><span>可报学科门类 / 共13</span></div>' +
        '</div>' +
        '<div class="xk-mls"><h4>可报门类</h4><div class="xk-chips">' +
          cov.mls.map(function (ml) { return '<i class="ok">' + esc(ml) + '</i>'; }).join('') +
        '</div></div>' +
        (closed.length ? '<div class="xk-mls"><h4>受限门类</h4><div class="xk-chips">' +
          closed.map(function (ml) { return '<i class="no">' + esc(ml) + '</i>'; }).join('') +
          '<em>典型受限原因：未选「物理+化学」（理工农医大类自2024年起普遍要求物化双选）</em></div></div>' : '') +
        '<div class="xk-note">' +
          Object.keys(XK_NOTES).filter(function (k) { return cov.mls.indexOf(k) >= 0; }).map(function (k) {
            return '<p>' + ICON.info + ' ' + esc(k) + '：' + esc(XK_NOTES[k]) + '。</p>';
          }).join('') +
        '</div>' +
        '<div class="xk-acts">' +
          '<button class="btn btn-primary btn-sm" type="button" data-act="goto" data-arg="majors">去查专业看这些门类专业 ' + ICON.arrow + '</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-act="xkreset">重新选择</button>' +
        '</div>' +
      '</div>';
    } else {
      resultHTML = '<div class="xk-result empty-r">' + ICON.info +
        '<p>' + (xv.first ? '已选首选「' + esc(xv.first) + '」，请再从化学 / 生物 / 政治 / 地理中选择 <b>2 门</b>再选科目' : '先选首选科目，再选 2 门再选科目') + '</p></div>';
    }

    return '' +
      '<div class="xk-layout">' +
        '<div class="panel-card">' +
          '<div class="panel-hd"><h3>选科自查</h3><span>选完即时测算专业覆盖面</span></div>' +
          '<div class="xk-pick">' +
            '<div class="xk-prow"><h4>首选科目 <i>二选一</i></h4><div class="xk-btns">' +
              FIRST.map(function (f) { return '<button type="button" class="' + (xv.first === f ? 'on' : '') + '" data-act="xkfirst" data-arg="' + f + '">' + f + '</button>'; }).join('') +
            '</div></div>' +
            '<div class="xk-prow"><h4>再选科目 <i>四选二</i></h4><div class="xk-btns">' +
              SECOND.map(function (s) { return '<button type="button" class="' + (xv.picks.indexOf(s) >= 0 ? 'on' : '') + '" data-act="xkpick" data-arg="' + s + '">' + s + '</button>'; }).join('') +
            '</div></div>' +
          '</div>' +
          resultHTML +
        '</div>' +
        '<div class="panel-card">' +
          '<div class="panel-hd"><h3>12 种组合覆盖率</h3><span>点击组合可直接查看结果</span></div>' +
          '<div class="xk-grid">' + comboHTML + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="guide-grid" style="margin-top:18px">' +
        '<article class="article">' +
          '<section><h2><span class="no">1</span>为什么「物理+化学」这么重要</h2>' +
            '<p>自 2024 年起，教育部《选考科目要求指引（通用版）》要求绝大多数<strong>理学、工学、农学、医学</strong>类专业必须「物理+化学」双选，交叉学科门类大多同样要求。未同时选择物理和化学，理工农医大类基本关闭。物理类考生如果放弃化学，实际可报范围与历史类接近，务必提前想清楚。</p></section>' +
          '<section><h2><span class="no">2</span>覆盖率不是唯一标准</h2>' +
            '<p>覆盖率最高的「物化生」未必适合每个人：再选科目按<strong>等级赋分</strong>计入总分，选自己能排进前列的科目，比盲目追覆盖率更划算。建议用「目标专业倒推法」——先圈定 3-5 个可接受的专业方向（用本站「查专业」），再反查这些专业的选科要求，取交集。</p></section>' +
          '<section><h2><span class="no">3</span>特殊方向的选科提示</h2>' +
            '<p>军警公安类院校（本站「军检标准」页）多数专业要求再选政治；艺术类、体育类考生优先保证专业课训练时间，选科以保证文化课总分最大化为主；中外合作与港澳高校申请一般不限选科，但热门商科倾向数学成绩优异。</p></section>' +
          '<section><h2><span class="no">4</span>查各校具体选科要求</h2>' +
            '<p>本页覆盖率为按门类的<strong>典型要求</strong>测算，同一门类内不同专业、不同院校的要求仍有差异（如法学门类下公安学类多要求政治）。最终请以省招考院发布的《拟在本省招生高校专业选考科目要求》和各校招生章程为准。</p></section>' +
        '</article>' +
      '</div>';
  }

  /* ================================================================
     通用：二级栏目导航
     ================================================================ */
  function subNav(items, active) {
    return '<div class="subnav">' + items.map(function (x) {
      return '<a href="#/' + x[1] + '"' + (x[1] === active ? ' class="on"' : '') + '>' + esc(x[0]) + '</a>';
    }).join('') + '</div>';
  }

  /* ================================================================
     视图：龙高考选科（选科自查 / 学科专业倾向测评 / 高校专业选科要求 / 重点领域专业需求）
     ================================================================ */
  var rq = { q: '', type: '全部', ml: '全部', limit: 120 };

  /* 专业类级别的选科特殊要求（门类通用要求之外的例外） */
  var XK_CLS_OVERRIDE = {
    '公安学类': 'pol', '政治学类': 'pol', '马克思主义理论类': 'pol',
    '民族学类': 'hist', '中医学类': 'phychm', '护理学类': 'bio'
  };
  function xkReqOf(row) {
    var ml = CAT.menlei[row[3]] || '';
    var cls = row[4] || '';
    var ov = XK_CLS_OVERRIDE[cls];
    if (ov === 'pol') return { k: 'pol', t: '再选政治', note: '多数院校要求' };
    if (ov === 'hist') return { k: 'hist', t: '再选历史', note: '部分院校要求' };
    if (ov === 'phychm') return { k: 'phychem', t: '物理+化学', note: '部分院校放宽' };
    if (ov === 'bio') return { k: 'phychem', t: '物理+化学', note: '部分院校不限' };
    var rule = XK_RULES[ml] || 'any';
    if (rule === 'any') return { k: 'any', t: '不限' };
    if (rule === 'phys') return { k: 'phys', t: '仅物理' };
    return { k: 'phychem', t: '物理+化学' };
  }

  var _mjIdx = null;
  function majorRow(name) {
    if (!_mjIdx) {
      _mjIdx = {};
      (CAT.rows || []).forEach(function (r) { if (!_mjIdx[r[2]]) _mjIdx[r[2]] = r; });
    }
    return _mjIdx[name] || null;
  }
  function majorChips(names, cls) {
    return names.map(function (n) {
      var r = majorRow(n);
      return '<button type="button" class="' + (cls || 'mj-chip') + '"' + (r ? ' data-act="mjrow" data-arg="' + esc(n) + '"' : ' disabled') + '>' +
        esc(n) + (r ? '' : '<i>目录未收录</i>') + '</button>';
    }).join('');
  }

  function xkReqRows() {
    var q = (rq.q || '').trim();
    return (CAT.rows || []).filter(function (r) {
      var ml = CAT.menlei[r[3]] || '';
      var req = xkReqOf(r);
      if (rq.ml !== '全部' && ml !== rq.ml) return false;
      if (rq.type !== '全部' && req.k !== rq.type) return false;
      if (q && r[2].indexOf(q) < 0 && (r[4] || '').indexOf(q) < 0 && (r[0] || '').indexOf(q) < 0) return false;
      return true;
    });
  }

  function xkReqBodyHTML() {
    var rows = xkReqRows();
    var shown = rows.slice(0, rq.limit);
    return '<div class="req-count">共 <b>' + nf(rows.length) + '</b> 个专业符合条件' + (rows.length > shown.length ? '，当前显示前 ' + shown.length + ' 个' : '') + '</div>' +
      '<div class="table-wrap"><table class="info-table req-table"><thead><tr><th>专业代码</th><th>专业名称</th><th>学科门类</th><th>专业类</th><th>选科要求</th><th>学位</th><th>年限</th></tr></thead><tbody>' +
        (shown.length ? shown.map(function (r) {
          var req = xkReqOf(r);
          return '<tr data-act="mjrow" data-arg="' + esc(r[2]) + '">' +
            '<td class="mono">' + esc(r[0]) + '</td>' +
            '<td><b>' + esc(r[2]) + '</b></td>' +
            '<td>' + esc(CAT.menlei[r[3]] || '') + '</td>' +
            '<td>' + esc(r[4] || '—') + '</td>' +
            '<td><span class="req-tag ' + req.k + '">' + esc(req.t) + '</span>' + (req.note ? '<i class="req-note">' + esc(req.note) + '</i>' : '') + '</td>' +
            '<td>' + esc(r[5] || '—') + '</td>' +
            '<td>' + (r[6] ? r[6] + ' 年' : '—') + '</td></tr>';
        }).join('') : '<tr><td colspan="7"><div class="empty" style="padding:30px 0">' + ICON.search + '<p>没有匹配的专业，换个关键词试试</p></div></td></tr>') +
      '</tbody></table></div>' +
      (rows.length > shown.length ? '<div style="text-align:center;margin-top:14px"><button class="btn btn-ghost btn-sm" type="button" data-act="rqmore">再显示 120 个（还有 ' + nf(rows.length - shown.length) + ' 个）</button></div>' : '');
  }

  function xkReqHTML() {
    var all = CAT.rows || [];
    var stat = { any: 0, phys: 0, phychem: 0, pol: 0 };
    all.forEach(function (r) { var k = xkReqOf(r).k; if (stat[k] == null) stat[k] = 0; stat[k]++; });
    var typeChips = [['全部', '全部 ' + all.length], ['phychem', '物理+化学 ' + stat.phychem], ['phys', '仅物理 ' + stat.phys], ['pol', '再选政治 ' + stat.pol], ['any', '不限 ' + stat.any]];
    return '' +
      '<div class="req-stat">' +
        '<div class="rs-card"><b class="num">' + nf(all.length) + '</b><span>本科专业总数（2026 版目录）</span></div>' +
        '<div class="rs-card"><b class="num">' + nf(stat.phychem) + '</b><span>要求「物理+化学」</span></div>' +
        '<div class="rs-card"><b class="num">' + nf(stat.any) + '</b><span>不限选科</span></div>' +
        '<div class="rs-card"><b class="num">' + (Math.round(stat.phychem / all.length * 1000) / 10) + '%</b><span>理工农医类占比</span></div>' +
      '</div>' +
      '<div class="tip info" style="margin-bottom:14px">' + ICON.info + '<div>下表按<strong>学科门类 / 专业类</strong>给出教育部《选考科目要求指引（通用版）》的典型要求，用于选科前的方向性判断。同一专业在不同院校的要求可能不同（如部分院校护理学不限选科、中医学放宽化学），<strong>最终以省招考院当年发布的《拟在本省招生高校专业选考科目要求》和高校招生章程为准</strong>。</div></div>' +
      '<div class="nw-bar req-bar">' +
        '<div class="nw-search">' + ICON.search +
          '<input id="reqQ" type="search" placeholder="搜专业名称 / 专业类 / 专业代码，如 临床医学、计算机类、0809" value="' + esc(rq.q) + '" aria-label="搜索专业选科要求">' +
        '</div>' +
        '<div class="cat-chips">' + typeChips.map(function (t) {
          return '<button type="button" class="chip" aria-pressed="' + (rq.type === t[0]) + '" data-act="rqtype" data-arg="' + t[0] + '">' + t[1] + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="req-ml">' +
        ['全部'].concat(CAT.menlei).map(function (ml) {
          return '<button type="button" class="chip' + (rq.ml === ml ? ' on' : '') + '" data-act="rqml" data-arg="' + esc(ml) + '">' + esc(ml) + '</button>';
        }).join('') +
      '</div>' +
      '<div id="reqBody">' + xkReqBodyHTML() + '</div>';
  }

  function fieldCard(f) {
    var badges = { '紧缺': 'hot', '增长': 'up', '稳定': 'flat' };
    return '<article class="field-card">' +
      '<div class="fc-hd"><h3>' + esc(f.n) + '</h3><span class="fc-tag">' + esc(f.tag) + '</span>' +
        '<i class="fc-trend ' + (badges[f.trend] || 'flat') + '">' + esc(f.trend) + '</i></div>' +
      '<p class="fc-why">' + esc(f.why) + '</p>' +
      '<div class="fc-sec"><h4>对应本科专业</h4><div class="fc-majors">' + majorChips(f.majors, 'mj-chip sm') + '</div></div>' +
      '<div class="fc-sec"><h4>选科要求</h4><p class="fc-xk">' + esc(f.xk) + '</p></div>' +
      '<div class="fc-sec"><h4>主要岗位与去向</h4><p>' + esc(f.job) + '</p></div>' +
    '</article>';
  }

  function xkFieldHTML() {
    var fields = SUB.fields || [];
    var hot = fields.filter(function (f) { return f.trend === '紧缺'; }).length;
    return '' +
      '<div class="page-sub"><h2>重点领域专业需求</h2><p>面向国家战略与产业升级的 ' + fields.length + ' 个重点领域，对应 2026 版本科专业目录中的具体专业。标记「紧缺」的 ' + hot + ' 个领域，人才缺口与政策投入相对集中，可作为选专业的方向参考。</p></div>' +
      '<div class="field-legend"><span class="fc-trend hot">紧缺</span>人才缺口明显<span class="fc-trend up">增长</span>岗位持续增加<span class="fc-trend flat">稳定</span>需求平稳，看细分方向</div>' +
      '<div class="field-grid">' + fields.map(fieldCard).join('') + '</div>' +
      '<div class="tip info">' + ICON.info + '<div>「紧缺」来自产业公开报告与招聘市场结构的综合判断，<strong>不等于毕业即高薪</strong>：同一领域内研发岗与运维岗差异巨大，且行业存在周期。选专业时请把「领域前景」「个人能力」「院校学科实力」三者一起看，可到 <a href="#/majors">查专业</a> 看开设院校与专业方向。</div></div>';
  }

  /* ---------------- 测评引擎（选科倾向 / 霍兰德） ---------------- */
  var qz = { mode: '', i: 0, ans: {} };
  function qzInit(mode) {
    if (qz.mode === mode) return;
    qz.mode = mode; qz.i = 0; qz.ans = {};
  }
  function qzBank(mode) {
    var q = SUB.quiz || {};
    if (mode === 'major') return q.xk;
    return q[mode];
  }
  function qzScores(mode) {
    var bank = qzBank(mode);
    var out = {}, n = {};
    if (!bank) return out;
    Object.keys(bank.dims).forEach(function (k) { out[k] = 0; n[k] = 0; });
    bank.qs.forEach(function (q, i) {
      var v = qz.ans[i];
      if (v == null) return;
      out[q.d] += v; n[q.d]++;
    });
    Object.keys(out).forEach(function (k) { out[k] = n[k] ? Math.round((out[k] / n[k] - 1) / 4 * 100) : 0; });
    return out;
  }

  function quizHTML(mode) {
    var bank = qzBank(mode);
    if (!bank) return '<div class="empty"><p>测评题库缺失</p></div>';
    var total = bank.qs.length;
    if (qz.i >= total) return quizResultHTML(mode);
    var q = bank.qs[qz.i];
    var pct = Math.round(qz.i / total * 100);
    var cur = qz.ans[qz.i];
    return '<div class="qz-card">' +
      '<div class="qz-top"><span class="qz-mode">' + esc(mode === 'major' ? '专业倾向测评' : bank.title) + '</span><span class="qz-step">第 <b>' + (qz.i + 1) + '</b> / ' + total + ' 题</span></div>' +
      '<div class="qz-bar"><span style="width:' + pct + '%"></span></div>' +
      '<h2 class="qz-q">' + esc(q.q) + '</h2>' +
      '<div class="qz-opts">' + bank.scale.map(function (s, i) {
        return '<button type="button" class="qz-opt' + (cur === i + 1 ? ' on' : '') + '" data-act="qzans" data-arg="' + (i + 1) + '">' +
          '<i>' + (i + 1) + '</i><span>' + esc(s) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="qz-foot">' +
        (qz.i > 0 ? '<button class="btn btn-ghost btn-sm" type="button" data-act="qzback">' + ICON.up + '上一题</button>' : '<span></span>') +
        '<span class="qz-hint">按第一感觉选择，没有对错</span>' +
      '</div>' +
    '</div>';
  }

  function qzDimBars(scores, dims) {
    var arr = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; });
    return '<div class="qz-dims">' + arr.map(function (k) {
      return '<div class="qd-row"><span class="qd-n">' + esc(dims[k] || k) + '</span>' +
        '<div class="qd-bar"><span style="width:' + scores[k] + '%"></span></div>' +
        '<b class="num">' + scores[k] + '</b></div>';
    }).join('') + '</div>';
  }

  var ML_BY_DIM = {
    lg: ['理学', '工学', '交叉学科'], bs: ['医学', '农学', '理学'], rw: ['文学', '历史学', '哲学'],
    sh: ['法学', '经济学', '管理学', '教育学'], ys: ['艺术学'], sj: ['工学', '农学', '管理学']
  };

  function xkQuizResult() {
    var s = qzScores('xk');
    var bank = SUB.quiz.xk;
    var mlScore = {};
    Object.keys(ML_BY_DIM).forEach(function (d) {
      ML_BY_DIM[d].forEach(function (ml) { mlScore[ml] = (mlScore[ml] || 0) + s[d] / ML_BY_DIM[d].length; });
    });
    var cnt = xkMlCount();
    var mls = Object.keys(mlScore).sort(function (a, b) { return mlScore[b] - mlScore[a]; }).slice(0, 4);
    var phys = s.lg * 1 + s.sj * 0.8 + s.bs * 0.7;
    var hist = s.rw * 1 + s.sh * 0.8 + s.ys * 0.5;
    var first = phys >= hist ? '物理' : '历史';
    var pickScore = { '化学': s.bs * 1 + s.lg * 0.7 + s.sj * 0.5, '生物': s.bs * 1 + s.lg * 0.4 + s.sj * 0.5, '政治': s.sh * 1 + s.rw * 0.8, '地理': s.sj * 0.6 + s.lg * 0.6 + s.sh * 0.4 };
    var picks = Object.keys(pickScore).sort(function (a, b) { return pickScore[b] - pickScore[a]; }).slice(0, 2);
    var cov = xkCoverage(first, picks);
    var combo = first + '+' + picks[0] + '+' + picks[1];
    var classes = [];
    (CAT.rows || []).forEach(function (r) {
      if (mls.indexOf(CAT.menlei[r[3]]) < 0) return;
      if (!xkOpen(first, picks, CAT.menlei[r[3]])) return;
      if (r[4] && classes.indexOf(r[4]) < 0 && classes.length < 10) classes.push(r[4]);
    });
    var same = xv.first === first && xv.picks.length === 2 && xv.picks.indexOf(picks[0]) >= 0 && xv.picks.indexOf(picks[1]) >= 0;
    return '<div class="qz-result">' +
      '<div class="qr-head">' + ICON.ok + '<div><h2>你的学科倾向画像</h2><p>' + esc(bank.title) + '完成，基于 ' + bank.qs.length + ' 道题作答结果</p></div>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-act="qzreset">重新测评</button></div>' +
      qzDimBars(s, bank.dims) +
      '<div class="qr-combo">' +
        '<div class="qrc-k">推荐选科组合</div>' +
        '<div class="qrc-v">' + combo.split('+').map(function (x) { return '<b>' + esc(x) + '</b>'; }).join('<i>+</i>') + '</div>' +
        '<p>首选「' + esc(first) + '」：物理倾向 ' + Math.round(phys) + ' / 历史倾向 ' + Math.round(hist) + '；再选「' + esc(picks.join('、')) + '」在你的兴趣与能力结构中得分最高。</p>' +
      '</div>' +
      '<div class="qr-stats">' +
        '<div><b class="num">' + cov.pct + '%</b><span>该组合可报本科专业占比</span></div>' +
        '<div><b class="num">' + nf(cov.n) + '</b><span>可报专业数（共 ' + nf(cov.total) + '）</span></div>' +
        '<div><b class="num">' + mls.length + '</b><span>匹配学科门类</span></div>' +
      '</div>' +
      '<div class="qr-sec"><h4>匹配的学科门类</h4><div class="qr-mls">' + mls.map(function (ml, i) {
        return '<div class="qm-card"><span>' + (i === 0 ? '首选方向' : '方向 ' + (i + 1)) + '</span><b>' + esc(ml) + '</b><i>' + nf(cnt[ml] || 0) + ' 个专业</i></div>';
      }).join('') + '</div></div>' +
      (classes.length ? '<div class="qr-sec"><h4>值得关注的专业类</h4><div class="fc-majors">' + classes.map(function (c) {
        return '<button type="button" class="mj-chip sm" data-act="rqcls" data-arg="' + esc(c) + '">' + esc(c) + '</button>';
      }).join('') + '</div></div>' : '') +
      '<div class="qr-acts">' +
        '<button class="btn btn-primary btn-sm" type="button" data-act="qzapply" data-arg="' + esc(combo) + '">' + (same ? '已在自查中使用该组合' : '用这个组合查看覆盖率') + ' ' + ICON.arrow + '</button>' +
        '<a class="btn btn-ghost btn-sm" href="#/xk/req">逐专业查选科要求</a>' +
        '<a class="btn btn-ghost btn-sm" href="#/xk/field">看重点领域专业需求</a>' +
      '</div>' +
      '<div class="tip info">' + ICON.info + '<div>测评给出的是<strong>方向性建议</strong>，不替代成绩、赋分难度与院校要求的现实判断。等级赋分下，选自己排名靠前的科目，往往比追覆盖率更划算。</div></div>' +
    '</div>';
  }

  var HOLLAND_ML = { R: ['工学', '农学'], I: ['理学', '医学', '交叉学科'], A: ['艺术学', '文学'], S: ['教育学', '法学', '管理学'], E: ['管理学', '经济学', '法学'], C: ['经济学', '管理学'] };
  function hollandResult() {
    var s = qzScores('holland');
    var bank = SUB.quiz.holland;
    var code = Object.keys(s).sort(function (a, b) { return s[b] - s[a]; }).slice(0, 3).join('');
    var careers = (SUB.careers || []).map(function (c) {
      var score = 0;
      c.h.split('').forEach(function (ch) { score += (s[ch] || 0); });
      if (c.h.charAt(0) === code.charAt(0)) score += 40;
      if (c.h.charAt(1) === code.charAt(1)) score += 15;
      return { c: c, s: score };
    }).sort(function (a, b) { return b.s - a.s; }).slice(0, 6);
    var mlSet = [];
    code.split('').forEach(function (ch) { (HOLLAND_ML[ch] || []).forEach(function (ml) { if (mlSet.indexOf(ml) < 0) mlSet.push(ml); }); });
    var cnt = xkMlCount();
    var majors = [];
    careers.forEach(function (x) { x.c.majors.forEach(function (m) { if (majors.indexOf(m) < 0) majors.push(m); }); });
    return '<div class="qz-result">' +
      '<div class="qr-head">' + ICON.ok + '<div><h2>你的霍兰德兴趣代码：' + code.split('').join(' · ') + '</h2><p>' + esc(bank.title) + '完成，六型得分如下</p></div>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-act="qzreset">重新测评</button></div>' +
      qzDimBars(s, bank.dims) +
      '<div class="qr-sec"><h4>匹配的职业方向（按兴趣契合度排序）</h4><div class="career-mini">' + careers.map(function (x) {
        var c = x.c;
        return '<div class="cm-card"><div class="cm-hd"><b>' + esc(c.n) + '</b><span class="cm-cat">' + esc(c.cat) + '</span></div>' +
          '<div class="cm-meta"><span>起薪 ' + esc(c.pay) + '</span><i class="fc-trend ' + (c.trend === '紧缺' ? 'hot' : c.trend === '增长' ? 'up' : c.trend === '收紧' ? 'down' : 'flat') + '">' + esc(c.trend) + '</i></div>' +
          '<p>' + esc(c.note) + '</p></div>';
      }).join('') + '</div></div>' +
      '<div class="qr-sec"><h4>对应的本科专业</h4><div class="fc-majors">' + majorChips(majors.slice(0, 12), 'mj-chip sm') + '</div></div>' +
      '<div class="qr-sec"><h4>建议关注的学科门类</h4><div class="qr-mls">' + mlSet.slice(0, 4).map(function (ml, i) {
        return '<div class="qm-card"><span>' + (i === 0 ? '最契合' : '相关') + '</span><b>' + esc(ml) + '</b><i>' + nf(cnt[ml] || 0) + ' 个专业</i></div>';
      }).join('') + '</div></div>' +
      '<div class="qr-acts">' +
        '<a class="btn btn-primary btn-sm" href="#/zhineng/career">查看职业前景详情 ' + ICON.arrow + '</a>' +
        '<a class="btn btn-ghost btn-sm" href="#/majors">去查专业</a>' +
        '<a class="btn btn-ghost btn-sm" href="#/xk/quiz">测一下学科选科倾向</a>' +
      '</div>' +
      '<div class="tip info">' + ICON.info + '<div>兴趣是选专业的<strong>重要参考，不是唯一标准</strong>。还要看学科能力、专业录取分数、就业地域与家庭条件。建议把测评结果当作「候选清单」，再用本站数据逐项核实。</div></div>' +
    '</div>';
  }

  function majorTendencyResult() {
    var s = qzScores('major');
    var bank = qzBank('major');
    var mlScore = {};
    Object.keys(ML_BY_DIM).forEach(function (d) {
      ML_BY_DIM[d].forEach(function (ml) { mlScore[ml] = (mlScore[ml] || 0) + s[d] / ML_BY_DIM[d].length; });
    });
    var cnt = xkMlCount();
    var mls = Object.keys(mlScore).sort(function (a, b) { return mlScore[b] - mlScore[a]; }).slice(0, 4);
    var pickScore = { '化学': s.bs, '生物': s.bs * 1.1, '政治': s.sh, '地理': s.lg * 0.5 + s.sj * 0.5 };
    var picks = Object.keys(pickScore).sort(function (a, b) { return pickScore[b] - pickScore[a]; }).slice(0, 2);
    var first = (s.lg + s.sj + s.bs * 0.6) >= (s.rw + s.sh + s.ys * 0.5) ? '物理' : '历史';
    var groups = mls.map(function (ml) {
      var cls = [], mjs = [];
      (CAT.rows || []).forEach(function (r) {
        if ((CAT.menlei[r[3]] || '') !== ml) return;
        if (r[4] && cls.indexOf(r[4]) < 0 && cls.length < 6) cls.push(r[4]);
        if (mjs.length < 6) mjs.push(r[2]);
      });
      return { ml: ml, cls: cls, mjs: mjs };
    });
    return '<div class="qz-result">' +
      '<div class="qr-head">' + ICON.ok + '<div><h2>你的专业方向画像</h2><p>' + esc(bank.title) + '完成，基于 ' + bank.qs.length + ' 道题作答结果</p></div>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-act="qzreset">重新测评</button></div>' +
      qzDimBars(s, bank.dims) +
      '<div class="qr-sec"><h4>最匹配的学科门类</h4><div class="qr-mls">' + mls.map(function (ml, i) {
        return '<div class="qm-card"><span>' + (i === 0 ? '首选方向' : '方向 ' + (i + 1)) + '</span><b>' + esc(ml) + '</b><i>' + nf(cnt[ml] || 0) + ' 个专业</i></div>';
      }).join('') + '</div></div>' +
      groups.map(function (g) {
        return '<div class="qr-sec"><h4>' + esc(g.ml) + '门类：值得了解的专业类</h4><div class="fc-majors">' +
          g.cls.map(function (c) { return '<button type="button" class="mj-chip sm" data-act="rqcls" data-arg="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') +
          '</div><div class="fc-majors" style="margin-top:8px">' + majorChips(g.mjs, 'mj-chip ghost') + '</div></div>';
      }).join('') +
      '<div class="qr-combo"><div class="qrc-k">配套选科建议</div><div class="qrc-v">' + [first].concat(picks).map(function (x) { return '<b>' + esc(x) + '</b>'; }).join('<i>+</i>') + '</div>' +
        '<p>该建议由同一份兴趣数据推导，若你已确定专业方向，请以目标专业的实际选科要求为准。</p></div>' +
      '<div class="qr-acts">' +
        '<a class="btn btn-primary btn-sm" href="#/majors">去查专业看开设院校 ' + ICON.arrow + '</a>' +
        '<a class="btn btn-ghost btn-sm" href="#/xk/quiz">测学科选科倾向</a>' +
        '<a class="btn btn-ghost btn-sm" href="#/zhineng/shengya">做生涯发展测评</a>' +
      '</div>' +
      '<div class="tip info">' + ICON.info + '<div>专业选择还要看录取分数与院校实力。建议把上面 3–5 个专业类记下来，到「查专业」核对开设院校与培养方向，再到「找大学」看近三年投档位次。</div></div>' +
    '</div>';
  }

  function quizResultHTML(mode) {
    if (mode === 'holland') return hollandResult();
    if (mode === 'major') return majorTendencyResult();
    return xkQuizResult();
  }

  function quizIntroHTML(mode) {
    var bank = qzBank(mode);
    if (!bank) return '';
    var answered = Object.keys(qz.ans).length;
    var title = mode === 'major' ? '专业倾向测评' : bank.title;
    var intro = mode === 'major'
      ? '18 道题，约 3 分钟。测出你的学科兴趣与能力结构，换算成匹配的学科门类与专业方向。请按真实感受作答。'
      : bank.intro;
    return '<div class="page-sub"><h2>' + esc(title) + '</h2><p>' + esc(intro) + '</p></div>' +
      (answered ? '<div class="tip info">' + ICON.info + '<div>已作答 ' + answered + ' 题，继续完成即可查看结果。</div></div>' : '');
  }

  /* ================================================================
     视图：测评中心（优志愿「测评」板块）
     ================================================================ */
  function viewCe() {
    return '' +
      '<div class="page-head"><h1>测评中心</h1><p>三套科学测评帮你回答三个问题：我适合什么学科（选科）、我适合什么专业（方向）、我适合什么职业（生涯）。全部免费，答题约 3-5 分钟，做完即时出结果。</p></div>' +
      '<div class="ce-grid">' +
        '<div class="ce-card">' +
          '<div class="ce-ico">' + ICON.target + '</div>' +
          '<h3>学科专业倾向测评</h3><span class="ce-meta">18 题 · 约 3 分钟 · 六维学科画像</span>' +
          '<p>测出你在数理逻辑、生化探究、人文阅读、社会思辨、艺术审美、实践操作六个维度的倾向强度，换算出推荐的选科组合、可报覆盖率与匹配的学科门类。高一选科前必做。</p>' +
          '<button class="btn btn-primary btn-sm" type="button" data-act="goto" data-arg="xk/quiz">开始测评 ' + ICON.arrow + '</button>' +
        '</div>' +
        '<div class="ce-card">' +
          '<div class="ce-ico alt">' + ICON.book + '</div>' +
          '<h3>专业倾向测评</h3><span class="ce-meta">18 题 · 约 3 分钟 · 门类匹配</span>' +
          '<p>从兴趣结构推导你适合的 3-4 个学科门类与具体专业类，并给出配套选科建议。适合还没想好学什么专业的高二、高三考生。</p>' +
          '<button class="btn btn-primary btn-sm" type="button" data-act="goto" data-arg="zhineng/quiz">开始测评 ' + ICON.arrow + '</button>' +
        '</div>' +
        '<div class="ce-card">' +
          '<div class="ce-ico alt2">' + ICON.chart + '</div>' +
          '<h3>生涯发展测评（霍兰德）</h3><span class="ce-meta">24 题 · 约 4 分钟 · RIASEC 兴趣代码</span>' +
          '<p>基于霍兰德职业兴趣理论，测出你的三型兴趣代码，匹配 20 个职业方向、对应本科专业与长期发展路径。适合想看清「毕业后干什么」的考生与家长。</p>' +
          '<button class="btn btn-primary btn-sm" type="button" data-act="goto" data-arg="zhineng/shengya">开始测评 ' + ICON.arrow + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="home-cols">' +
        '<div class="panel-card">' +
          '<div class="panel-hd"><h3>什么时候做哪个测评</h3></div>' +
          '<div class="article" style="padding:4px 6px 8px">' +
            '<table class="info-table"><thead><tr><th>阶段</th><th>建议测评</th><th>要解决的问题</th></tr></thead><tbody>' +
              '<tr><td><b>高一 · 选科前</b></td><td>学科专业倾向测评 + 查高校专业选科要求</td><td>3+1+2 怎么选：兴趣、覆盖率与赋分的平衡</td></tr>' +
              '<tr><td><b>高二 · 定方向</b></td><td>专业倾向测评 + 重点领域专业需求</td><td>圈定 3-5 个专业方向，倒推选科与目标院校</td></tr>' +
              '<tr><td><b>高三 · 填志愿</b></td><td>生涯发展测评 + 职业前景</td><td>专业怎么排优先级：把兴趣、能力与就业现实对齐</td></tr>' +
            '</tbody></table>' +
          '</div>' +
        '</div>' +
        '<div class="panel-card">' +
          '<div class="panel-hd"><h3>测评结果怎么用</h3></div>' +
          '<div class="article" style="padding:4px 6px 8px">' +
            '<ol style="margin:6px 0 0;padding-left:20px;font-size:13.5px;color:var(--ink-2);line-height:2">' +
              '<li>把推荐的学科门类 / 专业类记下来，到「查专业」核对课程与院校实力；</li>' +
              '<li>用「找大学」看这些专业在黑龙江的投档分与位次，确认现实梯度；</li>' +
              '<li>用「模拟填报」把目标专业对应的院校专业组放进冲稳保方案；</li>' +
              '<li>和家长讨论一次：兴趣、能力、家庭条件、就业地域，四个约束一起看。</li>' +
            '</ol>' +
            '<div class="tip info" style="margin-top:10px">' + ICON.info + '<div>测评是<strong>方向参考</strong>而非标准答案。兴趣可以培养，能力可以训练；用测评缩小范围，用数据验证可行性，用行动积累确定性。</div></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ================================================================
     视图：课堂（课程 + 讲堂）
     ================================================================ */
  var LRN = window.GK_LEARN || { meta: {}, subjects: [], courses: [], lessons: [], lives: [] };
  var kv = { sub: '全部' };

  function courseCard(c) {
    return '<div class="kc-card" data-act="course" data-arg="' + esc(c.n) + '">' +
      '<div class="kc-ico">' + ICON.book + '</div>' +
      '<div class="kc-bd">' +
        '<h4>' + esc(c.n) + '</h4>' +
        '<span class="kc-meta">' + esc(c.v) + ' · ' + c.c + ' 讲 · 约 ' + c.h + ' 小时</span>' +
        '<p>' + esc(c.d) + '</p>' +
      '</div>' +
      '<span class="kc-tag">' + esc(c.tag) + '</span>' +
    '</div>';
  }

  function lessonCard(l) {
    return '<div class="ls-card" data-act="lesson" data-arg="' + esc(l.n) + '">' +
      '<div class="ls-cover">' + ICON.play + '<span>' + l.m + '′</span></div>' +
      '<div class="ls-bd">' +
        '<h4>' + esc(l.n) + '</h4>' +
        '<p>' + esc(l.d) + '</p>' +
        '<span class="ls-meta">' + nf(l.v) + ' 次观看</span>' +
      '</div>' +
    '</div>';
  }

  function viewKetang() {
    var q = kv.sub;
    var courses = q === '全部' ? LRN.courses : LRN.courses.filter(function (c) { return c.s === q; });
    var soonCnt = LRN.lives.filter(function (x) { return x.st === 'soon'; }).length;
    return '' +
      subNav([['课程与讲堂', 'ketang'], ['高招直播', 'live']], 'ketang') +
      '<div class="page-head"><h1>课堂</h1><p>同步课程夯实分数，升学讲堂讲透规则：一边把成绩提上去，一边把"专业、批次、选科、就业"这些志愿决策弄明白。因版权原因本站不直接播放视频，点击课程可跳转官方平台观看；直播日程见 <a href="#/live" style="color:var(--brand)">高招直播</a>。</p></div>' +
      '<div class="num-strip">' +
        '<div class="ns-item"><div class="ns-num">' + LRN.courses.length + '<small>门</small></div><span>同步与备考课程<br>覆盖 9 个科目</span></div>' +
        '<div class="ns-item"><div class="ns-num">' + LRN.lessons.length + '<small>讲</small></div><span>升学讲堂短视频<br>志愿决策一条一讲</span></div>' +
        '<div class="ns-item"><div class="ns-num">' + soonCnt + '<small>场</small></div><span>即将开播的高招直播<br><a href="#/live" style="color:var(--brand)">查看日程 ' + ICON.arrow + '</a></span></div>' +
        '<div class="ns-item"><div class="ns-num">免费</div><span>全部内容免费观看<br>配合模拟填报使用</span></div>' +
      '</div>' +
      '<div class="panel-card">' +
        '<div class="panel-hd"><h3>' + ICON.book + '课程 · 高中同步与备考</h3><span class="hd-sub">与教材同步推进，配随堂练习</span></div>' +
        '<div class="cat-chips" style="padding:0 22px 14px">' +
          ['全部'].concat(LRN.subjects).map(function (s) {
            return '<button type="button" class="chip" aria-pressed="' + (kv.sub === s) + '" data-act="kvsub" data-arg="' + esc(s) + '">' + esc(s) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="kc-grid">' + (courses.length ? courses.map(courseCard).join('') : '<div class="empty" style="grid-column:1/-1"><p>该科目暂无课程</p></div>') + '</div>' +
      '</div>' +
      '<div class="panel-card">' +
        '<div class="panel-hd"><h3>' + ICON.play + '讲堂 · 升学规划短视频</h3><span class="hd-sub">每讲 5-9 分钟，讲清一个志愿决策</span></div>' +
        '<div class="ls-grid">' + LRN.lessons.map(lessonCard).join('') + '</div>' +
      '</div>' +
      '<div class="tip info">' + ICON.info + '<div>课堂内容配合使用效果最好：先看讲堂建立整体认知，再做 <a href="#/ce" style="color:var(--brand)">测评</a> 明确方向，最后用 <a href="#/zhineng" style="color:var(--brand)">模拟填报</a> 把方向落成志愿表。</div></div>';
  }

  /* ================================================================
     视图：高招直播
     ================================================================ */
  function liveCard(x) {
    var soon = x.st === 'soon';
    return '<div class="lv-card' + (soon ? ' soon' : '') + '">' +
      '<div class="lv-st ' + x.st + '">' + (soon ? '即将开始' : '回放') + '</div>' +
      '<div class="lv-date"><b>' + esc(x.d.slice(5).replace('-', '/')) + '</b><span>' + esc(x.t) + '</span></div>' +
      '<div class="lv-bd">' +
        '<h4>' + esc(x.n) + '</h4>' +
        '<span class="lv-org">' + esc(x.u) + '</span>' +
        '<span class="lv-views">' + (soon ? '尚未开播' : nf(x.v) + ' 人次观看') + '</span>' +
      '</div>' +
      '<button class="btn ' + (soon ? 'btn-primary' : 'btn-ghost') + ' btn-sm" type="button" data-act="lvgo" data-arg="' + esc(x.n) + '">' + (soon ? '预约' : '看回放') + '</button>' +
    '</div>';
  }

  function viewLive() {
    var soon = LRN.lives.filter(function (x) { return x.st === 'soon'; });
    var back = LRN.lives.filter(function (x) { return x.st === 'back'; });
    return '' +
      subNav([['课程与讲堂', 'ketang'], ['高招直播', 'live']], 'live') +
      '<div class="page-head"><h1>高招直播</h1><p>高校招生宣讲与专业解读的直播日程，整理自各高校公开招生宣讲活动。看直播前建议先在「找大学」了解该校在黑龙江的投档分与位次，带着问题听。</p></div>' +
      (soon.length ? '<div class="panel-card"><div class="panel-hd"><h3>' + ICON.spark + '即将开播</h3><span class="hd-sub">开播前可预约，开播自动提醒（演示）</span></div>' +
        '<div class="lv-grid">' + soon.map(liveCard).join('') + '</div></div>' : '') +
      '<div class="panel-card">' +
        '<div class="panel-hd"><h3>' + ICON.play + '往期回放</h3><span class="hd-sub">书记院长讲专业 · 招生政策解读专场</span></div>' +
        '<div class="lv-grid">' + back.map(liveCard).join('') + '</div>' +
      '</div>' +
      '<div class="tip info">' + ICON.info + '<div>直播与回放为展示型日程（更新于 ' + esc((LRN.meta && LRN.meta.updated) || '') + '）。各高校官方直播请以院校本科招生网与 <a href="https://gaokao.chsi.com.cn" target="_blank" rel="noopener" style="color:var(--brand)">阳光高考平台</a> 发布为准。</div></div>';
  }

  /* ================================================================
     视图：机构（志愿填报服务机构甄别指南）
     ================================================================ */
  var JG_CHECKS = [
    ['看资质', '查营业执照经营范围是否包含「教育咨询」；宣称与省招考院、高校「内部合作」的一律不可信——招生录取只有官方渠道。'],
    ['看数据', '询问其数据来源：能否讲清院校专业组、一分一段、投档线口径。说不清数据来源、只会喊「保证录取」的，直接排除。'],
    ['看合同', '正规服务应有书面合同，明确服务内容、退款条款。「不录取全额退」往往附带苛刻的免责条件，逐条读完再签。'],
    ['看收费', '黑龙江市场上万元的一对一辅导屡见纠纷。先试用免费的官方工具与本站模拟填报，多数需求根本不需要付费。'],
    ['看边界', '任何机构都不能「操作」录取。分数、位次、招生计划都是公开数据，机构能做的是帮你省时间，而不是创造奇迹。']
  ];
  var JG_SCAMS = [
    ['「内部指标」「补录名额」', '高校招生计划全部在《黑龙江省普通高等学校招生计划》中公布，不存在花钱能买的内部指标。这是典型诈骗话术，遇到可直接向省招考院举报。'],
    ['「不录退费」保过班', '合同里常藏「须完全按照我方方案填报且不接受任何调剂修改」等无法满足的条件，退费时以此拒赔。'],
    ['伪造「录取短信」链接', '录取信息只通过省招考院官网与报考院校官网查询，任何短信里的「补录确认」链接都不要点。'],
    ['冒充「军方招生办」', '军队院校招生不委托任何中介。政治考核、军检、面试全部由省军区招生办与省招考院组织。'],
    ['高价「志愿卡」倒卖', '同款数据服务层层加价卖给家长。本站分数线、位次查询、模拟填报全部免费，先查再买不吃亏。']
  ];
  var JG_OFFICIAL = [
    ['黑龙江省招生考试院', '政策发布、成绩查询、志愿填报、录取查询的唯一官方入口。', 'https://www.hljea.org.cn'],
    ['黑龙江省招生考试信息港', '历年投档线、一分一段表、招生计划等公开数据查询。', 'https://www.lzk.hl.cn'],
    ['阳光高考信息平台', '教育部平台：高校招生章程公示、在线咨询周、举报渠道。', 'https://gaokao.chsi.com.cn'],
    ['高校本科招生网', '院校官方招生章程、历年录取统计、咨询电话与校园开放日。', '']
  ];

  function viewJigou() {
    return '' +
      '<div class="page-head"><h1>机构</h1><p>志愿填报服务机构怎么选、怎么避坑。本站不销售任何付费咨询，也不推荐具体机构——这一页只给你「甄别方法 + 官方免费渠道」。真需要花钱买服务之前，先把免费的用足。</p></div>' +
      '<div class="panel-card">' +
        '<div class="panel-hd"><h3>' + ICON.check + '选机构「五看」</h3><span class="hd-sub">签约前逐条对照</span></div>' +
        '<div class="pol-steps">' +
          JG_CHECKS.map(function (c, i) {
            return '<div class="pol-step"><span class="ps-no">' + (i + 1) + '</span><h4>' + esc(c[0]) + '</h4><p>' + esc(c[1]) + '</p></div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="home-cols">' +
        '<div class="panel-card">' +
          '<div class="panel-hd"><h3>' + ICON.warn + '常见骗局与话术</h3><span class="hd-sub">遇到任何一条，直接拉黑</span></div>' +
          '<div class="article" style="padding:2px 22px 14px">' +
            JG_SCAMS.map(function (s) {
              return '<div class="rep-risk warn" style="margin-bottom:10px">' + ICON.warn + '<p><b>' + esc(s[0]) + '：</b>' + esc(s[1]) + '</p></div>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="panel-card">' +
          '<div class="panel-hd"><h3>' + ICON.info + '官方免费渠道</h3><span class="hd-sub">权威、免费、先查这里</span></div>' +
          '<div class="article" style="padding:2px 22px 14px">' +
            JG_OFFICIAL.map(function (o) {
              return '<div class="rep-risk ok" style="margin-bottom:10px">' + ICON.ok + '<p><b>' + esc(o[0]) + '</b><br>' + esc(o[1]) + (o[2] ? ' <a href="' + o[2] + '" target="_blank" rel="noopener" style="color:var(--brand)">前往 &gt;</a>' : '') + '</p></div>';
            }).join('') +
            '<div class="tip info" style="margin-top:4px">' + ICON.info + '<div>本站的 <a href="#/zhineng" style="color:var(--brand)">模拟填报</a>、<a href="#/lines" style="color:var(--brand)">分数线与位次查询</a>、<a href="#/yidu" style="color:var(--brand)">易度排名</a> 基于同一套官方投档数据，全部免费。</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="panel-card">' +
        '<div class="panel-hd"><h3>' + ICON.spark + '什么情况才需要考虑付费咨询</h3></div>' +
        '<div class="article" style="padding:2px 22px 14px">' +
          '<table class="info-table"><thead><tr><th>情况</th><th>建议</th></tr></thead><tbody>' +
            '<tr><td><b>大多数家庭</b></td><td>用本站免费工具 + 官方渠道足够：数据、规则、模拟填报全覆盖，家长花一个下午就能学会。</td></tr>' +
            '<tr><td><b>时间极其紧张、分数处于批次线边缘</b></td><td>优先研究征集志愿规则与往年补录数据，其次再考虑付费服务，且按「五看」甄别。</td></tr>' +
            '<tr><td><b>艺术类、高水平运动队等复杂路径</b></td><td>先读院校招生章程原文（阳光高考可查），章程解决不了的疑问直接打院校招生办电话，比中介转述可靠。</td></tr>' +
          '</tbody></table>' +
        '</div>' +
      '</div>';
  }

  /* ================================================================
     视图：研究报告
     ================================================================ */
  var REPORTS = [
    { t: '2026 年黑龙江省高考录取数据研究报告', c: '录取数据', d: '2026-11-02', r: 3017, hot: 1,
      s: '基于省招考院 2024–2026 三年投档数据的全景分析：批次线走势、物理/历史类报考结构变化、省内高校录取位次迁移。',
      p: ['本科批物理类上线人数与招生计划基本持平，历史类竞争度略升；', '省内哈尔滨医科大学、哈尔滨理工大学等校主力专业组位次稳中有升；', '专科批省内院校投放量扩大，省外高职在黑招生持续收缩；', '中外合作办学专业组分数带整体下移约 3–8 分，性价比窗口出现。'] },
    { t: '热门专业就业前景与报考热度对照报告', c: '专业分析', d: '2026-10-26', r: 2224, hot: 1,
      s: '把招聘市场需求与高考报考热度放在同一张表上看：哪些专业「热在报考、冷在就业」，哪些正相反。',
      p: ['计算机类报考热度回落但头部院校就业依旧坚挺，分层加剧；', '电气工程及其自动化「报考稳、就业稳」，连续三年供需两旺；', '护理学、康复治疗学需求增长明显，报考热度尚未跟上；', '小语种报考热度明显降温，但「外语+法学/贸易」复合路径仍有空间。'] },
    { t: '新高考选科与专业覆盖率分析（2026 版目录）', c: '选科研究', d: '2026-10-18', r: 1876,
      s: '按 2026 版本科专业目录 883 种专业逐一测算 12 种选科组合的可报覆盖率与门类分布。',
      p: ['物理+化学组合可报覆盖率 100%，其中 51.2% 的专业明确要求物化双选；', '非物化组合平均覆盖率约 46%，医学、工学大门类基本关闭；', '「历史+政治」组合在法学、马克思主义理论类有定向优势；', '选科前先查目标专业的院校要求，同一专业各校要求可能不同。'] },
    { t: '省内高校录取趋势三年对比（2024–2026）', c: '录取数据', d: '2026-10-09', r: 1654,
      s: '黑龙江省内 26 所本科院校主力专业组近三年投档分与位次的全量对比。',
      p: ['哈工大、哈工程省内投放稳定，本部专业组位次波动在 ±500 名内；', '省属重点高校师范类、电气类、临床医学位次持续走高；', '民办本科与独立学院分数带整体下探，压线考生选择空间扩大；', '「省内读大学」性价比提高：同分段省内可选择的专业组数量增加。'] },
    { t: '艺术类批次报考策略与数据复盘', c: '批次研究', d: '2026-09-30', r: 1420,
      s: '艺术类本科批与专科批的综合分投档规则、各艺术门类分数结构与报考策略复盘。',
      p: ['综合分换算下，专业课 10 分约等于文化课 20–30 分的杠杆（因门类而异）；', '美术与设计类招生计划最多，音乐类院校梯度最陡；', '文化课过线后，综合分排名比专业排名更能决定去向；', '艺术类征集志愿出现频率高于普通类，务必关注省招考院公告。'] },
    { t: '专科批就业导向专业选择分析', c: '专业分析', d: '2026-09-22', r: 1288,
      s: '专科批 754 个专业中哪些就业口径最清晰：铁道、电力、护理、学前教育四条主线的对比。',
      p: ['「订单班」「校企合作班」入校即锁定就业出口，但需核对协议条款；', '电力、铁道类专科对口就业率高，院校行业背景比城市更重要；', '专升本路径规划：优先选与本科对口的专科专业，别让升本时跨类；', '护理专科就业稳定但学历天花板明显，建议入学即规划专升本。'] },
    { t: '提前批报考全解：机会与限制并存', c: '批次研究', d: '2026-09-15', r: 1176,
      s: '军队院校、公费师范、优师计划、航海类等提前批批次的报考条件、体检政审与违约条款详解。',
      p: ['提前批「不占用」普通批志愿，但一旦录取即锁定，不能再参加后续批次；', '公费师范与优师计划有服务期约定，违约将记入诚信档案；', '军队院校军检标准（视力、身高、体重）淘汰率不低，报考前自行对照；', '提前批适合「明确想去」的考生，不适合「分数白捡」心态。'] },
    { t: '2026 版本科专业目录新增专业解读', c: '政策解读', d: '2026-09-08', r: 1053,
      s: '29 个新增专业、交叉学科门类落地：学什么、哪些学校开、报考时怎么看。',
      p: ['低空技术与工程、具身智能等新专业对接国家战略性新兴产业；', '新专业首年开设院校少、培养方案新，报考属于「早班车」也是「试乘车」；', '新增专业多为特设（T）或国控（K），招生规模受控；', '选新专业先看开设院校的学科基础，而不是只看专业名字。'] }
  ];

  function viewYanbao() {
    var cats = ['全部'].concat(REPORTS.map(function (r) { return r.c; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    return '' +
      '<div class="page-head"><h1>研究报告</h1><p>基于本站收录的黑龙江官方投档数据与教育部公开目录整理的研究报告：录取数据、专业就业、选科覆盖、批次策略。全部免费阅读，数据口径与「分数线」「易度排名」一致。</p></div>' +
      '<div class="num-strip">' +
        '<div class="ns-item"><div class="ns-num">' + REPORTS.length + '<small>篇</small></div><span>研究报告<br>持续更新</span></div>' +
        '<div class="ns-item"><div class="ns-num">3<small>年</small></div><span>投档数据跨度<br>2024–2026</span></div>' +
        '<div class="ns-item"><div class="ns-num">' + nf(META.groupCount) + '<small>组</small></div><span>院校专业组样本<br>全批次覆盖</span></div>' +
        '<div class="ns-item"><div class="ns-num">883<small>种</small></div><span>本科专业目录<br>2026 版全量</span></div>' +
      '</div>' +
      '<div class="panel-card">' +
        '<div class="panel-hd"><h3>' + ICON.book + '全部报告</h3><span class="hd-sub">点击查看摘要与要点</span></div>' +
        '<div class="article" style="padding:2px 22px 16px">' +
          REPORTS.map(function (r) {
            return '<div class="news-item" data-act="report" data-arg="' + esc(r.t) + '">' +
              '<h4>' + esc(r.t) + (r.hot ? '<span class="qg-badge" style="position:static;box-shadow:none">热</span>' : '') + '</h4>' +
              '<div class="news-meta"><span class="ntag">' + esc(r.c) + '</span><span>' + esc(r.d) + '</span><span>' + nf(r.r) + ' 次阅读</span></div>' +
              '<p style="margin:6px 0 0;font-size:12.5px;color:var(--ink-3);line-height:1.7">' + esc(r.s) + '</p>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="tip info">' + ICON.info + '<div>报告观点基于公开数据整理，仅供参考，不构成报考建议。数据请以 <a href="https://www.lzk.hl.cn" target="_blank" rel="noopener" style="color:var(--brand)">省招生考试信息港</a> 发布为准。</div></div>';
  }

  /* ================================================================
     视图：易度排名（黑龙江录取难易度，按本站投档数据测算）
     ================================================================ */
  var yd = { kind: '物', batch: 'ben' };

  function yiduRows() {
    var ki = KI(yd.kind), yj = yearIdx(), out = {};
    for (var i = 0; i < GROUPS.length; i++) {
      var g = GROUPS[i];
      if (g[1] !== ki || g[9] !== yj || !g[4]) continue;
      var b = g[8];
      var isBen = b === 0, isZhuan = b === 1 || b === 2;
      if (yd.batch === 'ben' ? !isBen : !isZhuan) continue;
      var name = SCHOOLS[g[0]][0];
      if (!out[name]) out[name] = { i: i, g: g, s: SCHOOLS[g[0]], cnt: 0, sum: 0 };
      out[name].cnt++;
      if (g[4] < out[name].g[4]) { out[name].i = i; out[name].g = g; } // 取门槛分最低的专业组
    }
    return Object.keys(out).map(function (k) { return out[k]; })
      .sort(function (a, b) { return b.g[4] - a.g[4]; }).slice(0, 60);
  }

  function viewYidu() {
    var rows = yiduRows();
    return '' +
      '<div class="page-head"><h1>易度排名</h1><p>黑龙江高考录取难易度排名：按 ' + dataYear() + ' 年各院校在黑投档分从高到低排列，取每所院校<b>门槛分最低的院校专业组</b>作为代表。分数越高代表「越难录」。切换科类与批次查看不同榜单。</p></div>' +
      '<div class="nw-bar" style="margin-bottom:14px">' +
        '<div class="cat-chips">' +
          ['物', '史'].map(function (k) {
            return '<button type="button" class="chip" aria-pressed="' + (yd.kind === k) + '" data-act="ydkind" data-arg="' + k + '">' + KIND_NAME[k] + '</button>';
          }).join('') +
        '</div>' +
        '<div class="cat-chips">' +
          '<button type="button" class="chip" aria-pressed="' + (yd.batch === 'ben') + '" data-act="ydbatch" data-arg="ben">本科批</button>' +
          '<button type="button" class="chip" aria-pressed="' + (yd.batch === 'zk') + '" data-act="ydbatch" data-arg="zk">专科批</button>' +
        '</div>' +
      '</div>' +
      '<div class="table-wrap"><table class="info-table"><thead><tr><th style="width:56px">排名</th><th>院校</th><th>地区</th><th>门槛分</th><th>对应位次</th><th>专业组数</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (x, idx) {
          return '<tr data-act="openSchool" data-arg="' + x.g[0] + '">' +
            '<td><span class="hs-no' + (idx < 3 ? ' t' + (idx + 1) : '') + '" style="display:inline-grid">' + (idx + 1) + '</span></td>' +
            '<td><b>' + esc(x.s[0]) + '</b>' + lvBadge(x.s) + (x.s[2] === '黑龙江' ? '<span class="badge local">省内</span>' : '') + '</td>' +
            '<td>' + esc(x.s[2] || '—') + '</td>' +
            '<td><b class="num" style="font-size:15px;color:var(--brand)">' + x.g[4] + '</b></td>' +
            '<td class="mono">' + nf(x.g[5] || 0) + '</td>' +
            '<td class="mono">' + x.cnt + ' 个</td>' +
          '</tr>';
        }).join('') : '<tr><td colspan="6"><div class="empty" style="padding:30px 0">暂无数据</div></td></tr>') +
      '</tbody></table></div>' +
      '<div class="tip info" style="margin-top:14px">' + ICON.info + '<div>口径说明：门槛分 = 该校在黑招生的所有院校专业组中的<b>最低投档分</b>（不含中外合作办学等特殊组）；点击院校行可查看该校全部专业组。同一所大学不同专业组分差可达数十分，排名只反映「最容易进入的那个口」，完整梯度请用 <a href="#/zhineng" style="color:var(--brand)">模拟填报</a> 逐组测算。数据：' + dataYear() + ' 年黑龙江省招生考试院投档线。</div></div>';
  }

  function viewXk(sub) {
    sub = sub || '';
    var cnt = xkMlCount(), total = 0;
    Object.keys(cnt).forEach(function (k) { total += cnt[k]; });
    var heads = {
      '': ['新高考选科', '黑龙江「3+1+2」新高考选科指导：首选科目物理 / 历史二选一，再选科目从化学、生物、政治、地理中任选两科，共 12 种组合。覆盖率依据教育部《普通高校本科招生专业选考科目要求指引（通用版）》（2024 年起适用）按 2026 版本科专业目录 ' + nf(total) + ' 种专业测算。'],
      'quiz': ['学科专业倾向测评', '不做「应该选什么」的猜测，用 18 道题测出你的学科兴趣与能力结构，换算出推荐的首选科目、再选组合与匹配的学科门类。'],
      'req': ['高校专业选科要求', '按 2026 版本科专业目录与《选考科目要求指引（通用版）》整理全部 ' + nf(total) + ' 个专业的典型选科要求，可按门类、要求类型与关键词检索。'],
      'field': ['重点领域专业需求', '国家战略与产业升级需要什么人？14 个重点领域对应哪些本科专业、要求什么选科、毕业后去哪里。']
    };
    var head = heads[sub] || heads[''];
    var body = sub === 'req' ? xkReqHTML() : sub === 'field' ? xkFieldHTML() : sub === 'quiz' ? (qzInit('xk'), quizIntroHTML('xk') + quizHTML('xk')) : xkHomeHTML();
    return '<div class="page-head"><h1>' + head[0] + '</h1><p>' + head[1] + '</p></div>' +
      subNav([['选科自查', 'xk'], ['学科专业倾向测评', 'xk/quiz'], ['高校专业选科要求', 'xk/req'], ['重点领域专业需求', 'xk/field']], 'xk' + (sub ? '/' + sub : '')) +
      body;
  }

  /* ================================================================
     视图：分数线
     ================================================================ */
  function viewLines() {
    var w = linesOf('物'), s = linesOf('史'), a = linesOf('艺') || {};
    // 历年批次线对比
    var cmp = '<div class="cmp-card"><h3>历年批次线对比 <span>普通类 · 黑龙江省招生考试院公布</span></h3>' +
      '<table class="cmp-table"><thead><tr><th>年份</th><th>物理 · 本科批</th><th>物理 · 特招线</th><th>物理 · 专科批</th><th>历史 · 本科批</th><th>历史 · 特招线</th><th>历史 · 专科批</th></tr></thead><tbody>' +
      YEARS.slice().sort(function (a, b) { return b - a; }).map(function (y) {
        var a = META.lines[String(y)] || {}, p = a['物'] || {}, h = a['史'] || {};
        var on = y === dataYear();
        return '<tr' + (on ? ' class="on"' : '') + '><td><b>' + y + '</b>' + (on ? ' <i class="now">当前</i>' : '') + '</td>' +
          '<td>' + (p.ben || '—') + '</td><td>' + (p.te || '—') + '</td><td>' + (p.zk || '—') + '</td>' +
          '<td>' + (h.ben || '—') + '</td><td>' + (h.te || '—') + '</td><td>' + (h.zk || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    return '' +
      '<div class="page-head"><h1>分数线</h1><p>' + dataYear() + ' 年黑龙江各批次录取控制分数线与一分一段位次查询，可查看 ' + yearRange() + ' 年历年对比（普通类与艺术类全批次）。</p></div>' +
      '<div class="line-cards">' +
        '<div class="line-card"><div class="lh">物理类 <i>' + dataYear() + ' 年</i></div><dl>' +
          '<div><dt>本科批</dt><dd>' + w.ben + '</dd></div><div><dt>特殊类型</dt><dd>' + w.te + '</dd></div><div><dt>高职专科</dt><dd>' + w.zk + '</dd></div>' +
        '</dl></div>' +
        '<div class="line-card"><div class="lh">历史类 <i class="h">' + dataYear() + ' 年</i></div><dl>' +
          '<div><dt>本科批</dt><dd>' + s.ben + '</dd></div><div><dt>特殊类型</dt><dd>' + s.te + '</dd></div><div><dt>高职专科</dt><dd>' + s.zk + '</dd></div>' +
        '</dl></div>' +
        '<div class="line-card"><div class="lh">艺术类 <i>' + dataYear() + ' 年</i></div><dl>' +
          '<div><dt>本科文化线</dt><dd>' + (a.ben || 255) + '</dd></div><div><dt>戏曲本科</dt><dd>170</dd></div><div><dt>高职专科</dt><dd>' + (a.zk || 150) + '</dd></div>' +
        '</dl><div class="lc-note">艺术类按综合分投档，专业统考合格线另行公布</div></div>' +
      '</div>' +
      cmp +
      '<div class="rank-calc">' +
        '<div class="rc-card">' +
          '<h3>分数查位次</h3>' +
          '<div class="field-row" style="margin-top:0">' +
            '<div class="field"><label>科类</label><select class="select" id="rcKind" style="width:100%">' +
              ['物', '史'].map(function (k) { return '<option value="' + k + '"' + (st.kind === k ? ' selected' : '') + '>' + KIND_NAME[k] + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label>高考分数</label><div class="input-wrap"><input id="rcScore" type="number" min="0" max="750" placeholder="如 528"><span class="unit">分</span></div></div>' +
          '</div>' +
          '<div class="rc-result" id="rcScoreOut" hidden></div>' +
        '</div>' +
        '<div class="rc-card">' +
          '<h3>位次查分数</h3>' +
          '<div class="field-row" style="margin-top:0">' +
            '<div class="field"><label>科类</label><select class="select" id="rrKind" style="width:100%">' +
              ['物', '史'].map(function (k) { return '<option value="' + k + '"' + (st.kind === k ? ' selected' : '') + '>' + KIND_NAME[k] + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label>全省位次</label><div class="input-wrap"><input id="rrRank" type="number" min="1" placeholder="如 20000"><span class="unit">名</span></div></div>' +
          '</div>' +
          '<div class="rc-result" id="rrRankOut" hidden></div>' +
        '</div>' +
      '</div>' +
      '<div class="tip info rc-note">' + ICON.info + '<div>位次来自《' + dataYear() + '年黑龙江省普通高考成绩一分段统计表》，含全国性政策加分。查院校投档线请前往 <a href="#/schools" style="color:var(--brand);text-decoration:underline">找大学</a>，可按投档分区间与批次筛选。本站已收录 <b>' + yearRange() + ' 年</b>普通类<b>本科批、高职（专科）批、本科提前批、专科提前批</b>与艺术类<b>本科批、专科批（综合分）</b>数据，当前年份（' + dataYear() + '）共 ' + nf(yearStat().groups) + ' 个院校专业组。艺术类不使用文化课位次，改用综合分差评估。</div></div>';
  }

  /* ================================================================
     视图：志愿表
     ================================================================ */
  function listItems() {
    return st.list.map(function (gi) {
      var g = GROUPS[gi];
      return g ? { i: gi, g: g, s: SCHOOLS[g[0]] } : null;
    }).filter(Boolean);
  }

  function viewList() {
    var items = listItems();
    var counts = { chong: 0, wen: 0, bao: 0 };
    var sum = 0;
    items.forEach(function (x) {
      var p = probOf(x.g);
      if (p != null && isVIP()) counts[bucketOf(p)]++;
      sum += x.g[4];
    });
    var avg = items.length ? Math.round(sum / items.length) : 0;
    var l = lineOf(st.kind);
    var cap = listCap();
    var bset = {};
    items.forEach(function (x) { bset[batchOf(x.g)] = 1; });
    var bkeys = Object.keys(bset);
    var bLabel = bkeys.length > 1 ? '本科 + 专科混合' : (bkeys.length ? (BATCH_CN[bkeys[0]] || '本科批') : batchName());
    var bLine = st.batch === '专' ? l.zk : l.ben;

    return '' +
      '<div class="list-head" style="padding-top:32px">' +
        '<div class="title"><h2>我的志愿表</h2><span>' + kindShort() + ' · ' + bLabel + ' · <b id="capNum">' + items.length + '</b> / ' + cap + ' 个院校专业组' + (isVIP() ? '' : '（VIP 可填 40 个）') + '</span></div>' +
        '<div class="actions" style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn btn-ghost btn-sm" type="button" data-act="autofill">' + ICON.spark + '智能编排</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-act="export">' + ICON.download + '导出 CSV' + (isVIP() ? '' : ' 🔒') + '</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-act="print">' + ICON.print + '打印' + (isVIP() ? '' : ' 🔒') + '</button>' +
          '<button class="btn btn-danger btn-sm" type="button" data-act="clear">' + ICON.trash + '清空</button>' +
        '</div>' +
      '</div>' +
      (!isVIP() ? '<div class="lock-banner" style="margin-bottom:14px;text-align:left;display:flex;align-items:center;gap:14px;padding:13px 18px"><div class="lb-ico" style="margin:0;flex-shrink:0">' + ICON.lock + '</div><div style="flex:1"><h4 style="margin:0 0 2px;font-size:13.5px">免费版志愿表容量 ' + cap + ' 个，VIP 可填满 40 个并解锁导出/打印</h4><p style="margin:0">智能编排按「' + STYLES[st.style].name + '」自动排满，开通后可完整使用。</p></div><button class="btn btn-gold btn-sm" type="button" data-act="goto" data-arg="vip">升级</button></div>' : '') +
      '<div class="list-layout">' +
        '<div>' +
          (items.length ? '<div class="vlist" id="vlist">' + items.map(function (x, idx) { return vitemHTML(x, idx); }).join('') + '</div>'
            : '<div class="empty"><div class="ico">' + ICON.list + '</div><h3>志愿表还是空的</h3><p>可以到智能填报一键生成冲稳保方案，或在院校库里逐个挑选加入。</p>' +
              '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" type="button" data-act="goto" data-arg="zhineng">' + ICON.spark + '去智能填报</button>' +
              '<button class="btn btn-ghost" type="button" data-act="goto" data-arg="schools">去院校库挑选</button></div></div>') +
        '</div>' +
        '<div class="side">' +
          '<div class="panel">' +
            '<h3>梯度分布 <span>' + items.length + ' / ' + cap + '</span></h3>' +
            '<div class="gauge">' +
              '<div class="bar">' +
                barSeg('c', counts.chong, items.length) + barSeg('w', counts.wen, items.length) + barSeg('b', counts.bao, items.length) +
              '</div>' +
              '<div class="lg"><span>冲 <b>' + counts.chong + '</b></span><span>稳 <b>' + counts.wen + '</b></span><span>保 <b>' + counts.bao + '</b></span></div>' +
            '</div>' +
            (!isVIP() ? '<div class="tip info" style="margin-bottom:12px">' + ICON.lock + '<div>冲稳保梯度分析为 VIP 功能，开通后可见。</div></div>' : '') +
            '<div class="kv"><span>平均投档分</span><b>' + (avg || '—') + '</b></div>' +
            '<div class="kv"><span>' + (st.batch === '专' ? '专科线' : '本科线') + '（' + bLine + '）差</span><b>' + (avg ? (avg - bLine >= 0 ? '+' : '') + (avg - bLine) : '—') + '</b></div>' +
            '<div class="kv"><span>' + (isArt() ? '我的综合分' : '我的位次') + '</span><b>' + (isArt() ? (st.score || '未填写') : (st.rank ? nf(st.rank) : '未填写')) + '</b></div>' +
            '<div class="kv"><span>方案风格</span><b>' + STYLES[st.style].name + '</b></div>' +
          '</div>' +
          (isVIP() ? '<div class="panel">' + checkHTML(items, counts) + '</div>' : '') +
          '<div class="panel" style="background:var(--surface-2)">' +
            '<h3><span class="hl">' + ICON.info + '平行志愿提示</span></h3>' +
            '<div style="font-size:12.5px;color:var(--ink-2);line-height:1.85">投档按「分数优先、遵循志愿、一轮投档」进行，系统从第 1 个志愿依次检索，<b>一旦投档成功，后续志愿即失效</b>。因此顺序应从高到低排列，把最想去的放在前面。</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function barSeg(cls, n, total) {
    if (!n || !total) return '';
    return '<i class="' + cls + '" style="width:' + (n / total * 100).toFixed(2) + '%"></i>';
  }

  function vitemHTML(x, idx) {
    var g = x.g, s = x.s, p = probOf(g);
    var b = bucketOf(p);
    return '<div class="vitem" draggable="true" data-idx="' + idx + '">' +
      '<div class="handle">' + ICON.grip + '</div>' +
      '<div class="order num">' + (idx + 1) + '</div>' +
      '<div class="vmain">' +
        '<div class="vname">' + esc(s[0]) + lvBadge(s) + batchBadge(g) + (isVIP() && p != null ? matchBadge(p) : '') + typeBadges(g) + '</div>' +
        '<div class="vmeta"><span>第 ' + esc(g[3]) + ' 组</span><span>选科 ' + esc(g[6] || '不限') + '</span><span>' + esc(s[2] || '') + '</span></div>' +
      '</div>' +
      '<div class="vscore"><b class="num">' + g[4] + '</b><span>' + (isArt() ? '综合分 · ' + BATCH_CN[batchOf(g)] : '投档分 · 位次 ' + nf(g[5])) + '</span></div>' +
      '<div class="vops">' +
        '<button class="icon-btn" type="button" data-act="up" data-arg="' + idx + '" title="上移">' + ICON.up + '</button>' +
        '<button class="icon-btn" type="button" data-act="down" data-arg="' + idx + '" title="下移">' + ICON.down + '</button>' +
        '<button class="icon-btn del" type="button" data-act="del" data-arg="' + idx + '" title="移除">' + ICON.trash + '</button>' +
      '</div>' +
    '</div>';
  }

  function checkHTML(items, counts) {
    if (!items.length) {
      return '<h3>梯度体检</h3><div class="tip info" style="margin-top:2px">' + ICON.info + '<div>加入志愿后，这里会检查顺序梯度、保底是否充足、是否存在无效志愿。</div></div>';
    }
    var msgs = [];
    var bseen = {};
    items.forEach(function (x) { bseen[batchOf(x.g)] = (bseen[batchOf(x.g)] || 0) + 1; });
    if (Object.keys(bseen).length > 1) {
      msgs.push(['err', '志愿表里同时混入了本科批和高职（专科）批的院校专业组（' + Object.keys(bseen).map(function (k) { return (k === '本' ? '本科批' : '专科批') + ' ' + bseen[k] + ' 个'; }).join('、') + '）。两个批次分开填报、分开投档，混填会让志愿失效，请分表填写。']);
    }
    var ordered = true;
    for (var i = 1; i < items.length; i++) {
      if (items[i].g[4] > items[i - 1].g[4] + 0) { ordered = false; break; }
    }
    if (!ordered) msgs.push(['warn', '当前顺序存在「低分在前、高分在后」的情况，建议按投档分从高到低重排，否则后面的高分志愿会失效。']);
    else msgs.push(['ok', '顺序梯度正常：投档分由高到低排列，符合平行志愿检索逻辑。']);

    if (counts.bao < 5) msgs.push(['err', '保底志愿仅 ' + counts.bao + ' 个，建议至少留 8–12 个低于自身位次 20% 以上的院校专业组。']);
    else msgs.push(['ok', '保底志愿 ' + counts.bao + ' 个，兜底相对充足。']);

    if (counts.chong > 20) msgs.push(['warn', '冲刺志愿偏多（' + counts.chong + ' 个），建议压缩到 10–16 个，把名额让给稳和保。']);
    if (items.length < 30) msgs.push(['info', '当前只填了 ' + items.length + ' 个志愿，平行志愿最多可填 40 个，空位等于放弃机会。']);

    return '<h3>梯度体检 <span>' + (msgs.filter(function (m) { return m[0] === 'err'; }).length ? '有风险' : '正常') + '</span></h3>' +
      msgs.slice(0, 4).map(function (m) {
        var icon = m[0] === 'ok' ? ICON.ok : m[0] === 'err' ? ICON.warn : ICON.info;
        return '<div class="tip ' + m[0] + '" style="margin-bottom:8px">' + icon + '<div>' + m[1] + '</div></div>';
      }).join('');
  }

  /* ---------------- 自动编排 ---------------- */
  function autofill() {
    if (isArt() ? !st.score : !st.rank) { toast(isArt() ? '请先填写艺考综合分' : '请先填写分数或位次'); location.hash = '#/zhineng'; return; }
    var plan = STYLES[st.style].c;
    var pool = recommendPool();
    var b = { chong: [], wen: [], bao: [] };
    pool.forEach(function (x) {
      var p = probOf(x.g);
      b[bucketOf(p)].push({ i: x.i, g: x.g, s: x.s, p: p });
    });
    b.chong.sort(function (a, c) { return c.p - a.p || c.g[4] - a.g[4]; });
    b.wen.sort(function (a, c) { return c.g[4] - a.g[4] || c.p - a.p; });
    b.bao.sort(function (a, c) { return c.g[4] - a.g[4]; });

    var cap = listCap();
    var scale = cap / 40;
    var picked = [], schoolCount = {};
    function take(arr, n, limitSino) {
      var sino = 0;
      n = Math.max(1, Math.round(n * scale));
      for (var i = 0; i < arr.length && n > 0; i++) {
        var x = arr[i];
        var name = x.s[0];
        if ((schoolCount[name] || 0) >= 2) continue;
        if (isSino(x.g)) { if (sino >= limitSino) continue; }
        if (picked.some(function (y) { return y.i === x.i; })) continue;
        picked.push(x); schoolCount[name] = (schoolCount[name] || 0) + 1;
        if (isSino(x.g)) sino++;
        n--;
      }
      return n;
    }
    var left = take(b.chong, plan[0], 3);
    left += take(b.wen, plan[1], 3);
    left += take(b.bao, plan[2], 2);
    if (left > 0) left = take(b.wen, left / scale, 4);
    if (left > 0) left = take(b.bao, left / scale, 3);
    if (left > 0) left = take(b.chong, left / scale, 2);

    if (st.preferLocal) {
      var localPool = pool.filter(function (x) { return x.s[2] === '黑龙江'; })
        .sort(function (a, c) { return c.g[4] - a.g[4]; });
      var wantLocal = Math.min(Math.round(14 * scale), localPool.length);
      var have = picked.filter(function (x) { return x.s[2] === '黑龙江'; }).length;
      for (var i = 0; i < localPool.length && have < wantLocal && picked.length; i++) {
        var cand = localPool[i];
        if (picked.some(function (y) { return y.i === cand.i; })) continue;
        var worst = -1, worstGap = -1;
        for (var j = 0; j < picked.length; j++) {
          if (picked[j].s[2] === '黑龙江') continue;
          var gap = Math.abs(picked[j].g[5] - cand.g[5]);
          if (gap > worstGap) { worstGap = gap; worst = j; }
        }
        if (worst >= 0) { picked[worst] = cand; have++; }
      }
    }

    picked.sort(function (a, c) { return c.g[4] - a.g[4] || a.g[5] - c.g[5]; });
    st.list = picked.slice(0, cap).map(function (x) { return x.i; });
    save();
    location.hash = '#/list';
    render();
    if (!isVIP()) toast('已编排 ' + st.list.length + ' 个志愿（免费版容量 ' + cap + '，VIP 可填满 40 个）');
    else toast('已按「' + STYLES[st.style].name + '」排好 ' + st.list.length + ' 个志愿');
  }

  /* ================================================================
     视图：会员中心
     ================================================================ */
  function viewVip() {
    var vip = isVIP();
    var featFull = ['完整冲稳保推荐（不限条数）', '录取概率与匹配度测算', '40 个志愿一键智能编排', '志愿表导出 CSV / 打印', '省内优先等高级筛选'];
    var featSvip = featFull.concat(['职业性格测评报告', '专家一对一志愿咨询 1 次（线上）', '填报期专属客服优先响应']);

    function featList(arr, extend) {
      return '<ul class="plan-feat">' + arr.map(function (f, i) {
        var on = extend ? true : i < 4;
        return '<li class="' + (on ? '' : 'no') + '">' + (on ? ICON.check : ICON.close) + esc(f) + '</li>';
      }).concat(extend ? [] : ['职业性格测评报告', '专家一对一咨询', '专属客服优先响应'].map(function (f) {
        return '<li class="no">' + ICON.close + esc(f) + '</li>';
      })).join('') + '</ul>';
    }

    var orders = (user && user.orders && user.orders.length)
      ? '<div class="panel orders"><h3>我的订单</h3><div class="table-wrap" style="margin-top:0;border:1px solid var(--line)"><table class="tb"><thead><tr><th>订单号</th><th>套餐</th><th>金额</th><th>时间</th></tr></thead><tbody>' +
        user.orders.map(function (o) {
          return '<tr style="cursor:default"><td style="font-size:12px">' + esc(o.no) + '</td><td>' + esc(o.planName) + '</td><td>¥' + o.price + '</td><td>' + fmtDate(o.at) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>'
      : '';

    return '' +
      '<div class="vip-hero">' +
        '<div class="vh-status">' +
          '<span class="vh-big">' + ICON.crown + '</span>' +
          '<div class="vh-copy">' +
            '<h2>' + (vip ? (user.vip.plan === 'svip' ? '尊享 VIP 会员' : user.vip.plan === 'trial' ? '体验会员' : 'VIP 会员') : (user ? '免费注册会员' : '未登录')) + '</h2>' +
            '<p>' + (vip
              ? '会员权益生效中，全部功能已解锁，放心使用。'
              : (user ? '当前为免费版：推荐可看 5 条、志愿表可填 12 个。升级 VIP 解锁全部功能。' : '登录后即可领取 3 天 VIP 体验，无需绑定支付方式。')) + '</p>' +
          '</div>' +
          '<div class="vh-right">' +
            (vip
              ? '<div class="exp">有效期至 <b>' + fmtDate(user.vip.expire) + '</b></div><div class="exp" style="margin-top:4px">剩余 <b>' + daysLeft() + '</b> 天</div>'
              : '<button class="btn btn-gold btn-lg" type="button" data-act="' + (user ? 'goto' : 'openAuth') + '" data-arg="' + (user ? 'buy' : 'reg') + '"' + (user ? ' id="buyBtn"' : '') + '>' + ICON.crown + (user ? '立即开通' : '注册领体验') + '</button>') +
          '</div>' +
        '</div>' +
      '</div>' +

      syncCardHTML() +

      '<div class="plans">' +
        Object.keys(PLANS).map(function (k) {
          var p = PLANS[k];
          var reco = k === 'vip' ? ' reco' : '';
          return '<div class="plan' + reco + '">' +
            '<h3>' + esc(p.name) + (k === 'svip' ? '<span class="badge lv985">含专家咨询</span>' : '') + '</h3>' +
            '<p class="p-desc">' + esc(p.desc) + '</p>' +
            '<div class="plan-price"><span class="cur">¥</span><span class="val num">' + p.price + '</span><span class="unit">' + esc(p.unit) + '</span><span class="orig">¥' + p.orig + '</span></div>' +
            featList(k === 'svip' ? featSvip : featFull, k !== 'mon') +
            '<button class="btn ' + (k === 'vip' ? 'btn-primary' : 'btn-ghost') + ' btn-block" type="button" data-act="buy" data-arg="' + k + '">立即开通</button>' +
          '</div>';
        }).join('') +
      '</div>' +

      '<div class="panel cmp-wrap">' +
        '<h3 style="justify-content:flex-start;margin-bottom:16px">权益对比</h3>' +
        '<div class="table-wrap" style="margin-top:0;border:1px solid var(--line)"><table class="tb" style="min-width:0"><thead><tr>' +
          '<th>功能</th><th>未登录</th><th>免费注册</th><th>VIP / 尊享VIP</th></tr></thead><tbody>' +
        '<tr style="cursor:default"><td>冲稳保推荐条数</td><td>3 条</td><td>5 条</td><td><b style="color:var(--brand)">不限</b></td></tr>' +
        '<tr style="cursor:default"><td>录取概率 / 匹配度</td><td>—</td><td>—</td><td><b style="color:var(--brand)">√</b></td></tr>' +
        '<tr style="cursor:default"><td>志愿表容量</td><td>6 个</td><td>12 个</td><td><b style="color:var(--brand)">40 个</b></td></tr>' +
        '<tr style="cursor:default"><td>智能一键编排</td><td>—</td><td>限容量</td><td><b style="color:var(--brand)">√ 排满40个</b></td></tr>' +
        '<tr style="cursor:default"><td>梯度体检</td><td>—</td><td>—</td><td><b style="color:var(--brand)">√</b></td></tr>' +
        '<tr style="cursor:default"><td>导出 CSV / 打印</td><td>—</td><td>—</td><td><b style="color:var(--brand)">√</b></td></tr>' +
        '<tr style="cursor:default"><td>专家一对一咨询</td><td>—</td><td>—</td><td>仅尊享VIP</td></tr>' +
        '</tbody></table></div>' +
        '<div class="tip info" style="margin-top:14px">' + ICON.info + '<div>演示环境说明：会员购买流程为<b>模拟支付</b>，用于展示完整产品闭环，未接入真实商户收款；正式上线前需接入微信支付/支付宝并开通商户号。</div></div>' +
      '</div>' +
      orders;
  }

  /* ================================================================
     视图：填报指南
     ================================================================ */
  function viewGuide() {
    var w = linesOf('物'), s = linesOf('史');
    return '' +
      '<div class="page-head"><h1>填报指南</h1><p>黑龙江「3+1+2」新高考志愿规则、投档逻辑与梯度策略。</p></div>' +
      '<div class="guide-grid">' +
        '<article class="article">' +
          '<section id="g1"><h2><span class="no">1</span>录取控制分数线</h2>' +
            '<p>' + dataYear() + ' 年黑龙江省普通类各批次录取控制分数线如下。控制线是最低门槛，<strong>上线不等于录取</strong>，实际录取分取决于院校专业组的招生计划与报考人数。</p>' +
            '<div class="line-cards">' +
              '<div class="line-card"><div class="lh">物理类 <i>首选物理</i></div><dl>' +
                '<div><dt>本科批</dt><dd>' + w.ben + '</dd></div><div><dt>特殊类型</dt><dd>' + w.te + '</dd></div><div><dt>高职专科</dt><dd>' + w.zk + '</dd></div>' +
              '</dl></div>' +
              '<div class="line-card"><div class="lh">历史类 <i class="h">首选历史</i></div><dl>' +
                '<div><dt>本科批</dt><dd>' + s.ben + '</dd></div><div><dt>特殊类型</dt><dd>' + s.te + '</dd></div><div><dt>高职专科</dt><dd>' + s.zk + '</dd></div>' +
              '</dl></div>' +
            '</div>' +
            '<div class="note">特殊类型招生资格线适用于强基计划、高校专项、高水平运动队等特殊类型招生，不是普通本科批的投档线。</div>' +
          '</section>' +
          '<section id="g2"><h2><span class="no">2</span>志愿设置</h2>' +
            '<p>黑龙江普通类本科批<strong>合并了原一本、二本</strong>，以「院校专业组」为志愿单位，一个院校专业组即一个独立志愿，组内可填 6 个专业志愿和 1 个专业服从调剂选项。</p>' +
            '<p>高职（专科）批同样实行平行志愿，设 40 个院校专业组志愿。本科批与专科批<strong>分开填报、分开投档</strong>：先录本科批，本科批未被录取的考生再参加专科批投档，因此两个批次的志愿表要分别填，不能混填。</p>' +
            '<table class="info-table"><thead><tr><th>批次</th><th>志愿数量</th><th>投档方式</th></tr></thead><tbody>' +
              '<tr><td>本科提前批 · 飞行学员</td><td>1 个（空/海/民飞各 1）</td><td>梯度志愿</td></tr>' +
              '<tr><td>本科提前批 · 综合评价及特殊要求</td><td>1 个</td><td>梯度志愿</td></tr>' +
              '<tr><td>本科提前批 · 军队院校</td><td>2 个</td><td>梯度志愿</td></tr>' +
              '<tr><td>本科提前批 · 普通院校（公安、公费师范等）</td><td>20 个</td><td>平行志愿</td></tr>' +
              '<tr><td>本科批 · 特殊类型招生</td><td>1 个</td><td>梯度志愿</td></tr>' +
              '<tr><td><b>本科批 · 普通本科</b></td><td><b>40 个</b></td><td><b>平行志愿</b></td></tr>' +
              '<tr><td>高职（专科）批</td><td>40 个</td><td>平行志愿</td></tr>' +
            '</tbody></table>' +
            '<p style="font-size:12.5px;color:var(--ink-3)">注：艺术类、体育类批次志愿数另有设置。以上为 ' + dataYear() + ' 年设置，2026 年以省招考院当年文件为准。</p>' +
          '</section>' +
          '<section id="g3"><h2><span class="no">3</span>平行志愿怎么投档</h2>' +
            '<div class="flow">' +
              '<div class="step"><b>分数优先</b><span>全省按位次从高到低排队</span><i>' + ICON.arrow + '</i></div>' +
              '<div class="step"><b>遵循志愿</b><span>从第 1 个志愿开始依次检索</span><i>' + ICON.arrow + '</i></div>' +
              '<div class="step"><b>一轮投档</b><span>投中即停止，后续志愿失效</span><i>' + ICON.arrow + '</i></div>' +
              '<div class="step"><b>院校录取</b><span>组内安排专业，可能退档</span></div>' +
            '</div>' +
            '<p>这意味着：<strong>志愿顺序比数量更重要</strong>。把最想去的放前面不会吃亏；但若把低分院校放在高分院校前面，一旦被前面的投档，后面的机会就直接作废。</p>' +
            '<h3>退档的主要风险</h3>' +
            '<ul>' +
              '<li><b>不服从专业调剂</b>：分数够组投档线但不够所填专业，且不服从调剂，会被退档。平行志愿一轮投档，退档后本批次不再补投。</li>' +
              '<li><b>单科成绩或体检不达标</b>：部分专业对单科或视力、色觉有要求，务必看招生章程。</li>' +
              '<li><b>中外合作办学收费</b>：学费通常 2–6 万元/年，填报前确认家庭可承受。</li>' +
            '</ul>' +
          '</section>' +
          '<section id="g4"><h2><span class="no">4</span>为什么用位次而不是分数</h2>' +
            '<p>每年试题难度不同，同样的 550 分含金量差别很大；但<strong>全省位次相对稳定</strong>。判断「能不能上」，要拿自己的位次对比院校专业组上一年的最低录取位次。</p>' +
            '<table class="info-table"><thead><tr><th>档位</th><th>位次关系（相对你）</th><th>建议数量（40 个）</th><th>作用</th></tr></thead><tbody>' +
              '<tr><td><b style="color:var(--chong)">冲</b></td><td>院校位次比你靠前 10%–40%</td><td>10–16 个</td><td>博取更好的学校</td></tr>' +
              '<tr><td><b style="color:var(--wen)">稳</b></td><td>院校位次与你相差 ±10%</td><td>16–20 个</td><td>主力录取区间</td></tr>' +
              '<tr><td><b style="color:var(--bao)">保</b></td><td>院校位次比你靠后 15% 以上</td><td>10–14 个</td><td>防止滑档</td></tr>' +
            '</tbody></table>' +
            '<div class="note">招生计划变动、专业组拆分合并、报考热度波动都会影响实际分数。若某校今年大幅扩招，实际投档线可能明显低于往年。</div>' +
          '</section>' +
          '<section id="g5"><h2><span class="no">5</span>填报流程与注意事项</h2>' +
            '<ol>' +
              '<li><b>查分查位次</b>：出分当天省招考院同时公布一分段统计表，先确认准确位次。</li>' +
              '<li><b>读计划</b>：翻阅《黑龙江省普通高等学校招生计划》，核对院校代号、专业组代号与选科要求。</li>' +
              '<li><b>分两次填报</b>：第一次填报本科提前批，第二次填报本科批、高职（专科）批等。具体时间以当年通知为准。</li>' +
              '<li><b>用官方系统提交</b>：登录黑龙江省招生考试院官网网报中心，凭准考证号与密码填报。</li>' +
              '<li><b>关注征集志愿</b>：每批次录取结束后，未完成计划会公开征集，未被录取且达线的考生可再次填报。</li>' +
            '</ol>' +
            '<div class="tip warn" style="margin-top:6px">' + ICON.warn + '<div>志愿必须由考生本人填报，妥善保管密码。任何机构声称「内部指标」「花钱保录」均为诈骗。</div></div>' +
          '</section>' +
          '<section id="g6"><h2><span class="no">6</span>常见问题</h2>' +
            '<div class="faq">' +
              faq('院校专业组到底是什么？', '高校把选考科目要求相同的若干专业打包成一个组，作为投档单位。你填报的是「某校第 00X 组」，投档时按组投档，进组后再分配具体专业。同一所学校的不同组，投档线可能相差几十分。') +
              faq('专业服从调剂要不要勾？', '建议勾。不服从调剂时，如果分数进不了所填的 6 个专业，学校只能退档，而平行志愿一轮投档，退档后本批次就没有第二次机会了。勾选调剂只会在该院校专业组内调剂，不会调到其他组。') +
              faq('分数刚好压线，还有希望吗？', '有，但要看位次而非分数。若你的位次优于该组去年最低位次，希望较大；若明显落后，建议作为「冲」的志愿，同时把稳和保填满。') +
              faq('中外合作办学和普通专业有什么区别？', '毕业证通常与普通专业一致，但学费高（常见 2–6 万元/年），部分项目要求出国交流。投档分往往低于同校普通组，是低分进好学校的路径之一。') +
              faq('国家专项、地方专项我能报吗？', '需要相应资格：国家专项面向指定贫困地区县考生，地方专项面向省内农村户籍考生，报名时已进行资格审核。没有资格的考生填了也是无效志愿。') +
              faq('数据是哪一年的，2026 年还能用吗？', '本站数据为 ' + dataYear() + ' 年黑龙江普通本科批投档线。2026 年填报时位次参考价值仍然较高，但需结合当年招生计划变化判断，建议同时查阅目标院校近三年数据。') +
            '</div>' +
          '</section>' +
          '<section id="g7"><h2><span class="no">7</span>数据来源与免责声明</h2>' +
            '<p>投档分数线来自黑龙江省招生考试院公布的各批次平行志愿投档分数线原始文件，位次来自同年《普通高考成绩一分段统计表》。已整理 <b>' + yearRange() + ' 年</b>共 ' + nf(META.groupCount) + ' 个院校专业组、' + nf(META.schoolCount) + ' 所院校，覆盖普通类<b>本科批、高职（专科）批、本科提前批、专科提前批</b>与艺术类<b>本科批、专科批</b>（美术与设计、音乐、舞蹈、播音与主持、表（导）演、书法、戏曲）（' + YEARS.map(function (y) { return y + ' 年 ' + nf((META.byYear[String(y)] || {}).groups || 0) + ' 组'; }).join('，') + '）。艺术类不公布文化课位次，按综合分评估。</p>' +
            '<ul>' +
              '<li>院校所在省份依据院校名称与校区信息标注，个别分校、校区的归属可能存在偏差。</li>' +
              '<li>「985 / 211 / 双一流」标签为便于筛选而添加，不代表当年招生批次或办学层次评价。</li>' +
              '<li>本工具为志愿填报辅助参考，<strong>不构成任何录取承诺</strong>，也不替代官方志愿填报系统。</li>' +
            '</ul>' +
          '</section>' +
        '</article>' +
        '<aside class="guide-toc"><h4>目录</h4>' +
          [['g1', '录取控制分数线'], ['g2', '志愿设置'], ['g3', '平行志愿投档'], ['g4', '位次与冲稳保'], ['g5', '填报流程'], ['g6', '常见问题'], ['g7', '数据与免责']]
            .map(function (x) { return '<a href="javascript:void(0)" data-act="toc" data-arg="' + x[0] + '">' + x[1] + '</a>'; }).join('') +
        '</aside>' +
      '</div>';
  }
  function faq(q, a) {
    return '<details><summary>' + q + '</summary><div class="ans">' + a + '</div></details>';
  }

  /* ================================================================
     账号：云服务登录（手机验证码 / 微信授权）
     会话与数据均由云服务管理，换设备登录同一账号即可恢复成绩档案与志愿表
     ================================================================ */
  var authErr = '';
  var authBusy = false;
  var otp = null;         // { phone, verificationId, isExistingUser }
  var otpTimer = 0;
  var otpBtn = null;
  var syncing = { at: 0, err: '', busy: false };

  function cloudOK() { return !!(window.GKCloud && window.GKCloud.available); }

  function msgOf(e) {
    var m = '';
    if (e) m = e.message || e.error_description || e.msg || (typeof e === 'string' ? e : '');
    var code = (e && (e.code || e.status)) || '';
    if (/42501|permission denied/i.test(String(code) + ' ' + m)) return '当前账号没有权限执行此操作，请重新登录后再试';
    if (/42P01|does not exist/i.test(String(code) + ' ' + m)) return '云端数据表尚未就绪，请联系管理员';
    if (/23505|duplicate key/i.test(String(code) + ' ' + m)) return '该记录已存在，请刷新后重试';
    if (/invalid|expired|otp|token|verification/i.test(m)) return '验证码无效或已过期，请重新获取';
    if (/rate|too many|429/i.test(String(code) + ' ' + m)) return '操作过于频繁，请稍后再试';
    if (!m) return '操作失败，请稍后重试';
    if (/network|failed to fetch|timeout|Load failed/i.test(m)) return '网络连接失败，请检查网络后重试';
    return m;
  }

  function timeAgo(ts) {
    var d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return '刚刚';
    if (d < 3600) return Math.floor(d / 60) + ' 分钟前';
    if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
    return fmtDate(ts);
  }

  function setAuthErr(msg) {
    authErr = msg || '';
    var box = document.getElementById('authMsg');
    if (box) {
      box.className = 'auth-msg' + (authErr ? ' on' : '');
      box.innerHTML = authErr ? ICON.warn + '<span>' + esc(authErr) + '</span>' : '';
    }
  }

  function authKV(lines) {
    return '<ul class="auth-kv">' + lines.map(function (s) {
      return '<li>' + ICON.check + esc(s) + '</li>';
    }).join('') + '</ul>';
  }

  function wxPanelHTML() {
    var inApp = /MicroMessenger/i.test(navigator.userAgent);
    return '<div class="wx-panel">' +
      '<div class="wx-auth-card">' +
        '<span class="wx-auth-ic">' + ICON.wx + '</span>' +
        '<b>使用微信登录</b>' +
        '<p>' + (inApp
          ? '当前在微信中打开，点击后直接授权本机微信账号，无需扫码。'
          : '点击后跳转到微信授权页，用微信扫码确认身份，完成后自动回到本页。') + '</p>' +
      '</div>' +
      '<button class="btn-wx" type="button" data-act="wxLogin"' + (authBusy ? ' disabled' : '') + '>' +
        ICON.wx + (authBusy ? '正在跳转微信授权…' : '使用微信登录') + '</button>' +
      authKV(['微信授权仅用于确认身份，不获取手机号与好友关系',
              '首次登录自动创建账号，之后扫码/授权即识别为同一账号']) +
    '</div>';
  }

  function phonePanelHTML() {
    return '' +
      '<div class="auth-field"><label for="authPhone">手机号</label>' +
        '<input id="authPhone" type="tel" maxlength="11" inputmode="numeric" placeholder="请输入 11 位手机号" autocomplete="tel"></div>' +
      '<div class="auth-field"><label for="authCode">短信验证码</label>' +
        '<div class="auth-code-row">' +
          '<input id="authCode" type="text" maxlength="6" inputmode="numeric" placeholder="6 位验证码" autocomplete="one-time-code">' +
          '<button class="code-btn" type="button" data-act="sendCode">获取验证码</button>' +
        '</div></div>' +
      '<button class="btn btn-primary btn-lg btn-block" type="button" data-act="authSubmit"' + (authBusy ? ' disabled' : '') + '>' +
        (authBusy ? '正在登录…' : '登录 / 注册') + '</button>' +
      authKV(['未注册的手机号验证通过后自动创建账号',
              '成绩档案与志愿表保存在云端，换设备登录即可恢复']) +
      '<div class="auth-note">收不到短信？请检查号码是否正确，或 60 秒后重新获取。</div>';
  }

  function openAuth(mode) {
    authMode = mode || 'login';
    authMethod = 'phone';
    authErr = '';
    authBusy = false;
    renderAuth();
  }

  function renderAuth() {
    var wxOn = authMethod === 'wx';
    showModal(
      '<div class="modal-head"><div class="top"><div><h3>登录 / 注册</h3>' +
        '<div class="sub"><span>' + (wxOn ? '微信授权登录，首次自动创建账号' : '手机号 + 短信验证码，新用户自动注册') + '</span></div></div>' +
        '<button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
      '<div class="modal-body">' +
        '<div class="auth-methods">' +
          '<button class="am" type="button" data-m="phone" data-act="authMethod" data-arg="phone" aria-pressed="' + !wxOn + '">' +
            '<span class="am-ic">' + ICON.user + '</span>手机验证码</button>' +
          '<button class="am" type="button" data-m="wx" data-act="authMethod" data-arg="wx" aria-pressed="' + wxOn + '">' +
            '<span class="am-ic wx">' + ICON.wx + '</span>微信登录</button>' +
        '</div>' +
        '<div id="authPanel">' + (wxOn ? wxPanelHTML() : phonePanelHTML()) + '</div>' +
        '<div id="authMsg" class="auth-msg' + (authErr ? ' on' : '') + '"></div>' +
        '<div class="auth-tip">' + (cloudOK()
          ? '账号由云服务提供：登录后成绩档案与志愿表会同步到云端，在手机、电脑上登录同一账号即可继续，无需重新填写。'
          : '云服务当前不可用，暂时无法登录。请检查网络后重试；本地已有的志愿表仍可正常查看和使用。') + '</div>' +
      '</div>', true);
    setAuthErr(authErr);
  }

  /* ---------------- 手机验证码 ---------------- */
  function otpCountdown(btn) {
    otpBtn = btn || otpBtn;
    if (!otpBtn) return;
    otpBtn.disabled = true;
    otpBtn.dataset.on = '1';
    var label = '获取验证码';
    otpTimer = setInterval(function () {
      var el = document.querySelector('[data-act="sendCode"]');
      if (!el) { clearInterval(otpTimer); otpTimer = 0; return; }
      otpBtn = el;
      if (otpTimerSec-- <= 1) {
        clearInterval(otpTimer); otpTimer = 0;
        otpBtn.disabled = false; otpBtn.textContent = label;
        delete otpBtn.dataset.on;
        return;
      }
      otpBtn.textContent = otpTimerSec + 's 后重发';
    }, 1000);
    otpBtn.textContent = '60s 后重发';
  }
  var otpTimerSec = 0;

  function doSendCode(btn) {
    var phone = ((document.getElementById('authPhone') || {}).value || '').replace(/\D/g, '');
    setAuthErr('');
    if (!/^1\d{10}$/.test(phone)) { setAuthErr('请输入正确的 11 位手机号'); return; }
    if (!cloudOK()) { setAuthErr('云服务当前不可用，请稍后重试'); return; }
    if (btn) { btn.disabled = true; btn.textContent = '发送中…'; }
    GKCloud.sendCode(phone).then(function (r) {
      if (r.error) {
        if (btn) { btn.disabled = false; btn.textContent = '获取验证码'; }
        setAuthErr(msgOf(r.error));
        return;
      }
      var d = r.data || {};
      otp = { phone: phone, verificationId: d.verificationId || d.verification_id, isExistingUser: !!d.isExistingUser };
      otpTimerSec = 60;
      otpCountdown(btn);
      toast('验证码已发送，请查看短信');
      var code = document.getElementById('authCode');
      if (code) code.focus();
    });
  }

  function doAuthSubmit() {
    if (authBusy) return;
    var phone = ((document.getElementById('authPhone') || {}).value || '').replace(/\D/g, '');
    var code = ((document.getElementById('authCode') || {}).value || '').replace(/\D/g, '');
    setAuthErr('');
    if (!/^1\d{10}$/.test(phone)) { setAuthErr('请输入正确的 11 位手机号'); return; }
    if (!/^\d{4,8}$/.test(code)) { setAuthErr('请输入短信里的验证码'); return; }
    if (!otp || otp.phone !== phone) { setAuthErr('请先获取该手机号的验证码'); return; }
    if (!cloudOK()) { setAuthErr('云服务当前不可用，请稍后重试'); return; }
    authBusy = true;
    var btn = document.querySelector('[data-act="authSubmit"]');
    if (btn) { btn.disabled = true; btn.textContent = '正在登录…'; }
    GKCloud.verifyCode(otp, code).then(function (r) {
      authBusy = false;
      if (btn) { btn.disabled = false; btn.textContent = '登录 / 注册'; }
      if (r.error || !r.session) { setAuthErr(msgOf(r.error)); return; }
      var isNew = adoptSession(r.session);
      otp = null;
      closeModal();
      render();
      afterSignIn(isNew);
    });
  }

  /* ---------------- 微信登录 ---------------- */
  function doWxLogin() {
    if (authBusy) return;
    if (!cloudOK()) { setAuthErr('云服务当前不可用，请稍后重试'); return; }
    setAuthErr('');
    authBusy = true;
    var btn = document.querySelector('[data-act="wxLogin"]');
    if (btn) { btn.disabled = true; btn.textContent = '正在跳转微信授权…'; }
    GKCloud.wechatLogin().then(function (r) {
      authBusy = false;
      if (r.error) {
        if (btn) { btn.disabled = false; btn.innerHTML = ICON.wx + '使用微信登录'; }
        setAuthErr(msgOf(r.error));
      }
    });
  }

  /* ---------------- 会话落地 ---------------- */
  function adoptSession(s) {
    var su = (s && s.user) || {};
    var prev = user || {};
    var same = !!prev.uid && prev.uid === (su.id || '');
    var name = su.name || su.nickname || '';
    var phone = su.phone || '';
    if (!name && phone) name = '考生' + String(phone).slice(-4);
    user = {
      uid: su.id || '',
      name: name || '考生',
      phone: phone || (same ? prev.phone : '') || '',
      email: su.email || '',
      avatar: su.avatarUrl || '',
      regAt: same ? (prev.regAt || Date.now()) : Date.now(),
      vip: same ? (prev.vip || null) : null,
      orders: same ? (prev.orders || []) : []
    };
    saveUser(true);
    return !same;
  }

  function afterSignIn(isNew, quiet) {
    if (!quiet) {
      if (isNew) toast('登录成功，欢迎使用');
      else toast('欢迎回来，' + user.name);
    }
    if (!cloudOK()) return;
    GKCloud.hold(true);
    GKCloud.pull().then(function (r) {
      if (r.error) {
        GKCloud.hold(false);
        toast('云端数据读取失败：' + msgOf(r.error));
        return;
      }
      if (!r.profile) {
        if (!user.vip || !user.vip.expire) user.vip = { plan: 'trial', expire: Date.now() + 3 * 86400000 };
        saveUser(true);
        GKCloud.queueProfile(profileRow());
        toast('已赠送 3 天 VIP 体验，成绩档案将同步到云端');
      } else {
        applyProfileRow(r.profile);
      }
      var remoteItems = (r.wishlist && Array.isArray(r.wishlist.items)) ? r.wishlist.items : null;
      mergeWishlist(remoteItems);
      render();
    });
  }

  function profileRow() {
    return {
      owner_name: (user && user.name) || null,
      kind: st.kind,
      art: st.art,
      batch: st.batch,
      yr: st.year,
      score: st.score == null ? null : st.score,
      rnk: st.rank == null ? null : st.rank,
      subjects: st.subjects || [],
      prefer_local: !!st.preferLocal,
      style: st.style,
      vip_plan: (user && user.vip && user.vip.expire > Date.now()) ? user.vip.plan : null,
      vip_expire: (user && user.vip && user.vip.expire) ? user.vip.expire : null,
      updated_at: new Date().toISOString()
    };
  }

  function applyProfileRow(rp) {
    if (!rp) return;
    if (rp.kind && KIND.indexOf(rp.kind) >= 0) st.kind = rp.kind;
    if (rp.art && ART_NAME[rp.art]) st.art = rp.art;
    if (rp.batch && BATCH_CN[rp.batch]) st.batch = rp.batch;
    if (rp.yr && YEARS.indexOf(rp.yr) >= 0) st.year = rp.yr;
    if (rp.score != null && !isNaN(rp.score)) st.score = rp.score;
    if (rp.rnk != null && !isNaN(rp.rnk)) st.rank = rp.rnk;
    if (Array.isArray(rp.subjects) && rp.subjects.length) {
      st.subjects = rp.subjects.filter(function (x) { return typeof x === 'string'; });
    }
    st.preferLocal = !!rp.prefer_local;
    if (rp.style && STYLES[rp.style]) st.style = rp.style;
    if (rp.owner_name && (!user.name || user.name === '考生')) user.name = rp.owner_name;
    if (rp.vip_expire && rp.vip_expire > Date.now()) {
      if (!user.vip || rp.vip_expire > user.vip.expire) {
        user.vip = { plan: rp.vip_plan || 'vip', expire: rp.vip_expire };
      }
    }
    saveUser(true);
    saveLocal();
  }

  function mergeWishlist(remoteItems) {
    var local = (st.list || []).slice();
    var finish = function (msg) {
      GKCloud.hold(false);
      syncing.at = Date.now();
      syncing.err = '';
      if (msg) toast(msg);
      render();
    };
    if (remoteItems == null) {
      if (local.length) GKCloud.queueWishlist(local);
      finish(null);
      return;
    }
    var remote = remoteItems.filter(function (i) { return typeof i === 'number' && GROUPS[i]; });
    if (!remote.length) {
      if (local.length) GKCloud.queueWishlist(local);
      finish(null);
      return;
    }
    if (!local.length) {
      st.list = remote;
      saveLocal();
      finish('已从云端恢复 ' + remote.length + ' 个志愿');
      return;
    }
    if (JSON.stringify(remote) === JSON.stringify(local)) { finish(null); return; }
    openSyncPick(remote, local);
  }

  function openSyncPick(remote, local) {
    syncing.remoteItems = remote;
    GKCloud.hold(true);
    showModal(
      '<div class="modal-head"><div class="top"><div><h3>志愿表需要合并</h3>' +
        '<div class="sub"><span>云端与本机各有一份志愿表，请选择保留哪一份</span></div></div>' +
        '<button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
      '<div class="modal-body">' +
        '<div class="sync-pick">' +
          '<div class="sp-row"><b>云端</b><span>' + remote.length + ' 个志愿 · 其他设备同步上来的</span>' +
            '<button class="btn btn-primary btn-sm" type="button" data-act="syncPick" data-arg="cloud">用云端</button></div>' +
          '<div class="sp-row"><b>本机</b><span>' + local.length + ' 个志愿 · 当前浏览器里的</span>' +
            '<button class="btn btn-ghost btn-sm" type="button" data-act="syncPick" data-arg="local">用本机</button></div>' +
          '<div class="sp-row"><b>合并</b><span>本机在前，云端补充未重复的，共 ' +
            (local.concat(remote.filter(function (i) { return local.indexOf(i) < 0; })).length) + ' 个</span>' +
            '<button class="btn btn-ghost btn-sm" type="button" data-act="syncPick" data-arg="union">合并</button></div>' +
        '</div>' +
        '<div class="auth-tip">选择后本次志愿表会写入云端，并成为该账号在所有设备上的统一版本。</div>' +
      '</div>', true);
  }

  function pickSync(which) {
    var remote = syncing.remoteItems || [];
    if (which === 'cloud') st.list = remote.slice();
    else if (which === 'local') { /* 保留本机 */ }
    else {
      var local = (st.list || []).slice();
      st.list = local.concat(remote.filter(function (i) { return local.indexOf(i) < 0; }));
    }
    syncing.remoteItems = null;
    GKCloud.hold(false);
    save();
    closeModal();
    toast('志愿表已合并并同步到云端');
    render();
  }

  function doSyncNow() {
    if (!cloudOK() || !user) return;
    syncing.busy = true;
    renderSyncCard();
    GKCloud.flush().then(function () {
      syncing.busy = false;
      renderSyncCard();
      toast(syncing.err ? '同步失败：' + syncing.err : '已同步到云端');
    });
  }

  function renderSyncCard() {
    var el = document.getElementById('syncCard');
    if (el) el.outerHTML = syncCardHTML();
  }

  function syncCardHTML() {
    if (!user) return '';
    if (!cloudOK()) {
      return '<div class="panel sync-card" id="syncCard">' +
        '<span class="sc-ic off">' + ICON.warn + '</span>' +
        '<div class="sc-body"><h4>云服务暂不可用</h4><p>当前浏览器没连上云服务，数据仍保存在本机，恢复网络后重新进入即可继续同步。</p></div>' +
        '</div>';
    }
    var s = (window.GKCloud && GKCloud.sync()) || syncing;
    var txt;
    if (syncing.busy || s.busy) txt = '正在同步…';
    else if (s.err) txt = '上次同步失败：' + s.err;
    else if (s.at || syncing.at) txt = '已同步 · ' + timeAgo(s.at || syncing.at);
    else txt = '尚未同步';
    return '<div class="panel sync-card" id="syncCard">' +
      '<span class="sc-ic' + (s.err ? ' off' : '') + '">' + (s.err ? ICON.warn : ICON.ok) + '</span>' +
      '<div class="sc-body"><h4>账号与志愿表已开启云同步</h4>' +
        '<p>' + esc(user.name) + (user.phone ? ' · ' + user.phone.slice(0, 3) + '****' + user.phone.slice(-4) : '') +
        ' · ' + esc(txt) + ' · 本机志愿表 ' + (st.list || []).length + ' 个</p></div>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-act="syncNow"' + ((syncing.busy || s.busy) ? ' disabled' : '') + '>立即同步</button>' +
      '</div>';
  }

  function doLogout() {
    if (window.GKCloud) GKCloud.signOut();
    user = null;
    saveUser(true);
    syncing.at = 0;
    toast('已退出登录，本机志愿表仍保留');
    render();
  }

  /* ================================================================
     模拟收银台
     ================================================================ */
  function openCheckout(planKey) {
    if (!PLANS[planKey]) return;
    if (!user) { toast('请先登录或注册'); openAuth('reg'); return; }
    payOrder = {
      no: 'LJZT' + Date.now(),
      plan: planKey,
      method: 'wx',
      at: Date.now()
    };
    renderCheckout();
  }
  function renderCheckout() {
    var p = PLANS[payOrder.plan];
    showModal(
      '<div class="modal-head"><div class="top"><div><h3>收银台</h3>' +
        '<div class="sub"><span>订单号 ' + payOrder.no + '</span></div></div>' +
        '<button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
      '<div class="modal-body">' +
        '<div class="pay-summary">' +
          '<div class="ps-plan">' + esc(p.name) + '<small>' + esc(p.desc) + '</small></div>' +
          '<div class="ps-price num">¥' + p.price + '<small> ' + esc(p.unit) + '</small></div>' +
        '</div>' +
        '<div class="pay-methods">' +
          '<button type="button" class="pay-m' + (payOrder.method === 'wx' ? ' on' : '') + '" data-act="payMethod" data-arg="wx">' +
            '<span class="pay-ico wx">' + ICON.wx + '</span><span><b>微信支付</b><span>推荐微信用户</span></span><span class="p-radio"></span></button>' +
          '<button type="button" class="pay-m' + (payOrder.method === 'ali' ? ' on' : '') + '" data-act="payMethod" data-arg="ali">' +
            '<span class="pay-ico ali">' + ICON.ali + '</span><span><b>支付宝</b><span>推荐支付宝用户</span></span><span class="p-radio"></span></button>' +
        '</div>' +
        '<div class="pay-qr">' +
          '<div class="qr-box"></div>' +
          '<p>请使用' + (payOrder.method === 'wx' ? '微信' : '支付宝') + '扫码支付<br>¥' + p.price + ' · ' + esc(p.name) + '</p>' +
        '</div>' +
        '<div class="pay-notice"><b>演示环境：</b>本站未接入真实商户收款，上方二维码仅用于展示。点击下方按钮模拟「支付成功」，会员权益将立即在本机生效。</div>' +
        '<button class="btn btn-primary btn-lg btn-block" type="button" data-act="payDone" style="margin-top:14px">我已完成支付（模拟）</button>' +
      '</div>', true);
  }
  function doPayDone() {
    var p = PLANS[payOrder.plan];
    var base = (user.vip && user.vip.expire > Date.now()) ? user.vip.expire : Date.now();
    user.vip = { plan: payOrder.plan, expire: base + p.days * 86400000 };
    user.orders = user.orders || [];
    user.orders.unshift({ no: payOrder.no, plan: payOrder.plan, planName: p.name, price: p.price, method: payOrder.method, at: Date.now() });
    saveUser();
    closeModal();
    toast('支付成功！' + p.name + '已开通' + (p.days >= 365 ? ' 一年' : ' ' + p.days + ' 天'));
    payOrder = null;
    if (currentRoute() === 'vip') render(); else renderUserArea();
  }

  /* ================================================================
     路由与渲染
     ================================================================ */
  var ROUTES = ['home', 'news', 'xk', 'zhineng', 'zd', 'schools', 'majors', 'lines', 'list', 'vip', 'guide', 'jc', 'zk', 'ce', 'ketang', 'live', 'jigou', 'yanbao', 'yidu'];
  var SUB_ROUTES = { 'news/zc': 1, 'xk/quiz': 1, 'xk/req': 1, 'xk/field': 1, 'zhineng/quiz': 1, 'zhineng/report': 1, 'zhineng/shengya': 1, 'zhineng/career': 1, 'zhineng/baokao': 1 };
  function currentRoute() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    if (SUB_ROUTES[h]) return h;
    var main = h.split('/')[0];
    if (ROUTES.indexOf(main) < 0) return 'home';
    return main;
  }

  function userAreaHTML() {
    var el = document.getElementById('userArea');
    if (!el) return;
    if (!user) {
      el.innerHTML = '<button class="btn-login" type="button" data-act="openAuth" data-arg="login">登录</button>' +
        '<button class="btn-login solid" type="button" data-act="openAuth" data-arg="reg">注册</button>';
      return;
    }
    var vip = isVIP();
    el.innerHTML = '<button class="user-chip" type="button" data-act="goto" data-arg="vip" title="进入会员中心">' +
      '<span class="ua-avatar">' + esc(user.name.slice(0, 1)) + '</span>' +
      '<span class="ua-name">' + esc(user.name) + '</span>' +
      '<span class="ua-tag' + (vip ? '' : ' off') + '">' + planTag() + '</span></button>' +
      '<button class="ua-logout" type="button" data-act="logout">退出</button>';
  }
  function renderUserArea() { userAreaHTML(); }

  /* 顶部「数据年份」切换 */
  function renderYearSwitch() {
    var el = document.getElementById('yearSwitch');
    if (!el) return;
    el.innerHTML = '<span class="ys-label">数据年份</span>' +
      YEARS.map(function (y) {
        return '<button type="button" class="' + (y === dataYear() ? 'on' : '') + '" data-act="year" data-arg="' + y + '" aria-pressed="' + (y === dataYear()) + '">' + y + (y === META.latest ? '<i>最新</i>' : '') + '</button>';
      }).join('');
  }

  function render() {
    var r = currentRoute();
    var main = r.split('/')[0];
    var sub = r.indexOf('/') >= 0 ? r.split('/')[1] : '';
    var app = document.getElementById('app');
    if (main === 'home') app.innerHTML = viewHome();
    else if (main === 'zhineng') app.innerHTML = viewZhineng(sub);
    else if (main === 'schools') app.innerHTML = viewSchools();
    else if (main === 'majors') app.innerHTML = viewMajors();
    else if (main === 'lines') app.innerHTML = viewLines();
    else if (main === 'list') app.innerHTML = viewList();
    else if (main === 'vip') app.innerHTML = viewVip();
    else if (main === 'jc') app.innerHTML = viewJc();
    else if (main === 'zk') app.innerHTML = viewZk();
    else if (main === 'ce') app.innerHTML = viewCe();
    else if (main === 'ketang') app.innerHTML = viewKetang();
    else if (main === 'live') app.innerHTML = viewLive();
    else if (main === 'jigou') app.innerHTML = viewJigou();
    else if (main === 'yanbao') app.innerHTML = viewYanbao();
    else if (main === 'yidu') app.innerHTML = viewYidu();
    else if (main === 'news') app.innerHTML = viewNews(sub === 'zc' ? 'zc' : 'zx');
    else if (main === 'zd') app.innerHTML = viewNews('zd');
    else if (main === 'xk') app.innerHTML = viewXk(sub);
    else app.innerHTML = viewGuide();

    Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === main);
    });
    var chip = document.getElementById('scoreChip');
    var txt = document.getElementById('scoreChipText');
    if (isArt() ? st.score : st.rank) {
      chip.classList.add('on');
      txt.textContent = isArt()
        ? '艺术类 ' + artName() + ' ' + st.score + '分 · ' + batchName()
        : kindShort() + ' ' + (st.score ? st.score + '分 · ' : '') + '位次' + nf(st.rank);
    } else {
      chip.classList.remove('on');
      txt.textContent = '未填写成绩';
    }
    var nc = document.getElementById('navCount');
    nc.hidden = !st.list.length;
    nc.textContent = st.list.length;
    userAreaHTML();
    renderYearSwitch();

    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    bindView(r);
  }

  function refreshResults() {
    var box = document.getElementById('znResult');
    if (box) box.innerHTML = znResultHTML();
  }

  function bindView(r) {
    var rMain = r.split('/')[0];
    if (rMain === 'home' || rMain === 'zhineng') {
      var si = document.getElementById('scoreInput');
      var ri = document.getElementById('rankInput');
      var hint = document.getElementById('scoreHint');

      function updateHints() {
        if (isArt()) {
          if (hint) hint.innerHTML = st.score ? '综合分 <b class="num">' + st.score + '</b>' : '';
          return;
        }
        if (st.rank && hint) {
          var p = abovePct(st.rank, st.kind);
          hint.innerHTML = '位次 <b class="num">' + nf(st.rank) + '</b> · 超 ' + p.toFixed(1) + '%';
        } else if (hint) hint.innerHTML = '';
      }
      updateHints();

      if (si) si.addEventListener('input', function () {
        if (!si.value) { st.score = null; st.rank = null; if (ri) ri.value = ''; save(); updateHints(); refreshResults(); return; }
        if (isArt()) {
          var av = parseFloat(si.value);
          if (isNaN(av)) return;
          st.score = Math.round(av * 100) / 100; st.rank = null;
          save(); updateHints(); refreshResults(); return;
        }
        var v = parseInt(si.value, 10);
        if (isNaN(v)) return;
        st.score = v;
        var rk = rankOf(v, st.kind);
        st.rank = rk;
        if (ri) { if (rk) ri.value = rk; else ri.value = ''; }
        save(); updateHints(); refreshResults();
      });

      if (ri) ri.addEventListener('input', function () {
        var v = parseInt(ri.value, 10);
        if (!ri.value) { st.rank = null; st.score = null; si.value = ''; save(); updateHints(); refreshResults(); return; }
        if (isNaN(v)) return;
        st.rank = v;
        var sc = scoreOfRank(v, st.kind);
        st.score = sc;
        if (sc) si.value = sc;
        save(); updateHints(); refreshResults();
      });

      var pl = document.getElementById('preferLocal');
      if (pl) pl.addEventListener('change', function () {
        st.preferLocal = pl.checked; save(); refreshResults();
      });
    }

    if (r === 'schools') {
      var q = document.getElementById('qInput');
      var timer;
      if (q) q.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          view.sf.q = q.value; view.sf.page = 1;
          document.getElementById('schoolResults').innerHTML = schoolResultsHTML();
        }, 180);
      });
      ['fProv', 'fLv', 'fReq', 'fTy', 'fBatch', 'fArt'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', function () {
          if (id === 'fArt') { st.art = el.value; save(); document.getElementById('schoolResults').innerHTML = schoolResultsHTML(); return; }
          var key = { fProv: 'prov', fLv: 'lv', fReq: 'req', fTy: 'ty', fBatch: 'batch' }[id];
          view.sf[key] = el.value; view.sf.page = 1;
          document.getElementById('schoolResults').innerHTML = schoolResultsHTML();
        });
      });
      var fk = document.getElementById('fKind');
      if (fk) fk.addEventListener('change', function () {
        var wasArt = isArt();
        st.kind = fk.value;
        if (wasArt !== (fk.value === '艺')) { st.score = null; st.rank = null; }
        else if (st.score && fk.value !== '艺') { st.rank = rankOf(st.score, st.kind); }
        view.sf.batch = '';
        save();
        render();
      });
      ['fMin', 'fMax'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function () {
          view.sf[id === 'fMin' ? 'min' : 'max'] = el.value;
          view.sf.page = 1;
          document.getElementById('schoolResults').innerHTML = schoolResultsHTML();
        });
      });
    }

    if (r === 'majors') {
      var mc = document.getElementById('mjCls');
      if (mc) mc.addEventListener('change', function () {
        mv.cls = mc.value;
        document.getElementById('majorResults').innerHTML = majorResultsHTML();
      });
      var mq = document.getElementById('mjSearch');
      var mt;
      if (mq) mq.addEventListener('input', function () {
        clearTimeout(mt);
        mt = setTimeout(function () {
          mv.q = mq.value;
          document.getElementById('majorResults').innerHTML = majorResultsHTML();
        }, 160);
      });
    }

    if (r === 'jc') {
      function out(id, html) {
        var el = document.getElementById(id);
        if (!html) { el.hidden = true; el.innerHTML = ''; return; }
        el.hidden = false; el.innerHTML = html;
      }
      function updBmi() {
        var m = document.getElementById('jcSex').value === 'm';
        var h = parseFloat(document.getElementById('jcH').value);
        var w = parseFloat(document.getElementById('jcW').value);
        out('jcBmiOut', (h && w) ? '<div>' + jcBmiText(m, h, w) + '</div>' : '');
      }
      function updVis() {
        var v = parseFloat(document.getElementById('jcV').value);
        var dd = document.getElementById('jcD').value;
        var deg = dd === '' ? null : parseFloat(dd);
        var op = document.getElementById('jcOp').checked;
        out('jcVisOut', (!isNaN(v) && v) ? '<div>' + jcVisText(v, isNaN(deg) ? null : deg, op) + '</div>' : '');
      }
      ['jcH', 'jcW'].forEach(function (id) {
        document.getElementById(id).addEventListener('input', updBmi);
      });
      document.getElementById('jcSex').addEventListener('change', updBmi);
      ['jcV', 'jcD'].forEach(function (id) {
        document.getElementById(id).addEventListener('input', updVis);
      });
      document.getElementById('jcOp').addEventListener('change', updVis);
      var js = document.getElementById('jcSearch');
      var jt;
      if (js) js.addEventListener('input', function () {
        clearTimeout(jt);
        jt = setTimeout(function () {
          jv.q = js.value;
          document.getElementById('jcResults').innerHTML = jcResultsHTML();
        }, 160);
      });
    }

    if (r === 'news' || r === 'news/zc' || r === 'zd') {
      var nq = document.getElementById('newsQ');
      var nTimer;
      if (nq) nq.addEventListener('input', function () {
        nv.q = nq.value;
        clearTimeout(nTimer);
        nTimer = setTimeout(function () {
          var box = document.getElementById('newsList');
          if (box) box.innerHTML = newsListHTML(r === 'zd' ? 'zd' : (r === 'news/zc' ? 'zc' : 'zx'));
        }, 160);
      });
    }

    if (r === 'xk/req') {
      var rqEl = document.getElementById('reqQ');
      var rqTimer;
      if (rqEl) rqEl.addEventListener('input', function () {
        rq.q = rqEl.value;
        clearTimeout(rqTimer);
        rqTimer = setTimeout(function () {
          var box = document.getElementById('reqBody');
          if (box) box.innerHTML = xkReqBodyHTML();
        }, 160);
      });
    }

    if (r === 'zhineng/career') {
      var cqEl = document.getElementById('careerQ');
      var cqTimer;
      if (cqEl) cqEl.addEventListener('input', function () {
        cv.q = cqEl.value;
        clearTimeout(cqTimer);
        cqTimer = setTimeout(function () {
          var box = document.getElementById('careerList');
          if (box) box.innerHTML = careerCards(careerFiltered());
        }, 160);
      });
    }

    if (r === 'zk') {
      var zq = document.getElementById('zkSearch');
      var zt2;
      if (zq) zq.addEventListener('input', function () {
        clearTimeout(zt2);
        zt2 = setTimeout(function () {
          zv.q = zq.value;
          document.getElementById('zkResults').innerHTML = zkResultsHTML();
        }, 160);
      });
      var zc = document.getElementById('zkCls');
      if (zc) zc.addEventListener('change', function () {
        zv.cls = zc.value;
        document.getElementById('zkResults').innerHTML = zkResultsHTML();
      });
      var zp = document.getElementById('zkProv');
      if (zp) zp.addEventListener('change', function () {
        zv.prov = zp.value;
        document.getElementById('zkResults').innerHTML = zkResultsHTML();
      });
    }

    if (r === 'lines') {
      var rcK = document.getElementById('rcKind');
      var rcS = document.getElementById('rcScore');
      var rcOut = document.getElementById('rcScoreOut');
      function rcUpdate() {
        var kind = rcK.value;
        var v = parseInt(rcS.value, 10);
        if (!v || isNaN(v)) { rcOut.hidden = true; return; }
        var rk = rankOf(v, kind);
        var ln = lineOf(kind);
        if (rk == null) { rcOut.hidden = true; return; }
        rcOut.hidden = false;
        rcOut.innerHTML = ICON.target + '<span>' + KIND_NAME[kind] + ' <b>' + v + '</b> 分 → 全省位次约 <b class="num">' + nf(rk) + '</b> 名 · 超过 ' + abovePct(rk, kind).toFixed(1) + '% 考生 · 本科线 ' + ln.ben + ' 分</span>';
      }
      if (rcK) rcK.addEventListener('change', rcUpdate);
      if (rcS) rcS.addEventListener('input', rcUpdate);

      var rrK = document.getElementById('rrKind');
      var rrR = document.getElementById('rrRank');
      var rrOut = document.getElementById('rrRankOut');
      function rrUpdate() {
        var kind = rrK.value;
        var v = parseInt(rrR.value, 10);
        if (!v || isNaN(v)) { rrOut.hidden = true; return; }
        var sc = scoreOfRank(v, kind);
        rrOut.hidden = false;
        rrOut.innerHTML = ICON.target + '<span>' + KIND_NAME[kind] + ' 位次 <b class="num">' + nf(v) + '</b> → 对应分数约 <b>' + sc + '</b> 分</span>';
      }
      if (rrK) rrK.addEventListener('change', rrUpdate);
      if (rrR) rrR.addEventListener('input', rrUpdate);
    }

    if (r === 'list') bindDrag();
  }

  function bindDrag() {
    var list = document.getElementById('vlist');
    if (!list) return;
    var dragIdx = null;
    Array.prototype.forEach.call(list.querySelectorAll('.vitem'), function (el) {
      el.addEventListener('dragstart', function (e) {
        dragIdx = parseInt(el.getAttribute('data-idx'), 10);
        el.classList.add('drag');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragIdx); } catch (err) {}
      });
      el.addEventListener('dragend', function () {
        el.classList.remove('drag');
        Array.prototype.forEach.call(list.querySelectorAll('.vitem'), function (n) { n.classList.remove('over'); });
      });
      el.addEventListener('dragover', function (e) {
        e.preventDefault();
        el.classList.add('over');
      });
      el.addEventListener('dragleave', function () { el.classList.remove('over'); });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        var target = parseInt(el.getAttribute('data-idx'), 10);
        if (dragIdx == null || isNaN(target) || dragIdx === target) return;
        var item = st.list.splice(dragIdx, 1)[0];
        st.list.splice(target, 0, item);
        save();
        render();
      });
    });
  }

  /* ---------------- 事件委托 ---------------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');
    var arg = t.getAttribute('data-arg');

    switch (act) {
      case 'kind': {
        if (st.kind === arg) return;
        var wasArt = isArt();
        st.kind = arg;
        if (arg !== '艺') st.subjects = arg === '物' ? ['化学', '生物'] : ['思想政治', '地理'];
        // 普通类与艺术类分数量纲不同，切换时清空成绩避免误算
        if (wasArt !== (arg === '艺')) { st.score = null; st.rank = null; }
        else if (st.score && arg !== '艺') st.rank = rankOf(st.score, st.kind);
        save(); render();
        break;
      }

      case 'art':
        if (st.art === arg) return;
        st.art = arg;
        st.score = null; st.rank = null;
        save(); render();
        toast('已切换到' + ART_NAME[arg]);
        break;

      case 'year': {
        var y = parseInt(arg, 10);
        if (!y || y === dataYear()) return;
        st.year = y;
        // 同分不同年位次不同，按新一年的分段表重算
        if (st.score) st.rank = rankOf(st.score, st.kind);
        save();
        render();
        toast('已切换到 ' + y + ' 年投档数据');
        break;
      }

      case 'batch': {
        var nb = arg === '艺本' ? '本' : (arg === '艺专' ? '专' : arg);
        if (curBatch() === (arg === '艺本' || arg === '艺专' ? arg : nb)) return;
        st.batch = nb;
        save();
        render();
        toast('已切换到' + batchName() + '数据');
        break;
      }

      case 'subj': {
        var i = st.subjects.indexOf(arg);
        if (i >= 0) {
          if (st.subjects.length === 1) { toast('至少保留 1 门再选科目'); return; }
          st.subjects.splice(i, 1);
        } else {
          if (st.subjects.length >= 2) st.subjects.shift();
          st.subjects.push(arg);
        }
        save(); render();
        break;
      }

      case 'calc':
        if (isArt() ? !st.score : !st.rank) { toast(isArt() ? '请先输入艺考综合分' : '请先输入高考总分或位次'); return; }
        save();
        if (currentRoute() === 'zhineng') {
          refreshResults();
          var box = document.getElementById('znResult');
          if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          location.hash = '#/zhineng';
          setTimeout(function () {
            refreshResults();
            var bx = document.getElementById('znResult');
            if (bx) bx.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 60);
        }
        break;

      case 'recfilter':
        recFilter = arg; recLimit = 20;
        refreshResults();
        break;

      case 'style':
        st.style = arg; save();
        refreshResults();
        break;

      case 'more':
        recLimit += 20;
        refreshResults();
        break;

      case 'add': {
        var gi = parseInt(arg, 10);
        var pos = st.list.indexOf(gi);
        if (pos >= 0) {
          st.list.splice(pos, 1);
          toast('已从志愿表移除');
        } else {
          var cap = listCap();
          if (st.list.length >= cap) {
            if (!isVIP()) { toast('免费版志愿表最多 ' + cap + ' 个，开通 VIP 可填 40 个'); location.hash = '#/vip'; }
            else toast('志愿表已满 40 个');
            return;
          }
          st.list.push(gi);
          toast('已加入志愿表（第 ' + st.list.length + ' 个）');
        }
        save();
        var nc = document.getElementById('navCount');
        nc.hidden = !st.list.length; nc.textContent = st.list.length;
        var r0 = currentRoute();
        if (r0 === 'zhineng' || r0 === 'home') refreshResults();
        else if (r0 === 'schools') {
          var modal = document.querySelector('.modal');
          if (modal && !document.getElementById('modalRoot').hidden) {
            Array.prototype.forEach.call(modal.querySelectorAll('[data-act="add"]'), function (b) {
              var cand = parseInt(b.getAttribute('data-arg'), 10);
              var on = st.list.indexOf(cand) >= 0;
              b.textContent = on ? '已加入' : '加入';
              b.className = 'btn btn-sm ' + (on ? 'btn-soft' : 'btn-ghost');
            });
          }
        } else if (r0 === 'list') {
          render();
        }
        break;
      }

      case 'del':
        st.list.splice(parseInt(arg, 10), 1); save(); render();
        break;

      case 'up': {
        var p1 = parseInt(arg, 10);
        if (p1 > 0) { var a = st.list.splice(p1, 1)[0]; st.list.splice(p1 - 1, 0, a); save(); render(); }
        break;
      }
      case 'down': {
        var p2 = parseInt(arg, 10);
        if (p2 < st.list.length - 1) { var b = st.list.splice(p2, 1)[0]; st.list.splice(p2 + 1, 0, b); save(); render(); }
        break;
      }

      case 'clear':
        if (!st.list.length) return;
        if (confirm('确定清空志愿表里的 ' + st.list.length + ' 个志愿吗？此操作不可撤销。')) {
          st.list = []; save(); render(); toast('已清空志愿表');
        }
        break;

      case 'autofill':
        if (!user) { toast('请先注册或登录后使用智能编排'); openAuth('reg'); return; }
        autofill();
        break;

      case 'export':
        if (!isVIP()) { toast('导出 CSV 为 VIP 功能'); location.hash = '#/vip'; return; }
        exportCSV();
        break;

      case 'print':
        if (!isVIP()) { toast('打印为 VIP 功能'); location.hash = '#/vip'; return; }
        window.print();
        break;

      case 'goto':
        if (arg === 'buy') openCheckout('vip');
        else location.hash = '#/' + arg;
        break;

      case 'openSchool':
        openSchool(parseInt(arg, 10));
        break;

      case 'close':
        closeModal();
        break;

      case 'openAuth':
        openAuth(arg || 'login');
        break;

      case 'authMethod':
        if (authMethod === arg) return;
        authMethod = arg;
        authErr = '';
        renderAuth();
        break;

      case 'wxLogin':
        doWxLogin();
        break;

      case 'sendCode':
        doSendCode(t);
        break;

      case 'authSubmit':
        doAuthSubmit();
        break;

      case 'syncNow':
        doSyncNow();
        break;

      case 'syncPick':
        pickSync(arg);
        break;

      case 'logout':
        doLogout();
        break;
      case 'buy':
        openCheckout(arg);
        break;

      case 'payMethod':
        if (payOrder) { payOrder.method = arg; renderCheckout(); }
        break;

      case 'payDone':
        doPayDone();
        break;

      case 'news':
        openNewsItem(arg);
        break;

      case 'nvtab':
        nv.tag = '全部';
        nv.q = '';
        location.hash = arg === 'zd' ? '#/zd' : (arg === 'zc' ? '#/news/zc' : '#/news');
        break;

      case 'nvtag':
        nv.tag = arg;
        render();
        break;

      case 'xkfirst':
        xv.first = arg;
        render();
        break;

      case 'xkpick':
        if (xv.picks.indexOf(arg) >= 0) xv.picks = xv.picks.filter(function (s) { return s !== arg; });
        else {
          if (xv.picks.length >= 2) xv.picks.shift();
          xv.picks.push(arg);
        }
        render();
        break;

      case 'xkgo': {
        var parts = arg.split('+');
        xv.first = parts[0];
        xv.picks = [parts[1], parts[2]];
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      }

      case 'xkreset':
        xv.first = '';
        xv.picks = [];
        render();
        break;

      case 'hstab':
        hv.tab = arg;
        render();
        break;

      case 'qzans':
        qz.ans[qz.i] = parseInt(arg, 10);
        qz.i++;
        render();
        break;

      case 'qzback':
        if (qz.i > 0) { qz.i--; render(); }
        break;

      case 'qzreset':
        qz.ans = {};
        qz.i = 0;
        render();
        break;

      case 'qzapply': {
        var parts = arg.split('+');
        xv.first = parts[0];
        xv.picks = [parts[1], parts[2]];
        if (currentRoute() === 'xk') render();
        else location.hash = '#/xk';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      }

      case 'rqtype':
        rq.type = arg;
        rq.limit = 120;
        render();
        break;

      case 'rqml':
        rq.ml = arg;
        rq.limit = 120;
        render();
        break;

      case 'rqmore':
        rq.limit += 120;
        render();
        break;

      case 'rqcls':
        rq.q = arg;
        rq.type = '全部';
        rq.ml = '全部';
        rq.limit = 120;
        if (currentRoute() === 'xk/req') render();
        else location.hash = '#/xk/req';
        break;

      case 'cvcat':
        cv.cat = arg;
        render();
        break;

      case 'kvsub':
        kv.sub = arg;
        render();
        break;

      case 'ydkind':
        yd.kind = arg;
        render();
        break;

      case 'ydbatch':
        yd.batch = arg;
        render();
        break;

      case 'report': {
        var rp = REPORTS.filter(function (x) { return x.t === arg; })[0];
        if (rp) showModal(
          '<div class="modal-head"><div class="top"><div><h3>' + esc(rp.t) + '</h3>' +
          '<div class="sub"><span>' + esc(rp.c) + '</span><span>' + esc(rp.d) + '</span><span>' + nf(rp.r) + ' 次阅读</span></div></div>' +
          '<button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
          '<div class="modal-body">' +
            '<div class="mj-sec"><h4>摘要</h4><p>' + esc(rp.s) + '</p></div>' +
            '<div class="mj-sec"><h4>核心要点</h4><ol style="margin:0;padding-left:20px;font-size:13.5px;color:var(--ink-2);line-height:2">' + rp.p.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol></div>' +
            '<div class="mj-sec"><h4>数据核验</h4><p>报告数据与「分数线」「易度排名」同源，可直接到对应栏目核验每一条数字。相关工具：<a href="#/lines" style="color:var(--brand)">分数线</a> · <a href="#/yidu" style="color:var(--brand)">易度排名</a> · <a href="#/zhineng" style="color:var(--brand)">模拟填报</a>。</p></div>' +
            '<div class="tip info">' + ICON.info + '<div>报告基于公开数据整理，仅供参考。</div></div>' +
          '</div>');
        break;
      }

      case 'course': {
        var c = LRN.courses.filter(function (x) { return x.n === arg; })[0];
        if (c) showModal(
          '<div class="modal-head"><div class="top"><div><h3>' + esc(c.n) + '</h3>' +
          '<div class="sub"><span>' + esc(c.s) + ' · ' + esc(c.v) + '</span><span>' + c.c + ' 讲</span><span>约 ' + c.h + ' 小时</span></div></div>' +
          '<button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
          '<div class="modal-body"><div class="mj-sec"><h4>课程介绍</h4><p>' + esc(c.d) + '</p></div>' +
          '<div class="mj-sec"><h4>适合谁</h4><p>' + (c.tag === '同步' ? '对应年级、使用对应版本教材的同学，用于课前预习与课后巩固。' : c.tag === '一轮' ? '进入高三总复习阶段的同学，需要按考点系统回扣、建立解题框架。' : '考前需要专项突破的同学，适合碎片时间集中攻克一个题型。') + '</p></div>' +
          '<div class="mj-sec"><h4>怎么用</h4><p>每讲配套随堂练习：先做练习再听讲解效率更高；每周固定 2-3 讲，进度对齐学校教学节奏。课程内容同步本站「分数线」一分一段数据：分数每提高一档，志愿选择空间随之扩大。</p></div>' +
          '<div style="margin-top:14px"><a class="btn btn-primary" style="width:100%;display:flex;justify-content:center;text-decoration:none" href="' + (c.tag === '同步' ? 'https://basic.smartedu.cn/syncClassroom' : 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(c.n + ' 高中')) + '" target="_blank" rel="noopener">' + (c.tag === '同步' ? '前往国家中小学智慧教育平台观看' : '在哔哩哔哩搜索本课程') + '</a></div>' +
          '<div class="tip info">' + ICON.info + '<div>因版权原因本站不直接播放视频；请点击上方按钮前往官方免费平台或公开视频平台观看。</div></div></div>');
        break;
      }

      case 'lesson': {
        var l = LRN.lessons.filter(function (x) { return x.n === arg; })[0];
        if (l) showModal(
          '<div class="modal-head"><div class="top"><div><h3>' + esc(l.n) + '</h3>' +
          '<div class="sub"><span>讲堂 · ' + l.m + ' 分钟</span><span>' + nf(l.v) + ' 次观看</span></div></div>' +
          '<button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
          '<div class="modal-body"><div class="mj-sec"><h4>本讲看点</h4><p>' + esc(l.d) + '</p></div>' +
          '<div class="mj-sec"><h4>看完做什么</h4><p>带着结论去验证：到「查专业」看相关专业的课程与软科排名，到「找大学」看对应院校专业组在黑龙江的投档分，再回到「模拟填报」放进冲稳保方案。</p></div>' +
          '<div style="margin-top:14px"><a class="btn btn-primary" style="width:100%;display:flex;justify-content:center;text-decoration:none" href="https://search.bilibili.com/all?keyword=' + encodeURIComponent(l.n) + '" target="_blank" rel="noopener">在哔哩哔哩搜索本讲视频</a></div>' +
          '<div class="tip info">' + ICON.info + '<div>因版权原因本站不直接播放视频；点击上方按钮可到公开视频平台检索同类主题视频。</div></div></div>');
        break;
      }

      case 'lvgo': {
        var v = LRN.lives.filter(function (x) { return x.n === arg; })[0];
        if (v) showModal(
          '<div class="modal-head"><div class="top"><div><h3>' + esc(v.n) + '</h3>' +
          '<div class="sub"><span>' + esc(v.u) + '</span><span>' + esc(v.d) + ' ' + esc(v.t) + '</span><span>' + (v.st === 'soon' ? '即将开始' : nf(v.v) + ' 人次观看') + '</span></div></div>' +
          '<button class="modal-close" type="button" data-act="close" aria-label="关闭">' + ICON.close + '</button></div></div>' +
          '<div class="modal-body"><div class="mj-sec"><h4>' + (v.st === 'soon' ? '预约说明' : '回放说明') + '</h4><p>' + (v.st === 'soon'
            ? '直播一般在院校本科招生网、官方视频号或阳光高考平台进行，请以院校招生网公布为准。'
            : '回放一般在院校本科招生网或阳光高考平台"高校咨询活动"栏目可找到。') + '</p></div>' +
          '<div class="mj-sec"><h4>听宣讲前准备</h4><p>先在「找大学」查该校近三年在黑龙江的投档分与位次、招生专业组构成，把问题写下来（转专业政策、实验班选拔、住宿与保研率），宣讲直播的提问环节效率最高。</p></div>' +
          '<div style="margin-top:14px"><a class="btn btn-primary" style="width:100%;display:flex;justify-content:center;text-decoration:none" href="https://search.bilibili.com/all?keyword=' + encodeURIComponent(v.u + ' ' + v.n) + '" target="_blank" rel="noopener">搜索 ' + esc(v.u) + ' 官方宣讲视频</a></div>' +
          '<div class="tip info">' + ICON.info + '<div>因版权原因本站不直播、不转存回放；可在上方视频平台检索，或前往 <a href="https://gaokao.chsi.com.cn" target="_blank" rel="noopener" style="color:var(--brand)">阳光高考平台</a> 查看。</div></div></div>');
        break;
      }

      case 'mjcat':
        mv.cat = arg;
        mv.cls = '全部';
        render();
        break;

      case 'mjtab':
        if (mv.tab === arg) return;
        mv.tab = arg;
        mv.cls = '全部';
        render();
        break;

      case 'mjrow':
        openMajor(arg);
        break;

      case 'rkfull': {
        var box = document.getElementById('rkAll');
        if (box) { box.innerHTML = rkFullHTML(arg); box.hidden = false; }
        var btn = document.querySelector('[data-act="rkfull"][data-arg="' + arg + '"]');
        if (btn) btn.remove();
        break;
      }

      case 'rkmaj': {
        var cd = codeOfMajor(arg);
        if (cd) { openMajor(cd); } else { toast('该专业未收录在教育部目录中'); }
        break;
      }

      case 'rkschool':
      case 'rklist':
        openSchoolRk(arg);
        break;

      case 'jcch':
        jv.ch = arg;
        render();
        break;

      case 'zktab':
        if (zv.tab === arg) return;
        zv.tab = arg;
        zv.q = '';
        zv.cls = '全部';
        zv.cat = '全部';
        zv.ty = '全部';
        render();
        break;

      case 'zkchip':
        if (zv.tab === 'sch') zv.ty = arg; else zv.cat = arg;
        zv.cls = '全部';
        render();
        break;

      case 'zkrow':
        openZkMajor(arg);
        break;

      case 'zksch':
        openZkSchool(arg);
        break;

      case 'zkgoto':
        closeModal();
        view.sf.q = arg;
        view.sf.page = 1;
        location.hash = '#/schools';
        setTimeout(function () { render(); }, 10);
        break;

      case 'headerSearch': {
        var hs = document.getElementById('headerSearch');
        var v = hs ? hs.value.trim() : '';
        if (!v) { toast('请输入搜索关键词'); return; }
        view.sf.q = v; view.sf.page = 1;
        location.hash = '#/schools';
        setTimeout(function () { render(); }, 10);
        break;
      }

      case 'page': {
        var pg = parseInt(arg, 10);
        view.sf.page = Math.max(1, pg);
        document.getElementById('schoolResults').innerHTML = schoolResultsHTML();
        var wrap = document.querySelector('.table-wrap');
        if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }

      case 'sort': {
        var key = arg;
        var cur = view.sf.sort;
        if (cur.indexOf(key) === 0) view.sf.sort = key + (cur.indexOf('desc') > 0 ? '-asc' : '-desc');
        else view.sf.sort = key + '-desc';
        document.getElementById('schoolResults').innerHTML = schoolResultsHTML();
        break;
      }

      case 'resetFilter':
        view.sf = { q: '', batch: '', req: '', ty: '', lv: '', prov: '', min: '', max: '', sort: 'score-desc', page: 1 };
        document.getElementById('app').innerHTML = viewSchools();
        bindView('schools');
        break;

      case 'toc': {
        var sec = document.getElementById(arg);
        if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + window.pageYOffset - 90, behavior: 'smooth' });
        break;
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && e.target && e.target.id === 'headerSearch') {
      var btn = document.querySelector('[data-act="headerSearch"]');
      if (btn) btn.click();
    }
  });

  window.addEventListener('hashchange', render);

  /* ---------------- 导出 ---------------- */
  function exportCSV() {
    var items = listItems();
    if (!items.length) { toast('志愿表为空，无法导出'); return; }
    var lines = [['序号', '批次', '院校名称', '院校专业组', '选考科目要求', '计划类型', dataYear() + (isArt() ? '投档综合分' : '投档分'), isArt() ? '艺术门类' : '对应位次', '院校所在地'].join(',')];
    items.forEach(function (x, i) {
      var g = x.g, s = x.s;
      lines.push([i + 1, BATCH_CN[batchOf(g)] || '本科批', s[0], '第' + g[3] + '组', g[6] || '不限', typesOf(g).join('、') || '普通类', g[4], isArt() ? artName() : g[5], (s[2] || '') + (s[3] && s[3] !== s[2] ? s[3] : '')].join(','));
    });
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '龙高考_志愿表_' + kindShort() + '_' + (st.score || '') + '分.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast('已导出 CSV 文件');
  }

  /* ---------------- 启动 ---------------- */
  function bootCloud() {
    if (!window.GKCloud || !GKCloud.available) return;
    GKCloud.onChange(function () {
      if (currentRoute() === 'vip') renderSyncCard();
    });
    GKCloud.start().then(function (r) {
      if (r && r.error) toast('登录状态恢复失败：' + msgOf(r.error));
      if (r && r.session) {
        var isNew = adoptSession(r.session);
        afterSignIn(isNew, true);
      } else if (user) {
        /* 没有有效云端会话（退出、会话过期或换了浏览器）：清掉本地登录态，志愿表仍在本机 */
        user = null;
        saveUser(true);
        renderUserArea();
      }
    });
  }

  if (!location.hash) location.hash = '#/home';
  render();
  bootCloud();
  if (window.__lgbSplash) window.__lgbSplash.hide();   /* 渲染完成，淡出启动画面 */
})();

