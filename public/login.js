const authForm = document.getElementById('authForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const confirmPasswordField = document.getElementById('confirmPasswordField');
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordToggleBtn = document.getElementById('passwordToggleBtn');
const billToField = document.getElementById('billToField');
const billToInput = document.getElementById('billTo');
const authStatus = document.getElementById('authStatus');
const authHint = document.getElementById('authHint');
const adminStatus = document.getElementById('adminStatus');
const adminPanel = document.getElementById('adminPanel');
const adminBranchLabel = document.getElementById('adminBranchLabel');
const adminUsersList = document.getElementById('adminUsersList');
const pageTitle = document.getElementById('pageTitle');
const refreshPendingBtn = document.getElementById('refreshPendingBtn');
const continueBtn = document.getElementById('continueBtn');
const openAppBtn = document.getElementById('openAppBtn');
const modeRegisterBtn = document.getElementById('modeRegisterBtn');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const logoutInlineBtn = document.getElementById('logoutInlineBtn');

let authMode = 'login';
const BACKEND_BASE_URL = String(window.SAGARIKA_BACKEND_URL || '')
  .trim()
  .replace(/\/+$/, '');
const ALLOWED_NEXT_PAGES = new Set(['welcome.html', 'index.html', 'items.html', 'report.html', 'book-event.html']);

function getNextPage() {
  const params = new URLSearchParams(location.search);
  const requested = String(params.get('next') || '').trim();
  const safePage = requested.split('/').pop();
  if (ALLOWED_NEXT_PAGES.has(safePage)) {
    return safePage;
  }
  return 'welcome.html';
}

function redirectAfterLogin() {
  location.replace(getNextPage());
}

function setAuthSession(token, user) {
  sessionStorage.setItem('sagarika_auth', 'ok');
  sessionStorage.setItem('sagarika_token', token);
  sessionStorage.setItem('sagarika_user', user.username || '');
  sessionStorage.setItem('sagarika_role', user.role || 'user');
  sessionStorage.setItem('sagarika_bill_to', normalizeBillToLabel(user.billTo) || getEffectiveUserBillTo(user) || '');
}

function clearAuthSession() {
  sessionStorage.removeItem('sagarika_auth');
  sessionStorage.removeItem('sagarika_token');
  sessionStorage.removeItem('sagarika_user');
  sessionStorage.removeItem('sagarika_role');
  sessionStorage.removeItem('sagarika_bill_to');
}

function getAuthToken() {
  return sessionStorage.getItem('sagarika_token') || '';
}

function isAdminLoggedIn() {
  return (
    sessionStorage.getItem('sagarika_auth') === 'ok' &&
    sessionStorage.getItem('sagarika_role') === 'admin' &&
    Boolean(getAuthToken())
  );
}

function getLoggedInBranchLabel() {
  const savedBillTo = normalizeBillToLabel(sessionStorage.getItem('sagarika_bill_to'));
  if (savedBillTo) return savedBillTo;
  const username = String(sessionStorage.getItem('sagarika_user') || '').trim().toLowerCase();
  if (username === 'sagaraadmin' || username === 'sagarika') return 'SAGARA';
  if (username === 'pakshikereadmin' || username === 'loli') return 'PAKSHIKERE';
  return '';
}

function normalizeBillToLabel(value) {
  const billTo = String(value || '').trim().toUpperCase();
  if (billTo === 'PEKSHIKERE') {
    return 'PAKSHIKERE';
  }
  if (billTo === 'SAGARA' || billTo === 'PAKSHIKERE') {
    return billTo;
  }
  return '';
}

function getEffectiveUserBillTo(user) {
  const username = String(user?.username || '').trim().toLowerCase();
  if (username === 'sagaraadmin' || username === 'sagarika') {
    return 'SAGARA';
  }
  if (username === 'pakshikereadmin' || username === 'loli') {
    return 'PAKSHIKERE';
  }
  return normalizeBillToLabel(user?.billTo);
}

function filterVisibleAdminUsers(users) {
  const branchLabel = getLoggedInBranchLabel();
  const blockedUsers = new Set(['lolith']);

  return (Array.isArray(users) ? users : [])
    .filter((user) => {
      const username = String(user?.username || '').trim().toLowerCase();
      const role = String(user?.role || 'user').trim().toLowerCase();
      const billTo = getEffectiveUserBillTo(user);

      if (!username || blockedUsers.has(username)) {
        return false;
      }
      if (role === 'admin') {
        return false;
      }
      if (branchLabel && billTo !== branchLabel) {
        return false;
      }
      return true;
    })
    .sort((a, b) => String(a.username || '').localeCompare(String(b.username || '')));
}

function openAdminDashboardView() {
  const branchLabel = getLoggedInBranchLabel();
  authForm.reset();
  authForm.style.display = 'none';
  authSubmitBtn.style.display = 'none';
  modeRegisterBtn.style.display = 'none';
  continueBtn.style.display = 'none';
  continueBtn.textContent = 'Continue to App';
  if (openAppBtn) {
    openAppBtn.style.display = 'inline-flex';
  }
  authHint.style.display = 'none';
  if (adminBranchLabel) {
    if (branchLabel) {
      adminBranchLabel.textContent = branchLabel;
      adminBranchLabel.style.display = 'block';
    } else {
      adminBranchLabel.textContent = '';
      adminBranchLabel.style.display = 'none';
    }
  }
  if (pageTitle) {
    pageTitle.textContent = 'Sagarika Dashboard';
  }
  setStatus(authStatus, branchLabel ? `Showing ${branchLabel} users only.` : 'Showing users for this dashboard only.', false);
}

function openLoginView(message) {
  clearAuthSession();
  authForm.style.display = '';
  authSubmitBtn.style.display = '';
  modeRegisterBtn.style.display = '';
  continueBtn.style.display = 'none';
  continueBtn.textContent = 'Continue to App';
  if (openAppBtn) {
    openAppBtn.style.display = 'none';
  }
  logoutInlineBtn.style.display = 'none';
  authHint.style.display = '';
  adminPanel.style.display = 'none';
  adminUsersList.innerHTML = '';
  if (adminBranchLabel) {
    adminBranchLabel.textContent = '';
    adminBranchLabel.style.display = 'none';
  }
  if (pageTitle) {
    pageTitle.textContent = 'Sagarika Login';
  }
  setAuthMode('login');
  if (message) {
    setStatus(authStatus, message, true);
  }
}

function clearStatus() {
  authStatus.textContent = '';
  adminStatus.textContent = '';
}

function setStatus(el, text, isError) {
  el.textContent = text;
  el.style.color = isError ? '#b42a2a' : '#4caf50';
}

function syncPasswordToggleLabel() {
  if (!passwordInput || !passwordToggleBtn) {
    return;
  }
  const nextLabel = passwordInput.type === 'password' ? 'View Password' : 'Hide Password';
  passwordToggleBtn.setAttribute('aria-label', nextLabel);
  passwordToggleBtn.setAttribute('title', nextLabel);
}

function setAuthMode(mode) {
  authMode = mode === 'register' ? 'register' : 'login';

  const isRegister = authMode === 'register';
  modeRegisterBtn.classList.toggle('mode-btn-active', isRegister);
  modeRegisterBtn.textContent = isRegister ? 'Back to Login' : 'Create User';

  authSubmitBtn.textContent = isRegister ? 'Create User' : 'Login';
  authHint.textContent = isRegister
    ? 'New users require admin approval before first login.'
    : 'Admin and approved users can login.';
  passwordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
  if (confirmPasswordField) {
    confirmPasswordField.style.display = isRegister ? '' : 'none';
  }
  if (billToField) {
    billToField.style.display = isRegister ? '' : 'none';
  }
  if (confirmPasswordInput && !isRegister) {
    confirmPasswordInput.value = '';
  }
  if (billToInput && !isRegister) {
    billToInput.value = '';
  }
  clearStatus();
}

function withApiBase(path) {
  if (!path.startsWith('/api/')) {
    return path;
  }
  if (!BACKEND_BASE_URL) {
    return path;
  }
  return `${BACKEND_BASE_URL}${path}`;
}

async function fetchJson(url, options) {
  const finalUrl = withApiBase(url);
  let response;
  try {
    response = await fetch(finalUrl, options);
  } catch {
    if (BACKEND_BASE_URL) {
      throw new Error(`Cannot reach backend: ${BACKEND_BASE_URL}`);
    }
    throw new Error('Cannot reach server. Open the app via http://localhost:3000 and keep npm start running.');
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  let data = {};

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = {};
    }
  } else {
    try {
      await response.text();
    } catch {
      // ignore
    }
  }

  if (!response.ok) {
    if (response.status === 404 && url.startsWith('/api/')) {
      if (BACKEND_BASE_URL) {
        throw new Error(`API not found on backend: ${BACKEND_BASE_URL}`);
      }
      throw new Error('API not found. Restart server with latest code and open http://localhost:3000.');
    }
    if (response.status === 405 && url.startsWith('/api/')) {
      if (BACKEND_BASE_URL) {
        throw new Error(`API method blocked (HTTP 405) on backend: ${BACKEND_BASE_URL}`);
      }
      throw new Error('Login API method blocked (HTTP 405). Open the app from http://localhost:3000.');
    }
    throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
  }

  return data;
}

async function runAdminAction(url, payload, successMessage) {
  try {
    await fetchJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(payload)
    });
    setStatus(adminStatus, successMessage, false);
    await loadAdminUsers();
  } catch (error) {
    if (error.message === 'Unauthorized.') {
      openLoginView('Session expired. Please log in again.');
      return;
    }
    setStatus(adminStatus, error.message, true);
  }
}

function createActionButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function renderAdminUsers(users) {
  adminUsersList.innerHTML = '';

  if (!users.length) {
    adminUsersList.innerHTML = '<p style="margin:0;color:#5f7383;">No users found.</p>';
    return;
  }

  users.forEach((user) => {
    const row = document.createElement('div');
    row.className = 'pending-row';

    const main = document.createElement('div');
    main.className = 'user-row-main';
    main.innerHTML = `<strong>${user.username}</strong><span>(${user.role})</span><span>- ${user.status}</span><span>- Bill To: ${getEffectiveUserBillTo(user) || 'SAGARA'}</span>`;

    const actions = document.createElement('div');
    actions.className = 'user-row-actions';

    if (user.role !== 'admin') {
      if (user.status === 'pending') {
        actions.appendChild(
          createActionButton('Approve', 'btn btn-primary', async () => {
            await runAdminAction('/api/auth/approve-user', { username: user.username }, `Approved: ${user.username}`);
          })
        );
      }

      if (user.status === 'disabled') {
        actions.appendChild(
          createActionButton('Enable', 'btn btn-secondary', async () => {
            await runAdminAction('/api/auth/enable-user', { username: user.username }, `Enabled: ${user.username}`);
          })
        );
      } else {
        actions.appendChild(
          createActionButton('Disable', 'btn', async () => {
            if (!confirm(`Disable user "${user.username}"?`)) return;
            await runAdminAction('/api/auth/disable-user', { username: user.username }, `Disabled: ${user.username}`);
          })
        );
      }

      actions.appendChild(
        createActionButton('Reset Password', 'btn btn-secondary', async () => {
          const newPassword = prompt(`Enter new password for "${user.username}" (6+ chars):`, '');
          if (newPassword === null) return;
          await runAdminAction(
            '/api/auth/reset-password',
            { username: user.username, newPassword },
            `Password reset: ${user.username}`
          );
        })
      );

      actions.appendChild(
        createActionButton('Delete', 'btn btn-danger', async () => {
          if (!confirm(`Delete user "${user.username}" permanently?`)) return;
          await runAdminAction('/api/auth/delete-user', { username: user.username }, `Deleted: ${user.username}`);
        })
      );
    }

    row.append(main, actions);
    adminUsersList.appendChild(row);
  });
}

async function loadAdminUsers() {
  if (!isAdminLoggedIn()) {
    adminPanel.style.display = 'none';
    return;
  }

  adminPanel.style.display = 'block';
  try {
    const users = await fetchJson('/api/auth/users', {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`
      }
    });
    renderAdminUsers(filterVisibleAdminUsers(users));
  } catch (error) {
    if (error.message === 'Unauthorized.') {
      openLoginView('Session expired. Please log in again.');
      return;
    }
    setStatus(adminStatus, error.message, true);
  }
}

const hasActiveSession = sessionStorage.getItem('sagarika_auth') === 'ok';
const shouldOpenAdminDashboard = isAdminLoggedIn();

if (hasActiveSession) {
  logoutInlineBtn.style.display = 'inline-flex';
  if (shouldOpenAdminDashboard) {
    openAdminDashboardView();
    loadAdminUsers();
  } else {
    redirectAfterLogin();
  }
}

modeRegisterBtn.addEventListener('click', () => {
  setAuthMode(authMode === 'register' ? 'login' : 'register');
});

continueBtn.addEventListener('click', () => {
  redirectAfterLogin();
});

if (openAppBtn) {
  openAppBtn.addEventListener('click', () => {
    redirectAfterLogin();
  });
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatus();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
  const billTo = billToInput ? String(billToInput.value || '').trim().toUpperCase() : '';

  try {
    if (authMode === 'register') {
      if (!confirmPassword) {
        setStatus(authStatus, 'Please re-type the password before creating the user.', true);
        if (confirmPasswordInput) {
          confirmPasswordInput.focus();
        }
        return;
      }
      if (password !== confirmPassword) {
        setStatus(authStatus, 'Password and re-typed password do not match.', true);
        if (confirmPasswordInput) {
          confirmPasswordInput.focus();
          confirmPasswordInput.select();
        }
        return;
      }
      if (!billTo) {
        setStatus(authStatus, 'Please select the correct Bill To before creating the user.', true);
        if (billToInput) {
          billToInput.focus();
        }
        return;
      }
      const result = await fetchJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, billTo })
      });
      setStatus(authStatus, result.message || 'User created. Waiting for admin approval.', false);
      authForm.reset();
      if (isAdminLoggedIn()) {
        await loadAdminUsers();
      }
      return;
    }

    const result = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    setAuthSession(result.token, result.user || {});
    logoutInlineBtn.style.display = 'inline-flex';
    if ((result.user || {}).role === 'admin') {
      openAdminDashboardView();
      await loadAdminUsers();
      return;
    }

    redirectAfterLogin();
  } catch (error) {
    setStatus(authStatus, error.message, true);
  }
});

refreshPendingBtn.addEventListener('click', async () => {
  setStatus(adminStatus, '', false);
  await loadAdminUsers();
});

if (shouldOpenAdminDashboard) {
  authMode = 'register';
} else {
  setAuthMode('login');
}

if (passwordToggleBtn && passwordInput) {
  passwordToggleBtn.addEventListener('click', () => {
    passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
    syncPasswordToggleLabel();
  });
  syncPasswordToggleLabel();
}
