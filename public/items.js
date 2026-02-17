const itemsEditorBody = document.getElementById('itemsEditorBody');
const addItemRowBtn = document.getElementById('addItemRowBtn');
const saveItemListBtn = document.getElementById('saveItemListBtn');
const itemStatus = document.getElementById('itemStatus');
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxwweF8iszXTGvO1bHFiRK9MD701kGIkGQY5wxKLdyTameWdsLCWrpstlVEfe9YXgMzBA/exec';

function apiUrl(resource) {
  return `${APPS_SCRIPT_URL}?resource=${encodeURIComponent(resource)}`;
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

  tr.querySelector('.remove-item').addEventListener('click', () => tr.remove());
  return tr;
}

async function loadItems() {
  itemStatus.textContent = 'Loading...';
  itemStatus.style.color = '#355062';

  try {
    const res = await fetch(apiUrl('items'));
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
  const items = collectItems().filter((entry) => entry.item);

  if (items.length === 0) {
    itemStatus.textContent = 'Add at least one item before saving.';
    itemStatus.style.color = '#b42a2a';
    return;
  }

  const hasInvalid = items.some((entry) => Number.isNaN(entry.price) || entry.price < 0);
  if (hasInvalid) {
    itemStatus.textContent = 'Enter valid prices for all items.';
    itemStatus.style.color = '#b42a2a';
    return;
  }

  try {
    saveItemListBtn.disabled = true;
    saveItemListBtn.textContent = 'Saving...';

    const res = await fetch(apiUrl('items'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });

    const data = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save item list.');
    }

    itemStatus.textContent = 'Item List saved to Excel successfully.';
    itemStatus.style.color = '#0c7a6b';
    await loadItems();
  } catch (error) {
    itemStatus.textContent = error.message;
    itemStatus.style.color = '#b42a2a';
  } finally {
    saveItemListBtn.disabled = false;
    saveItemListBtn.textContent = 'Save Item List';
  }
}

addItemRowBtn.addEventListener('click', () => {
  itemsEditorBody.appendChild(createRow());
});

saveItemListBtn.addEventListener('click', saveItems);

loadItems();
