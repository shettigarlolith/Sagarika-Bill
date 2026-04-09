// For GitHub Pages, set this to your deployed backend origin, e.g.
// window.SAGARIKA_BACKEND_URL = 'https://your-backend.onrender.com';
// Automatically use local API on localhost and deployed API elsewhere.
(function () {
  const host = String(window.location.hostname || '').trim().toLowerCase();
  const isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local');

  window.SAGARIKA_BACKEND_URL = isLocalHost ? '' : 'https://sagarikabill.vercel.app';
})();
