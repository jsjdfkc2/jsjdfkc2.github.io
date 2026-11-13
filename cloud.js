/* cloud.js */
/* ==========================================================================
   龙高考 · 云服务接入层
   账号：手机验证码 / 微信授权（WorkBuddy 云服务 Auth，真实账号与真实会话）
   数据：profiles（成绩档案与会员快照）、wishlists（志愿表），按用户隔离
   说明：publicConfig 由云服务开通时下发，供前端初始化使用；密钥类的值不入库、不入日志。
   ========================================================================== */
(function () {
  'use strict';

  var CONF = {
    endpoint: 'https://hlj-gaokao-volunteer-42240.app.workbuddy.host',
    oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/genie-baas/oauth',
    publishableKey: 'wbpk_rCYYM4DezlBUBnq4b9NI8M_C9jjg3657AYMse2Jlz78371PiZc5jrKu'
  };

  var cloud = null;
  var available = false;
  var session = null;
  var listeners = [];
  var sync = { on: false, busy: false, at: 0, err: '', hold: true };
  var pend = { profile: null, wishlist: null };
  var timer = null;

  try {
    var factory = window.WorkBuddyCloud && window.WorkBuddyCloud.createWorkBuddyCloud;
    if (typeof factory === 'function') {
      cloud = factory({
        endpoint: CONF.endpoint,
        oauthRelayBaseUrl: CONF.oauthRelayBaseUrl,
        publishableKey: CONF.publishableKey
      });
      available = !!cloud;
    }
  } catch (e) {
    available = false;
  }

  function notify() {
    listeners.forEach(function (fn) {
      try { fn(sync, session); } catch (e) {}
    });
  }

  function setSession(s) {
    session = s || null;
    sync.on = !!session;
    notify();
  }

  function errOf(msg, extra) {
    var e = extra || {};
    e.message = msg || (e && e.message) || '操作失败';
    return e;
  }

  /* ---------------- 启动与回调 ---------------- */

  function restore() {
    return cloud.auth.getSession().then(function (r) {
      if (r && r.error) return { session: null, error: r.error };
      setSession(r && r.data);
      return { session: r && r.data, error: null };
    }, function (e) {
      return { session: null, error: errOf('读取登录状态失败', e) };
    });
  }

  function start() {
    if (!available) return Promise.resolve({ session: null, error: null, unavailable: true });
    var url;
    try { url = new URL(location.href); } catch (e) { return restore(); }
    var hasCb = url.searchParams.has('code') || url.searchParams.has('error');
    if (!hasCb) return restore();

    var provider = url.searchParams.get('provider');
    if (provider !== 'wechat' && provider !== 'workbuddy') {
      return Promise.resolve({ session: null, error: errOf('授权回调缺少有效的登录方式，请重新登录。') });
    }
    var handler = provider === 'wechat' ? cloud.auth.handleWechatWebCallback : cloud.auth.handleWorkBuddyCallback;
    if (typeof handler !== 'function') {
      return Promise.resolve({ session: null, error: errOf('当前 SDK 版本不支持该登录方式。') });
    }
    return Promise.resolve(handler.call(cloud.auth)).then(function (r) {
      if (r && r.error) return { session: null, error: r.error };
      if (r && r.data) {
        ['code', 'state', 'provider'].forEach(function (k) { url.searchParams.delete(k); });
        try { history.replaceState(null, '', url.pathname + url.search + url.hash); } catch (e) {}
        setSession(r.data);
        return { session: r.data, error: null, fromCallback: true };
      }
      return restore();
    }, function (e) {
      return { session: null, error: errOf('登录回调处理失败', e) };
    });
  }

  /* ---------------- 登录 ---------------- */

  function sendCode(phone) {
    if (!available) return Promise.resolve({ error: errOf('云服务未启用，暂时无法发送验证码') });
    return cloud.auth.sendOtp({ phone: phone }).then(function (r) {
      if (r && r.error) return { error: r.error };
      return { data: r && r.data };
    }, function (e) { return { error: errOf('验证码发送失败，请稍后重试', e) }; });
  }

  function verifyCode(pending, code) {
    if (!available) return Promise.resolve({ error: errOf('云服务未启用') });
    return cloud.auth.verifyOtp({
      phone: pending.phone,
      verificationId: pending.verificationId,
      isExistingUser: pending.isExistingUser,
      token: code
    }).then(function (r) {
      if (r && r.error) return { error: r.error };
      return restore().then(function (rr) { return { session: rr.session, error: rr.error }; });
    }, function (e) { return { error: errOf('登录失败，请重试', e) }; });
  }

  function wechatLogin() {
    if (!available) return Promise.resolve({ error: errOf('云服务未启用') });
    var back;
    try {
      back = new URL(location.href);
      back.pathname = '/';
      back.search = '';
      back.hash = '';
    } catch (e) { back = { toString: function () { return location.origin + '/'; } }; }
    return cloud.auth.signInWithOAuth({
      provider: 'wechat',
      redirectTo: back.toString()
    }).then(function (r) {
      if (r && r.error) return { error: r.error };
      var u = r && r.data && r.data.url;
      if (!u) return { error: errOf('未能获取微信授权地址，请稍后重试') };
      location.assign(u);
      return {};
    }, function (e) { return { error: errOf('微信登录发起失败', e) }; });
  }

  function signOut() {
    if (!available) { setSession(null); return Promise.resolve({}); }
    return cloud.auth.signOut().then(function () {
      setSession(null);
      return {};
    }, function () {
      setSession(null);
      return {};
    });
  }

  /* ---------------- 数据读写 ---------------- */

  function pull() {
    if (!available || !session) return Promise.resolve({ error: errOf('未登录') });
    return Promise.all([
      cloud.database.from('profiles').select('*').maybeSingle(),
      cloud.database.from('wishlists').select('*').maybeSingle()
    ]).then(function (rs) {
      var e1 = rs[0] && rs[0].error, e2 = rs[1] && rs[1].error;
      if (e1 || e2) return { error: e1 || e2 };
      return { profile: (rs[0] && rs[0].data) || null, wishlist: (rs[1] && rs[1].data) || null };
    }, function (e) {
      return { error: errOf('读取云端数据失败', e) };
    });
  }

  function writeProfile(row) {
    return cloud.database.from('profiles').upsert(row, { onConflict: 'owner_id' }).select()
      .then(function (r) { return { error: r && r.error }; }, function (e) { return { error: e }; });
  }

  function writeWishlist(row) {
    return cloud.database.from('wishlists').upsert(row, { onConflict: 'owner_id' }).select()
      .then(function (r) { return { error: r && r.error }; }, function (e) { return { error: e }; });
  }

  function flush() {
    timer = null;
    if (!available || !session) return Promise.resolve({ skipped: true });
    var jobs = [];
    if (pend.profile) { var p = pend.profile; pend.profile = null; jobs.push(writeProfile(p)); }
    if (pend.wishlist) { var w = pend.wishlist; pend.wishlist = null; jobs.push(writeWishlist(w)); }
    if (!jobs.length) return Promise.resolve({});
    sync.busy = true;
    notify();
    return Promise.all(jobs).then(function (rs) {
      var err = null;
      rs.forEach(function (r) { if (r && r.error && !err) err = r.error; });
      sync.busy = false;
      if (err) {
        sync.err = err.message || '同步失败';
      } else {
        sync.err = '';
        sync.at = Date.now();
      }
      notify();
      return { error: err };
    });
  }

  function queue(kind, payload) {
    if (!available || !session || sync.hold) return;
    pend[kind] = payload;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 900);
  }

  function flushNow() {
    if (timer) clearTimeout(timer);
    return flush();
  }

  function hold(v) {
    sync.hold = !!v;
    if (!sync.hold) notify();
  }

  window.GKCloud = {
    available: available,
    start: start,
    restore: restore,
    sendCode: sendCode,
    verifyCode: verifyCode,
    wechatLogin: wechatLogin,
    signOut: signOut,
    pull: pull,
    flush: flushNow,
    hold: hold,
    queueProfile: function (row) { queue('profile', row); },
    queueWishlist: function (items) { queue('wishlist', { items: items, cnt: items.length }); },
    session: function () { return session; },
    sync: function () { return sync; },
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };

  window.addEventListener('pagehide', function () { if (timer) flushNow(); });
})();

