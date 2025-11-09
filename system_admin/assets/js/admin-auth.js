(function () {
  const ACCOUNTS_STORAGE_KEY = 'mock_accounts';
  const ADMIN_SESSION_KEY = 'admin_session';
  const CUSTOMER_SESSION_KEY = 'mock_session';

  function hashPassword(str) {
    let hash = 0;
    if (!str) return hash.toString();
    for (let i = 0; i < str.length; i += 1) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  function getAccounts() {
    if (typeof window !== 'undefined' && typeof window.__ensureMockSeed === 'function') {
      try {
        window.__ensureMockSeed();
      } catch (error) {
        console.warn('Failed to seed mock data before loading admin accounts:', error);
      }
    }
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('Unable to read accounts from storage:', error);
      return [];
    }
  }

  function findAdminAccountByIdentifier(identifier) {
    const key = (identifier || '').toString().trim().toLowerCase();
    if (!key) {
      return null;
    }
    const accounts = getAccounts();
    return accounts.find(acc =>
      acc.role === 'Admin' && (
        acc.username?.toLowerCase() === key ||
        acc.email?.toLowerCase() === key
      )
    ) || null;
  }

  function getActiveAdminAccount() {
    try {
      const rawSession = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!rawSession) {
        return null;
      }
      const session = JSON.parse(rawSession);
      if (!session || session.accountID === undefined) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        return null;
      }
      const accounts = getAccounts();
      const account = accounts.find(acc =>
        acc.role === 'Admin' && Number(acc.accountID) === Number(session.accountID)
      );
      if (!account) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        return null;
      }
      return account;
    } catch (error) {
      console.error('Failed to read admin session:', error);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }
  }

  function saveAdminSession(account) {
    const payload = {
      accountID: account.accountID,
      username: account.username,
      loggedInAt: new Date().toISOString()
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(payload));
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify({
      accountID: account.accountID,
      timestamp: Date.now(),
      scope: 'admin'
    }));
  }

  function clearAdminSession() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
  }

  function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
  }

  function updateWelcomeBanner(account) {
    const nameElement = document.getElementById('adminName');
    if (!nameElement) {
      return;
    }
    if (account) {
      const firstName = account.firstName || '';
      const lastNameInitial = account.lastName ? ` ${account.lastName}` : '';
      nameElement.textContent = (firstName + lastNameInitial).trim() || account.username || 'Admin';
    } else {
      nameElement.textContent = 'Admin';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('adminLoginContainer');
    const loginForm = document.getElementById('adminLoginForm');
    const usernameInput = document.getElementById('adminLoginUsername');
    const passwordInput = document.getElementById('adminLoginPassword');
    const errorMessage = document.getElementById('adminLoginError');
    const logoutButton = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('adminLogoutConfirmModal');
    const logoutCancelBtn = document.getElementById('adminLogoutCancelBtn');
    const logoutConfirmBtn = document.getElementById('adminLogoutConfirmBtn');
    const exitButton = document.getElementById('adminLoginExitBtn');

    if (!overlay || !loginForm || !usernameInput || !passwordInput) {
      return;
    }

    function showError(message) {
      if (!errorMessage) return;
      errorMessage.textContent = message || '';
      if (message) {
        errorMessage.classList.add('is-visible');
      } else {
        errorMessage.classList.remove('is-visible');
      }
    }

    function toggleOverlay(visible) {
      overlay.classList.toggle('is-visible', visible);
      overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
      if (visible) {
        requestAnimationFrame(() => {
          usernameInput.focus();
        });
      } else {
        showError('');
      }
    }

    function handleSuccessfulLogin(account) {
      saveAdminSession(account);
      updateWelcomeBanner(account);
      toggleOverlay(false);
      showError('');
      loginForm.reset();
    }

    function handleExit() {
      clearAdminSession();
      updateWelcomeBanner(null);
      toggleOverlay(true);
      window.location.href = '../customer_portal/index.html';
    }

    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const identifier = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      if (!identifier || !password) {
        showError('Enter your username/email and password.');
        return;
      }

      const account = findAdminAccountByIdentifier(identifier);
      if (!account) {
        showError('Admin account not found. Please check your credentials.');
        return;
      }

      if (!verifyPassword(password, account.passwordHash)) {
        showError('Incorrect password. Please try again.');
        passwordInput.focus();
        passwordInput.select();
        return;
      }

      handleSuccessfulLogin(account);
    });

    function openLogoutModal() {
      if (!logoutModal) return;
      logoutModal.style.display = 'flex';
      logoutModal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        (logoutConfirmBtn || logoutCancelBtn)?.focus();
      });
    }

    function closeLogoutModal() {
      if (!logoutModal) return;
      logoutModal.style.display = 'none';
      logoutModal.setAttribute('aria-hidden', 'true');
      logoutButton?.focus();
    }

    function handleLogoutConfirm() {
      clearAdminSession();
      updateWelcomeBanner(null);
      closeLogoutModal();
      window.location.reload();
    }

    logoutButton?.addEventListener('click', (event) => {
      event.preventDefault();
      openLogoutModal();
    });

    logoutCancelBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      closeLogoutModal();
    });

    logoutConfirmBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      handleLogoutConfirm();
    });

    logoutModal?.addEventListener('click', (event) => {
      if (event.target === logoutModal) {
        closeLogoutModal();
      }
    });

    exitButton?.addEventListener('click', (event) => {
      event.preventDefault();
      handleExit();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && logoutModal?.style.display === 'flex') {
        closeLogoutModal();
      }
    });

    window.addEventListener('storage', (event) => {
      if (event.key === ADMIN_SESSION_KEY || event.key === CUSTOMER_SESSION_KEY) {
        const activeAccount = getActiveAdminAccount();
        if (activeAccount) {
          updateWelcomeBanner(activeAccount);
          toggleOverlay(false);
        } else {
          updateWelcomeBanner(null);
          toggleOverlay(true);
        }
      }
    });

    clearAdminSession();
    updateWelcomeBanner(null);
    toggleOverlay(true);
  });
})();


