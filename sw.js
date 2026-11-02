// 離線快取：網站本身的檔案先從快取拿、背景更新；雲端資料（Supabase）一律走網路。
const VERSION = "baiyue-v3";
const SHELL = ["./", "index.html", "style.css", "app.js", "data.js", "config.js",
  "vendor/supabase-2.117.3.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;           // Supabase 等外部請求不快取
  // 網頁本體和設定檔先試網路，拿不到才用快取（改了 config.js 會馬上生效）
  if (sameOrigin && (req.mode === "navigate" || url.pathname.endsWith("config.js"))) {
    e.respondWith(caches.open(VERSION).then(cache => fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => cache.match(req, { ignoreSearch: true }).then(r => r || cache.match("index.html")))));
    return;
  }
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: sameOrigin });
    const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
