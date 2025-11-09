// Simple API client for customer portal
// Backend base URL (ensure this matches your XAMPP folder path)
// Use original APIs
const API_BASE = new URL('../customer_backend/api/', window.location.href).toString().replace(/\/$/, '');

// ============================================
// MOCK AUTHENTICATION SYSTEM (localStorage)
// ============================================
// This allows testing without PHP/database
const MOCK_AUTH_STORAGE_KEY = 'mock_accounts';
const MOCK_SESSION_KEY = 'mock_session';

// Get all mock accounts from localStorage
function getMockAccounts() {
  try {
    const stored = localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

// Save mock accounts to localStorage
function saveMockAccounts(accounts) {
  localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(accounts));
}

// Hash password (simple hash for mock - not secure, just for testing)
function hashPassword(password) {
  // Simple hash function for mock purposes
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

// Verify password (mock)
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Find account by username or email
function findMockAccount(usernameOrEmail) {
  const accounts = getMockAccounts();
  return accounts.find(acc => 
    acc.username === usernameOrEmail || acc.email === usernameOrEmail
  );
}

// Create mock account
function createMockAccount(payload) {
  const accounts = getMockAccounts();
  
  // Check if username or email already exists
  if (accounts.some(acc => acc.username === payload.username)) {
    return { status: 'error', message: 'Username already exists' };
  }
  if (accounts.some(acc => acc.email === payload.email)) {
    return { status: 'error', message: 'Email already registered' };
  }
  if (accounts.some(acc => acc.phone === payload.phone)) {
    return { status: 'error', message: 'Phone already registered' };
  }
  
  // Generate account ID
  const accountID = accounts.length > 0 ? Math.max(...accounts.map(a => a.accountID)) + 1 : 1;
  const customerID = accounts.length > 0 ? Math.max(...accounts.map(a => a.customerID || 0)) + 1 : 1;
  
  // Create account
  const newAccount = {
    accountID: accountID,
    customerID: customerID,
    username: payload.username,
    email: payload.email,
    passwordHash: hashPassword(payload.password),
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    address: payload.address,
    customerType: payload.customerType || 'Regular',
    customerTypeID: payload.customerType === 'Dealer' ? 2 : 1,
    role: 'Customer',
    createdAt: new Date().toISOString()
  };
  
  accounts.push(newAccount);
  saveMockAccounts(accounts);
  
  return { 
    success: true, 
    status: 'success',
    message: 'Account created successfully', 
    accountID: accountID 
  };
}

// Mock login
function mockLogin(usernameOrEmail, password) {
  const account = findMockAccount(usernameOrEmail);
  
  if (!account) {
    return { status: 'error', message: 'Invalid username/email or password' };
  }
  
  if (!verifyPassword(password, account.passwordHash)) {
    return { status: 'error', message: 'Invalid username/email or password' };
  }
  
  // Set session
  localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify({
    accountID: account.accountID,
    timestamp: Date.now()
  }));
  
  // Return account data (without password)
  const { passwordHash, ...accountData } = account;
  return {
    status: 'success',
    message: 'Login successful',
    account: {
      AccountID: account.accountID,
      Username: account.username,
      Email: account.email,
      Role: account.role
    },
    customer: {
      CustomerID: account.customerID,
      FirstName: account.firstName,
      LastName: account.lastName,
      Phone: account.phone,
      HouseAddress: account.address,
      CustomerTypeID: account.customerTypeID
    }
  };
}

// Mock session check
function mockMe() {
  try {
    const sessionData = localStorage.getItem(MOCK_SESSION_KEY);
    if (!sessionData) {
      return { authenticated: false };
    }
    
    const session = JSON.parse(sessionData);
    const accounts = getMockAccounts();
    const account = accounts.find(acc => acc.accountID === session.accountID);
    
    if (!account) {
      localStorage.removeItem(MOCK_SESSION_KEY);
      return { authenticated: false };
    }
    
    const { passwordHash, ...accountData } = account;
    return {
      authenticated: true,
      account: {
        AccountID: account.accountID,
        Username: account.username,
        Email: account.email,
        Role: account.role
      },
      customer: {
        CustomerID: account.customerID,
        FirstName: account.firstName,
        LastName: account.lastName,
        Phone: account.phone,
        HouseAddress: account.address,
        CustomerTypeID: account.customerTypeID
      }
    };
  } catch (e) {
    return { authenticated: false };
  }
}

// Mock logout
function mockLogout() {
  localStorage.removeItem(MOCK_SESSION_KEY);
  return { success: true };
}

// Mock update account
function mockUpdateAccount(payload) {
  try {
    const sessionData = localStorage.getItem(MOCK_SESSION_KEY);
    if (!sessionData) {
      return { status: 'error', message: 'Not authenticated' };
    }
    
    const session = JSON.parse(sessionData);
    const accounts = getMockAccounts();
    const accountIndex = accounts.findIndex(acc => acc.accountID === session.accountID);
    
    if (accountIndex === -1) {
      return { status: 'error', message: 'Account not found' };
    }
    
    const account = accounts[accountIndex];
    
    // Update password if provided
    if (payload.password && payload.currentPassword) {
      // Verify current password
      if (!verifyPassword(payload.currentPassword, account.passwordHash)) {
        return { status: 'error', message: 'Current password is incorrect' };
      }
      // Update password
      account.passwordHash = hashPassword(payload.password);
    }
    
    // Update other fields
    if (payload.firstName !== undefined) account.firstName = payload.firstName;
    if (payload.lastName !== undefined) account.lastName = payload.lastName;
    if (payload.username !== undefined) {
      // Check if username is already taken by another account
      if (accounts.some((acc, idx) => idx !== accountIndex && acc.username === payload.username)) {
        return { status: 'error', message: 'Username already exists' };
      }
      account.username = payload.username;
    }
    if (payload.email !== undefined) {
      // Check if email is already taken by another account
      if (accounts.some((acc, idx) => idx !== accountIndex && acc.email === payload.email)) {
        return { status: 'error', message: 'Email already registered' };
      }
      account.email = payload.email;
    }
    if (payload.phone !== undefined) {
      // Check if phone is already taken by another account
      if (accounts.some((acc, idx) => idx !== accountIndex && acc.phone === payload.phone)) {
        return { status: 'error', message: 'Phone already registered' };
      }
      account.phone = payload.phone;
    }
    if (payload.address !== undefined) account.address = payload.address;
    if (payload.customerType !== undefined) {
      account.customerType = payload.customerType;
      account.customerTypeID = payload.customerType === 'Dealer' ? 2 : 1;
    }
    
    // Save updated accounts
    saveMockAccounts(accounts);
    
    return { success: true, status: 'success', message: 'Account updated successfully' };
  } catch (e) {
    return { status: 'error', message: 'Failed to update account' };
  }
}

// ============================================
// MOCK ORDER SYSTEM (localStorage)
// ============================================
const MOCK_ORDERS_STORAGE_KEY = 'mock_orders';
const PRICE_CONFIG_STORAGE_KEY = 'priceConfig';
const DEFAULT_PRICE_LOOKUP = {
  '1-refill': 25,
  '1-brandNew': 225,
  '2-refill': 25,
  '2-brandNew': 225,
  '3-refill': 10,
  '3-brandNew': 10
};

function buildPriceLookup() {
  const lookup = { ...DEFAULT_PRICE_LOOKUP };
  try {
    const stored = localStorage.getItem(PRICE_CONFIG_STORAGE_KEY);
    if (!stored) {
      return lookup;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return lookup;
    }
    parsed.forEach(row => {
      const containerId = Number(row.ContainerTypeID ?? row.containerTypeID ?? row.containerTypeId ?? row.id);
      if (!Number.isFinite(containerId) || containerId <= 0) {
        return;
      }
      const defaultRefill = DEFAULT_PRICE_LOOKUP[`${containerId}-refill`] ?? DEFAULT_PRICE_LOOKUP[`1-refill`];
      const defaultBrandNew = DEFAULT_PRICE_LOOKUP[`${containerId}-brandNew`] ?? DEFAULT_PRICE_LOOKUP[`1-brandNew`];
      const refillPrice = Number(row.RefillPrice ?? row.refill ?? row.Refill ?? row.refillPrice);
      const brandNewPrice = Number(row.NewContainerPrice ?? row.brandNew ?? row.NewPrice ?? row.brandNewPrice);
      if (Number.isFinite(refillPrice) && Math.abs(refillPrice - defaultRefill) < 0.01) {
        lookup[`${containerId}-refill`] = defaultRefill;
      }
      if (Number.isFinite(brandNewPrice) && Math.abs(brandNewPrice - defaultBrandNew) < 0.01) {
        lookup[`${containerId}-brandNew`] = defaultBrandNew;
      }
    });
  } catch (error) {
    console.warn('Failed to read price configuration, using defaults.', error);
  }
  return lookup;
}

function resolveContainerTypeId(item) {
  const direct = Number(item?.containerTypeID ?? item?.containerTypeId ?? item?.ContainerTypeID);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  const name = (item?.containerType ?? item?.ContainerType ?? '').toString().toLowerCase();
  if (name === 'slim' || name === '1') return 1;
  if (name === 'round' || name === '2') return 2;
  if (name === 'wilkins' || name === '3') return 3;
  return 2;
}

function resolveOrderCategoryKey(item) {
  const categoryId = Number(item?.orderCategoryId ?? item?.OrderCategoryID);
  if (categoryId === 2) return 'brandNew';
  const raw = (item?.orderCategory ?? item?.OrderCategory ?? item?.orderType ?? item?.OrderType ?? '').toString().toLowerCase();
  if (raw.includes('brand') && raw.includes('new')) {
    return 'brandNew';
  }
  return 'refill';
}

function computeItemPricing(item, priceLookup) {
  const containerTypeId = resolveContainerTypeId(item);
  const orderCategoryKey = resolveOrderCategoryKey(item);
  const quantity = Math.max(0, Number(item?.quantity ?? item?.Quantity ?? 0)) || 0;
  let unitPrice = priceLookup[`${containerTypeId}-${orderCategoryKey}`];
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    if (containerTypeId === 3) {
      unitPrice = DEFAULT_PRICE_LOOKUP['3-refill'];
    } else {
      unitPrice = orderCategoryKey === 'brandNew'
        ? DEFAULT_PRICE_LOOKUP['1-brandNew']
        : DEFAULT_PRICE_LOOKUP['1-refill'];
    }
  }
  return {
    containerTypeId,
    orderCategoryKey,
    quantity,
    unitPrice,
    subtotal: unitPrice * quantity
  };
}

// Get all mock orders from localStorage
function getMockOrders() {
  try {
    const stored = localStorage.getItem(MOCK_ORDERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

// Save mock orders to localStorage
function saveMockOrders(orders) {
  localStorage.setItem(MOCK_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

// Mock add order
function mockAddOrder(payload) {
  try {
    const sessionData = localStorage.getItem(MOCK_SESSION_KEY);
    if (!sessionData) {
      return { status: 'error', message: 'Not authenticated' };
    }
    
    const session = JSON.parse(sessionData);
    const accounts = getMockAccounts();
    const account = accounts.find(acc => acc.accountID === session.accountID);
    
    if (!account) {
      return { status: 'error', message: 'Account not found' };
    }
    
    const priceLookup = buildPriceLookup();
    const orders = getMockOrders();
    
    // Generate order ID
    const orderID = orders.length > 0 ? Math.max(...orders.map(o => o.OrderID || 0)) + 1 : 1;
    
    // Calculate total amount
    let totalAmount = 0;
    const items = payload.items || [];
    items.forEach(item => {
      const pricing = computeItemPricing(item, priceLookup);
      totalAmount += pricing.subtotal;
    });
    
    // Create order
    const newOrder = {
      OrderID: orderID,
      CustomerID: payload.customerID || account.customerID,
      AccountID: session.accountID,
      DeliveryAddress: payload.deliveryAddress || account.address,
      MOPID: payload.mopID || 1,
      ReceivingMethodID: payload.receivingMethodID || 1,
      OrderStatus: 'Pending',
      PaymentStatus: 'Pending',
      TotalAmount: totalAmount,
      Items: items,
      Date: new Date().toISOString(),
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };
    
    orders.push(newOrder);
    saveMockOrders(orders);
    
    // Calculate OrderDate based on operating hours (8am-5pm)
    // Business Rules:
    // - Orders placed after 5pm (17:00) to 11:59pm -> OrderDate = next day
    // - Orders placed from 12am (00:00) to before 8am (08:00) -> OrderDate = current day
    // - Orders placed from 8am (08:00) to 5pm (17:00) -> OrderDate = current day
    const now = new Date();
    const currentHour = now.getHours();
    const orderDate = new Date(now);
    
    // If order is placed after 5pm (17:00), set OrderDate to next day
    if (currentHour >= 17) {
      orderDate.setDate(orderDate.getDate() + 1);
    }
    // Otherwise, OrderDate = current day (covers 12am-7:59am and 8am-4:59pm)
    
    // Format OrderDate as YYYY-MM-DD
    const orderDateStr = orderDate.getFullYear() + '-' + 
      String(orderDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(orderDate.getDate()).padStart(2, '0');
    
    const createdAt = new Date().toISOString();

    // Also save to orderSubmissions for admin view compatibility
    const orderSubmissions = JSON.parse(localStorage.getItem('orderSubmissions') || '[]');
    orderSubmissions.push({
      id: orderID,
      orderId: orderID,
      customerID: payload.customerID || account.customerID,
      customerName: `${account.firstName} ${account.lastName}`,
      firstName: account.firstName,
      lastName: account.lastName,
      deliveryAddress: payload.deliveryAddress || account.address,
      deliveryMethod: payload.receivingMethodID === 2 ? 'delivery' : 'pickup',
      paymentMethod: payload.mopID === 1 ? 'cash' : (payload.mopID === 2 ? 'gcash' : 'loan'),
      status: 'pending',
      paymentStatus: 'pending',
      paymentStatusId: 1,
      total: totalAmount,
      grandTotal: totalAmount,
      items: items.map(item => ({
        containerType: item.containerTypeID === 1 ? 'round' : (item.containerTypeID === 2 ? 'slim' : 'wilkins'),
        orderType: item.orderCategory === 'Brand New' ? 'brandNew' : 'refill',
        quantity: item.quantity
      })),
      date: createdAt,
      createdAt: createdAt,
      updatedAt: createdAt,
      orderDate: orderDateStr  // Add orderDate field for proper date filtering
    });
    localStorage.setItem('orderSubmissions', JSON.stringify(orderSubmissions));
    
    return { 
      success: true, 
      status: 'success',
      message: 'Order placed successfully', 
      orderID: orderID 
    };
  } catch (e) {
    return { status: 'error', message: 'Failed to place order: ' + e.message };
  }
}

// Mock get orders
function mockGetOrders(customerID) {
  try {
    const orders = getMockOrders();
    const customerOrders = orders.filter(o => o.CustomerID === customerID);
    
    return {
      success: true,
      orders: customerOrders.map(o => ({
        OrderID: o.OrderID,
        Date: o.Date || o.CreatedAt,
        Total: o.TotalAmount,
        Status: o.OrderStatus
      }))
    };
  } catch (e) {
    return { success: false, orders: [] };
  }
}

// Mock get order details
function mockGetOrderDetails(orderID) {
  try {
    const orders = getMockOrders();
    const order = orders.find(o => o.OrderID === orderID);
    
    if (!order) {
      return { error: 'Order not found' };
    }
    
    const priceLookup = buildPriceLookup();
    const containerTypeMap = { 1: 'Round', 2: 'Slim', 3: 'Wilkins' };
    
    return {
      OrderID: order.OrderID,
      Date: order.Date || order.CreatedAt,
      DeliveryAddress: order.DeliveryAddress,
      PaymentStatus: order.PaymentStatus,
      OrderStatus: order.OrderStatus,
      TotalAmount: order.TotalAmount,
      Items: (order.Items || []).map(item => {
        const pricing = computeItemPricing(item, priceLookup);
        return {
          ContainerType: containerTypeMap[pricing.containerTypeId] || 'Slim',
          ItemType: pricing.orderCategoryKey === 'brandNew' ? 'Brand New' : 'Refill',
          Quantity: pricing.quantity || 0,
          UnitPrice: pricing.unitPrice,
          Subtotal: pricing.subtotal
        };
      })
    };
  } catch (e) {
    return { error: 'Failed to get order details' };
  }
}

// Mock cancel order
function mockCancelOrder(orderID) {
  try {
    const orders = getMockOrders();
    const orderIndex = orders.findIndex(o => o.OrderID === orderID);
    
    if (orderIndex === -1) {
      return { status: 'error', message: 'Order not found' };
    }
    
    const order = orders[orderIndex];
    
    // Only allow cancellation if order is pending
    if (order.OrderStatus !== 'Pending' && order.OrderStatus !== 'For Approval') {
      return { status: 'error', message: 'Order cannot be cancelled at this stage' };
    }
    
    order.OrderStatus = 'Cancelled';
    order.UpdatedAt = new Date().toISOString();
    
    saveMockOrders(orders);
    
    // Also update orderSubmissions
    const orderSubmissions = JSON.parse(localStorage.getItem('orderSubmissions') || '[]');
    const submissionIndex = orderSubmissions.findIndex(o => o.id === orderID || o.orderId === orderID);
    if (submissionIndex !== -1) {
      orderSubmissions[submissionIndex].status = 'cancelled';
      orderSubmissions[submissionIndex].updatedAt = new Date().toISOString();
      localStorage.setItem('orderSubmissions', JSON.stringify(orderSubmissions));
    }
    
    return { success: true, status: 'success', message: 'Order cancelled successfully' };
  } catch (e) {
    return { status: 'error', message: 'Failed to cancel order' };
  }
}

// Mock get reorder
function mockGetReorder(orderID) {
  try {
    const orders = getMockOrders();
    const order = orders.find(o => o.OrderID === orderID);
    
    if (!order) {
      return { success: false, message: 'Order not found' };
    }
    
    return {
      success: true,
      deliveryAddress: order.DeliveryAddress,
      items: (order.Items || []).map(item => ({
        containerTypeID: item.containerTypeID,
        orderCategory: item.orderCategory,
        quantity: item.quantity
      }))
    };
  } catch (e) {
    return { success: false, message: 'Failed to get reorder data' };
  }
}

// Mock submit feedback
function mockSubmitFeedback(orderID, rating, comments) {
  try {
    const orders = getMockOrders();
    const order = orders.find(o => o.OrderID === orderID);
    
    if (!order) {
      return { status: 'error', message: 'Order not found' };
    }
    
    // Store feedback (you can enhance this to store in a separate feedback storage)
    if (!order.Feedback) {
      order.Feedback = [];
    }
    order.Feedback.push({
      rating: rating,
      comments: comments,
      date: new Date().toISOString()
    });
    
    saveMockOrders(orders);
    
    return { success: true, status: 'success', message: 'Feedback submitted successfully' };
  } catch (e) {
    return { status: 'error', message: 'Failed to submit feedback' };
  }
}

// ============================================
// API FUNCTIONS (with mock fallback)
// ============================================
const USE_MOCK_AUTH = true; // Set to false to use real API only
const USE_API_FALLBACK = false; // Allow network fallback when true

if (typeof window !== 'undefined' && typeof window.__ensureMockSeed === 'function') {
  try {
    window.__ensureMockSeed();
  } catch (error) {
    console.error('Failed to initialise mock seed in customer portal:', error);
  }
}

const Api = {
  async me() {
    const mockResult = USE_MOCK_AUTH ? mockMe() : { authenticated: false };
    if (!USE_API_FALLBACK) {
      return mockResult;
    }
    if (mockResult.authenticated) {
      return mockResult;
    }
    try {
      const res = await fetch(`${API_BASE}/session_me.php`, { credentials: 'include' });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) console.error('Session me API error', res.status, json);
        return json;
      } catch (e) {
        if (USE_MOCK_AUTH) {
          return mockResult;
        }
        console.error('Session me parse error', e, text);
        return { status: 'error', message: 'Invalid JSON from session_me', raw: text };
      }
    } catch (e) {
      if (USE_MOCK_AUTH) {
        return mockResult;
      }
      return { authenticated: false };
    }
  },
  async login(usernameOrEmail, password) {
    const mockResult = USE_MOCK_AUTH ? mockLogin(usernameOrEmail, password) : { status: 'error' };
    if (!USE_API_FALLBACK || mockResult.status === 'success') {
      return mockResult;
    }
    try {
      const res = await fetch(`${API_BASE}/get_account.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ usernameOrEmail, password })
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) {
          // If API fails and mock is enabled, try mock
          if (USE_MOCK_AUTH && json.status === 'error') {
            return mockLogin(usernameOrEmail, password);
          }
          console.error('Login API error', res.status, json);
        }
        return json;
      } catch (e) {
        // If API parse fails and mock is enabled, try mock
        if (USE_MOCK_AUTH) {
          return mockLogin(usernameOrEmail, password);
        }
        console.error('Login parse error', e, text);
        return { status: 'error', message: 'Invalid JSON from login', raw: text };
      }
    } catch (e) {
      // Network error - use mock if enabled
      if (USE_MOCK_AUTH) {
        return mockLogin(usernameOrEmail, password);
      }
      return { status: 'error', message: 'Network error. Please check your connection.' };
    }
  },
  async logout() {
    // Clear mock session
    if (USE_MOCK_AUTH) {
      mockLogout();
    }
    
    if (!USE_API_FALLBACK) {
      return { success: true };
    }

    try {
      const res = await fetch(`${API_BASE}/logout.php`, {
        method: 'POST',
        credentials: 'include'
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) console.error('Logout API error', res.status, json);
      return json;
    } catch (e) {
      // If API fails, mock logout already succeeded
      return { success: true };
    }
  },
  async register(payload) {
    const mockResult = USE_MOCK_AUTH ? createMockAccount(payload) : { status: 'error' };
    if (!USE_API_FALLBACK || mockResult.success || mockResult.status === 'success' || mockResult.status === 'error') {
      return mockResult;
    }
    try {
      const res = await fetch(`${API_BASE}/create_account.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) {
          // If API fails and mock is enabled, try mock
          if (USE_MOCK_AUTH && json.status === 'error') {
            return createMockAccount(payload);
          }
          console.error('Register API error', res.status, json);
        }
        return json;
      } catch (e) {
        // If API parse fails and mock is enabled, try mock
        if (USE_MOCK_AUTH) {
          return createMockAccount(payload);
        }
        console.error('Register parse error', e, text);
        return { status: 'error', message: 'Invalid JSON from register', raw: text };
      }
    } catch (e) {
      // Network error - use mock if enabled
      if (USE_MOCK_AUTH) {
        return createMockAccount(payload);
      }
      return { status: 'error', message: 'Network error. Please check your connection.' };
    }
  },
  async updateAccount(payload) {
    const mockResult = USE_MOCK_AUTH ? mockUpdateAccount(payload) : { status: 'error' };
    if (!USE_API_FALLBACK || mockResult.success || mockResult.status === 'success' || (mockResult.status === 'error' && !mockResult.message?.includes('Not authenticated'))) {
      return mockResult;
    }
    try {
      const res = await fetch(`${API_BASE}/update_account.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) {
          // If API fails and mock is enabled, try mock
          if (USE_MOCK_AUTH && json.status === 'error') {
            return mockUpdateAccount(payload);
          }
          console.error('Update account API error', res.status, json);
        }
        return json;
      } catch (e) {
        // If API parse fails and mock is enabled, try mock
        if (USE_MOCK_AUTH) {
          return mockUpdateAccount(payload);
        }
        console.error('Update account parse error', e, text);
        return { status: 'error', message: 'Invalid JSON from update_account', raw: text };
      }
    } catch (e) {
      // Network error - use mock if enabled
      if (USE_MOCK_AUTH) {
        return mockUpdateAccount(payload);
      }
      return { status: 'error', message: 'Network error. Please check your connection.' };
    }
  },
  async addOrder(payload) {
    const mockResult = USE_MOCK_AUTH ? mockAddOrder(payload) : { status: 'error' };
    if (!USE_API_FALLBACK || mockResult.success || mockResult.status === 'success') {
      return mockResult;
    }
    try {
      const res = await fetch(`${API_BASE}/add_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) {
          // If API fails and mock is enabled, try mock
          if (USE_MOCK_AUTH && json.status === 'error') {
            return mockAddOrder(payload);
          }
          console.error('Add order API error', res.status, json);
        }
        return json;
      } catch (e) {
        // If API parse fails and mock is enabled, try mock
        if (USE_MOCK_AUTH) {
          return mockAddOrder(payload);
        }
        console.error('Add order parse error', e, text);
        return { status: 'error', message: 'Invalid JSON from add_order', raw: text };
      }
    } catch (e) {
      // Network error - use mock if enabled
      if (USE_MOCK_AUTH) {
        return mockAddOrder(payload);
      }
      return { status: 'error', message: 'Network error. Please check your connection.' };
    }
  },
  async getOrders(customerID) {
    const mockResult = USE_MOCK_AUTH ? mockGetOrders(customerID) : { success: false };
    if (!USE_API_FALLBACK || mockResult.success) {
      return mockResult;
    }
    try {
      const res = await fetch(`${API_BASE}/get_orders.php?CustomerID=${encodeURIComponent(customerID)}`, {
        credentials: 'include'
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) {
          // If API fails and mock is enabled, try mock
          if (USE_MOCK_AUTH) {
            return mockGetOrders(customerID);
          }
          console.error('Get orders API error', res.status, json);
        }
        return json;
      } catch (e) {
        // If API parse fails and mock is enabled, try mock
        if (USE_MOCK_AUTH) {
          return mockGetOrders(customerID);
        }
        console.error('Get orders parse error', e, text);
        return { status: 'error', message: 'Invalid JSON from get_orders', raw: text };
      }
    } catch (e) {
      // Network error - use mock if enabled
      if (USE_MOCK_AUTH) {
        return mockGetOrders(customerID);
      }
      return { success: false, orders: [] };
    }
  },
  async getOrderDetails(orderID) {
    const mockResult = USE_MOCK_AUTH ? mockGetOrderDetails(orderID) : { error: 'Not found' };
    if (!USE_API_FALLBACK || !mockResult.error) {
      return mockResult;
    }
    try {
      const res = await fetch(`${API_BASE}/get_order_details.php?OrderID=${encodeURIComponent(orderID)}`, {
        credentials: 'include'
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) {
          // If API fails and mock is enabled, try mock
          if (USE_MOCK_AUTH) {
            return mockGetOrderDetails(orderID);
          }
          console.error('Get order details API error', res.status, json);
        }
        return json;
      } catch (e) {
        // If API parse fails and mock is enabled, try mock
        if (USE_MOCK_AUTH) {
          return mockGetOrderDetails(orderID);
        }
        console.error('Get order details parse error', e, text);
        return { status: 'error', message: 'Invalid JSON from get_order_details', raw: text };
      }
    } catch (e) {
      // Network error - use mock if enabled
      if (USE_MOCK_AUTH) {
        return mockGetOrderDetails(orderID);
      }
      return { error: 'Network error. Please check your connection.' };
    }
  },
  async cancelOrder(orderID) {
    const mockResult = USE_MOCK_AUTH ? mockCancelOrder(orderID) : { status: 'error' };
    if (!USE_API_FALLBACK || mockResult.success || mockResult.status === 'success') {
      return mockResult;
    }
    try {
      const res = await fetch(`${API_BASE}/cancel_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderID })
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) {
          // If API fails and mock is enabled, try mock
          if (USE_MOCK_AUTH && json.status === 'error') {
            return mockCancelOrder(orderID);
          }
          console.error('Cancel order API error', res.status, json);
        }
        return json;
      } catch (e) {
        // If API parse fails and mock is enabled, try mock
        if (USE_MOCK_AUTH) {
          return mockCancelOrder(orderID);
        }
        console.error('Cancel order parse error', e, text);
        return { status: 'error', message: 'Invalid JSON from cancel_order', raw: text };
      }
    } catch (e) {
      // Network error - use mock if enabled
      if (USE_MOCK_AUTH) {
        return mockCancelOrder(orderID);
      }
      return { status: 'error', message: 'Network error. Please check your connection.' };
    }
  },
  async getReorder(orderID) {
    const mockResult = USE_MOCK_AUTH ? mockGetReorder(orderID) : { success: false };
    if (!USE_API_FALLBACK || mockResult.success) {
      return mockResult;
    }
    try {
      const res = await fetch(`${API_BASE}/get_reorder.php?OrderID=${encodeURIComponent(orderID)}`, {
        credentials: 'include'
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) {
          // If API fails and mock is enabled, try mock
          if (USE_MOCK_AUTH) {
            return mockGetReorder(orderID);
          }
          console.error('Get reorder API error', res.status, json);
        }
        return json;
      } catch (e) {
        // If API parse fails and mock is enabled, try mock
        if (USE_MOCK_AUTH) {
          return mockGetReorder(orderID);
        }
        console.error('Get reorder parse error', e, text);
        return { status: 'error', message: 'Invalid JSON from get_reorder', raw: text };
      }
    } catch (e) {
      // Network error - use mock if enabled
      if (USE_MOCK_AUTH) {
        return mockGetReorder(orderID);
      }
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  },
  async submitFeedback(orderID, rating, comments) {
    const mockResult = USE_MOCK_AUTH ? mockSubmitFeedback(orderID, rating, comments) : { status: 'error' };
    if (!USE_API_FALLBACK || mockResult.success || mockResult.status === 'success') {
      return mockResult;
    }
    try {
      const res = await fetch(`${API_BASE}/submit_feedback.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderID, rating, comments })
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) {
          // If API fails and mock is enabled, try mock
          if (USE_MOCK_AUTH && json.status === 'error') {
            return mockSubmitFeedback(orderID, rating, comments);
          }
          console.error('Submit feedback API error', res.status, json);
        }
        return json;
      } catch (e) {
        // If API parse fails and mock is enabled, try mock
        if (USE_MOCK_AUTH) {
          return mockSubmitFeedback(orderID, rating, comments);
        }
        console.error('Submit feedback parse error', e, text);
        return { status: 'error', message: 'Invalid JSON from submit_feedback', raw: text };
      }
    } catch (e) {
      // Network error - use mock if enabled
      if (USE_MOCK_AUTH) {
        return mockSubmitFeedback(orderID, rating, comments);
      }
      return { status: 'error', message: 'Network error. Please check your connection.' };
    }
  }
};

// Maps
const MOP_NAME_TO_ID = { cash: 1, gcash: 2, loan: 3 };
const RECEIVING_METHOD_TO_ID = { pickup: 1, delivery: 2 };
const UI_CONTAINER_TO_ID = { round: 1, slim: 2, wilkins: 3 }; // UI IDs expected by backend mapping

window.Api = Api;
window.ApiMaps = { MOP_NAME_TO_ID, RECEIVING_METHOD_TO_ID, UI_CONTAINER_TO_ID };

