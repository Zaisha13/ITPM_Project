// Manual Order Entry functionality
(function() {
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
  let adminOrders = [];
  let selectedOrderIndex = null;
  let adminContainerType = "slim";
  let adminOrderType = "refill";
  let adminQuantity = 1;
  let adminWilkinsQty = 1;
  let adminCustomerId = null; // Store selected customer ID
  let searchTimeout = null;
  
  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  
  function updateSubtotalUI() {
    const price = getUnitPrice(adminContainerType, adminOrderType);
    const total = price * adminQuantity;
    const subtotalEl = document.getElementById("adminSubtotal");
    if (subtotalEl) subtotalEl.textContent = `â‚±${total}`;
  }
  
  function updateWilkinsPriceUI() {
    const wilkinsPriceEl = document.getElementById("adminWilkinsPrice");
    if (wilkinsPriceEl) wilkinsPriceEl.textContent = `â‚±${getUnitPrice('wilkins','refill') * adminWilkinsQty}`;
  }
  
  function updateTotals() {
    const containersTotal = adminOrders.reduce((sum, o) => sum + o.total, 0);
    const wilkinsChecked = document.getElementById("adminAdditionalWilkins")?.checked || false;
    const wilkinsTotal = wilkinsChecked ? getUnitPrice('wilkins','refill') * adminWilkinsQty : 0;
    const grand = containersTotal + wilkinsTotal;
    
    const containersTotalEl = document.getElementById("adminContainersTotal");
    const wilkinsTotalEl = document.getElementById("adminWilkinsTotal");
    const grandTotalEl = document.getElementById("adminGrandTotal");
    
    if (containersTotalEl) containersTotalEl.textContent = `â‚±${containersTotal}`;
    if (wilkinsTotalEl) wilkinsTotalEl.textContent = `â‚±${wilkinsTotal}`;
    if (grandTotalEl) grandTotalEl.textContent = `â‚±${grand}`;
  }
  
  function renderOrders() {
    const orderList = document.getElementById("adminOrderList");
    if (!orderList) return;
    
    if (adminOrders.length === 0) {
      orderList.innerHTML = "<p>No orders yet.</p>";
      return;
    }
    
    orderList.innerHTML = adminOrders
      .map(
        (o, i) => `
      <div class="order-item ${i === selectedOrderIndex ? "selected" : ""}" data-index="${i}">
        <div class="order-item-info">
          <div class="order-item-title">${capitalize(o.containerType)} - ${
            o.orderType === "brandNew" ? "Brand New" : "Refill"
          }</div>
          <div class="order-item-qty">x${o.quantity}</div>
        </div>
        <div class="order-item-price">â‚±${o.total}</div>
        <button class="order-item-delete" data-index="${i}">ðŸ—‘</button>
      </div>`
      )
      .join("");
    
    // Add click handlers for edit
    document.querySelectorAll("#adminOrderList .order-item").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (!e.target.classList.contains("order-item-delete")) {
          selectedOrderIndex = parseInt(row.dataset.index);
          loadOrderToForm(selectedOrderIndex);
          const addBtn = document.getElementById("adminAddOrderBtn");
          if (addBtn) addBtn.textContent = "Update";
          renderOrders();
        }
      });
    });
    
    // Add click handlers for delete
    document.querySelectorAll("#adminOrderList .order-item-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        adminOrders.splice(index, 1);
        if (selectedOrderIndex === index) {
          selectedOrderIndex = null;
          const addBtn = document.getElementById("adminAddOrderBtn");
          if (addBtn) addBtn.textContent = "Add";
        }
        renderOrders();
        updateTotals();
      });
    });
  }
  
  function loadOrderToForm(index) {
    const o = adminOrders[index];
    if (!o) return;
    adminContainerType = o.containerType;
    adminOrderType = o.orderType;
    adminQuantity = o.quantity;
    
    const quantityEl = document.getElementById("adminQuantity");
    if (quantityEl) quantityEl.value = adminQuantity;
    
    document.querySelectorAll("#view-manual-entry .toggle-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.type === adminContainerType);
    });
    document.querySelectorAll("#view-manual-entry .toggle-btn-action").forEach((b) => {
      b.classList.toggle("active", b.dataset.action === adminOrderType);
    });
    updateSubtotalUI();
  }
  
  // Initialize order form when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Load prices first
    loadDbPrices().then(() => {
      updateSubtotalUI();
      updateWilkinsPriceUI();
      renderOrders();
      updateTotals();
    });
    
    // Container Type Toggle
    document.querySelectorAll("#view-manual-entry .toggle-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        document.querySelectorAll("#view-manual-entry .toggle-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        adminContainerType = btn.dataset.type;
        updateSubtotalUI();
      })
    );
    
    // Order Type Toggle
    document.querySelectorAll("#view-manual-entry .toggle-btn-action").forEach((btn) =>
      btn.addEventListener("click", () => {
        document.querySelectorAll("#view-manual-entry .toggle-btn-action").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        adminOrderType = btn.dataset.action;
        updateSubtotalUI();
      })
    );
    
    // Quantity Controls
    const decreaseQty = document.getElementById("adminDecreaseQty");
    const increaseQty = document.getElementById("adminIncreaseQty");
    if (decreaseQty) {
      decreaseQty.addEventListener("click", () => {
        if (adminQuantity > 1) adminQuantity--;
        const quantityEl = document.getElementById("adminQuantity");
        if (quantityEl) quantityEl.value = adminQuantity;
        updateSubtotalUI();
      });
    }
    if (increaseQty) {
      increaseQty.addEventListener("click", () => {
        adminQuantity++;
        const quantityEl = document.getElementById("adminQuantity");
        if (quantityEl) quantityEl.value = adminQuantity;
        updateSubtotalUI();
      });
    }
    
    // Wilkins Controls
    const additionalWilkins = document.getElementById("adminAdditionalWilkins");
    if (additionalWilkins) {
      additionalWilkins.addEventListener("change", (e) => {
        const wilkinsControl = document.getElementById("adminWilkinsControl");
        if (wilkinsControl) wilkinsControl.style.display = e.target.checked ? "flex" : "none";
        updateWilkinsPriceUI();
        updateTotals();
      });
    }
    
    const decreaseWilkins = document.getElementById("adminDecreaseWilkins");
    const increaseWilkins = document.getElementById("adminIncreaseWilkins");
    if (decreaseWilkins) {
      decreaseWilkins.addEventListener("click", () => {
        if (adminWilkinsQty > 1) adminWilkinsQty--;
        const wilkinsQtyEl = document.getElementById("adminWilkinsQty");
        if (wilkinsQtyEl) wilkinsQtyEl.value = adminWilkinsQty;
        updateWilkinsPriceUI();
        updateTotals();
      });
    }
    if (increaseWilkins) {
      increaseWilkins.addEventListener("click", () => {
        adminWilkinsQty++;
        const wilkinsQtyEl = document.getElementById("adminWilkinsQty");
        if (wilkinsQtyEl) wilkinsQtyEl.value = adminWilkinsQty;
        updateWilkinsPriceUI();
        updateTotals();
      });
    }
    
    // Reset Button
    const resetBtn = document.getElementById("adminResetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        adminContainerType = "slim";
        adminOrderType = "refill";
        adminQuantity = 1;
        adminWilkinsQty = 1;
        selectedOrderIndex = null;
        adminCustomerId = null;
        
        const quantityEl = document.getElementById("adminQuantity");
        if (quantityEl) quantityEl.value = adminQuantity;
        const additionalWilkinsEl = document.getElementById("adminAdditionalWilkins");
        if (additionalWilkinsEl) additionalWilkinsEl.checked = false;
        const wilkinsControl = document.getElementById("adminWilkinsControl");
        if (wilkinsControl) wilkinsControl.style.display = "none";
        const addBtn = document.getElementById("adminAddOrderBtn");
        if (addBtn) addBtn.textContent = "Add";
        
        // Clear customer fields
        const firstNameEl = document.getElementById("adminFirstName");
        const lastNameEl = document.getElementById("adminLastName");
        const contactNumberEl = document.getElementById("adminContactNumber");
        const addressEl = document.getElementById("adminDeliveryAddress");
        const regularCustomerEl = document.getElementById("adminRegularCustomer");
        const customerSearchInput = document.getElementById("adminCustomerSearch");
        const customerIdHiddenEl = document.getElementById("adminCustomerId");
        
        if (firstNameEl) firstNameEl.value = "";
        if (lastNameEl) lastNameEl.value = "";
        if (contactNumberEl) contactNumberEl.value = "";
        if (addressEl) addressEl.value = "";
        if (regularCustomerEl) regularCustomerEl.value = "regular"; // Reset to default "Regular"
        if (customerSearchInput) customerSearchInput.value = "";
        if (customerIdHiddenEl) customerIdHiddenEl.value = "";
        
        // Reset toggle buttons
        document.querySelectorAll("#view-manual-entry .toggle-btn").forEach((b) => b.classList.remove("active"));
        const slimBtn = document.querySelector("#view-manual-entry [data-type='slim']");
        if (slimBtn) slimBtn.classList.add("active");
        document.querySelectorAll("#view-manual-entry .toggle-btn-action").forEach((b) => b.classList.remove("active"));
        const refillBtn = document.querySelector("#view-manual-entry [data-action='refill']");
        if (refillBtn) refillBtn.classList.add("active");
        
        updateSubtotalUI();
        updateWilkinsPriceUI();
        renderOrders();
        updateTotals();
      });
    }
    
    // Add/Update Order
    const addOrderBtn = document.getElementById("adminAddOrderBtn");
    if (addOrderBtn) {
      addOrderBtn.addEventListener("click", () => {
        const quantityEl = document.getElementById("adminQuantity");
        const q = quantityEl ? parseInt(quantityEl.value) : 1;
        
        if (selectedOrderIndex !== null) {
          // Update existing order
          adminOrders[selectedOrderIndex] = {
            containerType: adminContainerType,
            orderType: adminOrderType,
            quantity: q,
            price: getUnitPrice(adminContainerType, adminOrderType),
            total: getUnitPrice(adminContainerType, adminOrderType) * q,
          };
          selectedOrderIndex = null;
          addOrderBtn.textContent = "Add";
        } else {
          // Add new order or merge with existing
          const existingIndex = adminOrders.findIndex(
            (o) => o.containerType === adminContainerType && o.orderType === adminOrderType
          );
          
          if (existingIndex !== -1) {
            adminOrders[existingIndex].quantity += q;
            adminOrders[existingIndex].total = getUnitPrice(adminContainerType, adminOrderType) * adminOrders[existingIndex].quantity;
          } else {
            adminOrders.push({
              containerType: adminContainerType,
              orderType: adminOrderType,
              quantity: q,
              price: getUnitPrice(adminContainerType, adminOrderType),
              total: getUnitPrice(adminContainerType, adminOrderType) * q,
            });
          }
        }
        
        renderOrders();
        updateTotals();
      });
    }
    
    // Customer Search Functionality
    const customerSearchInput = document.getElementById("adminCustomerSearch");
    const customerSearchResults = document.getElementById("adminCustomerSearchResults");
    const customerSearchBtn = document.getElementById("adminCustomerSearchBtn");
    const customerFieldGroup = customerSearchInput?.closest(".customer-field-group");
    
    // Function to collect customers from all localStorage sources
    function getAllCustomersFromLocalStorage() {
      let customers = [];
      const customerMap = new Map(); // Use Map to avoid duplicates by email/username
      
      // 1. Check mock_accounts key (customer portal storage) - THIS IS THE MAIN SOURCE
      try {
        const mockAccounts = localStorage.getItem('mock_accounts');
        console.log('mock_accounts from localStorage:', mockAccounts);
        if (mockAccounts) {
          const accounts = JSON.parse(mockAccounts);
          accounts.forEach(account => {
            const email = (account.email || account.Email || '').toLowerCase().trim();
            const username = (account.username || account.Username || '').toLowerCase().trim();
            const key = email || username || `account_${account.accountID}`;
            
            if (!customerMap.has(key)) {
              customerMap.set(key, {
                CustomerID: account.customerID || account.CustomerID || account.customerId || account.accountID,
                FirstName: account.firstName || account.FirstName || '',
                LastName: account.lastName || account.LastName || '',
                Phone: account.phone || account.Phone || '',
                HouseAddress: account.address || account.Address || account.HouseAddress || '',
                CustomerTypeID: account.customerTypeID || account.CustomerTypeID || (account.customerType === 'Dealer' ? 2 : 1),
                AccountID: account.accountID || account.AccountID || account.AccountId,
                Username: account.username || account.Username || '',
                Email: account.email || account.Email || ''
              });
            }
          });
        }
      } catch (e) {
        console.error("Error reading mock_accounts:", e);
      }
      
      // 2. Check adminCustomers key (admin-specific storage)
      try {
        const adminCustomers = localStorage.getItem('adminCustomers');
        if (adminCustomers) {
          const parsed = JSON.parse(adminCustomers);
          parsed.forEach(cust => {
            const email = (cust.Email || '').toLowerCase().trim();
            const username = (cust.Username || '').toLowerCase().trim();
            const key = email || username || `admin_${cust.CustomerID}`;
            if (key && !customerMap.has(key)) {
              customerMap.set(key, cust);
            }
          });
        }
      } catch (e) {
        console.error("Error reading adminCustomers:", e);
      }
      
      // 3. Extract customers from order submissions
      try {
        const orderSubmissions = localStorage.getItem('orderSubmissions');
        if (orderSubmissions) {
          const orders = JSON.parse(orderSubmissions);
          orders.forEach((order, index) => {
            // Extract customer info from order
            if (order.email || order.username || order.customerName || order.firstName) {
              const email = (order.email || '').toLowerCase().trim();
              const username = (order.username || order.accountUsername || '').toLowerCase().trim();
              const key = email || username || `order_${index}`;
              
              // Only add if not already in map (mock_accounts takes priority)
              if (key && !customerMap.has(key)) {
                // Try to extract customer details from order
                const firstName = order.firstName || (order.customerName ? order.customerName.split(' ')[0] : '');
                const lastName = order.lastName || (order.customerName ? order.customerName.split(' ').slice(1).join(' ') : '');
                
                customerMap.set(key, {
                  CustomerID: order.customerId || order.customerID || (customerMap.size + 1),
                  FirstName: firstName || '',
                  LastName: lastName || '',
                  Phone: order.phone || order.contactNumber || '',
                  HouseAddress: order.address || order.deliveryAddress || '',
                  CustomerTypeID: (order.customerType === 'dealer' || order.customerType === 'Dealer') ? 2 : 1,
                  AccountID: order.accountId || order.accountID || order.userId || null,
                  Username: order.username || order.accountUsername || '',
                  Email: order.email || ''
                });
              }
            }
          });
        }
      } catch (e) {
        console.error("Error reading orderSubmissions:", e);
      }
      
      // 4. Check for any other stored account/customer data (from customer portal)
      // Skip keys we've already checked: mock_accounts, adminCustomers, orderSubmissions
      const alreadyCheckedKeys = ['mock_accounts', 'adminCustomers', 'orderSubmissions', 'mock_session', 'customerFeedback'];
      try {
        // Check all localStorage keys that might contain customer data
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          // Skip keys we've already processed
          if (!key || alreadyCheckedKeys.includes(key)) {
            continue;
          }
          
          // Check if key might contain customer/account data
          const keyLower = key.toLowerCase();
          if (keyLower.includes('customer') || keyLower.includes('account') || keyLower.includes('user') || keyLower.includes('mock')) {
            try {
              const value = localStorage.getItem(key);
              if (value) {
                const parsed = JSON.parse(value);
                // Handle array of customers/accounts
                if (Array.isArray(parsed)) {
                  parsed.forEach(item => {
                    // Check if item has customer/account data
                    if (item.Email || item.Username || item.email || item.username || item.accountID || item.customerID) {
                      const email = (item.Email || item.email || '').toLowerCase().trim();
                      const username = (item.Username || item.username || '').toLowerCase().trim();
                      const mapKey = email || username || `${key}_${item.accountID || item.customerID || customerMap.size}`;
                      
                      // Only add if not already in map (mock_accounts takes priority)
                      if (mapKey && !customerMap.has(mapKey)) {
                        customerMap.set(mapKey, {
                          CustomerID: item.CustomerID || item.customerID || item.CustomerId || item.customerId || item.accountID || (customerMap.size + 1),
                          FirstName: item.FirstName || item.firstName || '',
                          LastName: item.LastName || item.lastName || '',
                          Phone: item.Phone || item.phone || '',
                          HouseAddress: item.HouseAddress || item.House_Address || item.address || item.Address || '',
                          CustomerTypeID: item.CustomerTypeID || item.customerTypeID || item.CustomerTypeId || (item.customerType === 'Dealer' || item.customerType === 'dealer' ? 2 : 1),
                          AccountID: item.AccountID || item.accountID || item.AccountId || item.accountId || null,
                          Username: item.Username || item.username || '',
                          Email: item.Email || item.email || ''
                        });
                      }
                    }
                  });
                } 
                // Handle single customer/account object
                else if (parsed && typeof parsed === 'object') {
                  if (parsed.Email || parsed.Username || parsed.email || parsed.username || parsed.accountID || parsed.customerID) {
                    const email = (parsed.Email || parsed.email || '').toLowerCase().trim();
                    const username = (parsed.Username || parsed.username || '').toLowerCase().trim();
                    const mapKey = email || username || `${key}_${parsed.accountID || parsed.customerID || customerMap.size}`;
                    
                    // Only add if not already in map
                    if (mapKey && !customerMap.has(mapKey)) {
                      customerMap.set(mapKey, {
                        CustomerID: parsed.CustomerID || parsed.customerID || parsed.CustomerId || parsed.customerId || parsed.accountID || (customerMap.size + 1),
                        FirstName: parsed.FirstName || parsed.firstName || '',
                        LastName: parsed.LastName || parsed.lastName || '',
                        Phone: parsed.Phone || parsed.phone || '',
                        HouseAddress: parsed.HouseAddress || parsed.House_Address || parsed.address || parsed.Address || '',
                        CustomerTypeID: parsed.CustomerTypeID || parsed.customerTypeID || parsed.CustomerTypeId || (parsed.customerType === 'Dealer' || parsed.customerType === 'dealer' ? 2 : 1),
                        AccountID: parsed.AccountID || parsed.accountID || parsed.AccountId || parsed.accountId || null,
                        Username: parsed.Username || parsed.username || '',
                        Email: parsed.Email || parsed.email || ''
                      });
                    }
                  }
                }
              }
            } catch (parseError) {
              // Skip keys that aren't JSON or can't be parsed
              continue;
            }
          }
        }
      } catch (e) {
        console.error("Error scanning localStorage:", e);
      }
      
      // Convert Map to array
      customers = Array.from(customerMap.values());
      
      // If no customers found, add sample data
      if (customers.length === 0) {
        customers = [
          {
            CustomerID: 1,
            FirstName: "John",
            LastName: "Doe",
            Phone: "1234567890",
            HouseAddress: "123 Main St, City",
            CustomerTypeID: 1,
            AccountID: 1,
            Username: "johndoe",
            Email: "john.doe@example.com"
          },
          {
            CustomerID: 2,
            FirstName: "Jane",
            LastName: "Smith",
            Phone: "0987654321",
            HouseAddress: "456 Oak Ave, Town",
            CustomerTypeID: 2,
            AccountID: 2,
            Username: "janesmith",
            Email: "jane.smith@example.com"
          },
          {
            CustomerID: 3,
            FirstName: "Bob",
            LastName: "Johnson",
            Phone: "5551234567",
            HouseAddress: "789 Pine Rd, Village",
            CustomerTypeID: 1,
            AccountID: 3,
            Username: "bobjohnson",
            Email: "bob.johnson@example.com"
          }
        ];
      }
      
      // Save collected customers to adminCustomers for future use
      localStorage.setItem('adminCustomers', JSON.stringify(customers));
      
      console.log('Total customers found in localStorage:', customers.length);
      console.log('Customers:', customers);
      
      return customers;
    }
    
    // Function to perform customer search
    function performCustomerSearch(query) {
      if (!query) {
        customerSearchResults.style.display = "none";
        return;
      }
      
      console.log('Performing customer search for:', query);
      console.log('=== LOCALSTORAGE ONLY - NO API CALLS ===');
      
      // Debug: Log all localStorage keys
      console.log('All localStorage keys:', Object.keys(localStorage));
      console.log('mock_accounts (customer portal accounts):', localStorage.getItem('mock_accounts'));
      console.log('orderSubmissions:', localStorage.getItem('orderSubmissions'));
      
      try {
        // Get customers from all localStorage sources - NO API, ONLY LOCALSTORAGE
        const customers = getAllCustomersFromLocalStorage();
        console.log(`Found ${customers.length} customers in localStorage`);
        console.log('Customers available for search:', customers.map(c => ({ 
          name: `${c.FirstName} ${c.LastName}`, 
          email: c.Email, 
          username: c.Username 
        })));
        
        // Search customers by username, email, or name
        const queryLower = query.toLowerCase().trim();
        const searchTerm = queryLower;
        const queryDigitsOnly = query.replace(/\D/g, '');
        
        // Search customers by username, email, or name (case-insensitive)
        const matchingCustomers = customers.filter(customer => {
          const username = (customer.Username || '').toLowerCase().trim();
          const email = (customer.Email || '').toLowerCase().trim();
          const firstName = (customer.FirstName || '').toLowerCase().trim();
          const lastName = (customer.LastName || '').toLowerCase().trim();
          const fullName = `${firstName} ${lastName}`.trim();
          const phoneRaw = (customer.Phone || customer.phone || customer.ContactNumber || customer.contactNumber || '').toString().trim();
          const phoneLower = phoneRaw.toLowerCase();
          const phoneDigitsOnly = phoneRaw.replace(/\D/g, '');
          
          const matches = username.includes(searchTerm) ||
                 email.includes(searchTerm) ||
                 email === queryLower ||
                 username === queryLower ||
                 firstName.includes(searchTerm) ||
                 lastName.includes(searchTerm) ||
                 fullName.includes(searchTerm) ||
                 phoneLower.includes(searchTerm) ||
                 (queryDigitsOnly && phoneDigitsOnly.includes(queryDigitsOnly));
          
          if (matches) {
            console.log(`Match found:`, { username, email, firstName, lastName, phone: phoneRaw, searchTerm });
          }
          
          return matches;
        });
        
        console.log(`Found ${matchingCustomers.length} matching customers for query: "${query}"`);
        
        if (matchingCustomers.length > 0) {
          // Check if there's exactly one result that matches exactly by username or email
          const exactMatches = matchingCustomers.filter(customer => {
            const username = (customer.Username || '').toLowerCase().trim();
            const email = (customer.Email || '').toLowerCase().trim();
            const phoneRaw = (customer.Phone || customer.phone || customer.ContactNumber || customer.contactNumber || '').toString().trim();
            const phoneDigitsOnly = phoneRaw.replace(/\D/g, '');
            const isExactMatch = username === queryLower || email === queryLower || (!!queryDigitsOnly && phoneDigitsOnly === queryDigitsOnly);
            if (isExactMatch) {
              console.log(`Exact match found:`, { username, email, phone: phoneRaw, query: queryLower, queryDigitsOnly });
            }
            return isExactMatch;
          });
          
          console.log(`Found ${exactMatches.length} exact matches`);
          
          // Auto-populate if exactly one exact match found
          if (exactMatches.length === 1) {
            const exactMatch = exactMatches[0];
            populateCustomerFields({
              customerId: exactMatch.CustomerID,
              firstName: exactMatch.FirstName || '',
              lastName: exactMatch.LastName || '',
              phone: exactMatch.Phone || '',
              address: exactMatch.HouseAddress || '',
              customerTypeId: exactMatch.CustomerTypeID || 1,
              accountId: exactMatch.AccountID || ''
            });
            
            // Hide results after auto-populating
            customerSearchResults.style.display = "none";
            return;
          }
          
          // Show dropdown with matching customers
          customerSearchResults.innerHTML = matchingCustomers.map(customer => `
            <div class="customer-search-result-item" data-customer-id="${customer.CustomerID}" 
                 data-first-name="${customer.FirstName || ''}" 
                 data-last-name="${customer.LastName || ''}"
                 data-phone="${customer.Phone || ''}"
                 data-address="${customer.HouseAddress || ''}"
                 data-customer-type-id="${customer.CustomerTypeID || 1}"
                 data-account-id="${customer.AccountID || ''}"
                 data-username="${customer.Username || ''}"
                 data-email="${customer.Email || ''}">
              <div class="customer-search-result-name">${customer.FirstName || ''} ${customer.LastName || ''}</div>
              <div class="customer-search-result-email">${customer.Email || 'No email'} ${customer.Username ? `(${customer.Username})` : ''}</div>
            </div>
          `).join("");
          customerSearchResults.style.display = "block";
          
          // Add click handlers to result items
          customerSearchResults.querySelectorAll(".customer-search-result-item").forEach(item => {
            item.addEventListener("click", () => {
              const customerId = item.getAttribute("data-customer-id");
              const firstName = item.getAttribute("data-first-name");
              const lastName = item.getAttribute("data-last-name");
              const phone = item.getAttribute("data-phone");
              const address = item.getAttribute("data-address");
              const customerTypeId = item.getAttribute("data-customer-type-id");
              const accountId = item.getAttribute("data-account-id");
              
              // Populate fields
              populateCustomerFields({
                customerId: customerId,
                firstName: firstName,
                lastName: lastName,
                phone: phone,
                address: address,
                customerTypeId: customerTypeId,
                accountId: accountId
              });
              
              // Hide results
              customerSearchResults.style.display = "none";
              // Keep the username/email in the search field
              const username = item.getAttribute("data-username");
              const email = item.getAttribute("data-email");
              customerSearchInput.value = username || email || `${firstName} ${lastName}`;
            });
          });
        } else {
          customerSearchResults.innerHTML = '<div class="customer-search-result-item" style="color: var(--text-secondary);">No customers found</div>';
          customerSearchResults.style.display = "block";
        }
      } catch (error) {
        console.error("Error searching customers:", error);
        customerSearchResults.style.display = "none";
      }
    }
    
    if (customerSearchInput && customerSearchResults) {
      // Make search field group relative for absolute positioning of results
      if (customerFieldGroup) {
        customerFieldGroup.style.position = "relative";
      }
      
      // Search customers on input (with debounce)
      customerSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
        
        // Hide results if query is empty
        if (!query) {
          customerSearchResults.style.display = "none";
          return;
        }
        
        // Debounce search
        searchTimeout = setTimeout(() => {
          performCustomerSearch(query);
        }, 300);
      });
      
      // Search button click handler
      if (customerSearchBtn) {
        customerSearchBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const query = customerSearchInput.value.trim();
          console.log('Search button clicked, query:', query);
          // Clear any pending timeout
          if (searchTimeout) {
            clearTimeout(searchTimeout);
          }
          // Perform immediate search
          if (query) {
            performCustomerSearch(query);
          } else {
            customerSearchResults.style.display = "none";
          }
        });
      }
      
      // Also search on Enter key press
      customerSearchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const query = customerSearchInput.value.trim();
          // Clear any pending timeout
          if (searchTimeout) {
            clearTimeout(searchTimeout);
          }
          // Perform immediate search
          performCustomerSearch(query);
        }
      });
      
      // Hide results when clicking outside
      document.addEventListener("click", (e) => {
        if (customerFieldGroup && !customerFieldGroup.contains(e.target)) {
          customerSearchResults.style.display = "none";
        }
      });
    }
    
    // Function to populate customer fields
    function populateCustomerFields(customer) {
      adminCustomerId = customer.customerId ? parseInt(customer.customerId) : null;
      
      const firstNameEl = document.getElementById("adminFirstName");
      const lastNameEl = document.getElementById("adminLastName");
      const contactNumberEl = document.getElementById("adminContactNumber");
      const addressEl = document.getElementById("adminDeliveryAddress");
      const regularCustomerEl = document.getElementById("adminRegularCustomer");
      const customerIdHiddenEl = document.getElementById("adminCustomerId");
      
      // Populate all fields with fetched values
      if (firstNameEl) firstNameEl.value = customer.firstName || "";
      if (lastNameEl) lastNameEl.value = customer.lastName || "";
      if (contactNumberEl) contactNumberEl.value = customer.phone || "";
      if (addressEl) addressEl.value = customer.address || "";
      if (customerIdHiddenEl) customerIdHiddenEl.value = adminCustomerId || "";
      
      // Set customer type based on fetched value (1 = Regular, 2 = Dealer)
      if (regularCustomerEl) {
        const customerTypeId = parseInt(customer.customerTypeId) || 1;
        // Only show "Regular" or "Dealer" - no placeholder
        regularCustomerEl.value = customerTypeId === 2 ? "dealer" : "regular";
      }
    }
    
    // Place Order Button
    const placeOrderBtn = document.getElementById("adminPlaceOrderBtn");
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener("click", async () => {
        // Validate required fields
        const firstNameEl = document.getElementById("adminFirstName");
        const lastNameEl = document.getElementById("adminLastName");
        const contactNumberEl = document.getElementById("adminContactNumber");
        const addressEl = document.getElementById("adminDeliveryAddress");
        const paymentMethodEl = document.getElementById("adminPaymentMethod");
        const deliveryMethodEl = document.getElementById("adminDeliveryMethod");
        const regularCustomerEl = document.getElementById("adminRegularCustomer");
        
        if (!firstNameEl || !lastNameEl || !contactNumberEl || !addressEl) {
          alert("Please fill in all customer fields");
          return;
        }
        
        const firstName = firstNameEl.value.trim();
        const lastName = lastNameEl.value.trim();
        const phone = contactNumberEl.value.trim();
        const address = addressEl.value.trim();
        
        if (!firstName || !lastName || !phone || !address) {
          alert("Please fill in all required customer fields");
          return;
        }
        
        if (adminOrders.length === 0) {
          alert("Please add at least one order item");
          return;
        }
        
        // Validate delivery method
        const deliveryMethod = deliveryMethodEl?.value || "";
        if (!deliveryMethod) {
          alert("Please select a delivery method");
          return;
        }
        
        // Prepare order data
        const isNewCustomer = !adminCustomerId;
        const customerTypeId = regularCustomerEl && regularCustomerEl.value === "dealer" ? 2 : 1;
        const mopMap = { cash: 1, gcash: 2, loan: 3 };
        const receivingMethodMap = { pickup: 1, delivery: 2 };
        const orderTypeMap = { refill: 1, brandNew: 2 };
        
        // Determine order type (1 = Single type, 2 = Mixed)
        let orderTypeId = 1;
        const hasRefill = adminOrders.some(o => o.orderType === "refill");
        const hasBrandNew = adminOrders.some(o => o.orderType === "brandNew");
        if (hasRefill && hasBrandNew) {
          orderTypeId = 2; // Mixed order
        } else if (hasRefill) {
          orderTypeId = 1; // Refill only
        } else {
          orderTypeId = 2; // Brand new only
        }
        
        // Build items array
        const items = adminOrders.map(order => ({
          containerTypeId: order.containerType === "slim" ? 1 : (order.containerType === "round" ? 2 : 3),
          orderCategoryId: order.orderType === "refill" ? 1 : 2,
          quantity: order.quantity
        }));
        
        // Add Wilkins if checked
        const wilkinsChecked = document.getElementById("adminAdditionalWilkins")?.checked || false;
        if (wilkinsChecked) {
          items.push({
            containerTypeId: 3,
            orderCategoryId: 1,
            quantity: adminWilkinsQty
          });
        }
        
        const orderData = {
          isManualEntry: true, // Flag to indicate this is a manual order entry from admin
          customer: {
            customerId: adminCustomerId, // null for new customer, number for existing
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            customerTypeId: customerTypeId
          },
          order: {
            orderTypeId: orderTypeId, // This is for Refill/Mixed/Brand New, but will be overridden to Walk-in (1) in backend
            receivingMethodId: receivingMethodMap[deliveryMethodEl?.value || "pickup"],
            mopId: mopMap[paymentMethodEl?.value || "cash"],
            deliveryAddress: address,
            items: items
          }
        };
        
        try {
          placeOrderBtn.disabled = true;
          placeOrderBtn.textContent = "Placing Order...";
          
          console.log("Submitting order data:", JSON.stringify(orderData, null, 2));
          
          const response = await fetch("../admin_backend/api/add_orders.php", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(orderData)
          });
          
          // Get response text first (can only be read once)
          const responseText = await response.text();
          console.log("API response:", responseText);
          
          // Check if response is ok before parsing
          if (!response.ok) {
            console.error("API error response:", responseText);
            let errorMessage = "Failed to place order";
            try {
              const errorJson = JSON.parse(responseText);
              errorMessage = errorJson.error || errorJson.message || errorMessage;
            } catch (e) {
              errorMessage = responseText || `Server error: ${response.status}`;
            }
            alert(`Error placing order: ${errorMessage}`);
            return;
          }
          
          // Parse JSON response
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (parseError) {
            console.error("Failed to parse JSON response:", parseError);
            alert("Error: Invalid response from server. Please try again.");
            return;
          }
          
          if (result.success) {
            alert(`Order placed successfully! Order ID: #${result.orderId}`);
            
            // Reset form
            adminOrders = [];
            adminCustomerId = null;
            selectedOrderIndex = null;
            adminContainerType = "slim";
            adminOrderType = "refill";
            adminQuantity = 1;
            adminWilkinsQty = 1;
            
            // Clear customer fields
            if (firstNameEl) firstNameEl.value = "";
            if (lastNameEl) lastNameEl.value = "";
            if (contactNumberEl) contactNumberEl.value = "";
            if (addressEl) addressEl.value = "";
            if (regularCustomerEl) regularCustomerEl.value = "regular"; // Reset to default "Regular"
            if (customerSearchInput) customerSearchInput.value = "";
            const customerIdHiddenEl = document.getElementById("adminCustomerId");
            if (customerIdHiddenEl) customerIdHiddenEl.value = "";
            
            // Reset order form
            const quantityEl = document.getElementById("adminQuantity");
            if (quantityEl) quantityEl.value = 1;
            const additionalWilkinsEl = document.getElementById("adminAdditionalWilkins");
            if (additionalWilkinsEl) additionalWilkinsEl.checked = false;
            const wilkinsControl = document.getElementById("adminWilkinsControl");
            if (wilkinsControl) wilkinsControl.style.display = "none";
            
            // Reset toggle buttons
            document.querySelectorAll("#view-manual-entry .toggle-btn").forEach((b) => b.classList.remove("active"));
            const slimBtn = document.querySelector("#view-manual-entry [data-type='slim']");
            if (slimBtn) slimBtn.classList.add("active");
            document.querySelectorAll("#view-manual-entry .toggle-btn-action").forEach((b) => b.classList.remove("active"));
            const refillBtn = document.querySelector("#view-manual-entry [data-action='refill']");
            if (refillBtn) refillBtn.classList.add("active");
            
            renderOrders();
            updateTotals();
            updateSubtotalUI();
            
            // Refresh orders table if it exists (manual orders go directly to orders table, not dashboard)
            if (typeof window.loadOrdersForTable === 'function') {
              window.loadOrdersForTable();
            }
            
            // Refresh orders view if on dashboard
            if (typeof renderOrdersFor === 'function' && typeof ymd === 'function') {
              const now = new Date();
              renderOrdersFor(ymd(now));
            }

            if (isNewCustomer && result.customerId) {
              try {
                const cached = JSON.parse(localStorage.getItem('adminCustomers') || '[]');
                const newEntry = {
                  CustomerID: result.customerId,
                  AccountID: null,
                  FirstName: firstName,
                  LastName: lastName,
                  Phone: phone,
                  HouseAddress: address,
                  CreatedAt: new Date().toISOString(),
                  CustomerTypeName: 'Walk-in',
                  CustomerTypeID: 3,
                  isOnline: false
                };
                cached.push(newEntry);
                localStorage.setItem('adminCustomers', JSON.stringify(cached));
              } catch (storageError) {
                console.warn('Failed to cache new customer locally', storageError);
              }
            }

            // Notify logbook to refresh when a new walk-in customer was created
            if (isNewCustomer) {
              document.dispatchEvent(new Event('logbook:refresh'));
            }
          } else {
            alert(`Error placing order: ${result.error || result.message || "Unknown error"}`);
          }
        } catch (error) {
          console.error("Error placing order:", error);
          alert(`Error placing order: ${error.message || "Please try again."}`);
        } finally {
          placeOrderBtn.disabled = false;
          placeOrderBtn.textContent = "Place Order";
        }
      });
    }
  });
})();


