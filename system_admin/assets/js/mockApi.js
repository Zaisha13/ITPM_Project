(function () {
  const USE_LOCAL_API_ONLY = true;
  if (!USE_LOCAL_API_ONLY || typeof window === 'undefined') {
    return;
  }

  if (typeof window.__ensureMockSeed === 'function') {
    try {
      window.__ensureMockSeed();
    } catch (error) {
      console.error('Failed to initialise local mock seed:', error);
    }
  }

  const originalFetch = window.fetch ? window.fetch.bind(window) : null;
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
  const CONTAINER_STOCK_STORAGE_KEY = 'container_stocks';
  const ADMIN_SESSION_KEY = 'admin_session';

  const STATUS_ID_TO_NAME = {
    1: 'For Approval',
    2: 'Confirmed',
    3: 'Pending',
    4: 'In Progress',
    5: 'Out for Delivery',
    6: 'Ready for Pickup',
    7: 'Completed',
    8: 'Cancelled'
  };

  const STATUS_STRING_TO_ID = {
    'for approval': 1,
    'for-approval': 1,
    pending: 1,
    confirmed: 2,
    processing: 4,
    'in progress': 4,
    'in-progress': 4,
    'out for delivery': 5,
    'out-for-delivery': 5,
    'ready for pickup': 6,
    'ready-for-pickup': 6,
    completed: 7,
    delivered: 7,
    cancelled: 8
  };

  const PAYMENT_STATUS_ID_TO_NAME = {
    1: 'Pending',
    2: 'Paid',
    3: 'Overdue',
    4: 'Cancelled'
  };

  const PAYMENT_METHOD_ID_TO_NAME = {
    1: 'Cash',
    2: 'GCash',
    3: 'Loan'
  };

  const PAYMENT_METHOD_NAME_TO_ID = {
    cash: 1,
    gcash: 2,
    loan: 3
  };

  const RECEIVING_METHOD_ID_TO_NAME = {
    1: 'Pickup',
    2: 'Delivery'
  };

  const ORDER_TYPE_ID_TO_NAME = {
    1: 'Walk-in',
    2: 'Online'
  };

  const RATING_LABELS = {
    5: 'Excellent',
    4: 'Very Good',
    3: 'Good',
    2: 'Fair',
    1: 'Poor'
  };

  const MOCK_WAIT_MS = 120;

  function delay(ms = MOCK_WAIT_MS) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  function readJSON(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normaliseStockValue(value) {
    const num = Number(value);
    return Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
  }

  function readContainerStocks() {
    try {
      const raw = localStorage.getItem(CONTAINER_STOCK_STORAGE_KEY);
      if (!raw) {
        return { '1': 0, '2': 0, '3': 0 };
      }
      const parsed = JSON.parse(raw);
      return {
        '1': normaliseStockValue(parsed?.['1'] ?? parsed?.[1]),
        '2': normaliseStockValue(parsed?.['2'] ?? parsed?.[2]),
        '3': normaliseStockValue(parsed?.['3'] ?? parsed?.[3])
      };
    } catch {
      return { '1': 0, '2': 0, '3': 0 };
    }
  }

  function writeContainerStocks(stocks) {
    const payload = {
      '1': normaliseStockValue(stocks?.['1'] ?? stocks?.[1]),
      '2': normaliseStockValue(stocks?.['2'] ?? stocks?.[2]),
      '3': normaliseStockValue(stocks?.['3'] ?? stocks?.[3])
    };
    localStorage.setItem(CONTAINER_STOCK_STORAGE_KEY, JSON.stringify(payload));
  }

  function isBrandNewItem(item) {
    const categoryIdRaw = item?.orderCategoryId ?? item?.OrderCategoryID ?? item?.OrderCategoryId;
    if (categoryIdRaw !== undefined && Number(categoryIdRaw) === 2) {
      return true;
    }
    const orderTypeRaw = item?.orderType ?? item?.OrderType ?? item?.order_type;
    if (orderTypeRaw && orderTypeRaw.toString().toLowerCase().includes('brand')) {
      return true;
    }
    const categoryRaw =
      item?.orderCategory ??
      item?.OrderCategory ??
      item?.OrderCategoryName ??
      item?.orderCategoryName ??
      item?.order_category;
    if (!categoryRaw) {
      return false;
    }
    const category = categoryRaw.toString().toLowerCase();
    return category.includes('brand') || category.includes('new');
  }

  function resolveContainerKey(item) {
    const stringCandidates = [
      item?.containerType,
      item?.ContainerType,
      item?.containerTypeName,
      item?.ContainerTypeName,
      item?.container_type,
      item?.containerTypeKey,
      item?.containerName,
      item?.ContainerName
    ];
    for (const candidate of stringCandidates) {
      if (!candidate) continue;
      const value = candidate.toString().toLowerCase();
      if (value.includes('slim')) return '1';
      if (value.includes('round')) return '2';
    }

    const numericCandidates = [
      item?.containerTypeID,
      item?.containerTypeId,
      item?.ContainerTypeID,
      item?.container_type_id,
      item?.ContainerTypeId
    ];
    for (const candidate of numericCandidates) {
      const parsed = Number(candidate);
      if (!Number.isFinite(parsed)) continue;
      if (parsed === 1) return '1';
      if (parsed === 2) return '2';
    }

    return null;
  }

  function findOrderSubmission(order) {
    if (!order) return null;
    const submissions = getOrderSubmissions();
    const orderId = Number(order?.OrderID ?? order?.orderId ?? order?.id);
    if (!Number.isFinite(orderId)) return null;
    return submissions.find(sub => Number(sub?.orderId ?? sub?.id) === orderId) || null;
  }

  function selectBestItemsForCounts(order) {
    if (!order) {
      return [];
    }

    if (Array.isArray(order.OrderDetails) && order.OrderDetails.length > 0) {
      return order.OrderDetails;
    }

    if (Array.isArray(order.Items) && order.Items.length > 0) {
      return order.Items;
    }

    const submission = findOrderSubmission(order);
    if (submission && Array.isArray(submission.items) && submission.items.length > 0) {
      return submission.items;
    }

    return [];
  }

  function computeBrandNewCounts(order) {
    const counts = { '1': 0, '2': 0 };
    const items = selectBestItemsForCounts(order);

    if (!items.length) {
      return counts;
    }

    items.forEach(item => {
      if (!isBrandNewItem(item)) {
        return;
      }
      const key = resolveContainerKey(item);
      if (key !== '1' && key !== '2') {
        return;
      }
      const qty = Number(item?.quantity ?? item?.Quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        return;
      }
      counts[key] = (counts[key] || 0) + qty;
    });

    return counts;
  }

  function hasBrandNewCounts(counts) {
    return Object.values(counts || {}).some(qty => Number(qty) > 0);
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getAccounts() {
    return ensureArray(readJSON(STORAGE_KEYS.accounts));
  }

  function getOrderSubmissions() {
    return ensureArray(readJSON(STORAGE_KEYS.orders));
  }

  function setOrderSubmissions(orders) {
    writeJSON(STORAGE_KEYS.orders, orders);
  }

  function getAdminOrders() {
    return ensureArray(readJSON(STORAGE_KEYS.adminOrders));
  }

  function setAdminOrders(orders) {
    writeJSON(STORAGE_KEYS.adminOrders, orders);
  }

  function applyBrandNewStockEffects(orderId, statusId) {
    const numericStatus = Number(statusId);
    if (!Number.isFinite(numericStatus)) {
      return;
    }

    const adminOrders = getAdminOrders();
    const index = adminOrders.findIndex(order => Number(order?.OrderID) === Number(orderId));
    if (index === -1) {
      return;
    }

    const order = { ...adminOrders[index] };
    const counts = computeBrandNewCounts(order);
    const stocks = readContainerStocks();
    const previousCounts = order.__deductedCounts || {};

    if (numericStatus === 2) {
      if (!hasBrandNewCounts(counts)) {
        order.__deductedCounts = {};
        order.__stockDeducted = false;
      } else {
        Object.keys(counts).forEach(key => {
          const target = Number(counts[key] || 0);
          const alreadyDeducted = Number(previousCounts[key] || 0);
          const diff = target - alreadyDeducted;
          if (!Number.isFinite(diff) || diff === 0) {
            return;
          }
          const currentStock = Number(stocks[key] || 0);
          if (diff > 0) {
            stocks[key] = Math.max(0, currentStock - diff);
          } else if (diff < 0) {
            stocks[key] = currentStock + Math.abs(diff);
          }
        });
        order.__deductedCounts = counts;
        order.__stockDeducted = true;
      }
    } else {
      Object.keys(previousCounts).forEach(key => {
        const qty = Number(previousCounts[key] || 0);
        if (!qty) {
          return;
        }
        const currentStock = Number(stocks[key] || 0);
        stocks[key] = currentStock + qty;
      });
      order.__deductedCounts = {};
      order.__stockDeducted = false;
    }

    writeContainerStocks(stocks);
    adminOrders[index] = order;
    setAdminOrders(adminOrders);

    if (typeof window !== 'undefined' && typeof window.loadStockValues === 'function') {
      try {
        window.loadStockValues();
      } catch (error) {
        console.warn('Failed to refresh stock overview after update:', error);
      }
    }
  }

  function getPriceConfig() {
    return ensureArray(readJSON(STORAGE_KEYS.priceConfig));
  }

  function getCustomersStorage() {
    return ensureArray(readJSON(STORAGE_KEYS.customers));
  }

  function getFeedbackStorage() {
    return ensureArray(readJSON(STORAGE_KEYS.feedback));
  }

  function normaliseStatus(status) {
    if (!status) return { id: 1, name: STATUS_ID_TO_NAME[1] };
    const key = status.toString().toLowerCase();
    const id = STATUS_STRING_TO_ID[key] || 2;
    return { id, name: STATUS_ID_TO_NAME[id] };
  }

  function paymentStatusFromMethod(method, explicitStatusId) {
    if (explicitStatusId && PAYMENT_STATUS_ID_TO_NAME[explicitStatusId]) {
      return {
        id: explicitStatusId,
        name: PAYMENT_STATUS_ID_TO_NAME[explicitStatusId]
      };
    }
    const key = (method || '').toLowerCase();
    if (key === 'loan') {
      return { id: 1, name: PAYMENT_STATUS_ID_TO_NAME[1] };
    }
    return { id: 1, name: PAYMENT_STATUS_ID_TO_NAME[1] };
  }

  function mapOrderItemsToDetails(items) {
    const prices = getPriceConfig();
    const priceLookup = {};
    prices.forEach(row => {
      const id = Number(row.ContainerTypeID);
      priceLookup[`${id}-1`] = Number(row.RefillPrice);
      priceLookup[`${id}-2`] = Number(row.NewContainerPrice);
    });
    const containerNameMap = {
      1: 'Slim',
      2: 'Round',
      3: 'Wilkins'
    };
    return items.map((item, idx) => {
      const containerId = Number(item.containerTypeID ?? item.containerTypeId ?? (() => {
        const name = (item.containerType || '').toString().toLowerCase();
        if (name === 'slim') return 1;
        if (name === 'round') return 2;
        if (name === 'wilkins') return 3;
        return 2;
      })());
      const categoryId = Number(item.orderCategoryId ?? item.OrderCategoryID ?? (item.orderCategory === 'Brand New' || item.orderType === 'brandNew' ? 2 : 1));
      const quantity = Number(item.quantity ?? item.Quantity ?? 0);
      const storedPrice = Number(priceLookup[`${containerId}-${categoryId}`]);
      const defaultUnitPrice = (categoryId === 2)
        ? 225
        : (containerId === 3 ? 10 : 25);
      const unitPrice = (Number.isFinite(storedPrice) && storedPrice > 0) ? storedPrice : defaultUnitPrice;
      return {
        OrderDetailID: item.OrderDetailID || idx + 1,
        Quantity: quantity,
        ContainerTypeName: containerNameMap[containerId] || 'Round',
        OrderCategoryName: categoryId === 2 ? 'New Gallon' : 'Refill',
        UnitPrice: unitPrice,
        Subtotal: unitPrice * quantity
      };
    });
  }

  function computeTotalsFromDetails(details) {
    return details.reduce((sum, detail) => sum + Number(detail.Subtotal || 0), 0);
  }

  function isManualOrder(order) {
    return Boolean(order?.origin === 'manual' || order?.isManualEntry === true);
  }

  function mapSubmissionToApi(order) {
    const status = normaliseStatus(order.status || order.orderStatus);
    const paymentMeta = paymentStatusFromMethod(order.paymentMethod, order.paymentStatusId);
    const details = mapOrderItemsToDetails(ensureArray(order.items).map(item => ({
      containerTypeID: Number(item.containerTypeID ?? (() => {
        const key = (item.containerType || '').toLowerCase();
        if (key === 'slim') return 1;
        if (key === 'round') return 2;
        if (key === 'wilkins') return 3;
        return 2;
      })()),
      orderCategoryId: Number(item.orderCategoryId ?? (item.orderType === 'brandNew' ? 2 : 1)),
      quantity: Number(item.quantity ?? 0)
    })));
    const totalFromDetails = computeTotalsFromDetails(details);
    const total = Number(order.total ?? order.grandTotal ?? totalFromDetails);
    const createdAt = order.createdAt || order.date || new Date().toISOString();
    const updatedAt = order.updatedAt || createdAt;
    const orderDate = order.orderDate || createdAt.slice(0, 10);
    const orderTypeId = isManualOrder(order) ? 1 : 2;
    const orderTypeName = ORDER_TYPE_ID_TO_NAME[orderTypeId];
    const paymentMethodName = PAYMENT_METHOD_ID_TO_NAME[PAYMENT_METHOD_NAME_TO_ID[(order.paymentMethod || '').toLowerCase()] || 1];
    const receivingName = (order.deliveryMethod === 'delivery') ? 'Delivery' : 'Pickup';

    return {
      OrderID: Number(order.orderId ?? order.id),
      CustomerName: order.customerName || `${order.firstName || ''} ${order.lastName || ''}`.trim() || 'Customer',
      CustomerUsername: order.username || order.accountUsername || '',
      CustomerTypeName: (order.customerType === 'dealer' || order.customerType === 'Dealer') ? 'Dealer' : 'Regular',
      TotalAmount: total,
      CreatedAt: createdAt,
      UpdatedAt: updatedAt,
      OrderDate: orderDate,
      OrderStatusID: status.id,
      OrderStatusName: status.name,
      PaymentStatusID: paymentMeta.id,
      PaymentStatusName: paymentMeta.name,
      OrderTypeID: orderTypeId,
      OrderTypeName: orderTypeName,
      ReceivingMethodName: receivingName,
      MOPName: paymentMethodName,
      DeliveryAddress: order.deliveryAddress || order.address || '',
      OrderDetails: details
    };
  }

  function buildOrders(includePending) {
    const submissions = getOrderSubmissions();
    const mapped = submissions.map(mapSubmissionToApi).filter(order => {
      if (includePending) {
        return order.OrderStatusID === 1;
      }
      return order.OrderStatusID !== 1;
    });
    mapped.sort((a, b) => Number(b.OrderID) - Number(a.OrderID));
    return mapped;
  }

  function updateInAdminOrders(orderId, updater) {
    const adminOrders = getAdminOrders();
    const index = adminOrders.findIndex(order => Number(order.OrderID) === Number(orderId));
    if (index !== -1) {
      adminOrders[index] = updater({ ...adminOrders[index] });
      setAdminOrders(adminOrders);
    }
  }

  function updateOrderSubmission(orderId, updates) {
    const submissions = getOrderSubmissions();
    const index = submissions.findIndex(order => Number(order.orderId ?? order.id) === Number(orderId));
    if (index === -1) {
      return null;
    }
    const current = { ...submissions[index] };
    let derivedPaymentStatusId = current.paymentStatusId;
    if (updates.OrderStatusID) {
      const name = STATUS_ID_TO_NAME[updates.OrderStatusID] || STATUS_ID_TO_NAME[2];
      current.status = name.toLowerCase();
      current.orderStatus = name;
      if (!updates.PaymentStatusID) {
        if (updates.OrderStatusID === 7) {
          derivedPaymentStatusId = 2;
        } else if (updates.OrderStatusID === 8) {
          derivedPaymentStatusId = 4;
        } else {
          derivedPaymentStatusId = 1;
        }
      }
    }
    if (updates.PaymentStatusID) {
      const paymentName = PAYMENT_STATUS_ID_TO_NAME[updates.PaymentStatusID] || PAYMENT_STATUS_ID_TO_NAME[2];
      current.paymentStatus = paymentName.toLowerCase();
      current.paymentStatusId = updates.PaymentStatusID;
    } else if (derivedPaymentStatusId) {
      current.paymentStatusId = derivedPaymentStatusId;
      current.paymentStatus = PAYMENT_STATUS_ID_TO_NAME[derivedPaymentStatusId]?.toLowerCase() || current.paymentStatus;
    }
    if (updates.ReceivingMethodID) {
      current.deliveryMethod = updates.ReceivingMethodID === 2 ? 'delivery' : 'pickup';
    }
    if (updates.MOPID) {
      current.paymentMethod = Object.entries(PAYMENT_METHOD_ID_TO_NAME).find(([id]) => Number(id) === Number(updates.MOPID))?.[1]?.toLowerCase() || current.paymentMethod;
    }
    current.updatedAt = new Date().toISOString();
    submissions[index] = current;
    setOrderSubmissions(submissions);
    updateInAdminOrders(orderId, (order) => {
      const clone = { ...order };
      if (updates.OrderStatusID) {
        clone.OrderStatus = STATUS_ID_TO_NAME[updates.OrderStatusID]?.toUpperCase() || 'CONFIRMED';
      }
      const paymentStatusToApply = updates.PaymentStatusID || derivedPaymentStatusId;
      if (paymentStatusToApply) {
        clone.PaymentStatus = PAYMENT_STATUS_ID_TO_NAME[paymentStatusToApply] || 'Paid';
      }
      if (updates.MOPID) {
        clone.MOPID = updates.MOPID;
      }
      if (updates.ReceivingMethodID) {
        clone.ReceivingMethodID = updates.ReceivingMethodID;
      }
      clone.UpdatedAt = current.updatedAt;
      return clone;
    });
    return current;
  }

  function generateNextOrderId() {
    const submissions = getOrderSubmissions();
    const adminOrders = getAdminOrders();
    const maxSubmission = submissions.reduce((max, order) => Math.max(max, Number(order.orderId ?? order.id ?? 0)), 0);
    const maxAdmin = adminOrders.reduce((max, order) => Math.max(max, Number(order.OrderID ?? 0)), 0);
    return Math.max(maxSubmission, maxAdmin) + 1;
  }

  function addManualOrder(payload) {
    const newId = generateNextOrderId();
    const now = new Date();
    const createdAt = now.toISOString();
    const orderInfo = payload.order || {};
    const customerInfo = payload.customer || {};
    const items = ensureArray(orderInfo.items || payload.items).map(item => ({
      containerType: (item.containerType || item.containerTypeId) === 1 || item.containerType === 'slim' ? 'slim'
        : (item.containerType === 'wilkins' || item.containerTypeId === 3 ? 'wilkins' : 'round'),
      orderType: (item.orderCategoryId === 2 || item.orderCategory === 'Brand New' || item.orderType === 'brandNew') ? 'brandNew' : 'refill',
      quantity: Number(item.quantity || 0),
      containerTypeID: Number(item.containerTypeId ?? item.containerTypeID ?? 2),
      orderCategoryId: Number(item.orderCategoryId ?? (item.orderCategory === 'Brand New' ? 2 : 1))
    }));
    const totalsDetails = mapOrderItemsToDetails(items);
    const total = computeTotalsFromDetails(totalsDetails);
    const paymentMethodKey = Object.entries(PAYMENT_METHOD_ID_TO_NAME).find(([id]) => Number(id) === Number(orderInfo.mopId))?.[1]?.toLowerCase() || 'cash';
    const paymentStatusMeta = paymentStatusFromMethod(paymentMethodKey);
    const submission = {
      id: newId,
      orderId: newId,
      origin: 'manual',
      isManualEntry: true,
      customerID: customerInfo.customerId || customerInfo.customerID || newId,
      customerName: `${customerInfo.firstName || 'Walk'} ${customerInfo.lastName || 'In'}`.trim(),
      firstName: customerInfo.firstName || 'Walk',
      lastName: customerInfo.lastName || 'In',
      username: customerInfo.username || '',
      accountUsername: customerInfo.username || '',
      deliveryAddress: orderInfo.deliveryAddress || '',
      deliveryMethod: orderInfo.receivingMethodId === 2 ? 'delivery' : 'pickup',
      paymentMethod: paymentMethodKey,
      status: 'confirmed',
      orderStatus: 'Confirmed',
      paymentStatus: paymentStatusMeta.name.toLowerCase(),
      paymentStatusId: paymentStatusMeta.id,
      total,
      grandTotal: total,
      items: items.map(item => ({
        containerType: item.containerType,
        orderType: item.orderType,
        quantity: item.quantity
      })),
      date: createdAt,
      createdAt,
      updatedAt: createdAt,
      orderDate: createdAt.slice(0, 10),
      customerType: customerInfo.customerTypeId === 2 ? 'Dealer' : 'Regular'
    };
    const submissions = getOrderSubmissions();
    submissions.push(submission);
    setOrderSubmissions(submissions);

    const adminOrders = getAdminOrders();
    adminOrders.push({
      OrderID: newId,
      CustomerID: submission.customerID,
      AccountID: submission.customerID,
      DeliveryAddress: submission.deliveryAddress,
      MOPID: Number(orderInfo.mopId) || 1,
      ReceivingMethodID: Number(orderInfo.receivingMethodId) || 1,
      OrderStatus: 'CONFIRMED',
      PaymentStatus: paymentStatusMeta.name,
      TotalAmount: total,
      Items: items.map(item => ({
        containerTypeID: Number(item.containerTypeID ?? item.containerTypeId ?? 2),
        orderCategory: item.orderType === 'brandNew' ? 'Brand New' : 'Refill',
        quantity: item.quantity
      })),
      Date: createdAt,
      CreatedAt: createdAt,
      UpdatedAt: createdAt,
      Feedback: []
    });
    setAdminOrders(adminOrders);

    return { submission, newId };
  }

  function readAdminSession() {
    try {
      const raw = localStorage.getItem(ADMIN_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function findAdminAccount(accounts) {
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return { account: null, authenticated: false };
    }
    const session = readAdminSession();
    if (session && session.accountID !== undefined) {
      const accountFromSession = accounts.find(acc =>
        Number(acc.accountID) === Number(session.accountID) && acc.role === 'Admin'
      );
      if (accountFromSession) {
        return { account: accountFromSession, authenticated: true };
      }
    }
    const fallbackAdmin = accounts.find(acc => acc.role === 'Admin') || null;
    return { account: fallbackAdmin, authenticated: false };
  }

  function buildCustomerRecords() {
    const customers = getCustomersStorage();
    if (customers.length > 0) {
      return customers;
    }
    const accounts = getAccounts().filter(acc => acc.role !== 'Admin');
    return accounts.map(acc => ({
      CustomerID: acc.customerID,
      AccountID: acc.accountID,
      FirstName: acc.firstName,
      LastName: acc.lastName,
      Phone: acc.phone,
      HouseAddress: acc.address,
      CreatedAt: acc.createdAt,
      CustomerTypeName: acc.customerType === 'Dealer' ? 'Dealer' : 'Regular'
    }));
  }

  function buildFeedbackRecords() {
    const adminOrders = getAdminOrders();
    const accounts = getAccounts();
    const accountByCustomerId = {};
    accounts.forEach(acc => {
      accountByCustomerId[acc.customerID] = acc;
    });
    const ordersById = {};
    const submissions = getOrderSubmissions();
    submissions.forEach(order => {
      ordersById[Number(order.orderId ?? order.id)] = order;
    });

    const feedbackEntries = [];
    adminOrders.forEach(order => {
      const feedbackArray = ensureArray(order.Feedback);
      const relatedSubmission = ordersById[Number(order.OrderID)];
      const account = accountByCustomerId[order.CustomerID];
      feedbackArray.forEach((fb, idx) => {
        const rating = Number(fb.rating || fb.scaleValue || 5);
        feedbackEntries.push({
          Feedback_ID: feedbackEntries.length + 1,
          OrderID: order.OrderID,
          RatingScaleID: rating,
          ScaleValue: rating,
          RatingDescription: RATING_LABELS[rating] || 'Good',
          Comments: fb.comments || '',
          Feedback_Date: fb.date || fb.createdAt || new Date().toISOString(),
          OrderID_Check: order.OrderID,
          FirstName: relatedSubmission?.firstName || account?.firstName || 'Customer',
          LastName: relatedSubmission?.lastName || account?.lastName || '',
          Phone: relatedSubmission?.phone || account?.phone || '',
          TotalAmount: order.TotalAmount,
          OrderDate: order.CreatedAt || order.Date,
          OrderStatusName: STATUS_ID_TO_NAME[STATUS_STRING_TO_ID[(relatedSubmission?.status || '').toLowerCase()] || 2] || 'Confirmed',
          OrderTypeName: ORDER_TYPE_ID_TO_NAME[isManualOrder(relatedSubmission) ? 1 : 2] || 'Online'
        });
      });
    });
    if (feedbackEntries.length === 0) {
      feedbackEntries.push({
        Feedback_ID: 1,
        OrderID: 2,
        RatingScaleID: 5,
        ScaleValue: 5,
        RatingDescription: RATING_LABELS[5],
        Comments: 'Excellent delivery service!',
        Feedback_Date: new Date().toISOString(),
        OrderID_Check: 2,
        FirstName: 'Jane',
        LastName: 'Smith',
        Phone: '09987654321',
        TotalAmount: 520,
        OrderDate: submissions.find(o => Number(o.orderId) === 2)?.createdAt || new Date().toISOString(),
        OrderStatusName: 'Completed',
        OrderTypeName: 'Online'
      });
    }
    return feedbackEntries;
  }

  function buildSessionPayload() {
    const accounts = getAccounts();
    const { account: adminAccount, authenticated } = findAdminAccount(accounts);
    if (!adminAccount || !authenticated) {
      return { authenticated: false };
    }
    return {
      authenticated: true,
      account: {
        AccountID: adminAccount.accountID || adminAccount.customerID || 0,
        Username: adminAccount.username || 'admin',
        Email: adminAccount.email || 'admin@example.com',
        Role: 'Admin'
      },
      customer: {
        CustomerID: adminAccount.customerID || adminAccount.accountID || 0,
        FirstName: adminAccount.firstName || 'Admin',
        LastName: adminAccount.lastName || 'User',
        Phone: adminAccount.phone || '',
        HouseAddress: adminAccount.address || '',
        CustomerTypeID: adminAccount.customerTypeID ?? 0
      }
    };
  }

  async function parseRequestBody(input, init) {
    if (init?.body) {
      if (typeof init.body === 'string') {
        try {
          return JSON.parse(init.body);
        } catch {
          return {};
        }
      }
      if (init.body instanceof Blob) {
        const text = await init.body.text();
        try {
          return JSON.parse(text);
        } catch {
          return {};
        }
      }
    }
    if (input && typeof input.clone === 'function') {
      try {
        const cloned = input.clone();
        const text = await cloned.text();
        return text ? JSON.parse(text) : {};
      } catch {
        return {};
      }
    }
    return {};
  }

  async function mockFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    const requestUrl = new URL(url, window.location.href);
    const path = requestUrl.pathname.replace(/\\/g, '/');
    const method = (init.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();

    try {
      if (path.endsWith('/admin_backend/api/read_orders.php')) {
        await delay();
        const orders = buildOrders(false);
        return jsonResponse({ success: true, count: orders.length, data: orders });
      }
      if (path.endsWith('/admin_backend/api/get_pending_orders.php')) {
        await delay();
        const orders = buildOrders(true);
        return jsonResponse({ success: true, count: orders.length, data: orders });
      }
      if (path.endsWith('/admin_backend/api/update_orders.php') && method === 'PUT') {
        const body = await parseRequestBody(input, init);
        if (!body || typeof body !== 'object' || !body.OrderID) {
          return jsonResponse({ success: false, error: 'Invalid payload' }, 400);
        }
        await delay();
        const updated = updateOrderSubmission(body.OrderID, body);
        if (updated && body.OrderStatusID) {
          applyBrandNewStockEffects(body.OrderID, body.OrderStatusID);
        }
        if (!updated) {
          return jsonResponse({ success: false, error: 'Order not found' }, 404);
        }
        return jsonResponse({ success: true, message: 'Order updated successfully (local mock)' });
      }
      if (path.endsWith('/admin_backend/api/add_orders.php') && method === 'POST') {
        const body = await parseRequestBody(input, init);
        if (!body || typeof body !== 'object') {
          return jsonResponse({ success: false, error: 'Invalid payload' }, 400);
        }
        const { newId } = addManualOrder(body);
        await delay();
        return jsonResponse({ success: true, orderId: newId, message: 'Order recorded locally' }, 201);
      }
      if (path.endsWith('/admin_backend/api/read_customers.php')) {
        await delay();
        const customers = buildCustomerRecords();
        return jsonResponse({ status: 'success', data: customers });
      }
      if (path.endsWith('/admin_backend/api/get_feedback.php')) {
        await delay();
        const feedback = buildFeedbackRecords();
        return jsonResponse({ success: true, data: feedback, count: feedback.length });
      }
      if (path.endsWith('/customer_backend/api/get_prices.php')) {
        await delay();
        const prices = getPriceConfig();
        return jsonResponse({ status: 'success', data: prices });
      }
      if (path.endsWith('/customer_backend/api/session_me.php')) {
        await delay();
        const sessionPayload = buildSessionPayload();
        return jsonResponse(sessionPayload);
      }
    } catch (error) {
      console.error('Mock API error handling', path, error);
      return jsonResponse({ success: false, error: error.message || String(error) }, 500);
    }

    if (path.includes('/admin_backend/api/') || path.includes('/customer_backend/api/')) {
      console.warn('Mock API fallback triggered for', path);
      return jsonResponse({ success: false, error: `Mock endpoint not implemented for ${path}` }, 404);
    }

    if (originalFetch) {
      return originalFetch(input, init);
    }
    return jsonResponse({ success: false, error: 'No fetch available' }, 501);
  }

  window.fetch = mockFetch;
})();

