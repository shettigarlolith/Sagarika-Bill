const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginStatus = document.getElementById('loginStatus');

function getNextPage() {
  const params = new URLSearchParams(location.search);
  const next = params.get('next') || 'index.html';
  return next.endsWith('.html') ? next : 'index.html';
}

function redirectAfterLogin() {
  location.replace(getNextPage());
}

if (sessionStorage.getItem('sagarika_auth') === 'ok') {
  redirectAfterLogin();
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim().toLowerCase();

  if (username === 'sagarika' && password === 'sagarika') {
    sessionStorage.setItem('sagarika_auth', 'ok');
    redirectAfterLogin();
    return;
  }

  loginStatus.textContent = 'Invalid username or password.';
  loginStatus.style.color = '#b42a2a';
});
