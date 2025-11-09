// Admin Management functionality
(function() {
  const ACCOUNTS_STORAGE_KEY = 'mock_accounts';
  const ADMIN_SESSION_KEY = 'admin_session';

  // DOM References
  let viewAdminMgmt;
  let adminFormSection;
  let adminForm;
  let adminFormTitle;
  let btnCancelAdmin;
  
  // Form inputs
  let adminIdInput;
  let adminFirstNameInput;
  let adminLastNameInput;
  let adminUsernameInput;
  let adminEmailInput;
  let adminPhoneInput;
  let adminCurrentPasswordInput;
  let adminPasswordInput;
  let adminConfirmPasswordInput;
  let passwordErrorEl;
  let passwordStrengthLabelEl;
  let passwordStrengthBarEl;
  let passwordToggleButtons;

  function refreshDomReferences() {
    viewAdminMgmt = document.getElementById('view-admin-mgmt');
    adminFormSection = document.getElementById('adminFormSection');
    adminForm = document.getElementById('adminForm');
    adminFormTitle = document.getElementById('adminFormTitle');
    btnCancelAdmin = document.getElementById('btnCancelAdmin');

    adminIdInput = document.getElementById('adminId');
    adminFirstNameInput = document.getElementById('adminCredentialFirstName');
    adminLastNameInput = document.getElementById('adminCredentialLastName');
    adminUsernameInput = document.getElementById('adminCredentialUsername');
    adminEmailInput = document.getElementById('adminCredentialEmail');
    adminPhoneInput = document.getElementById('adminCredentialPhone');
    adminCurrentPasswordInput = document.getElementById('adminCredentialCurrentPassword');
    adminPasswordInput = document.getElementById('adminCredentialPassword');
    adminConfirmPasswordInput = document.getElementById('adminCredentialConfirmPassword');
    passwordErrorEl = document.getElementById('adminPasswordError');
    passwordStrengthLabelEl = document.getElementById('adminPasswordStrengthLabel');
    passwordStrengthBarEl = document.getElementById('adminPasswordStrengthBar');
    passwordToggleButtons = viewAdminMgmt
      ? Array.from(viewAdminMgmt.querySelectorAll('.password-toggle-btn'))
      : [];
  }

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
    if (!adminPasswordInput || !passwordStrengthLabelEl || !passwordStrengthBarEl) {
      refreshDomReferences();
    }
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
      refreshDomReferences();
    }

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

  function getToggleTarget(button) {
    if (!button) {
      return null;
    }
    const targetId = button.getAttribute('data-toggle-password');
    if (!targetId) {
      return null;
    }
    return document.getElementById(targetId);
  }

  function setPasswordVisibility(button, visible, { focusInput = false } = {}) {
    if (!button) return;
    const targetInput = getToggleTarget(button);
    if (!targetInput) return;

    const shouldShow = Boolean(visible);
    targetInput.type = shouldShow ? 'text' : 'password';
    button.classList.toggle('is-visible', shouldShow);
    button.setAttribute('data-password-visible', shouldShow ? 'true' : 'false');
    button.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
    button.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');

    if (shouldShow && focusInput) {
      targetInput.focus();
      const valueLength = targetInput.value.length;
      try {
        targetInput.setSelectionRange(valueLength, valueLength);
      } catch (error) {
        // Some browsers do not support setSelectionRange on certain inputs.
      }
    }
  }

  function togglePasswordVisibility(button) {
    if (!button) return;
    const targetInput = getToggleTarget(button);
    if (!targetInput) return;

    const shouldShow = targetInput.type === 'password';
    setPasswordVisibility(button, shouldShow, { focusInput: true });
  }

  function resetPasswordFields() {
    if (!adminCurrentPasswordInput || !adminPasswordInput || !adminConfirmPasswordInput) {
      refreshDomReferences();
    }
    if (adminCurrentPasswordInput) {
      adminCurrentPasswordInput.value = '';
    }
    if (adminPasswordInput) {
      adminPasswordInput.value = '';
    }
    if (adminConfirmPasswordInput) {
      adminConfirmPasswordInput.value = '';
    }
    if (passwordToggleButtons && passwordToggleButtons.length) {
      passwordToggleButtons.forEach((button) => {
        setPasswordVisibility(button, false);
      });
    }
    updatePasswordStrength();
    setPasswordError('');
  }

  // Load current admin data from session
  async function loadCurrentAdmin() {
    refreshDomReferences();
    try {
      const account = getActiveAdminAccount();
      if (account) {
        const defaults = {
          firstName: 'Water',
          lastName: 'Avenue',
          username: 'water_avenue',
          email: 'water_avenue@gmail.com',
          phone: '091234567890'
        };

        const normalisedAccount = { ...account };
        let accountUpdated = false;

        Object.entries(defaults).forEach(([key, value]) => {
          const currentValue = (normalisedAccount[key] || '').toString().trim();
          if (!currentValue) {
            normalisedAccount[key] = value;
            accountUpdated = true;
          }
        });

        if (accountUpdated) {
          const accounts = readAccounts();
          const indexToUpdate = accounts.findIndex(acc =>
            acc.role === 'Admin' && Number(acc.accountID) === Number(normalisedAccount.accountID)
          );
          if (indexToUpdate !== -1) {
            accounts[indexToUpdate] = {
              ...accounts[indexToUpdate],
              firstName: normalisedAccount.firstName,
              lastName: normalisedAccount.lastName,
              username: normalisedAccount.username,
              email: normalisedAccount.email,
              phone: normalisedAccount.phone
            };
            writeAccounts(accounts);
          }
        }

        if (adminIdInput) {
          adminIdInput.value = normalisedAccount.accountID != null ? normalisedAccount.accountID : '';
        }
        if (adminFirstNameInput) {
          adminFirstNameInput.value = normalisedAccount.firstName || '';
        }
        if (adminLastNameInput) {
          adminLastNameInput.value = normalisedAccount.lastName || '';
        }
        if (adminUsernameInput) {
          adminUsernameInput.value = normalisedAccount.username || '';
        }
        if (adminEmailInput) {
          adminEmailInput.value = normalisedAccount.email || '';
        }
        if (adminPhoneInput) {
          adminPhoneInput.value = normalisedAccount.phone || normalisedAccount.contactNumber || '';
        }
        refreshWelcomeBanner(normalisedAccount);
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
    refreshDomReferences();
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
      adminPhoneInput.value = '091234567890';
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
    refreshDomReferences();
    const adminId = adminIdInput.value;
    if (!adminId) {
      alert('Admin ID not found. Please log in again.');
      return;
    }

    const currentPasswordValue = (formData.get('adminCurrentPassword') || '').trim();
    const passwordValue = (formData.get('adminPassword') || '').trim();
    const confirmPasswordValue = (formData.get('adminConfirmPassword') || '').trim();

    setPasswordError('');

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

    const rawEmail = (formData.get('adminEmail') || '').toString().trim();
    const normalizedEmail = rawEmail.toLowerCase();

    const adminData = {
      adminId: adminId,
      firstName: (formData.get('adminFirstName') || '').toString().trim(),
      lastName: (formData.get('adminLastName') || '').toString().trim(),
      username: (formData.get('adminUsername') || '').toString().trim(),
      email: rawEmail,
      phone: (formData.get('adminPhone') || '').toString().trim(),
      passwordUpdated: Boolean(passwordValue)
    };

    if (!adminData.firstName) {
      alert('First name cannot be empty.');
      adminFirstNameInput?.focus();
      return;
    }

    if (!adminData.lastName) {
      alert('Last name cannot be empty.');
      adminLastNameInput?.focus();
      return;
    }

    if (!adminData.username) {
      alert('Username cannot be empty.');
      adminUsernameInput?.focus();
      return;
    }

    if (!rawEmail) {
      alert('Email cannot be empty.');
      adminEmailInput?.focus();
      return;
    }

    const accounts = readAccounts();
    const adminIndex = accounts.findIndex(acc =>
      acc.role === 'Admin' && Number(acc.accountID) === Number(adminId)
    );
    if (adminIndex === -1) {
      alert('Admin account could not be located. Please refresh the page.');
      return;
    }

    const storedAccount = accounts[adminIndex];

    const isAttemptingPasswordChange = Boolean(passwordValue || confirmPasswordValue || currentPasswordValue);

    if (isAttemptingPasswordChange) {
      if (!currentPasswordValue) {
        setPasswordError('Please enter your current password to update it.');
        adminCurrentPasswordInput?.focus();
        return;
      }

      const currentPasswordMatches = hashPassword(currentPasswordValue) === storedAccount.passwordHash;

      if (!currentPasswordMatches) {
        setPasswordError('Current password is incorrect.');
        adminCurrentPasswordInput?.focus();
        return;
      }

      if (!passwordValue) {
        setPasswordError('Please enter a new password.');
        adminPasswordInput?.focus();
        return;
      }
    }

    const normalizedUsername = adminData.username.toLowerCase();

    const duplicateAccount = accounts.find(acc => {
      if (Number(acc.accountID) === Number(adminId)) {
        return false;
      }
      const usernameMatch = acc.username?.toString().trim().toLowerCase() === normalizedUsername;
      const emailMatch = acc.email?.toString().trim().toLowerCase() === normalizedEmail;
      return usernameMatch || emailMatch;
    });

    if (duplicateAccount) {
      alert('Username or email already in use by another account. Please choose a different one.');
      adminUsernameInput?.focus();
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
  function initAdminManagement() {
    refreshDomReferences();
    if (!viewAdminMgmt) return;

    // Show form section (it's now always visible)
    if (adminFormSection) {
      adminFormSection.style.display = 'flex';
    }

    // Load current admin data
    loadCurrentAdmin();

    // Cancel button - just reset form to current admin data
    if (btnCancelAdmin) {
      btnCancelAdmin.onclick = () => {
        loadCurrentAdmin();
      };
    }

    // Form submit
    if (adminForm) {
      adminForm.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(adminForm);
        await saveAdmin(formData);
      };
    }

    if (passwordToggleButtons && passwordToggleButtons.length) {
      passwordToggleButtons.forEach((button) => {
        const targetInput = getToggleTarget(button);
        if (!targetInput) {
          return;
        }

        const isVisible = targetInput.type === 'text';
        setPasswordVisibility(button, isVisible, { focusInput: false });

        if (!button.dataset.passwordToggleBound) {
          button.addEventListener('click', (event) => {
            event.preventDefault();
            togglePasswordVisibility(button);
          });

          button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              togglePasswordVisibility(button);
            }
          });

          button.dataset.passwordToggleBound = 'true';
        }
      });
    }

    if (adminPasswordInput) {
      adminPasswordInput.oninput = () => {
        updatePasswordStrength();
        validatePasswordMatch();
      };
    }

    if (adminCurrentPasswordInput) {
      adminCurrentPasswordInput.oninput = () => {
        if (adminCurrentPasswordInput.value) {
          setPasswordError('');
        }
      };
    }

    if (adminConfirmPasswordInput) {
      adminConfirmPasswordInput.oninput = () => {
        validatePasswordMatch();
      };
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

    // Attempt initialisation in case admin view is already visible by default
    setTimeout(() => {
      initAdminManagement();
    }, 150);
  });

  // Expose initAdminManagement for manual triggering
  window.initAdminManagement = initAdminManagement;
})();


