const itemsBody = document.getElementById('itemsBody');
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
const prevBillBtn = document.getElementById('prevBillBtn');
const nextBillBtn = document.getElementById('nextBillBtn');
const editBillBtn = document.getElementById('editBillBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const saveBillBtn = document.getElementById('saveBillBtn');
const printBillBtn = document.getElementById('printBillBtn');
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
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyXsrmf03lRwPEckONqGi19QHW1pBRsHd0LgLUHlpBeWVdoyfl8vnlFDZ_mw6OwbuxFug/exec';

let productPrices = {};
let storeItems = [];
let isSaveLocked = false;
let isSaving = false;
let isFormReadOnly = false;
let matchedBills = [];
let currentBillIndex = -1;
let currentBillId = '';

billDateInput.value = new Date().toISOString().slice(0, 10);

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function apiUrl(resource, query = '') {
  return `${APPS_SCRIPT_URL}?resource=${encodeURIComponent(resource)}${query}`;
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

function createRow(item = { slNo: '', item: '', quantity: 1, amount: 0 }) {
  const row = document.createElement('tr');
  const optionsHtml = storeItems
    .map((name) => `<option value="${name}" ${item.item === name ? 'selected' : ''}>${name}</option>`)
    .join('');

  row.innerHTML = `
    <td><input type="number" class="slNo" min="1" value="${item.slNo}" required /></td>
    <td>
      <select class="item" required>
        <option value="">Select item</option>
        ${optionsHtml}
      </select>
    </td>
    <td><input type="number" class="quantity" min="0" step="1" value="${item.quantity}" required /></td>
    <td><input type="number" class="amount" min="0" step="0.01" value="${Number(item.amount || 0).toFixed(2)}" readonly /></td>
    <td><button type="button" class="btn btn-danger remove-btn">Remove</button></td>
  `;

  row.querySelector('.remove-btn').addEventListener('click', () => {
    row.remove();
    unlockSaveOnChange();
    recalculate();
    renumberRows();
  });

  row.querySelector('.item').addEventListener('change', recalculate);
  row.querySelector('.quantity').addEventListener('input', recalculate);
  row.querySelector('.slNo').addEventListener('input', recalculate);

  return row;
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
    const quantity = Number(row.querySelector('.quantity').value || 0);
    const unitPrice = Number(productPrices[selectedItem] || 0);
    const amount = quantity * unitPrice;

    row.querySelector('.amount').value = amount.toFixed(2);
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
    quantity: Number(row.querySelector('.quantity').value),
    amount: Number(row.querySelector('.amount').value)
  }));
}

function addDefaultRow() {
  const rowCount = itemsBody.querySelectorAll('tr').length;
  itemsBody.appendChild(createRow({ slNo: rowCount + 1, item: '', quantity: 1, amount: 0 }));
}

function setFormReadOnly(readOnly) {
  isFormReadOnly = readOnly;

  billDateInput.disabled = readOnly;
  customerNameInput.readOnly = readOnly;
  phoneNumberInput.readOnly = readOnly;
  addressInput.readOnly = readOnly;
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
    saveBillBtn.textContent = 'Save Bill to Excel';
  }

  const rows = itemsBody.querySelectorAll('tr');
  rows.forEach((row) => {
    row.querySelector('.slNo').readOnly = readOnly;
    row.querySelector('.item').disabled = readOnly;
    row.querySelector('.quantity').readOnly = readOnly;
    row.querySelector('.remove-btn').disabled = readOnly;
  });

  editBillBtn.disabled = !readOnly;
}

function updateBillNavigationButtons() {
  const hasMatches = matchedBills.length > 0;
  prevBillBtn.disabled = !hasMatches || currentBillIndex <= 0;
  nextBillBtn.disabled = !hasMatches || currentBillIndex >= matchedBills.length - 1;
}

function populateBillForm(bill) {
  currentBillId = String(bill.billId || '');
  billDateInput.value = bill.billDate || new Date().toISOString().slice(0, 10);
  customerNameInput.value = bill.customerName || '';
  phoneNumberInput.value = onlyDigits(bill.phoneNumber || '').slice(0, 10);
  addressInput.value = String(bill.address || '');
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
          quantity: Number(entry.quantity || 0),
          amount: Number(entry.amount || 0)
        })
      );
    });
  }

  recalculate();
  isSaveLocked = false;
  setFormReadOnly(true);
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
    const quantity = Number(row.querySelector('.quantity').value || 0);
    const amount = Number(row.querySelector('.amount').value || 0);
    const unitPrice = quantity > 0 ? amount / quantity : Number(productPrices[item] || 0);
    return { slNo, item, quantity, unitPrice, amount };
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
      <td>${row ? row.quantity : ''}</td>
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
  saveBillBtn.textContent = 'Save Bill to Excel';
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

  const hasInvalid = items.some(
    (item) =>
      !item.item ||
      !Object.prototype.hasOwnProperty.call(productPrices, item.item) ||
      Number.isNaN(item.quantity) ||
      Number.isNaN(item.amount)
  );

  if (hasInvalid) {
    statusMsg.textContent = 'Select valid items from Item List and enter quantity.';
    statusMsg.style.color = '#b42a2a';
    return null;
  }

  return {
    billDate: billDateInput.value,
    customerName: customerNameInput.value.trim() || 'Walk-in Customer',
    phoneNumber,
    address: addressInput.value.trim(),
    items,
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
  saveBillBtn.textContent = 'Save Bill to Excel';
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
      acc[entry.item] = Number(entry.price || 0);
      return acc;
    }, {});

    storeItems = Object.keys(productPrices);

    if (storeItems.length === 0) {
      statusMsg.textContent = 'No items found in Excel "Item List" sheet. Please add items and prices there.';
      statusMsg.style.color = '#b42a2a';
    }

    itemsBody.innerHTML = '';
    addDefaultRow();
    recalculate();
    setFormReadOnly(false);
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
    const query = `&phoneNumber=${encodeURIComponent(cleanedPhone)}`;
    const response = await fetch(apiUrl('bills', query));
    const data = await parseJsonResponse(response);

    if (!Array.isArray(data) || data.length === 0) {
      matchedBills = [];
      currentBillIndex = -1;
      updateBillNavigationButtons();
      editBillBtn.disabled = true;
      statusMsg.textContent = `No bills found for phone ${cleanedPhone}.`;
      statusMsg.style.color = '#b42a2a';
      return;
    }

    matchedBills = data;
    currentBillIndex = 0;
    updateBillNavigationButtons();

    const latestBill = matchedBills[currentBillIndex];
    populateBillForm(latestBill);
    statusMsg.textContent = `Found ${matchedBills.length} bill(s). Showing 1/${matchedBills.length}: ${latestBill.billId}.`;
    statusMsg.style.color = '#0c7a6b';
  } catch (error) {
    matchedBills = [];
    currentBillIndex = -1;
    updateBillNavigationButtons();
    statusMsg.textContent = 'Failed to search bills.';
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

billForm.addEventListener('input', unlockSaveOnChange);
billForm.addEventListener('change', unlockSaveOnChange);

searchBtn.addEventListener('click', () => {
  searchBillsByPhone(searchPhoneInput.value.trim());
});

prevBillBtn.addEventListener('click', () => {
  if (currentBillIndex <= 0 || matchedBills.length === 0) {
    return;
  }

  currentBillIndex -= 1;
  updateBillNavigationButtons();
  const bill = matchedBills[currentBillIndex];
  populateBillForm(bill);
  statusMsg.textContent = `Showing ${currentBillIndex + 1}/${matchedBills.length}: ${bill.billId}.`;
  statusMsg.style.color = '#0c7a6b';
});

nextBillBtn.addEventListener('click', () => {
  if (matchedBills.length === 0 || currentBillIndex >= matchedBills.length - 1) {
    return;
  }

  currentBillIndex += 1;
  updateBillNavigationButtons();
  const bill = matchedBills[currentBillIndex];
  populateBillForm(bill);
  statusMsg.textContent = `Showing ${currentBillIndex + 1}/${matchedBills.length}: ${bill.billId}.`;
  statusMsg.style.color = '#0c7a6b';
});

editBillBtn.addEventListener('click', () => {
  setFormReadOnly(false);
  statusMsg.textContent = 'Edit mode enabled. You can now modify the bill.';
  statusMsg.style.color = '#0c7a6b';
});

clearSearchBtn.addEventListener('click', () => {
  searchPhoneInput.value = '';
  matchedBills = [];
  currentBillIndex = -1;
  updateBillNavigationButtons();
  editBillBtn.disabled = true;
  statusMsg.textContent = '';
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

loadItemsFromExcel();
updateBillNavigationButtons();
