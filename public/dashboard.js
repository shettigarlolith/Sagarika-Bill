/*
 * Dashboard numbers: today's and this month's sales (With GST + No GST bills)
 * and bookings coming up in the next 7 days. Read-only; uses the same API and
 * login as the rest of the app.
 */
(function () {
  const grid = document.querySelector('.welcome-grid');
  if (!grid) {
    return;
  }

  const base = String(window.SAGARIKA_BACKEND_URL || '').trim().replace(/\/+$/, '');
  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  function apiFetch(path) {
    const token = sessionStorage.getItem('sagarika_token') || '';
    return fetch(`${base}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
  }

  function dayKey(value) {
    const raw = String(value || '').trim();
    let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? '' : localKey(d);
  }

  function localKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function shortDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function escapeText(value) {
    return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const strip = document.createElement('section');
  strip.className = 'dash-stats';
  strip.setAttribute('aria-label', 'Summary');
  strip.innerHTML = ['today', 'month', 'bills', 'upcoming']
    .map((key) => `<article class="dash-stat dash-stat-${key} is-loading"><p class="dash-stat-label"></p><p class="dash-stat-value">—</p><p class="dash-stat-note"></p></article>`)
    .join('');
  grid.before(strip);

  function fill(key, label, value, note) {
    const card = strip.querySelector(`.dash-stat-${key}`);
    card.classList.remove('is-loading');
    card.querySelector('.dash-stat-label').textContent = label;
    card.querySelector('.dash-stat-value').textContent = value;
    card.querySelector('.dash-stat-note').innerHTML = note;
  }

  const labels = { today: "Today's sales", month: 'This month', bills: 'Bills this month', upcoming: 'Next 7 days' };
  Object.entries(labels).forEach(([key, label]) => {
    strip.querySelector(`.dash-stat-${key} .dash-stat-label`).textContent = label;
  });

  const now = new Date();
  const todayKey = localKey(now);
  const monthPrefix = todayKey.slice(0, 7);
  const weekEnd = localKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));

  Promise.allSettled([
    apiFetch('/api/bills?billMode=with-gst'),
    apiFetch('/api/bills?billMode=no-gst'),
    apiFetch('/api/book-events')
  ]).then(([withGst, noGst, bookings]) => {
    const bills = [
      ...(withGst.status === 'fulfilled' && Array.isArray(withGst.value) ? withGst.value : []),
      ...(noGst.status === 'fulfilled' && Array.isArray(noGst.value) ? noGst.value : [])
    ];
    const billsOk = withGst.status === 'fulfilled' || noGst.status === 'fulfilled';

    if (billsOk) {
      let todayTotal = 0;
      let todayCount = 0;
      let monthTotal = 0;
      let monthCount = 0;
      bills.forEach((bill) => {
        const key = dayKey(bill.billDate || bill.createdAt);
        const amount = Number(bill.amountPayable || 0) || 0;
        if (key === todayKey) {
          todayTotal += amount;
          todayCount += 1;
        }
        if (key.startsWith(monthPrefix)) {
          monthTotal += amount;
          monthCount += 1;
        }
      });
      fill('today', labels.today, money.format(todayTotal), `${todayCount} bill${todayCount === 1 ? '' : 's'} today`);
      fill('month', labels.month, money.format(monthTotal), now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
      fill('bills', labels.bills, String(monthCount), 'With GST and No GST');
    } else {
      ['today', 'month', 'bills'].forEach((key) => fill(key, labels[key], '—', 'Could not load bills'));
    }

    if (bookings.status === 'fulfilled' && Array.isArray(bookings.value)) {
      const upcoming = bookings.value
        .map((b) => ({ ...b, key: dayKey(b.eventDay) }))
        .filter((b) => b.key && b.key >= todayKey && b.key <= weekEnd)
        .sort((a, b) => a.key.localeCompare(b.key));
      const next = upcoming[0];
      fill(
        'upcoming',
        labels.upcoming,
        `${upcoming.length} booking${upcoming.length === 1 ? '' : 's'}`,
        next ? `Next: <strong>${escapeText(next.name || next.event || next.bookingId)}</strong> · ${shortDate(next.key)}` : 'Nothing booked this week'
      );
    } else {
      fill('upcoming', labels.upcoming, '—', 'Could not load bookings');
    }
  });
})();
