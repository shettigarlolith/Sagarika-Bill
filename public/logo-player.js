(function () {
  const SELECTOR = '[data-logo-lottie]';
  const ANIMATION_PATH = 'assets/logodata.json';

  function mountFallback(node, src) {
    if (!src || node.querySelector('img, svg')) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    node.appendChild(img);
  }

  function initLogo(node) {
    const fallbackSrc = node.getAttribute('data-fallback-src');
    if (!window.lottie || typeof window.lottie.loadAnimation !== 'function') {
      mountFallback(node, fallbackSrc);
      return;
    }

    if (node.dataset.logoLottieReady === 'true') return;
    node.dataset.logoLottieReady = 'true';

    const animation = window.lottie.loadAnimation({
      container: node,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: ANIMATION_PATH,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet'
      }
    });

    animation.addEventListener('data_failed', function () {
      mountFallback(node, fallbackSrc);
    });
  }

  function boot() {
    document.querySelectorAll(SELECTOR).forEach(initLogo);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
