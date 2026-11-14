/*
 * Sagarika Bill — app shell
 * Adds one navigation for the whole app (top bar on desktop and tablet,
 * tab bar on phones) and the two-column Bill Desk layout. It only moves or
 * adds elements around each page; the page's own scripts keep working as before.
 */
(function () {
  const PAGES = [
    { key: 'dashboard', href: 'welcome.html', label: 'Dashboard', icon: 'M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
    { key: 'bill', href: 'index.html', label: 'Bill Desk', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3' },
    { key: 'booking', href: 'book-event.html', label: 'Book Event', icon: 'M4 5h16v15H4zM4 10h16M8 3v4M16 3v4' },
    { key: 'report', href: 'report.html', label: 'Report', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { key: 'items', href: 'items.html', label: 'Item List', icon: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01' }
  ];

  const page = (location.pathname.split('/').pop() || 'welcome.html').toLowerCase();
  const CURRENT = {
    'welcome.html': 'dashboard',
    'index.html': 'bill',
    'with-gst.html': 'bill',
    'no-gst.html': 'bill',
    'book-event.html': 'booking',
    'report.html': 'report',
    'items.html': 'items'
  }[page];

  function icon(path, size = 20) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  }

  function escapeText(value) {
    return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const MOON = 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z';
  const SUN = 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z';
  const POWER = 'M12 3v9M6.2 6.7a8 8 0 1 0 11.6 0';

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function buildShell() {
    if (!CURRENT || document.querySelector('.app-nav')) {
      return;
    }

    const user = sessionStorage.getItem('sagarika_user') || '';
    const branch = (sessionStorage.getItem('sagarika_bill_to') || '').toUpperCase();

    const links = PAGES.map(
      (p) =>
        `<a class="app-nav-link${p.key === CURRENT ? ' is-current' : ''}" href="${p.href}"${p.key === CURRENT ? ' aria-current="page"' : ''}>${icon(p.icon, 18)}<span>${p.label}</span></a>`
    ).join('');

    const header = document.createElement('header');
    header.className = 'app-nav';
    header.innerHTML = `
      <div class="app-nav-inner">
        <a class="app-brand" href="welcome.html" aria-label="Sagarika dashboard">
          <img src="assets/sagarika-logo.svg" alt="" width="34" height="34" />
          <span class="app-brand-text">SAGARIKA${branch ? `<small>${escapeText(branch)}</small>` : ''}</span>
        </a>
        <nav class="app-nav-links" aria-label="Main">${links}</nav>
        <div class="app-nav-actions">
          ${user ? `<span class="app-user" title="Signed in as ${escapeText(user)}">${escapeText(user.charAt(0).toUpperCase())}</span>` : ''}
          <button type="button" class="app-icon-btn app-theme-btn" aria-label="Night mode" title="Night mode"></button>
          <button type="button" class="app-icon-btn app-logout-btn" aria-label="Logout" title="Logout">${icon(POWER, 18)}</button>
        </div>
      </div>`;

    const tabbar = document.createElement('nav');
    tabbar.className = 'app-tabbar';
    tabbar.setAttribute('aria-label', 'Main');
    tabbar.innerHTML = PAGES.map(
      (p) =>
        `<a class="app-tab${p.key === CURRENT ? ' is-current' : ''}" href="${p.href}"${p.key === CURRENT ? ' aria-current="page"' : ''}>${icon(p.icon, 22)}<span>${p.label}</span></a>`
    ).join('');

    document.body.prepend(header);
    document.body.append(tabbar);
    document.body.classList.add('has-app-shell');

    // Night mode: drive the page's own switch so its saved setting stays in charge.
    const themeBtn = header.querySelector('.app-theme-btn');
    const syncThemeIcon = () => {
      themeBtn.innerHTML = icon(isDark() ? SUN : MOON, 18);
      themeBtn.setAttribute('aria-pressed', String(isDark()));
    };
    themeBtn.addEventListener('click', () => {
      const pageToggle = document.getElementById('themeToggle');
      if (pageToggle) {
        pageToggle.click();
      } else {
        document.documentElement.setAttribute('data-theme', isDark() ? 'light' : 'dark');
      }
      syncThemeIcon();
    });
    new MutationObserver(syncThemeIcon).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    syncThemeIcon();

    header.querySelector('.app-logout-btn').addEventListener('click', () => {
      if (typeof window.logoutUser === 'function') {
        window.logoutUser();
      } else {
        location.href = 'login.html';
      }
    });
  }

  // Bill Desk: form on the left, a summary with totals and Save/Print on the right.
  function buildBillSummary() {
    const form = document.getElementById('billForm');
    const totals = form && form.querySelector('.totals-grid');
    const actions = form && form.querySelector('.submit-wrap');
    if (!form || !totals || !actions || form.querySelector('.bill-summary')) {
      return;
    }

    // Keep "Subject" and "+ Add Item" together under the items.
    const subjectRow = form.querySelector('.subject-action-row');
    const addRow = form.querySelector('.actions-row');
    if (subjectRow && addRow) {
      const toolbar = document.createElement('div');
      toolbar.className = 'bill-items-toolbar';
      subjectRow.before(toolbar);
      toolbar.append(subjectRow, addRow);
    }

    const aside = document.createElement('aside');
    aside.className = 'bill-summary';
    aside.setAttribute('aria-label', 'Bill summary');
    aside.innerHTML = `
      <div class="bill-summary-head">
        <h2>Bill summary</h2>
        <span class="bill-summary-count">0 items</span>
      </div>`;
    aside.append(totals, actions);
    form.append(aside);
    form.classList.add('has-bill-summary');

    const body = document.getElementById('itemsBody');
    const count = aside.querySelector('.bill-summary-count');
    const updateCount = () => {
      if (!body) return;
      const rows = [...body.querySelectorAll('tr:not(.subject-row)')].filter((row) => {
        const item = row.querySelector('.item');
        return item && item.value.trim();
      }).length;
      count.textContent = `${rows} item${rows === 1 ? '' : 's'}`;
    };
    if (body) {
      new MutationObserver(updateCount).observe(body, { childList: true, subtree: true });
      body.addEventListener('input', updateCount);
      body.addEventListener('change', updateCount);
    }
    updateCount();
  }

  function start() {
    buildShell();
    buildBillSummary();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
