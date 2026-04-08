const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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

function resolveDataDir() {
  const configuredDir = String(process.env.SAGARIKA_DATA_DIR || '').trim();
  if (!configuredDir) {
    return path.join(__dirname, 'data');
  }
  return path.resolve(configuredDir);
}

const dataDir = resolveDataDir();
const excelPath = path.join(dataDir, 'bills.xlsx');

const MASTER_GOOGLE_SHEET_ID =
  process.env.GOOGLE_SHEET_ID || '1mW8betWY7QT4n1kCbIyWyedaNeUFzQGBXOmdc8-0ZkM';
const PAKSHIKERE_GOOGLE_SHEET_ID =
  process.env.PAKSHIKERE_GOOGLE_SHEET_ID || '19Rs--oEDMjZHr3XgmnZLlL8UMlloo853O4mLxB0zkXQ';
const GOOGLE_SERVICE_ACCOUNT_FILE =
  process.env.GOOGLE_SERVICE_ACCOUNT_FILE ||
  path.join(__dirname, 'credentials', 'google-service-account.json');
const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || '';
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || '';
const SESSION_SECRET =
  process.env.SAGARIKA_SESSION_SECRET ||
  process.env.SESSION_SECRET ||
  GOOGLE_PRIVATE_KEY ||
  GOOGLE_SERVICE_ACCOUNT_JSON ||
  'sagarika-local-session-secret';
const BUSINESS_SHEET_NAMES = ['Bills', 'BillItems', 'Item List', 'BookEvent'];
const MASTER_SHEET_NAMES = [...BUSINESS_SHEET_NAMES, 'Users'];
const PAKSHIKERE_SHEET_NAMES = [...BUSINESS_SHEET_NAMES, 'Users'];
const FIXED_ADMIN_USERS = [
  {
    username: 'sagaraadmin',
    billTo: 'SAGARA',
    passwordEnvVar: 'SAGARIKA_ADMIN_PASSWORD_SAGARA'
  },
  {
    username: 'pakshikereadmin',
    billTo: 'PAKSHIKERE',
    passwordEnvVar: 'SAGARIKA_ADMIN_PASSWORD_PAKSHIKERE'
  }
];
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

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
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'splash.html'));
});

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

function normalizeUserRecords(usersRaw) {
  const normalizeStatus = (value) => {
    const status = String(value || '').toLowerCase().trim();
    if (status === 'approved' || status === 'pending' || status === 'disabled') {
      return status;
    }
    return 'pending';
  };

  const normalizeBillTo = (value) => {
    const billTo = String(value || '').trim().toUpperCase();
    if (billTo === 'PEKSHIKERE') {
      return 'PAKSHIKERE';
    }
    if (billTo === 'SAGARA' || billTo === 'PAKSHIKERE') {
      return billTo;
    }
    return 'SAGARA';
  };

  return (Array.isArray(usersRaw) ? usersRaw : [])
    .map((row) => ({
      username: normalizeUsername(row.username),
      passwordHash: String(row.passwordHash || '').trim(),
      salt: String(row.salt || '').trim(),
      billTo: normalizeBillTo(row.billTo),
      role: String(row.role || 'user').toLowerCase() === 'admin' ? 'admin' : 'user',
      status: normalizeStatus(row.status),
      createdAt: String(row.createdAt || ''),
      approvedAt: String(row.approvedAt || ''),
      approvedBy: String(row.approvedBy || '')
    }))
    .filter((row) => row.username && row.passwordHash && row.salt);
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

  if (!workbook.SheetNames.includes('Users')) {
    writeSheet(workbook, 'Users', []);
    changed = true;
  }

  const existingUsers = normalizeUserRecords(readSheet(workbook, 'Users'));
  const ensuredUsers = ensureDefaultAdminUser(existingUsers);
  if (ensuredUsers.changed) {
    writeSheet(workbook, 'Users', ensuredUsers.users);
    changed = true;
  }

  if (changed) {
    XLSX.writeFile(workbook, excelPath);
  }

  return workbook;
}

function normalizePhoneNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  const directDigits = raw.replace(/\D/g, '');
  if (directDigits.length === 10) {
    return directDigits;
  }

  // Google Sheets may return large phone numbers in numeric/scientific format.
  const numeric = Number(raw.replace(/,/g, ''));
  if (Number.isFinite(numeric) && Math.abs(numeric) >= 1000000000) {
    const roundedDigits = String(Math.trunc(numeric)).replace(/\D/g, '');
    if (roundedDigits.length >= 10) {
      return roundedDigits.slice(-10);
    }
  }

  return directDigits;
}

function getNextBillSequence(bills) {
  let maxSeq = 0;

  bills.forEach((bill) => {
    const id = String(bill.billId || '').trim();
    const match = id.match(/^(?:SAG)?(\d{4})(?:\d{4})?$/);
    if (match) {
      const seq = Number(match[1]);
      if (!Number.isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  return maxSeq + 1;
}

function buildBillId(bills) {
  const sequence = getNextBillSequence(bills);
  return String(sequence).padStart(4, '0');
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

function appendMissingItemsToItemList(itemList, items) {
  const nextItemList = Array.isArray(itemList) ? [...itemList] : [];
  const existingNames = new Set(
    nextItemList
      .map((entry) => String(entry?.item || '').trim())
      .filter(Boolean)
  );
  const addedItems = [];

  (Array.isArray(items) ? items : []).forEach((entry) => {
    const itemName = String(entry?.item || '').trim();
    if (!itemName || existingNames.has(itemName)) {
      return;
    }

    const newEntry = { item: itemName, price: 0 };
    nextItemList.push(newEntry);
    addedItems.push(newEntry);
    existingNames.add(itemName);
  });

  return { itemList: nextItemList, addedItems };
}

function buildNormalizedBillPayload(body, itemList) {
  const { billDate, eventDay, customerName, phoneNumber, gstNo, eWay, address, note, items, gst, discount } = body || {};

  const rawItems = Array.isArray(items) ? items : [];
  const meaningfulItems = rawItems.filter((item) => {
    const itemName = String(item?.item || '').trim();
    const quantityRaw = String(item?.quantity ?? '').trim();
    const amount = Number(item?.amount || 0);
    return Boolean(itemName || (quantityRaw && quantityRaw !== '#') || amount > 0);
  });

  if (meaningfulItems.length === 0) {
    return { error: 'At least one item is required.' };
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  if (normalizedPhone.length !== 10) {
    return { error: 'Phone number must be a valid 10-digit number.' };
  }

  const priceMap = getItemPriceMap(itemList);

  const normalizedItems = meaningfulItems.map((item, index) => {
    const itemName = String(item.item || '').trim();
    const quantityRaw = String(item.quantity ?? '').trim();
    const quantity = quantityRaw === '#' ? '#' : Number(item.quantity || 0);
    const listedUnitPrice = Number(priceMap[itemName] || 0);
    const requestedAmount = Number(item.amount || 0);
    const isManualAmount = Boolean(item.isManualAmount) || quantityRaw === '#';
    let unitPrice = listedUnitPrice;
    let amount = isManualAmount ? requestedAmount : Number(quantity || 0) * unitPrice;

    if (isManualAmount && Number.isFinite(requestedAmount) && requestedAmount > 0) {
      amount = requestedAmount;
      if (typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0 && (!Number.isFinite(unitPrice) || unitPrice <= 0)) {
        unitPrice = requestedAmount / quantity;
      }
    }

    return {
      slNo: Number(item.slNo ?? index + 1),
      item: itemName,
      quantity,
      unitPrice,
      amount,
      isManualAmount
    };
  });

  const hasInvalidItem = normalizedItems.some(
    (item) =>
      !item.item ||
      (item.isManualAmount ? item.quantity !== '#' : Number.isNaN(item.quantity) || item.quantity <= 0) ||
      Number.isNaN(item.unitPrice) ||
      Number.isNaN(item.amount) ||
      (item.isManualAmount && item.amount <= 0)
  );

  if (hasInvalidItem) {
    return { error: 'Enter a valid item name, quantity, and manual amount.' };
  }

  const total = normalizedItems.reduce((sum, item) => sum + item.amount, 0);
  const selectedItems = normalizedItems.map((item) => `${item.item} x${item.quantity}`).join(', ');
  const gstPercent = Number(gst || 0);
  const discountPercent = Number(discount || 0);
  if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) {
    return { error: 'GST must be between 0 and 100.' };
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return { error: 'Discount must be between 0 and 100.' };
  }
  const gstAmount = (total * gstPercent) / 100;
  const discountAmount = (total * discountPercent) / 100;
  const amountPayable = total + gstAmount - discountAmount;

  return {
    data: {
      billDate: billDate || new Date().toISOString().slice(0, 10),
      eventDay: String(eventDay || '').trim(),
      customerName: customerName || 'Walk-in Customer',
      phoneNumber: normalizedPhone,
      gstNo: String(gstNo || '').trim(),
      eWay: String(eWay || '').trim(),
      address: String(address || ''),
      note: String(note || ''),
      selectedItems,
      total,
      gst: gstPercent,
      discount: discountPercent,
      amountPayable,
      normalizedItems
    }
  };
}

let sheetsClient = null;
let storageMode = null;
const activeSessions = new Map();
const GOOGLE_READ_CACHE_TTL_MS = Math.max(0, Number(process.env.GOOGLE_READ_CACHE_TTL_MS || 3000));
const googleSheetReadCache = new Map();

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeBillTo(value) {
  const billTo = String(value || '').trim().toUpperCase();
  if (billTo === 'PEKSHIKERE') {
    return 'PAKSHIKERE';
  }
  if (billTo === 'SAGARA' || billTo === 'PAKSHIKERE') {
    return billTo;
  }
  return 'SAGARA';
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password || ''), salt, 100000, 64, 'sha512').toString('hex');
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  return { salt, passwordHash };
}

function createUserRecord({ username, password, billTo = 'SAGARA', role = 'user', status = 'pending', approvedBy = '' }) {
  const normalizedUsername = normalizeUsername(username);
  const { salt, passwordHash } = createPasswordRecord(password);
  const now = new Date().toISOString();
  return {
    username: normalizedUsername,
    passwordHash,
    salt,
    billTo: normalizeBillTo(billTo),
    role,
    status,
    createdAt: now,
    approvedAt: status === 'approved' ? now : '',
    approvedBy: status === 'approved' ? approvedBy : ''
  };
}

function getFixedAdminBootstrapPassword(config) {
  return String(process.env[config?.passwordEnvVar] || '').trim();
}

function buildFixedAdminUser(config, password) {
  return createUserRecord({
    username: config.username,
    password,
    billTo: config.billTo,
    role: 'admin',
    status: 'approved',
    approvedBy: 'system'
  });
}

function sanitizeUser(user) {
  return {
    username: String(user.username || ''),
    billTo: normalizeBillTo(user.billTo),
    role: String(user.role || 'user'),
    status: String(user.status || 'pending'),
    createdAt: String(user.createdAt || ''),
    approvedAt: String(user.approvedAt || ''),
    approvedBy: String(user.approvedBy || '')
  };
}

function applyPresetUserBillTo(users) {
  let changed = false;
  const presetBillToByUsername = new Map([
    ['sagaraadmin', 'SAGARA'],
    ['pakshikereadmin', 'PAKSHIKERE'],
    ['sagarika', 'SAGARA'],
    ['loli', 'PAKSHIKERE']
  ]);

  users.forEach((user) => {
    const username = normalizeUsername(user.username);
    const presetBillTo = presetBillToByUsername.get(username);
    if (!presetBillTo) {
      return;
    }

    const nextBillTo = normalizeBillTo(presetBillTo);
    if (normalizeBillTo(user.billTo) !== nextBillTo) {
      user.billTo = nextBillTo;
      changed = true;
    }
  });

  return { users, changed };
}

function getFixedAdminBillTo(username) {
  const safeUsername = normalizeUsername(username);
  const config = FIXED_ADMIN_USERS.find((entry) => normalizeUsername(entry.username) === safeUsername);
  return config ? normalizeBillTo(config.billTo) : '';
}

function removeLegacyUsers(users) {
  const blockedUsers = new Set(['lolith']);
  const nextUsers = users.filter((user) => !blockedUsers.has(normalizeUsername(user.username)));
  return {
    users: nextUsers,
    changed: nextUsers.length !== users.length
  };
}

function ensureDefaultAdminUser(users) {
  let changed = false;

  const cleanedUsers = removeLegacyUsers(users);
  users = cleanedUsers.users;
  changed = cleanedUsers.changed;

  FIXED_ADMIN_USERS.forEach((config) => {
    const username = normalizeUsername(config.username);
    const existing = users.find((user) => normalizeUsername(user.username) === username);

    if (!existing) {
      const bootstrapPassword = getFixedAdminBootstrapPassword(config);
      if (!bootstrapPassword) {
        return;
      }
      users.push(buildFixedAdminUser(config, bootstrapPassword));
      changed = true;
      return;
    }

    if (existing.role !== 'admin') {
      existing.role = 'admin';
      changed = true;
    }

    if (existing.status !== 'approved') {
      existing.status = 'approved';
      existing.approvedAt = new Date().toISOString();
      existing.approvedBy = 'system';
      changed = true;
    }

    if (String(existing.approvedBy || '') !== 'system') {
      existing.approvedBy = 'system';
      changed = true;
    }

    const targetBillTo = normalizeBillTo(config.billTo);
    if (normalizeBillTo(existing.billTo) !== targetBillTo) {
      existing.billTo = targetBillTo;
      changed = true;
    }
  });

  const presetUsers = applyPresetUserBillTo(users);
  return { users: presetUsers.users, changed: changed || presetUsers.changed };
}

function createSession(user) {
  const fixedAdminBillTo = getFixedAdminBillTo(user.username);
  const payload = {
    username: String(user.username || ''),
    role: String(user.role || 'user'),
    billTo: fixedAdminBillTo || normalizeBillTo(user.billTo),
    createdAt: Date.now()
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url');
  const token = `${encodedPayload}.${signature}`;
  activeSessions.set(token, {
    ...payload
  });
  return token;
}

function getSessionFromRequest(req) {
  const authHeader = String(req.headers.authorization || '');
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1].trim();
  const cachedSession = activeSessions.get(token);
  if (cachedSession) {
    if (Date.now() - cachedSession.createdAt > SESSION_TTL_MS) {
      activeSessions.delete(token);
      return null;
    }
    return { token, ...cachedSession };
  }

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  const session = {
    username: String(payload?.username || ''),
    role: String(payload?.role || 'user'),
    billTo: normalizeBillTo(payload?.billTo),
    createdAt: Number(payload?.createdAt || 0)
  };

  if (!session.username || !session.createdAt) {
    return null;
  }

  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    return null;
  }

  activeSessions.set(token, session);
  return { token, ...session };
}

function requireAdmin(req, res, next) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permission required.' });
  }

  req.session = session;
  return next();
}

function requireAuth(req, res, next) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  req.session = session;
  return next();
}

function revokeUserSessions(username) {
  const safeUsername = normalizeUsername(username);
  for (const [token, session] of activeSessions.entries()) {
    if (normalizeUsername(session.username) === safeUsername) {
      activeSessions.delete(token);
    }
  }
}

function getBusinessSheetIdForBillTo(billTo) {
  return normalizeBillTo(billTo) === 'PAKSHIKERE' ? PAKSHIKERE_GOOGLE_SHEET_ID : MASTER_GOOGLE_SHEET_ID;
}

function getBusinessSheetIdForSession(session) {
  return getBusinessSheetIdForBillTo(session?.billTo);
}

function isSameBillToScope(session, user) {
  const fixedAdminBillTo = getFixedAdminBillTo(session?.username);
  const sessionBillTo = fixedAdminBillTo || normalizeBillTo(session?.billTo);
  return sessionBillTo === normalizeBillTo(user?.billTo);
}

function canAdminManageUser(session, user) {
  if (!session || !user) {
    return false;
  }
  if (String(user.role || 'user') === 'admin') {
    return false;
  }
  return isSameBillToScope(session, user);
}

function validatePasswordStrength(password) {
  if (password.length < 6 || password.length > 128) {
    return 'Password must be 6-128 characters long.';
  }
  return '';
}

function isGoogleConfigured() {
  const hasJson = Boolean(GOOGLE_SERVICE_ACCOUNT_JSON);
  const hasPair = Boolean(GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY);
  const hasFile = fs.existsSync(GOOGLE_SERVICE_ACCOUNT_FILE);
  return Boolean(googleLib && MASTER_GOOGLE_SHEET_ID && PAKSHIKERE_GOOGLE_SHEET_ID && (hasJson || hasPair || hasFile));
}

async function getSheetsClient() {
  if (!isGoogleConfigured()) {
    throw new Error('Google Sheets not configured.');
  }

  if (sheetsClient) {
    return sheetsClient;
  }

  const { google } = googleLib;
  let credentials;

  if (GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
  } else if (GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY) {
    credentials = {
      type: 'service_account',
      project_id: GOOGLE_PROJECT_ID || undefined,
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  } else {
    credentials = JSON.parse(fs.readFileSync(GOOGLE_SERVICE_ACCOUNT_FILE, 'utf8'));
  }

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

function parseBillItemsJson(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry, index) => ({
        slNo: Number(entry?.slNo ?? index + 1),
        item: String(entry?.item || '').trim(),
        quantity: String(entry?.quantity ?? '').trim() === '#' ? '#' : Number(entry?.quantity || 0),
        unitPrice: Number(entry?.unitPrice || 0),
        amount: Number(entry?.amount || 0),
        isManualAmount: Boolean(entry?.isManualAmount) || String(entry?.quantity ?? '').trim() === '#'
      }))
      .filter(
        (entry) =>
          entry.item &&
          Number.isFinite(entry.slNo) &&
          (entry.quantity === '#' || Number.isFinite(entry.quantity)) &&
          Number.isFinite(entry.unitPrice) &&
          Number.isFinite(entry.amount)
      );
  } catch {
    return [];
  }
}

function extractBillItemsFromRow(row) {
  const fromJson = parseBillItemsJson(row.itemsJson);
  if (fromJson.length > 0) {
    return fromJson;
  }

  const itemName = String(row.item || '').trim();
  if (!itemName) {
    return [];
  }

  const quantityRaw = String(row.quantity ?? '').trim();
  const quantity = quantityRaw === '#' ? '#' : Number(row.quantity || 0);
  const unitPrice = Number(row.unitPrice || 0);
  const amount = Number(row.amount || quantity * unitPrice);
  const slNo = Number(row.slNo || 1);
  const isManualAmount = Boolean(row.isManualAmount) || quantityRaw === '#';

  if (
    !(quantity === '#' || Number.isFinite(quantity)) ||
    !Number.isFinite(unitPrice) ||
    !Number.isFinite(amount) ||
    !Number.isFinite(slNo)
  ) {
    return [];
  }

  return [{ slNo, item: itemName, quantity, unitPrice, amount, isManualAmount }];
}

function getBillItemsForBillId(billItems, billId) {
  const rows = billItems.filter((entry) => String(entry.billId || '').trim() === String(billId || '').trim());
  const flatItems = rows.flatMap((row) => extractBillItemsFromRow(row));
  flatItems.sort((a, b) => Number(a.slNo || 0) - Number(b.slNo || 0));
  return flatItems;
}

function compactBillItemsRows(billItems) {
  const grouped = new Map();

  (Array.isArray(billItems) ? billItems : []).forEach((row) => {
    const billId = String(row.billId || '').trim();
    if (!billId) {
      return;
    }

    const items = extractBillItemsFromRow(row);
    if (!grouped.has(billId)) {
      grouped.set(billId, []);
    }
    grouped.get(billId).push(...items);
  });

  return [...grouped.entries()]
    .map(([billId, items]) => {
      const sortedItems = items
        .filter((item) => item.item)
        .sort((a, b) => Number(a.slNo || 0) - Number(b.slNo || 0))
        .map((item, index) => ({
          slNo: Number(item.slNo || index + 1),
          item: String(item.item || '').trim(),
          quantity: item.quantity === '#' ? '#' : Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          amount: Number(item.amount || 0),
          isManualAmount: Boolean(item.isManualAmount) || item.quantity === '#'
        }));

      return {
        billId,
        itemCount: sortedItems.length,
        itemsJson: JSON.stringify(sortedItems),
        updatedAt: new Date().toISOString()
      };
    })
    .sort((a, b) => a.billId.localeCompare(b.billId, undefined, { numeric: true, sensitivity: 'base' }));
}

async function ensureGoogleSheetsWorkbookFor(spreadsheetId, requiredSheets) {
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title'
  });

  const existing = new Set((meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean));
  const requests = (Array.isArray(requiredSheets) ? requiredSheets : [])
    .filter((title) => !existing.has(title))
    .map((title) => ({ addSheet: { properties: { title } } }));

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
  }
}

async function syncPakshikereUsersSheet(users) {
  const filteredUsers = (Array.isArray(users) ? users : []).filter(
    (user) => normalizeBillTo(user?.billTo) === 'PAKSHIKERE'
  );
  await writeGoogleRows('Users', filteredUsers, { spreadsheetId: PAKSHIKERE_GOOGLE_SHEET_ID });
}

async function syncGoogleUserSheets(users) {
  const allUsers = Array.isArray(users) ? users : [];
  const sagaraUsers = allUsers.filter((user) => normalizeBillTo(user?.billTo) !== 'PAKSHIKERE');
  await writeGoogleRows('Users', sagaraUsers, { spreadsheetId: MASTER_GOOGLE_SHEET_ID });
  await syncPakshikereUsersSheet(allUsers);
}

function dedupeUsersByUsername(users) {
  const byUsername = new Map();
  (Array.isArray(users) ? users : []).forEach((user) => {
    const username = normalizeUsername(user?.username);
    if (!username) {
      return;
    }
    byUsername.set(username, user);
  });
  return [...byUsername.values()];
}

async function ensureGoogleSheetsWorkbook() {
  await ensureGoogleSheetsWorkbookFor(MASTER_GOOGLE_SHEET_ID, MASTER_SHEET_NAMES);
  await ensureGoogleSheetsWorkbookFor(PAKSHIKERE_GOOGLE_SHEET_ID, PAKSHIKERE_SHEET_NAMES);

  const itemList = await readGoogleRows('Item List', { spreadsheetId: MASTER_GOOGLE_SHEET_ID });
  if (itemList.length === 0) {
    await writeGoogleRows('Item List', defaultItemList, { spreadsheetId: MASTER_GOOGLE_SHEET_ID });
  }

  const pakshikereItemList = await readGoogleRows('Item List', { spreadsheetId: PAKSHIKERE_GOOGLE_SHEET_ID });
  if (pakshikereItemList.length === 0) {
    await writeGoogleRows('Item List', defaultItemList, { spreadsheetId: PAKSHIKERE_GOOGLE_SHEET_ID });
  }

  const usersRaw = await readGoogleRows('Users', { spreadsheetId: MASTER_GOOGLE_SHEET_ID });
  const pakshikereUsersRaw = await readGoogleRows('Users', { spreadsheetId: PAKSHIKERE_GOOGLE_SHEET_ID });
  const users = dedupeUsersByUsername(normalizeUserRecords([...usersRaw, ...pakshikereUsersRaw]));
  const ensuredUsers = ensureDefaultAdminUser(users);
  await syncGoogleUserSheets(ensuredUsers.users);
}

async function readGoogleRows(sheetName, options = {}) {
  const spreadsheetId = String(options.spreadsheetId || MASTER_GOOGLE_SHEET_ID).trim();
  const cacheKey = `${spreadsheetId}::${String(sheetName || '').trim()}`;
  const now = Date.now();
  const cached = googleSheetReadCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.rows.map((row) => ({ ...row }));
  }

  const sheets = await getSheetsClient();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:ZZ20000`
  });
  const rows = valueMatrixToRows(result.data.values || []);
  if (GOOGLE_READ_CACHE_TTL_MS > 0) {
    googleSheetReadCache.set(cacheKey, {
      expiresAt: now + GOOGLE_READ_CACHE_TTL_MS,
      rows
    });
  }
  return rows.map((row) => ({ ...row }));
}

async function writeGoogleRows(sheetName, rows, options = {}) {
  const spreadsheetId = String(options.spreadsheetId || MASTER_GOOGLE_SHEET_ID).trim();
  const sheets = await getSheetsClient();
  const values = rowsToValueMatrix(rows);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:ZZ`
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values }
  });

  googleSheetReadCache.delete(`${spreadsheetId}::${String(sheetName || '').trim()}`);
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

async function getAllData(options = {}, session = null) {
  const {
    includeBills = true,
    includeBillItems = true,
    includeItemList = true,
    includeBookEvents = true
  } = options;
  const mode = await getStorageMode();

  if (mode === 'google') {
    const spreadsheetId = getBusinessSheetIdForSession(session);
    const googleOptions = { spreadsheetId };
    const billsRaw = includeBills ? await readGoogleRows('Bills', googleOptions) : [];
    const itemListRaw = includeItemList ? await readGoogleRows('Item List', googleOptions) : [];
    const billItemsRaw = includeBillItems ? await readGoogleRows('BillItems', googleOptions) : [];
    const bookEventsRaw = includeBookEvents ? await readGoogleRows('BookEvent', googleOptions) : [];

    const bills = includeBills ? normalizeNumericFields(billsRaw, ['total', 'gst', 'discount', 'amountPayable']) : [];
    const billItems = includeBillItems
      ? normalizeNumericFields(billItemsRaw, ['slNo', 'quantity', 'unitPrice', 'amount'])
      : [];
    const itemList = includeItemList ? normalizeNumericFields(itemListRaw, ['price']) : [];
    const bookEvents = includeBookEvents ? normalizeNumericFields(bookEventsRaw, ['quantity']) : [];

    return { mode, bills, billItems, itemList, bookEvents };
  }

  const workbook = ensureWorkbook();
  const bills = includeBills
    ? normalizeNumericFields(readSheet(workbook, 'Bills'), ['total', 'gst', 'discount', 'amountPayable'])
    : [];
  const billItems = includeBillItems
    ? normalizeNumericFields(readSheet(workbook, 'BillItems'), ['slNo', 'quantity', 'unitPrice', 'amount'])
    : [];
  const itemList = includeItemList ? normalizeNumericFields(readSheet(workbook, 'Item List'), ['price']) : [];
  const bookEvents = includeBookEvents ? normalizeNumericFields(readSheet(workbook, 'BookEvent'), ['quantity']) : [];
  return { mode, bills, billItems, itemList, bookEvents };
}

async function saveItemList(itemList, session = null) {
  const mode = await getStorageMode();
  if (mode === 'google') {
    await writeGoogleRows('Item List', itemList, { spreadsheetId: getBusinessSheetIdForSession(session) });
    return;
  }

  const workbook = ensureWorkbook();
  writeSheet(workbook, 'Item List', itemList);
  XLSX.writeFile(workbook, excelPath);
}

async function saveBillsAndItems(bills, billItems, session = null) {
  const compactedBillItems = compactBillItemsRows(billItems);

  const mode = await getStorageMode();
  if (mode === 'google') {
    const spreadsheetId = getBusinessSheetIdForSession(session);
    await writeGoogleRows('Bills', bills, { spreadsheetId });
    await writeGoogleRows('BillItems', compactedBillItems, { spreadsheetId });
    return;
  }

  const workbook = ensureWorkbook();
  writeSheet(workbook, 'Bills', bills);
  writeSheet(workbook, 'BillItems', compactedBillItems);
  XLSX.writeFile(workbook, excelPath);
}

async function saveBookEvents(bookEvents, session = null) {
  const mode = await getStorageMode();
  if (mode === 'google') {
    await writeGoogleRows('BookEvent', bookEvents, { spreadsheetId: getBusinessSheetIdForSession(session) });
    return;
  }

  const workbook = ensureWorkbook();
  writeSheet(workbook, 'BookEvent', bookEvents);
  XLSX.writeFile(workbook, excelPath);
}

async function getUsers() {
  const mode = await getStorageMode();
  if (mode === 'google') {
    const masterUsersRaw = await readGoogleRows('Users', { spreadsheetId: MASTER_GOOGLE_SHEET_ID });
    const pakshikereUsersRaw = await readGoogleRows('Users', { spreadsheetId: PAKSHIKERE_GOOGLE_SHEET_ID });
    const users = dedupeUsersByUsername(normalizeUserRecords([...masterUsersRaw, ...pakshikereUsersRaw]));
    const ensuredUsers = ensureDefaultAdminUser(users);
    await syncGoogleUserSheets(ensuredUsers.users);
    return ensuredUsers.users;
  }

  const workbook = ensureWorkbook();
  const users = normalizeUserRecords(readSheet(workbook, 'Users'));
  const ensuredUsers = ensureDefaultAdminUser(users);
  if (ensuredUsers.changed) {
    writeSheet(workbook, 'Users', ensuredUsers.users);
    XLSX.writeFile(workbook, excelPath);
  }
  return ensuredUsers.users;
}

async function saveUsers(users) {
  const mode = await getStorageMode();
  if (mode === 'google') {
    await syncGoogleUserSheets(users);
    return;
  }

  const workbook = ensureWorkbook();
  writeSheet(workbook, 'Users', users);
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const users = await getUsers();
    const user = users.find((row) => normalizeUsername(row.username) === username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const expectedHash = hashPassword(password, user.salt);
    if (expectedHash !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'User is disabled. Contact admin.' });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ error: 'User is pending admin approval.' });
    }

    const token = createSession(user);
    return res.json({
      message: 'Login successful.',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to login.', details: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || '');
    const billTo = normalizeBillTo(req.body?.billTo);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3-40 chars and can only include letters, numbers, dot, underscore, hyphen.'
      });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const users = await getUsers();
    const existing = users.find((row) => normalizeUsername(row.username) === username);
    if (existing) {
      if (existing.status === 'pending') {
        return res.status(409).json({ error: 'User already exists and is pending admin approval.' });
      }
      return res.status(409).json({ error: 'Username already exists.' });
    }

    users.push(createUserRecord({ username, password, billTo, role: 'user', status: 'pending' }));
    await saveUsers(users);

    return res.status(201).json({
      message: 'User created and waiting for admin approval.'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to register user.', details: error.message });
  }
});

app.get('/api/auth/pending-users', requireAdmin, async (req, res) => {
  try {
    const users = await getUsers();
    const pendingUsers = users
      .filter((user) => canAdminManageUser(req.session, user) && user.status === 'pending')
      .map((user) => sanitizeUser(user));

    return res.json(pendingUsers);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to read pending users.', details: error.message });
  }
});

app.post('/api/auth/approve-user', requireAdmin, async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const users = await getUsers();
    const user = users.find((row) => normalizeUsername(row.username) === username);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Admin user does not require approval.' });
    }

    if (!canAdminManageUser(req.session, user)) {
      return res.status(403).json({ error: 'You can only manage users in your own Bill To group.' });
    }

    if (user.status === 'approved') {
      return res.json({ message: 'User already approved.', user: sanitizeUser(user) });
    }

    user.status = 'approved';
    user.approvedAt = new Date().toISOString();
    user.approvedBy = String(req.session.username || '');

    await saveUsers(users);
    return res.json({ message: 'User approved successfully.', user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to approve user.', details: error.message });
  }
});

app.get('/api/auth/users', requireAdmin, async (req, res) => {
  try {
    const users = await getUsers();
    const result = users
      .filter((user) => canAdminManageUser(req.session, user))
      .map((user) => sanitizeUser(user))
      .sort((a, b) => a.username.localeCompare(b.username));
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to read users.', details: error.message });
  }
});

app.post('/api/auth/reset-password', requireAdmin, async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const newPassword = String(req.body?.newPassword || '');

    if (!username || !newPassword) {
      return res.status(400).json({ error: 'Username and newPassword are required.' });
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const users = await getUsers();
    const user = users.find((row) => normalizeUsername(row.username) === username);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Admin password cannot be reset from this action.' });
    }

    if (!canAdminManageUser(req.session, user)) {
      return res.status(403).json({ error: 'You can only manage users in your own Bill To group.' });
    }

    const { salt, passwordHash } = createPasswordRecord(newPassword);
    user.salt = salt;
    user.passwordHash = passwordHash;
    await saveUsers(users);
    revokeUserSessions(username);
    return res.json({ message: 'Password reset successfully.', user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reset password.', details: error.message });
  }
});

app.post('/api/auth/disable-user', requireAdmin, async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const users = await getUsers();
    const user = users.find((row) => normalizeUsername(row.username) === username);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Admin user cannot be disabled.' });
    }

    if (!canAdminManageUser(req.session, user)) {
      return res.status(403).json({ error: 'You can only manage users in your own Bill To group.' });
    }

    if (user.status === 'disabled') {
      return res.json({ message: 'User already disabled.', user: sanitizeUser(user) });
    }

    user.status = 'disabled';
    await saveUsers(users);
    revokeUserSessions(username);
    return res.json({ message: 'User disabled successfully.', user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to disable user.', details: error.message });
  }
});

app.post('/api/auth/enable-user', requireAdmin, async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const users = await getUsers();
    const user = users.find((row) => normalizeUsername(row.username) === username);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Admin user is always enabled.' });
    }

    if (!canAdminManageUser(req.session, user)) {
      return res.status(403).json({ error: 'You can only manage users in your own Bill To group.' });
    }

    if (user.status === 'approved') {
      return res.json({ message: 'User already enabled.', user: sanitizeUser(user) });
    }

    user.status = 'approved';
    if (!user.approvedAt) {
      user.approvedAt = new Date().toISOString();
    }
    if (!user.approvedBy) {
      user.approvedBy = String(req.session.username || '');
    }

    await saveUsers(users);
    return res.json({ message: 'User enabled successfully.', user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to enable user.', details: error.message });
  }
});

app.post('/api/auth/delete-user', requireAdmin, async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const users = await getUsers();
    const idx = users.findIndex((row) => normalizeUsername(row.username) === username);
    if (idx < 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (users[idx].role === 'admin') {
      return res.status(400).json({ error: 'Admin user cannot be deleted.' });
    }

    if (!canAdminManageUser(req.session, users[idx])) {
      return res.status(403).json({ error: 'You can only manage users in your own Bill To group.' });
    }

    const deleted = users[idx];
    users.splice(idx, 1);
    await saveUsers(users);
    revokeUserSessions(username);
    return res.json({ message: 'User deleted successfully.', user: sanitizeUser(deleted) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete user.', details: error.message });
  }
});

app.get('/api/items', requireAuth, async (req, res) => {
  try {
    const { itemList } = await getAllData({
      includeBills: false,
      includeBillItems: false,
      includeItemList: true,
      includeBookEvents: false
    }, req.session);
    const result = itemList
      .map((entry) => ({ item: String(entry.item || '').trim(), price: Number(entry.price || 0) }))
      .filter((entry) => entry.item)
      .sort((a, b) => a.item.localeCompare(b.item));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read item list.', details: error.message });
  }
});

app.post('/api/items', requireAuth, async (req, res) => {
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

    await saveItemList(normalized, req.session);
    res.json({ message: 'Item List saved successfully.', count: normalized.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save item list.', details: error.message });
  }
});

app.post('/api/bills', requireAuth, async (req, res) => {
  try {
    const { bills, billItems, itemList } = await getAllData({
      includeBills: true,
      includeBillItems: true,
      includeItemList: true,
      includeBookEvents: false
    }, req.session);
    const { itemList: nextItemList, addedItems } = appendMissingItemsToItemList(itemList, req.body?.items);
    const normalizedPayload = buildNormalizedBillPayload(req.body, nextItemList);
    if (normalizedPayload.error) {
      return res.status(400).json({ error: normalizedPayload.error });
    }
    const payload = normalizedPayload.data;

    if (addedItems.length > 0) {
      await saveItemList(nextItemList, req.session);
    }

    const billId = buildBillId(bills);

    bills.push({
      billId,
      billDate: payload.billDate,
      eventDay: payload.eventDay,
      customerName: payload.customerName,
      phoneNumber: payload.phoneNumber,
      gstNo: payload.gstNo,
      eWay: payload.eWay,
      address: payload.address,
      note: payload.note,
      selectedItems: payload.selectedItems,
      total: payload.total,
      gst: payload.gst,
      discount: payload.discount,
      amountPayable: payload.amountPayable,
      createdAt: new Date().toISOString()
    });

    billItems.push({
      billId,
      itemCount: payload.normalizedItems.length,
      itemsJson: JSON.stringify(payload.normalizedItems),
      updatedAt: new Date().toISOString()
    });

    await saveBillsAndItems(bills, billItems, req.session);
    res.status(201).json({ message: 'Bill saved successfully.', billId, addedItems });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save bill.', details: error.message });
  }
});

app.put('/api/bills/:billId', requireAuth, async (req, res) => {
  try {
    const billId = String(req.params.billId || '').trim();
    if (!billId) {
      return res.status(400).json({ error: 'Bill ID is required.' });
    }

    const { bills, billItems, itemList } = await getAllData({
      includeBills: true,
      includeBillItems: true,
      includeItemList: true,
      includeBookEvents: false
    }, req.session);
    const billIndex = bills.findIndex((bill) => String(bill.billId || '').trim() === billId);
    if (billIndex < 0) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    const { itemList: nextItemList, addedItems } = appendMissingItemsToItemList(itemList, req.body?.items);
    const normalizedPayload = buildNormalizedBillPayload(req.body, nextItemList);
    if (normalizedPayload.error) {
      return res.status(400).json({ error: normalizedPayload.error });
    }
    const payload = normalizedPayload.data;

    if (addedItems.length > 0) {
      await saveItemList(nextItemList, req.session);
    }

    const existing = bills[billIndex] || {};
    bills[billIndex] = {
      ...existing,
      billId,
      billDate: payload.billDate,
      eventDay: payload.eventDay,
      customerName: payload.customerName,
      phoneNumber: payload.phoneNumber,
      gstNo: payload.gstNo,
      eWay: payload.eWay,
      address: payload.address,
      note: payload.note,
      selectedItems: payload.selectedItems,
      total: payload.total,
      gst: payload.gst,
      discount: payload.discount,
      amountPayable: payload.amountPayable,
      createdAt: String(existing.createdAt || new Date().toISOString()),
      updatedAt: new Date().toISOString()
    };

    const nextBillItems = billItems.filter((row) => String(row.billId || '').trim() !== billId);
    nextBillItems.push({
      billId,
      itemCount: payload.normalizedItems.length,
      itemsJson: JSON.stringify(payload.normalizedItems),
      updatedAt: new Date().toISOString()
    });

    await saveBillsAndItems(bills, nextBillItems, req.session);
    res.json({ message: 'Bill updated successfully.', billId, addedItems });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bill.', details: error.message });
  }
});

app.post('/api/book-events', requireAuth, async (req, res) => {
  try {
    const { eventDay, eventName, customerName, phoneNumber, address, note, items, saveMode, bookingId: requestedBookingIdRaw } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required.' });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (normalizedPhone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be a valid 10-digit number.' });
    }

    const { itemList, bookEvents } = await getAllData({
      includeBills: false,
      includeBillItems: false,
      includeItemList: true,
      includeBookEvents: true
    }, req.session);
    const { itemList: nextItemList, addedItems } = appendMissingItemsToItemList(itemList, items);
    const priceMap = getItemPriceMap(nextItemList);

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
      return res.status(400).json({ error: 'Enter a valid item name and quantity.' });
    }

    if (addedItems.length > 0) {
      await saveItemList(nextItemList, req.session);
    }

    const requestedBookingId = String(requestedBookingIdRaw || '').trim();
    const normalizedSaveMode = String(saveMode || '').toLowerCase();
    let bookingId = `BE${String(getNextBookEventSequence(bookEvents)).padStart(4, '0')}`;

    if (normalizedSaveMode === 'overwrite' && requestedBookingId) {
      bookingId = requestedBookingId;
      for (let i = bookEvents.length - 1; i >= 0; i -= 1) {
        if (String(bookEvents[i].bookingId || '').trim() === bookingId) {
          bookEvents.splice(i, 1);
        }
      }
    }
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

    await saveBookEvents(bookEvents, req.session);
    res.status(201).json({ message: 'Book event saved successfully.', bookingId, addedItems });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save book event.', details: error.message });
  }
});

app.get('/api/book-events/next-booking-number', requireAuth, async (req, res) => {
  try {
    const { bookEvents } = await getAllData({
      includeBills: false,
      includeBillItems: false,
      includeItemList: false,
      includeBookEvents: true
    }, req.session);
    const nextBookingId = `BE${String(getNextBookEventSequence(bookEvents)).padStart(4, '0')}`;
    res.json({ bookingId: nextBookingId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get next booking number.', details: error.message });
  }
});

app.get('/api/bills/next-bill-number', requireAuth, async (req, res) => {
  try {
    const { bills } = await getAllData({
      includeBills: true,
      includeBillItems: false,
      includeItemList: false,
      includeBookEvents: false
    }, req.session);
    const billId = buildBillId(bills);
    res.json({ billId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get next bill number.', details: error.message });
  }
});

app.get('/api/book-events', requireAuth, async (req, res) => {
  try {
    const { bookEvents } = await getAllData({
      includeBills: false,
      includeBillItems: false,
      includeItemList: false,
      includeBookEvents: true
    }, req.session);
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

app.get('/api/bills', requireAuth, async (req, res) => {
  try {
    const { bills, billItems } = await getAllData({
      includeBills: true,
      includeBillItems: true,
      includeItemList: false,
      includeBookEvents: false
    }, req.session);
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
        items: getBillItemsForBillId(billItems, bill.billId)
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read bills.', details: error.message });
  }
});

function startServer(port = PORT) {
  return app.listen(port, async () => {
    const mode = await getStorageMode();
    console.log(`Server running at http://localhost:${port} (${mode})`);
  });
}

if (require.main === module) {
  startServer();
}

app.startServer = startServer;
module.exports = app;
