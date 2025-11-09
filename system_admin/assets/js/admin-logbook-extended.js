// Customer Logbook functionality
(function() {
  const ADMIN_CUSTOMERS_STORAGE_KEY = 'adminCustomers';
  const MOCK_ACCOUNTS_STORAGE_KEY = 'mock_accounts';
  const ORDER_SUBMISSIONS_STORAGE_KEY = 'orderSubmissions';
  const ADMIN_ORDERS_STORAGE_KEY = 'mock_orders';

  function safeParseJSON(raw, fallback = null) {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function readStorageArray(key) {
    const parsed = safeParseJSON(localStorage.getItem(key), []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function writeStorageValue(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
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

  function normaliseString(value) {
    return (value || '').toString().trim();
  }

  function toLower(value) {
    return normaliseString(value).toLowerCase();
  }

  function buildCustomerFullName(firstName, lastName) {
    return [normaliseString(firstName), normaliseString(lastName)].filter(Boolean).join(' ').trim();
  }

  let allCustomers = [];
  let filteredCustomers = [];
  let currentTab = 'all'; // 'all', 'online', 'walkin'
  
  function mapToExtendedCustomer(customer) {
    if (!customer) return null;
    return {
      CustomerID: customer.id ?? customer.CustomerID ?? customer.customerID ?? null,
      AccountID: customer.accountID ?? customer.AccountID ?? customer.accountID ?? null,
      FirstName: customer.firstName ?? customer.FirstName ?? '',
      LastName: customer.lastName ?? customer.LastName ?? '',
      Phone: customer.phone ?? customer.Phone ?? '',
      HouseAddress: customer.address ?? customer.HouseAddress ?? '',
      CreatedAt: customer.createdAt ?? customer.CreatedAt ?? null,
      CustomerTypeName: customer.customerTypeName ?? customer.CustomerTypeName ?? (customer.isOnline ? 'Online' : 'Walk-in'),
      CustomerTypeID: customer.customerTypeId ?? customer.CustomerTypeID ?? null,
      Username: customer.username ?? customer.Username ?? '',
      Email: customer.email ?? customer.Email ?? '',
      isOnline: Boolean(customer.isOnline)
    };
  }
  
  function loadCustomers() {
    const localFetcher = window.__getLocalLogbookCustomers;
    try {
      const localCustomers = typeof localFetcher === 'function' ? localFetcher() : [];
      allCustomers = localCustomers
        .map(mapToExtendedCustomer)
        .filter(Boolean)
        .sort((a, b) => {
          const timeA = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
          const timeB = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;
          if (timeA !== timeB) {
            return timeB - timeA;
          }
          const nameA = `${(a.FirstName || '').toLowerCase()} ${(a.LastName || '').toLowerCase()}`.trim();
          const nameB = `${(b.FirstName || '').toLowerCase()} ${(b.LastName || '').toLowerCase()}`.trim();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });
  
      filterCustomers();
      updateStats();
      renderCustomersTable();
    } catch (error) {
      console.error('Failed to load customers:', error);
      allCustomers = [];
      filteredCustomers = [];
      updateStats();
      renderCustomersTable();
    }
  }
  
  // Filter customers based on tab and search
  function filterCustomers() {
    const rawSearch = document.getElementById('logbookSearch')?.value || '';
    const searchTerm = rawSearch.toLowerCase().trim();
    const digitsTerm = rawSearch.replace(/\D/g, '').trim();
    
    filteredCustomers = allCustomers.filter(customer => {
      if (currentTab === 'online' && !customer.isOnline) {
        return false;
      }
      if (currentTab === 'walkin' && customer.isOnline) {
        return false;
      }
      
      if (searchTerm) {
        const phoneRaw = (customer.Phone || '').toString();
        const phoneDigits = phoneRaw.replace(/\D/g, '');
        const combined = [
          customer.FirstName,
          customer.LastName,
          phoneRaw,
          customer.HouseAddress,
          customer.AccountID,
          customer.Email,
          customer.Username,
          customer.CustomerTypeName
        ].map(part => (part || '').toString().toLowerCase()).join(' ');
        
        const matches = combined.includes(searchTerm) ||
          (digitsTerm && phoneDigits.includes(digitsTerm));
        
        if (!matches) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  // Update statistics
  function updateStats() {
    const totalCustomers = allCustomers.length;
    const onlineCustomers = allCustomers.filter(c => c.isOnline).length;
    const walkinCustomers = allCustomers.filter(c => !c.isOnline).length;
    
    const totalEl = document.getElementById('statTotalCustomers');
    const onlineEl = document.getElementById('statOnlineCustomers');
    const walkinEl = document.getElementById('statWalkinCustomers');
    const countBadge = document.getElementById('logbookCustomerCount');
    
    if (totalEl) totalEl.textContent = totalCustomers;
    if (onlineEl) onlineEl.textContent = onlineCustomers;
    if (walkinEl) walkinEl.textContent = walkinCustomers;
    if (countBadge) {
      const count = filteredCustomers.length;
      countBadge.textContent = `${count} ${count === 1 ? 'customer' : 'customers'}`;
    }
  }
  
  // Render customers table
  function renderCustomersTable() {
    const tableBody = document.getElementById('logbookCustomersTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (filteredCustomers.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'orders-empty-row';
      
      const emptyCell = document.createElement('td');
      emptyCell.className = 'orders-empty-state logbook-empty-state-cell';
      emptyCell.colSpan = 7;
      emptyCell.textContent = 'No customers yet';
      
      emptyRow.appendChild(emptyCell);
      tableBody.appendChild(emptyRow);
      return;
    }
    
    filteredCustomers.forEach(customer => {
      const row = document.createElement('tr');
      row.className = 'logbook-table-row logbook-table-row-clickable';
      row.setAttribute('tabindex', '0');
      row.dataset.customerId = customer.CustomerID || '';
      row.dataset.customerType = customer.isOnline ? 'online' : 'walkin';
      
      // Format date
      const createdAt = customer.CreatedAt ? new Date(customer.CreatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) : '-';
      
      // Format AccountID
      const accountId = customer.AccountID && customer.AccountID !== 'No account' ? customer.AccountID : '-';
      
      const cellValues = [
        customer.CustomerID || '-',
        customer.FirstName || '-',
        customer.LastName || '-',
        accountId,
        customer.Phone || '-',
        customer.HouseAddress || '-',
        createdAt
      ];
      
      const cellClassMap = [
        '',
        '',
        '',
        '',
        'logbook-phone-cell',
        'logbook-address-cell',
        ''
      ];
      
      cellValues.forEach((value, index) => {
        const cell = document.createElement('td');
        const extraClass = cellClassMap[index];
        if (extraClass) {
          cell.classList.add(extraClass);
        }
        cell.textContent = value || '-';
        row.appendChild(cell);
      });
      
      row.addEventListener('click', () => openCustomerModal(customer.CustomerID));
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openCustomerModal(customer.CustomerID);
        }
      });
      
      tableBody.appendChild(row);
    });
  }

  function formatDisplayDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatDisplayDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function populateCustomerModal(fragment, customer) {
    if (!fragment || !customer) return;

    const formattedAccountId = customer.AccountID && customer.AccountID !== 'No account'
      ? customer.AccountID
      : customer.isOnline ? 'Pending account' : 'No account';

    fragment.querySelectorAll('[data-field-text]').forEach(el => {
      const field = el.getAttribute('data-field-text');
      if (!field) return;

      if (field === 'AccountID') {
        el.textContent = formattedAccountId;
        return;
      }

      if (field === 'CreatedAtFormatted') {
        el.textContent = formatDisplayDateTime(customer.CreatedAt);
        return;
      }

      const value = customer[field] ?? '-';
      el.textContent = value === '' ? '-' : value;
    });

    fragment.querySelectorAll('[data-field-input]').forEach(input => {
      const field = input.getAttribute('data-field-input');
      if (!field) return;

      let value = customer[field];
      if (field === 'HouseAddress') {
        value = customer.HouseAddress || '';
      }

      if (field === 'Username' || field === 'Email') {
        const hasValue = typeof value === 'string' && value.trim() !== '';
        input.value = hasValue ? value : '';
        if (!hasValue) {
          input.placeholder = 'Not available';
          input.disabled = true;
        }
        return;
      }

      input.value = value ?? '';
    });

    fragment.querySelectorAll('[data-field-select]').forEach(select => {
      const field = select.getAttribute('data-field-select');
      if (!field) return;
      const rawValue = customer[field] || '';
      const defaultLabel = 'Regular';
      const normalisedValue = normaliseCustomerTypeLabel(rawValue, defaultLabel);
      const options = Array.from(select.options || []);
      const targetOption = options.find(option => option.value === normalisedValue);
      if (targetOption) {
        select.value = normalisedValue;
      } else if (options.length > 0) {
        select.value = options[0].value;
      }
    });

    const customerTypeName = normaliseCustomerTypeLabel(customer.CustomerTypeName, 'Regular').toLowerCase();
    fragment.querySelectorAll('[data-field-radio]').forEach(radio => {
      const radioValue = (radio.value || '').toLowerCase();
      radio.checked = radioValue === customerTypeName || (!radioValue && !customerTypeName);
    });
  }

  function closeCustomerModal() {
    const modal = document.getElementById('customerDetailsModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    modal.classList.remove('customer-modal-saving');
  }

  function normaliseCustomerTypeLabel(rawValue, fallback = 'Regular') {
    const value = (rawValue || '').toString().trim().toLowerCase();

    if (!value) {
      return fallback;
    }

    if (value === 'dealer') return 'Dealer';
    if (value === 'walkin' || value === 'walk-in') return 'Regular';
    if (value === 'regular') return 'Regular';

    if (rawValue === 'Dealer' || rawValue === 'Regular') {
      return rawValue;
    }

    if (rawValue === 'Walk-in') {
      return 'Regular';
    }

    return fallback;
  }

  function mapCustomerTypeToId(typeName) {
    const value = (typeName || '').toString().trim().toLowerCase();
    if (value === 'dealer') return 2;
    return 1;
  }

  function buildStorageRecordFromCustomer(customer) {
    const typeName = normaliseCustomerTypeLabel(
      customer.CustomerTypeName,
      'Regular'
    );

    return {
      CustomerID: customer.CustomerID ?? null,
      AccountID: customer.AccountID ?? null,
      FirstName: customer.FirstName ?? '',
      LastName: customer.LastName ?? '',
      Phone: customer.Phone ?? '',
      HouseAddress: customer.HouseAddress ?? '',
      CustomerTypeID: customer.CustomerTypeID ?? mapCustomerTypeToId(typeName),
      CustomerTypeName: typeName,
      CreatedAt: customer.CreatedAt ?? null,
      Email: customer.Email ?? '',
      Username: customer.Username ?? '',
      isOnline: Boolean(customer.isOnline)
    };
  }

  function syncCustomerToLocalStorage(customer) {
    if (!customer || customer.CustomerID === undefined || customer.CustomerID === null) {
      return;
    }

    try {
      const raw = localStorage.getItem(ADMIN_CUSTOMERS_STORAGE_KEY);
      let existing = [];

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            existing = parsed;
          }
        } catch (error) {
          console.warn('Failed to parse adminCustomers cache, resetting.', error);
        }
      }

      const storageRecord = buildStorageRecordFromCustomer(customer);
      const customerIdString = String(storageRecord.CustomerID);

      let updated = false;
      const next = existing.map(entry => {
        if (entry && String(entry.CustomerID) === customerIdString) {
          updated = true;
          return { ...entry, ...storageRecord };
        }
        return entry;
      });

      if (!updated) {
        next.push(storageRecord);
      }

      localStorage.setItem(ADMIN_CUSTOMERS_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('Unable to sync customer to adminCustomers cache:', error);
    }
  }

  function showModalToast(container, message, variant = 'error') {
    if (!container) {
      alert(message);
      return;
    }
    const toast = document.createElement('div');
    toast.className = `customer-modal-toast ${variant}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  function updateOrdersWithCustomer(customer) {
    if (!customer || customer.CustomerID == null) {
      return;
    }
    const customerIdString = String(customer.CustomerID);
    const accountIdString = customer.AccountID != null ? String(customer.AccountID) : null;
    const fullName = buildCustomerFullName(customer.FirstName, customer.LastName);
    const updatedAt = new Date().toISOString();

    const orderSubmissions = readStorageArray(ORDER_SUBMISSIONS_STORAGE_KEY);
    let ordersChanged = false;
    orderSubmissions.forEach(order => {
      const orderCustomerId = order?.customerID != null ? String(order.customerID) : (order?.CustomerID != null ? String(order.CustomerID) : null);
      const orderAccountId = order?.accountId != null ? String(order.accountId) : (order?.AccountID != null ? String(order.AccountID) : null);
      const matches = (orderCustomerId && orderCustomerId === customerIdString) ||
        (accountIdString && orderAccountId && orderAccountId === accountIdString);
      if (!matches) {
        return;
      }
      if (fullName) {
        order.customerName = fullName;
      }
      if (customer.FirstName !== undefined) {
        order.firstName = customer.FirstName;
      }
      if (customer.LastName !== undefined) {
        order.lastName = customer.LastName;
      }
      if (customer.Phone !== undefined) {
        order.phone = customer.Phone;
      }
      if (customer.HouseAddress !== undefined) {
        order.deliveryAddress = customer.HouseAddress;
        order.address = customer.HouseAddress;
      }
      order.customerType = customer.CustomerTypeName;
      order.updatedAt = updatedAt;
      ordersChanged = true;
    });
    if (ordersChanged) {
      writeStorageValue(ORDER_SUBMISSIONS_STORAGE_KEY, orderSubmissions);
    }

    const adminOrders = readStorageArray(ADMIN_ORDERS_STORAGE_KEY);
    let adminChanged = false;
    adminOrders.forEach(order => {
      const orderCustomerId = order?.CustomerID != null ? String(order.CustomerID) : null;
      const orderAccountId = order?.AccountID != null ? String(order.AccountID) : null;
      const matches = (orderCustomerId && orderCustomerId === customerIdString) ||
        (accountIdString && orderAccountId && orderAccountId === accountIdString);
      if (!matches) {
        return;
      }
      if (customer.HouseAddress !== undefined) {
        order.DeliveryAddress = customer.HouseAddress;
      }
      if (customer.CustomerTypeName) {
        order.CustomerTypeName = customer.CustomerTypeName;
      }
      order.UpdatedAt = updatedAt;
      adminChanged = true;
    });
    if (adminChanged) {
      writeStorageValue(ADMIN_ORDERS_STORAGE_KEY, adminOrders);
    }
  }

  function updateMockAccountRecord(customer, updates, options = {}) {
    if (!customer || customer.AccountID == null) {
      return null;
    }
    const accounts = readStorageArray(MOCK_ACCOUNTS_STORAGE_KEY);
    const accountIdString = String(customer.AccountID);
    const customerIdString = customer.CustomerID != null ? String(customer.CustomerID) : null;
    const accountIndex = accounts.findIndex(acc =>
      String(acc.accountID) === accountIdString ||
      (customerIdString && String(acc.customerID) === customerIdString)
    );
    if (accountIndex === -1) {
      if (options.silent) {
        return null;
      }
      throw new Error('Account record not found in local storage.');
    }

    const targetAccount = { ...accounts[accountIndex] };

    if (updates.username) {
      const usernameLower = toLower(updates.username);
      const duplicate = accounts.some((acc, idx) =>
        idx !== accountIndex && toLower(acc.username) === usernameLower
      );
      if (duplicate) {
        throw new Error('Username already exists. Please choose a different username.');
      }
      targetAccount.username = updates.username;
    }

    if (updates.email) {
      const emailLower = toLower(updates.email);
      const duplicateEmail = accounts.some((acc, idx) =>
        idx !== accountIndex && toLower(acc.email) === emailLower
      );
      if (duplicateEmail) {
        throw new Error('Email already registered. Please use a different email address.');
      }
      targetAccount.email = updates.email;
    }

    if (updates.phone) {
      const phoneNormalised = normaliseString(updates.phone);
      const duplicatePhone = accounts.some((acc, idx) =>
        idx !== accountIndex && normaliseString(acc.phone) === phoneNormalised && phoneNormalised !== ''
      );
      if (duplicatePhone) {
        throw new Error('Phone number already registered. Please use a different contact number.');
      }
      targetAccount.phone = updates.phone;
    }

    targetAccount.firstName = updates.firstName ?? targetAccount.firstName;
    targetAccount.lastName = updates.lastName ?? targetAccount.lastName;
    targetAccount.address = updates.address ?? targetAccount.address;
    if (updates.customerTypeName) {
      targetAccount.customerType = updates.customerTypeName;
    }
    if (updates.customerTypeID != null) {
      targetAccount.customerTypeID = updates.customerTypeID;
    }
    if (updates.newPassword) {
      targetAccount.passwordHash = hashPassword(updates.newPassword);
    }
    targetAccount.updatedAt = new Date().toISOString();

    accounts[accountIndex] = targetAccount;
    writeStorageValue(MOCK_ACCOUNTS_STORAGE_KEY, accounts);
    return targetAccount;
  }

  function validateEmailFormat(email) {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhoneNumber(phone) {
    if (!phone) return true;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 7;
  }

  async function saveCustomerDetails(customer, formData, formType) {
    const modal = document.getElementById('customerDetailsModal');
    const modalContent = document.getElementById('customerModalContent');

    const firstName = normaliseString(formData.get('firstName'));
    const lastName = normaliseString(formData.get('lastName'));
    const phone = normaliseString(formData.get('phone'));
    const address = normaliseString(formData.get('address'));
    const rawTypeInput = formData.get('customerType') || customer.CustomerTypeName || 'Regular';
    const username = normaliseString(formData.get('username'));
    const email = normaliseString(formData.get('email'));
    const newPassword = normaliseString(formData.get('newPassword'));
    const confirmPassword = normaliseString(formData.get('confirmPassword'));

    if (!firstName) {
      showModalToast(modalContent, 'First name is required.');
      return;
    }
    if (!lastName) {
      showModalToast(modalContent, 'Last name is required.');
      return;
    }
    if (!validatePhoneNumber(phone)) {
      showModalToast(modalContent, 'Please enter a valid contact number (at least 7 digits).');
      return;
    }
    if (customer.isOnline && !username) {
      showModalToast(modalContent, 'Username is required for online customers.');
      return;
    }
    if (customer.isOnline && !email) {
      showModalToast(modalContent, 'Email is required for online customers.');
      return;
    }
    if (email && !validateEmailFormat(email)) {
      showModalToast(modalContent, 'Please enter a valid email address.');
      return;
    }
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        showModalToast(modalContent, 'Passwords do not match. Please re-enter the new password.');
        return;
      }
      if (newPassword.length < 8) {
        showModalToast(modalContent, 'Password must be at least 8 characters long.');
        return;
      }
    }

    const normalisedTypeName = normaliseCustomerTypeLabel(rawTypeInput, 'Regular');
    const customerTypeID = mapCustomerTypeToId(normalisedTypeName);

    if (modal) modal.classList.add('customer-modal-saving');

    try {
      if (customer.isOnline) {
        updateMockAccountRecord(customer, {
          firstName,
          lastName,
          username,
          email,
          phone,
          address,
          customerTypeName: normalisedTypeName,
          customerTypeID,
          newPassword: newPassword || null
        });
      }

      customer.FirstName = firstName;
      customer.LastName = lastName;
      customer.Phone = phone;
      customer.HouseAddress = address;
      customer.CustomerTypeName = normalisedTypeName;
      customer.CustomerTypeID = customerTypeID;
      if (customer.isOnline) {
        customer.Username = username;
        customer.Email = email;
      }
      if (formType === 'walkin') {
        customer.isOnline = false;
      }

      syncCustomerToLocalStorage(customer);
      updateOrdersWithCustomer(customer);
      filterCustomers();
      updateStats();
      renderCustomersTable();

      closeCustomerModal();
      document.dispatchEvent(new Event('logbook:refresh'));
      alert('Customer details updated successfully.');
    } catch (error) {
      console.error('Failed to update customer:', error);
      showModalToast(modalContent, error.message || 'Unable to save changes. Please try again.');
    } finally {
      if (modal) modal.classList.remove('customer-modal-saving');
    }
  }

  function attachModalHandlers(customer, formType) {
    const modal = document.getElementById('customerDetailsModal');
    const modalContent = document.getElementById('customerModalContent');
    const closeBtn = document.getElementById('customerModalClose');

    if (!modal || !modalContent) return;

    const closeHandler = () => closeCustomerModal();

    if (closeBtn) {
      closeBtn.onclick = closeHandler;
    }

    modal.onclick = (event) => {
      if (event.target === modal) {
        closeCustomerModal();
      }
    };

    const cancelButtons = modalContent.querySelectorAll('[data-action="close"]');
    cancelButtons.forEach(button => {
      button.addEventListener('click', closeHandler);
    });

    const form = modalContent.querySelector(`[data-form-type="${formType}"]`);
    if (form) {
      form.addEventListener('submit', event => {
        event.preventDefault();
        const formData = new FormData(form);
        saveCustomerDetails(customer, formData, formType);
      });
    }

    document.addEventListener('keydown', function escListener(event) {
      if (event.key === 'Escape') {
        closeCustomerModal();
        document.removeEventListener('keydown', escListener);
      }
    }, { once: true });
  }

  function openCustomerModal(customerID) {
    const customer = allCustomers.find(c => c.CustomerID === customerID);
    const modal = document.getElementById('customerDetailsModal');
    const modalContent = document.getElementById('customerModalContent');

    if (!customer || !modal || !modalContent) return;

    const templateId = customer.isOnline ? 'onlineCustomerTemplate' : 'walkinCustomerTemplate';
    const template = document.getElementById(templateId);
    if (!template) return;

    const fragment = template.content.cloneNode(true);
    populateCustomerModal(fragment, customer);

    modalContent.innerHTML = '';
    modalContent.appendChild(fragment);

    attachModalHandlers(customer, customer.isOnline ? 'online' : 'walkin');

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    const focusTarget = modalContent.querySelector('[data-field-input], [data-field-select]');
    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus();
    }
  }
  
  // Wire up event listeners
  function wireLogbookPage() {
    // Tab switching
    const tabs = document.querySelectorAll('.logbook-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.getAttribute('data-tab') || 'all';
        
        // Update table title
        const tableTitle = document.getElementById('logbookTableTitle');
        if (tableTitle) {
          const titles = {
            'all': 'All Customers',
            'online': 'Online Customers',
            'walkin': 'Walk-in Customers'
          };
          tableTitle.textContent = titles[currentTab] || 'All Customers';
        }
        
        filterCustomers();
        updateStats();
        renderCustomersTable();
      });
    });
    
    // Search
    const searchInput = document.getElementById('logbookSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterCustomers();
        updateStats();
        renderCustomersTable();
      });
    }
    
  }
  
  // View customer details (placeholder)
  window.viewCustomerDetails = function(customerID) {
    const customer = allCustomers.find(c => c.CustomerID === customerID);
    if (customer) {
      alert(`Customer Details:\n\nID: ${customer.CustomerID}\nName: ${customer.FirstName} ${customer.LastName}\nPhone: ${customer.Phone}\nAddress: ${customer.HouseAddress}\nAccount ID: ${customer.AccountID || 'N/A'}\nType: ${customer.CustomerTypeName}`);
    }
  };
  
  // Edit customer (placeholder)
  window.editCustomer = function(customerID) {
    const customer = allCustomers.find(c => c.CustomerID === customerID);
    if (customer) {
      // Switch to Manual Entry view and populate customer data
      if (typeof window.switchView === 'function') {
        window.switchView('manual-entry');
        // You can populate the form fields here if needed
        setTimeout(() => {
          const firstNameEl = document.getElementById('adminFirstName');
          const lastNameEl = document.getElementById('adminLastName');
          const phoneEl = document.getElementById('adminContactNumber');
          const addressEl = document.getElementById('adminDeliveryAddress');
          const customerIdEl = document.getElementById('adminCustomerId');
          
          if (firstNameEl) firstNameEl.value = customer.FirstName || '';
          if (lastNameEl) lastNameEl.value = customer.LastName || '';
          if (phoneEl) phoneEl.value = customer.Phone || '';
          if (addressEl) addressEl.value = customer.HouseAddress || '';
          if (customerIdEl) customerIdEl.value = customer.CustomerID || '';
        }, 100);
      }
    }
  };
  
  // Expose render function globally for switchView
  window.renderLogbookPage = function() {
    wireLogbookPage();
    loadCustomers();
  };
  
  // Initialize on DOM ready if already on logbook page
  document.addEventListener('DOMContentLoaded', function() {
    const logbookView = document.getElementById('view-logbook');
    if (logbookView && logbookView.style.display !== 'none') {
      wireLogbookPage();
      loadCustomers();
    }
    
    // Listen for storage events to auto-refresh when customers are added
    window.addEventListener('storage', function(e) {
      if (e.key === MOCK_ACCOUNTS_STORAGE_KEY || e.key === ADMIN_CUSTOMERS_STORAGE_KEY) {
        const logbookViewEl = document.getElementById('view-logbook');
        if (logbookViewEl && logbookViewEl.style.display !== 'none') {
          loadCustomers();
        }
      }
    });
    
    // Poll for changes (since storage event only works across tabs)
    setInterval(function() {
      const logbookView = document.getElementById('view-logbook');
      if (logbookView && logbookView.style.display !== 'none') {
        const currentCount = allCustomers.length;
        const accounts = readStorageArray(MOCK_ACCOUNTS_STORAGE_KEY).filter(acc => acc.role !== 'Admin');
        if (accounts.length !== currentCount) {
          loadCustomers();
        }
      }
    }, 2000);
  });

  document.addEventListener('logbook:refresh', function() {
    loadCustomers();
  });
})();



