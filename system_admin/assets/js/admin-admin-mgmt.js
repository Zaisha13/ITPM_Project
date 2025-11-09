// Admin Management functionality
(function() {
  const ACCOUNTS_STORAGE_KEY = 'mock_accounts';
  const ADMIN_SESSION_KEY = 'admin_session';

  // DOM References
  const viewAdminMgmt = document.getElementById('view-admin-mgmt');
  const adminFormSection = document.getElementById('adminFormSection');
  const adminForm = document.getElementById('adminForm');
  const adminFormTitle = document.getElementById('adminFormTitle');
  const btnCancelAdmin = document.getElementById('btnCancelAdmin');
  
  // Form inputs
  const adminIdInput = document.getElementById('adminId');
  const adminFirstNameInput = document.getElementById('adminFirstName');
  const adminLastNameInput = document.getElementById('adminLastName');
  const adminUsernameInput = document.getElementById('adminUsername');
  const adminEmailInput = document.getElementById('adminEmail');
  const adminPhoneInput = document.getElementById('adminPhone');
  const adminPasswordInput = document.getElementById('adminPassword');
  const adminConfirmPasswordInput = document.getElementById('adminConfirmPassword');
  const passwordErrorEl = document.getElementById('adminPasswordError');
  const passwordStrengthLabelEl = document.getElementById('adminPasswordStrengthLabel');
  const passwordStrengthBarEl = document.getElementById('adminPasswordStrengthBar');
  const passwordToggleButtons = document.querySelectorAll('.password-toggle-btn');

  function hashPassword(str) {
    let hash = 0;
    if (!str) return hash.toString();
    for (let i = 0; i < str.length; i += 1) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  function ensureMockSeed() {
    if (typeof window !== 'undefined' && typeof window.__ensureMockSeed === 'function') {
      try {
        window.__ensureMockSeed();
      } catch (error) {
        console.warn('Failed to seed mock data before loading admin details:', error);
      }
    }
  }

  function readAccounts() {
    ensureMockSeed();
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Unable to read accounts for admin management:', error);
      return [];
    }
  }

  function writeAccounts(accounts) {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch (error) {
      console.error('Unable to persist admin updates:', error);
    }
  }

  function getActiveAdminAccount() {
    const accounts = readAccounts();
    if (!accounts.length) {
      return null;
    }
    try {
      const sessionRaw = localStorage.getItem(ADMIN_SESSION_KEY);
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        const accountId = Number(session?.accountID);
        if (Number.isFinite(accountId)) {
          const match = accounts.find(acc =>
            acc.role === 'Admin' && Number(acc.accountID) === accountId
          );
          if (match) {
            return match;
          }
        }
      }
    } catch (error) {
      console.warn('Unable to resolve active admin session, falling back to default admin:', error);
    }
    return accounts.find(acc => acc.role === 'Admin') || null;
  }

  function refreshWelcomeBanner(account) {
    const nameElement = document.getElementById('adminName');
    if (!nameElement) {
      return;
    }
    if (!account) {
      nameElement.textContent = 'Admin';
      return;
    }
    const firstName = (account.firstName || '').trim();
    const lastName = (account.lastName || '').trim();
    const username = (account.username || '').trim();
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || 'Admin';
    nameElement.textContent = displayName;
  }

  function setPasswordError(message) {
    if (!passwordErrorEl) return;
    if (message) {
      passwordErrorEl.textContent = message;
      passwordErrorEl.classList.add('is-visible');
    } else {
      passwordErrorEl.textContent = '';
      passwordErrorEl.classList.remove('is-visible');
    }
  }

  function calculatePasswordStrength(password) {
    if (!password) {
      return {
        label: 'Not set',
        className: '',
        percent: 0
      };
    }

    let score = 0;
    const checks = [
      /.{8,}/,
      /[A-Z]/,
      /[a-z]/,
      /\d/,
      /[^A-Za-z0-9]/
    ];

    checks.forEach((regex) => {
      if (regex.test(password)) {
        score += 1;
      }
    });

    if (score <= 1) {
      return { label: 'Very weak', className: 'strength-very-weak', percent: 20 };
    }
    if (score === 2) {
      return { label: 'Weak', className: 'strength-weak', percent: 40 };
    }
    if (score === 3) {
      return { label: 'Fair', className: 'strength-fair', percent: 60 };
    }
    if (score === 4) {
      return { label: 'Good', className: 'strength-good', percent: 80 };
    }

    return { label: 'Strong', className: 'strength-strong', percent: 100 };
  }

  function updatePasswordStrength() {
    if (!passwordStrengthLabelEl || !passwordStrengthBarEl || !adminPasswordInput) {
      return;
    }

    const password = adminPasswordInput.value;
    const strength = calculatePasswordStrength(password);

    passwordStrengthLabelEl.textContent = strength.label;
    passwordStrengthBarEl.style.width = `${strength.percent}%`;

    passwordStrengthBarEl.className = 'password-strength-bar';
    if (strength.className) {
      passwordStrengthBarEl.classList.add(strength.className);
    }
  }

  function validatePasswordMatch(options = {}) {
    const { showEmptyWarning = false } = options;

    if (!adminPasswordInput || !adminConfirmPasswordInput) {
      return true;
    }

    const password = adminPasswordInput.value;
    const confirmPassword = adminConfirmPasswordInput.value;

    if (!password && !confirmPassword) {
      setPasswordError('');
      return true;
    }

    if (!password && confirmPassword) {
      setPasswordError('Please enter a password.');
      return false;
    }

    if (password && !confirmPassword) {
      if (showEmptyWarning) {
        setPasswordError('Please re-enter your password.');
        return false;
      }

      setPasswordError('');
      return true;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return false;
    }

    setPasswordError('');
    return true;
  }

  function resetPasswordFields() {
    if (adminPasswordInput) {
      adminPasswordInput.value = '';
    }
    if (adminConfirmPasswordInput) {
      adminConfirmPasswordInput.value = '';
    }
    updatePasswordStrength();
    setPasswordError('');
  }

  function togglePasswordVisibility(button) {
    if (!button) return;
    const targetId = button.getAttribute('data-toggle-password');
    if (!targetId) return;

    const targetInput = document.getElementById(targetId);
    if (!targetInput) return;

    const shouldShow = targetInput.type === 'password';
    targetInput.type = shouldShow ? 'text' : 'password';
    button.classList.toggle('is-visible', shouldShow);
    button.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
  }

  // Load current admin data from session
  async function loadCurrentAdmin() {
    try {
      const account = getActiveAdminAccount();
      if (account) {
        if (adminIdInput) {
          adminIdInput.value = account.accountID != null ? account.accountID : '';
        }
        if (adminFirstNameInput) {
          adminFirstNameInput.value = account.firstName || '';
        }
        if (adminLastNameInput) {
          adminLastNameInput.value = account.lastName || '';
        }
        if (adminUsernameInput) {
          adminUsernameInput.value = account.username || '';
        }
        if (adminEmailInput) {
          adminEmailInput.value = account.email || '';
        }
        if (adminPhoneInput) {
          adminPhoneInput.value = account.phone || account.contactNumber || '';
        }
        refreshWelcomeBanner(account);
        resetPasswordFields();
        return;
      }
      console.warn('No admin account found in storage, loading placeholder credentials');
      loadPlaceholderAdmin();
    } catch (error) {
      console.error('Error loading admin data:', error);
      loadPlaceholderAdmin();
    }
  }

  // Load placeholder admin data (for development/testing)
  function loadPlaceholderAdmin() {
    if (adminIdInput) {
      adminIdInput.value = '';
    }
    if (adminFirstNameInput) {
      adminFirstNameInput.value = 'Water';
    }
    if (adminLastNameInput) {
      adminLastNameInput.value = 'Avenue';
    }
    if (adminUsernameInput) {
      adminUsernameInput.value = 'water_avenue';
    }
    if (adminEmailInput) {
      adminEmailInput.value = 'water_avenue@gmail.com';
    }
    if (adminPhoneInput) {
      adminPhoneInput.value = '09123457890';
    }
    refreshWelcomeBanner({
      firstName: 'Water',
      lastName: 'Avenue',
      username: 'water_avenue'
    });
    resetPasswordFields();
  }

  // Save admin (only update current admin)
  async function saveAdmin(formData) {
    const adminId = adminIdInput.value;
    if (!adminId) {
      alert('Admin ID not found. Please log in again.');
      return;
    }

    const passwordValue = (formData.get('adminPassword') || '').trim();
    const confirmPasswordValue = (formData.get('adminConfirmPassword') || '').trim();

    if (!validatePasswordMatch({ showEmptyWarning: true })) {
      if (passwordValue && !confirmPasswordValue && adminConfirmPasswordInput) {
        adminConfirmPasswordInput.focus();
      } else if (!passwordValue && confirmPasswordValue && adminPasswordInput) {
        adminPasswordInput.focus();
      } else if (adminConfirmPasswordInput) {
        adminConfirmPasswordInput.focus();
      }
      return;
    }

    const adminData = {
      adminId: adminId,
      firstName: (formData.get('adminFirstName') || '').toString().trim(),
      lastName: (formData.get('adminLastName') || '').toString().trim(),
      username: (formData.get('adminUsername') || '').toString().trim(),
      email: (formData.get('adminEmail') || '').toString().trim(),
      phone: (formData.get('adminPhone') || '').toString().trim(),
      passwordUpdated: Boolean(passwordValue)
    };

    const accounts = readAccounts();
    const adminIndex = accounts.findIndex(acc =>
      acc.role === 'Admin' && Number(acc.accountID) === Number(adminId)
    );
    if (adminIndex === -1) {
      alert('Admin account could not be located. Please refresh the page.');
      return;
    }

    const updatedAccount = {
      ...accounts[adminIndex],
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      username: adminData.username,
      email: adminData.email,
      phone: adminData.phone
    };

    if (passwordValue) {
      updatedAccount.passwordHash = hashPassword(passwordValue);
    }

    accounts[adminIndex] = updatedAccount;

    try {
      writeAccounts(accounts);

      try {
        const sessionPayload = {
          accountID: updatedAccount.accountID,
          username: updatedAccount.username,
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionPayload));
      } catch (sessionError) {
        console.warn('Failed to refresh admin session after updating credentials:', sessionError);
      }

      refreshWelcomeBanner(updatedAccount);
      alert('Admin credentials updated successfully!');

      // Reload admin data to reflect changes
      await loadCurrentAdmin();
    } catch (error) {
      console.error('Error saving admin:', error);
      alert('Error updating admin credentials. Please try again.');
    }
  }

  // Initialize admin management
  let initialized = false;
  
  function initAdminManagement() {
    if (!viewAdminMgmt) return;

    // Show form section (it's now always visible)
    if (adminFormSection) {
      adminFormSection.style.display = 'flex';
    }

    // Load current admin data
    loadCurrentAdmin();

    // Only set up event listeners once
    if (!initialized) {
      // Cancel button - just reset form to current admin data
      if (btnCancelAdmin) {
        btnCancelAdmin.addEventListener('click', () => {
          loadCurrentAdmin();
        });
      }

      // Form submit
      if (adminForm) {
        adminForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(adminForm);
          await saveAdmin(formData);
        });
      }

      if (passwordToggleButtons && passwordToggleButtons.length) {
        passwordToggleButtons.forEach((button) => {
          button.addEventListener('click', () => togglePasswordVisibility(button));
        });
      }

      if (adminPasswordInput) {
        adminPasswordInput.addEventListener('input', () => {
          updatePasswordStrength();
          validatePasswordMatch();
        });
      }

      if (adminConfirmPasswordInput) {
        adminConfirmPasswordInput.addEventListener('input', () => {
          validatePasswordMatch();
        });
      }
      
      initialized = true;
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    // Hook into switchView when it's available
    const checkSwitchView = setInterval(() => {
      if (typeof window.switchView === 'function') {
        clearInterval(checkSwitchView);
        const originalSwitchView = window.switchView;
        window.switchView = function(viewName) {
          originalSwitchView(viewName);
          if (viewName === 'admin-mgmt') {
            setTimeout(() => {
              initAdminManagement();
            }, 100);
          }
        };
      }
    }, 100);
    
    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(checkSwitchView), 5000);
  });

  // Expose initAdminManagement for manual triggering
  window.initAdminManagement = initAdminManagement;
})();


