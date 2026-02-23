const itemsBody = document.getElementById('itemsBody');
const billItemOptions = document.getElementById('billItemOptions');
const addItemBtn = document.getElementById('addItemBtn');
const billForm = document.getElementById('billForm');
const customerNameInput = document.getElementById('customerName');
const addressInput = document.getElementById('address');
const totalInput = document.getElementById('total');
const gstInput = document.getElementById('gst');
const discountInput = document.getElementById('discount');
const amountPayableInput = document.getElementById('amountPayable');
const statusMsg = document.getElementById('statusMsg');
const billDateInput = document.getElementById('billDate');
const phoneNumberInput = document.getElementById('phoneNumber');
const searchPhoneInput = document.getElementById('searchPhone');
const searchBtn = document.getElementById('searchBtn');
const loadBookingBtn = document.getElementById('loadBookingBtn');
const bookingSelect = document.getElementById('bookingSelect');
const billSelect = document.getElementById('billSelect');
const editBillBtn = document.getElementById('editBillBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const saveBillBtn = document.getElementById('saveBillBtn');
const printBillBtn = document.getElementById('printBillBtn');
const themeToggleInput = document.getElementById('themeToggle');
const billNoteInput = document.getElementById('billNote');
const ptBillNo = document.getElementById('ptBillNo');
const ptDate = document.getElementById('ptDate');
const ptCustomer = document.getElementById('ptCustomer');
const ptPhone = document.getElementById('ptPhone');
const ptAddress = document.getElementById('ptAddress');
const ptRows = document.getElementById('ptRows');
const ptNetTotal = document.getElementById('ptNetTotal');
const ptSgstRate = document.getElementById('ptSgstRate');
const ptSgstAmt = document.getElementById('ptSgstAmt');
const ptCgstRate = document.getElementById('ptCgstRate');
const ptCgstAmt = document.getElementById('ptCgstAmt');
const ptDiscount = document.getElementById('ptDiscount');
const ptGrandTotal = document.getElementById('ptGrandTotal');
const ptAmountWords = document.getElementById('ptAmountWords');
const ptNoteLine = document.getElementById('ptNoteLine');
const ptNote = document.getElementById('ptNote');
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbycQP83g4Buo1D_KMohHbU10016skIRsQjhKvc4Rg5tMVgbtU6wCXubxqOEx_cMB0jwCQ/exec';

let productPrices = {};
let storeItems = [];
let isSaveLocked = false;
let isSaving = false;
let isFormReadOnly = false;
let matchedBills = [];
let currentBillIndex = -1;
let currentBillId = '';
let matchedBookingsForImport = [];
const DRAFT_STORAGE_KEY = 'sagarika_bill_draft_v1';
const THEME_STORAGE_KEY = 'sagarika_theme_v1';

billDateInput.value = new Date().toISOString().slice(0, 10);

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function apiUrl(resource, query = '') {
  return `${APPS_SCRIPT_URL}?resource=${encodeURIComponent(resource)}${query}`;
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

function isManualQuantity(value) {
  const raw = String(value || '').trim();
  return raw === '#' || raw === '';
}

function toNumericQuantity(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '#') {
    return NaN;
  }
  return Number(raw);
}

function createRow(item = { slNo: '', item: '', quantity: '#', amount: 0 }) {
  const row = document.createElement('tr');
  const selectedItemValue = String(item.item || '').trim();
  const quantityValue = item.quantity === undefined || item.quantity === null || item.quantity === '' ? '#' : item.quantity;
  const manualMode = isManualQuantity(quantityValue);

  row.innerHTML = `
    <td><input type="number" class="slNo" min="1" value="${item.slNo}" required /></td>
    <td>
      <input type="text" class="item" list="billItemOptions" placeholder="Type item name" value="${selectedItemValue}" required />
    </td>
    <td><input type="text" class="quantity" value="${quantityValue}" placeholder="#" required /></td>
    <td><input type="number" class="amount" min="0" step="0.01" value="${Number(item.amount || 0).toFixed(2)}" ${manualMode ? '' : 'readonly'} /></td>
    <td><button type="button" class="btn btn-danger remove-btn">Remove</button></td>
  `;

  row.querySelector('.remove-btn').addEventListener('click', () => {
    row.remove();
    unlockSaveOnChange();
    recalculate();
    renumberRows();
    saveDraftToStorage();
  });

  row.querySelector('.item').addEventListener('input', recalculate);
  row.querySelector('.quantity').addEventListener('focus', (event) => {
    if (event.target.value.trim() === '#') {
      event.target.value = '';
    }
  });
  row.querySelector('.quantity').addEventListener('blur', (event) => {
    if (!event.target.value.trim()) {
      event.target.value = '#';
      recalculate();
    }
  });
  row.querySelector('.quantity').addEventListener('input', recalculate);
  row.querySelector('.amount').addEventListener('focus', (event) => {
    if (event.target.readOnly) {
      return;
    }

    const amountValue = Number(event.target.value || 0);
    if (amountValue === 0) {
      event.target.value = '';
    }
  });
  row.querySelector('.amount').addEventListener('blur', (event) => {
    if (event.target.readOnly) {
      return;
    }

    if (!event.target.value.trim()) {
      event.target.value = '0.00';
      recalculate();
    }
  });
  row.querySelector('.amount').addEventListener('input', recalculate);
  row.querySelector('.slNo').addEventListener('input', recalculate);

  return row;
}

function renderItemSuggestions() {
  if (!billItemOptions) {
    return;
  }

  billItemOptions.innerHTML = storeItems.map((name) => `<option value="${name}"></option>`).join('');
}

function renumberRows() {
  const rows = itemsBody.querySelectorAll('tr');
  rows.forEach((row, index) => {
    const slNo = row.querySelector('.slNo');
    if (!slNo.value || Number(slNo.value) <= 0) {
      slNo.value = index + 1;
    }
  });
}

function recalculate() {
  const rows = itemsBody.querySelectorAll('tr');
  let total = 0;

  rows.forEach((row) => {
    const selectedItem = row.querySelector('.item').value;
    const quantityRaw = row.querySelector('.quantity').value;
    const quantity = toNumericQuantity(quantityRaw);
    const unitPrice = Number(productPrices[selectedItem] || 0);
    const amountInput = row.querySelector('.amount');

    let amount = Number(amountInput.value || 0);
    if (isManualQuantity(quantityRaw)) {
      amountInput.readOnly = isFormReadOnly;
      amount = Number(amountInput.value || 0);
    } else {
      amountInput.readOnly = true;
      amount = Number.isFinite(quantity) ? quantity * unitPrice : 0;
      amountInput.value = amount.toFixed(2);
    }

    if (!Number.isFinite(amount)) {
      amount = 0;
      amountInput.value = '0.00';
    }
    total += amount;
  });

  const gstPercent = Number(gstInput.value || 0);
  const discountPercent = Number(discountInput.value || 0);

  const gstAmount = (total * gstPercent) / 100;
  const discountAmount = (total * discountPercent) / 100;
  const amountPayable = total + gstAmount - discountAmount;

  totalInput.value = total.toFixed(2);
  amountPayableInput.value = amountPayable.toFixed(2);
}

function getItems() {
  return [...itemsBody.querySelectorAll('tr')].map((row) => ({
    slNo: Number(row.querySelector('.slNo').value),
    item: row.querySelector('.item').value.trim(),
    quantity: String(row.querySelector('.quantity').value || '').trim(),
    amount: Number(row.querySelector('.amount').value)
  }));
}

function addDefaultRow() {
  const rowCount = itemsBody.querySelectorAll('tr').length;
  itemsBody.appendChild(createRow({ slNo: rowCount + 1, item: '', quantity: '#', amount: 0 }));
}

function saveDraftToStorage() {
  try {
    const draft = {
      billDate: billDateInput.value || '',
      customerName: customerNameInput.value || '',
      phoneNumber: phoneNumberInput.value || '',
      address: addressInput.value || '',
      billNote: billNoteInput.value || '',
      gst: gstInput.value || '0',
      discount: discountInput.value || '0',
      items: getItems(),
      currentBillId: currentBillId || ''
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage failures.
  }
}

function clearDraftFromStorage() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function restoreDraftFromStorage() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return false;

    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== 'object') return false;

    billDateInput.value = draft.billDate || new Date().toISOString().slice(0, 10);
    customerNameInput.value = String(draft.customerName || '');
    phoneNumberInput.value = onlyDigits(draft.phoneNumber || '').slice(0, 10);
    addressInput.value = String(draft.address || '');
    billNoteInput.value = String(draft.billNote || '');
    gstInput.value = Number(draft.gst || 0);
    discountInput.value = Number(draft.discount || 0);
    currentBillId = String(draft.currentBillId || '');

    itemsBody.innerHTML = '';
    const rows = Array.isArray(draft.items) ? draft.items : [];
    if (rows.length === 0) {
      addDefaultRow();
    } else {
      rows.forEach((entry, index) => {
        itemsBody.appendChild(
          createRow({
            slNo: Number(entry.slNo || index + 1),
            item: String(entry.item || ''),
            quantity: String(entry.quantity ?? '#'),
            amount: Number(entry.amount || 0)
          })
        );
      });
    }

    isSaveLocked = false;
    setFormReadOnly(false);
    recalculate();
    return true;
  } catch {
    return false;
  }
}

function setFormReadOnly(readOnly) {
  isFormReadOnly = readOnly;

  billDateInput.disabled = readOnly;
  customerNameInput.readOnly = readOnly;
  phoneNumberInput.readOnly = readOnly;
  addressInput.readOnly = readOnly;
  billNoteInput.readOnly = readOnly;
  gstInput.disabled = readOnly;
  discountInput.disabled = readOnly;
  addItemBtn.disabled = readOnly;
  saveBillBtn.disabled = readOnly || isSaving || isSaveLocked;
  printBillBtn.disabled = isSaving;

  if (readOnly) {
    saveBillBtn.textContent = 'Read Only';
  } else if (isSaveLocked) {
    saveBillBtn.textContent = 'Saved';
  } else if (!isSaving) {
    saveBillBtn.textContent = 'SAVE';
  }

  const rows = itemsBody.querySelectorAll('tr');
  rows.forEach((row) => {
    row.querySelector('.slNo').readOnly = readOnly;
    row.querySelector('.item').disabled = readOnly;
    row.querySelector('.quantity').readOnly = readOnly;
    row.querySelector('.amount').readOnly = readOnly || !isManualQuantity(row.querySelector('.quantity').value);
    row.querySelector('.remove-btn').disabled = readOnly;
  });

  editBillBtn.disabled = !readOnly;
}

function hideBillSelector() {
  if (!billSelect) {
    return;
  }
  billSelect.style.display = 'none';
  billSelect.innerHTML = '';
}

function formatBillDateForSelector(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toISOString().slice(0, 10);
}

function showBillSelector(bills) {
  if (!billSelect) {
    return;
  }

  billSelect.innerHTML = bills
    .map((bill, index) => {
      const billId = String(bill.billId || `Bill ${index + 1}`);
      const billDate = formatBillDateForSelector(bill.billDate);
      const customerName = String(bill.customerName || '').trim();
      const suffix = [billDate, customerName].filter(Boolean).join(' | ');
      const label = suffix ? `${billId} | ${suffix}` : billId;
      return `<option value="${index}">${label}</option>`;
    })
    .join('');

  billSelect.style.display = 'inline-flex';
}

function populateBillForm(bill) {
  currentBillId = String(bill.billId || '');
  billDateInput.value = bill.billDate || new Date().toISOString().slice(0, 10);
  customerNameInput.value = bill.customerName || '';
  phoneNumberInput.value = onlyDigits(bill.phoneNumber || '').slice(0, 10);
  addressInput.value = String(bill.address || '');
  billNoteInput.value = String(bill.note || '');
  gstInput.value = Number(bill.gst || 0);
  discountInput.value = Number(bill.discount || 0);

  itemsBody.innerHTML = '';
  const rows = Array.isArray(bill.items) ? [...bill.items] : [];
  rows.sort((a, b) => Number(a.slNo || 0) - Number(b.slNo || 0));

  if (rows.length === 0) {
    addDefaultRow();
  } else {
    rows.forEach((entry, index) => {
      itemsBody.appendChild(
        createRow({
          slNo: Number(entry.slNo || index + 1),
          item: String(entry.item || ''),
          quantity: String(entry.quantity ?? '#'),
          amount: Number(entry.amount || 0)
        })
      );
    });
  }

  recalculate();
  isSaveLocked = false;
  setFormReadOnly(true);
  saveDraftToStorage();
}

function lockSaveAfterSuccess() {
  isSaveLocked = true;
  saveBillBtn.disabled = true;
  saveBillBtn.textContent = 'Saved';
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return '0.00';
  }
  return n.toFixed(2);
}

function formatDateForPrint(isoDate) {
  const d = new Date(isoDate || new Date().toISOString().slice(0, 10));
  if (Number.isNaN(d.getTime())) {
    return isoDate || '';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function numberToWordsBelow1000(num) {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return '';
  if (num < 20) return ones[num];
  if (num < 100) return `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ''}`;

  const hundred = Math.floor(num / 100);
  const rem = num % 100;
  return `${ones[hundred]} Hundred${rem ? ` ${numberToWordsBelow1000(rem)}` : ''}`;
}

function numberToWordsIndian(value) {
  const safe = Number(value);
  if (!Number.isFinite(safe)) {
    return 'Zero Only';
  }

  const rupees = Math.floor(safe);
  const paise = Math.round((safe - rupees) * 100);

  if (rupees === 0 && paise === 0) {
    return 'Zero Only';
  }

  let n = rupees;
  const parts = [];

  const crore = Math.floor(n / 10000000);
  if (crore) {
    parts.push(`${numberToWordsBelow1000(crore)} Crore`);
    n %= 10000000;
  }

  const lakh = Math.floor(n / 100000);
  if (lakh) {
    parts.push(`${numberToWordsBelow1000(lakh)} Lakh`);
    n %= 100000;
  }

  const thousand = Math.floor(n / 1000);
  if (thousand) {
    parts.push(`${numberToWordsBelow1000(thousand)} Thousand`);
    n %= 1000;
  }

  if (n) {
    parts.push(numberToWordsBelow1000(n));
  }

  const rupeesWords = parts.join(' ').trim() || 'Zero';
  if (paise > 0) {
    return `${rupeesWords} and ${numberToWordsBelow1000(paise)} Paise Only`;
  }
  return `${rupeesWords} Only`;
}

function buildPrintRows() {
  const rows = [...itemsBody.querySelectorAll('tr')].map((row) => {
    const slNo = Number(row.querySelector('.slNo').value || 0);
    const item = row.querySelector('.item').value || '';
    const quantityRaw = String(row.querySelector('.quantity').value || '').trim();
    const quantity = toNumericQuantity(quantityRaw);
    const amount = Number(row.querySelector('.amount').value || 0);
    const unitPrice = Number.isFinite(quantity) && quantity > 0 ? amount / quantity : Number(productPrices[item] || 0);
    return {
      slNo,
      item,
      quantityLabel: isManualQuantity(quantityRaw) ? '#' : quantityRaw,
      unitPrice,
      amount
    };
  });

  return rows.filter((row) => row.item);
}

function renderPrintTemplate() {
  const rows = buildPrintRows();
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const gstPercent = Number(gstInput.value || 0);
  const discountPercent = Number(discountInput.value || 0);
  const discountAmount = (total * discountPercent) / 100;
  const sgstRate = gstPercent / 2;
  const cgstRate = gstPercent / 2;
  const sgstAmt = (total * sgstRate) / 100;
  const cgstAmt = (total * cgstRate) / 100;
  const grandTotal = total + sgstAmt + cgstAmt - discountAmount;

  ptBillNo.textContent = currentBillId || 'To be generated';
  ptDate.textContent = formatDateForPrint(billDateInput.value);
  ptCustomer.textContent = customerNameInput.value || 'Walk-in Customer';
  ptPhone.textContent = phoneNumberInput.value || '-';
  ptAddress.textContent = addressInput.value || '-';
  ptRows.innerHTML = '';

  const minRows = 12;
  const rowsToRender = Math.max(minRows, rows.length);
  for (let i = 0; i < rowsToRender; i += 1) {
    const row = rows[i];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row ? row.slNo : ''}</td>
      <td>${row ? row.item : ''}</td>
      <td>${row ? row.quantityLabel : ''}</td>
      <td>${row ? formatMoney(row.unitPrice) : ''}</td>
      <td>${row ? formatMoney(row.amount) : ''}</td>
    `;
    ptRows.appendChild(tr);
  }

  ptNetTotal.textContent = formatMoney(total);
  ptSgstRate.textContent = sgstRate.toFixed(2);
  ptSgstAmt.textContent = formatMoney(sgstAmt);
  ptCgstRate.textContent = cgstRate.toFixed(2);
  ptCgstAmt.textContent = formatMoney(cgstAmt);
  ptDiscount.textContent = formatMoney(discountAmount);
  ptGrandTotal.textContent = formatMoney(grandTotal);
  ptAmountWords.textContent = numberToWordsIndian(grandTotal);

  const noteText = billNoteInput.value.trim();
  ptNote.textContent = noteText;
  ptNoteLine.style.display = noteText ? 'block' : 'none';
}

function setSavingState(saving, label = 'Saving...') {
  isSaving = saving;
  printBillBtn.disabled = saving;

  if (saving) {
    saveBillBtn.disabled = true;
    saveBillBtn.textContent = label;
    return;
  }

  if (isFormReadOnly) {
    saveBillBtn.disabled = true;
    saveBillBtn.textContent = 'Read Only';
    return;
  }

  if (isSaveLocked) {
    saveBillBtn.disabled = true;
    saveBillBtn.textContent = 'Saved';
    return;
  }

  saveBillBtn.disabled = false;
  saveBillBtn.textContent = 'SAVE';
}

function validateBillAndGetPayload() {
  if (isFormReadOnly) {
    statusMsg.textContent = 'Bill is read-only. Click Edit to modify and save.';
    statusMsg.style.color = '#b42a2a';
    return null;
  }

  if (isSaveLocked) {
    statusMsg.textContent = 'Data already saved. Change any field to save again.';
    statusMsg.style.color = '#b42a2a';
    return null;
  }

  const items = getItems();
  if (items.length === 0) {
    statusMsg.textContent = 'Please add at least one item.';
    statusMsg.style.color = '#b42a2a';
    return null;
  }

  const phoneNumber = onlyDigits(phoneNumberInput.value).slice(0, 10);
  if (phoneNumber.length !== 10) {
    statusMsg.textContent = 'Enter a valid 10-digit phone number.';
    statusMsg.style.color = '#b42a2a';
    return null;
  }

  const hasInvalid = items.some((item) => {
    if (!item.item || !Object.prototype.hasOwnProperty.call(productPrices, item.item)) {
      return true;
    }

    const numericQty = toNumericQuantity(item.quantity);
    const amount = Number(item.amount);

    if (isManualQuantity(item.quantity)) {
      return !Number.isFinite(amount) || amount < 0;
    }

    return !Number.isFinite(numericQty) || numericQty < 0 || !Number.isFinite(amount);
  });

  if (hasInvalid) {
    statusMsg.textContent = 'Select valid items from Item List.';
    statusMsg.style.color = '#b42a2a';
    return null;
  }

  return {
    billDate: billDateInput.value,
    customerName: customerNameInput.value.trim() || 'Walk-in Customer',
    phoneNumber,
    address: addressInput.value.trim(),
    note: billNoteInput.value.trim(),
    items: items.map((item) => {
      if (isManualQuantity(item.quantity)) {
        const unitPrice = Number(productPrices[item.item] || 0);
        const manualAmount = Number(item.amount || 0);
        const derivedQuantity = unitPrice > 0 ? manualAmount / unitPrice : 0;
        return {
          ...item,
          quantity: derivedQuantity
        };
      }

      return {
        ...item,
        quantity: toNumericQuantity(item.quantity)
      };
    }),
    gst: Number(gstInput.value || 0),
    discount: Number(discountInput.value || 0)
  };
}

async function saveCurrentBill(saveLabel = 'Saving...') {
  if (isSaving) {
    statusMsg.textContent = 'Save already in progress.';
    statusMsg.style.color = '#b42a2a';
    return null;
  }

  const payload = validateBillAndGetPayload();
  if (!payload) {
    return null;
  }

  setSavingState(true, saveLabel);

  try {
    const response = await fetch(apiUrl('bills'), {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const result = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(result.error || 'Failed to save bill.');
    }

    statusMsg.textContent = `Saved successfully. Bill ID: ${result.billId}`;
    statusMsg.style.color = '#0c7a6b';
    currentBillId = String(result.billId || currentBillId);
    lockSaveAfterSuccess();
    saveDraftToStorage();
    setSavingState(false);
    return result;
  } catch (error) {
    statusMsg.textContent = error.message;
    statusMsg.style.color = '#b42a2a';
    setSavingState(false);
    return null;
  }
}

function unlockSaveOnChange() {
  if (isSaving || !isSaveLocked) {
    return;
  }

  isSaveLocked = false;
  saveBillBtn.disabled = isFormReadOnly;
  saveBillBtn.textContent = 'SAVE';
}

async function loadItemsFromExcel() {
  try {
    const response = await fetch(apiUrl('items'));
    const data = await parseJsonResponse(response);

    if (!response.ok || !Array.isArray(data)) {
      const details = data && typeof data === 'object' ? (data.details || data.error || '') : '';
      throw new Error(details ? `Failed to load item list: ${details}` : 'Failed to load item list.');
    }

    productPrices = data.reduce((acc, entry) => {
      const name = String(entry.item || '').trim();
      if (!name) {
        return acc;
      }
      acc[name] = Number(entry.price || 0);
      return acc;
    }, {});

    storeItems = Object.keys(productPrices);
    renderItemSuggestions();

    if (storeItems.length === 0) {
      statusMsg.textContent = 'No items found in Excel "Item List" sheet. Please add items and prices there.';
      statusMsg.style.color = '#b42a2a';
    }

    const restored = restoreDraftFromStorage();
    if (!restored) {
      itemsBody.innerHTML = '';
      addDefaultRow();
      recalculate();
      setFormReadOnly(false);
    }
  } catch (error) {
    statusMsg.textContent = error.message;
    statusMsg.style.color = '#b42a2a';
  }
}

async function searchBillsByPhone(phoneNumber) {
  const cleanedPhone = onlyDigits(phoneNumber).slice(0, 10);
  if (!cleanedPhone) {
    statusMsg.textContent = 'Enter phone number to search.';
    statusMsg.style.color = '#b42a2a';
    return;
  }

  try {
    matchedBookingsForImport = [];
    hideBookingSelector();

    const query = `&phoneNumber=${encodeURIComponent(cleanedPhone)}`;
    const response = await fetch(apiUrl('bills', query));
    const data = await parseJsonResponse(response);

    if (!Array.isArray(data) || data.length === 0) {
      matchedBills = [];
      currentBillIndex = -1;
      hideBillSelector();
      editBillBtn.disabled = true;
      statusMsg.textContent = `No bills found for phone ${cleanedPhone}.`;
      statusMsg.style.color = '#b42a2a';
      return;
    }

    matchedBills = data;
    currentBillIndex = 0;
    showBillSelector(matchedBills);
    billSelect.value = '0';

    const latestBill = matchedBills[currentBillIndex];
    populateBillForm(latestBill);
    statusMsg.textContent = `Found ${matchedBills.length} bill(s). Showing 1/${matchedBills.length}`;
    statusMsg.style.color = '#ff1493';
  } catch (error) {
    matchedBills = [];
    currentBillIndex = -1;
    hideBillSelector();
    statusMsg.textContent = 'Failed to search bills.';
    statusMsg.style.color = '#b42a2a';
  }
}

async function fetchBookEventsByPhone(cleanedPhone) {
  const localQuery = `?phoneNumber=${encodeURIComponent(cleanedPhone)}`;
  const scriptQuery = `&phoneNumber=${encodeURIComponent(cleanedPhone)}`;
  const candidates = [
    `/api/book-events${localQuery}`,
    apiUrl('book-events', scriptQuery),
    apiUrl('bookEvents', scriptQuery),
    apiUrl('bookevent', scriptQuery)
  ];

  function asArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.bookings)) return data.bookings;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.records)) return data.records;
    return null;
  }

  function formatDateOnly(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toISOString().slice(0, 10);
  }

  function normalizeBooking(booking) {
    const bookingId = String(
      booking?.bookingId || booking?.bookNumber || booking?.bookNo || booking?.id || ''
    ).trim();
    const eventDay = formatDateOnly(
      booking?.eventDay || booking?.eventDate || booking?.date || booking?.event_date || ''
    );
    const event = String(booking?.event || booking?.eventName || booking?.occasion || '').trim();
    const name = String(
      booking?.name || booking?.customerName || booking?.customer || booking?.fullName || ''
    ).trim();

    return {
      ...booking,
      bookingId,
      eventDay,
      event,
      name
    };
  }

  let lastError = new Error('Failed to load booking data.');

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      const data = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error((data && (data.error || data.details)) || 'Failed to search bookings.');
      }
      if (data && (data.error || data.details)) {
        throw new Error(data.error || data.details);
      }

      const rows = asArray(data);
      if (!rows) {
        throw new Error('Invalid booking response format from backend.');
      }
      return rows.map(normalizeBooking);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function loadBookingIntoBillForm(booking) {
  const items = Array.isArray(booking.items) ? booking.items : [];
  const noteParts = [];
  const eventName = String(booking.event || '').trim();
  const eventNote = String(booking.note || '').trim();
  if (eventName) {
    noteParts.push(`Event: ${eventName}`);
  }
  if (eventNote) {
    noteParts.push(eventNote);
  }

  billDateInput.value = new Date().toISOString().slice(0, 10);
  customerNameInput.value = String(booking.name || '').trim();
  phoneNumberInput.value = onlyDigits(booking.phoneNumber || '').slice(0, 10);
  addressInput.value = String(booking.address || '').trim();
  billNoteInput.value = noteParts.join('\n');
  gstInput.value = 0;
  discountInput.value = 0;

  itemsBody.innerHTML = '';
  if (items.length === 0) {
    addDefaultRow();
  } else {
    items.forEach((entry, index) => {
      itemsBody.appendChild(
        createRow({
          slNo: index + 1,
          item: String(entry.item || '').trim(),
          quantity: Number(entry.quantity || 0) || '#',
          amount: 0
        })
      );
    });
  }

  currentBillId = '';
  isSaveLocked = false;
  setFormReadOnly(false);
  recalculate();
  saveDraftToStorage();
}

function hideBookingSelector() {
  if (!bookingSelect) {
    return;
  }
  bookingSelect.style.display = 'none';
  bookingSelect.innerHTML = '';
}

function showBookingSelector(bookings) {
  if (!bookingSelect) {
    return;
  }

  bookingSelect.innerHTML = bookings
    .map((booking, index) => {
      const bookingId = String(booking.bookingId || `Booking ${index + 1}`);
      const eventDay = String(booking.eventDay || '').trim();
      const event = String(booking.event || '').trim();
      const name = String(booking.name || '').trim();
      const suffix = [eventDay, event, name].filter(Boolean).join(' | ');
      const label = suffix ? `${bookingId} | ${suffix}` : bookingId;
      return `<option value="${index}">${label}</option>`;
    })
    .join('');

  bookingSelect.style.display = 'inline-flex';
}

async function importBookingByPhone(phoneNumber) {
  const cleanedPhone = onlyDigits(phoneNumber).slice(0, 10);
  if (!cleanedPhone) {
    statusMsg.textContent = 'Enter phone number to load booking.';
    statusMsg.style.color = '#b42a2a';
    return;
  }

  try {
    matchedBills = [];
    currentBillIndex = -1;
    hideBillSelector();

    const bookings = await fetchBookEventsByPhone(cleanedPhone);
    if (bookings.length === 0) {
      matchedBookingsForImport = [];
      hideBookingSelector();
      statusMsg.textContent = `No bookings found for phone ${cleanedPhone}.`;
      statusMsg.style.color = '#b42a2a';
      return;
    }

    matchedBookingsForImport = bookings;
    showBookingSelector(bookings);
    bookingSelect.value = '0';
    const selectedBooking = matchedBookingsForImport[0];
    loadBookingIntoBillForm(selectedBooking);
    statusMsg.textContent = `${bookings.length} booking found.`;
    statusMsg.style.color = '#ff1493';
  } catch (error) {
    matchedBookingsForImport = [];
    hideBookingSelector();
    statusMsg.textContent = error.message || 'Failed to load booking.';
    statusMsg.style.color = '#b42a2a';
  }
}

addItemBtn.addEventListener('click', () => {
  if (isFormReadOnly) {
    return;
  }
  unlockSaveOnChange();
  addDefaultRow();
  recalculate();
  saveDraftToStorage();
});

[gstInput, discountInput].forEach((input) => {
  input.addEventListener('input', () => {
    if (isFormReadOnly) {
      return;
    }
    unlockSaveOnChange();
    recalculate();
  });
});

phoneNumberInput.addEventListener('input', () => {
  if (isFormReadOnly) {
    return;
  }
  phoneNumberInput.value = onlyDigits(phoneNumberInput.value).slice(0, 10);
  unlockSaveOnChange();
});

searchPhoneInput.addEventListener('input', () => {
  searchPhoneInput.value = onlyDigits(searchPhoneInput.value).slice(0, 10);
});

billForm.addEventListener('input', () => {
  unlockSaveOnChange();
  saveDraftToStorage();
});

billForm.addEventListener('change', () => {
  unlockSaveOnChange();
  saveDraftToStorage();
});

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

searchBtn.addEventListener('click', () => {
  matchedBookingsForImport = [];
  hideBookingSelector();
  searchBillsByPhone(searchPhoneInput.value.trim());
});

if (loadBookingBtn) {
  loadBookingBtn.addEventListener('click', () => {
    matchedBills = [];
    currentBillIndex = -1;
    hideBillSelector();
    importBookingByPhone(searchPhoneInput.value.trim());
  });
}

if (bookingSelect) {
  bookingSelect.addEventListener('change', () => {
    const selectedIndex = Number(bookingSelect.value);
    const selectedBooking = matchedBookingsForImport[selectedIndex];
    if (!selectedBooking) {
      return;
    }
    loadBookingIntoBillForm(selectedBooking);
    statusMsg.textContent = `Loaded booking ${selectedBooking.bookingId || ''} into bill.`;
    statusMsg.style.color = '#0c7a6b';
  });
}

if (billSelect) {
  billSelect.addEventListener('change', () => {
    const selectedIndex = Number(billSelect.value);
    const selectedBill = matchedBills[selectedIndex];
    if (!selectedBill) {
      return;
    }

    currentBillIndex = selectedIndex;
    populateBillForm(selectedBill);
    statusMsg.textContent = `Found ${matchedBills.length} bill(s). Showing ${currentBillIndex + 1}/${matchedBills.length}`;
    statusMsg.style.color = '#ff1493';
  });
}

editBillBtn.addEventListener('click', () => {
  setFormReadOnly(false);
  statusMsg.textContent = 'Edit mode enabled. You can now modify the bill.';
  statusMsg.style.color = '#0c7a6b';
});

clearSearchBtn.addEventListener('click', () => {
  searchPhoneInput.value = '';
  billDateInput.value = new Date().toISOString().slice(0, 10);
  customerNameInput.value = '';
  phoneNumberInput.value = '';
  addressInput.value = '';
  gstInput.value = 0;
  discountInput.value = 0;
  billNoteInput.value = '';
  itemsBody.innerHTML = '';
  addDefaultRow();
  currentBillId = '';
  isSaveLocked = false;
  setFormReadOnly(false);
  recalculate();
  matchedBills = [];
  currentBillIndex = -1;
  hideBillSelector();
  editBillBtn.disabled = true;
  statusMsg.textContent = '';
  matchedBookingsForImport = [];
  hideBookingSelector();
  clearDraftFromStorage();
});

billForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusMsg.textContent = '';
  await saveCurrentBill('Saving...');
});

printBillBtn.addEventListener('click', async () => {
  statusMsg.textContent = '';

  if (isSaving) {
    statusMsg.textContent = 'Save already in progress.';
    statusMsg.style.color = '#b42a2a';
    return;
  }

  if (isSaveLocked || isFormReadOnly) {
    renderPrintTemplate();
    window.print();
    return;
  }

  const result = await saveCurrentBill('Saving for Print...');
  if (result) {
    renderPrintTemplate();
    window.print();
  }
});

try {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
} catch {
  applyTheme('light');
}

loadItemsFromExcel();
hideBillSelector();
