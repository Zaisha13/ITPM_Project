// Customer Logbook functionality
(function() {
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
      const value = customer[field] || '';
      select.value = value || 'Regular';
    });

    const customerTypeName = (customer.CustomerTypeName || '').toLowerCase();
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

  function mapCustomerTypeToId(typeName) {
    const value = (typeName || '').toLowerCase();
    if (value === 'dealer') return 2;
    return 1;
  }

  async function saveCustomerDetails(customer, formData, formType) {
    const payload = {
      CustomerID: customer.CustomerID,
      FirstName: formData.get('firstName')?.trim() || '',
      LastName: formData.get('lastName')?.trim() || '',
      Phone: formData.get('phone')?.trim() || '',
      HouseAddress: formData.get('address')?.trim() || ''
    };

    const typeValue = formType === 'online'
      ? (formData.get('customerType') || customer.CustomerTypeName || 'Regular')
      : (formData.get('customerType') || 'Regular');

    payload.CustomerTypeID = mapCustomerTypeToId(typeValue);

    const modal = document.getElementById('customerDetailsModal');
    const modalContent = document.getElementById('customerModalContent');

    try {
      if (modal) modal.classList.add('customer-modal-saving');

      const response = await fetch('../admin_backend/api/update_customers.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to update customer.');
      }

      // Update local data model
      customer.FirstName = payload.FirstName;
      customer.LastName = payload.LastName;
      customer.Phone = payload.Phone;
      customer.HouseAddress = payload.HouseAddress;
      customer.CustomerTypeName = typeValue;
      customer.CustomerTypeID = payload.CustomerTypeID;

      filterCustomers();
      updateStats();
      renderCustomersTable();

      closeCustomerModal();
      alert('Customer details updated successfully.');
    } catch (error) {
      console.error('Failed to update customer:', error);
      if (modalContent) {
        const message = document.createElement('div');
        message.className = 'customer-modal-toast error';
        message.textContent = error.message || 'Unable to save changes. Please try again.';
        modalContent.appendChild(message);
        setTimeout(() => message.remove(), 4000);
      }
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
      if (e.key === MOCK_ACCOUNTS_KEY) {
        const logbookView = document.getElementById('view-logbook');
        if (logbookView && logbookView.style.display !== 'none') {
          loadCustomers();
        }
      }
    });
    
    // Poll for changes (since storage event only works across tabs)
    setInterval(function() {
      const logbookView = document.getElementById('view-logbook');
      if (logbookView && logbookView.style.display !== 'none') {
        const currentCount = allCustomers.length;
        const mockAccounts = localStorage.getItem(MOCK_ACCOUNTS_KEY);
        const accounts = mockAccounts ? JSON.parse(mockAccounts) : [];
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



