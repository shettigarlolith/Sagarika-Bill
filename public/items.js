const itemsEditorBody = document.getElementById('itemsEditorBody');
const addItemRowBtn = document.getElementById('addItemRowBtn');
const saveItemListBtn = document.getElementById('saveItemListBtn');
const itemStatus = document.getElementById('itemStatus');
const themeToggleInput = document.getElementById('themeToggle');
const BACKEND_BASE_URL = String(window.SAGARIKA_BACKEND_URL || '').trim().replace(/\/+$/, '');
const THEME_STORAGE_KEY = 'sagarika_theme_v1';
let isSavingItems = false;
let isItemListDirty = false;
let itemsNavigationOverlay = null;

function apiUrl(resource) {
  const path = `/api/${encodeURIComponent(resource)}`;
  if (!BACKEND_BASE_URL) {
    return path;
  }
  return `${BACKEND_BASE_URL}${path}`;
}

function getAuthToken() {
  return String(sessionStorage.getItem('sagarika_token') || '').trim();
}

function authFetch(url, options = {}) {
  const nextOptions = { ...options };
  const headers = { ...(nextOptions.headers || {}) };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  nextOptions.headers = headers;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (window.showConnectionLostPopup) {
      window.showConnectionLostPopup();
    }
    return Promise.reject(new Error('Connection lost. Please refresh.'));
  }
  return fetch(url, nextOptions).catch((error) => {
    if (window.handleConnectionProblem && window.handleConnectionProblem(error)) {
      throw new Error('Connection lost. Please refresh.');
    }
    throw error;
  });
}

function applyTheme(theme) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', normalized);
  if (themeToggleInput) {
    themeToggleInput.checked = normalized === 'dark';
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage failures.
  }
}

async function parseJsonResponse(response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    const preview = raw.slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new Error(
      `API did not return JSON. Check Apps Script deploy access ("Anyone") and URL. Response preview: ${preview}`
    );
  }
}

function createRow(entry = { item: '', price: '' }) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="item-name" value="${entry.item || ''}" placeholder="Item name" /></td>
    <td><input type="number" class="item-price" value="${entry.price ?? ''}" min="0" step="0.01" placeholder="0.00" /></td>
    <td><button type="button" class="btn btn-danger remove-item">X</button></td>
  `;

  tr.querySelector('.remove-item').addEventListener('click', () => {
    tr.remove();
    isItemListDirty = true;
  });
  tr.querySelector('.item-name').addEventListener('input', () => {
    isItemListDirty = true;
  });
  tr.querySelector('.item-price').addEventListener('input', () => {
    isItemListDirty = true;
  });
  return tr;
}

async function loadItems() {
  itemStatus.textContent = 'Loading...';
  itemStatus.style.color = '#355062';

  try {
    const res = await authFetch(apiUrl('items'));
    const data = await parseJsonResponse(res);

    if (!res.ok || !Array.isArray(data)) {
      const details = data && typeof data === 'object' ? (data.details || data.error || '') : '';
      throw new Error(details ? `Failed to load item list: ${details}` : 'Failed to load item list.');
    }

    itemsEditorBody.innerHTML = '';
    if (data.length === 0) {
      itemsEditorBody.appendChild(createRow());
    } else {
      data.forEach((entry) => itemsEditorBody.appendChild(createRow(entry)));
    }

    isItemListDirty = false;
    itemStatus.textContent = '';
  } catch (error) {
    itemStatus.textContent = error.message;
    itemStatus.style.color = '#b42a2a';
  }
}

function collectItems() {
  return [...itemsEditorBody.querySelectorAll('tr')].map((row) => ({
    item: row.querySelector('.item-name').value.trim(),
    price: Number(row.querySelector('.item-price').value)
  }));
}

async function saveItems() {
  if (isSavingItems) {
    return false;
  }
  const items = collectItems().filter((entry) => entry.item);

  if (items.length === 0) {
    itemStatus.textContent = 'Add at least one item before saving.';
    itemStatus.style.color = '#b42a2a';
    return false;
  }

  const hasInvalid = items.some((entry) => Number.isNaN(entry.price) || entry.price < 0);
  if (hasInvalid) {
    itemStatus.textContent = 'Enter valid prices for all items.';
    itemStatus.style.color = '#b42a2a';
    return false;
  }

  try {
    isSavingItems = true;
    saveItemListBtn.disabled = true;
    saveItemListBtn.textContent = 'Saving...';

    const res = await authFetch(apiUrl('items'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });

    const data = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save item list.');
    }

    itemStatus.textContent = 'Item List saved successfully.';
    itemStatus.style.color = '#4caf50';
    isItemListDirty = false;
    await loadItems();
    return true;
  } catch (error) {
    itemStatus.textContent = error.message;
    itemStatus.style.color = '#b42a2a';
    return false;
  } finally {
    isSavingItems = false;
    saveItemListBtn.disabled = false;
    saveItemListBtn.textContent = 'Save Item List';
  }
}

function hasMeaningfulItemInput() {
  return [...itemsEditorBody.querySelectorAll('tr')].some((row) => {
    const name = String(row.querySelector('.item-name')?.value || '').trim();
    const priceRaw = String(row.querySelector('.item-price')?.value || '').trim();
    return Boolean(name || priceRaw);
  });
}

function hasPendingItemChanges() {
  return isItemListDirty && !isSavingItems && hasMeaningfulItemInput();
}

function ensureItemsNavigationOverlay() {
  if (itemsNavigationOverlay) {
    return itemsNavigationOverlay;
  }

  itemsNavigationOverlay = document.createElement('div');
  itemsNavigationOverlay.style.position = 'fixed';
  itemsNavigationOverlay.style.inset = '0';
  itemsNavigationOverlay.style.background = 'rgba(6, 22, 33, 0.55)';
  itemsNavigationOverlay.style.display = 'none';
  itemsNavigationOverlay.style.alignItems = 'center';
  itemsNavigationOverlay.style.justifyContent = 'center';
  itemsNavigationOverlay.style.zIndex = '9999';
  itemsNavigationOverlay.style.backdropFilter = 'blur(1px)';

  const card = document.createElement('div');
  card.style.background = 'rgba(255,255,255,0.97)';
  card.style.border = '1px solid rgba(53,80,98,0.2)';
  card.style.borderRadius = '14px';
  card.style.padding = '14px 18px';
  card.style.display = 'flex';
  card.style.alignItems = 'center';
  card.style.gap = '10px';
  card.style.fontWeight = '700';
  card.style.color = '#153448';

  const spinner = document.createElement('span');
  spinner.style.width = '18px';
  spinner.style.height = '18px';
  spinner.style.borderRadius = '50%';
  spinner.style.border = '2px solid #9cb2bf';
  spinner.style.borderTopColor = '#153448';
  spinner.style.animation = 'sagarikaItemsNavSpin 0.8s linear infinite';
  spinner.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.textContent = 'Saving...';

  card.append(spinner, text);
  itemsNavigationOverlay.appendChild(card);

  const style = document.createElement('style');
  style.textContent = '@keyframes sagarikaItemsNavSpin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
  document.body.appendChild(itemsNavigationOverlay);
  return itemsNavigationOverlay;
}

function setItemsNavigationOverlay(visible) {
  const overlay = ensureItemsNavigationOverlay();
  overlay.style.display = visible ? 'flex' : 'none';
}

function shouldHandleItemsNavigation(link, event) {
  if (!link || event.defaultPrevented || event.button !== 0) {
    return false;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (link.target && link.target !== '_self') {
    return false;
  }
  if (link.hasAttribute('download')) {
    return false;
  }

  let url;
  try {
    url = new URL(link.href, location.href);
  } catch {
    return false;
  }

  if (url.origin !== location.origin) {
    return false;
  }
  if (url.pathname === location.pathname && url.search === location.search && url.hash) {
    return false;
  }
  return true;
}

async function navigateFromItemsWithAutoSave(url) {
  if (!url || isSavingItems) {
    return;
  }
  if (!hasPendingItemChanges()) {
    location.href = url;
    return;
  }
  setItemsNavigationOverlay(true);
  const ok = await saveItems();
  if (!ok) {
    setItemsNavigationOverlay(false);
    return;
  }
  location.href = url;
}

window.sagarikaSaveBeforeLeave = async function sagarikaSaveBeforeLeave() {
  if (isSavingItems) {
    return false;
  }
  if (!hasPendingItemChanges()) {
    return true;
  }
  setItemsNavigationOverlay(true);
  const ok = await saveItems();
  if (!ok) {
    setItemsNavigationOverlay(false);
    return false;
  }
  return true;
};

addItemRowBtn.addEventListener('click', () => {
  itemsEditorBody.appendChild(createRow());
});

saveItemListBtn.addEventListener('click', saveItems);

if (themeToggleInput) {
  themeToggleInput.addEventListener('change', () => {
    applyTheme(themeToggleInput.checked ? 'dark' : 'light');
  });
}

window.addEventListener('storage', (event) => {
  if (event.key !== THEME_STORAGE_KEY) {
    return;
  }
  applyTheme(event.newValue === 'dark' ? 'dark' : 'light');
});

document.addEventListener(
  'click',
  (event) => {
    const link = event.target.closest('a[href]');
    if (!shouldHandleItemsNavigation(link, event)) {
      return;
    }
    event.preventDefault();
    navigateFromItemsWithAutoSave(link.href);
  },
  true
);

try {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
} catch {
  applyTheme('light');
}

loadItems();
