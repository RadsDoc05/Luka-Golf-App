const CACHE_NAME = 'luka-golf-v1';
const PRECACHE_ASSETS = [
  './index.html',
  './styles.css',
  './manifest.json',
  './core/AudioEngine.js',
  './core/GameState.js',
  './core/Storage.js',
  './game/Animations.js',
  './game/Courses.js',
  './game/MathEngine.js',
  './game/Renderer.js',
  '../assets/images/ui/icon-192.png',
  '../assets/images/ui/icon-512.png',
  '../assets/images/ui/trophy_cup.svg',
  '../assets/images/ui/golf_ball.svg',
  '../assets/images/ui/flag_pin.svg',
  '../assets/images/ui/star_gold.svg',
  '../assets/images/ui/star_silver.svg',
  '../assets/images/ui/star_bronze.svg',
  '../assets/images/characters/golfer_idle.svg',
  '../assets/images/characters/golfer_backswing.svg',
  '../assets/images/characters/golfer_impact.svg',
  '../assets/images/characters/golfer_celebrate.svg',
  '../assets/images/characters/golfer_mishap.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('PWA Pre-cache partial notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
