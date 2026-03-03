(function () {
  const AUTH_KEY = 'sagarika_auth';
  const TOKEN_KEY = 'sagarika_token';
  const LAST_ACTIVITY_KEY = 'sagarika_last_activity_at';
  const LOGOUT_SYNC_KEY = 'sagarika_logout_at';
  const TIMEOUT_MS = 5 * 60 * 1000;
  const CHECK_INTERVAL_MS = 15000;
  const PULL_REFRESH_THRESHOLD = 96;
  const CONNECTION_MESSAGE = 'Connection lost. Please check internet and refresh.';

  const currentToken = String(sessionStorage.getItem(TOKEN_KEY) || '').trim();

  if (sessionStorage.getItem(AUTH_KEY) !== 'ok' || !currentToken) {
    return;
  }

  let hasLoggedOut = false;
  let lastActivityAt = readTimestampFromStorage(readStorage(LAST_ACTIVITY_KEY));
  let pullStartY = 0;
  let canPullRefresh = false;
  let pullRefreshArmed = false;

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return '';
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function parseSyncPayload(rawValue) {
    const raw = String(rawValue || '').trim();
    if (!raw) {
      return { at: 0, token: '' };
    }

    try {
      const parsed = JSON.parse(raw);
      const at = Number(parsed?.at || 0);
      const token = String(parsed?.token || '').trim();
      if (at > 0) {
        return { at, token };
      }
    } catch {
      // Fall back to the legacy numeric-only format.
    }

    const at = Number(raw || 0);
    if (at > 0) {
      return { at, token: '' };
    }
    return { at: 0, token: '' };
  }

  function readTimestampFromStorage(rawValue) {
    const payload = parseSyncPayload(rawValue);
    if (payload.token && payload.token !== currentToken) {
      return 0;
    }
    return payload.at;
  }

  function writeTokenScopedStorage(key, at) {
    return writeStorage(
      key,
      JSON.stringify({
        at,
        token: currentToken
      })
    );
  }

  function clearAuthSession() {
    sessionStorage.removeItem('sagarika_auth');
    sessionStorage.removeItem('sagarika_token');
    sessionStorage.removeItem('sagarika_user');
    sessionStorage.removeItem('sagarika_role');
    sessionStorage.removeItem('sagarika_bill_to');
  }

  function getCurrentPage() {
    return location.pathname.split('/').pop() || 'welcome.html';
  }

  function redirectToLogin() {
    const page = getCurrentPage();
    location.replace(`login.html?next=${encodeURIComponent(page)}`);
  }

  function ensureConnectionLostModal() {
    let modal = document.getElementById('connectionLostModal');
    if (modal) {
      return modal;
    }

    const style = document.createElement('style');
    style.textContent = `
      .connection-lost-modal {
        position: fixed;
        inset: 0;
        z-index: 2500;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(4, 14, 28, 0.68);
      }

      .connection-lost-modal.is-open {
        display: flex;
      }

      .connection-lost-dialog {
        width: min(420px, 100%);
        padding: 18px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: #ffffff;
        color: #17212b;
        box-shadow: 0 16px 44px rgba(0, 0, 0, 0.28);
      }

      .connection-lost-dialog h3 {
        margin: 0 0 8px;
        font-size: 20px;
      }

      .connection-lost-dialog p {
        margin: 0;
        line-height: 1.45;
      }

      .connection-lost-actions {
        margin-top: 14px;
        display: flex;
        justify-content: flex-end;
      }

      .connection-lost-actions button {
        min-height: 44px;
        padding: 10px 16px;
        border: none;
        border-radius: 10px;
        background: #2f8f4e;
        color: #ffffff;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);

    modal = document.createElement('div');
    modal.id = 'connectionLostModal';
    modal.className = 'connection-lost-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="connection-lost-dialog" role="dialog" aria-modal="true" aria-labelledby="connectionLostTitle">
        <h3 id="connectionLostTitle">Connection Lost</h3>
        <p id="connectionLostMessage">${CONNECTION_MESSAGE}</p>
        <div class="connection-lost-actions">
          <button id="connectionLostRefreshBtn" type="button">Refresh</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const refreshBtn = modal.querySelector('#connectionLostRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        location.reload();
      });
    }

    return modal;
  }

  function showConnectionLostPopup(message = CONNECTION_MESSAGE) {
    const modal = ensureConnectionLostModal();
    const messageNode = modal.querySelector('#connectionLostMessage');
    if (messageNode) {
      messageNode.textContent = message;
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function isConnectionIssue(error) {
    const text = String(error && error.message ? error.message : error || '').trim();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return true;
    }
    return /failed to fetch|networkerror|network request failed|load failed|cannot reach|failed to connect|connection lost/i.test(
      text
    );
  }

  function handleConnectionProblem(error) {
    if (!isConnectionIssue(error)) {
      return false;
    }
    showConnectionLostPopup();
    return true;
  }

  function logoutForInactivity(syncAcrossTabs = true) {
    if (hasLoggedOut) {
      return;
    }

    hasLoggedOut = true;
    clearAuthSession();
    removeStorage(LAST_ACTIVITY_KEY);

    if (syncAcrossTabs) {
      writeTokenScopedStorage(LOGOUT_SYNC_KEY, Date.now());
    }

    redirectToLogin();
  }

  function getElapsedInactivity() {
    return Date.now() - lastActivityAt;
  }

  function ensureActivitySeed() {
    if (lastActivityAt > 0) {
      return;
    }

    lastActivityAt = Date.now();
    writeTokenScopedStorage(LAST_ACTIVITY_KEY, lastActivityAt);
  }

  function recordActivity() {
    lastActivityAt = Date.now();
    writeTokenScopedStorage(LAST_ACTIVITY_KEY, lastActivityAt);
  }

  function handleActivity() {
    if (getElapsedInactivity() >= TIMEOUT_MS) {
      logoutForInactivity();
      return;
    }

    recordActivity();
  }

  function checkForTimeout() {
    if (getElapsedInactivity() >= TIMEOUT_MS) {
      logoutForInactivity();
    }
  }

  function handleResume() {
    if (getElapsedInactivity() >= TIMEOUT_MS) {
      logoutForInactivity();
      return;
    }

    recordActivity();
  }

  function onTouchStart(event) {
    if (!event.touches || event.touches.length !== 1) {
      canPullRefresh = false;
      pullRefreshArmed = false;
      return;
    }

    const scrollTop = Number((document.scrollingElement || document.documentElement || document.body).scrollTop || 0);
    canPullRefresh = scrollTop <= 0;
    pullRefreshArmed = false;
    pullStartY = event.touches[0].clientY;
  }

  function onTouchMove(event) {
    if (!canPullRefresh || !event.touches || event.touches.length !== 1) {
      return;
    }

    const deltaY = event.touches[0].clientY - pullStartY;
    if (deltaY <= 0) {
      canPullRefresh = false;
      pullRefreshArmed = false;
      return;
    }

    if (deltaY >= PULL_REFRESH_THRESHOLD) {
      pullRefreshArmed = true;
    }
  }

  function onTouchEnd() {
    if (canPullRefresh && pullRefreshArmed) {
      location.reload();
    }
    canPullRefresh = false;
    pullRefreshArmed = false;
  }

  window.showConnectionLostPopup = showConnectionLostPopup;
  window.handleConnectionProblem = handleConnectionProblem;
  window.isConnectionIssue = isConnectionIssue;

  ensureActivitySeed();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureConnectionLostModal, { once: true });
  } else {
    ensureConnectionLostModal();
  }

  ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach((eventName) => {
    window.addEventListener(eventName, handleActivity, { passive: true });
  });

  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });

  window.addEventListener('focus', handleResume);
  window.addEventListener('offline', () => {
    showConnectionLostPopup();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleResume();
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key === LAST_ACTIVITY_KEY) {
      const nextActivityAt = readTimestampFromStorage(event.newValue);
      if (nextActivityAt > 0) {
        lastActivityAt = nextActivityAt;
      }
      return;
    }

    if (event.key === LOGOUT_SYNC_KEY && event.newValue) {
      const payload = parseSyncPayload(event.newValue);
      if (!payload.token || payload.token === currentToken) {
        logoutForInactivity(false);
      }
    }
  });

  window.setInterval(checkForTimeout, CHECK_INTERVAL_MS);
})();
