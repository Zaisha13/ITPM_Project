(function () {
  const STORAGE_KEYS = {
    accounts: 'mock_accounts',
    orders: 'orderSubmissions',
    adminOrders: 'mock_orders',
    customers: 'adminCustomers',
    feedback: 'customerFeedback',
    priceConfig: 'priceConfig',
    systemConfig: 'adminSystemConfig',
    maintenance: 'maintenanceNotice',
    stock: 'adminStock'
  };

  const CLEANUP_FLAGS = {
    legacyOrders: 'mock_seed_orders_cleanup_done'
  };

  const LEGACY_PLACEHOLDER_NAMES = [
    'john doe',
    'jane smith',
    'customer',
    'test',
    'placeholder',
    'sample',
    'demo',
    'example'
  ];

  const LEGACY_PLACEHOLDER_USERNAMES = ['jdoe', 'janes'];

  const ORDER_STATUS_SEED = {
    pending: { id: 1, name: 'For Approval' },
    'for-approval': { id: 1, name: 'For Approval' },
    confirmed: { id: 2, name: 'Confirmed' },
    processing: { id: 4, name: 'In Progress' },
    'in-progress': { id: 4, name: 'In Progress' },
    'out-for-delivery': { id: 5, name: 'Out for Delivery' },
    'ready-for-pickup': { id: 6, name: 'Ready for Pickup' },
    completed: { id: 7, name: 'Completed' },
    delivered: { id: 7, name: 'Completed' },
    cancelled: { id: 8, name: 'Cancelled' }
  };

  const PAYMENT_STATUS_SEED = {
    cash: { id: 2, name: 'Paid' },
    gcash: { id: 2, name: 'Paid' },
    loan: { id: 1, name: 'Pending' },
    cancelled: { id: 4, name: 'Cancelled' }
  };

  const CONTAINER_MAP = {
    1: { key: 'slim', name: 'Slim' },
    2: { key: 'round', name: 'Round' },
    3: { key: 'wilkins', name: 'Wilkins' }
  };

  const ORDER_CATEGORY_MAP = {
    1: { key: 'refill', name: 'Refill' },
    2: { key: 'brandNew', name: 'New Gallon' }
  };

  function hashPassword(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureAccounts() {
    const existing = readJSON(STORAGE_KEYS.accounts);
    const accounts = Array.isArray(existing) ? [...existing] : [];
    const now = new Date();
    const createdAt = now.toISOString();
    let changed = false;

    if (accounts.length === 0) {
      accounts.push(
        {
          accountID: 1,
          customerID: 1,
          username: 'jdoe',
          email: 'john.doe@example.com',
          passwordHash: hashPassword('password123'),
          firstName: 'John',
          lastName: 'Doe',
          phone: '09171234567',
          address: '123 Main Street, City',
          customerType: 'Regular',
          customerTypeID: 1,
          role: 'Customer',
          createdAt
        },
        {
          accountID: 2,
          customerID: 2,
          username: 'janes',
          email: 'jane.smith@example.com',
          passwordHash: hashPassword('password123'),
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '09987654321',
          address: '456 Oak Avenue, Town',
          customerType: 'Dealer',
          customerTypeID: 2,
          role: 'Customer',
          createdAt
        }
      );
      changed = true;
    }

    const adminUsername = 'water_avenue';
    const adminEmail = 'water_avenue@gmail.com';
    const adminPassword = 'admin123';

    const maxAccountId = accounts.reduce((max, acc) => Math.max(max, Number(acc.accountID) || 0), 0);
    const maxCustomerId = accounts.reduce((max, acc) => Math.max(max, Number(acc.customerID) || 0), 0);

    const existingAdminIndex = accounts.findIndex(acc =>
      acc.role === 'Admin' || acc.username === adminUsername || acc.email === adminEmail
    );

    if (existingAdminIndex === -1) {
      accounts.push({
        accountID: maxAccountId + 1,
        customerID: maxCustomerId + 1,
        username: adminUsername,
        email: adminEmail,
        passwordHash: hashPassword(adminPassword),
        firstName: 'Water',
        lastName: 'Avenue',
        phone: '091234567890',
        address: 'Water Avenue HQ, Block 3 Lot 12, Antipolo City',
        customerType: 'Admin',
        customerTypeID: 0,
        role: 'Admin',
        createdAt
      });
      changed = true;
    } else {
      const adminAccount = { ...accounts[existingAdminIndex] };
      let adminChanged = false;

      if (adminAccount.role !== 'Admin') {
        adminAccount.role = 'Admin';
        adminChanged = true;
      }

      if (adminAccount.customerType !== 'Admin') {
        adminAccount.customerType = 'Admin';
        adminAccount.customerTypeID = 0;
        adminChanged = true;
      }

      if (!adminAccount.username || !adminAccount.username.toString().trim()) {
        adminAccount.username = adminUsername;
        adminChanged = true;
      }

      if (!adminAccount.email || !adminAccount.email.toString().trim()) {
        adminAccount.email = adminEmail;
        adminChanged = true;
      }

      const desiredHash = hashPassword(adminPassword);
      if (!adminAccount.passwordHash || !adminAccount.passwordHash.toString().trim()) {
        adminAccount.passwordHash = desiredHash;
        adminChanged = true;
      }

      if (!adminAccount.firstName || !adminAccount.firstName.toString().trim()) {
        adminAccount.firstName = 'Water';
        adminChanged = true;
      }

      if (!adminAccount.lastName || !adminAccount.lastName.toString().trim()) {
        adminAccount.lastName = 'Avenue';
        adminChanged = true;
      }

      if (!adminAccount.phone || !adminAccount.phone.toString().trim()) {
        adminAccount.phone = '091234567890';
        adminChanged = true;
      }

      if (!adminAccount.address || !adminAccount.address.toString().trim()) {
        adminAccount.address = 'Water Avenue HQ, Block 3 Lot 12, Antipolo City';
        adminChanged = true;
      }

      if (!adminAccount.createdAt) {
        adminAccount.createdAt = createdAt;
        adminChanged = true;
      }

      if (adminChanged) {
        accounts[existingAdminIndex] = adminAccount;
        changed = true;
      }
    }

    if (changed) {
      writeJSON(STORAGE_KEYS.accounts, accounts);
    }
  }

  function computeOrderTotals(items) {
    const priceTable = readJSON(STORAGE_KEYS.priceConfig) || getSamplePrices();
    const priceLookup = {};
    priceTable.forEach(row => {
      priceLookup[`${row.ContainerTypeID}-1`] = Number(row.RefillPrice);
      priceLookup[`${row.ContainerTypeID}-2`] = Number(row.NewContainerPrice);
    });
    let total = 0;
    const details = items.map((item, idx) => {
      const container = CONTAINER_MAP[item.containerTypeId] || CONTAINER_MAP[item.ContainerTypeID] || CONTAINER_MAP[2];
      const category = ORDER_CATEGORY_MAP[item.orderCategoryId] || ORDER_CATEGORY_MAP[item.OrderCategoryID] || ORDER_CATEGORY_MAP[1];
      const quantity = Number(item.quantity || item.Quantity || 0);
      const priceKey = `${container ? getContainerId(container.key) : 2}-${category ? getCategoryId(category.key) : 1}`;
      const storedPrice = Number(priceLookup[priceKey]);
      const defaultUnitPrice = (category && category.key === 'brandNew')
        ? 225
        : (container && container.key === 'wilkins' ? 10 : 25);
      const unitPrice = (Number.isFinite(storedPrice) && storedPrice > 0) ? storedPrice : defaultUnitPrice;
      const subtotal = quantity * unitPrice;
      total += subtotal;
      return {
        OrderDetailID: item.OrderDetailID || idx + 1,
        Quantity: quantity,
        ContainerTypeName: container.name,
        OrderCategoryName: category.name,
        UnitPrice: unitPrice,
        Subtotal: subtotal,
        containerTypeKey: container.key,
        orderCategoryKey: category.key
      };
    });
    return { total, details };
  }

  function getContainerId(key) {
    if (key === 'slim') return 1;
    if (key === 'round') return 2;
    if (key === 'wilkins') return 3;
    return 2;
  }

  function getCategoryId(key) {
    return key === 'brandNew' ? 2 : 1;
  }

  function ensureOrders() {
    const existing = readJSON(STORAGE_KEYS.orders);
    if (Array.isArray(existing)) {
      return;
    }
    writeJSON(STORAGE_KEYS.orders, []);
    if (!Array.isArray(readJSON(STORAGE_KEYS.adminOrders))) {
      writeJSON(STORAGE_KEYS.adminOrders, []);
    }
    if (!Array.isArray(readJSON(STORAGE_KEYS.feedback))) {
      writeJSON(STORAGE_KEYS.feedback, []);
    }
  }

  function seedMockOrdersFromSubmissions(submissions) {
    const existing = readJSON(STORAGE_KEYS.adminOrders);
    if (Array.isArray(existing) && existing.length > 0) {
      return;
    }
    const mockOrders = submissions.map(sub => {
      const items = (sub.items || []).map(item => ({
        containerTypeID: getContainerId(item.containerType || item.containerTypeKey || 'round'),
        orderCategory: item.orderType === 'brandNew' ? 'Brand New' : 'Refill',
        quantity: Number(item.quantity || 0)
      }));
      return {
        OrderID: sub.orderId,
        CustomerID: sub.customerID,
        AccountID: sub.accountId || sub.customerID,
        DeliveryAddress: sub.deliveryAddress,
        MOPID: sub.paymentMethod === 'gcash' ? 2 : (sub.paymentMethod === 'loan' ? 3 : 1),
        ReceivingMethodID: sub.deliveryMethod === 'delivery' ? 2 : 1,
        OrderStatus: (sub.status || 'pending').toUpperCase(),
        PaymentStatus: (sub.paymentStatus || (sub.paymentMethod === 'loan' ? 'Pending' : 'Paid')),
        TotalAmount: sub.total,
        Items: items,
        Date: sub.createdAt,
        CreatedAt: sub.createdAt,
        UpdatedAt: sub.updatedAt,
        Feedback: sub.feedback || []
      };
    });
    writeJSON(STORAGE_KEYS.adminOrders, mockOrders);
  }

  function seedFeedbackFromOrders(submissions) {
    const existing = readJSON(STORAGE_KEYS.feedback);
    if (Array.isArray(existing) && existing.length > 0) {
      return;
    }
    const feedbackEntries = [];
    submissions.forEach(order => {
      if (Array.isArray(order.feedback) && order.feedback.length > 0) {
        order.feedback.forEach((fb, idx) => {
          feedbackEntries.push({
            feedbackId: feedbackEntries.length + 1,
            orderId: order.orderId,
            rating: fb.rating,
            comments: fb.comments || '',
            feedbackDate: fb.date || new Date().toISOString()
          });
        });
      }
    });
    if (feedbackEntries.length === 0) {
      feedbackEntries.push({
        feedbackId: 1,
        orderId: 2,
        rating: 5,
        comments: 'Excellent delivery service and water quality!',
        feedbackDate: new Date().toISOString()
      });
    }
    writeJSON(STORAGE_KEYS.feedback, feedbackEntries);
  }

  function ensureCustomers() {
    const accounts = (readJSON(STORAGE_KEYS.accounts) || []).filter(acc => acc.role !== 'Admin');
    const desiredCustomers = accounts.map(acc => ({
      CustomerID: acc.customerID,
      AccountID: acc.accountID,
      FirstName: acc.firstName,
      LastName: acc.lastName,
      Phone: acc.phone,
      HouseAddress: acc.address,
      CreatedAt: acc.createdAt,
      CustomerTypeName: acc.customerType === 'Dealer' ? 'Dealer' : 'Regular'
    }));

    const existing = readJSON(STORAGE_KEYS.customers);
    const needsUpdate = !Array.isArray(existing) ||
      existing.length !== desiredCustomers.length ||
      existing.some(entry => entry && accounts.every(acc => Number(acc.customerID) !== Number(entry.CustomerID)));

    if (needsUpdate) {
      writeJSON(STORAGE_KEYS.customers, desiredCustomers);
    }
  }

  function getSamplePrices() {
    return [
      { ContainerTypeID: 1, ContainerTypeName: 'Slim', RefillPrice: 25, NewContainerPrice: 225 },
      { ContainerTypeID: 2, ContainerTypeName: 'Round', RefillPrice: 25, NewContainerPrice: 225 },
      { ContainerTypeID: 3, ContainerTypeName: 'Wilkins', RefillPrice: 10, NewContainerPrice: 10 }
    ];
  }

  function ensurePrices() {
    const existing = readJSON(STORAGE_KEYS.priceConfig);
    if (Array.isArray(existing) && existing.length > 0) {
      return;
    }
    writeJSON(STORAGE_KEYS.priceConfig, getSamplePrices());
  }

  function ensureSystemConfig() {
    const existing = readJSON(STORAGE_KEYS.systemConfig);
    if (existing && typeof existing === 'object') {
      return;
    }
    const config = {
      daily_order_limit: 300,
      available_capacity: 296,
      opening_time: '08:00',
      closing_time: '17:00',
      operating_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      business_name: 'Water Avenue',
      business_email: 'support@wateravenue.com',
      business_phone: '+63 917 123 4567',
      business_address: '123 Main Street, City',
      business_website: 'https://wateravenue.example.com'
    };
    writeJSON(STORAGE_KEYS.systemConfig, config);
  }

  function ensureMaintenanceNotice() {
    const existing = readJSON(STORAGE_KEYS.maintenance);
    if (existing && typeof existing === 'object') {
      return;
    }
    const notice = {
      active: false,
      title: '',
      message: '',
      start: null,
      end: null
    };
    writeJSON(STORAGE_KEYS.maintenance, notice);
  }

  function ensureStockLevels() {
    const existing = readJSON(STORAGE_KEYS.stock);
    if (existing && typeof existing === 'object') {
      return;
    }
    const stock = {
      availableGallons: 150,
      containers: {
        slim: 80,
        round: 50,
        wilkins: 20
      },
      logs: []
    };
    writeJSON(STORAGE_KEYS.stock, stock);
  }

  function ensureLoanSamples() {
    const orders = readJSON(STORAGE_KEYS.orders) || [];
    if (orders.length === 0) {
      return;
    }
    const hasLoan = orders.some(o => o.paymentMethod === 'loan');
    if (hasLoan) {
      return;
    }
  }

  function normaliseName(name) {
    return (name || '').toLowerCase().trim();
  }

  function extractOrderCandidateName(order) {
    const directName = order?.customerName || order?.customer;
    const composite = `${order?.firstName || ''} ${order?.lastName || ''}`.trim();
    if (directName) return directName;
    if (composite) return composite;
    return '';
  }

  function isLegacySeedOrder(order) {
    const name = normaliseName(extractOrderCandidateName(order));
    if (name && LEGACY_PLACEHOLDER_NAMES.some(candidate => name === candidate || name.includes(candidate))) {
      return true;
    }
    const username = normaliseName(order?.username || order?.accountUsername || '');
    if (username && LEGACY_PLACEHOLDER_USERNAMES.includes(username)) {
      return true;
    }
    const id = Number(order?.orderId ?? order?.id ?? 0);
    if ([1, 2, 3].includes(id) && (name.includes('john') || name.includes('jane'))) {
      return true;
    }
    return false;
  }

  function cleanupLegacySeedOrders() {
    try {
      if (localStorage.getItem(CLEANUP_FLAGS.legacyOrders)) {
        return;
      }
    } catch {
      return;
    }

    const existingOrders = readJSON(STORAGE_KEYS.orders);
    if (!Array.isArray(existingOrders)) {
      localStorage.setItem(CLEANUP_FLAGS.legacyOrders, 'true');
      return;
    }

    const removedIds = [];
    const normalizedOrders = existingOrders.map(order => {
      const clone = { ...order };
      const status = normaliseName(clone.status || clone.orderStatus);
      if (status.includes('cancel')) {
        clone.paymentStatus = 'cancelled';
        clone.paymentStatusId = 4;
      } else if (status.includes('complete')) {
        clone.paymentStatus = 'paid';
        clone.paymentStatusId = 2;
      } else {
        clone.paymentStatus = 'pending';
        clone.paymentStatusId = 1;
      }
      return clone;
    });

    const filteredOrders = normalizedOrders.filter(order => {
      if (isLegacySeedOrder(order)) {
        const id = Number(order?.orderId ?? order?.id);
        if (!Number.isNaN(id)) {
          removedIds.push(id);
        }
        return false;
      }
      return true;
    });

    writeJSON(STORAGE_KEYS.orders, filteredOrders);

    if (removedIds.length > 0) {
      const adminOrders = readJSON(STORAGE_KEYS.adminOrders);
      if (Array.isArray(adminOrders)) {
        const filteredAdmin = adminOrders
          .map(order => {
            const clone = { ...order };
            if (removedIds.includes(Number(order?.OrderID))) {
              return clone;
            }
            const status = normaliseName(clone.OrderStatus);
            if (status.includes('cancel')) {
              clone.PaymentStatus = 'Cancelled';
            } else if (status.includes('complete')) {
              clone.PaymentStatus = 'Paid';
            } else {
              clone.PaymentStatus = 'Pending';
            }
            return clone;
          })
          .filter(order => !removedIds.includes(Number(order?.OrderID)));
        if (filteredAdmin.length !== adminOrders.length) {
          writeJSON(STORAGE_KEYS.adminOrders, filteredAdmin);
        }
      }

      const feedback = readJSON(STORAGE_KEYS.feedback);
      if (Array.isArray(feedback)) {
        const filteredFeedback = feedback.filter(entry => !removedIds.includes(Number(entry?.orderId ?? entry?.OrderID ?? entry?.OrderID_Check)));
        if (filteredFeedback.length !== feedback.length) {
          writeJSON(STORAGE_KEYS.feedback, filteredFeedback);
        }
      }
    } else {
      const adminOrders = readJSON(STORAGE_KEYS.adminOrders);
      if (Array.isArray(adminOrders)) {
        const normalizedAdmin = adminOrders.map(order => {
          const clone = { ...order };
          const status = normaliseName(clone.OrderStatus);
          if (status.includes('cancel')) {
            clone.PaymentStatus = 'Cancelled';
          } else if (status.includes('complete')) {
            clone.PaymentStatus = 'Paid';
          } else {
            clone.PaymentStatus = 'Pending';
          }
          return clone;
        });
        writeJSON(STORAGE_KEYS.adminOrders, normalizedAdmin);
      }
    }

    localStorage.setItem(CLEANUP_FLAGS.legacyOrders, 'true');
  }

  function ensureAll() {
    try {
      cleanupLegacySeedOrders();
      ensureAccounts();
      ensurePrices();
      ensureOrders();
      ensureCustomers();
      ensureSystemConfig();
      ensureMaintenanceNotice();
      ensureStockLevels();
      ensureLoanSamples();
    } catch (error) {
      console.error('Failed to seed local mock data:', error);
    }
  }

  ensureAll();
  window.__ensureMockSeed = ensureAll;
})();

