// Logbook functionality (Customer Logbook)
(function() {
  const STORAGE_KEYS = {
    portalAccounts: 'mock_accounts',
    adminCustomers: 'adminCustomers'
  };

  const CUSTOMER_TYPE_LABELS = {
    0: 'Admin',
    1: 'Regular',
    2: 'Dealer',
    3: 'Walk-in'
  };

  const CUSTOMER_TYPE_PRIORITY = {
    'Dealer': 3,
    'Online': 2,
    'Regular': 1,
    'Walk-in': 1,
    'Customer': 0
  };

  let allCustomersData = [];
  let filteredCustomersData = [];
  let currentTab = 'all';
  let searchQuery = '';
  
  const TYPE_NAME_ALIASES = {
    'regular': 'Regular',
    'dealer': 'Dealer',
    'walk-in': 'Walk-in',
    'walkin': 'Walk-in',
    'online': 'Online',
    'customer': 'Customer',
    'admin': 'Admin'
  };

  function safeParseJSON(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function normaliseString(value) {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    return String(value).trim();
  }

  function sanitiseId(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const str = normaliseString(value);
    if (!str) return null;
    const lower = str.toLowerCase();
    if (lower === 'no account' || lower === 'pending account' || lower === 'n/a' || lower === 'none') {
      return null;
    }
    const num = Number(str);
    if (!Number.isNaN(num)) {
      return num;
    }
    return str || null;
  }

  function toIsoString(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }

  function normaliseTypeNameCandidate(value) {
    const str = normaliseString(value);
    if (!str) return '';
    const lower = str.toLowerCase();
    if (TYPE_NAME_ALIASES[lower]) {
      return TYPE_NAME_ALIASES[lower];
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatCustomerType(typeName, typeId, fallback, isOnline) {
    const candidate = normaliseTypeNameCandidate(typeName) || normaliseTypeNameCandidate(fallback);
    
    if (typeId !== null && typeId !== undefined) {
      const numericId = Number(typeId);
      if (!Number.isNaN(numericId) && CUSTOMER_TYPE_LABELS[numericId]) {
        const label = CUSTOMER_TYPE_LABELS[numericId];
        if (label === 'Admin') {
          return isOnline ? 'Online' : 'Walk-in';
        }
        return label;
      }
    }
    
    if (candidate && candidate !== 'Customer') {
      if (candidate === 'Admin') {
        return isOnline ? 'Online' : 'Walk-in';
      }
      return candidate;
    }
    
    return isOnline ? 'Online' : 'Walk-in';
  }

  function hasValue(value) {
    return value !== undefined && value !== null && value !== '';
  }

  function pickLatestDate(current, incoming) {
    const currentTime = current ? new Date(current).getTime() : 0;
    const incomingTime = incoming ? new Date(incoming).getTime() : 0;
    if (incomingTime > currentTime) {
      return incoming;
    }
    return current;
  }

  function pickCustomerTypeName(current, incoming, isOnline) {
    const currentLabel = normaliseTypeNameCandidate(current);
    const incomingLabel = normaliseTypeNameCandidate(incoming);
    
    if (!currentLabel && !incomingLabel) {
      return isOnline ? 'Online' : 'Walk-in';
    }
    if (!currentLabel) return incomingLabel;
    if (!incomingLabel) return currentLabel;
    
    const currentPriority = CUSTOMER_TYPE_PRIORITY[currentLabel] ?? 0;
    const incomingPriority = CUSTOMER_TYPE_PRIORITY[incomingLabel] ?? 0;
    
    if (incomingPriority > currentPriority) {
      return incomingLabel;
    }
    return currentLabel;
  }

  function normaliseCustomerRecord(raw, defaults = {}) {
    if (!raw || typeof raw !== 'object') return null;
    
    const firstName = normaliseString(raw.FirstName ?? raw.firstName ?? defaults.firstName);
    const lastName = normaliseString(raw.LastName ?? raw.lastName ?? defaults.lastName);
    const email = normaliseString(raw.Email ?? raw.email ?? defaults.email);
    const username = normaliseString(raw.Username ?? raw.username ?? defaults.username);
    const phone = normaliseString(
      raw.Phone ??
      raw.phone ??
      raw.ContactNumber ??
      raw.contactNumber ??
      defaults.phone
    );
    const address = normaliseString(
      raw.HouseAddress ??
      raw.houseAddress ??
      raw.Address ??
      raw.address ??
      raw.deliveryAddress ??
      defaults.address
    );
    
    const accountId = sanitiseId(raw.AccountID ?? raw.accountID ?? raw.AccountId ?? raw.accountId ?? defaults.accountID);
    const customerId = sanitiseId(raw.CustomerID ?? raw.customerID ?? raw.customerId ?? defaults.id);
    const customerTypeId = sanitiseId(raw.CustomerTypeID ?? raw.customerTypeID ?? raw.CustomerTypeId ?? defaults.customerTypeId);
    const createdAt = toIsoString(
      raw.CreatedAt ??
      raw.createdAt ??
      raw.created_at ??
      raw.DateCreated ??
      raw.dateCreated ??
      raw.createdAtUtc ??
      raw.Timestamp ??
      raw.timestamp ??
      defaults.createdAt
    );
    
    const explicitOnline = raw.isOnline ?? raw.IsOnline ?? defaults.isOnline;
    const isOnline = explicitOnline !== undefined && explicitOnline !== null
      ? Boolean(explicitOnline)
      : Boolean(accountId);
    
    const customerTypeName = formatCustomerType(
      raw.CustomerTypeName ?? raw.customerType ?? defaults.customerTypeName,
      customerTypeId,
      defaults.customerTypeName,
      isOnline
    );
    
    return {
      id: customerId,
      accountID: accountId,
      firstName,
      lastName,
      phone,
      address,
      createdAt,
      customerTypeName,
      customerTypeId,
      isOnline,
      email,
      username,
      createdAtMs: createdAt ? new Date(createdAt).getTime() : 0,
      source: defaults.source || 'local'
    };
  }

  function buildKeyFromCustomer(customer) {
    if (!customer) return null;
    if (hasValue(customer.id)) {
      return `id:${customer.id}`;
    }
    if (hasValue(customer.accountID)) {
      return `account:${customer.accountID}`;
    }
    if (hasValue(customer.email)) {
      return `email:${customer.email.toLowerCase()}`;
    }
    if (hasValue(customer.username)) {
      return `username:${customer.username.toLowerCase()}`;
    }
    const phoneDigits = (customer.phone || '').replace(/\D/g, '');
    if (phoneDigits) {
      return `phone:${phoneDigits}`;
    }
    const nameKey = `${(customer.firstName || '').toLowerCase()}|${(customer.lastName || '').toLowerCase()}`;
    if (nameKey.trim() !== '|') {
      return `name:${nameKey}`;
    }
    return null;
  }

  function mergeCustomerRecords(primary, secondary) {
    const merged = { ...primary };
    
    const fieldsToMerge = [
      'id',
      'accountID',
      'firstName',
      'lastName',
      'phone',
      'address',
      'email',
      'username',
      'customerTypeId'
    ];
    
    fieldsToMerge.forEach(field => {
      if (!hasValue(merged[field]) && hasValue(secondary[field])) {
        merged[field] = secondary[field];
      }
    });
    
    merged.customerTypeName = pickCustomerTypeName(
      merged.customerTypeName,
      secondary.customerTypeName,
      merged.isOnline || secondary.isOnline
    );
    
    merged.isOnline = Boolean(merged.isOnline || secondary.isOnline);
    merged.createdAt = pickLatestDate(merged.createdAt, secondary.createdAt);
    merged.createdAtMs = merged.createdAt ? new Date(merged.createdAt).getTime() : merged.createdAtMs || 0;
    merged.source = merged.source === 'portal' ? merged.source : (secondary.source || merged.source || 'local');
    
    return merged;
  }

  function addCustomerFromSource(customerMap, raw, defaults = {}) {
    const normalised = normaliseCustomerRecord(raw, defaults);
    if (!normalised) return;
    const key = buildKeyFromCustomer(normalised);
    if (!key) return;
    
    if (customerMap.has(key)) {
      const merged = mergeCustomerRecords(customerMap.get(key), normalised);
      customerMap.set(key, merged);
    } else {
      customerMap.set(key, normalised);
    }
  }

  function collectCustomersFromLocalStorage() {
    const customerMap = new Map();
    
    const portalAccounts = safeParseJSON(localStorage.getItem(STORAGE_KEYS.portalAccounts));
    if (Array.isArray(portalAccounts)) {
      portalAccounts.forEach(account => {
        if (!account) return;
        const role = normaliseString(account.role ?? account.Role).toLowerCase();
        if (role === 'admin') {
          return;
        }
        addCustomerFromSource(customerMap, account, {
          isOnline: true,
          source: 'portal',
          customerTypeName: account?.customerType ?? account?.CustomerTypeName
        });
      });
    }
    
    const adminCustomers = safeParseJSON(localStorage.getItem(STORAGE_KEYS.adminCustomers));
    if (Array.isArray(adminCustomers)) {
      adminCustomers.forEach(customer => {
        if (!customer) return;
        addCustomerFromSource(customerMap, customer, {
          isOnline: customer?.IsOnline ?? customer?.isOnline ?? false,
          source: 'walkin',
          customerTypeName: customer?.CustomerTypeName ?? customer?.customerType ?? 'Walk-in',
          customerTypeId: customer?.CustomerTypeID ?? customer?.customerTypeID
        });
      });
    }
    
    return Array.from(customerMap.values()).map(customer => {
      const result = { ...customer };
      if (!result.customerTypeName) {
        result.customerTypeName = result.isOnline ? 'Online' : 'Walk-in';
      }
      return result;
    });
  }

  function getLocalLogbookCustomers() {
    const customers = collectCustomersFromLocalStorage();
    
    customers.sort((a, b) => {
      const dateDiff = (b.createdAtMs || 0) - (a.createdAtMs || 0);
      if (dateDiff !== 0) return dateDiff;
      
      const nameA = `${(a.firstName || '').toLowerCase()} ${(a.lastName || '').toLowerCase()}`.trim();
      const nameB = `${(b.firstName || '').toLowerCase()} ${(b.lastName || '').toLowerCase()}`.trim();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
    
    customers.forEach(customer => {
      delete customer.createdAtMs;
    });
    
    return customers;
  }

  window.__getLocalLogbookCustomers = getLocalLogbookCustomers;

  // Logbook elements
  const logbookSearch = document.getElementById('logbookSearch');
  const logbookTabs = document.querySelectorAll('.logbook-tab');
  const logbookTableBody = document.getElementById('logbookCustomersTableBody');
  const logbookTableTitle = document.getElementById('logbookTableTitle');
  const logbookCustomerCount = document.getElementById('logbookCustomerCount');
  const statTotalCustomers = document.getElementById('statTotalCustomers');
  const statOnlineCustomers = document.getElementById('statOnlineCustomers');
  const statWalkinCustomers = document.getElementById('statWalkinCustomers');
  
  function loadCustomers() {
    try {
      allCustomersData = getLocalLogbookCustomers();
      applyFilters();
    } catch (error) {
      console.error('Error loading customers:', error);
      allCustomersData = [];
      applyFilters();
    }
  }
  
  // Format date
  function formatDate(dateString) {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  }
  
  // Apply filters based on tab and search
  function applyFilters() {
    const query = searchQuery.toLowerCase().trim();
    const digitsQuery = searchQuery.replace(/\D/g, '').trim();
    
    filteredCustomersData = allCustomersData.filter(customer => {
      if (currentTab === 'online' && !customer.isOnline) {
        return false;
      }
      if (currentTab === 'walkin' && customer.isOnline) {
        return false;
      }
      
      if (query) {
        const firstName = (customer.firstName || '').toLowerCase();
        const lastName = (customer.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const accountId = hasValue(customer.accountID) ? String(customer.accountID).toLowerCase() : '';
        const customerId = hasValue(customer.id) ? String(customer.id).toLowerCase() : '';
        const email = (customer.email || '').toLowerCase();
        const username = (customer.username || '').toLowerCase();
        const address = (customer.address || '').toLowerCase();
        const typeName = (customer.customerTypeName || '').toLowerCase();
        const phoneRaw = (customer.phone || '').toString();
        const phoneLower = phoneRaw.toLowerCase();
        const phoneDigits = phoneRaw.replace(/\D/g, '');
        
        const matches =
          firstName.includes(query) ||
          lastName.includes(query) ||
          fullName.includes(query) ||
          accountId.includes(query) ||
          customerId.includes(query) ||
          email.includes(query) ||
          username.includes(query) ||
          address.includes(query) ||
          typeName.includes(query) ||
          phoneLower.includes(query) ||
          (digitsQuery && phoneDigits.includes(digitsQuery));
        
        if (!matches) {
          return false;
        }
      }
      
      return true;
    });
    
    updateStatistics();
    renderLogbookTable();
  }
  
  // Update statistics
  function updateStatistics() {
    const total = allCustomersData.length;
    const online = allCustomersData.filter(c => c.isOnline).length;
    const walkin = allCustomersData.filter(c => !c.isOnline).length;
    
    if (statTotalCustomers) statTotalCustomers.textContent = total;
    if (statOnlineCustomers) statOnlineCustomers.textContent = online;
    if (statWalkinCustomers) statWalkinCustomers.textContent = walkin;
  }
  
  // Render logbook table
  function renderLogbookTable() {
    if (!logbookTableBody) return;
    
    logbookTableBody.innerHTML = '';
    
    // Update table title and count
    const tabTitles = {
      'all': 'All Customers',
      'online': 'Online Customers',
      'walkin': 'Walk-in Customers'
    };
    
    if (logbookTableTitle) {
      logbookTableTitle.textContent = tabTitles[currentTab] || 'All Customers';
    }
    
    if (logbookCustomerCount) {
      logbookCustomerCount.textContent = `${filteredCustomersData.length} customer${filteredCustomersData.length !== 1 ? 's' : ''}`;
    }
    
    if (filteredCustomersData.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'orders-empty-row';
      
      const emptyCell = document.createElement('td');
      emptyCell.className = 'orders-empty-state logbook-empty-state-cell';
      emptyCell.colSpan = 7;
      emptyCell.textContent = 'No customers yet';
      
      emptyRow.appendChild(emptyCell);
      logbookTableBody.appendChild(emptyRow);
      return;
    }
    
    filteredCustomersData.forEach(customer => {
      const row = document.createElement('tr');
      row.className = 'logbook-table-row logbook-table-row-clickable';
      row.dataset.customerId = customer.id ?? '';
      row.setAttribute('tabindex', '0');
      
      const cells = [
        customer.id ?? '-',
        customer.firstName || '-',
        customer.lastName || '-',
        customer.accountID || '-',
        customer.phone || '-',
        customer.address || '-',
        formatDate(customer.createdAt)
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
      
      cells.forEach((value, index) => {
        const cell = document.createElement('td');
        const cellClass = cellClassMap[index];
        if (cellClass) {
          cell.classList.add(cellClass);
        }
        cell.textContent = value || '-';
        row.appendChild(cell);
      });
      
      row.addEventListener('click', () => {
        if (typeof window.viewCustomerDetails === 'function') {
          window.viewCustomerDetails(customer.id);
        }
      });
      
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (typeof window.viewCustomerDetails === 'function') {
            window.viewCustomerDetails(customer.id);
          }
        }
      });
      
      logbookTableBody.appendChild(row);
    });
  }
  
  // View customer details (placeholder - can be expanded later)
  window.viewCustomerDetails = function(customerId) {
    console.log('View customer details for:', customerId);
    // TODO: Implement customer details modal/view
    alert(`View details for Customer #${customerId}`);
  };
  
  // Handle tab switching
  function handleTabSwitch(tab) {
    currentTab = tab;
    
    // Update active tab
    logbookTabs.forEach(t => {
      if (t.getAttribute('data-tab') === tab) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });
    
    applyFilters();
  }
  
  // Handle search
  function handleSearch() {
    searchQuery = logbookSearch?.value || '';
    applyFilters();
  }
  
  // Wire up event listeners
  function wireLogbookPage() {
    // Tab switching
    logbookTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        if (tabName) {
          handleTabSwitch(tabName);
        }
      });
    });
    
    // Search
    if (logbookSearch) {
      logbookSearch.addEventListener('input', handleSearch);
    }
    
  }
  
  // Initialize when Logbook view is shown
  function initLogbookPage() {
    wireLogbookPage();
    loadCustomers();
  }
  
  // Expose render function globally for switchView
  window.renderLogbook = function() {
    // Wire up event listeners if not already done
    wireLogbookPage();
    loadCustomers();
  };
  
  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on logbook page initially
    const logbookView = document.getElementById('view-logbook');
    if (logbookView && logbookView.style.display !== 'none') {
      initLogbookPage();
    }
  });
  
  document.addEventListener('logbook:refresh', function() {
    loadCustomers();
  });
  
  // The switchView function will call renderLogbook when logbook view is shown
})();


