/* 龙高考 Service Worker
   策略：
   - 页面导航：网络优先，离线回退缓存（保证内容始终最新，断网也能开）
   - 静态资源：缓存优先
   - 跨域请求（CDN SDK 等）：不接管，交给浏览器
   发布新版本时只需改 VERSION。
*/
var VERSION = 'lgk-2026-11-13-a';
var CORE = [
  '/',
  '/index.html',
  '/gk-data.js',
  '/majors.js',
  '/majors-catalog.js',
  '/jiancha.js',
  '/ruanke.js',
  '/zk.js',
  '/news.js',
  '/sub.js',
  '/learn.js',
  '/cloud.js',
  '/app.js',
  '/download.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (cache) {
      // 逐个添加，任一失败不影响整体安装
      return Promise.all(CORE.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // 外部 CDN 不接管

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('/index.html') || caches.match('/');
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      });
    })
  );
});
