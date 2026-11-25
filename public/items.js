const itemsEditorBody = document.getElementById('itemsEditorBody');
const addItemRowBtn = document.getElementById('addItemRowBtn');
const saveItemListBtn = document.getElementById('saveItemListBtn');
const itemStatus = document.getElementById('itemStatus');
const themeToggleInput = document.getElementById('themeToggle');
const spellSummary = document.getElementById('spellSummary');
const spellSummaryText = document.getElementById('spellSummaryText');
const spellFixAllBtn = document.getElementById('spellFixAllBtn');
const itemNameSuggestions = document.getElementById('itemNameSuggestions');
const SPELL_KEEP_KEY = 'sagarika_spell_keep_v1';
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

/* ---------- Spell check (dictionary in item-dictionary.js) ---------- */

function loadKeptNames() {
  try {
    const saved = JSON.parse(localStorage.getItem(SPELL_KEEP_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

const keptNames = loadKeptNames();

function rememberKeptName(name) {
  keptNames.add(name.trim().toLowerCase());
  try {
    localStorage.setItem(SPELL_KEEP_KEY, JSON.stringify([...keptNames]));
  } catch {
    // Ignore storage failures; the choice still holds until the page reloads.
  }
}

function spellSuggestionFor(name) {
  const value = String(name || '').trim();
  if (!value || !window.SagarikaSpell || keptNames.has(value.toLowerCase())) {
    return '';
  }
  return window.SagarikaSpell.check(value);
}

function updateSpellSummary() {
  const count = itemsEditorBody.querySelectorAll('tr.has-spell-hint').length;
  spellSummary.hidden = count === 0;
  spellSummaryText.textContent =
    count === 1 ? '1 item name may be misspelt. Check the highlighted row.' : `${count} item names may be misspelt. Check the highlighted rows.`;
  spellFixAllBtn.hidden = count < 2;
}

function applySpellSuggestion(row, suggestion) {
  const input = row.querySelector('.item-name');
  input.value = suggestion;
  isItemListDirty = true;
  checkRowSpelling(row);
  if (meaningInput === input || document.activeElement === input) showMeaning(input);
}

function checkRowSpelling(row) {
  const input = row.querySelector('.item-name');
  const hint = row.querySelector('.spell-hint');
  const suggestion = spellSuggestionFor(input.value);
  // Same hint already showing: leave the buttons in place, so a tap that
  // caused this re-check (by leaving the name box) still reaches them.
  if (suggestion && suggestion === row.dataset.suggestion && !hint.hidden && hint.childElementCount) {
    updateSpellSummary();
    return;
  }
  row.classList.toggle('has-spell-hint', Boolean(suggestion));
  row.dataset.suggestion = suggestion;
  hint.hidden = !suggestion;
  hint.replaceChildren();
  if (suggestion) {
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'spell-apply';
    apply.textContent = suggestion;
    apply.addEventListener('click', () => applySpellSuggestion(row, suggestion));

    const keep = document.createElement('button');
    keep.type = 'button';
    keep.className = 'spell-keep';
    keep.textContent = 'Keep';
    keep.title = 'Keep this spelling and stop suggesting';
    keep.addEventListener('click', () => {
      rememberKeptName(input.value);
      checkRowSpelling(row);
    });

    // Pressing a hint button should not take focus away first (that re-checks the row).
    [apply, keep].forEach((button) => button.addEventListener('pointerdown', (event) => event.preventDefault()));
    hint.append('Did you mean ', apply, '?', keep);
  }
  updateSpellSummary();
}

function refreshNameSuggestions(extraNames = []) {
  const seen = new Set();
  const names = [...extraNames, ...((window.SagarikaSpell && window.SagarikaSpell.names) || [])].filter((name) => {
    const key = String(name || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  itemNameSuggestions.replaceChildren(
    ...names.map((name) => {
      const option = document.createElement('option');
      option.value = name;
      return option;
    })
  );
}

/* ---------- Grey meaning popup ---------- */

const meaningPopup = document.createElement('div');
meaningPopup.className = 'meaning-popup';
meaningPopup.setAttribute('role', 'tooltip');
meaningPopup.hidden = true;
document.body.appendChild(meaningPopup);
let meaningInput = null;

function meaningFor(input) {
  if (!window.SagarikaSpell || !window.SagarikaSpell.meaning) return { title: '', lines: [] };
  // While a misspelling is shown, explain the suggested item instead.
  const suggestion = input.closest('tr')?.dataset.suggestion;
  const title = suggestion || input.value.trim();
  return { title, lines: window.SagarikaSpell.meaning(title) };
}

function placeMeaningPopup(input) {
  const rect = input.getBoundingClientRect();
  const width = Math.min(360, window.innerWidth - 24);
  meaningPopup.style.maxWidth = `${width}px`;
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
  meaningPopup.style.left = `${left + window.scrollX}px`;
  // Sit just above the box (the spell hint is below it); go below if there is no room above.
  const height = meaningPopup.offsetHeight;
  const above = rect.top - height - 10;
  const top = above > 72 ? above : rect.bottom + 10;
  meaningPopup.classList.toggle('is-below', !(above > 72));
  meaningPopup.style.top = `${top + window.scrollY}px`;
  meaningPopup.style.setProperty('--arrow-left', `${Math.max(16, Math.min(rect.left - left + 24, width - 16))}px`);
}

function showMeaning(input) {
  const { title, lines } = meaningFor(input);
  if (lines.length === 0) {
    hideMeaning(input);
    return;
  }
  meaningInput = input;
  const heading = document.createElement('strong');
  heading.textContent = title;
  meaningPopup.replaceChildren(heading);
  lines.forEach((line) => {
    const p = document.createElement('p');
    if (line.term) {
      const term = document.createElement('b');
      term.textContent = `${line.term}: `;
      p.append(term);
    }
    p.append(line.text);
    meaningPopup.append(p);
  });
  meaningPopup.hidden = false;
  placeMeaningPopup(input);
}

function hideMeaning(input) {
  if (input && meaningInput && input !== meaningInput) return;
  meaningPopup.hidden = true;
  meaningInput = null;
}

window.addEventListener('scroll', () => meaningInput && placeMeaningPopup(meaningInput), { passive: true });
window.addEventListener('resize', () => meaningInput && placeMeaningPopup(meaningInput));

spellFixAllBtn.addEventListener('click', () => {
  itemsEditorBody.querySelectorAll('tr.has-spell-hint').forEach((row) => {
    if (row.dataset.suggestion) applySpellSuggestion(row, row.dataset.suggestion);
  });
});

function createRow(entry = { item: '', price: '' }) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <input type="text" class="item-name" placeholder="Item name" list="itemNameSuggestions" autocomplete="off" spellcheck="false" />
      <div class="spell-hint" hidden></div>
    </td>
    <td><input type="number" class="item-price" min="0" step="0.01" placeholder="0.00" /></td>
    <td><button type="button" class="btn btn-danger remove-item">X</button></td>
  `;
  // Set values as properties so names with quotes or < > show exactly as saved.
  tr.querySelector('.item-name').value = entry.item || '';
  tr.querySelector('.item-price').value = entry.price ?? '';

  tr.querySelector('.remove-item').addEventListener('click', () => {
    tr.remove();
    isItemListDirty = true;
    updateSpellSummary();
  });
  const nameInput = tr.querySelector('.item-name');
  let typingTimer = null;
  nameInput.addEventListener('input', () => {
    isItemListDirty = true;
    // Hide an old hint while typing; check again once they pause.
    if (tr.classList.contains('has-spell-hint')) {
      tr.classList.remove('has-spell-hint');
      tr.dataset.suggestion = '';
      tr.querySelector('.spell-hint').hidden = true;
      updateSpellSummary();
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      checkRowSpelling(tr);
      showMeaning(nameInput);
    }, 600);
  });
  nameInput.addEventListener('change', () => checkRowSpelling(tr));
  nameInput.addEventListener('focus', () => showMeaning(nameInput));
  nameInput.addEventListener('mouseenter', () => showMeaning(nameInput));
  nameInput.addEventListener('mouseleave', () => {
    if (document.activeElement !== nameInput) hideMeaning(nameInput);
  });
  nameInput.addEventListener('blur', () => {
    clearTimeout(typingTimer);
    checkRowSpelling(tr);
    hideMeaning(nameInput);
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
    refreshNameSuggestions(data.map((entry) => entry.item));
    itemsEditorBody.querySelectorAll('tr').forEach(checkRowSpelling);

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
  const row = createRow();
  itemsEditorBody.appendChild(row);
  row.querySelector('.item-name').focus();
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
