const express = require('express');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

let googleLib = null;
try {
  // Lazy-optional: app still runs with Excel fallback if dependency is not installed.
  googleLib = require('googleapis');
} catch {
  googleLib = null;
}

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
const excelPath = path.join(dataDir, 'bills.xlsx');

const GOOGLE_SHEET_ID =
  process.env.GOOGLE_SHEET_ID || '1mW8betWY7QT4n1kCbIyWyedaNeUFzQGBXOmdc8-0ZkM';
const GOOGLE_SERVICE_ACCOUNT_FILE =
  process.env.GOOGLE_SERVICE_ACCOUNT_FILE ||
  path.join(__dirname, 'credentials', 'google-service-account.json');

const defaultItemList = [
  { item: 'Rice (5kg)', price: 450 },
  { item: 'Wheat Flour (1kg)', price: 55 },
  { item: 'Sugar (1kg)', price: 48 },
  { item: 'Milk (1L)', price: 62 },
  { item: 'Cooking Oil (1L)', price: 155 },
  { item: 'Tea Powder (250g)', price: 145 },
  { item: 'Coffee (200g)', price: 180 },
  { item: 'Biscuits', price: 30 },
  { item: 'Soap', price: 35 },
  { item: 'Shampoo', price: 120 }
];

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(express.json());
app.use(
  express.static(path.join(__dirname, 'public'), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
  })
);

function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet);
}

function writeSheet(workbook, sheetName, data) {
  const headers = [];
  const headerSet = new Set();

  data.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!headerSet.has(key)) {
        headerSet.add(key);
        headers.push(key);
      }
    });
  });

  const sheet = XLSX.utils.json_to_sheet(data, headers.length ? { header: headers } : undefined);
  workbook.Sheets[sheetName] = sheet;
  if (!workbook.SheetNames.includes(sheetName)) {
    workbook.SheetNames.push(sheetName);
  }
}

function ensureWorkbook() {
  let workbook;
  let changed = false;

  if (fs.existsSync(excelPath)) {
    workbook = XLSX.readFile(excelPath);
  } else {
    workbook = XLSX.utils.book_new();
    changed = true;
  }

  if (!workbook.SheetNames.includes('Bills')) {
    writeSheet(workbook, 'Bills', []);
    changed = true;
  }

  if (!workbook.SheetNames.includes('BillItems')) {
    writeSheet(workbook, 'BillItems', []);
    changed = true;
  }

  if (!workbook.SheetNames.includes('Item List')) {
    writeSheet(workbook, 'Item List', defaultItemList);
    changed = true;
  }

  if (!workbook.SheetNames.includes('BookEvent')) {
    writeSheet(workbook, 'BookEvent', []);
    changed = true;
  }

  if (changed) {
    XLSX.writeFile(workbook, excelPath);
  }

  return workbook;
}

function normalizePhoneNumber(value) {
  return String(value || '').replace(/\D/g, '');
}

function getNextBillSequence(bills) {
  let maxSeq = 0;

  bills.forEach((bill) => {
    const id = String(bill.billId || '');
    const match = id.match(/^SAG(\d{4})\d{4}$/);
    if (match) {
      const seq = Number(match[1]);
      if (!Number.isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  return maxSeq + 1;
}

function buildBillId(bills, billDateValue) {
  const sequence = getNextBillSequence(bills);
  const safeDate = billDateValue || new Date().toISOString().slice(0, 10);
  const dateObj = new Date(safeDate);
  const month = String((dateObj.getMonth() + 1) || 1).padStart(2, '0');
  const day = String(dateObj.getDate() || 1).padStart(2, '0');
  return `SAG${String(sequence).padStart(4, '0')}${month}${day}`;
}

function getItemPriceMap(itemList) {
  const priceMap = {};
  itemList.forEach((entry) => {
    const itemName = String(entry.item || '').trim();
    const price = Number(entry.price || 0);
    if (itemName) {
      priceMap[itemName] = price;
    }
  });
  return priceMap;
}

let sheetsClient = null;
let storageMode = null;

function isGoogleConfigured() {
  return Boolean(googleLib && GOOGLE_SHEET_ID && fs.existsSync(GOOGLE_SERVICE_ACCOUNT_FILE));
}

async function getSheetsClient() {
  if (!isGoogleConfigured()) {
    throw new Error('Google Sheets not configured.');
  }

  if (sheetsClient) {
    return sheetsClient;
  }

  const { google } = googleLib;
  const credentials = JSON.parse(fs.readFileSync(GOOGLE_SERVICE_ACCOUNT_FILE, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const authClient = await auth.getClient();
  sheetsClient = google.sheets({ version: 'v4', auth: authClient });
  return sheetsClient;
}

function rowsToValueMatrix(rows) {
  const headers = [];
  const seen = new Set();

  rows.forEach((row) => {
    Object.keys(row || {}).forEach((k) => {
      if (!seen.has(k)) {
        seen.add(k);
        headers.push(k);
      }
    });
  });

  if (headers.length === 0) {
    return [['empty']];
  }

  const values = [headers];
  rows.forEach((row) => {
    values.push(headers.map((h) => (row[h] ?? '').toString()));
  });

  return values;
}

function valueMatrixToRows(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const headers = (values[0] || []).map((h) => String(h || '').trim());
  const rows = [];

  for (let i = 1; i < values.length; i += 1) {
    const rowVals = values[i] || [];
    const obj = {};
    let hasAny = false;

    headers.forEach((h, idx) => {
      if (!h) return;
      const raw = rowVals[idx] ?? '';
      const val = typeof raw === 'string' ? raw.trim() : raw;
      if (val !== '') {
        hasAny = true;
      }
      obj[h] = val;
    });

    if (hasAny) {
      rows.push(obj);
    }
  }

  return rows;
}

function normalizeNumericFields(rows, numericFields) {
  return rows.map((row) => {
    const next = { ...row };
    numericFields.forEach((field) => {
      if (field in next) {
        next[field] = Number(next[field] || 0);
      }
    });
    return next;
  });
}

async function ensureGoogleSheetsWorkbook() {
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    fields: 'sheets.properties.title'
  });

  const existing = new Set((meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean));
  const required = ['Bills', 'BillItems', 'Item List', 'BookEvent'];

  const requests = required
    .filter((title) => !existing.has(title))
    .map((title) => ({ addSheet: { properties: { title } } }));

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: { requests }
    });
  }

  const itemList = await readGoogleRows('Item List');
  if (itemList.length === 0) {
    await writeGoogleRows('Item List', defaultItemList);
  }
}

async function readGoogleRows(sheetName) {
  const sheets = await getSheetsClient();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${sheetName}!A1:ZZ20000`
  });

  return valueMatrixToRows(result.data.values || []);
}

async function writeGoogleRows(sheetName, rows) {
  const sheets = await getSheetsClient();
  const values = rowsToValueMatrix(rows);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${sheetName}!A:ZZ`
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values }
  });
}

async function getStorageMode() {
  if (storageMode) {
    return storageMode;
  }

  if (isGoogleConfigured()) {
    try {
      await ensureGoogleSheetsWorkbook();
      storageMode = 'google';
      console.log('Storage mode: Google Sheets');
      return storageMode;
    } catch (error) {
      console.warn(`Google Sheets unavailable, falling back to Excel: ${error.message}`);
    }
  }

  ensureWorkbook();
  storageMode = 'excel';
  console.log('Storage mode: Excel');
  return storageMode;
}

async function getAllData() {
  const mode = await getStorageMode();

  if (mode === 'google') {
    const billsRaw = await readGoogleRows('Bills');
    const itemListRaw = await readGoogleRows('Item List');
    const billItemsRaw = await readGoogleRows('BillItems');
    const bookEventsRaw = await readGoogleRows('BookEvent');

    const bills = normalizeNumericFields(billsRaw, ['total', 'gst', 'discount', 'amountPayable']);
    const billItems = normalizeNumericFields(billItemsRaw, ['slNo', 'quantity', 'unitPrice', 'amount']);
    const itemList = normalizeNumericFields(itemListRaw, ['price']);
    const bookEvents = normalizeNumericFields(bookEventsRaw, ['quantity']);

    return { mode, bills, billItems, itemList, bookEvents };
  }

  const workbook = ensureWorkbook();
  const bills = normalizeNumericFields(readSheet(workbook, 'Bills'), ['total', 'gst', 'discount', 'amountPayable']);
  const billItems = normalizeNumericFields(readSheet(workbook, 'BillItems'), ['slNo', 'quantity', 'unitPrice', 'amount']);
  const itemList = normalizeNumericFields(readSheet(workbook, 'Item List'), ['price']);
  const bookEvents = normalizeNumericFields(readSheet(workbook, 'BookEvent'), ['quantity']);
  return { mode, bills, billItems, itemList, bookEvents };
}

async function saveItemList(itemList) {
  const mode = await getStorageMode();
  if (mode === 'google') {
    await writeGoogleRows('Item List', itemList);
    return;
  }

  const workbook = ensureWorkbook();
  writeSheet(workbook, 'Item List', itemList);
  XLSX.writeFile(workbook, excelPath);
}

async function saveBillsAndItems(bills, billItems) {
  const mode = await getStorageMode();
  if (mode === 'google') {
    await writeGoogleRows('Bills', bills);
    await writeGoogleRows('BillItems', billItems);
    return;
  }

  const workbook = ensureWorkbook();
  writeSheet(workbook, 'Bills', bills);
  writeSheet(workbook, 'BillItems', billItems);
  XLSX.writeFile(workbook, excelPath);
}

async function saveBookEvents(bookEvents) {
  const mode = await getStorageMode();
  if (mode === 'google') {
    await writeGoogleRows('BookEvent', bookEvents);
    return;
  }

  const workbook = ensureWorkbook();
  writeSheet(workbook, 'BookEvent', bookEvents);
  XLSX.writeFile(workbook, excelPath);
}

function getNextBookEventSequence(bookEvents) {
  let maxSeq = 0;

  bookEvents.forEach((row) => {
    const id = String(row.bookingId || '');
    const match = id.match(/^BE(\d{4})$/);
    if (match) {
      const seq = Number(match[1]);
      if (!Number.isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  return maxSeq + 1;
}

function parseBookEventItemsFromRow(row) {
  const selectedItemsRaw = String(row.selectedItems || '').trim();
  const itemRaw = String(row.item || '').trim();
  const qtyRaw = Number(row.quantity || 0);

  const parseCombined = (text) =>
    text
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const match = part.match(/^(.*)\sx([0-9]+(?:\.[0-9]+)?)$/i);
        if (!match) {
          return { item: part, quantity: 1 };
        }

        return {
          item: String(match[1] || '').trim(),
          quantity: Number(match[2] || 0)
        };
      });

  if (selectedItemsRaw) {
    return parseCombined(selectedItemsRaw);
  }

  if (itemRaw && Number.isFinite(qtyRaw) && qtyRaw > 0) {
    return [{ item: itemRaw, quantity: qtyRaw }];
  }

  if (itemRaw && itemRaw.includes('x')) {
    return parseCombined(itemRaw);
  }

  return [];
}

app.get('/api/items', async (req, res) => {
  try {
    const { itemList } = await getAllData();
    const result = itemList
      .map((entry) => ({ item: String(entry.item || '').trim(), price: Number(entry.price || 0) }))
      .filter((entry) => entry.item)
      .sort((a, b) => a.item.localeCompare(b.item));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read item list.', details: error.message });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required.' });
    }

    const normalized = items
      .map((entry) => ({
        item: String(entry.item || '').trim(),
        price: Number(entry.price || 0)
      }))
      .filter((entry) => entry.item);

    const hasInvalid = normalized.some((entry) => Number.isNaN(entry.price) || entry.price < 0);
    if (hasInvalid) {
      return res.status(400).json({ error: 'Invalid item price found.' });
    }

    await saveItemList(normalized);
    res.json({ message: 'Item List saved successfully.', count: normalized.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save item list.', details: error.message });
  }
});

app.post('/api/bills', async (req, res) => {
  try {
    const { billDate, customerName, phoneNumber, address, note, items, gst, discount } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required.' });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (normalizedPhone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be a valid 10-digit number.' });
    }

    const { bills, billItems, itemList } = await getAllData();
    const priceMap = getItemPriceMap(itemList);

    const normalizedItems = items.map((item, index) => {
      const itemName = String(item.item || '').trim();
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(priceMap[itemName]);
      const amount = quantity * unitPrice;

      return {
        slNo: Number(item.slNo ?? index + 1),
        item: itemName,
        quantity,
        unitPrice,
        amount
      };
    });

    const hasInvalidItem = normalizedItems.some(
      (item) =>
        !item.item ||
        Number.isNaN(item.quantity) ||
        Number.isNaN(item.unitPrice) ||
        Number.isNaN(item.amount)
    );

    if (hasInvalidItem) {
      return res.status(400).json({ error: 'Item not found in "Item List" sheet or invalid quantity.' });
    }

    const total = normalizedItems.reduce((sum, item) => sum + item.amount, 0);
    const selectedItems = normalizedItems.map((item) => `${item.item} x${item.quantity}`).join(', ');
    const gstPercent = Number(gst || 0);
    const discountPercent = Number(discount || 0);
    const gstAmount = (total * gstPercent) / 100;
    const discountAmount = (total * discountPercent) / 100;
    const amountPayable = total + gstAmount - discountAmount;

    const billId = buildBillId(bills, billDate);

    bills.push({
      billId,
      billDate: billDate || new Date().toISOString().slice(0, 10),
      customerName: customerName || 'Walk-in Customer',
      phoneNumber: normalizedPhone,
      address: String(address || ''),
      note: String(note || ''),
      selectedItems,
      total,
      gst: gstPercent,
      discount: discountPercent,
      amountPayable,
      createdAt: new Date().toISOString()
    });

    normalizedItems.forEach((item) => {
      billItems.push({
        billId,
        slNo: item.slNo,
        item: item.item,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount
      });
    });

    await saveBillsAndItems(bills, billItems);
    res.status(201).json({ message: 'Bill saved successfully.', billId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save bill.', details: error.message });
  }
});

app.post('/api/book-events', async (req, res) => {
  try {
    const { eventDay, eventName, customerName, phoneNumber, address, note, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required.' });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (normalizedPhone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be a valid 10-digit number.' });
    }

    const { itemList, bookEvents } = await getAllData();
    const priceMap = getItemPriceMap(itemList);

    const normalizedItems = items.map((entry) => ({
      item: String(entry.item || '').trim(),
      quantity: Number(entry.quantity || 0)
    }));

    const hasInvalidItem = normalizedItems.some(
      (entry) =>
        !entry.item ||
        !Object.prototype.hasOwnProperty.call(priceMap, entry.item) ||
        Number.isNaN(entry.quantity) ||
        entry.quantity <= 0
    );

    if (hasInvalidItem) {
      return res.status(400).json({ error: 'Select valid items from "Item List" and enter quantity.' });
    }

    const bookingId = `BE${String(getNextBookEventSequence(bookEvents)).padStart(4, '0')}`;
    const createdAt = new Date().toISOString();
    const safeEventDay = eventDay || new Date().toISOString().slice(0, 10);
    const safeEventName = String(eventName || '').trim();
    const safeCustomerName = String(customerName || '').trim() || 'Walk-in Customer';
    const safeAddress = String(address || '').trim();
    const safeNote = String(note || '').trim();

    const selectedItems = normalizedItems.map((entry) => `${entry.item} x${entry.quantity}`).join(', ');

    bookEvents.push({
      bookingId,
      eventDay: safeEventDay,
      event: safeEventName,
      name: safeCustomerName,
      phoneNumber: normalizedPhone,
      address: safeAddress,
      note: safeNote,
      item: selectedItems,
      quantity: '',
      selectedItems,
      createdAt
    });

    await saveBookEvents(bookEvents);
    res.status(201).json({ message: 'Book event saved successfully.', bookingId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save book event.', details: error.message });
  }
});

app.get('/api/book-events/next-booking-number', async (req, res) => {
  try {
    const { bookEvents } = await getAllData();
    const nextBookingId = `BE${String(getNextBookEventSequence(bookEvents)).padStart(4, '0')}`;
    res.json({ bookingId: nextBookingId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get next booking number.', details: error.message });
  }
});

app.get('/api/book-events', async (req, res) => {
  try {
    const { bookEvents } = await getAllData();
    const phoneFilter = normalizePhoneNumber(req.query.phoneNumber || '');

    const grouped = new Map();

    bookEvents.forEach((row) => {
      const bookingId = String(row.bookingId || '').trim();
      if (!bookingId) {
        return;
      }

      const phoneNumber = normalizePhoneNumber(row.phoneNumber || '');
      if (phoneFilter && !phoneNumber.includes(phoneFilter)) {
        return;
      }

      if (!grouped.has(bookingId)) {
        grouped.set(bookingId, {
          bookingId,
          eventDay: String(row.eventDay || ''),
          event: String(row.event || ''),
          name: String(row.name || ''),
          phoneNumber,
          address: String(row.address || ''),
          note: String(row.note || ''),
          createdAt: String(row.createdAt || ''),
          items: []
        });
      }

      const entry = grouped.get(bookingId);
      const parsedItems = parseBookEventItemsFromRow(row);
      parsedItems.forEach((item) => {
        entry.items.push(item);
      });
    });

    const result = [...grouped.values()]
      .map((entry) => ({
        ...entry,
        items: entry.items.filter((item) => item.item && Number.isFinite(item.quantity) && item.quantity > 0)
      }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read book events.', details: error.message });
  }
});

app.get('/api/bills', async (req, res) => {
  try {
    const { bills, billItems } = await getAllData();
    const phoneFilter = normalizePhoneNumber(req.query.phoneNumber || '');

    const result = bills
      .filter((bill) => {
        if (!phoneFilter) {
          return true;
        }

        const billPhone = normalizePhoneNumber(bill.phoneNumber || '');
        return billPhone.includes(phoneFilter);
      })
      .map((bill) => ({
        ...bill,
        items: billItems.filter((item) => item.billId === bill.billId)
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read bills.', details: error.message });
  }
});

app.listen(PORT, async () => {
  const mode = await getStorageMode();
  console.log(`Server running at http://localhost:${PORT} (${mode})`);
});
