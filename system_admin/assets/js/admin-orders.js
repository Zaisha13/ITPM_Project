// Orders Page functionality
(function() {
  const API_ORDERS = '../admin_backend/api/read_orders.php';
  
  let allOrdersData = [];
  let filteredOrdersData = [];
  let highlightedOrderId = null;
  let highlightClearTimeoutId = null;
  let currentHighlightedRow = null;
  
  // Expose allOrdersData globally so approve function can update it
  window.allOrdersData = allOrdersData;
  
  // Filter elements (will be queried when needed)
  let filterStatus, filterCategory, filterPayment, filterOrderType, filterDateFrom, filterDateTo;
  let ordersApplyBtn, ordersResetBtn, ordersTableBody;
  
  // Function to get filter elements
  function getFilterElements() {
    filterStatus = document.getElementById('ordersFilterStatus');
    filterCategory = document.getElementById('ordersFilterCategory');
    filterPayment = document.getElementById('ordersFilterPayment');
    filterOrderType = document.getElementById('ordersFilterOrderType');
    filterDateFrom = document.getElementById('ordersFilterDateFrom');
    filterDateTo = document.getElementById('ordersFilterDateTo');
    ordersApplyBtn = document.getElementById('ordersApplyBtn');
    ordersResetBtn = document.getElementById('ordersResetBtn');
    ordersTableBody = document.getElementById('approvedOrdersTableBody');
  }
  function derivePaymentStatus(orderStatus, fallbackStatus = '') {
    const normalizedStatus = (orderStatus || '').toLowerCase();
    if (normalizedStatus.includes('cancel')) return 'Cancelled';
    if (normalizedStatus.includes('complete')) return 'Paid';

    const normalizedFallback = (fallbackStatus || '').toLowerCase();
    if (!normalizedStatus) {
      if (normalizedFallback.includes('cancel')) return 'Cancelled';
      if (normalizedFallback.includes('complete')) return 'Paid';
    }

    return 'Pending';
  }

  function getPaymentStatusIdForOrderStatus(statusId) {
    const id = Number(statusId);
    if (id === 7) return 2; // Completed -> Paid
    if (id === 8) return 4; // Cancelled -> Cancelled
    return 1; // Default Pending
  }

  function toNumber(value) {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]/g, '');
      if (!cleaned) return 0;
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value == null) {
      return 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const CONTAINER_TYPE_NAME_MAP = {
    1: 'Slim',
    2: 'Round',
    3: 'Wilkins'
  };

  const ORDER_CATEGORY_NAME_MAP = {
    1: 'Refill',
    2: 'New Gallon'
  };

  let priceLookupCache = null;

  function getPriceConfigLookup() {
    if (priceLookupCache) {
      return priceLookupCache;
    }

    const lookup = {};
    try {
      const raw = localStorage.getItem('priceConfig');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(row => {
            const containerId = Number(row.ContainerTypeID ?? row.containerTypeID);
            if (!Number.isFinite(containerId)) {
              return;
            }
            const refill = toNumber(row.RefillPrice ?? row.refillPrice);
            const brandNew = toNumber(row.NewContainerPrice ?? row.newContainerPrice);
            if (refill > 0) {
              lookup[`${containerId}-1`] = refill;
            }
            if (brandNew > 0) {
              lookup[`${containerId}-2`] = brandNew;
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to read price config from storage:', error);
    }

    priceLookupCache = lookup;
    return lookup;
  }

  function resetPriceLookupCache() {
    priceLookupCache = null;
  }

  function resolveContainerTypeId(item) {
    const numericCandidates = [
      item?.containerTypeID,
      item?.containerTypeId,
      item?.ContainerTypeID,
      item?.ContainerTypeId
    ];
    for (const candidate of numericCandidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    const stringCandidates = [
      item?.containerType,
      item?.ContainerType,
      item?.containerTypeName,
      item?.ContainerTypeName,
      item?.container,
      item?.Container
    ];
    for (const candidate of stringCandidates) {
      if (!candidate) continue;
      const value = candidate.toString().toLowerCase();
      if (value.includes('slim')) return 1;
      if (value.includes('round')) return 2;
      if (value.includes('wilkins') || value.includes('small')) return 3;
    }

    return 2;
  }

  function resolveOrderCategoryId(item) {
    const numericCandidates = [
      item?.orderCategoryId,
      item?.orderCategoryID,
      item?.OrderCategoryID,
      item?.OrderCategoryId
    ];
    for (const candidate of numericCandidates) {
      const parsed = Number(candidate);
      if (parsed === 1 || parsed === 2) {
        return parsed;
      }
    }

    const stringCandidates = [
      item?.orderType,
      item?.order_category,
      item?.orderCategory,
      item?.OrderCategory,
      item?.OrderCategoryName
    ];
    for (const candidate of stringCandidates) {
      if (!candidate) continue;
      const value = candidate.toString().toLowerCase();
      if (value.includes('brand') || value.includes('new')) {
        return 2;
      }
      if (value.includes('refill')) {
        return 1;
      }
    }

    return 1;
  }

  function resolveUnitPrice(containerId, categoryId, lookup) {
    const key = `${containerId}-${categoryId}`;
    const stored = lookup[key];
    if (Number.isFinite(stored) && stored > 0) {
      return stored;
    }
    if (categoryId === 2) {
      // Brand new containers default pricing
      if (containerId === 3) {
        return 10;
      }
      return 225;
    }
    // Refill pricing defaults
    if (containerId === 3) {
      return 10;
    }
    return 25;
  }

  function normaliseDetailRecord(detail, index, lookup) {
    const quantity = toNumber(detail?.Quantity ?? detail?.quantity);
    const containerId = resolveContainerTypeId(detail);
    const categoryId = resolveOrderCategoryId(detail);
    const containerName =
      detail?.ContainerTypeName ||
      detail?.containerTypeName ||
      detail?.container_type_name ||
      CONTAINER_TYPE_NAME_MAP[containerId] ||
      '-';
    const categoryName =
      detail?.OrderCategoryName ||
      detail?.orderCategoryName ||
      detail?.order_category_name ||
      ORDER_CATEGORY_NAME_MAP[categoryId] ||
      '-';
    const unitPriceExplicit = toNumber(detail?.UnitPrice ?? detail?.unitPrice ?? detail?.price);
    const unitPrice = unitPriceExplicit > 0 ? unitPriceExplicit : resolveUnitPrice(containerId, categoryId, lookup);
    const subtotalExplicit = toNumber(detail?.Subtotal ?? detail?.subtotal);
    const subtotal = subtotalExplicit > 0 ? subtotalExplicit : unitPrice * quantity;

    return {
      OrderDetailID: detail?.OrderDetailID ?? detail?.orderDetailId ?? index + 1,
      ContainerTypeName: containerName,
      OrderCategoryName: categoryName,
      Quantity: quantity,
      UnitPrice: unitPrice,
      Subtotal: subtotal
    };
  }

  function buildOrderDetailsFromItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }
    const lookup = getPriceConfigLookup();
    return items.map((item, index) => normaliseDetailRecord(item, index, lookup));
  }

  function computeDetailsTotal(details) {
    if (!Array.isArray(details) || details.length === 0) {
      return 0;
    }
    return details.reduce((sum, detail) => {
      return sum + toNumber(detail.Subtotal);
    }, 0);
  }

  const STATUS_DISPLAY_MAP = {
    'confirmed': 'Confirmed',
    'processing': 'In Progress',
    'pending': 'In Progress',
    'in progress': 'In Progress',
    'preparing': 'In Progress',
    'ready for pickup': 'Ready for Pickup',
    'ready-for-pickup': 'Ready for Pickup',
    'out for delivery': 'Out for Delivery',
    'out-for-delivery': 'Out for Delivery',
    'completed': 'Completed',
    'delivered': 'Completed',
    'cancelled': 'Cancelled'
  };

  const ORDER_TYPE_LABEL_MAP = {
    'walk-in (offline)': 'Walk-in',
    'walk in': 'Walk-in',
    'walk-in': 'Walk-in',
    'walkin': 'Walk-in',
    'walk in (offline)': 'Walk-in',
    'manual entry': 'Walk-in',
    'manual': 'Walk-in',
    'online': 'Online',
    'customer portal': 'Online'
  };

  function normalizeStatus(status) {
    const key = (status || '').toLowerCase().trim();
    return STATUS_DISPLAY_MAP[key] || (status || '');
  }

  function isApprovedStatus(status) {
    return (status || '').toLowerCase() !== 'for approval';
  }

  function statusMatchesFilter(orderStatus, filterValue) {
    if (filterValue === 'All') return true;
    const normalized = normalizeStatus(orderStatus);
    return normalized.toLowerCase() === filterValue.toLowerCase();
  }

  function normalizeOrderTypeLabel(type) {
    const key = (type || '').toLowerCase().trim();
    return ORDER_TYPE_LABEL_MAP[key] || (type ? type : '');
  }

  function deriveOrderChannel(order) {
    const typeIdRaw =
      order?.OrderTypeID ??
      order?.orderTypeID ??
      order?.OrderTypeId ??
      order?.order_type_id ??
      order?.orderTypeId;
    const typeId = Number(typeIdRaw);
    if (typeId === 1) return 'Walk-in';
    if (typeId === 2) return 'Online';

    const originCandidates = [
      order?.orderChannel,
      order?.OrderTypeName,
      order?.OrderChannel,
      order?.origin,
      order?.source,
      order?.orderSource,
      order?.approvedFrom,
      order?.entryPoint
    ];

    for (const candidate of originCandidates) {
      if (!candidate) continue;
      const value = candidate.toString().toLowerCase();
      if (value.includes('manual') || value.includes('walk')) return 'Walk-in';
      if (value.includes('portal') || value.includes('online') || value.includes('customer')) return 'Online';
    }

    if (order?.isManualEntry || order?.origin === 'manual') return 'Walk-in';
    if (order?.fromCustomerPortal) return 'Online';

    const fallbackLabel = normalizeOrderTypeLabel(order?.orderChannel || order?.OrderTypeName || order?.OrderChannel || '');
    if (fallbackLabel === 'Manual Entry') {
      return 'Walk-in';
    }
    return fallbackLabel || 'Online';
  }

  function getOrderTypeLabel(order) {
    if (order && typeof order.orderTypeID === 'number' && ORDER_TYPES[order.orderTypeID]) {
      return ORDER_TYPES[order.orderTypeID];
    }
    if (order && order.orderChannel) {
      return normalizeOrderTypeLabel(order.orderChannel);
    }
    if (order && order.orderType) {
      return normalizeOrderTypeLabel(order.orderType);
    }
    return 'Online';
  }
  
  // Check if an order is a placeholder order (for orders table view)
  function isPlaceholderOrderForTable(order) {
    if (!order) return false;
    
    const customerName = (order.customerName || '').toLowerCase().trim();
    const placeholderPatterns = [
      'customer', // Default placeholder name
      'test',
      'placeholder',
      'sample',
      'demo',
      'example'
    ];
    
    // Check if customer name matches any placeholder pattern
    for (const pattern of placeholderPatterns) {
      if (customerName === pattern || customerName.includes(pattern)) {
        return true;
      }
    }
    
    // Check for empty or very generic customer names
    if (!customerName || customerName === 'n/a' || customerName === 'na') {
      return true;
    }
    
    return false;
  }
  
  // Load orders from localStorage (for testing) or API
  async function loadOrders() {
    try {
      // First try localStorage for testing
      const storedOrders = localStorage.getItem('orderSubmissions');
      if (storedOrders) {
        const orders = JSON.parse(storedOrders);
        if (Array.isArray(orders) && orders.length > 0) {
          resetPriceLookupCache();
          allOrdersData = orders.map((o, index) => {
            // Map order status
            const statusMap = {
              'pending': 'For Approval',
              'for-approval': 'For Approval',
              'confirmed': 'Confirmed',
              'processing': 'In Progress',
              'preparing': 'In Progress',
              'ready-for-pickup': 'Ready for Pickup',
              'ready for pickup': 'Ready for Pickup',
              'out-for-delivery': 'Out for Delivery',
              'out for delivery': 'Out for Delivery',
              'completed': 'Completed',
              'delivered': 'Completed',
              'cancelled': 'Cancelled'
            };
            const orderStatusRaw = statusMap[o.status?.toLowerCase()] || o.orderStatus || 'For Approval';
            const orderStatus = normalizeStatus(orderStatusRaw);
            
            // Map payment method
            const mopMap = {
              'cash': 'Cash',
              'gcash': 'GCash',
              'loan': 'Loan'
            };
            const mop = mopMap[o.paymentMethod?.toLowerCase()] || 'Cash';
            
            // Determine payment status
            const paymentStatus = derivePaymentStatus(orderStatus, o.paymentStatus);
            
            // Map order type
            const hasRefill = o.items?.some(item => item.orderType === 'refill');
            const hasBrandNew = o.items?.some(item => item.orderType === 'brandNew');
            const orderType = (hasRefill && hasBrandNew) ? 'Mixed Order' : (hasRefill ? 'Refill' : 'Brand New');
            const orderChannelDerived = deriveOrderChannel({
              OrderTypeID: o.orderTypeID,
              orderChannel: o.orderChannel,
              origin: o.origin,
              source: o.source,
              orderType: o.orderType,
              OrderTypeName: o.orderTypeName,
              isManualEntry: o.isManualEntry,
              fromCustomerPortal: o.fromCustomerPortal
            });
            const orderTypeId = orderChannelDerived === 'Walk-in' ? 1 : (orderChannelDerived === 'Online' ? 2 : 2);
            
            // Map receiving method
            const receivingMethod = o.deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup';

            const orderStatusID = Number(Object.keys(ORDER_STATUSES).find(id => ORDER_STATUSES[id].toLowerCase() === orderStatus.toLowerCase())) || null;
            const rawItems = Array.isArray(o.items) && o.items.length
              ? o.items
              : (Array.isArray(o.OrderDetails) ? o.OrderDetails : (Array.isArray(o.details) ? o.details : []));
            const details = buildOrderDetailsFromItems(rawItems);
            const totalAmount = details.length > 0 ? computeDetailsTotal(details) : toNumber(o.total || o.grandTotal);
            
            return {
              id: o.id || o.orderId || (index + 1),
              customerName: o.customerName || `${o.firstName || ''} ${o.lastName || ''}`.trim() || 'Customer',
              orderType,
              orderChannel: orderChannelDerived,
              orderTypeID: typeof o.orderTypeID === 'number' ? o.orderTypeID : orderTypeId,
              receivingMethod,
              modeOfPayment: mop,
              orderStatus,
              orderStatusID,
              paymentStatus,
              total: totalAmount,
              createdAt: o.createdAt || o.date || new Date().toISOString(),
              updatedAt: o.updatedAt || o.date || new Date().toISOString(),
              details
            };
          });
          
          // Filter out placeholder orders
          allOrdersData = allOrdersData
            .filter(o => !isPlaceholderOrderForTable(o))
            .filter(o => isApprovedStatus(o.orderStatus));
          
          // Update global reference
          window.allOrdersData = allOrdersData;
          filteredOrdersData = [...allOrdersData];
          renderOrdersTable();
          return;
        }
      }
      
      // Fallback to API if no localStorage data
      const response = await fetch(API_ORDERS, { credentials: 'include' });
      const data = await response.json();
      
      if (data && data.success && data.data) {
        allOrdersData = data.data.map(order => {
          const normalizedStatus = normalizeStatus(order.OrderStatusName || '');
          const paymentStatus = derivePaymentStatus(normalizedStatus, order.PaymentStatusName || '');
          const orderChannelDerived = deriveOrderChannel(order);
          const orderTypeId = orderChannelDerived === 'Walk-in' ? 1 : (orderChannelDerived === 'Online' ? 2 : (order.OrderTypeID || null));
          return {
            id: order.OrderID,
            customerName: order.CustomerName || '',
            orderType: normalizeOrderTypeLabel(order.OrderTypeName || ''), // For display
            orderChannel: orderChannelDerived,
            orderTypeID: orderTypeId,
            receivingMethod: order.ReceivingMethodName || '',
            modeOfPayment: order.MOPName || '',
            orderStatus: normalizedStatus,
            orderStatusID: order.OrderStatusID || null,
            paymentStatus,
            total: toNumber(order.TotalAmount),
            createdAt: order.CreatedAt || '',
            updatedAt: order.UpdatedAt || '',
            details: Array.isArray(order.OrderDetails) ? order.OrderDetails : []
          };
        });
        
        // Filter out placeholder orders
        allOrdersData = allOrdersData
          .filter(o => !isPlaceholderOrderForTable(o))
          .filter(o => isApprovedStatus(o.orderStatus));
        
        // Update global reference
        window.allOrdersData = allOrdersData;
        filteredOrdersData = [...allOrdersData];
        renderOrdersTable();
      } else {
        allOrdersData = [];
        window.allOrdersData = allOrdersData;
        filteredOrdersData = [];
        renderOrdersTable();
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      allOrdersData = [];
      window.allOrdersData = allOrdersData;
      filteredOrdersData = [];
      renderOrdersTable();
    }
  }
  
  // Check if order matches category filter
  function matchesCategory(order, category) {
    if (category === 'All') return true;
    
    const hasRefill = order.details.some(d => 
      (d.OrderCategoryName || '').toLowerCase().includes('refill')
    );
    const hasNew = order.details.some(d => 
      (d.OrderCategoryName || '').toLowerCase().includes('new')
    );
    
    if (category === 'Mixed Order') {
      return hasRefill && hasNew;
    } else if (category === 'Refill') {
      return hasRefill && !hasNew;
    } else if (category === 'Brand New' || category === 'Brand-new') {
      return hasNew && !hasRefill;
    }
    
    return true;
  }
  
  // Apply filters
  function applyFilters() {
    // Ensure filter elements are available
    if (!filterStatus || !filterCategory || !filterPayment) {
      getFilterElements();
    }
    
    const status = filterStatus?.value || 'All';
    const category = filterCategory?.value || 'All';
    const payment = filterPayment?.value || 'All';
    const orderTypeFilter = filterOrderType?.value || 'All';
    const dateFrom = filterDateFrom?.value || '';
    const dateTo = filterDateTo?.value || '';
    
    // Filter out any orders lacking customer data to keep the table clean
    const candidateOrders = allOrdersData.filter(order => {
      const name = (order.customerName || '').trim();
      return name && name.toLowerCase() !== 'customer' && name.toLowerCase() !== 'sample';
    });

    filteredOrdersData = candidateOrders.filter(order => {
      // Status filter
      if (!statusMatchesFilter(order.orderStatus, status)) {
        return false;
      }
      
      // Order type filter
      if (orderTypeFilter !== 'All') {
        const orderTypeLabel = getOrderTypeLabel(order);
        if (orderTypeLabel.toLowerCase() !== orderTypeFilter.toLowerCase()) {
          return false;
        }
      }
      
      // Category filter
      if (!matchesCategory(order, category)) {
        return false;
      }
      
      // Payment filter
      if (payment !== 'All') {
        const orderPayment = (order.modeOfPayment || '').toLowerCase();
        const paymentLower = payment.toLowerCase();
        if (orderPayment !== paymentLower && !orderPayment.includes(paymentLower)) {
          return false;
        }
      }
      
      // Date filter
      if (dateFrom || dateTo) {
        const orderDate = order.createdAt ? order.createdAt.substring(0, 10) : '';
        if (dateFrom && orderDate < dateFrom) return false;
        if (dateTo && orderDate > dateTo) return false;
      }
      
      return true;
    });
    
    renderOrdersTable();
  }
  
  // Reset filters
  function resetFilters() {
    // Ensure filter elements are available
    if (!filterStatus || !filterCategory || !filterPayment) {
      getFilterElements();
    }
    
    if (filterStatus) filterStatus.value = 'All';
    if (filterCategory) filterCategory.value = 'All';
    if (filterPayment) filterPayment.value = 'All';
    if (filterOrderType) filterOrderType.value = 'All';
    if (filterDateFrom) filterDateFrom.value = '';
    if (filterDateTo) filterDateTo.value = '';
    
    filteredOrdersData = [...allOrdersData];
    renderOrdersTable();
  }
  
  // Format money
  function formatMoney(value) {
    const amount = toNumber(value);
    try {
      return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch {
      return `₱${amount}`;
    }
  }
  
  // Get status badge class
  function getStatusClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'delivered' || s === 'paid') return 'status-completed';
    if (s === 'cancelled') return 'status-cancelled';
    return 'status-pending';
  }
  
  // Order status mapping (ID to Name)
  const ORDER_STATUSES = {
    1: 'For Approval',
    2: 'Confirmed',
    3: 'Pending',
    4: 'In Progress',
    5: 'Out for Delivery',
    6: 'Ready for Pickup',
    7: 'Completed',
    8: 'Cancelled'
  };

const ORDER_STATUS_COLOR_MAP = {
  1: 'default',
  2: 'blue',
  3: 'default',
  4: 'yellow',
  5: 'purple',
  6: 'orange',
  7: 'green',
  8: 'red'
};

  const ORDER_STATUS_DROPDOWN_ORDER = [2, 4, 6, 5, 7, 8];
  
  // Order type mapping (ID to Name) - Walk-in vs Online
  const ORDER_TYPES = {
    1: 'Walk-in',
    2: 'Online'
  };
  
  // Update order status
  async function updateOrderStatus(orderId, newStatusID) {
    const paymentStatusId = getPaymentStatusIdForOrderStatus(newStatusID);
    try {
      const response = await fetch('../admin_backend/api/update_orders.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          OrderID: orderId,
          OrderStatusID: newStatusID,
          PaymentStatusID: paymentStatusId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the order in the data array
        const orderIndex = allOrdersData.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
          allOrdersData[orderIndex].orderStatusID = newStatusID;
          allOrdersData[orderIndex].orderStatus = normalizeStatus(ORDER_STATUSES[newStatusID] || '');
          allOrdersData[orderIndex].paymentStatus = derivePaymentStatus(allOrdersData[orderIndex].orderStatus);
        }
        
        // Update filtered data if it exists
        const filteredIndex = filteredOrdersData.findIndex(o => o.id === orderId);
        if (filteredIndex !== -1) {
          filteredOrdersData[filteredIndex].orderStatusID = newStatusID;
          filteredOrdersData[filteredIndex].orderStatus = normalizeStatus(ORDER_STATUSES[newStatusID] || '');
          filteredOrdersData[filteredIndex].paymentStatus = derivePaymentStatus(filteredOrdersData[filteredIndex].orderStatus);
        }
        
        // Re-render the table
        renderOrdersTable();
        
        // Show success message (optional)
        console.log('Order status updated successfully');
      } else {
        alert('Failed to update order status: ' + (data.message || data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status. Please try again.');
    }
  }
  
  // Update order type (Walk-in vs Online)
  async function updateOrderType(orderId, newOrderTypeID) {
    try {
      const response = await fetch('../admin_backend/api/update_orders.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          OrderID: orderId,
          OrderTypeID: newOrderTypeID
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the order in the data array
        const orderIndex = allOrdersData.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
          allOrdersData[orderIndex].orderTypeID = newOrderTypeID;
          const updatedType = ORDER_TYPES[newOrderTypeID] || '';
          allOrdersData[orderIndex].orderType = updatedType;
          allOrdersData[orderIndex].orderChannel = updatedType;
        }
        
        // Update filtered data if it exists
        const filteredIndex = filteredOrdersData.findIndex(o => o.id === orderId);
        if (filteredIndex !== -1) {
          filteredOrdersData[filteredIndex].orderTypeID = newOrderTypeID;
          const updatedType = ORDER_TYPES[newOrderTypeID] || '';
          filteredOrdersData[filteredIndex].orderType = updatedType;
          filteredOrdersData[filteredIndex].orderChannel = updatedType;
        }
        
        // Re-render the table
        renderOrdersTable();
        
        console.log('Order type updated successfully');
      } else {
        alert('Failed to update order type: ' + (data.message || data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating order type:', error);
      alert('Error updating order type. Please try again.');
    }
  }
  
  // Render orders table
  function renderOrdersTable() {
    // Ensure we have the table body element
    if (!ordersTableBody) {
      ordersTableBody = document.getElementById('approvedOrdersTableBody');
    }
    if (!ordersTableBody) return;
    
    ordersTableBody.innerHTML = '';
    
    if (filteredOrdersData.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'orders-empty-row';
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 8;
      emptyCell.className = 'orders-empty-state';
      emptyCell.textContent = 'No orders found';
      emptyRow.appendChild(emptyCell);
      ordersTableBody.appendChild(emptyRow);
      return;
    }
    
    let highlightedRowElement = null;
    
    filteredOrdersData.forEach(order => {
      const row = document.createElement('tr');
      row.className = 'approved-orders-row';
      row.setAttribute('data-order-id', order.id);
      row.tabIndex = 0;

      const cells = [
        createTextCell(`#${order.id}`),
        createTextCell(order.customerName || '-'),
        createOrderTypeCell(order),
        createTextCell(order.receivingMethod || '-'),
        createTextCell(order.modeOfPayment || '-'),
        createTextCell(formatMoney(order.total)),
        createPaymentStatusCell(order),
        createStatusDropdownCell(order)
      ];

      cells.forEach(cell => row.appendChild(cell));

      if (highlightedOrderId && String(order.id) === String(highlightedOrderId)) {
        row.classList.add('orders-row-highlight');
        highlightedRowElement = row;
      }

      const handleRowActivation = () => viewOrderDetails(order.id);

      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'SELECT') {
          return;
        }
        handleRowActivation();
      });

      row.addEventListener('keydown', (e) => {
        if (e.target !== row) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowActivation();
        }
      });

      ordersTableBody.appendChild(row);
    });

    if (highlightedRowElement) {
      currentHighlightedRow = highlightedRowElement;
      requestAnimationFrame(() => {
        if (!document.body.contains(highlightedRowElement)) {
              return;
            }
        highlightedRowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try {
          highlightedRowElement.focus({ preventScroll: true });
        } catch {
          highlightedRowElement.focus();
        }
      });

      if (highlightClearTimeoutId) {
        clearTimeout(highlightClearTimeoutId);
      }
      highlightClearTimeoutId = setTimeout(() => {
        if (currentHighlightedRow && document.body.contains(currentHighlightedRow)) {
          currentHighlightedRow.classList.remove('orders-row-highlight');
        }
        currentHighlightedRow = null;
        highlightedOrderId = null;
        highlightClearTimeoutId = null;
      }, 4000);
    }
  }
  
  // Expose functions globally so they can be called from inline handlers
  window.updateOrderStatus = updateOrderStatus;
  window.updateOrderType = updateOrderType;

  function focusOrderRowInOrdersTable(orderId, options = {}) {
    if (!orderId && orderId !== 0) {
      return;
    }

    const orderIdString = String(orderId);
    const maxAttempts = Number.isFinite(options.retries) ? options.retries : 10;
    let attempts = 0;

    const attemptHighlight = () => {
      if (!Array.isArray(allOrdersData) || allOrdersData.length === 0) {
        attempts += 1;
        if (attempts <= maxAttempts) {
          setTimeout(attemptHighlight, 200);
        }
        return;
      }

      const orderExists = allOrdersData.some(o => String(o.id) === orderIdString);
      if (!orderExists) {
        console.warn(`Order with ID ${orderIdString} was not found for highlighting.`);
          return;
        }

      const alreadyVisible = filteredOrdersData.some(o => String(o.id) === orderIdString);
      if (!alreadyVisible) {
        resetFilters();
      }

      highlightedOrderId = orderIdString;
      renderOrdersTable();

      const shouldOpenDetails = options.openDetails !== false;
      if (shouldOpenDetails && typeof window.viewOrderDetails === 'function') {
        const delay = Number.isFinite(options.openDetailsDelay) ? options.openDetailsDelay : 300;
        setTimeout(() => {
          window.viewOrderDetails(orderId);
        }, delay);
      }
    };

    attemptHighlight();
  }

  window.focusOrderRowInOrdersTable = focusOrderRowInOrdersTable;
  
  // View order details modal
  window.viewOrderDetails = function(orderId) {
    const order = allOrdersData.find(o => String(o.id) === String(orderId));
    if (!order) {
      alert('Order not found');
      return;
    }
    
    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    
    if (!modal || !content) return;

    const renderOrderDetails =
      (typeof window.__buildOrderDetailsHTML === 'function' && window.__buildOrderDetailsHTML) ||
      (typeof window.buildOrderDetailsHTML === 'function' && window.buildOrderDetailsHTML) ||
      buildOrderDetailsFallback;

    modal.style.display = 'flex';
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    try {
      const detailsHtml = renderOrderDetails(order);
      content.innerHTML = detailsHtml;
    } catch (error) {
      console.error('Failed to render order details modal:', error);
      content.innerHTML = buildOrderDetailsFallback(order);
    }
  };
  
  // Close modal functionality
  function closeOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('is-visible');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = ''; // Restore scrolling
    }
  }
  
  // Expose close function globally
  window.closeOrderDetailsModal = closeOrderDetailsModal;
  
  // Wire up modal close button
  function wireOrderDetailsModal() {
    const closeBtn = document.getElementById('orderDetailsModalClose');
    const modal = document.getElementById('orderDetailsModal');
    
    if (closeBtn) {
      // Remove existing listeners to avoid duplicates
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener('click', closeOrderDetailsModal);
    }
    
    // Close modal when clicking outside
    if (modal) {
      // Remove existing listeners to avoid duplicates
      modal.removeEventListener('click', handleModalClick);
      modal.addEventListener('click', handleModalClick);
    }
    
    // Close modal on Escape key
    document.removeEventListener('keydown', handleEscapeKey);
    document.addEventListener('keydown', handleEscapeKey);
  }
  
  function handleModalClick(e) {
    const modal = document.getElementById('orderDetailsModal');
    if (e.target === modal) {
      closeOrderDetailsModal();
    }
  }
  
  function handleEscapeKey(e) {
    const modal = document.getElementById('orderDetailsModal');
    if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
      closeOrderDetailsModal();
    }
  }
  
  // Initialize modal on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireOrderDetailsModal);
  } else {
    wireOrderDetailsModal();
  }
  
  // Wire up event listeners
  function wireOrdersPage() {
    // Get filter elements first
    getFilterElements();
    
    if (ordersApplyBtn) {
      ordersApplyBtn.addEventListener('click', applyFilters);
    }
    
    if (ordersResetBtn) {
      ordersResetBtn.addEventListener('click', resetFilters);
    }
    
    // Auto-apply on filter change (optional)
    [filterStatus, filterCategory, filterPayment, filterOrderType, filterDateFrom, filterDateTo].forEach(el => {
      if (el) {
        // Remove existing listener to avoid duplicates
        el.removeEventListener('change', applyFilters);
        el.addEventListener('change', applyFilters);
      }
    });
    
    // Wire up modal
    wireOrderDetailsModal();

    // Delegate row-level interactions (click + keyboard) for dynamically rendered rows
    const tableBody = document.getElementById('approvedOrdersTableBody');
    if (tableBody && !tableBody.__ordersEventsBound) {
      tableBody.addEventListener('click', handleOrdersTableClick);
      tableBody.addEventListener('keydown', handleOrdersTableKeydown);
      tableBody.__ordersEventsBound = true;
    }
  }
  
  // Initialize when Orders view is shown
  function initOrdersPage() {
    wireOrdersPage();
    loadOrders();
  }
  
  function createTableCell(content) {
    const cell = document.createElement('td');
    cell.className = 'table-cell-align';
    if (typeof content === 'string') {
      cell.textContent = content;
    } else if (content instanceof Node) {
      cell.appendChild(content);
    }
    return cell;
  }

  function createTextCell(text) {
    return createTableCell(text);
  }

  function createPaymentStatusCell(order) {
    const statusSpan = document.createElement('span');
    statusSpan.className = `status-badge ${getStatusClass(order.paymentStatus)}`;
    statusSpan.textContent = (order.paymentStatus || '').toUpperCase();
    return createTableCell(statusSpan);
  }

  function createOrderTypeCell(order) {
    const label = getOrderTypeLabel(order) || '-';
    return createTableCell(label);
  }

  function createStatusDropdownCell(order) {
    const currentStatusID = order.orderStatusID || 3;
    const statusOptionIds = (() => {
      const baseOrder = ORDER_STATUS_DROPDOWN_ORDER.slice();
      if (currentStatusID && !baseOrder.includes(currentStatusID) && ORDER_STATUSES[currentStatusID]) {
        baseOrder.unshift(currentStatusID);
      }
      return baseOrder.filter(statusID => ORDER_STATUSES[statusID]);
    })();

    const wrapper = document.createElement('div');
    wrapper.className = 'order-status-dropdown-wrapper';
    wrapper.dataset.statusColor = ORDER_STATUS_COLOR_MAP[currentStatusID] || 'default';

    const select = document.createElement('select');
    select.className = 'order-status-dropdown';
    select.dataset.orderId = String(order.id);
    select.dataset.currentStatusId = String(currentStatusID);

    statusOptionIds.forEach(statusID => {
      const option = document.createElement('option');
      option.value = String(statusID);
      option.textContent = ORDER_STATUSES[statusID];
      if (statusID === currentStatusID) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('click', e => e.stopPropagation());
    select.addEventListener('change', e => {
      e.stopPropagation();
      const selectEl = e.target;
      const previousStatusID = parseInt(selectEl.dataset.currentStatusId || '', 10);
      const newStatusID = parseInt(selectEl.value, 10);
      if (!Number.isNaN(newStatusID)) {
        if (!Number.isNaN(previousStatusID) && newStatusID === previousStatusID) {
          return;
        }
        wrapper.dataset.statusColor = ORDER_STATUS_COLOR_MAP[newStatusID] || 'default';
        selectEl.dataset.currentStatusId = String(newStatusID);
        updateOrderStatus(order.id, newStatusID);
      }
    });

    wrapper.appendChild(select);
    return createTableCell(wrapper);
  }
  
  // Expose render function globally for switchView
  window.renderOrders = function() {
    // Wire up event listeners if not already done
    wireOrdersPage();
    // Force reload orders from API to get latest data including newly approved orders
    loadOrders();
  };
  
  // Expose loadOrders function so it can be called from approve function
  window.loadOrdersForTable = loadOrders;
  
  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on orders page initially
    const ordersView = document.getElementById('view-orders');
    if (ordersView && ordersView.style.display !== 'none') {
      initOrdersPage();
    }
  });

  function handleOrdersTableClick(event) {
    const target = event.target;
    if (!target) return;
    if (target.tagName === 'SELECT') return;

    const row = target.closest('tr.approved-orders-row');
    if (!row) return;

    const orderId = row.getAttribute('data-order-id');
    if (!orderId) return;

    viewOrderDetails(orderId);
  }

  function handleOrdersTableKeydown(event) {
    const target = event.target;
    if (!target || target.tagName === 'SELECT') return;

    if (target.classList.contains('approved-orders-row')) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const orderId = target.getAttribute('data-order-id');
        if (orderId) {
          viewOrderDetails(orderId);
        }
      }
    }
  }

  // Expose global entry point with wiring to keep other modules in sync
  window.loadOrdersTable = function() {
    wireOrdersPage();
    loadOrders();
  };
  window.loadOrdersForTable = window.loadOrdersTable;
  window.renderOrdersTable = renderOrdersTable;
  window.__ADMIN_ORDERS_MODULE__ = true;

  function buildOrderDetailsFallback(order) {
    if (!order) {
      return '<div class="order-empty-state"><p>Order details are unavailable.</p></div>';
    }

    const orderId = order.id ?? order.OrderID ?? '-';
    const customerName = order.customerName || order.CustomerName || `${order.firstName || ''} ${order.lastName || ''}`.trim() || 'Customer';
    const orderStatus = normalizeStatus(order.orderStatus || order.OrderStatusName || 'Pending');
    const paymentStatus = derivePaymentStatus(orderStatus, order.paymentStatus || order.PaymentStatusName || '');
    const orderType = getOrderTypeLabel(order);
    const receivingMethod = order.receivingMethod || order.ReceivingMethodName || '';
    const paymentMethod = order.modeOfPayment || order.MOPName || '';
    const totalAmount = formatMoney(order.total);
    const createdAt = formatDateTime(order.createdAt || order.CreatedAt || '');
    const updatedAt = formatDateTime(order.updatedAt || order.UpdatedAt || '');
    const address = order.deliveryAddress || order.address || order.DeliveryAddress || '';
    const contact = order.phone || order.contactNumber || order.CustomerPhone || '';

    const itemsSource = Array.isArray(order.details) ? order.details
      : (Array.isArray(order.OrderDetails) ? order.OrderDetails : []);
    const items = itemsSource.map(item => ({
      container: item.ContainerTypeName || item.container || item.Container || '-',
      category: item.OrderCategoryName || item.category || item.OrderCategory || '-',
      quantity: toNumber(item.Quantity || item.quantity),
      unitPrice: toNumber(item.UnitPrice || item.unitPrice || item.price),
      subtotal: toNumber(item.Subtotal || item.subtotal || (toNumber(item.Quantity || item.quantity) * toNumber(item.UnitPrice || item.unitPrice || item.price)))
    }));
    const itemsTotal = items.reduce((sum, item) => sum + (Number.isFinite(item.subtotal) ? item.subtotal : 0), 0);

    const summaryCards = [
      { label: 'Order Type', value: orderType },
      { label: 'Receiving Method', value: receivingMethod || '—' },
      { label: 'Payment Method', value: paymentMethod || '—' },
      { label: 'Total Amount', value: totalAmount, emphasis: true }
    ];

    const summaryCardsHtml = summaryCards.map(item => `
      <div class="order-summary-card ${item.emphasis ? 'is-emphasis' : ''}">
        <span class="order-summary-label">${item.label}</span>
        <span class="order-summary-value">${item.value}</span>
      </div>
    `).join('');

    const addressSection = (address || contact) ? `
      <div class="order-info-card">
        <div class="order-info-card-header">
          <h4>Delivery / Pickup Details</h4>
        </div>
        <div class="order-info-body">
          ${address ? `
            <div class="order-info-row">
              <span class="order-info-label">Address</span>
              <span class="order-info-value">${address}</span>
            </div>` : ''}
          ${contact ? `
            <div class="order-info-row">
              <span class="order-info-label">Contact</span>
              <span class="order-info-value">${contact}</span>
            </div>` : ''}
        </div>
      </div>
    ` : '';

    const itemsSection = items.length ? `
      <div class="order-info-card">
        <div class="order-info-card-header">
          <h4>Order Items</h4>
          <span class="order-info-chip">${items.length} item${items.length === 1 ? '' : 's'}</span>
        </div>
        <div class="order-items-table">
          <table>
            <thead>
              <tr>
                <th>Container</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.container}</td>
                  <td>${item.category}</td>
                  <td>${item.quantity}</td>
                  <td>${formatMoney(item.unitPrice)}</td>
                  <td>${formatMoney(item.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4">Items Total</td>
                <td>${formatMoney(itemsTotal || toNumber(order.total))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    ` : '';

    return `
      <div class="order-details-wrapper">
        <div class="order-details-header">
          <div class="order-header-main">
            <div class="order-meta-row">
              <span class="order-number">#${orderId}</span>
              ${orderType ? `<span class="order-tag">${orderType}</span>` : ''}
            </div>
            <h3>${customerName}</h3>
            <div class="order-meta-details">
              ${createdAt ? `<span>Created ${createdAt}</span>` : ''}
              ${(createdAt && updatedAt && createdAt !== updatedAt) ? '<span class="dot-separator"></span>' : ''}
              ${(updatedAt && createdAt !== updatedAt) ? `<span>Updated ${updatedAt}</span>` : ''}
            </div>
          </div>
          <div class="order-status-group">
            <div class="status-block">
              <span class="status-label">Order Status</span>
              <span class="status-chip status-${getStatusClass(orderStatus)}">${orderStatus}</span>
            </div>
            <div class="status-block">
              <span class="status-label">Payment Status</span>
              <span class="status-chip status-${getStatusClass(paymentStatus)}">${paymentStatus}</span>
            </div>
          </div>
        </div>
        ${summaryCardsHtml ? `<div class="order-summary-grid">${summaryCardsHtml}</div>` : ''}
        ${addressSection}
        ${itemsSection || `
          <div class="order-info-card">
            <div class="order-info-card-header">
              <h4>Order Items</h4>
            </div>
            <div class="order-empty-state">
              <p>No items recorded for this order.</p>
            </div>
          </div>
        `}
      </div>
    `;
  }

  function formatDateTime(value) {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return '';
    }
  }
})();


