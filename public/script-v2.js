const itemsBody = document.getElementById('itemsBody');
const billItemOptions = document.getElementById('billItemOptions');
const addItemBtn = document.getElementById('addItemBtn');
const subjectBtn = document.getElementById('subjectBtn');
const billingDeskCard = document.querySelector('.billing-desk-card');
const billingDeskKicker = document.getElementById('billingDeskKicker');
const billingDeskTitle = document.getElementById('billingDeskTitle');
const billingDeskTopActions = document.getElementById('billingDeskTopActions');
const billingDeskSearchRow = document.getElementById('billingDeskSearchRow');
const billingModeRow = document.querySelector('.billing-mode-row');
const billForm = document.getElementById('billForm');
const customerNameInput = document.getElementById('customerName');
const customerDetailInput = document.getElementById('customerDetail');
const gstNoInput = document.getElementById('gstNo');
const eWayInput = document.getElementById('eWay');
const addressInput = document.getElementById('address');
const totalInput = document.getElementById('total');
const gstInput = document.getElementById('gst');
const discountInput = document.getElementById('discount');
const amountPayableInput = document.getElementById('amountPayable');
const statusMsg = document.getElementById('statusMsg');
const billNumberInput = document.getElementById('billNumber');
const billDateInput = document.getElementById('billDate');
const eventDayInput = document.getElementById('eventDay');
const phoneNumberInput = document.getElementById('phoneNumber');
const searchPhoneInput = document.getElementById('searchPhone');
const noGstModeBtn = document.getElementById('noGstModeBtn');
const withGstModeBtn = document.getElementById('withGstModeBtn');
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
const billSaveChoiceModal = document.getElementById('billSaveChoiceModal');
const updateBillChoiceBtn = document.getElementById('updateBillChoiceBtn');
const newBillChoiceBtn = document.getElementById('newBillChoiceBtn');
const cancelBillChoiceBtn = document.getElementById('cancelBillChoiceBtn');
const duplicateBillModal = document.getElementById('duplicateBillModal');
const duplicateBillMessage = document.getElementById('duplicateBillMessage');
const duplicateCreateBtn = document.getElementById('duplicateCreateBtn');
const duplicateLoadBtn = document.getElementById('duplicateLoadBtn');
const duplicateCancelBtn = document.getElementById('duplicateCancelBtn');
const printExistingBillModal = document.getElementById('printExistingBillModal');
const printExistingBillBtn = document.getElementById('printExistingBillBtn');
const generateNewBillPrintBtn = document.getElementById('generateNewBillPrintBtn');
const cancelExistingBillPrintBtn = document.getElementById('cancelExistingBillPrintBtn');
const newBillItemModal = document.getElementById('newBillItemModal');
const newBillItemMessage = document.getElementById('newBillItemMessage');
const addNewBillItemBtn = document.getElementById('addNewBillItemBtn');
const removeNewBillItemBtn = document.getElementById('removeNewBillItemBtn');
const statusPopupModal = document.getElementById('statusPopupModal');
const statusPopupDialog = document.getElementById('statusPopupDialog');
const statusPopupTitle = document.getElementById('statusPopupTitle');
const statusPopupMessage = document.getElementById('statusPopupMessage');
const statusPopupOkBtn = document.getElementById('statusPopupOkBtn');
const ptBillNo = document.getElementById('ptBillNo');
const ptEWay = document.getElementById('ptEWay');
const ptDate = document.getElementById('ptDate');
const ptCustomer = document.getElementById('ptCustomer');
const ptPhone = document.getElementById('ptPhone');
const ptHeaderGstin = document.getElementById('ptHeaderGstin');
const ptHeaderPhones = document.getElementById('ptHeaderPhones');
const ptHeaderBrand = document.getElementById('ptHeaderBrand');
const ptHeaderAddress = document.getElementById('ptHeaderAddress');
const ptCustomerGstNo = document.getElementById('ptCustomerGstNo');
const ptAddress = document.getElementById('ptAddress');
const ptBankTitle = document.getElementById('ptBankTitle');
const ptBankLine1 = document.getElementById('ptBankLine1');
const ptBankLine2 = document.getElementById('ptBankLine2');
const ptBankLine3 = document.getElementById('ptBankLine3');
const ptBankLine4 = document.getElementById('ptBankLine4');
const ptBankLine5 = document.getElementById('ptBankLine5');
const ptSignLine1 = document.getElementById('ptSignLine1');
const ptSignLine2 = document.getElementById('ptSignLine2');
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
const BACKEND_BASE_URL = String(window.SAGARIKA_BACKEND_URL || '').trim().replace(/\/+$/, '');
const LOCAL_API_BASE = '/api';
const BILLING_PAGE_NAME = String(window.location.pathname.split('/').pop() || 'index.html').trim().toLowerCase();
const CURRENT_BILL_MODE =
  BILLING_PAGE_NAME === 'no-gst.html' ? 'no-gst' : BILLING_PAGE_NAME === 'with-gst.html' ? 'with-gst' : '';
const IS_BILL_MODE_SELECTOR_PAGE = !CURRENT_BILL_MODE;

let productPrices = {};
let storeItems = [];
let isSaveLocked = false;
let isSaving = false;
let isFormReadOnly = false;
let matchedBills = [];
let currentBillIndex = -1;
let currentBillId = '';
let nextBillNumber = '0001';
let loadedBillId = '';
let loadedBillSignature = '';
let requireExistingBillPrintChoice = false;
let matchedBookingsForImport = [];
let itemSuggestionMenu = null;
let activeItemInput = null;
let activeItemSuggestions = [];
let activeItemSuggestionIndex = -1;
let hideItemSuggestionTimer = null;
let pendingNavigationUrl = '';
let navigationSavingOverlay = null;
const DRAFT_STORAGE_KEY = 'sagarika_bill_draft_v1';
const THEME_STORAGE_KEY = 'sagarika_theme_v1';
const mobileSelectState = new WeakMap();

billDateInput.value = new Date().toISOString().slice(0, 10);
if (CURRENT_BILL_MODE === 'no-gst' && gstInput) {
  gstInput.value = '0';
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
}

function closeStatusPopup() {
  if (!statusPopupModal) {
    return;
  }

  statusPopupModal.classList.remove('is-open');
  statusPopupModal.setAttribute('aria-hidden', 'true');
}

function showStatusPopup(message, tone = 'error') {
  if (!statusPopupModal || !statusPopupDialog || !statusPopupTitle || !statusPopupMessage) {
    return;
  }

  const normalizedTone = tone === 'success' || tone === 'warning' ? tone : 'error';
  statusPopupDialog.classList.toggle('is-success', normalizedTone === 'success');
  statusPopupDialog.classList.toggle('is-error', normalizedTone === 'error');
  statusPopupDialog.classList.toggle('is-warning', normalizedTone === 'warning');
  statusPopupTitle.textContent =
    normalizedTone === 'success' ? 'Success' : normalizedTone === 'warning' ? 'Please Wait' : 'Attention';
  statusPopupMessage.textContent = String(message || '');
  statusPopupModal.classList.add('is-open');
  statusPopupModal.setAttribute('aria-hidden', 'false');

  if (statusPopupOkBtn) {
    statusPopupOkBtn.focus();
  }
}

function setStatusMessage(message, tone = 'error') {
  const normalizedMessage = String(message || '');
  statusMsg.textContent = normalizedMessage;
  statusMsg.dataset.tone = tone;
  if (!normalizedMessage) {
    return;
  }

  showStatusPopup(normalizedMessage, tone);
}

function clearStatusMessage() {
  statusMsg.textContent = '';
  delete statusMsg.dataset.tone;
  closeStatusPopup();
}

function withCurrentBillModeQuery(query = '') {
  const modeQuery = CURRENT_BILL_MODE ? `billMode=${encodeURIComponent(CURRENT_BILL_MODE)}` : '';
  return [String(query || '').trim(), modeQuery].filter(Boolean).join('&');
}

function setBillingDeskModeSelectionVisible(visible) {
  if (billingDeskCard) {
    billingDeskCard.classList.toggle('is-mode-select', visible);
  }
  if (billingModeRow) {
    billingModeRow.hidden = !visible;
    billingModeRow.style.display = visible ? 'flex' : 'none';
  }
  if (billingDeskKicker) {
    billingDeskKicker.hidden = visible;
  }
  if (billingDeskTitle) {
    billingDeskTitle.hidden = visible;
  }
  if (billingDeskTopActions) {
    billingDeskTopActions.hidden = visible;
  }
  if (billingDeskSearchRow) {
    billingDeskSearchRow.hidden = visible;
  }
  if (statusMsg) {
    statusMsg.hidden = visible;
  }
  if (billForm) {
    billForm.hidden = visible;
  }
}

if (statusPopupOkBtn) {
  statusPopupOkBtn.addEventListener('click', closeStatusPopup);
}

if (statusPopupModal) {
  statusPopupModal.addEventListener('click', (event) => {
    if (event.target === statusPopupModal) {
      closeStatusPopup();
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && statusPopupModal?.classList.contains('is-open')) {
    closeStatusPopup();
  }
});

window.addEventListener('beforeunload', (event) => {
  if (!isSaving) {
    return;
  }
  event.preventDefault();
  event.returnValue = 'Saving is in progress. Please wait until it finishes.';
});

function ensureMobileSelectUI(selectEl) {
  if (!selectEl) {
    return null;
  }
  const existing = mobileSelectState.get(selectEl);
  if (existing) {
    return existing;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'mobile-select-wrap';
  wrapper.style.display = 'none';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'mobile-select-trigger';
  trigger.textContent = 'Select';

  const menu = document.createElement('div');
  menu.className = 'mobile-select-menu';

  const closeMenu = () => {
    menu.style.display = 'none';
    wrapper.classList.remove('is-open');
  };

  trigger.addEventListener('click', () => {
    if (wrapper.style.display === 'none') {
      return;
    }
    const willOpen = menu.style.display !== 'block';
    menu.style.display = willOpen ? 'block' : 'none';
    wrapper.classList.toggle('is-open', willOpen);
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) {
      closeMenu();
    }
  });

  wrapper.append(trigger, menu);
  selectEl.insertAdjacentElement('afterend', wrapper);

  const state = { wrapper, trigger, menu, closeMenu };
  mobileSelectState.set(selectEl, state);
  return state;
}

function hideMobileSelectUI(selectEl) {
  const state = mobileSelectState.get(selectEl);
  if (!state) {
    return;
  }
  state.closeMenu();
  state.wrapper.style.display = 'none';
}

function syncMobileSelectUI(selectEl) {
  if (!selectEl) {
    return;
  }
  const state = ensureMobileSelectUI(selectEl);
  const hasOptions = selectEl.options.length > 0;
  const shouldBeVisible = selectEl.dataset.selectorVisible === '1';
  const useMobile = isMobileViewport() && shouldBeVisible && hasOptions;

  if (!shouldBeVisible) {
    hideMobileSelectUI(selectEl);
    selectEl.style.display = 'none';
    return;
  }

  if (!useMobile) {
    hideMobileSelectUI(selectEl);
    selectEl.style.display = 'block';
    return;
  }

  selectEl.style.display = 'none';
  state.wrapper.style.display = 'block';
  state.closeMenu();

  const selectedOption = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
  state.trigger.textContent = selectedOption ? selectedOption.textContent : 'Select';
  state.menu.innerHTML = [...selectEl.options]
    .map((option) => {
      const isSelected = option.value === selectEl.value;
      return `<button type="button" class="mobile-select-option${isSelected ? ' is-selected' : ''}" data-value="${escapeHtml(
        option.value
      )}">${escapeHtml(option.textContent || '')}</button>`;
    })
    .join('');

  [...state.menu.querySelectorAll('.mobile-select-option')].forEach((button) => {
    button.addEventListener('click', () => {
      const nextValue = button.getAttribute('data-value') || '';
      selectEl.value = nextValue;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      syncMobileSelectUI(selectEl);
    });
  });
}

function renderBillNumber() {
  if (!billNumberInput) {
    return;
  }
  const value = String(currentBillId || '').trim();
  billNumberInput.value = value || nextBillNumber;
}

function isManualBillNumberAllowed() {
  return CURRENT_BILL_MODE === 'with-gst';
}

async function refreshNextBillNumber() {
  try {
    const response = await authFetch(apiUrl('bills/next-bill-number', withCurrentBillModeQuery()));
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      return;
    }

    const fromApi = String(data?.billId || '').trim();
    if (fromApi) {
      nextBillNumber = fromApi;
      if (!String(currentBillId || '').trim()) {
        renderBillNumber();
      }
    }
  } catch {
    // Keep last known value.
  }
}

function getCurrentBillSnapshot() {
  const rows = [...itemsBody.querySelectorAll('tr')].map((row, index) => {
    if (row.dataset.rowType === 'subject') {
      return {
        rowType: 'subject',
        slNo: index + 1,
        subject: String(row.querySelector('.subject-row-input')?.value || '').trim()
      };
    }

    return {
      rowType: 'item',
      slNo: Number(row.querySelector('.slNo').value || index + 1),
      item: String(row.querySelector('.item').value || '').trim(),
      quantity: String(row.querySelector('.quantity').value || '').trim(),
      amount: Number(row.querySelector('.amount').value || 0)
    };
  });

  return JSON.stringify({
    billDate: String(billDateInput.value || '').trim(),
    eventDay: String(eventDayInput?.value || '').trim(),
    customerName: String(customerNameInput.value || '').trim(),
    customerDetail: String(customerDetailInput?.value || '').trim(),
    phoneNumber: onlyDigits(phoneNumberInput.value).slice(0, 10),
    gstNo: String(gstNoInput.value || '').trim(),
    eWay: String(eWayInput.value || '').trim(),
    address: String(addressInput.value || '').trim(),
    note: String(billNoteInput.value || '').trim(),
    gst: Number(gstInput.value || 0),
    discount: Number(discountInput.value || 0),
    items: rows
  });
}

function normalizeItemSignatureItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const name = String(item?.item || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const quantityRaw = formatQuantityForSavedRow(item?.quantity, item?.isManualAmount);
      const amount = Number(item?.amount || 0);
      if (!name) {
        return '';
      }
      if (isManualQuantity(quantityRaw)) {
        const manualQuantity = getManualQuantityLabel(quantityRaw);
        return Number.isFinite(amount) && amount > 0 ? `${name}:#${manualQuantity}:${amount.toFixed(2)}` : '';
      }
      const quantity = Number(item?.quantity || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return '';
      }
      return `${name}:${quantity.toFixed(3)}`;
    })
    .filter(Boolean)
    .sort()
    .join('|');
}

function markCurrentBillAsLoadedBase() {
  loadedBillId = String(currentBillId || '').trim();
  loadedBillSignature = loadedBillId ? getCurrentBillSnapshot() : '';
}

function resetLoadedBillBase() {
  loadedBillId = '';
  loadedBillSignature = '';
  requireExistingBillPrintChoice = false;
}

function hasLoadedBillChanges() {
  if (!loadedBillId || !loadedBillSignature) {
    return false;
  }
  return getCurrentBillSnapshot() !== loadedBillSignature;
}

function hasMeaningfulBillInput() {
  const hasTextInput =
    String(customerNameInput.value || '').trim() ||
    String(customerDetailInput?.value || '').trim() ||
    String(phoneNumberInput.value || '').trim() ||
    String(gstNoInput.value || '').trim() ||
    String(eWayInput.value || '').trim() ||
    String(addressInput.value || '').trim() ||
    String(billNoteInput.value || '').trim() ||
    String(eventDayInput?.value || '').trim();
  if (hasTextInput) {
    return true;
  }

  return [...itemsBody.querySelectorAll('tr')].some((row) => {
    if (row.dataset.rowType === 'subject') {
      return Boolean(String(row.querySelector('.subject-row-input')?.value || '').trim());
    }

    const itemName = String(row.querySelector('.item')?.value || '').trim();
    const qtyRaw = String(row.querySelector('.quantity')?.value || '').trim();
    const amountRaw = String(row.querySelector('.amount')?.value || '').trim();
    if (itemName) {
      return true;
    }
    if (qtyRaw && qtyRaw !== '#') {
      return true;
    }
    return Number(amountRaw || 0) > 0;
  });
}

function hasPendingBillChanges() {
  if (isSaving || isFormReadOnly || isSaveLocked) {
    return false;
  }
  if (loadedBillId) {
    return hasLoadedBillChanges();
  }
  return hasMeaningfulBillInput();
}

function ensureNavigationSavingOverlay() {
  if (navigationSavingOverlay) {
    return navigationSavingOverlay;
  }

  navigationSavingOverlay = document.createElement('div');
  navigationSavingOverlay.style.position = 'fixed';
  navigationSavingOverlay.style.inset = '0';
  navigationSavingOverlay.style.background = 'rgba(6, 22, 33, 0.55)';
  navigationSavingOverlay.style.display = 'none';
  navigationSavingOverlay.style.alignItems = 'center';
  navigationSavingOverlay.style.justifyContent = 'center';
  navigationSavingOverlay.style.zIndex = '9999';
  navigationSavingOverlay.style.backdropFilter = 'blur(1px)';

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
  spinner.style.animation = 'sagarikaNavSpin 0.8s linear infinite';
  spinner.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.textContent = 'Saving...';
  text.dataset.role = 'message';

  card.append(spinner, text);
  navigationSavingOverlay.appendChild(card);

  const style = document.createElement('style');
  style.textContent = '@keyframes sagarikaNavSpin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
  document.body.appendChild(navigationSavingOverlay);
  navigationSavingOverlay.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    showSavingInProgressWarning();
  });
  return navigationSavingOverlay;
}

function setNavigationSavingOverlay(visible, message = 'Saving...') {
  const overlay = ensureNavigationSavingOverlay();
  const textNode = overlay.querySelector('[data-role="message"]');
  if (textNode) {
    textNode.textContent = message;
  }
  overlay.style.display = visible ? 'flex' : 'none';
}

function showSavingInProgressWarning() {
  showStatusPopup('Saving is still in progress. Please wait until it finishes, then press OK.', 'warning');
}

function shouldHandleAutoSaveNavigation(link, event) {
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

async function navigateWithAutoSave(url) {
  if (!url) {
    return;
  }
  if (isSaving) {
    showSavingInProgressWarning();
    return;
  }
  if (!hasPendingBillChanges()) {
    location.href = url;
    return;
  }

  setNavigationSavingOverlay(true, 'Saving...');
  const result = await saveWithLoadedBillChoice('Saving before leaving...', 'Updating before leaving...');
  if (!result) {
    setNavigationSavingOverlay(false);
    return;
  }
  location.href = url;
}

window.sagarikaSaveBeforeLeave = async function sagarikaSaveBeforeLeave(saveLabel = 'Saving before leaving...') {
  if (isSaving) {
    showSavingInProgressWarning();
    return false;
  }
  if (!hasPendingBillChanges()) {
    return true;
  }
  setNavigationSavingOverlay(true, 'Saving...');
  const result = await saveWithLoadedBillChoice(saveLabel, 'Updating before leaving...');
  if (!result) {
    setNavigationSavingOverlay(false);
    return false;
  }
  return true;
};

function askSaveChoiceForLoadedBill() {
  return new Promise((resolve) => {
    if (!billSaveChoiceModal || !updateBillChoiceBtn || !newBillChoiceBtn || !cancelBillChoiceBtn) {
      resolve('update');
      return;
    }

    const cleanup = (result) => {
      billSaveChoiceModal.classList.remove('is-open');
      billSaveChoiceModal.setAttribute('aria-hidden', 'true');
      updateBillChoiceBtn.removeEventListener('click', onUpdate);
      newBillChoiceBtn.removeEventListener('click', onNew);
      cancelBillChoiceBtn.removeEventListener('click', onCancel);
      billSaveChoiceModal.removeEventListener('click', onBackdrop);
      resolve(result);
    };

    const onUpdate = () => cleanup('update');
    const onNew = () => cleanup('new');
    const onCancel = () => cleanup('cancel');
    const onBackdrop = (event) => {
      if (event.target === billSaveChoiceModal) {
        cleanup('cancel');
      }
    };

    updateBillChoiceBtn.addEventListener('click', onUpdate);
    newBillChoiceBtn.addEventListener('click', onNew);
    cancelBillChoiceBtn.addEventListener('click', onCancel);
    billSaveChoiceModal.addEventListener('click', onBackdrop);

    billSaveChoiceModal.classList.add('is-open');
    billSaveChoiceModal.setAttribute('aria-hidden', 'false');
  });
}

function askDuplicateBillChoice(existingBillId) {
  return new Promise((resolve) => {
    if (
      !duplicateBillModal ||
      !duplicateBillMessage ||
      !duplicateCreateBtn ||
      !duplicateLoadBtn ||
      !duplicateCancelBtn
    ) {
      resolve('create');
      return;
    }

    duplicateBillMessage.textContent = `Bill already generated. Existing Bill No: ${existingBillId}.`;

    const cleanup = (result) => {
      duplicateBillModal.classList.remove('is-open');
      duplicateBillModal.setAttribute('aria-hidden', 'true');
      duplicateCreateBtn.removeEventListener('click', onCreate);
      duplicateLoadBtn.removeEventListener('click', onLoad);
      duplicateCancelBtn.removeEventListener('click', onCancel);
      duplicateBillModal.removeEventListener('click', onBackdrop);
      resolve(result);
    };

    const onCreate = () => cleanup('create');
    const onLoad = () => cleanup('load');
    const onCancel = () => cleanup('cancel');
    const onBackdrop = (event) => {
      if (event.target === duplicateBillModal) {
        cleanup('cancel');
      }
    };

    duplicateCreateBtn.addEventListener('click', onCreate);
    duplicateLoadBtn.addEventListener('click', onLoad);
    duplicateCancelBtn.addEventListener('click', onCancel);
    duplicateBillModal.addEventListener('click', onBackdrop);

    duplicateBillModal.classList.add('is-open');
    duplicateBillModal.setAttribute('aria-hidden', 'false');
  });
}

function askPrintExistingBillChoice() {
  return new Promise((resolve) => {
    if (
      !printExistingBillModal ||
      !printExistingBillBtn ||
      !generateNewBillPrintBtn ||
      !cancelExistingBillPrintBtn
    ) {
      resolve('print');
      return;
    }

    const cleanup = (result) => {
      printExistingBillModal.classList.remove('is-open');
      printExistingBillModal.setAttribute('aria-hidden', 'true');
      printExistingBillBtn.removeEventListener('click', onPrint);
      generateNewBillPrintBtn.removeEventListener('click', onNew);
      cancelExistingBillPrintBtn.removeEventListener('click', onCancel);
      resolve(result);
    };

    const onPrint = () => cleanup('print');
    const onNew = () => cleanup('new');
    const onCancel = () => cleanup('cancel');

    printExistingBillBtn.addEventListener('click', onPrint);
    generateNewBillPrintBtn.addEventListener('click', onNew);
    cancelExistingBillPrintBtn.addEventListener('click', onCancel);

    printExistingBillModal.classList.add('is-open');
    printExistingBillModal.setAttribute('aria-hidden', 'false');
  });
}

function getMissingBillItemNames(items) {
  const seen = new Set();

  return (Array.isArray(items) ? items : [])
    .map((item) => String(item?.item || '').trim())
    .filter((itemName) => {
      if (!itemName || Object.prototype.hasOwnProperty.call(productPrices, itemName) || seen.has(itemName)) {
        return false;
      }

      seen.add(itemName);
      return true;
    });
}

function removeMissingBillItems(itemNames) {
  const targets = new Set((Array.isArray(itemNames) ? itemNames : []).map((item) => String(item || '').trim()).filter(Boolean));
  if (targets.size === 0) {
    return;
  }

  let firstClearedInput = null;
  itemsBody.querySelectorAll('tr').forEach((row) => {
    const itemInput = row.querySelector('.item');
    const amountInput = row.querySelector('.amount');
    if (!itemInput) {
      return;
    }

    const currentName = String(itemInput.value || '').trim();
    if (!targets.has(currentName)) {
      return;
    }

    itemInput.value = '';
    if (amountInput) {
      amountInput.value = '0.00';
    }
    if (!firstClearedInput) {
      firstClearedInput = itemInput;
    }
  });

  unlockSaveOnChange();
  recalculate();
  saveDraftToStorage();
  if (firstClearedInput) {
    firstClearedInput.focus();
  }
}

function askNewBillItemChoice(itemNames) {
  return new Promise((resolve) => {
    if (!newBillItemModal || !newBillItemMessage || !addNewBillItemBtn || !removeNewBillItemBtn) {
      resolve('add');
      return;
    }

    const names = (Array.isArray(itemNames) ? itemNames : []).filter(Boolean);
    const itemLabel = names.join(', ');
    newBillItemMessage.textContent =
      names.length > 1
        ? `New items will be added to Item List with price 0: ${itemLabel}`
        : `New item will be added to Item List with price 0: ${itemLabel}`;

    const cleanup = (choice) => {
      newBillItemModal.classList.remove('is-open');
      newBillItemModal.setAttribute('aria-hidden', 'true');
      addNewBillItemBtn.removeEventListener('click', onAdd);
      removeNewBillItemBtn.removeEventListener('click', onRemove);
      newBillItemModal.removeEventListener('click', onBackdrop);
      resolve(choice);
    };

    const onAdd = () => cleanup('add');
    const onRemove = () => cleanup('remove');
    const onBackdrop = (event) => {
      if (event.target === newBillItemModal) {
        cleanup(null);
      }
    };

    addNewBillItemBtn.addEventListener('click', onAdd);
    removeNewBillItemBtn.addEventListener('click', onRemove);
    newBillItemModal.addEventListener('click', onBackdrop);
    newBillItemModal.classList.add('is-open');
    newBillItemModal.setAttribute('aria-hidden', 'false');
  });
}

function normalizeBillDateForInput(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    return raw.slice(0, 10);
  }

  const compactDateMatch = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (compactDateMatch) {
    const first = Number(compactDateMatch[1]);
    const second = Number(compactDateMatch[2]);
    const yearRaw = Number(compactDateMatch[3]);

    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const monthFirst = first <= 12 && second > 12;
    const dayFirst = first > 12 && second <= 12;
    const month = monthFirst ? first : dayFirst ? second : first;
    const day = monthFirst ? second : dayFirst ? first : second;

    if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  const yyyy = String(parsed.getFullYear()).padStart(4, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function apiUrl(resource, query = '') {
  const resourceMap = {
    items: 'items',
    bills: 'bills',
    'book-events': 'book-events',
    bookevents: 'book-events',
    bookevent: 'book-events'
  };

  const normalizedResourceKey = String(resource || '').trim().toLowerCase();
  const normalizedResource = resourceMap[normalizedResourceKey] || normalizedResourceKey;
  const normalizedQuery = String(query || '').trim().replace(/^[?&]+/, '');
  const queryPart = normalizedQuery ? `?${normalizedQuery}` : '';
  const path = `${LOCAL_API_BASE}/${normalizedResource}${queryPart}`;
  if (!BACKEND_BASE_URL) {
    return path;
  }
  return `${BACKEND_BASE_URL}${path}`;
}

function getAuthToken() {
  return String(sessionStorage.getItem('sagarika_token') || '').trim();
}

function getActiveBillTo() {
  const savedBillTo = String(sessionStorage.getItem('sagarika_bill_to') || '').trim().toUpperCase();
  if (savedBillTo === 'PEKSHIKERE') return 'PAKSHIKERE';
  if (savedBillTo === 'SAGARA' || savedBillTo === 'PAKSHIKERE') return savedBillTo;
  return '';
}

function authFetch(url, options = {}) {
  const nextOptions = { ...options };
  const headers = { ...(nextOptions.headers || {}) };
  const token = getAuthToken();
  const finalUrl = String(url || '').startsWith('/api/') && BACKEND_BASE_URL ? `${BACKEND_BASE_URL}${url}` : url;
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
  return fetch(finalUrl, nextOptions).catch((error) => {
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

function isManualQuantity(value) {
  const raw = String(value || '').trim();
  return raw === '#' || raw.startsWith('#');
}

function toNumericQuantity(value) {
  const raw = String(value || '').trim();
  const normalized = isManualQuantity(raw) ? raw.slice(1).trim() : raw;
  if (!normalized) {
    return NaN;
  }
  return Number(normalized);
}

function getManualQuantityLabel(value) {
  const raw = String(value || '').trim();
  if (!isManualQuantity(raw)) {
    return raw;
  }

  const normalized = raw.slice(1).trim();
  return normalized || '--';
}

function formatQuantityForSavedRow(quantity, isManualAmount = false) {
  const raw = String(quantity ?? '').trim();
  if (raw.startsWith('#')) {
    return raw;
  }
  if (!isManualAmount) {
    return raw || '#';
  }
  return raw ? `#${raw}` : '#';
}

function ensureItemSuggestionMenu() {
  if (itemSuggestionMenu) {
    return itemSuggestionMenu;
  }

  itemSuggestionMenu = document.createElement('div');
  itemSuggestionMenu.className = 'item-suggestions-menu';
  itemSuggestionMenu.style.display = 'none';
  itemSuggestionMenu.addEventListener('mousedown', (event) => {
    const option = event.target.closest('.item-suggestions-option');
    if (!option) {
      return;
    }
    event.preventDefault();
    const index = Number(option.dataset.index);
    const selectedValue = activeItemSuggestions[index];
    if (!selectedValue) {
      return;
    }
    selectItemSuggestion(selectedValue);
  });
  document.body.appendChild(itemSuggestionMenu);
  return itemSuggestionMenu;
}

function getFilteredItemSuggestions(query) {
  const normalized = String(query || '').trim().toLowerCase();
  const unique = [...new Set(storeItems.map((name) => String(name || '').trim()).filter(Boolean))];
  if (!normalized) {
    return unique.slice(0, 12);
  }

  const startsWith = [];
  const includes = [];
  unique.forEach((name) => {
    const candidate = name.toLowerCase();
    if (candidate.startsWith(normalized)) {
      startsWith.push(name);
    } else if (candidate.includes(normalized)) {
      includes.push(name);
    }
  });

  return [...startsWith, ...includes].slice(0, 12);
}

function hideItemSuggestionMenu() {
  if (hideItemSuggestionTimer) {
    clearTimeout(hideItemSuggestionTimer);
    hideItemSuggestionTimer = null;
  }
  if (itemSuggestionMenu) {
    itemSuggestionMenu.style.display = 'none';
  }
  activeItemInput = null;
  activeItemSuggestions = [];
  activeItemSuggestionIndex = -1;
}

function queueHideItemSuggestionMenu() {
  if (hideItemSuggestionTimer) {
    clearTimeout(hideItemSuggestionTimer);
  }
  hideItemSuggestionTimer = setTimeout(() => {
    hideItemSuggestionMenu();
  }, 140);
}

function applyActiveItemSuggestionState() {
  if (!itemSuggestionMenu) {
    return;
  }
  [...itemSuggestionMenu.querySelectorAll('.item-suggestions-option')].forEach((option, index) => {
    option.classList.toggle('is-active', index === activeItemSuggestionIndex);
  });
}

function renderItemSuggestionMenu() {
  const menu = ensureItemSuggestionMenu();
  if (!activeItemInput || activeItemInput.disabled || isFormReadOnly || activeItemSuggestions.length === 0) {
    menu.style.display = 'none';
    return;
  }

  menu.innerHTML = activeItemSuggestions
    .map(
      (name, index) =>
        `<div class="item-suggestions-option${index === activeItemSuggestionIndex ? ' is-active' : ''}" data-index="${index}">${name}</div>`
    )
    .join('');

  const rect = activeItemInput.getBoundingClientRect();
  const gap = 6;
  menu.style.display = 'block';
  menu.style.visibility = 'hidden';
  menu.style.width = `${Math.max(rect.width, 180)}px`;

  const measuredHeight = menu.offsetHeight || 0;
  const minTop = 8;
  const maxTop = Math.max(minTop, window.innerHeight - measuredHeight - 8);
  const preferredTop = rect.top - measuredHeight - gap;
  const fallbackTop = Math.min(maxTop, rect.bottom + gap);
  const top = preferredTop >= minTop ? preferredTop : fallbackTop;
  const maxLeft = Math.max(8, window.innerWidth - menu.offsetWidth - 8);
  const left = Math.min(Math.max(8, rect.left), maxLeft);

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.visibility = 'visible';
}

function updateItemSuggestionMenu(inputElement) {
  if (!inputElement || inputElement.disabled || isFormReadOnly) {
    hideItemSuggestionMenu();
    return;
  }
  if (hideItemSuggestionTimer) {
    clearTimeout(hideItemSuggestionTimer);
    hideItemSuggestionTimer = null;
  }
  activeItemInput = inputElement;
  activeItemSuggestions = getFilteredItemSuggestions(inputElement.value);
  activeItemSuggestionIndex = activeItemSuggestions.length ? 0 : -1;
  renderItemSuggestionMenu();
}

function selectItemSuggestion(value) {
  if (!activeItemInput) {
    return;
  }
  activeItemInput.value = String(value || '');
  recalculate();
  unlockSaveOnChange();
  saveDraftToStorage();
  hideItemSuggestionMenu();
}

function onItemInputKeydown(event) {
  if (event.key === 'Escape') {
    hideItemSuggestionMenu();
    return;
  }

  if (!activeItemInput || activeItemInput !== event.target || activeItemSuggestions.length === 0) {
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeItemSuggestionIndex = (activeItemSuggestionIndex + 1) % activeItemSuggestions.length;
    applyActiveItemSuggestionState();
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeItemSuggestionIndex =
      (activeItemSuggestionIndex - 1 + activeItemSuggestions.length) % activeItemSuggestions.length;
    applyActiveItemSuggestionState();
    return;
  }

  if (event.key === 'Enter' && activeItemSuggestionIndex >= 0) {
    event.preventDefault();
    const selectedValue = activeItemSuggestions[activeItemSuggestionIndex];
    if (selectedValue) {
      selectItemSuggestion(selectedValue);
    }
  }
}

document.addEventListener('click', (event) => {
  if (!itemSuggestionMenu || itemSuggestionMenu.style.display === 'none') {
    return;
  }

  const clickTarget = event.target;
  if (clickTarget === activeItemInput || itemSuggestionMenu.contains(clickTarget)) {
    return;
  }

  hideItemSuggestionMenu();
});

window.addEventListener('resize', () => {
  if (activeItemInput) {
    renderItemSuggestionMenu();
  }
  syncMobileSelectUI(bookingSelect);
  syncMobileSelectUI(billSelect);
});

window.addEventListener(
  'scroll',
  () => {
    if (activeItemInput) {
      renderItemSuggestionMenu();
    }
  },
  true
);

function createRow(item = { slNo: '', item: '', quantity: '#', amount: 0 }) {
  const row = document.createElement('tr');
  row.dataset.rowType = 'item';
  const selectedItemValue = String(item.item || '').trim();
  const quantityValue = item.quantity === undefined || item.quantity === null || item.quantity === '' ? '#' : item.quantity;
  const manualMode = isManualQuantity(quantityValue);

  row.innerHTML = `
    <td><input type="number" class="slNo" min="1" value="${escapeHtml(item.slNo)}" required /></td>
    <td>
      <input type="text" class="item" placeholder="Type item name" value="${escapeHtml(selectedItemValue)}" autocomplete="off" required />
    </td>
    <td><input type="text" class="quantity" value="${escapeHtml(quantityValue)}" placeholder="#" required /></td>
    <td><input type="number" class="amount" min="0" step="0.01" value="${escapeHtml(Number(item.amount || 0).toFixed(2))}" ${manualMode ? '' : 'readonly'} /></td>
    <td><button type="button" class="btn btn-danger remove-btn" aria-label="Remove item row" title="Remove item row">X</button></td>
  `;

  row.querySelector('.remove-btn').addEventListener('click', () => {
    row.remove();
    unlockSaveOnChange();
    recalculate();
    renumberRows();
    saveDraftToStorage();
    if (activeItemInput && !document.body.contains(activeItemInput)) {
      hideItemSuggestionMenu();
    }
  });

  const itemInput = row.querySelector('.item');
  itemInput.addEventListener('focus', () => updateItemSuggestionMenu(itemInput));
  itemInput.addEventListener('input', () => {
    recalculate();
    updateItemSuggestionMenu(itemInput);
  });
  itemInput.addEventListener('keydown', onItemInputKeydown);
  itemInput.addEventListener('blur', queueHideItemSuggestionMenu);
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

function moveRowByOffset(row, offset) {
  if (!row || !row.parentElement || !offset) {
    return;
  }

  const sibling = offset < 0 ? row.previousElementSibling : row.nextElementSibling;
  if (!sibling) {
    return;
  }

  if (offset < 0) {
    row.parentElement.insertBefore(row, sibling);
  } else {
    row.parentElement.insertBefore(sibling, row);
  }

  unlockSaveOnChange();
  recalculate();
  renumberRows();
  saveDraftToStorage();
}

let draggingSubjectRow = null;

function handleSubjectDragStart(event, row) {
  draggingSubjectRow = row;
  row.classList.add('is-dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', 'subject-row');
  }
}

function handleSubjectDragEnd(row) {
  row.classList.remove('is-dragging');
  draggingSubjectRow = null;
  unlockSaveOnChange();
  recalculate();
  renumberRows();
  saveDraftToStorage();
}

function createSubjectRow(value = '') {
  const row = document.createElement('tr');
  row.className = 'subject-row';
  row.dataset.rowType = 'subject';
  row.innerHTML = `
    <td class="subject-row-handle-cell">
      <button type="button" class="btn drag-handle-btn" draggable="true" aria-label="Drag subject row" title="Drag subject row">✋</button>
    </td>
    <td colspan="3">
      <input type="text" class="subject-row-input" placeholder="Write subject or any content" value="${escapeHtml(value)}" />
    </td>
    <td>
      <div class="subject-row-actions">
        <button type="button" class="btn btn-danger remove-btn" aria-label="Remove subject row" title="Remove subject row">X</button>
      </div>
    </td>
  `;

  const dragHandle = row.querySelector('.drag-handle-btn');
  dragHandle.addEventListener('dragstart', (event) => handleSubjectDragStart(event, row));
  dragHandle.addEventListener('dragend', () => handleSubjectDragEnd(row));

  row.querySelector('.remove-btn').addEventListener('click', () => {
    row.remove();
    unlockSaveOnChange();
    recalculate();
    renumberRows();
    saveDraftToStorage();
  });

  return row;
}

function renderItemSuggestions() {
  if (billItemOptions) {
    billItemOptions.innerHTML = storeItems.map((name) => `<option value="${name}"></option>`).join('');
  }

  if (activeItemInput) {
    updateItemSuggestionMenu(activeItemInput);
  }
}

function mergeItemUpdatesIntoStore(entries) {
  let changed = false;

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const itemName = String(entry?.item || '').trim();
    if (!itemName) {
      return;
    }

    const nextPrice = Number(entry?.price || 0);
    productPrices[itemName] = nextPrice;
    if (!storeItems.includes(itemName)) {
      storeItems.push(itemName);
    }
    changed = true;
  });

  if (changed) {
    storeItems.sort((left, right) => left.localeCompare(right));
    renderItemSuggestions();
  }
}

function buildItemPriceUpdateMessage(result) {
  const addedItems = Array.isArray(result?.addedItems) ? result.addedItems : [];
  const updatedItems = Array.isArray(result?.updatedItems) ? result.updatedItems : [];
  const parts = [];

  if (addedItems.length > 0) {
    const addedLabel = addedItems
      .map((entry) => `${String(entry?.item || '').trim()} (${Number(entry?.price || 0).toFixed(2)})`)
      .filter(Boolean)
      .join(', ');
    if (addedLabel) {
      parts.push(addedItems.length > 1 ? `New items added to Item List: ${addedLabel}.` : `New item added to Item List: ${addedLabel}.`);
    }
  }

  if (updatedItems.length > 0) {
    const updatedLabel = updatedItems
      .map((entry) => `${String(entry?.item || '').trim()} (${Number(entry?.price || 0).toFixed(2)})`)
      .filter(Boolean)
      .join(', ');
    if (updatedLabel) {
      parts.push(updatedItems.length > 1 ? `Item prices updated: ${updatedLabel}.` : `Item price updated: ${updatedLabel}.`);
    }
  }

  return parts.join(' ');
}

function renumberRows() {
  const rows = [...itemsBody.querySelectorAll('tr')].filter((row) => row.dataset.rowType !== 'subject');
  rows.forEach((row, index) => {
    const slNo = row.querySelector('.slNo');
    if (slNo) {
      slNo.value = index + 1;
    }
  });
}

function recalculate() {
  const rows = [...itemsBody.querySelectorAll('tr')].filter((row) => row.dataset.rowType !== 'subject');
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
  return [...itemsBody.querySelectorAll('tr')].map((row) => {
    if (row.dataset.rowType === 'subject') {
      return {
        rowType: 'subject',
        subject: String(row.querySelector('.subject-row-input')?.value || '').trim()
      };
    }

    return {
      rowType: 'item',
      slNo: Number(row.querySelector('.slNo').value),
      item: row.querySelector('.item').value.trim(),
      quantity: String(row.querySelector('.quantity').value || '').trim(),
      amount: Number(row.querySelector('.amount').value)
    };
  });
}

function isCompletelyBlankBillItem(item) {
  if (String(item?.rowType || 'item') === 'subject') {
    return !String(item?.subject || '').trim();
  }
  const itemName = String(item?.item || '').trim();
  const quantityRaw = String(item?.quantity || '').trim();
  const amount = Number(item?.amount || 0);
  return !itemName && (!quantityRaw || quantityRaw === '#') && amount <= 0;
}

function addDefaultRow() {
  const itemRowCount = [...itemsBody.querySelectorAll('tr')].filter((row) => row.dataset.rowType !== 'subject').length;
  itemsBody.appendChild(createRow({ slNo: itemRowCount + 1, item: '', quantity: '#', amount: 0 }));
  renumberRows();
}

function saveDraftToStorage() {
  try {
    const draft = {
      billDate: billDateInput.value || '',
      eventDay: eventDayInput?.value || '',
      customerName: customerNameInput.value || '',
      customerDetail: customerDetailInput?.value || '',
      phoneNumber: phoneNumberInput.value || '',
      gstNo: gstNoInput.value || '',
      eWay: eWayInput.value || '',
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

function setFormReadOnly(readOnly) {
  isFormReadOnly = readOnly;
  if (readOnly) {
    hideItemSuggestionMenu();
  }

  if (billNumberInput) {
    billNumberInput.readOnly = readOnly || !isManualBillNumberAllowed();
  }
  billDateInput.disabled = readOnly;
  if (eventDayInput) {
    eventDayInput.disabled = readOnly;
  }
  customerNameInput.readOnly = readOnly;
  if (customerDetailInput) {
    customerDetailInput.readOnly = readOnly;
  }
  phoneNumberInput.readOnly = readOnly;
  gstNoInput.readOnly = readOnly;
  eWayInput.readOnly = readOnly;
  addressInput.readOnly = readOnly;
  billNoteInput.readOnly = readOnly;
  gstInput.disabled = readOnly;
  discountInput.disabled = readOnly;
  if (subjectBtn) {
    subjectBtn.disabled = readOnly;
  }
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
    if (row.dataset.rowType === 'subject') {
      const subjectInput = row.querySelector('.subject-row-input');
      if (subjectInput) {
        subjectInput.readOnly = readOnly;
      }
      row.querySelector('.remove-btn').disabled = readOnly;
      return;
    }

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
  billSelect.dataset.selectorVisible = '0';
  billSelect.style.display = 'none';
  billSelect.innerHTML = '';
  hideMobileSelectUI(billSelect);
}

function formatBillDateForSelector(value) {
  const normalized = normalizeBillDateForInput(value);
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  const [yyyy, mm, dd] = normalized.split('-');
  return `${dd}/${mm}/${String(yyyy).slice(-2)}`;
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
      return `<option value="${index}">${escapeHtml(label)}</option>`;
    })
    .join('');

  billSelect.dataset.selectorVisible = '1';
  billSelect.style.display = 'block';
  syncMobileSelectUI(billSelect);
}

function populateBillForm(bill) {
  currentBillId = String(bill.billId || '');
  renderBillNumber();
  billDateInput.value = normalizeBillDateForInput(bill.billDate);
  if (eventDayInput) {
    eventDayInput.value = bill.eventDay ? normalizeBillDateForInput(bill.eventDay) : '';
  }
  customerNameInput.value = bill.customerName || '';
  if (customerDetailInput) {
    customerDetailInput.value = String(bill.customerDetail || '');
  }
  phoneNumberInput.value = onlyDigits(bill.phoneNumber || '').slice(0, 10);
  gstNoInput.value = String(bill.gstNo || '');
  eWayInput.value = String(bill.eWay || '');
  addressInput.value = String(bill.address || '');
  billNoteInput.value = String(bill.note || '');
  gstInput.value = Number(bill.gst || 0);
  discountInput.value = Number(bill.discount || 0);

  itemsBody.innerHTML = '';
  const rows = Array.isArray(bill.items) ? [...bill.items] : [];
  rows.sort((a, b) => Number(a.slNo || 0) - Number(b.slNo || 0));

  if (rows.length > 0) {
    rows.forEach((entry, index) => {
      if (String(entry.rowType || 'item') === 'subject') {
        itemsBody.appendChild(createSubjectRow(String(entry.subject || '')));
      } else {
        itemsBody.appendChild(
          createRow({
            slNo: Number(entry.slNo || index + 1),
            item: String(entry.item || ''),
            quantity: formatQuantityForSavedRow(entry.quantity, entry.isManualAmount),
            amount: Number(entry.amount || 0)
          })
        );
      }
    });
  }

  recalculate();
  isSaveLocked = false;
  setFormReadOnly(true);
  markCurrentBillAsLoadedBase();
  requireExistingBillPrintChoice = true;
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
  const raw = String(isoDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [yyyy, mm, dd] = raw.split('-');
    return `${dd}/${mm}/${String(yyyy).slice(-2)}`;
  }
  const d = new Date(raw || new Date().toISOString().slice(0, 10));
  if (Number.isNaN(d.getTime())) {
    return isoDate || '';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
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
  let nextItemSlNo = 1;
  const rows = [...itemsBody.querySelectorAll('tr')].map((row) => {
    if (row.dataset.rowType === 'subject') {
      return {
        rowType: 'subject',
        subject: String(row.querySelector('.subject-row-input')?.value || '').trim()
      };
    }

    const item = row.querySelector('.item').value || '';
    const quantityRaw = String(row.querySelector('.quantity').value || '').trim();
    const quantity = toNumericQuantity(quantityRaw);
    const amount = Number(row.querySelector('.amount').value || 0);
    const unitPrice = Number.isFinite(quantity) && quantity > 0 ? amount / quantity : Number(productPrices[item] || 0);
    return {
      rowType: 'item',
      slNo: nextItemSlNo++,
      item,
      quantityLabel: isManualQuantity(quantityRaw) ? getManualQuantityLabel(quantityRaw) : quantityRaw,
      unitPrice,
      amount
    };
  });

  return rows.filter((row) => (row.rowType === 'subject' ? row.subject : row.item));
}

function sanitizeFilenamePart(value, fallback) {
  const cleaned = String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

function getEventNameForFilename() {
  const note = String(billNoteInput.value || '');
  const match = note.match(/(?:^|\n)\s*Event:\s*(.+)\s*(?:\n|$)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return '';
}

function buildPrintFileName() {
  const customer = sanitizeFilenamePart(customerNameInput.value, 'Customer');
  const phone = sanitizeFilenamePart(onlyDigits(phoneNumberInput.value).slice(0, 10), 'Phone');
  const eventName = sanitizeFilenamePart(getEventNameForFilename(), 'Event');
  return `${customer}_${phone}_${eventName}`;
}

function printWithSuggestedFileName() {
  const originalTitle = document.title;
  document.title = buildPrintFileName();

  const restoreTitle = () => {
    document.title = originalTitle;
  };

  window.addEventListener('afterprint', restoreTitle, { once: true });
  window.print();

  // Fallback for browsers that don't fire afterprint reliably.
  setTimeout(restoreTitle, 1500);
}

function renderPrintTemplate() {
  const rows = buildPrintRows();
  const activeBillTo = getActiveBillTo();
  const total = rows.reduce((sum, row) => sum + (row.rowType === 'subject' ? 0 : Number(row.amount || 0)), 0);
  const gstPercent = Number(gstInput.value || 0);
  const discountPercent = Number(discountInput.value || 0);
  const discountAmount = (total * discountPercent) / 100;
  const sgstRate = gstPercent / 2;
  const cgstRate = gstPercent / 2;
  const sgstAmt = (total * sgstRate) / 100;
  const cgstAmt = (total * cgstRate) / 100;
  const grandTotal = total + sgstAmt + cgstAmt - discountAmount;

  const billNoRaw = String(currentBillId || '').trim();
  const legacyBillNoMatch = billNoRaw.match(/^SAG(\d{4})\d{4}$/);
  ptBillNo.textContent = legacyBillNoMatch ? legacyBillNoMatch[1] : billNoRaw || '0001';
  ptEWay.textContent = eWayInput.value.trim() || '........................................................';
  ptDate.textContent = formatDateForPrint(billDateInput.value);
  ptCustomer.textContent = customerNameInput.value || 'Walk-in Customer';
  ptPhone.textContent = phoneNumberInput.value || '-';
  if (ptHeaderGstin) {
    ptHeaderGstin.textContent = activeBillTo === 'PAKSHIKERE' ? '29AFVFS9308D1ZC' : '29AJQPR8127A1ZV.';
  }
  if (ptHeaderPhones) {
    ptHeaderPhones.textContent =
      activeBillTo === 'PAKSHIKERE' ? '9481922005 9880837710' : '9916279036 , 9483399099';
  }
  if (ptHeaderAddress) {
    ptHeaderAddress.textContent =
      activeBillTo === 'PAKSHIKERE'
        ? 'Door No-3-78(3) Sagarika Commercial Complex, Main Road, Pakshikere, Mangalore, DK-574146'
        : 'Subhash Nagara, Soraba Road, Chandramavina Koppalu, Raiway Cross, Sagara -577401, Shimoga Dist.';
  }
  if (ptHeaderBrand) {
    ptHeaderBrand.textContent =
      activeBillTo === 'PAKSHIKERE' ? 'SAGARIKA ENTERPRISES' : 'SAGARIKA SHAMIYANA & DECORATORS';
  }
  if (CURRENT_BILL_MODE === 'no-gst') {
    if (ptBankTitle) ptBankTitle.textContent = '';
    if (ptBankLine1) ptBankLine1.textContent = '';
    if (ptBankLine2) ptBankLine2.textContent = '';
    if (ptBankLine3) ptBankLine3.textContent = '';
    if (ptBankLine4) ptBankLine4.textContent = '';
    if (ptBankLine5) ptBankLine5.textContent = '';
    if (ptSignLine1) ptSignLine1.textContent = '';
    if (ptSignLine2) ptSignLine2.textContent = '';
  } else if (activeBillTo === 'PAKSHIKERE') {
    if (ptBankTitle) ptBankTitle.textContent = 'Bank Details:';
    if (ptBankLine1) ptBankLine1.textContent = 'A/c Type: Current Account';
    if (ptBankLine2) ptBankLine2.textContent = 'Branch: Kinnigoli';
    if (ptBankLine3) ptBankLine3.textContent = 'A/C Name: SAGARIKA ENTERPRISES';
    if (ptBankLine4) ptBankLine4.textContent = 'A/c No.: 37570200001493';
    if (ptBankLine5) ptBankLine5.textContent = 'IFSC Code: BARB0KINNIG (Fifth Digit Zero)';
    if (ptSignLine1) ptSignLine1.textContent = 'Signature';
    if (ptSignLine2) ptSignLine2.textContent = 'SAGARIKA ENTERPRISES';
  } else {
    if (ptBankTitle) ptBankTitle.textContent = 'Bank Details :';
    if (ptBankLine1) ptBankLine1.textContent = 'Account Name : SAGARIKA SHAMIYANA & DECORATERS';
    if (ptBankLine2) ptBankLine2.textContent = 'A/c No : 7122000100106701 ,';
    if (ptBankLine3) ptBankLine3.textContent = 'IFSC Code : KARB0000712';
    if (ptBankLine4) ptBankLine4.textContent = 'BANK : Karnataka Bank,';
    if (ptBankLine5) ptBankLine5.textContent = 'BRANCH : sagara , karnataka.';
    if (ptSignLine1) ptSignLine1.textContent = 'Girish R';
    if (ptSignLine2) ptSignLine2.textContent = 'AUTHORISED SIGNATORY';
  }
  ptCustomerGstNo.textContent = CURRENT_BILL_MODE === 'no-gst' ? '' : gstNoInput.value.trim() || '-';
  ptAddress.textContent = addressInput.value || '-';
  ptRows.innerHTML = '';

  const rowsToRender = Math.max(1, rows.length);
  for (let i = 0; i < rowsToRender; i += 1) {
    const row = rows[i];
    const tr = document.createElement('tr');
    if (row?.rowType === 'subject') {
      tr.className = 'print-subject-row';
      const slNoCell = document.createElement('td');
      slNoCell.className = 'print-subject-slno';
      slNoCell.textContent = '';
      tr.appendChild(slNoCell);

      const subjectCell = document.createElement('td');
      subjectCell.colSpan = 4;
      subjectCell.className = 'print-subject-box';
      subjectCell.textContent = row.subject || '';
      tr.appendChild(subjectCell);

      ptRows.appendChild(tr);
      continue;
    }
    const values = [
      row ? row.slNo : '',
      row ? row.item : '',
      row ? formatMoney(row.unitPrice) : '',
      row ? row.quantityLabel : '',
      row ? formatMoney(row.amount) : ''
    ];
    values.forEach((value) => {
      const td = document.createElement('td');
      td.textContent = String(value ?? '');
      tr.appendChild(td);
    });
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

  const rawNoteText = billNoteInput.value.trim();
  const noteText = rawNoteText.replace(/^note\s*[:\-]\s*/i, '');
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
    setStatusMessage('Bill is read-only. Click Edit to modify and save.');
    return null;
  }

  if (isSaveLocked) {
    setStatusMessage('Data already saved. Change any field to save again.');
    return null;
  }

  const rows = getItems().filter((item) => !isCompletelyBlankBillItem(item));
  const items = rows.filter((item) => item.rowType !== 'subject');
  if (items.length === 0) {
    setStatusMessage('Please add at least one item.');
    return null;
  }

  const phoneNumber = onlyDigits(phoneNumberInput.value).slice(0, 10);
  if (phoneNumber.length !== 10) {
    setStatusMessage('Enter a valid 10-digit phone number.');
    return null;
  }

  const hasInvalid = items.some((item) => {
    if (!item.item) {
      return true;
    }

    const numericQty = toNumericQuantity(item.quantity);
    const amount = Number(item.amount);

    if (isManualQuantity(item.quantity)) {
      const manualQuantityText = getManualQuantityLabel(item.quantity);
      if (manualQuantityText !== '--' && (!Number.isFinite(numericQty) || numericQty <= 0)) {
        return true;
      }
      return !Number.isFinite(amount) || amount <= 0;
    }

    return !Number.isFinite(numericQty) || numericQty <= 0 || !Number.isFinite(amount);
  });

  if (hasInvalid) {
    setStatusMessage('Enter an item name. Use quantity above 0, or use manual quantity like #1.2 with a manual amount above 0. Plain # will print as --.');
    return null;
  }

  const gstPercent = Number(gstInput.value || 0);
  const discountPercent = Number(discountInput.value || 0);
  if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) {
    setStatusMessage('GST must be between 0 and 100.');
    return null;
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    setStatusMessage('Discount must be between 0 and 100.');
    return null;
  }

  return {
    billId: isManualBillNumberAllowed() ? String(billNumberInput?.value || '').trim() : '',
    billDate: billDateInput.value,
    eventDay: eventDayInput?.value || '',
    billMode: CURRENT_BILL_MODE,
    customerName: customerNameInput.value.trim() || 'Walk-in Customer',
    customerDetail: String(customerDetailInput?.value || '').trim(),
    phoneNumber,
    gstNo: gstNoInput.value.trim(),
    eWay: eWayInput.value.trim(),
    address: addressInput.value.trim(),
    note: billNoteInput.value.trim(),
    items: rows.map((item) => {
      if (item.rowType === 'subject') {
        return {
          rowType: 'subject',
          subject: String(item.subject || '').trim()
        };
      }

      if (isManualQuantity(item.quantity)) {
        const manualAmount = Number(item.amount || 0);
        const manualQuantityLabel = getManualQuantityLabel(item.quantity);
        return {
          ...item,
          quantity: manualQuantityLabel === '--' ? '#' : manualQuantityLabel,
          amount: manualAmount,
          isManualAmount: true
        };
      }

      return {
        ...item,
        quantity: toNumericQuantity(item.quantity),
        amount: Number(item.amount || 0),
        isManualAmount: false
      };
    }),
    gst: gstPercent,
    discount: discountPercent
  };
}

function normalizeDateKey(value) {
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
  const yyyy = String(parsed.getFullYear()).padStart(4, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function findExistingBillForPayload(payload) {
  const phone = onlyDigits(payload?.phoneNumber || '').slice(0, 10);
  if (phone.length !== 10) {
    return null;
  }

  try {
    const response = await authFetch(apiUrl('bills', withCurrentBillModeQuery(`phoneNumber=${encodeURIComponent(phone)}`)));
    const data = await parseJsonResponse(response);
    if (!response.ok || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const payloadEventDay = normalizeDateKey(payload?.eventDay);
    const payloadBillDate = normalizeDateKey(payload?.billDate);
    const payloadCustomer = String(payload?.customerName || '').trim().toLowerCase();
    const payloadItemSignature = normalizeItemSignatureItems(payload?.items);

    const sameEventDay = data.find((bill) => {
      const billEventDay = normalizeDateKey(bill?.eventDay);
      const billCustomer = String(bill?.customerName || '').trim().toLowerCase();
      const billItemSignature = normalizeItemSignatureItems(bill?.items);
      return (
        payloadEventDay &&
        billEventDay &&
        payloadEventDay === billEventDay &&
        billCustomer === payloadCustomer &&
        billItemSignature === payloadItemSignature
      );
    });
    if (sameEventDay) {
      return sameEventDay;
    }

    return (
      data.find((bill) => {
        const billDate = normalizeDateKey(bill?.billDate);
        const billCustomer = String(bill?.customerName || '').trim().toLowerCase();
        const billItemSignature = normalizeItemSignatureItems(bill?.items);
        return (
          payloadBillDate &&
          billDate &&
          payloadBillDate === billDate &&
          billCustomer === payloadCustomer &&
          billItemSignature === payloadItemSignature
        );
      }) || null
    );
  } catch {
    return null;
  }
}

async function saveCurrentBill(saveLabel = 'Saving...', mode = 'create', options = {}) {
  const skipExistingCheck = Boolean(options?.skipExistingCheck);

  if (isSaving) {
    setStatusMessage('Save already in progress.');
    return null;
  }

  const payload = validateBillAndGetPayload();
  if (!payload) {
    return null;
  }

  const missingItemNames = getMissingBillItemNames(payload.items);
  if (missingItemNames.length > 0) {
    const choice = await askNewBillItemChoice(missingItemNames);
    if (choice === 'remove') {
      removeMissingBillItems(missingItemNames);
      setStatusMessage(
        missingItemNames.length > 1 ? 'New items removed from the bill rows.' : 'New item removed from the bill row.'
      );
      return null;
    }

    if (choice !== 'add') {
      setStatusMessage('Save cancelled.');
      return null;
    }
  }

  if (mode === 'create' && !loadedBillId && !skipExistingCheck) {
    const existingBill = await findExistingBillForPayload(payload);
    if (existingBill) {
      const existingBillId = String(existingBill.billId || '').trim() || '(unknown)';
      const choice = await askDuplicateBillChoice(existingBillId);
      if (choice === 'load') {
        populateBillForm(existingBill);
        setStatusMessage(`Existing bill loaded: ${existingBillId}.`, 'success');
        return null;
      }
      if (choice === 'cancel') {
        setStatusMessage('Save cancelled.');
        return null;
      }
    }
  }

  setSavingState(true, saveLabel);

  try {
    const isUpdateMode = mode === 'update' && loadedBillId;
    const endpoint = isUpdateMode ? apiUrl(`bills/${encodeURIComponent(loadedBillId)}`) : apiUrl('bills');
    const method = isUpdateMode ? 'PUT' : 'POST';

    const response = await authFetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(result.error || 'Failed to save bill.');
    }

    mergeItemUpdatesIntoStore(result?.addedItems);
    mergeItemUpdatesIntoStore(result?.updatedItems);
    const itemPriceUpdateMessage = buildItemPriceUpdateMessage(result);
    const successMessage = `${isUpdateMode ? 'Updated successfully.' : 'Saved successfully.'} Bill ID: ${result.billId}${
      itemPriceUpdateMessage ? ` ${itemPriceUpdateMessage}` : ''
    }`;
    setStatusMessage(successMessage, 'success');
    currentBillId = String(result.billId || currentBillId);
    renderBillNumber();
    markCurrentBillAsLoadedBase();
    if (!isUpdateMode) {
      await refreshNextBillNumber();
    }
    lockSaveAfterSuccess();
    requireExistingBillPrintChoice = false;
    saveDraftToStorage();
    setSavingState(false);
    return result;
  } catch (error) {
    setStatusMessage(error.message);
    setSavingState(false);
    return null;
  }
}

async function saveWithLoadedBillChoice(saveLabelForNew = 'Saving...', saveLabelForUpdate = 'Updating...') {
  if (!loadedBillId) {
    return saveCurrentBill(saveLabelForNew, 'create');
  }

  if (!hasLoadedBillChanges()) {
    setStatusMessage('No changes detected in this bill.', 'success');
    return { billId: loadedBillId, skipped: true };
  }

  const choice = await askSaveChoiceForLoadedBill();
  if (choice === 'cancel') {
    return null;
  }

  if (choice === 'update') {
    return saveCurrentBill(saveLabelForUpdate, 'update');
  }

  return saveCurrentBill(saveLabelForNew, 'create');
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
    const response = await authFetch(apiUrl('items'));
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
      setStatusMessage('No items found in Excel "Item List" sheet. Please add items and prices there.');
    }

    // Always start Billing Desk with a fresh empty form on page load.
    clearDraftFromStorage();
    itemsBody.innerHTML = '';
    recalculate();
    setFormReadOnly(false);
  } catch (error) {
    setStatusMessage(error.message);
  }
}

function matchesTextSearch(candidate, query) {
  return String(candidate || '').toLowerCase().includes(query);
}

function matchesNumberSearch(candidate, queryDigits) {
  if (!queryDigits) {
    return false;
  }
  return onlyDigits(candidate || '').includes(queryDigits);
}

function billMatchesSearchQuery(bill, rawQuery) {
  const query = String(rawQuery || '').trim().toLowerCase();
  const queryDigits = onlyDigits(rawQuery || '');
  if (!query) {
    return true;
  }

  return (
    matchesTextSearch(bill?.billId, query) ||
    matchesTextSearch(bill?.customerName, query) ||
    matchesNumberSearch(bill?.phoneNumber, queryDigits)
  );
}

function bookingMatchesSearchQuery(booking, rawQuery) {
  const query = String(rawQuery || '').trim().toLowerCase();
  const queryDigits = onlyDigits(rawQuery || '');
  if (!query) {
    return true;
  }

  if (query.startsWith('be')) {
    return matchesTextSearch(booking?.bookingId, query);
  }

  return (
    matchesTextSearch(booking?.bookingId, query) ||
    matchesTextSearch(booking?.name, query) ||
    matchesTextSearch(booking?.event, query) ||
    matchesNumberSearch(booking?.phoneNumber, queryDigits)
  );
}

async function searchBills(rawQuery) {
  const query = String(rawQuery || '').trim();
  if (!query) {
    setStatusMessage('Enter phone number, bill number, or name to search.');
    return;
  }

  try {
    matchedBookingsForImport = [];
    hideBookingSelector();

    const queryDigits = onlyDigits(query);
    const usePhoneFilter = queryDigits.length >= 7 && queryDigits.length === query.replace(/\D/g, '').length;
    const response = await authFetch(
      usePhoneFilter ? apiUrl('bills', withCurrentBillModeQuery(`phoneNumber=${encodeURIComponent(queryDigits)}`)) : apiUrl('bills', withCurrentBillModeQuery())
    );
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error((data && (data.error || data.details)) || 'Failed to search bills.');
    }

    const rows = Array.isArray(data) ? data : [];
    const filtered = usePhoneFilter ? rows : rows.filter((bill) => billMatchesSearchQuery(bill, query));

    if (filtered.length === 0) {
      matchedBills = [];
      currentBillIndex = -1;
      hideBillSelector();
      editBillBtn.disabled = true;
      setStatusMessage(`No bills found for "${query}".`);
      return;
    }

    matchedBills = filtered;
    currentBillIndex = 0;
    showBillSelector(matchedBills);
    billSelect.value = '0';
    syncMobileSelectUI(billSelect);

    const latestBill = matchedBills[currentBillIndex];
    populateBillForm(latestBill);
    setStatusMessage(`Found ${matchedBills.length} bill(s). Showing 1/${matchedBills.length}`, 'success');
  } catch (error) {
    matchedBills = [];
    currentBillIndex = -1;
    hideBillSelector();
    setStatusMessage('Failed to search bills.');
  }
}

async function fetchBookEventsByQuery(rawQuery) {
  const candidates = [
    '/api/book-events',
    apiUrl('book-events'),
    apiUrl('bookEvents'),
    apiUrl('bookevent')
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
      const response = await authFetch(url);
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
      return rows.map(normalizeBooking).filter((booking) => bookingMatchesSearchQuery(booking, rawQuery));
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
  if (eventDayInput) {
    eventDayInput.value = booking.eventDay ? normalizeBillDateForInput(booking.eventDay) : '';
  }
  customerNameInput.value = String(booking.name || '').trim();
  if (customerDetailInput) {
    customerDetailInput.value = '';
  }
  phoneNumberInput.value = onlyDigits(booking.phoneNumber || '').slice(0, 10);
  gstNoInput.value = String(booking.gstNo || '').trim();
  eWayInput.value = String(booking.eWay || '').trim();
  addressInput.value = String(booking.address || '').trim();
  billNoteInput.value = noteParts.join('\n');
  gstInput.value = 18;
  discountInput.value = 0;

  itemsBody.innerHTML = '';
  if (items.length > 0) {
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
  renderBillNumber();
  refreshNextBillNumber();
  resetLoadedBillBase();
  isSaveLocked = false;
  setFormReadOnly(false);
  recalculate();
  saveDraftToStorage();
}

async function loadBookingOrExistingBill(booking) {
  const existingBill = await findExistingBillForPayload({
    billDate: new Date().toISOString().slice(0, 10),
    eventDay: String(booking?.eventDay || '').trim(),
    customerName: String(booking?.name || '').trim(),
    phoneNumber: onlyDigits(booking?.phoneNumber || '').slice(0, 10),
    items: Array.isArray(booking?.items) ? booking.items : []
  });

  if (existingBill) {
    populateBillForm(existingBill);
    return;
  }

  const bookingId = String(booking?.bookingId || '').trim();
  loadBookingIntoBillForm(booking);
  setStatusMessage(bookingId ? `Loaded booking ${bookingId} into bill.` : 'Loaded booking into bill.', 'success');
}

function hideBookingSelector() {
  if (!bookingSelect) {
    return;
  }
  bookingSelect.dataset.selectorVisible = '0';
  bookingSelect.style.display = 'none';
  bookingSelect.innerHTML = '';
  hideMobileSelectUI(bookingSelect);
}

function showBookingSelector(bookings) {
  if (!bookingSelect) {
    return;
  }

  bookingSelect.innerHTML = bookings
    .map((booking, index) => {
      const bookingId = String(booking.bookingId || `Booking ${index + 1}`);
      const eventDay = formatDateForPrint(String(booking.eventDay || '').trim());
      const event = String(booking.event || '').trim();
      const name = String(booking.name || '').trim();
      const suffix = [eventDay, event, name].filter(Boolean).join(' | ');
      const label = suffix ? `${bookingId} | ${suffix}` : bookingId;
      return `<option value="${index}">${escapeHtml(label)}</option>`;
    })
    .join('');

  bookingSelect.dataset.selectorVisible = '1';
  bookingSelect.style.display = 'block';
  syncMobileSelectUI(bookingSelect);
}

async function importBookingByQuery(rawQuery) {
  const query = String(rawQuery || '').trim();
  if (!query) {
    setStatusMessage('Enter phone number, booking number, or name to load booking.');
    return;
  }

  try {
    matchedBills = [];
    currentBillIndex = -1;
    hideBillSelector();

    const bookings = await fetchBookEventsByQuery(query);
    if (bookings.length === 0) {
      matchedBookingsForImport = [];
      hideBookingSelector();
      setStatusMessage(`No bookings found for "${query}".`);
      return;
    }

    matchedBookingsForImport = bookings;
    showBookingSelector(bookings);
    bookingSelect.value = '0';
    syncMobileSelectUI(bookingSelect);
    const selectedBooking = matchedBookingsForImport[0];
    await loadBookingOrExistingBill(selectedBooking);
    if (!loadedBillId) {
      setStatusMessage(`${bookings.length} booking found. Loaded 1/${bookings.length}.`, 'success');
    }
  } catch (error) {
    matchedBookingsForImport = [];
    hideBookingSelector();
    setStatusMessage(error.message || 'Failed to load booking.');
  }
}

if (subjectBtn) {
  subjectBtn.addEventListener('click', () => {
    if (isFormReadOnly) {
      return;
    }
    const row = createSubjectRow('');
    itemsBody.appendChild(row);
    row.querySelector('.subject-row-input')?.focus();
    unlockSaveOnChange();
    recalculate();
    saveDraftToStorage();
  });
}

if (noGstModeBtn) {
  noGstModeBtn.addEventListener('click', () => {
    if (IS_BILL_MODE_SELECTOR_PAGE) {
      window.location.href = 'no-gst.html';
      return;
    }
    setStatusMessage('No GST mode is already open.', 'success');
  });
}

if (withGstModeBtn) {
  withGstModeBtn.addEventListener('click', () => {
    if (IS_BILL_MODE_SELECTOR_PAGE) {
      window.location.href = 'with-gst.html';
      return;
    }
    billForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    customerNameInput?.focus();
  });
}

if (itemsBody) {
  itemsBody.addEventListener('dragover', (event) => {
    if (!draggingSubjectRow) {
      return;
    }

    event.preventDefault();
    const targetRow = event.target.closest('tr');
    if (!targetRow || targetRow === draggingSubjectRow || targetRow.parentElement !== itemsBody) {
      return;
    }

    const rect = targetRow.getBoundingClientRect();
    const insertBefore = event.clientY < rect.top + rect.height / 2;
    if (insertBefore) {
      itemsBody.insertBefore(draggingSubjectRow, targetRow);
    } else {
      itemsBody.insertBefore(draggingSubjectRow, targetRow.nextElementSibling);
    }
  });

  itemsBody.addEventListener('drop', (event) => {
    if (!draggingSubjectRow) {
      return;
    }
    event.preventDefault();
  });
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
  searchBills(searchPhoneInput.value.trim());
});

if (loadBookingBtn) {
  loadBookingBtn.addEventListener('click', () => {
    matchedBills = [];
    currentBillIndex = -1;
    hideBillSelector();
    importBookingByQuery(searchPhoneInput.value.trim());
  });
}

if (bookingSelect) {
  bookingSelect.addEventListener('change', async () => {
    const selectedIndex = Number(bookingSelect.value);
    const selectedBooking = matchedBookingsForImport[selectedIndex];
    if (!selectedBooking) {
      return;
    }
    await loadBookingOrExistingBill(selectedBooking);
    syncMobileSelectUI(bookingSelect);
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
    setStatusMessage(`Found ${matchedBills.length} bill(s). Showing ${currentBillIndex + 1}/${matchedBills.length}`, 'success');
    syncMobileSelectUI(billSelect);
  });
}

editBillBtn.addEventListener('click', () => {
  setFormReadOnly(false);
  setStatusMessage('Edit mode enabled. You can now modify the bill.', 'success');
});

clearSearchBtn.addEventListener('click', () => {
  searchPhoneInput.value = '';
  billDateInput.value = new Date().toISOString().slice(0, 10);
  if (eventDayInput) {
    eventDayInput.value = '';
  }
  customerNameInput.value = '';
  if (customerDetailInput) {
    customerDetailInput.value = '';
  }
  phoneNumberInput.value = '';
  gstNoInput.value = '';
  eWayInput.value = '';
  addressInput.value = '';
  gstInput.value = 18;
  discountInput.value = 0;
  billNoteInput.value = '';
  itemsBody.innerHTML = '';
  currentBillId = '';
  renderBillNumber();
  refreshNextBillNumber();
  resetLoadedBillBase();
  isSaveLocked = false;
  setFormReadOnly(false);
  recalculate();
  matchedBills = [];
  currentBillIndex = -1;
  hideBillSelector();
  editBillBtn.disabled = true;
  clearStatusMessage();
  matchedBookingsForImport = [];
  hideBookingSelector();
  clearDraftFromStorage();
});

billForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatusMessage();
  await saveWithLoadedBillChoice('Saving...', 'Updating...');
});

printBillBtn.addEventListener('click', async () => {
  clearStatusMessage();

  if (isSaving) {
    setStatusMessage('Save already in progress.');
    return;
  }

  if (isSaveLocked || isFormReadOnly) {
    if (loadedBillId && !hasLoadedBillChanges()) {
      if (requireExistingBillPrintChoice) {
        const choice = await askPrintExistingBillChoice();
        if (choice === 'cancel') {
          return;
        }

        if (choice === 'new') {
          setFormReadOnly(false);
          isSaveLocked = false;
          currentBillId = '';
          renderBillNumber();
          resetLoadedBillBase();
          await refreshNextBillNumber();
          const result = await saveCurrentBill('Saving for Print...', 'create', { skipExistingCheck: true });
          if (result) {
            renderPrintTemplate();
            printWithSuggestedFileName();
          }
          return;
        }
      }

      renderPrintTemplate();
      printWithSuggestedFileName();
      return;
    }

    if (!loadedBillId) {
      renderPrintTemplate();
      printWithSuggestedFileName();
      return;
    }
  }

  if (loadedBillId && !hasLoadedBillChanges()) {
    if (requireExistingBillPrintChoice) {
      const choice = await askPrintExistingBillChoice();
      if (choice === 'cancel') {
        return;
      }

      if (choice === 'new') {
        setFormReadOnly(false);
        isSaveLocked = false;
        currentBillId = '';
        renderBillNumber();
        resetLoadedBillBase();
        await refreshNextBillNumber();
        const result = await saveCurrentBill('Saving for Print...', 'create', { skipExistingCheck: true });
        if (result) {
          renderPrintTemplate();
          printWithSuggestedFileName();
        }
        return;
      }
    }

    renderPrintTemplate();
    printWithSuggestedFileName();
    return;
  }

  const result = await saveWithLoadedBillChoice('Saving for Print...', 'Updating for Print...');
  if (result) {
    renderPrintTemplate();
    printWithSuggestedFileName();
  }
});

document.addEventListener(
  'click',
  (event) => {
    const link = event.target.closest('a[href]');
    if (!shouldHandleAutoSaveNavigation(link, event)) {
      return;
    }
    event.preventDefault();
    pendingNavigationUrl = link.href;
    navigateWithAutoSave(pendingNavigationUrl);
  },
  true
);

try {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
} catch {
  applyTheme('light');
}

setBillingDeskModeSelectionVisible(IS_BILL_MODE_SELECTOR_PAGE);
if (!IS_BILL_MODE_SELECTOR_PAGE) {
  loadItemsFromExcel();
  refreshNextBillNumber();
  renderBillNumber();
  hideBillSelector();
}
