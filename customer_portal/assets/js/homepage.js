/* =====================================
   homepage.js — Water Avenue System
   ===================================== */

// PRICE CONFIGURATION (loaded from DB via get_prices.php)
const DEFAULT_PRICE_CONFIG = {
  slim: { refill: 25, brandNew: 225 },
  round: { refill: 25, brandNew: 225 },
  wilkins: { refill: 10, brandNew: 10 }
};

let DB_PRICES = {
  slim: { ...DEFAULT_PRICE_CONFIG.slim },
  round: { ...DEFAULT_PRICE_CONFIG.round },
  wilkins: { ...DEFAULT_PRICE_CONFIG.wilkins }
};
async function loadDbPrices() {
  try {
    const res = await fetch(new URL('../customer_backend/api/get_prices.php', window.location.href), { credentials: 'include' });
    const text = await res.text();
    const json = JSON.parse(text);
    const map = { 1: 'slim', 2: 'round', 3: 'wilkins' };
    (json.data || []).forEach(row => {
      const key = map[row.ContainerTypeID] || null;
      if (!key) return;
      const fallback = DEFAULT_PRICE_CONFIG[key] || { refill: 0, brandNew: 0 };
      const refillPrice = Number(row.RefillPrice);
      const brandNewPrice = Number(row.NewContainerPrice);
      DB_PRICES[key] = {
        refill: Number.isFinite(refillPrice) && refillPrice > 0 ? refillPrice : fallback.refill,
        brandNew: Number.isFinite(brandNewPrice) && brandNewPrice > 0 ? brandNewPrice : fallback.brandNew
      };
    });
  } catch (e) {
    console.error('Failed to load DB prices', e);
  }
}
function getUnitPrice(container, type) {
  const fallback = DEFAULT_PRICE_CONFIG[container] || { refill: 0, brandNew: 0 };
  const bucket = DB_PRICES[container] || fallback;
  return type === 'brandNew'
    ? (bucket.brandNew || fallback.brandNew || 0)
    : (bucket.refill || fallback.refill || 0);
}

// GLOBAL STATE
let orders = [];
let selectedOrderIndex = null;
let containerType = "slim";
let orderType = "refill";
let quantity = 1;
let wilkinsQty = 1;
const OPERATING_END_HOUR = 17;
let pendingOrderSubmission = null;
let latestCapacityInfo = {
  available: null,
  total: null
};

/* =========================
   GENERAL HELPERS
   ========================= */
function openModal(modalClass) {
  document.querySelectorAll(".modal-overlay").forEach((m) => (m.style.display = "none"));
  const modal = document.querySelector(`.${modalClass}`);
  if (modal) modal.closest(".modal-overlay").style.display = "flex";
}
function closeModal() {
  document.querySelectorAll(".modal-overlay").forEach((m) => (m.style.display = "none"));
}
window.closeModal = closeModal;
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Status helper functions
function getStatusLabel(status) {
  const labels = {
    'for-approval': 'For Approval',
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'preparing': 'Preparing',
    'ready-for-pickup': 'Ready for Pickup',
    'out-for-delivery': 'Out for Delivery',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'queued': 'Queued'
  };
  return labels[status] || 'Pending';
}

function getStatusClassForBadge(status) {
  const classes = {
    'for-approval': 'status-for-approval',
    'pending': 'status-pending',
    'confirmed': 'status-confirmed',
    'preparing': 'status-preparing',
    'ready-for-pickup': 'status-ready-for-pickup',
    'out-for-delivery': 'status-out-for-delivery',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled',
    'queued': 'status-queued'
  };
  return classes[status] || 'status-pending';
}

/* =========================
   SUCCESS/ALERT MESSAGES
   ========================= */
function showSuccessMessage(message) {
  // Create a custom alert element
  const alertDiv = document.createElement('div');
  alertDiv.className = 'custom-alert success';
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);
  
  // Trigger animation
  setTimeout(() => alertDiv.classList.add('show'), 10);
  
  // Remove after animation
  setTimeout(() => {
    alertDiv.classList.remove('show');
    setTimeout(() => alertDiv.remove(), 300);
  }, 3000);
}

function showAlertMessage(message) {
  // Create a custom alert element
  const alertDiv = document.createElement('div');
  alertDiv.className = 'custom-alert';
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);
  
  // Trigger animation
  setTimeout(() => alertDiv.classList.add('show'), 10);
  
  // Remove after animation
  setTimeout(() => {
    alertDiv.classList.remove('show');
    setTimeout(() => alertDiv.remove(), 300);
  }, 3000);
}

/* =========================
   ACCOUNT SYSTEM
   ========================= */
let currentUser = null;
let lastAccountID = null;
async function checkAuth() {
  let me = null;
  try {
    me = await Api.me();
  } catch (err) {
    console.warn('Unable to check auth status', err);
  }
  const isAuthenticated = !!(me && (me.authenticated === true || me.authenticated === 'true' || me.authenticated === 1 || me.authenticated === '1'));
  currentUser = (isAuthenticated && me.customer && me.account) ? {
    accountID: me.account.AccountID,
    customerID: me.customer.CustomerID,
    firstName: me.customer.FirstName,
    lastName: me.customer.LastName,
    username: me.account.Username,
    phone: me.customer.Phone,
    email: me.account.Email,
    address: me.customer.HouseAddress,
    customerType: me.customer.CustomerTypeID === 2 ? 'dealer' : 'regular'
  } : null;
  // Reset UI state if account switched
  if ((currentUser?.accountID || null) !== lastAccountID) {
    lastAccountID = currentUser?.accountID || null;
    // clear order form state
    orders = [];
    selectedOrderIndex = null;
    quantity = 1;
    wilkinsQty = 1;
    const addr = document.getElementById('deliveryAddress');
    if (addr) { addr.value = ''; addr.disabled = false; }
    const chk = document.getElementById('additionalWilkins');
    if (chk) { chk.checked = false; }
    const wilkinsCtl = document.getElementById('wilkinsControl');
    if (wilkinsCtl) wilkinsCtl.style.display = 'none';
    renderOrders();
    updateTotals();
  }
  const authSection = document.getElementById("authSection");
  const authLoggedOut = document.getElementById("authLoggedOut");
  const authLoggedIn = document.getElementById("authLoggedIn");
  const userBtn = document.getElementById("userBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const welcomeText = document.getElementById("welcomeText");
  const orderNowBtn = document.getElementById("orderNowBtn");
  const profileBtn = document.getElementById("profileBtn");

  if (currentUser) {
    authLoggedIn?.classList.add("is-active");
    authLoggedOut?.classList.remove("is-active");
    if (welcomeText) {
      welcomeText.textContent = `Welcome, ${currentUser.firstName}!`;
    }
    if (orderNowBtn) orderNowBtn.disabled = false;
  } else {
    authLoggedOut?.classList.add("is-active");
    authLoggedIn?.classList.remove("is-active");
    if (welcomeText) {
      welcomeText.textContent = "";
    }
    if (orderNowBtn) orderNowBtn.disabled = false;
  }

  if (profileBtn) {
    profileBtn.disabled = !currentUser;
  }
  if (logoutBtn) {
    logoutBtn.disabled = !currentUser;
  }
  if (userBtn) {
    userBtn.disabled = !!currentUser;
  }
  authSection?.classList.remove("is-loading");
}
checkAuth();

/* =========================
   PASSWORD STRENGTH INDICATOR
   ========================= */
function checkPasswordStrength(password) {
  let score = 0;
  let strength = 'weak';
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;
  
  if (score >= 5) strength = 'strong';
  else if (score >= 4) strength = 'good';
  else if (score >= 2) strength = 'fair';
  else strength = 'weak';
  
  return strength;
}

function updatePasswordStrength(password, prefix = '') {
  const strengthFill = document.getElementById(prefix ? `${prefix}StrengthFill` : 'strengthFill');
  const strengthText = document.getElementById(prefix ? `${prefix}StrengthText` : 'strengthText');
  
  if (!strengthFill || !strengthText) return;
  
  if (!password) {
    strengthFill.className = 'strength-fill';
    strengthText.className = 'strength-text';
    strengthText.textContent = 'Enter a password';
    return;
  }
  
  const strength = checkPasswordStrength(password);
  
  strengthFill.className = `strength-fill ${strength}`;
  strengthText.className = `strength-text ${strength}`;
  
  const strengthLabels = {
    weak: 'Weak password',
    fair: 'Fair password',
    good: 'Good password',
    strong: 'Strong password'
  };
  
  strengthText.textContent = strengthLabels[strength];
}

// Add password strength listener
document.getElementById('regPassword')?.addEventListener('input', (e) => {
  updatePasswordStrength(e.target.value);
});

/* =========================
   REGISTER
   ========================= */
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const username = document.getElementById("regUsername").value.trim();
    const phone = document.getElementById("phoneNumber").value.trim();
    const email = document.getElementById("email").value.trim();
    const address = document.getElementById("address").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    const confirm = document.getElementById("confirmPassword").value.trim();

    // Clear all error messages
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

    let hasError = false;

    // Validate all fields
    if (!firstName) {
      document.getElementById("firstNameError").textContent = 'First name is required';
      hasError = true;
    }
    
    if (!lastName) {
      document.getElementById("lastNameError").textContent = 'Last name is required';
      hasError = true;
    }
    
    if (!username) {
      document.getElementById("regUsernameError").textContent = 'Username is required';
      hasError = true;
    }
    
    if (!phone) {
      document.getElementById("phoneNumberError").textContent = 'Phone number is required';
      hasError = true;
    } else if (!/^\+?[\d\s-()]+$/.test(phone)) {
      document.getElementById("phoneNumberError").textContent = 'Invalid phone number';
      hasError = true;
    }
    
    if (!email) {
      document.getElementById("emailError").textContent = 'Email is required';
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById("emailError").textContent = 'Invalid email format';
      hasError = true;
    }
    
    if (!address) {
      document.getElementById("addressError").textContent = 'Address is required';
      hasError = true;
    }
    
    if (!password) {
      document.getElementById("regPasswordError").textContent = 'Password is required';
      hasError = true;
    } else if (password.length < 8) {
      document.getElementById("regPasswordError").textContent = 'Password must be at least 8 characters';
      hasError = true;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      document.getElementById("regPasswordError").textContent = 'Password must contain uppercase, lowercase, and number';
      hasError = true;
    }
    
    if (!confirm) {
      document.getElementById("confirmPasswordError").textContent = 'Please confirm your password';
      hasError = true;
    } else if (password !== confirm) {
      document.getElementById("confirmPasswordError").textContent = 'Passwords do not match';
      hasError = true;
    }

    if (hasError) return;

    const customerType = document.querySelector('input[name="customerType"]:checked')?.value === 'dealer' ? 'Dealer' : 'Regular';

    Api.register({
      firstName,
      lastName,
      username,
      phone,
      email,
      address,
      password,
      retypePassword: confirm,
      customerType
    }).then((resp) => {
      if (resp && (resp.success || resp.status === 'success')) {
        showSuccessMessage("Registration successful! Please log in to continue.");
        closeModal();
        openModal("login-modal");
      } else {
        showAlertMessage(resp?.message || 'Registration failed');
      }
    }).catch(() => showAlertMessage('Registration failed'));
  });
}

/* =========================
   LOGIN
   ========================= */
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const usernameOrEmail = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // Clear error messages
    document.getElementById("usernameError").textContent = '';
    document.getElementById("passwordError").textContent = '';

    // Validate
    if (!usernameOrEmail) {
      document.getElementById("usernameError").textContent = 'Username is required';
      return;
    }
    
    if (!password) {
      document.getElementById("passwordError").textContent = 'Password is required';
      return;
    }

    Api.login(usernameOrEmail, password).then(async (resp) => {
      if (resp && resp.status === 'success') {
        await checkAuth();
        showSuccessMessage('Login successful!');
        closeModal();
      } else {
        document.getElementById("passwordError").textContent = resp?.message || 'Invalid username or password';
      }
    }).catch(() => {
      document.getElementById("passwordError").textContent = 'Login failed';
    });

    // Just show homepage after login - don't auto-open order modal
    // User must click "ORDER NOW" button to access order modal
  });
}

// Helper function to toggle password visibility
function setupPasswordToggle(toggleButtonId, passwordInputId) {
  const toggleButton = document.getElementById(toggleButtonId);
  const passwordInput = document.getElementById(passwordInputId);
  
  if (toggleButton && passwordInput) {
    toggleButton.addEventListener('click', () => {
      const svg = toggleButton.querySelector('svg');
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        svg.innerHTML = `
          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
        `;
      } else {
        passwordInput.type = 'password';
        svg.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        `;
      }
    });
  }
}

// Password toggle for login
setupPasswordToggle('togglePassword', 'password');

// Password toggles for register form
setupPasswordToggle('toggleRegPassword', 'regPassword');
setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');

// Password toggles for profile form
setupPasswordToggle('toggleProfileCurrentPassword', 'profileCurrentPassword');
setupPasswordToggle('toggleProfileNewPassword', 'profileNewPassword');
setupPasswordToggle('toggleProfileConfirmPassword', 'profileConfirmPassword');

/* =========================
   MODAL SWITCHING
   ========================= */
// Switch to register modal
document.getElementById("switchToRegister")?.addEventListener("click", (e) => {
  e.preventDefault();
  closeModal();
  openModal("register-modal");
});

// Switch to login modal
document.getElementById("switchToLogin")?.addEventListener("click", (e) => {
  e.preventDefault();
  closeModal();
  openModal("login-modal");
});

// User button click handler
document.getElementById("userBtn")?.addEventListener("click", () => {
  openModal("login-modal");
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn)
  logoutBtn.addEventListener("click", () => {
    // Open logout confirmation modal
    const logoutModal = document.getElementById('logoutConfirmModal');
    if (logoutModal) {
      logoutModal.style.display = 'flex';
    }
  });

/* =========================
   ORDER FORM OPENING FIX
   ========================= */
const orderNowBtn = document.getElementById("orderNowBtn");
if (orderNowBtn) {
  orderNowBtn.addEventListener("click", () => {
    if (!currentUser) {
      openModal("login-modal");
      return;
    }
    // Reset default address checkbox and field before showing the form
    const chk = document.getElementById('useDefaultAddress');
    const addr = document.getElementById('deliveryAddress');
    if (chk) chk.checked = false;
    if (addr) { addr.disabled = false; addr.value = ''; }
    const wilkinsCtl = document.getElementById('wilkinsControl');
    if (wilkinsCtl) wilkinsCtl.style.display = 'none';
    document.getElementById('additionalWilkins').checked = false;
    openModal("order-modal");
  });
}

/* =========================
   ORDER SYSTEM
   ========================= */
function updateSubtotalUI() {
  const price = getUnitPrice(containerType, orderType);
  const total = price * quantity;
  document.getElementById("subtotal").textContent = `₱${total}`;
}
function updateWilkinsPriceUI() {
  document.getElementById("wilkinsPrice").textContent = `₱${getUnitPrice('wilkins','refill') * wilkinsQty}`;
}
function updateTotals() {
  const containersTotal = orders.reduce((sum, o) => sum + o.total, 0);
  const wilkinsChecked = document.getElementById("additionalWilkins").checked;
  const wilkinsTotal = wilkinsChecked ? getUnitPrice('wilkins','refill') * wilkinsQty : 0;
  const grand = containersTotal + wilkinsTotal;

  document.getElementById("containersTotal").textContent = `₱${containersTotal}`;
  document.getElementById("wilkinsTotal").textContent = `₱${wilkinsTotal}`;
  document.getElementById("grandTotal").textContent = `₱${grand}`;
}

/* Reset Button */
document.getElementById("resetBtn")?.addEventListener("click", () => {
  containerType = "slim";
  orderType = "refill";
  quantity = 1;
  wilkinsQty = 1;
  selectedOrderIndex = null;
  
  document.getElementById("quantity").value = quantity;
  document.getElementById("additionalWilkins").checked = false;
  document.getElementById("wilkinsControl").style.display = "none";
  document.getElementById("addOrderBtn").textContent = "Add";
  
  // Reset toggle buttons
  document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector('[data-type="slim"]').classList.add("active");
  document.querySelectorAll(".toggle-btn-action").forEach((b) => b.classList.remove("active"));
  document.querySelector('[data-action="refill"]').classList.add("active");
  
  updateSubtotalUI();
  updateWilkinsPriceUI();
});

/* Container Type Toggle */
document.querySelectorAll(".toggle-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    containerType = btn.dataset.type;
    updateSubtotalUI();
  })
);

/* Order Type Toggle */
document.querySelectorAll(".toggle-btn-action").forEach((btn) =>
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".toggle-btn-action")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    orderType = btn.dataset.action;
    updateSubtotalUI();
  })
);

/* Quantity Controls */
document.getElementById("decreaseQty")?.addEventListener("click", () => {
  if (quantity > 1) quantity--;
  document.getElementById("quantity").value = quantity;
  updateSubtotalUI();
});
document.getElementById("increaseQty")?.addEventListener("click", () => {
  quantity++;
  document.getElementById("quantity").value = quantity;
  updateSubtotalUI();
});

/* Wilkins Controls */
document.getElementById("additionalWilkins")?.addEventListener("change", (e) => {
  document.getElementById("wilkinsControl").style.display = e.target.checked ? "flex" : "none";
  updateWilkinsPriceUI();
  updateTotals();
});
document.getElementById("decreaseWilkins")?.addEventListener("click", () => {
  if (wilkinsQty > 1) wilkinsQty--;
  document.getElementById("wilkinsQty").value = wilkinsQty;
  updateWilkinsPriceUI();
  updateTotals();
});
document.getElementById("increaseWilkins")?.addEventListener("click", () => {
  wilkinsQty++;
  document.getElementById("wilkinsQty").value = wilkinsQty;
  updateWilkinsPriceUI();
  updateTotals();
});

/* Add/Update Order */
document.getElementById("addOrderBtn")?.addEventListener("click", () => {
  if (!currentUser) return alert("Please login first.");

  const q = parseInt(document.getElementById("quantity").value);
  
  if (selectedOrderIndex !== null) {
    // Update existing order
    orders[selectedOrderIndex] = {
      containerType,
      orderType,
      quantity: q,
      price: getUnitPrice(containerType, orderType),
      total: getUnitPrice(containerType, orderType) * q,
    };
    selectedOrderIndex = null;
    document.getElementById("addOrderBtn").textContent = "Add";
  } else {
    // Add new order or merge with existing
    const existingIndex = orders.findIndex(
      (o) => o.containerType === containerType && o.orderType === orderType
    );

    if (existingIndex !== -1) {
      orders[existingIndex].quantity += q;
      orders[existingIndex].total = getUnitPrice(containerType, orderType) * orders[existingIndex].quantity;
    } else {
      orders.push({
        containerType,
        orderType,
        quantity: q,
        price: getUnitPrice(containerType, orderType),
        total: getUnitPrice(containerType, orderType) * q,
      });
    }
  }
  
  renderOrders();
  updateTotals();
});

/* Render Orders */
function renderOrders() {
  const orderList = document.getElementById("orderList");
  if (!orderList) return;

  if (orders.length === 0) {
    orderList.innerHTML = "<p>No orders yet.</p>";
    return;
  }

  orderList.innerHTML = orders
    .map(
      (o, i) => `
    <div class="order-item ${i === selectedOrderIndex ? "selected" : ""}" data-index="${i}">
      <div class="order-item-info">
        <div class="order-item-title">${capitalize(o.containerType)} - ${
          o.orderType === "brandNew" ? "Brand New" : "Refill"
        }</div>
        <div class="order-item-qty">x${o.quantity}</div>
      </div>
      <div class="order-item-price">₱${o.total}</div>
      <button class="order-item-delete" data-index="${i}">🗑</button>
    </div>`
    )
    .join("");

  // Add click handlers for edit
  document.querySelectorAll(".order-item").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (!e.target.classList.contains("order-item-delete")) {
        selectedOrderIndex = parseInt(row.dataset.index);
        loadOrderToForm(selectedOrderIndex);
        document.getElementById("addOrderBtn").textContent = "Update";
        renderOrders();
      }
    });
  });

  // Add click handlers for delete
  document.querySelectorAll(".order-item-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      orders.splice(index, 1);
      if (selectedOrderIndex === index) {
        selectedOrderIndex = null;
        document.getElementById("addOrderBtn").textContent = "Add";
      }
      renderOrders();
      updateTotals();
    });
  });
}

/* Load Order Into Form */
function loadOrderToForm(index) {
  const o = orders[index];
  if (!o) return;
  containerType = o.containerType;
  orderType = o.orderType;
  quantity = o.quantity;

  document.getElementById("quantity").value = quantity;
  document
    .querySelectorAll(".toggle-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.type === containerType));
  document
    .querySelectorAll(".toggle-btn-action")
    .forEach((b) => b.classList.toggle("active", b.dataset.action === orderType));
  updateSubtotalUI();
}

/* Use Default Address */
document.getElementById("useDefaultAddress")?.addEventListener("change", function() {
  const addressInput = document.getElementById("deliveryAddress");
  if (this.checked) {
    if (currentUser && currentUser.address) {
      addressInput.value = currentUser.address;
      addressInput.disabled = true;
    } else {
      alert("No default address found. Please enter your address manually.");
      this.checked = false;
    }
  } else {
    addressInput.disabled = false;
  }
});

/* Place Order - Replaced by new implementation below */

/* INITIALIZE */
loadDbPrices().then(() => {
  updateSubtotalUI();
  updateWilkinsPriceUI();
  renderOrders();
  updateTotals();
});

/* =========================
   PROFILE MODAL FUNCTIONALITY
   ========================= */

// Profile modal functions
function openProfileModal() {
  const profileModal = document.getElementById('profileModal');
  if (profileModal) {
    profileModal.style.display = 'flex';
    loadProfileData();
    loadOrderHistory();
  }
}

function closeProfileModal() {
  const profileModal = document.getElementById('profileModal');
  if (profileModal) {
    profileModal.style.display = 'none';
  }
}
window.closeProfileModal = closeProfileModal;

// Profile button click handler
document.getElementById('profileBtn')?.addEventListener('click', () => {
  openProfileModal();
});

// Load profile data into form
function loadProfileData() {
  if (!currentUser) return;

  document.getElementById('profileFirstName').value = currentUser.firstName || '';
  document.getElementById('profileLastName').value = currentUser.lastName || '';
  document.getElementById('profileUsername').value = currentUser.username || '';
  document.getElementById('profilePhone').value = currentUser.phone || '';
  document.getElementById('profileEmail').value = currentUser.email || '';
  document.getElementById('profileAddress').value = currentUser.address || '';
  
  const customerType = currentUser.customerType || 'regular';
  document.querySelector(`input[name="profileCustomerType"][value="${customerType}"]`).checked = true;
  
  // Always clear password fields when modal opens
  document.getElementById('profileCurrentPassword').value = '';
  document.getElementById('profileNewPassword').value = '';
  document.getElementById('profileConfirmPassword').value = '';
  document.getElementById('profilePasswordStrength').style.display = 'none';
  
  // Clear error messages
  document.getElementById('profileCurrentPasswordError').textContent = '';
  document.getElementById('profilePasswordError').textContent = '';
  document.getElementById('profileConfirmPasswordError').textContent = '';
}

// Profile form submission
document.getElementById('profileForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  if (!currentUser) return;

  // Get form values
  const firstName = document.getElementById('profileFirstName').value.trim();
  const lastName = document.getElementById('profileLastName').value.trim();
  const username = document.getElementById('profileUsername').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const email = document.getElementById('profileEmail').value.trim();
  const address = document.getElementById('profileAddress').value.trim();
  const customerType = document.querySelector('input[name="profileCustomerType"]:checked').value;
  const currentPassword = document.getElementById('profileCurrentPassword').value;
  const newPassword = document.getElementById('profileNewPassword').value;
  const confirmPassword = document.getElementById('profileConfirmPassword').value;

  // Clear previous errors
  document.getElementById('profileCurrentPasswordError').textContent = '';
  document.getElementById('profilePasswordError').textContent = '';
  document.getElementById('profileConfirmPasswordError').textContent = '';

  let hasError = false;

  // Validate current password if new password is provided
  if (newPassword) {
    if (!currentPassword) {
      document.getElementById('profileCurrentPasswordError').textContent = 'Current password is required to change password';
      hasError = true;
    } else if (currentPassword.length === 0) {
      document.getElementById('profileCurrentPasswordError').textContent = 'Current password is incorrect';
      hasError = true;
    }
    
    if (newPassword.length < 8) {
      document.getElementById('profilePasswordError').textContent = 'Password must be at least 8 characters';
      hasError = true;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      document.getElementById('profilePasswordError').textContent = 'Password must contain uppercase, lowercase, and number';
      hasError = true;
    }

    if (newPassword !== confirmPassword) {
      document.getElementById('profileConfirmPasswordError').textContent = 'Passwords do not match';
      hasError = true;
    }
  }

  if (hasError) return;

  // Show custom confirmation modal
  showProfileSaveConfirm();
});

// Password strength indicator
document.getElementById('profileNewPassword')?.addEventListener('input', (e) => {
  const password = e.target.value;
  const strengthDiv = document.getElementById('profilePasswordStrength');
  
  if (password) {
    strengthDiv.style.display = 'block';
    updatePasswordStrength(password, 'profile');
  } else {
    strengthDiv.style.display = 'none';
  }
});

// Helper functions for localStorage order management
function getOrdersFromLocalStorage() {
  try {
    const stored = localStorage.getItem('orderSubmissions');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

function saveOrdersToLocalStorage(orders) {
  localStorage.setItem('orderSubmissions', JSON.stringify(orders));
}

function getOrderFromLocalStorage(orderId) {
  const orders = getOrdersFromLocalStorage();
  return orders.find(o => o.id === orderId || o.orderId === orderId);
}

function updateOrderStatusInLocalStorage(orderId, newStatus) {
  const orders = getOrdersFromLocalStorage();
  const orderIndex = orders.findIndex(o => o.id === orderId || o.orderId === orderId);
  if (orderIndex !== -1) {
    orders[orderIndex].status = newStatus;
    orders[orderIndex].updatedAt = new Date().toISOString();
    saveOrdersToLocalStorage(orders);
    return true;
  }
  return false;
}

// Load order history from localStorage
function loadOrderHistory() {
  if (!currentUser || !currentUser.customerID) return;

  const tbody = document.getElementById('orderHistoryBody');
  const noOrdersMessage = document.getElementById('noOrdersMessage');

  // Get orders from localStorage
  const allOrders = getOrdersFromLocalStorage();
  const userOrders = allOrders.filter(o => o.customerID === currentUser.customerID);
  
  // Sort by date (newest first)
  userOrders.sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0);
    const dateB = new Date(b.date || b.createdAt || 0);
    return dateB - dateA;
  });

  if (!userOrders.length) {
    if (tbody) tbody.innerHTML = '';
    if (noOrdersMessage) noOrdersMessage.style.display = 'block';
    return;
  }

  if (noOrdersMessage) noOrdersMessage.style.display = 'none';
  if (tbody) {
    tbody.innerHTML = userOrders.map(o => {
      const id = o.id || o.orderId;
      const dateStr = o.date || o.createdAt || new Date().toISOString();
      const date = new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const total = o.grandTotal || o.total || 0;
      const statusName = (o.status || 'pending').toLowerCase();
      const slugMap = {
        'for approval': 'for-approval',
        'for-approval': 'for-approval',
        'pending': 'pending',
        'confirmed': 'confirmed',
        'preparing': 'preparing',
        'ready for pickup': 'ready-for-pickup',
        'ready-for-pickup': 'ready-for-pickup',
        'out for delivery': 'out-for-delivery',
        'out-for-delivery': 'out-for-delivery',
        'completed': 'completed',
        'cancelled': 'cancelled'
      };
      const status = slugMap[statusName] || 'pending';
      const statusClass = getStatusClassForBadge(status);
      const statusLabel = getStatusLabel(status);

      const canCancelBtn = ['for-approval', 'pending'].includes(status);
      const canRateBtn = ['completed'].includes(status);
      const canReorderBtn = ['completed'].includes(status);

      let actionButtons = '';
      if (canRateBtn) actionButtons += `<button class="btn-action btn-rate" onclick="rateOrder(${id})">RATE</button>`;
      actionButtons += canReorderBtn
        ? `<button class=\"btn-action btn-reorder\" onclick=\"reorderOrder(${id})\">RE-ORDER</button>`
        : `<button class=\"btn-action btn-reorder btn-disabled\" style=\"opacity: 0.5; cursor: not-allowed;\" disabled>RE-ORDER</button>`;
      if (canCancelBtn) actionButtons += `<button class="btn-action btn-cancel" onclick="cancelOrder(${id})">CANCEL</button>`;

      return `
        <tr data-order-id="${id}" style="cursor: pointer;">
          <td>${id}</td>
          <td>${date}</td>
          <td>₱ ${total}</td>
          <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
          <td>
            <div class="order-actions" onclick="event.stopPropagation()">
              ${actionButtons}
            </div>
          </td>
        </tr>`;
    }).join('');

    const rows = tbody.querySelectorAll('tr[data-order-id]');
    rows.forEach(row => {
      const orderId = parseInt(row.getAttribute('data-order-id'));
      row.addEventListener('click', function(e) {
        if (!e.target.closest('.order-actions')) {
          if (window.showOrderDetails) {
            window.showOrderDetails(orderId);
          }
        }
      });
    });
  }
}

// Order actions - Re-order from localStorage
window.reorderOrder = function(orderId) {
  const order = getOrderFromLocalStorage(orderId);
  
  if (!order) {
    showAlertMessage('Order not found');
    return;
  }

  // Check if order is completed
  const status = (order.status || 'pending').toLowerCase();
  if (status !== 'completed') {
    showAlertMessage('Re-order is only available for completed orders');
    return;
  }

  // Load order items
  orders = [];
  wilkinsQty = 1;
  
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach(item => {
      const containerTypeKey = item.containerType || 'slim';
      const orderTypeKey = item.orderType || 'refill';
      const qty = item.quantity || 1;
      const price = getUnitPrice(containerTypeKey, orderTypeKey) || 0;
      orders.push({ 
        containerType: containerTypeKey, 
        orderType: orderTypeKey, 
        quantity: qty, 
        price, 
        total: price * qty 
      });
    });
  }

  // Re-Order exemption: prefill with previous address, but keep the checkbox unchecked
  const chk = document.getElementById('useDefaultAddress');
  const addr = document.getElementById('deliveryAddress');
  if (chk) chk.checked = false;
  if (addr) { 
    addr.disabled = false; 
    addr.value = order.deliveryAddress || ''; 
  }
  
  closeProfileModal();
  openModal('order-modal');
  renderOrders();
  updateWilkinsPriceUI();
  updateTotals();
  showSuccessMessage('Order details loaded. You can modify and place the order.');
};

// Store orderId to cancel temporarily
let orderIdToCancel = null;

window.cancelOrder = function(orderId) {
  // Store the orderId and show confirmation modal
  orderIdToCancel = orderId;
  showCancelOrderConfirm();
};

// Store current order ID for navigation
let currentOrderId = null;

// Show order details from localStorage
window.showOrderDetails = function(orderId) {
  currentOrderId = orderId;
  const order = getOrderFromLocalStorage(orderId);
  
  if (!order) {
    showAlertMessage('Order not found');
    return;
  }

  const dateStr = order.date || order.createdAt || new Date().toISOString();
  const date = new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const statusName = (order.status || 'pending').toLowerCase();
  const slugMap = {
    'for approval': 'for-approval',
    'for-approval': 'for-approval',
    'pending': 'pending',
    'confirmed': 'confirmed',
    'preparing': 'preparing',
    'ready for pickup': 'ready-for-pickup',
    'ready-for-pickup': 'ready-for-pickup',
    'out for delivery': 'out-for-delivery',
    'out-for-delivery': 'out-for-delivery',
    'completed': 'completed',
    'cancelled': 'cancelled'
  };
  const status = slugMap[statusName] || 'pending';
  const statusClass = getStatusClassForBadge(status);
  const statusLabel = getStatusLabel(status);
  
  // Determine payment status from payment method
  const paymentMethod = order.paymentMethod || 'cash';
  const paymentStatus = paymentMethod === 'loan' ? 'Pending' : 'Paid';
  const paymentStatusClass = (paymentStatus.toLowerCase() === 'paid') ? 'status-paid' : 'status-pending';

  let itemsHTML = '';
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach(item => {
      const qty = item.quantity || 1;
      const containerType = capitalize(item.containerType || 'slim');
      const orderType = item.orderType === 'brandNew' ? 'Brand New' : 'Refill';
      const name = `${containerType} - ${orderType}`;
      const price = getUnitPrice(item.containerType || 'slim', item.orderType || 'refill') || 25;
      const subtotal = price * qty;
      itemsHTML += `
        <div class="order-item-row">
          <div class="order-item-name">${qty}x ${name}</div>
          <div class="order-item-price">₱ ${subtotal}</div>
        </div>`;
    });
  }

  const canCancelBtn = ['for-approval', 'pending'].includes(status);
  const canRateBtn = ['completed'].includes(status);
  const canReorderBtn = ['completed'].includes(status);
  let actionButtonsHTML = '';
  if (canRateBtn) actionButtonsHTML += `
    <button class="btn-action-large btn-rate-large" onclick="showFeedback(${orderId})">RATE</button>`;
  actionButtonsHTML += canReorderBtn
    ? `<button class="btn-action-large btn-reorder-large" onclick="reorderOrder(${orderId})">RE-ORDER</button>`
    : `<button class="btn-action-large btn-reorder-large btn-disabled" style="opacity: 0.5; cursor: not-allowed;" disabled>RE-ORDER</button>`;
  if (canCancelBtn) actionButtonsHTML += `
    <button class="btn-action-large btn-cancel-large" onclick="cancelOrderFromDetails(${orderId})">CANCEL</button>`;

  const orderIdValue = order.id || order.orderId;
  const totalAmount = order.grandTotal || order.total || 0;
  const deliveryAddress = order.deliveryAddress || '';

  const detailsHTML = `
    <div class="order-details-card">
      <div class="order-details-row">
        <span class="order-details-label">Order ID:</span>
        <span class="order-details-value">${orderIdValue}</span>
      </div>
      <div class="order-details-row">
        <span class="order-details-label">Date:</span>
        <span class="order-details-value">${date}</span>
      </div>
      <div class="order-details-row">
        <span class="order-details-label">Delivery Address:</span>
        <span class="order-details-value" style="text-align: right; max-width: 65%; word-wrap: break-word;">${deliveryAddress}</span>
      </div>
      <div class="order-details-row">
        <span class="order-details-label">Payment Status:</span>
        <span class="order-status-badge ${paymentStatusClass}">${paymentStatus}</span>
      </div>
      <div class="order-details-row" style="border-bottom: 2px solid #E0E0E0; padding-bottom: 15px;">
        <span class="order-details-label">Order Status:</span>
        <span class="order-status-badge ${statusClass}">${statusLabel}</span>
      </div>
      <div class="order-items-list">
        ${itemsHTML}
        <div class="order-total-row" style="border-top: 2px solid #E0E0E0; padding-top: 15px; margin-top: 15px;">
          <span class="order-total-label">TOTAL</span>
          <span class="order-total-value">₱ ${totalAmount}</span>
        </div>
      </div>
      <div class="order-actions-details">${actionButtonsHTML}</div>
    </div>`;

  document.getElementById('orderDetailsContent').innerHTML = detailsHTML;
  document.querySelectorAll('.profile-view').forEach(v => v.classList.remove('active'));
  document.getElementById('orderDetailsView').classList.add('active');
};

// Show feedback view
window.showFeedback = function(orderId) {
  currentOrderId = orderId;
  
  // Reset feedback form
  document.getElementById('feedbackText').value = '';
  document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
  
  // Hide all views and show feedback view
  document.querySelectorAll('.profile-view').forEach(v => v.classList.remove('active'));
  document.getElementById('feedbackView').classList.add('active');
};

// Star rating functionality
document.querySelectorAll('.star').forEach(star => {
  star.addEventListener('click', function() {
    const rating = parseInt(this.dataset.rating);
    document.querySelectorAll('.star').forEach((s, index) => {
      if (index < rating) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });
  });
  
  star.addEventListener('mouseenter', function() {
    const rating = parseInt(this.dataset.rating);
    document.querySelectorAll('.star').forEach((s, index) => {
      if (index < rating) {
        s.style.color = '#FFB300';
      } else {
        s.style.color = '#E0E0E0';
      }
    });
  });
});

document.querySelector('.star-rating').addEventListener('mouseleave', function() {
  document.querySelectorAll('.star').forEach((s, index) => {
    if (!s.classList.contains('active')) {
      s.style.color = '';
    }
  });
});

// Submit feedback - save to localStorage (for testing without database)
window.submitFeedback = function() {
  const rating = document.querySelectorAll('.star.active').length;
  const feedback = document.getElementById('feedbackText').value.trim();
  
  if (rating === 0) {
    alert('Please select a rating before submitting.');
    return;
  }

  if (!currentOrderId) {
    showAlertMessage('Order ID not found');
    return;
  }

  // Get order from localStorage
  const order = getOrderFromLocalStorage(currentOrderId);
  if (!order) {
    showAlertMessage('Order not found');
    return;
  }

  // Get order ID
  const orderID = parseInt(currentOrderId) || parseInt(order.id) || parseInt(order.orderId);
  
  if (!orderID || orderID < 1) {
    showAlertMessage('Invalid Order ID');
    return;
  }

  // Save feedback to localStorage (shared storage for admin to read)
  const feedbackStorage = JSON.parse(localStorage.getItem('customerFeedback') || '[]');
  
  // Create feedback entry
  const feedbackEntry = {
    Feedback_ID: feedbackStorage.length > 0 ? Math.max(...feedbackStorage.map(f => f.Feedback_ID || 0)) + 1 : 1,
    OrderID: orderID,
    RatingScaleID: rating,
    ScaleValue: rating,
    RatingDescription: rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent',
    Comments: feedback || '',
    Feedback_Date: new Date().toISOString(),
    FirstName: order.firstName || order.customerName?.split(' ')[0] || 'Customer',
    LastName: order.lastName || order.customerName?.split(' ').slice(1).join(' ') || '',
    Phone: order.phone || '',
    TotalAmount: parseFloat(order.grandTotal || order.total || 0),
    OrderDate: order.date || order.createdAt || new Date().toISOString(),
    OrderStatusName: order.status || 'Completed',
    OrderTypeName: order.orderType || 'Refill'
  };
  
  feedbackStorage.push(feedbackEntry);
  localStorage.setItem('customerFeedback', JSON.stringify(feedbackStorage));
  
  // Also save to order's feedback array for local display
  const orders = getOrdersFromLocalStorage();
  const orderIndex = orders.findIndex(o => o.id === currentOrderId || o.orderId === currentOrderId);
  
  if (orderIndex !== -1) {
    if (!orders[orderIndex].feedback) {
      orders[orderIndex].feedback = [];
    }
    orders[orderIndex].feedback.push({
      rating: rating,
      comments: feedback,
      date: new Date().toISOString()
    });
    saveOrdersToLocalStorage(orders);
  }
  
  showFeedbackThankYou();
  showSuccessMessage('Thank you! Your feedback has been saved.');
};

// Back navigation
window.goBackToOrderDetails = function() {
  // Hide all views
  document.querySelectorAll('.profile-view').forEach(v => v.classList.remove('active'));
  if (currentOrderId) {
    showOrderDetails(currentOrderId);
  } else {
    document.getElementById('orderDetailsView').classList.add('active');
  }
};

window.goBackToOrderHistory = function() {
  // Hide all views
  document.querySelectorAll('.profile-view').forEach(v => v.classList.remove('active'));
  // Show order history view
  document.getElementById('orderHistoryView').classList.add('active');
  currentOrderId = null;
};

// Cancel order from details view
window.cancelOrderFromDetails = function(orderId) {
  cancelOrder(orderId);
  goBackToOrderHistory();
};

window.rateOrder = function(orderId) {
  showFeedback(orderId);
};

// Logout confirmation functions
function closeLogoutConfirm() {
  const logoutModal = document.getElementById('logoutConfirmModal');
  if (logoutModal) {
    logoutModal.style.display = 'none';
  }
}
window.closeLogoutConfirm = closeLogoutConfirm;

function confirmLogout() {
  Api.logout().finally(async () => {
    await checkAuth();
    showSuccessMessage('Logged out successfully!');
    closeProfileModal();
    closeLogoutConfirm();
  });
}
window.confirmLogout = confirmLogout;

// Profile save confirmation functions
function showProfileSaveConfirm() {
  const saveModal = document.getElementById('profileSaveConfirmModal');
  if (saveModal) {
    saveModal.style.display = 'flex';
  }
}
window.showProfileSaveConfirm = showProfileSaveConfirm;

function closeProfileSaveConfirm() {
  const saveModal = document.getElementById('profileSaveConfirmModal');
  if (saveModal) {
    saveModal.style.display = 'none';
  }
}
window.closeProfileSaveConfirm = closeProfileSaveConfirm;

function confirmSaveProfile() {
  if (!currentUser) {
    closeProfileSaveConfirm();
    return;
  }

  // Get form values
  const firstName = document.getElementById('profileFirstName').value.trim();
  const lastName = document.getElementById('profileLastName').value.trim();
  const username = document.getElementById('profileUsername').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const email = document.getElementById('profileEmail').value.trim();
  const address = document.getElementById('profileAddress').value.trim();
  const customerType = document.querySelector('input[name="profileCustomerType"]:checked').value;
  const currentPassword = document.getElementById('profileCurrentPassword').value;
  const newPassword = document.getElementById('profileNewPassword').value;

  const payload = {
    firstName,
    lastName,
    username,
    email,
    phone,
    address,
    currentPassword,
    password: newPassword || '',
    retypePassword: newPassword || '',
    customerType
  };

  Api.updateAccount(payload).then(async (resp) => {
    if (resp && (resp.success || resp.status === 'success')) {
      await checkAuth();
      showSuccessMessage('Profile updated successfully!');
      loadProfileData();
      closeProfileSaveConfirm();
    } else {
      showAlertMessage(resp?.message || 'Failed to update profile');
    }
  }).catch(() => showAlertMessage('Failed to update profile'));
}
window.confirmSaveProfile = confirmSaveProfile;

// Feedback Thank You Modal functions
function showFeedbackThankYou() {
  const thankYouModal = document.getElementById('feedbackThankYouModal');
  if (thankYouModal) {
    thankYouModal.style.display = 'flex';
  }
}
window.showFeedbackThankYou = showFeedbackThankYou;

function closeFeedbackThankYou() {
  const thankYouModal = document.getElementById('feedbackThankYouModal');
  if (thankYouModal) {
    thankYouModal.style.display = 'none';
  }
  // Go back to order history after closing
  goBackToOrderHistory();
}
window.closeFeedbackThankYou = closeFeedbackThankYou;

// Cancel Order Confirmation Modal functions
function showCancelOrderConfirm() {
  const cancelModal = document.getElementById('cancelOrderConfirmModal');
  if (cancelModal) {
    cancelModal.style.display = 'flex';
  }
}
window.showCancelOrderConfirm = showCancelOrderConfirm;

function closeCancelOrderConfirm() {
  const cancelModal = document.getElementById('cancelOrderConfirmModal');
  if (cancelModal) {
    cancelModal.style.display = 'none';
  }
  orderIdToCancel = null;
}
window.closeCancelOrderConfirm = closeCancelOrderConfirm;

function confirmCancelOrder() {
  if (orderIdToCancel !== null) {
    const order = getOrderFromLocalStorage(orderIdToCancel);
    
    if (!order) {
      showAlertMessage('Order not found');
      closeCancelOrderConfirm();
      orderIdToCancel = null;
      return;
    }

    const status = (order.status || 'pending').toLowerCase();
    if (status !== 'pending' && status !== 'for-approval') {
      showAlertMessage('Order cannot be cancelled at this stage');
      closeCancelOrderConfirm();
      orderIdToCancel = null;
      return;
    }

    // Update order status in localStorage
    if (updateOrderStatusInLocalStorage(orderIdToCancel, 'cancelled')) {
      showSuccessMessage('Order cancelled successfully!');
      loadOrderHistory();
    } else {
      showAlertMessage('Failed to cancel order');
    }
    
    closeCancelOrderConfirm();
    orderIdToCancel = null;
  }
}
window.confirmCancelOrder = confirmCancelOrder;

window.cancelOrderRollover = cancelOrderRollover;
window.confirmOrderRollover = confirmOrderRollover;

// Menu navigation
document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    const view = item.dataset.view;
    
    if (view === 'logout') {
      // Open logout confirmation modal
      const logoutModal = document.getElementById('logoutConfirmModal');
      if (logoutModal) {
        logoutModal.style.display = 'flex';
      }
      return;
    }

    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
    // Add active class to clicked item
    item.classList.add('active');

    // Hide all views
    document.querySelectorAll('.profile-view').forEach(v => v.classList.remove('active'));
    
    // Show selected view
    if (view === 'manage-profile') {
      document.getElementById('manageProfileView').classList.add('active');
      loadProfileData();
    } else if (view === 'order-history') {
      document.getElementById('orderHistoryView').classList.add('active');
      loadOrderHistory();
    }
  });
});

// Ensure orders have IDs and status when placed
const originalPlaceOrder = document.getElementById('placeOrderBtn')?.onclick;
document.getElementById('placeOrderBtn')?.removeEventListener('click', originalPlaceOrder);

function getCapacitySnapshot() {
  if (latestCapacityInfo && (Number.isFinite(latestCapacityInfo.available) || Number.isFinite(latestCapacityInfo.total))) {
    return {
      available: Number.isFinite(latestCapacityInfo.available) ? latestCapacityInfo.available : null,
      total: Number.isFinite(latestCapacityInfo.total) ? latestCapacityInfo.total : null
    };
  }

  try {
    const stored = localStorage.getItem('system_config');
    if (!stored) return { available: null, total: null };
    const config = JSON.parse(stored);
    const availableValue = Number.isFinite(parseInt(config.available_capacity, 10)) ? parseInt(config.available_capacity, 10) : null;
    const totalValue = Number.isFinite(parseInt(config.daily_order_limit, 10)) ? parseInt(config.daily_order_limit, 10) : null;
    return {
      available: availableValue,
      total: totalValue
    };
  } catch (err) {
    console.warn('Unable to parse capacity snapshot', err);
    return { available: null, total: null };
  }
}

function checkOrderRolloverRequirements() {
  const now = new Date();
  const currentHour = now.getHours();
  const isAfterOperatingHours = currentHour >= OPERATING_END_HOUR;
  const { available, total } = getCapacitySnapshot();
  const capacityLimit = Number.isFinite(total) ? total : 300;
  const isCapacityReached = Number.isFinite(available) ? available <= 0 : false;

  if (!isAfterOperatingHours && !isCapacityReached) {
    return { requiresConfirmation: false };
  }

  const messageParts = [];

  if (isAfterOperatingHours) {
    messageParts.push("It's already past our 5:00 PM operating hours. Orders placed now will be processed with tomorrow's batch.");
  }

  if (isCapacityReached) {
    messageParts.push(`Today's order capacity of ${capacityLimit} orders has been reached. Any new orders will be queued for tomorrow.`);
  }

  messageParts.push('Do you still want to continue and place your order for tomorrow?');

  return {
    requiresConfirmation: true,
    message: messageParts.join('<br><br>')
  };
}

function openOrderRolloverConfirm(message) {
  const modal = document.getElementById('orderRolloverConfirmModal');
  const messageEl = document.getElementById('orderRolloverMessage');
  if (messageEl) {
    messageEl.innerHTML = message || 'Your order will be scheduled for tomorrow. Do you want to continue?';
  }
  if (modal) {
    modal.style.display = 'flex';
  }
}

function hideOrderRolloverConfirm() {
  const modal = document.getElementById('orderRolloverConfirmModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function cancelOrderRollover() {
  pendingOrderSubmission = null;
  hideOrderRolloverConfirm();
}

function confirmOrderRollover() {
  const payload = pendingOrderSubmission;
  pendingOrderSubmission = null;
  hideOrderRolloverConfirm();
  if (payload) {
    submitOrderPayload(payload);
  }
}

function submitOrderPayload(payload) {
  Api.addOrder(payload).then((resp) => {
    if (resp && resp.success) {
      showSuccessMessage("Order placed successfully!");
      orders = [];
      wilkinsQty = 1;
      selectedOrderIndex = null;
      const additionalWilkinsCheckbox = document.getElementById("additionalWilkins");
      if (additionalWilkinsCheckbox) additionalWilkinsCheckbox.checked = false;
      const wilkinsControl = document.getElementById("wilkinsControl");
      if (wilkinsControl) wilkinsControl.style.display = "none";
      const addBtn = document.getElementById("addOrderBtn");
      if (addBtn) addBtn.textContent = "Add";
      renderOrders();
      updateTotals();
      closeModal();
      loadOrderHistory();
    } else {
      showAlertMessage(resp?.error || resp?.message || 'Order failed');
    }
  }).catch(() => showAlertMessage('Order failed'));
}

document.getElementById('placeOrderBtn')?.addEventListener('click', () => {
  if (!currentUser) return alert("Please login first.");

  // Check if there are any items (containers or wilkins)
  const wilkinsChecked = document.getElementById("additionalWilkins").checked;
  const containersTotal = orders.reduce((sum, o) => sum + o.total, 0);
  const wilkinsTotal = wilkinsChecked ? getUnitPrice('wilkins','refill') * wilkinsQty : 0;
  const grandTotal = containersTotal + wilkinsTotal;
  
  if (!wilkinsChecked && orders.length === 0) {
    alert("Please add at least one item to your order.");
    return;
  }

  const address =
    document.getElementById("useDefaultAddress").checked === true
      ? (currentUser.address || '')
      : document.getElementById("deliveryAddress").value.trim();

  if (!address) return alert("Please provide a delivery address.");

  const paymentMethod = document.getElementById("paymentMethod").value;

  // Build backend items
  const items = orders.map(o => ({
    containerTypeID: window.ApiMaps.UI_CONTAINER_TO_ID[o.containerType] || 2,
    orderCategory: o.orderType === 'brandNew' ? 'Brand New' : 'Refill',
    quantity: o.quantity
  }));
  if (wilkinsChecked && wilkinsQty > 0) {
    items.push({ containerTypeID: window.ApiMaps.UI_CONTAINER_TO_ID['wilkins'], orderCategory: 'Refill', quantity: wilkinsQty });
  }

  const payload = {
    customerID: currentUser.customerID,
    useHouseAddress: document.getElementById("useDefaultAddress").checked === true,
    deliveryAddress: address,
    mopID: window.ApiMaps.MOP_NAME_TO_ID[paymentMethod] || 1,
    receivingMethodID: window.ApiMaps.RECEIVING_METHOD_TO_ID[document.getElementById("deliveryMethod").value] || 1,
    items
  };

  const rolloverCheck = checkOrderRolloverRequirements();
  if (rolloverCheck.requiresConfirmation) {
    pendingOrderSubmission = payload;
    openOrderRolloverConfirm(rolloverCheck.message);
    return;
  }

  pendingOrderSubmission = null;
  submitOrderPayload(payload);
});

/* =========================
   OPERATING HOURS MODAL
   ========================= */
function openOperatingHoursModal() {
  const modal = document.getElementById('operatingHoursModal');
  if (modal) {
    modal.style.display = 'flex';
    // Refresh static operating schedule display
    loadOperatingHours();
  }
}

function closeOperatingHoursModal() {
  const modal = document.getElementById('operatingHoursModal');
  if (modal) {
    modal.style.display = 'none';
  }
}
window.closeOperatingHoursModal = closeOperatingHoursModal;

function loadOperatingHours() {
  const openingTime = document.getElementById('customerOpeningTime');
  const closingTime = document.getElementById('customerClosingTime');
  const operatingDays = document.getElementById('customerOperatingDays');

  if (openingTime) openingTime.textContent = '08:00 AM';
  if (closingTime) closingTime.textContent = '05:00 PM';

  if (operatingDays) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    operatingDays.innerHTML = days
      .map(day => `<div class="day-badge active">${day}</div>`)
      .join('');
  }
}

// Learn More button event listener
document.getElementById('learnMoreBtn')?.addEventListener('click', () => {
  openOperatingHoursModal();
});

/* =========================
   MAINTENANCE NOTICE MODAL
   ========================= */
// Function to fetch maintenance notice from API
async function fetchMaintenanceNotice() {
  try {
    const API_BASE = new URL('../admin_backend/api/', window.location.href).toString().replace(/\/$/, '');
    const response = await fetch(`${API_BASE}/get_system_config.php?type=maintenance`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch maintenance notice');
    }
    
    const data = await response.json();
    
    if (data.success && data.config) {
      return data.config;
    } else {
      // Try localStorage as fallback
      const stored = localStorage.getItem('system_config');
      if (stored) {
        const config = JSON.parse(stored);
        return {
          active: config.maintenance_active === '1' || config.maintenance_active === true,
          title: config.maintenance_title || '',
          message: config.maintenance_message || '',
          startDate: config.maintenance_start_date || '',
          endDate: config.maintenance_end_date || ''
        };
      }
      return null;
    }
  } catch (error) {
    console.error('Error fetching maintenance notice:', error);
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('system_config');
      if (stored) {
        const config = JSON.parse(stored);
        return {
          active: config.maintenance_active === '1' || config.maintenance_active === true,
          title: config.maintenance_title || '',
          message: config.maintenance_message || '',
          startDate: config.maintenance_start_date || '',
          endDate: config.maintenance_end_date || ''
        };
      }
    } catch (e) {
      console.error('Error parsing localStorage:', e);
    }
    return null;
  }
}

// Function to format date and time
function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return 'Not specified';
  
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateTimeStr;
  }
}

// Function to open maintenance notice modal
window.openMaintenanceNoticeModal = async function() {
  const modal = document.getElementById('maintenanceNoticeModal');
  if (!modal) return;
  
  // Show modal
  modal.style.display = 'flex';
  
  // Show loading state
  const loading = document.getElementById('maintenanceLoading');
  const content = document.getElementById('maintenanceContent');
  const empty = document.getElementById('maintenanceEmpty');
  const title = document.getElementById('maintenanceModalTitle');
  const message = document.getElementById('maintenanceMessage');
  const dates = document.getElementById('maintenanceDates');
  
  if (loading) loading.style.display = 'block';
  if (content) content.style.display = 'none';
  if (empty) empty.style.display = 'none';
  
  // Fetch maintenance notice
  const maintenance = await fetchMaintenanceNotice();
  
  // Hide loading
  if (loading) loading.style.display = 'none';
  
  if (maintenance && maintenance.active && (maintenance.title || maintenance.message)) {
    // Show content
    if (content) content.style.display = 'block';
    if (empty) empty.style.display = 'none';
    
    // Set title
    if (title) {
      title.textContent = maintenance.title || 'Maintenance Notice';
    }
    
    // Set message
    if (message) {
      message.textContent = maintenance.message || 'Maintenance is currently scheduled.';
    }
    
    // Set dates
    if (dates) {
      let datesHTML = '';
      
      if (maintenance.startDate) {
        datesHTML += `
          <div class="maintenance-date-item">
            <span class="maintenance-date-label">Estimated Start Date & Time:</span>
            <span class="maintenance-date-value">${formatDateTime(maintenance.startDate)}</span>
          </div>`;
      }
      
      if (maintenance.endDate) {
        datesHTML += `
          <div class="maintenance-date-item">
            <span class="maintenance-date-label">Estimated End Date & Time:</span>
            <span class="maintenance-date-value">${formatDateTime(maintenance.endDate)}</span>
          </div>`;
      }
      
      if (datesHTML) {
        dates.innerHTML = datesHTML;
      } else {
        dates.innerHTML = '';
      }
    }
  } else {
    // Show empty state
    if (content) content.style.display = 'none';
    if (empty) empty.style.display = 'block';
    if (title) title.textContent = 'Maintenance Notice';
  }
};

// Function to close maintenance notice modal
window.closeMaintenanceNoticeModal = function() {
  const modal = document.getElementById('maintenanceNoticeModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

// Close modal when clicking outside
document.getElementById('maintenanceNoticeModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'maintenanceNoticeModal') {
    closeMaintenanceNoticeModal();
  }
});

document.getElementById('orderRolloverConfirmModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'orderRolloverConfirmModal') {
    cancelOrderRollover();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('maintenanceNoticeModal');
    if (modal && modal.style.display === 'flex') {
      closeMaintenanceNoticeModal();
    }
  }
});

/* =========================
   CAPACITY DISPLAY
   ========================= */
function loadCapacity() {
  try {
    // Load from localStorage (shared with admin)
    const stored = localStorage.getItem('system_config');
    const config = stored ? JSON.parse(stored) : null;
    
    const availableEl = document.getElementById('availableCapacityDisplay');
    const totalEl = document.getElementById('capacityTotalDisplay');
    let availableValue = null;
    let totalValue = null;
    
    if (config) {
      availableValue = parseInt(config.available_capacity, 10);
      if (!Number.isFinite(availableValue)) availableValue = null;
      totalValue = parseInt(config.daily_order_limit, 10);
      if (!Number.isFinite(totalValue)) totalValue = null;

      if (availableEl) {
        const displayAvailable = availableValue !== null ? availableValue : (config.available_capacity || '300');
        availableEl.textContent = displayAvailable;
      }
      if (totalEl) {
        const displayTotal = totalValue !== null ? totalValue : (config.daily_order_limit || '300');
        totalEl.textContent = `/ ${displayTotal}`;
      }
    } else {
      // Set defaults
      availableValue = 300;
      totalValue = 300;
      if (availableEl) availableEl.textContent = '300';
      if (totalEl) totalEl.textContent = '/ 300';
    }

    latestCapacityInfo = {
      available: availableValue,
      total: totalValue
    };
  } catch (e) {
    console.error('Failed to load capacity', e);
    // Set defaults on error
    const availableEl = document.getElementById('availableCapacityDisplay');
    const totalEl = document.getElementById('capacityTotalDisplay');
    if (availableEl) availableEl.textContent = '300';
    if (totalEl) totalEl.textContent = '/ 300';
    latestCapacityInfo = {
      available: null,
      total: null
    };
  }
}

// Load capacity on page load
document.addEventListener('DOMContentLoaded', () => {
  loadCapacity();
  
  // Reload capacity when order modal opens
  const orderNowBtn = document.getElementById('orderNowBtn');
  if (orderNowBtn) {
    orderNowBtn.addEventListener('click', () => {
      setTimeout(() => {
        loadCapacity();
      }, 100);
    });
  }
  
  // Listen for localStorage changes (when admin saves)
  window.addEventListener('storage', (e) => {
    if (e.key === 'system_config') {
      loadCapacity();
    }
  });
  
  // Also check periodically (for same-tab updates)
  setInterval(() => {
    loadCapacity();
  }, 2000); // Check every 2 seconds

  // =====================================
  // SMOOTH SCROLL & PARALLAX EFFECTS
  // =====================================
  
  // Header is now fixed and doesn't change on scroll

  // Intersection Observer for section animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  // Observe all sections
  document.querySelectorAll('.services, .about, .credentials, .why-choose').forEach(section => {
    observer.observe(section);
  });

  // Parallax effect for hero section
  const hero = document.querySelector('.hero');
  if (hero) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const heroContent = hero.querySelector('.hero-content');
      if (heroContent && scrolled < window.innerHeight) {
        heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
        heroContent.style.opacity = 1 - (scrolled / window.innerHeight) * 0.5;
      }
    });
  }

  // Smooth scroll for navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // Floating water drops animation on scroll
  const createFloatingDrop = () => {
    const drop = document.createElement('div');
    drop.className = 'floating-element';
    const size = Math.random() * 100 + 50;
    drop.style.width = size + 'px';
    drop.style.height = size + 'px';
    drop.style.left = Math.random() * 100 + '%';
    drop.style.top = Math.random() * 100 + '%';
    drop.style.animationDelay = Math.random() * 10 + 's';
    drop.style.animationDuration = (Math.random() * 20 + 15) + 's';
    
    const hero = document.querySelector('.hero');
    if (hero) {
      hero.appendChild(drop);
      
      // Remove after animation
      setTimeout(() => {
        if (drop.parentNode) {
          drop.parentNode.removeChild(drop);
        }
      }, 30000);
    }
  };

  // Create floating drops periodically
  setInterval(() => {
    if (document.querySelector('.hero')) {
      createFloatingDrop();
    }
  }, 5000);

  // Initial floating drops
  for (let i = 0; i < 3; i++) {
    setTimeout(() => createFloatingDrop(), i * 2000);
  }

  // Mobile Menu Toggle
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mainNav = document.getElementById('mainNav');
  
  if (mobileMenuToggle && mainNav) {
    mobileMenuToggle.addEventListener('click', () => {
      mobileMenuToggle.classList.toggle('active');
      mainNav.classList.toggle('active');
      document.body.style.overflow = mainNav.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu when clicking on nav links
    const navLinks = mainNav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuToggle.classList.remove('active');
        mainNav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (mainNav.classList.contains('active') && 
          !mainNav.contains(e.target) && 
          !mobileMenuToggle.contains(e.target)) {
        mobileMenuToggle.classList.remove('active');
        mainNav.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
});

