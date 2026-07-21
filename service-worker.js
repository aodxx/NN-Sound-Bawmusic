/**
 * BAWMUSIC — Service Worker
 * Offline support + caching for app shell
 */

// เพิ่มเลขเวอร์ชันทุกครั้งที่มีการปล่อยไฟล์หน้าเว็บชุดใหม่
// เพื่อบังคับให้ Service Worker ดาวน์โหลด App Shell ล่าสุดและลบแคชเก่า
const CACHE_NAME = 'bawmusic-v2.6.1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/api.js?v=2.6.1',
  './js/utils.js',
  './js/app.js',
  './js/views/dashboard.js',
  './js/views/bookings.js',
  './js/views/customers.js',
  './js/views/equipment.js',
  './js/views/analytics.js',
  './js/views/history.js?v=2.5.0',
  './js/views/settings.js',
  './js/views/bookingForm.js',
  './js/views/jobSummary.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls to Apps Script — always fetch fresh data
  if (url.href.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ success: false, error: 'ออฟไลน์: ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // หน้า HTML ต้องตรวจเซิร์ฟเวอร์ก่อนเสมอ เพื่อไม่ให้ URL ปกติค้างหน้าเก่า
  // หากออฟไลน์จึงค่อยใช้ index.html ที่เก็บไว้ในแคช
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
              cache.put('./index.html', response.clone());
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // ไฟล์ CSS/JS/รูปภาพใช้แคชเพื่อเปิดออฟไลน์ และถูกแทนที่อัตโนมัติ
  // เมื่อ CACHE_NAME เปลี่ยนในรุ่นถัดไป
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
