(function () {
  const API_ORDERS = '../admin_backend/api/read_orders.php';

  // Dashboard refs
  const calendarEl = document.getElementById('calendar');
  const ordersTitleEl = document.getElementById('ordersForDate');
  const ordersCountEl = document.getElementById('ordersCount');
  const ordersListEl = document.getElementById('ordersList');
  const ordersRefreshBtn = document.getElementById('ordersRefreshBtn');

  // Reports refs
  const viewDashboard = document.getElementById('view-dashboard');
  const viewReports = document.getElementById('view-reports');
  const tabs = document.querySelectorAll('.tab');

  const repSearch = document.getElementById('repSearch');
  const repDate = document.getElementById('repDate');
  const repApply = document.getElementById('repApply');
  const repContainer = document.getElementById('repContainer');
  const repOrderType = document.getElementById('repOrderType');
  const repPayment = document.getElementById('repPayment');
  const repFrequency = document.getElementById('repFrequency');

  const mGallons = document.getElementById('mGallons');
  const mCustomers = document.getElementById('mCustomers');
  const mStatus = document.getElementById('mStatus');
  const mRevenue = document.getElementById('mRevenue');
  const salesRows = document.getElementById('salesRows');

  const loansContent = document.getElementById('loans-content');
  const salesMetrics = document.getElementById('sales-metrics');
  const salesTable = document.getElementById('sales-table');
  const cancelledMetrics = document.getElementById('cancelled-metrics');
  const cancelledTable = document.getElementById('cancelled-table');
  const cancelledRows = document.getElementById('cancelledRows');
  const loanRows = document.getElementById('loanRows');
  const goodRows = document.getElementById('goodRows');
  const mOutstanding = document.getElementById('mOutstanding');
  const mRepayRate = document.getElementById('mRepayRate');
  const loanSearch = document.getElementById('loanSearch');
  const loanDate = document.getElementById('loanDate');
  const loanApply = document.getElementById('loanApply');
  const loanContainer = document.getElementById('loanContainer');
  const loanOrderType = document.getElementById('loanOrderType');
  const loanPayment = document.getElementById('loanPayment');
  const loanFrequency = document.getElementById('loanFrequency');
  const salesFilters = document.getElementById('sales-filters');
  const loansFilters = document.getElementById('loans-filters');
  const cCancelledCount = document.getElementById('cCancelledCount');
  const cCancelledGallons = document.getElementById('cCancelledGallons');
  const cCancelledRevenue = document.getElementById('cCancelledRevenue');
  const cLatestCancelled = document.getElementById('cLatestCancelled');
  const loansRefreshBtn = document.getElementById('loansRefreshBtn');

  let allOrders = [];
  let currentYear; let currentMonth;
  let selectedDate = null;
  let isRefreshingOrders = false;
  let isRefreshingLoans = false;

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

  const PRICE_CONFIG_STORAGE_KEY = 'priceConfig';
  const DEFAULT_PRICE_LOOKUP = {
    '1-1': 25,
    '2-1': 25,
    '1-2': 225,
    '2-2': 225,
    '3-1': 10,
    '3-2': 10
  };

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

  function resetPriceLookupCache() {
    priceLookupCache = null;
  }

  function getPriceConfigLookup() {
    if (priceLookupCache) {
      return priceLookupCache;
    }

    const lookup = { ...DEFAULT_PRICE_LOOKUP };
    let hasInvalidPriceOverride = false;
    try {
      const raw = localStorage.getItem(PRICE_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(row => {
            const containerId = Number(row.ContainerTypeID ?? row.containerTypeID ?? row.containerTypeId ?? row.id);
            if (!Number.isFinite(containerId) || containerId <= 0) {
              return;
            }
            const defaultRefill = DEFAULT_PRICE_LOOKUP[`${containerId}-1`] ?? 0;
            const defaultBrandNew = DEFAULT_PRICE_LOOKUP[`${containerId}-2`] ?? 0;
            const refillPrice = Number(row.RefillPrice ?? row.refillPrice ?? row.refill);
            const brandNewPrice = Number(row.NewContainerPrice ?? row.newContainerPrice ?? row.brandNew);
            if (Number.isFinite(refillPrice) && Math.abs(refillPrice - defaultRefill) < 0.01) {
              lookup[`${containerId}-1`] = refillPrice;
            } else if (Number.isFinite(refillPrice)) {
              hasInvalidPriceOverride = true;
            }
            if (Number.isFinite(brandNewPrice) && Math.abs(brandNewPrice - defaultBrandNew) < 0.01) {
              lookup[`${containerId}-2`] = brandNewPrice;
            } else if (Number.isFinite(brandNewPrice)) {
              hasInvalidPriceOverride = true;
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load price configuration for dashboard, using defaults.', error);
    }
    if (hasInvalidPriceOverride) {
      try {
        localStorage.removeItem(PRICE_CONFIG_STORAGE_KEY);
      } catch (storageError) {
        console.warn('Failed to clear invalid price configuration override.', storageError);
      }
    }

    priceLookupCache = lookup;
    return lookup;
  }

  function resolveContainerTypeId(detail) {
    const numericCandidates = [
      detail?.ContainerTypeID,
      detail?.containerTypeID,
      detail?.ContainerTypeId,
      detail?.containerTypeId,
      detail?.container_id,
      detail?.containerId
    ];
    for (const candidate of numericCandidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    const stringCandidates = [
      detail?.ContainerTypeName,
      detail?.containerTypeName,
      detail?.ContainerType,
      detail?.containerType,
      detail?.container,
      detail?.Container
    ];
    for (const candidate of stringCandidates) {
      if (!candidate) continue;
      const value = candidate.toString().toLowerCase();
      if (value.includes('slim') || value === '1') return 1;
      if (value.includes('round') || value === '2') return 2;
      if (value.includes('wilkins') || value.includes('small') || value === '3') return 3;
    }

    return 2;
  }

  function resolveOrderCategoryId(detail) {
    const numericCandidates = [
      detail?.OrderCategoryID,
      detail?.orderCategoryID,
      detail?.OrderCategoryId,
      detail?.orderCategoryId,
      detail?.categoryId
    ];
    for (const candidate of numericCandidates) {
      const parsed = Number(candidate);
      if (parsed === 1 || parsed === 2) {
        return parsed;
      }
    }

    const stringCandidates = [
      detail?.OrderCategoryName,
      detail?.orderCategoryName,
      detail?.OrderCategory,
      detail?.orderCategory,
      detail?.category,
      detail?.Category,
      detail?.orderType,
      detail?.OrderType,
      detail?.type
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
      return containerId === 3 ? 10 : 225;
    }
    return containerId === 3 ? 10 : 25;
  }

  function normaliseDetailRecord(detail, index, lookup) {
    const quantity = Math.max(0, toNumber(detail?.Quantity ?? detail?.quantity ?? detail?.qty));
    const containerId = resolveContainerTypeId(detail);
    const categoryId = resolveOrderCategoryId(detail);

    const containerNameRaw =
      detail?.ContainerTypeName ??
      detail?.containerTypeName ??
      detail?.ContainerType ??
      detail?.containerType ??
      detail?.container ??
      detail?.Container ??
      CONTAINER_TYPE_NAME_MAP[containerId] ??
      '';
    let containerName = containerNameRaw ? containerNameRaw.toString() : '';
    if (/slim/i.test(containerName)) containerName = 'Slim';
    else if (/round/i.test(containerName)) containerName = 'Round';
    else if (/wilk|small/i.test(containerName)) containerName = 'Wilkins';
    else if (!containerName) containerName = CONTAINER_TYPE_NAME_MAP[containerId] || '-';

    const categoryNameRaw =
      detail?.OrderCategoryName ??
      detail?.orderCategoryName ??
      detail?.OrderCategory ??
      detail?.orderCategory ??
      detail?.category ??
      detail?.Category ??
      detail?.orderType ??
      detail?.OrderType ??
      ORDER_CATEGORY_NAME_MAP[categoryId] ??
      '';
    let categoryName = categoryNameRaw ? categoryNameRaw.toString() : '';
    if (/brand/i.test(categoryName) || /new/i.test(categoryName)) {
      categoryName = 'New Gallon';
    } else if (/refill/i.test(categoryName)) {
      categoryName = 'Refill';
    } else if (!categoryName) {
      categoryName = ORDER_CATEGORY_NAME_MAP[categoryId] || '-';
    }

    const resolvedUnitPrice = resolveUnitPrice(containerId, categoryId, lookup);
    const explicitUnitPrice = toNumber(detail?.UnitPrice ?? detail?.unitPrice ?? detail?.unit_price ?? detail?.price);
    const unitPrice = (explicitUnitPrice > 0 && Math.abs(explicitUnitPrice - resolvedUnitPrice) < 0.01)
      ? explicitUnitPrice
      : resolvedUnitPrice;

    const explicitSubtotal = toNumber(detail?.Subtotal ?? detail?.subtotal ?? detail?.Total ?? detail?.total ?? detail?.amount);
    const resolvedSubtotal = unitPrice * quantity;
    const subtotal = (explicitSubtotal > 0 && Math.abs(explicitSubtotal - resolvedSubtotal) < 0.01)
      ? explicitSubtotal
      : resolvedSubtotal;

    return {
      OrderDetailID: detail?.OrderDetailID ?? detail?.orderDetailID ?? detail?.orderDetailId ?? index + 1,
      ContainerTypeID: containerId,
      OrderCategoryID: categoryId,
      ContainerTypeName: containerName,
      OrderCategoryName: categoryName,
      Quantity: quantity,
      UnitPrice: unitPrice,
      Subtotal: subtotal,
      container: containerName,
      category: categoryName,
      qty: quantity,
      unitPrice,
      subtotal
    };
  }

  function buildOrderDetails(details) {
    if (!Array.isArray(details) || details.length === 0) {
      return [];
    }
    const lookup = getPriceConfigLookup();
    return details.map((detail, index) => normaliseDetailRecord(detail, index, lookup));
  }

  function computeDetailsTotal(details) {
    if (!Array.isArray(details) || details.length === 0) {
      return 0;
    }
    return details.reduce((sum, detail) => sum + toNumber(detail.Subtotal ?? detail.subtotal), 0);
  }

  function derivePaymentStatus(orderStatus, fallbackStatus = '') {
    const status = (orderStatus || fallbackStatus || '').toLowerCase();
    if (status.includes('cancel')) return 'Cancelled';
    if (status.includes('complete') || status.includes('deliver')) return 'Paid';
    return 'Pending';
  }

  function getPaymentStatusIdForOrderStatus(statusId) {
    if (statusId === 7) return 2; // Completed -> Paid
    if (statusId === 8) return 4; // Cancelled -> Cancelled
    return 1; // Default Pending
  }

  function isApprovedOrderStatus(orderStatus) {
    return (orderStatus || '').toLowerCase() !== 'for approval';
  }

  function fetchOrders() {
    resetPriceLookupCache();
    // Fetch all orders including pending ones for dashboard
    // This combines orders from both endpoints: pending orders (for dashboard) and approved orders (for orders table)
    return Promise.all([
      // Fetch pending orders (for dashboard)
      fetch('../admin_backend/api/get_pending_orders.php', { credentials: 'include' })
        .then(r => r.json())
        .then(data => data.success ? (data.data || []) : []),
      // Fetch approved orders (for orders table)
      fetch(API_ORDERS, { credentials: 'include' })
        .then(r => r.json())
        .then(data => data.success ? (data.data || []) : [])
        .catch(() => [])
    ]).then(([pendingOrders, approvedOrders]) => {
      // Combine both arrays and remove duplicates by OrderID
      const allOrdersMap = new Map();
      
      // Add pending orders
      pendingOrders.forEach(o => {
        allOrdersMap.set(o.OrderID, o);
      });
      
      // Add approved orders (will override pending if same ID, but pending should not be approved)
      approvedOrders.forEach(o => {
        allOrdersMap.set(o.OrderID, o);
      });
      
      // Convert to array and transform
      const combinedOrders = Array.from(allOrdersMap.values());
      
      allOrders = combinedOrders.map(o => {
        const orderStatus = o.OrderStatusName || '';
        const paymentStatus = derivePaymentStatus(orderStatus, o.PaymentStatusName || '');
        const rawDetails = Array.isArray(o.OrderDetails) ? o.OrderDetails : [];
        const normalizedDetails = buildOrderDetails(rawDetails);
        const computedTotal = computeDetailsTotal(normalizedDetails);
        const fallbackTotal = toNumber(o.TotalAmount);
        const totalAmount = computedTotal > 0 ? computedTotal : fallbackTotal;
        return {
          id: o.OrderID,
          customer: o.CustomerName,
          username: o.CustomerUsername || '',
          address: o.DeliveryAddress || '',
          total: totalAmount,
          updatedAt: o.UpdatedAt,
          createdAt: o.CreatedAt,
          orderDate: o.OrderDate || (o.CreatedAt ? getDateOnlyFromString(o.CreatedAt) : ''),
          orderStatus: orderStatus || '',
          orderType: o.OrderTypeName || '',
          paymentStatus,
          mop: o.MOPName || '',
          receivingMethod: o.ReceivingMethodName || '',
          details: normalizedDetails
        };
      });
    }).catch(() => {
      // Fallback to localStorage if API fails
      try {
        const storedOrders = localStorage.getItem('orderSubmissions');
        if (storedOrders) {
          const orders = JSON.parse(storedOrders);
          if (Array.isArray(orders) && orders.length > 0) {
            // Transform localStorage orders to match expected format
            allOrders = orders.map((o, index) => {
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
              const orderStatus = statusMap[o.status?.toLowerCase()] || 'For Approval';
              
              // Map payment method
              const mopMap = {
                'cash': 'Cash',
                'gcash': 'GCash',
                'loan': 'Loan'
              };
              const mop = mopMap[o.paymentMethod?.toLowerCase()] || 'Cash';
              
              // Determine payment status based on order status
              const paymentStatus = derivePaymentStatus(orderStatus, o.paymentStatus);
              
              const rawItems = Array.isArray(o.items) && o.items.length
                ? o.items
                : (Array.isArray(o.OrderDetails) && o.OrderDetails.length
                  ? o.OrderDetails
                  : (Array.isArray(o.details) ? o.details : []));
              
              // Map order type
              const hasRefill = rawItems.some(item => {
                const value = (item.orderType ?? item.OrderType ?? item.OrderCategoryName ?? item.category ?? '').toString().toLowerCase();
                return value.includes('refill');
              });
              const hasBrandNew = rawItems.some(item => {
                const value = (item.orderType ?? item.OrderType ?? item.OrderCategoryName ?? item.category ?? '').toString().toLowerCase();
                return value.includes('brand') || value.includes('new');
              });
              const orderType = (hasRefill && hasBrandNew) ? 'Mixed Order' : (hasBrandNew ? 'Brand-new' : 'Refill');
              
              // Map receiving method
              const receivingMethod = o.deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup';
              
              // Build details array
              const details = buildOrderDetails(rawItems);
              const computedTotal = computeDetailsTotal(details);
              const fallbackTotal = toNumber(o.total || o.grandTotal);
              const totalAmount = computedTotal > 0 ? computedTotal : fallbackTotal;
              
              return {
                id: o.id || o.orderId || (index + 1),
                customer: o.customerName || `${o.firstName || ''} ${o.lastName || ''}`.trim() || 'Customer',
                username: o.username || o.accountUsername || '',
                address: o.address || o.deliveryAddress || '',
                total: totalAmount,
                updatedAt: o.updatedAt || o.date || new Date().toISOString(),
                createdAt: o.createdAt || o.date || new Date().toISOString(),
                orderDate: o.orderDate || (o.createdAt || o.date ? getDateOnlyFromString(o.createdAt || o.date) : ''),
                orderStatus,
                orderType,
                paymentStatus,
                mop: mop,
                receivingMethod: receivingMethod,
                details: details
              };
            });
            return;
          }
        }
      } catch (e) {
        console.warn('Error reading from localStorage:', e);
      }
      // If both API and localStorage fail, set empty array
      allOrders = [];
    });
  }

  function formatMoney(value) {
    const amount = toNumber(value);
    try {
      return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch {
      return `₱${amount}`;
    }
  }

  function ymd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function diffDays(a, b) {
    const ms = Math.abs(new Date(a) - new Date(b));
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }
  function getDateOnlyFromString(dt) { return (dt || '').substring(0, 10); }

  // Dashboard - Show only orders that need approval (For Approval status)
  function renderOrdersFor(dateStr) {
    // Filter out placeholder orders first, then filter orders that need approval (For Approval status) and match the OrderDate
    const nonPlaceholderOrders = allOrders.filter(o => !isPlaceholderOrder(o));
    const items = nonPlaceholderOrders.filter(o => {
      // Use OrderDate if available, otherwise fall back to createdAt/updatedAt for backward compatibility
      let orderDate = o.orderDate;
      if (!orderDate) {
        // Fallback: extract date from createdAt or date field
        const dateValue = o.createdAt || o.date || o.updatedAt;
        if (dateValue) {
          orderDate = getDateOnlyFromString(dateValue);
        }
      }
      // Ensure orderDate is in YYYY-MM-DD format for comparison
      if (orderDate && orderDate.length > 10) {
        orderDate = orderDate.substring(0, 10);
      }
      
      const status = (o.orderStatus || '').toLowerCase();
      // Show orders with "For Approval" status or "Pending" status (online orders)
      const needsApproval = status === 'for approval' || status === 'pending';
      
      // Debug logging (remove in production)
      // console.log('Order:', o.id, 'orderDate:', orderDate, 'dateStr:', dateStr, 'status:', status, 'needsApproval:', needsApproval, 'match:', orderDate === dateStr && needsApproval);
      
      return orderDate === dateStr && needsApproval;
    });
    
    if (!ordersTitleEl) return;
    const dateObj = new Date(dateStr);
    const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    ordersTitleEl.textContent = `Orders Pending Approval - ${formattedDate}`;
    ordersCountEl.textContent = String(items.length);
    ordersListEl.innerHTML = '';
    
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'orders-empty-state';
      empty.textContent = 'No orders pending approval for this date.';
      ordersListEl.appendChild(empty); 
      return;
    }
    
    for (const o of items) {
      const orderCard = document.createElement('div');
      orderCard.className = 'order-card';
      orderCard.setAttribute('data-order-id', o.id);
      
      // Build order details HTML
      let detailsHTML = '';
      if (o.details && o.details.length > 0) {
        detailsHTML = '<div class="order-details-list">';
        o.details.forEach(detail => {
          const itemText = `${detail.qty}x ${detail.container || 'Container'} (${detail.category || 'Refill'})`;
          detailsHTML += `<div class="order-detail-item">${itemText}</div>`;
        });
        detailsHTML += '</div>';
      } else {
        detailsHTML = '<div class="order-details-list"><div class="order-detail-item">No details available</div></div>';
      }
      
      // Address display
      const addressHTML = o.address 
        ? `<div class="order-address">
             <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
               <circle cx="12" cy="10" r="3"/>
             </svg>
             <span>${o.address}</span>
           </div>`
        : '<div class="order-address"><span>No address provided</span></div>';
      
      // Map status for display - show "For Approval" for both "For Approval" and "Pending" statuses
      const displayStatus = (o.orderStatus || '').toLowerCase() === 'pending' 
        ? 'For Approval' 
        : (o.orderStatus || 'For Approval');
      
      orderCard.innerHTML = `
        <div class="order-card-header">
          <div class="order-card-info">
            <div class="order-card-id">Order #${o.id}</div>
            <div class="order-card-username">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              ${o.username || o.customer || 'N/A'}
            </div>
          </div>
          <div class="order-card-status">
            <span class="status-badge ${statusClass(displayStatus)}">${displayStatus.toUpperCase()}</span>
          </div>
        </div>
        <div class="order-card-body">
          ${addressHTML}
          <div class="order-details-section">
            <div class="order-details-title">Order Details:</div>
            ${detailsHTML}
          </div>
        </div>
        <div class="order-card-footer">
          <div class="order-card-total">
            <span class="order-total-label">Total Amount:</span>
            <span class="order-total-amount">${formatMoney(o.total)}</span>
          </div>
          <div class="order-card-actions">
            <button class="btn-cancel-order" onclick="cancelOrder(${o.id}, event)" title="Cancel Order">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Cancel Order
            </button>
            <button class="btn-approve-order" onclick="approveOrder(${o.id}, event)" title="Approve Order">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Approve Order
            </button>
          </div>
        </div>
      `;
      ordersListEl.appendChild(orderCard);
    }
  }

  async function refreshPendingOrders() {
    if (!ordersRefreshBtn || isRefreshingOrders) {
      return;
    }

    const targetDate = selectedDate || ymd(new Date());
    const originalAriaLabel = ordersRefreshBtn.getAttribute('aria-label') || 'Refresh pending orders';

    isRefreshingOrders = true;
    ordersRefreshBtn.disabled = true;
    ordersRefreshBtn.classList.add('is-loading');
    ordersRefreshBtn.setAttribute('aria-busy', 'true');
    ordersRefreshBtn.setAttribute('aria-label', 'Refreshing pending orders');

    try {
      await fetchOrders();
      selectedDate = targetDate;
      if (currentYear !== undefined && currentMonth !== undefined) {
        renderCalendar(currentYear, currentMonth);
      } else {
        const now = new Date();
        renderCalendar(now.getFullYear(), now.getMonth());
      }
      renderOrdersFor(selectedDate);
    } catch (error) {
      console.error('Failed to refresh pending orders:', error);
      alert('Unable to refresh pending orders right now. Please try again.');
    } finally {
      ordersRefreshBtn.disabled = false;
      ordersRefreshBtn.classList.remove('is-loading');
      ordersRefreshBtn.removeAttribute('aria-busy');
      ordersRefreshBtn.setAttribute('aria-label', originalAriaLabel);
      isRefreshingOrders = false;
    }
  }
  
  // Approve order function - Updates order status via API
  window.approveOrder = async function(orderId, event) {
    if (event) {
      event.stopPropagation();
    }
    
    if (!confirm(`Are you sure you want to approve Order #${orderId}?`)) {
      return;
    }
    
    // Disable the button to prevent double-clicks
    const approveBtn = event?.target?.closest('.btn-approve-order');
    const orderCard = event?.target?.closest('.order-card');
    const cancelBtn = orderCard?.querySelector('.btn-cancel-order');
    if (approveBtn) {
      approveBtn.dataset.originalContent = approveBtn.innerHTML;
      approveBtn.disabled = true;
      approveBtn.textContent = 'Approving...';
    }
    if (cancelBtn) {
      cancelBtn.disabled = true;
    }
    
    try {
      // Try API first
      const API_UPDATE_ORDER = '../admin_backend/api/update_orders.php';
      const response = await fetch(API_UPDATE_ORDER, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          OrderID: orderId,
          OrderStatusID: 2, // 2 = Confirmed (see tbl_order_status: 1=For Approval, 2=Confirmed)
          PaymentStatusID: 1 // Pending
        })
      });
      
      const data = await response.json();
      
      if (response.ok && !data.error) {
        // Also update in localStorage if it exists (for backward compatibility with customer portal testing)
        try {
          const storedOrders = localStorage.getItem('orderSubmissions');
          if (storedOrders) {
            let orders = JSON.parse(storedOrders);
            const orderIndex = orders.findIndex(o => (o.id || o.orderId) == orderId);
            if (orderIndex !== -1) {
              orders[orderIndex].status = 'confirmed';
              orders[orderIndex].orderStatus = 'Confirmed';
              orders[orderIndex].paymentStatus = 'pending';
              orders[orderIndex].paymentStatusId = 1;
              orders[orderIndex].updatedAt = new Date().toISOString();
              localStorage.setItem('orderSubmissions', JSON.stringify(orders));
            }
          }
        } catch (e) {
          console.warn('Could not update localStorage:', e);
        }
        
        // Also update in allOrders array immediately
        const allOrdersIndex = allOrders.findIndex(o => o.id == orderId);
        if (allOrdersIndex !== -1) {
          allOrders[allOrdersIndex].orderStatus = 'Confirmed';
          allOrders[allOrdersIndex].paymentStatus = 'Pending';
        }
        
        // Re-fetch orders to get updated data from server
        await fetchOrders();
        
        // Re-render calendar to update counts
        if (currentYear !== undefined && currentMonth !== undefined) {
          renderCalendar(currentYear, currentMonth);
        }
        
        // Re-render the orders list in dashboard (approved orders will be filtered out)
        const currentDate = selectedDate || ymd(new Date());
        renderOrdersFor(currentDate);
        
        // Refresh orders table to show the newly approved order
        if (typeof window.loadOrdersForTable === 'function') {
          window.loadOrdersForTable();
        }
        if (typeof window.loadOrdersTable === 'function') {
          window.loadOrdersTable();
        }
        
        if (typeof window.loadStockValues === 'function') {
          await window.loadStockValues();
        }
        
        // Show success message
        alert(`Order #${orderId} has been approved successfully! It will now appear in the Orders table.`);
      } else {
        throw new Error(data.error || 'Failed to approve order');
      }
    } catch (error) {
      console.error('Error approving order:', error);
      const errorMessage = error.message || 'An error occurred while approving the order. Please try again.';
      alert(`Failed to approve order: ${errorMessage}`);
      
      // Re-enable button on error
      if (approveBtn) {
        approveBtn.disabled = false;
        approveBtn.innerHTML = approveBtn.dataset.originalContent || `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Approve Order
        `;
      }
      if (cancelBtn) {
        cancelBtn.disabled = false;
      }
    }
  };

  // Cancel order function - updates order status to Cancelled via API
  window.cancelOrder = async function(orderId, event) {
    if (event) {
      event.stopPropagation();
    }

    if (!confirm(`Are you sure you want to cancel Order #${orderId}?`)) {
      return;
    }

    const cancelBtn = event?.target?.closest('.btn-cancel-order');
    const orderCard = event?.target?.closest('.order-card');
    const approveBtn = orderCard?.querySelector('.btn-approve-order');

    if (cancelBtn) {
      cancelBtn.dataset.originalContent = cancelBtn.innerHTML;
      cancelBtn.disabled = true;
      cancelBtn.textContent = 'Cancelling...';
    }
    if (approveBtn) {
      approveBtn.disabled = true;
    }

    try {
      const API_UPDATE_ORDER = '../admin_backend/api/update_orders.php';
      const response = await fetch(API_UPDATE_ORDER, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          OrderID: orderId,
          OrderStatusID: 8, // Cancelled
          PaymentStatusID: 4 // Cancelled
        })
      });

      const data = await response.json();

      if (response.ok && !data.error) {
        try {
          const storedOrders = localStorage.getItem('orderSubmissions');
          if (storedOrders) {
            let orders = JSON.parse(storedOrders);
            const orderIndex = orders.findIndex(o => (o.id || o.orderId) == orderId);
            if (orderIndex !== -1) {
              orders[orderIndex].status = 'cancelled';
              orders[orderIndex].orderStatus = 'Cancelled';
              orders[orderIndex].paymentStatus = 'cancelled';
              orders[orderIndex].paymentStatusId = 4;
              orders[orderIndex].updatedAt = new Date().toISOString();
              localStorage.setItem('orderSubmissions', JSON.stringify(orders));
            }
          }
        } catch (e) {
          console.warn('Could not update localStorage:', e);
        }

        const allOrdersIndex = allOrders.findIndex(o => o.id == orderId);
        if (allOrdersIndex !== -1) {
          allOrders[allOrdersIndex].orderStatus = 'Cancelled';
        }

        await fetchOrders();

        if (currentYear !== undefined && currentMonth !== undefined) {
          renderCalendar(currentYear, currentMonth);
        }

        const currentDate = selectedDate || ymd(new Date());
        renderOrdersFor(currentDate);

        if (typeof window.loadOrdersForTable === 'function') {
          window.loadOrdersForTable();
        }
        if (typeof window.loadOrdersTable === 'function') {
          window.loadOrdersTable();
        }

        alert(`Order #${orderId} has been cancelled successfully.`);
      } else {
        throw new Error(data.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      const errorMessage = error.message || 'An error occurred while cancelling the order. Please try again.';
      alert(`Failed to cancel order: ${errorMessage}`);

      if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.innerHTML = cancelBtn.dataset.originalContent || `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Cancel Order
        `;
      }
      if (approveBtn) {
        approveBtn.disabled = false;
      }
    }
  };
  function statusClass(s) {
    const v = (s || '').toLowerCase();
    if (v === 'paid' || v === 'completed' || v === 'delivered') return 'status-completed';
    if (v === 'confirmed') return 'status-confirmed';
    if (v === 'cancelled') return 'status-cancelled';
    if (v === 'for approval' || v === 'pending') return 'status-pending';
    return 'status-pending';
  }
  function renderCalendar(year, month) {
    if (!calendarEl) return;
    currentYear = year; currentMonth = month;
    const first = new Date(year, month, 1);
    const startDay = (first.getDay() + 6) % 7; // Convert Sunday (0) to Monday (0)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const wrap = document.createElement('div');
    const header = document.createElement('div'); header.className = 'cal-header';
    const title = document.createElement('div'); title.className = 'cal-title';
    title.textContent = `${first.toLocaleString(undefined, { month: 'long' }).toUpperCase()} ${year}`;
    const nav = document.createElement('div'); nav.className = 'cal-nav';
    const prev = document.createElement('button'); prev.className = 'cal-btn'; prev.innerHTML = '&lt;';
    const next = document.createElement('button'); next.className = 'cal-btn'; next.innerHTML = '&gt;';
    nav.appendChild(prev); nav.appendChild(next);
    header.appendChild(title); header.appendChild(nav);
    const grid = document.createElement('div'); grid.className = 'cal-grid';
    const dayNames = ['Mo','Tu','We','Th','Fr','Sa','Su'];
    for (const n of dayNames) { const dn = document.createElement('div'); dn.className = 'cal-day-name'; dn.textContent = n; grid.appendChild(dn); }
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    // Filter out placeholder orders first, then count only orders that need approval
    // Use OrderDate for counting (the date the order should be processed on)
    const nonPlaceholderOrders = allOrders.filter(o => !isPlaceholderOrder(o));
    const counts = nonPlaceholderOrders.reduce((acc, o) => { 
      // Use OrderDate if available, otherwise fall back to createdAt/updatedAt for backward compatibility
      let d = o.orderDate;
      if (!d) {
        const dateValue = o.createdAt || o.date || o.updatedAt;
        if (dateValue) {
          d = getDateOnlyFromString(dateValue);
        }
      }
      // Ensure date is in YYYY-MM-DD format
      if (d && d.length > 10) {
        d = d.substring(0, 10);
      }
      
      const status = (o.orderStatus || '').toLowerCase();
      const needsApproval = status === 'for approval' || status === 'pending';
      if (d && d.startsWith(monthStr) && needsApproval) {
        acc[d] = (acc[d] || 0) + 1;
      }
      return acc; 
    }, {});
    const today = new Date(); const todayStr = ymd(today);
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const dateStr = ymd(cellDate);
      const cell = document.createElement('div'); cell.className = 'cal-cell';
      const badgeCount = counts[dateStr] || 0;
      const isToday = dateStr === todayStr;
      const isSelected = selectedDate === dateStr;
      
      // Position first day of month correctly
      if (day === 1) {
        cell.style.gridColumnStart = startDay + 1;
      }
      
      if (isToday) cell.classList.add('cal-today');
      if (isSelected) cell.classList.add('cal-selected');
      
      cell.innerHTML = `<div class="date">${day}</div>${badgeCount ? `<div class=\"badge\">${badgeCount}</div>` : ''}`;
      cell.addEventListener('click', () => {
        // Remove selected class from all cells
        document.querySelectorAll('.cal-cell.cal-selected').forEach(c => c.classList.remove('cal-selected'));
        // Add selected class to clicked cell
        cell.classList.add('cal-selected');
        selectedDate = dateStr;
        renderOrdersFor(dateStr);
      });
      grid.appendChild(cell);
    }
    calendarEl.innerHTML = ''; wrap.appendChild(header); wrap.appendChild(grid); calendarEl.appendChild(wrap);
    prev.addEventListener('click', () => { const d = new Date(currentYear, currentMonth - 1, 1); renderCalendar(d.getFullYear(), d.getMonth()); });
    next.addEventListener('click', () => { const d = new Date(currentYear, currentMonth + 1, 1); renderCalendar(d.getFullYear(), d.getMonth()); });
  }

  // Reports logic
  function getFilterRange(dateStr, freq) {
    const base = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(base);
    const end = new Date(base);
    if (freq === 'Weekly') { start.setDate(base.getDate() - 6); }
    else if (freq === 'Monthly') { start.setMonth(base.getMonth() - 1); start.setDate(start.getDate() + 1); }
    return { start: ymd(start), end: ymd(end) };
  }
  
  // Check if an order is a placeholder order
  function isPlaceholderOrder(order) {
    if (!order) return false;
    
    const customerName = (order.customer || order.customerName || '').toLowerCase().trim();
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
  
  function orderMatchesFilters(o, options = {}) {
    const {
      requirePaid = true,
      statusFilter = null,
      dateField = 'updatedAt'
    } = options;
    if ((o.orderStatus || '').toLowerCase() === 'for approval') return false;
    if (requirePaid && (o.paymentStatus || '').toLowerCase() !== 'paid') return false; // paid only
    if (statusFilter) {
      const statuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
      const orderStatusLower = (o.orderStatus || '').toLowerCase();
      const matchesStatus = statuses.some(status => orderStatusLower.includes(String(status).toLowerCase()));
      if (!matchesStatus) return false;
    }
    const text = (repSearch?.value || '').trim().toLowerCase();
    if (text) {
      const orderIdMatch = String(o.id || '').toLowerCase().includes(text);
      const customerFields = [
        o.customer,
        o.customerName,
        o.customerFirstName,
        o.customerLastName,
        o.firstName,
        o.lastName
      ];
      const customerMatch = customerFields.some(name => {
        if (!name) return false;
        return name.toString().toLowerCase().includes(text);
      });
      const detailsStr = (o.details || [])
        .map(d => `${d.qty} ${d.container} ${d.category}`)
        .join(' ')
        .toLowerCase();
      if (!(orderIdMatch || customerMatch || detailsStr.includes(text))) {
        return false;
      }
    }
    const container = repContainer?.value || 'All';
    if (container !== 'All') {
      const has = (o.details || []).some(d => (d.container || '').toLowerCase() === container.toLowerCase());
      if (!has) return false;
    }
    const orderType = repOrderType?.value || 'All';
    if (orderType !== 'All') {
      const typeMap = { 'Brand-new': 'New Gallon', 'Refill': 'Refill', 'Mixed Order': '' };
      if (orderType === 'Mixed Order') {
        const hasRefill = (o.details || []).some(d => (d.category || '').toLowerCase().includes('refill'));
        const hasNew = (o.details || []).some(d => (d.category || '').toLowerCase().includes('new'));
        if (!(hasRefill && hasNew)) return false;
      } else {
        const expect = (typeMap[orderType] || '').toLowerCase();
        const hasCat = (o.details || []).some(d => (d.category || '').toLowerCase().includes(expect));
        if (!hasCat) return false;
      }
    }
    const mop = repPayment?.value || 'All';
    if (mop !== 'All' && (o.mop || '') !== mop) return false;
    const freq = repFrequency?.value || 'Daily';
    const { start, end } = getFilterRange(repDate?.value, freq);
    const dateValue = dateField === 'createdAt'
      ? o.createdAt
      : dateField === 'orderDate'
        ? o.orderDate
        : o.updatedAt;
    const fallbackDate = o.updatedAt || o.createdAt || o.orderDate;
    const d = getDateOnlyFromString(dateValue || fallbackDate || '');
    if (d) {
      if (d < start || d > end) return false;
    }
    return true;
  }

  function loanMatchesFilters(order) {
    if (!order) {
      return false;
    }

    const query = (loanSearch?.value || '').trim().toLowerCase();
    if (query) {
      const idMatch = String(order.id || '').toLowerCase().includes(query);
      const customerFields = [
        order.customer,
        order.customerName,
        order.username
      ];
      const customerMatch = customerFields.some(name => {
        if (!name) return false;
        return name.toString().toLowerCase().includes(query);
      });
      const detailsStr = (order.details || [])
        .map(d => `${d.qty} ${d.container} ${d.category}`)
        .join(' ')
        .toLowerCase();
      if (!(idMatch || customerMatch || detailsStr.includes(query))) {
        return false;
      }
    }

    const container = loanContainer?.value || 'All';
    if (container !== 'All') {
      const hasContainer = (order.details || []).some(d => (d.container || '').toLowerCase() === container.toLowerCase());
      if (!hasContainer) {
        return false;
      }
    }

    const orderType = loanOrderType?.value || 'All';
    if (orderType !== 'All') {
      const typeMap = { 'Brand-new': 'New Gallon', 'Refill': 'Refill' };
      if (orderType === 'Mixed Order') {
        const hasRefill = (order.details || []).some(d => (d.category || '').toLowerCase().includes('refill'));
        const hasNew = (order.details || []).some(d => (d.category || '').toLowerCase().includes('new'));
        if (!(hasRefill && hasNew)) {
          return false;
        }
      } else {
        const expected = (typeMap[orderType] || orderType).toLowerCase();
        const hasType = (order.details || []).some(d => (d.category || '').toLowerCase().includes(expected));
        if (!hasType) {
          return false;
        }
      }
    }

    const payment = loanPayment?.value || 'All';
    if (payment !== 'All') {
      const orderMop = (order.mop || order.MOPName || '').toLowerCase();
      if (orderMop !== payment.toLowerCase()) {
        return false;
      }
    }

    const dateValue = loanDate?.value ? loanDate.value.trim() : '';
    if (dateValue) {
      const freq = loanFrequency?.value || 'Daily';
      const { start, end } = getFilterRange(dateValue, freq);
      const fallbackDate = order.createdAt || order.orderDate || order.updatedAt;
      const dateOnly = getDateOnlyFromString(fallbackDate || '');
      if (dateOnly) {
        if (dateOnly < start || dateOnly > end) {
          return false;
        }
      }
    }

    return true;
  }

  function computeGallons(orders) {
    let sum = 0;
    for (const o of orders) for (const d of (o.details || [])) sum += toNumber(d.qty);
    return sum;
  }

  function renderSales() {
    if (!salesRows) return; // Safety check
    // Filter out placeholder orders first, then apply other filters
    const nonPlaceholderOrders = allOrders.filter(o => !isPlaceholderOrder(o));
    const filtered = nonPlaceholderOrders.filter(orderMatchesFilters);
    const completed = filtered.filter(o => /completed|delivered/i.test(o.orderStatus)).length;
    const cancelled = filtered.filter(o => /cancelled/i.test(o.orderStatus)).length;
    const revenue = filtered.reduce((acc, o) => acc + toNumber(o.total), 0);
    const customers = new Set(filtered.map(o => o.customer)).size;
    mGallons.textContent = String(computeGallons(filtered));
    mCustomers.textContent = String(customers);
    mStatus.textContent = `${completed} / ${cancelled}`;
    mRevenue.textContent = formatMoney(revenue);

    salesRows.innerHTML = '';
    // Show empty state if filters return no results
    if (filtered.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'admin-table-row is-empty';
      emptyState.style.gridColumn = '1 / -1';
      emptyState.style.textAlign = 'center';
      emptyState.style.padding = '32px';
      emptyState.style.color = '#666';
      emptyState.textContent = 'No sales data found matching the selected filters.';
      salesRows.appendChild(emptyState);
      return;
    }
    for (const o of filtered) {
      const itemsStr = (o.details || []).map(d => `${d.qty} ${d.container} ${d.category}`).join(', ');
      const row = document.createElement('div'); row.className = 'admin-table-row';
      const orderDate = o.createdAt ? getDateOnlyFromString(o.createdAt) : '-';
      const updatedDate = o.updatedAt ? getDateOnlyFromString(o.updatedAt) : '-';
      row.innerHTML = `
        <div data-label="Order ID">#${o.id}</div>
        <div data-label="Customer">${o.customer}</div>
        <div data-label="Items">${itemsStr || '-'}</div>
        <div data-label="Total Amount">${formatMoney(o.total)}</div>
        <div data-label="Status"><span class="status-badge ${statusClass(o.orderStatus)}">${o.orderStatus}</span></div>
        <div data-label="Type">${o.orderType}</div>
        <div data-label="Payment Method">${o.mop}</div>
        <div data-label="Order Date">${orderDate}</div>
        <div data-label="Last Updated">${updatedDate}</div>`;
      salesRows.appendChild(row);
    }
  }

  function renderCancelled() {
    if (!cancelledRows) return; // Safety check
    const nonPlaceholderOrders = allOrders.filter(o => !isPlaceholderOrder(o));
    const filtered = nonPlaceholderOrders.filter(o => orderMatchesFilters(o, { requirePaid: false, statusFilter: 'cancelled' }));
    const totalCancelled = filtered.length;
    const totalGallons = computeGallons(filtered);
    const lostRevenue = filtered.reduce((acc, o) => acc + toNumber(o.total), 0);
    const latestDateObj = filtered.reduce((latest, o) => {
      const rawDate = o.updatedAt || o.createdAt || o.orderDate;
      if (!rawDate) return latest;
      const current = new Date(rawDate);
      if (!latest || current > latest) {
        return current;
      }
      return latest;
    }, null);

    if (cCancelledCount) cCancelledCount.textContent = String(totalCancelled);
    if (cCancelledGallons) cCancelledGallons.textContent = String(totalGallons);
    if (cCancelledRevenue) cCancelledRevenue.textContent = formatMoney(lostRevenue);
    if (cLatestCancelled) {
      cLatestCancelled.textContent = latestDateObj
        ? latestDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '-';
    }

    cancelledRows.innerHTML = '';
    if (filtered.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'admin-table-row is-empty';
      emptyState.style.gridColumn = '1 / -1';
      emptyState.style.textAlign = 'center';
      emptyState.style.padding = '32px';
      emptyState.style.color = '#666';
      emptyState.textContent = 'No cancelled orders found for the selected filters.';
      cancelledRows.appendChild(emptyState);
      return;
    }

    for (const o of filtered) {
      const itemsStr = (o.details || []).map(d => `${d.qty} ${d.container} ${d.category}`).join(', ');
      const row = document.createElement('div'); row.className = 'admin-table-row';
      const orderDate = o.createdAt ? getDateOnlyFromString(o.createdAt) : '-';
      const cancelledDate = o.updatedAt ? getDateOnlyFromString(o.updatedAt) : '-';
      const paymentStatus = (o.paymentStatus || '').trim();
      const paymentStatusDisplay = paymentStatus
        ? `<span class="status-badge ${statusClass(paymentStatus)}">${paymentStatus}</span>`
        : '-';
      row.innerHTML = `
        <div data-label="Order ID">#${o.id}</div>
        <div data-label="Customer">${o.customer}</div>
        <div data-label="Items">${itemsStr || '-'}</div>
        <div data-label="Total Amount">${formatMoney(o.total)}</div>
        <div data-label="Status"><span class="status-badge ${statusClass(o.orderStatus)}">${o.orderStatus || 'Cancelled'}</span></div>
        <div data-label="Payment Status">${paymentStatusDisplay}</div>
        <div data-label="Type">${o.orderType}</div>
        <div data-label="Payment Method">${o.mop}</div>
        <div data-label="Order Date">${orderDate}</div>
        <div data-label="Cancelled On">${cancelledDate}</div>`;
      cancelledRows.appendChild(row);
    }
  }

  function getActiveReportTab() {
    const activeTab = document.querySelector('.tab.active');
    return activeTab ? activeTab.getAttribute('data-tab') : 'sales';
  }

  function renderActiveReport() {
    const activeTab = getActiveReportTab();
    updateReportsDisplay(activeTab);
    if (activeTab === 'cancelled') {
      renderCancelled();
    } else if (activeTab === 'loans') {
      renderLoans();
    } else {
      renderSales();
    }
  }

  function updateReportsDisplay(tab = 'sales') {
    const activeTab = tab || 'sales';
    tabs.forEach(button => {
      const buttonTab = button.getAttribute('data-tab');
      if (buttonTab) {
        button.classList.toggle('active', buttonTab === activeTab);
      }
    });
    if (salesMetrics) salesMetrics.style.display = activeTab === 'sales' ? '' : 'none';
    if (salesTable) salesTable.style.display = activeTab === 'sales' ? '' : 'none';
    if (cancelledMetrics) cancelledMetrics.style.display = activeTab === 'cancelled' ? '' : 'none';
    if (cancelledTable) cancelledTable.style.display = activeTab === 'cancelled' ? '' : 'none';
    if (loansContent) loansContent.style.display = activeTab === 'loans' ? '' : 'none';
    if (salesFilters) salesFilters.style.display = activeTab === 'loans' ? 'none' : '';
    if (loansFilters) loansFilters.style.display = activeTab === 'loans' ? '' : 'none';
  }

  function renderLoans() {
    if (!goodRows || !loanRows) return; // Safety check
    // Filter out placeholder orders first
    const nonPlaceholderOrders = allOrders.filter(o => !isPlaceholderOrder(o));
    const loans = nonPlaceholderOrders.filter(o => (o.mop || '').toLowerCase() === 'loan' && isApprovedOrderStatus(o.orderStatus));
    const outstanding = loans
      .filter(o => (o.paymentStatus || '').toLowerCase() !== 'paid')
      .reduce((acc, o) => acc + toNumber(o.total), 0);
    mOutstanding.textContent = formatMoney(outstanding);
    const paidLoans = loans.filter(o => (o.paymentStatus || '').toLowerCase() === 'paid');
    const repaidFast = paidLoans.filter(o => diffDays(o.createdAt, o.updatedAt) <= 15);
    const rate = paidLoans.length ? Math.round((repaidFast.length / paidLoans.length) * 100) : 0;
    mRepayRate.textContent = `${rate}%`;

    const hasActiveFilters =
      (loanSearch?.value || '').trim().length > 0 ||
      (loanContainer?.value || 'All') !== 'All' ||
      (loanOrderType?.value || 'All') !== 'All' ||
      (loanPayment?.value || 'All') !== 'All' ||
      Boolean((loanDate?.value || '').trim());

    // Good payers table
    goodRows.innerHTML = '';
    const goodPayersFiltered = repaidFast.filter(loanMatchesFilters);
    // Show empty state if no good payers found (repaid within 15 days) or filtered by search
    if (goodPayersFiltered.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'admin-table-row is-empty';
      emptyState.style.gridColumn = '1 / -1';
      emptyState.style.textAlign = 'center';
      emptyState.style.padding = '32px';
      emptyState.style.color = '#666';
      emptyState.textContent = hasActiveFilters
        ? 'No good payers found matching the selected filters.'
        : 'No good payers found (repaid within 15 days).';
      goodRows.appendChild(emptyState);
    } else {
      for (const o of goodPayersFiltered) {
        const row = document.createElement('div'); row.className = 'admin-table-row';
        const orderDate = o.createdAt ? getDateOnlyFromString(o.createdAt) : '-';
        row.innerHTML = `
          <div data-label="Order ID">#${o.id}</div>
          <div data-label="Customer">${o.customer}</div>
          <div data-label="Amount Paid">${formatMoney(o.total)}</div>
          <div data-label="Order Date">${orderDate}</div>
          <div data-label="Days Taken">${diffDays(o.createdAt, o.updatedAt)} days</div>`;
        goodRows.appendChild(row);
      }
    }

    // Loan orders list (old/new)
    const loansFiltered = loans.filter(loanMatchesFilters);
    loanRows.innerHTML = '';
    // Show empty state if no loan orders found (either no loans exist or search filters them out)
    if (loansFiltered.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'admin-table-row is-empty';
      emptyState.style.gridColumn = '1 / -1';
      emptyState.style.textAlign = 'center';
      emptyState.style.padding = '32px';
      emptyState.style.color = '#666';
      emptyState.textContent = hasActiveFilters
        ? 'No loan orders found matching the selected filters.'
        : 'No loan orders found.';
      loanRows.appendChild(emptyState);
      return;
    }
    for (const o of loansFiltered) {
      const days = diffDays(o.createdAt, new Date());
      const row = document.createElement('div'); row.className = 'admin-table-row';
      const orderDate = o.createdAt ? getDateOnlyFromString(o.createdAt) : '-';
      row.innerHTML = `
        <div data-label="Order ID">#${o.id}</div>
        <div data-label="Customer">${o.customer}</div>
        <div data-label="Total Amount">${formatMoney(o.total)}</div>
        <div data-label="Payment Status">${o.paymentStatus || '-'}</div>
        <div data-label="Order Status">${o.orderStatus || '-'}</div>
        <div data-label="Order Date">${orderDate}</div>
        <div data-label="Days Old">${days}</div>`;
      loanRows.appendChild(row);
    }
  }

  async function refreshLoansReports() {
    if (!loansRefreshBtn || isRefreshingLoans) {
      return;
    }

    const originalLabel = loansRefreshBtn.getAttribute('aria-label') || 'Refresh Loans Reports';

    isRefreshingLoans = true;
    loansRefreshBtn.disabled = true;
    loansRefreshBtn.classList.add('is-loading');
    loansRefreshBtn.setAttribute('aria-busy', 'true');
    loansRefreshBtn.setAttribute('aria-label', 'Refreshing Loans Reports');

    try {
      await fetchOrders();
      renderActiveReport();
    } catch (error) {
      console.error('Failed to refresh loans reports:', error);
      renderActiveReport();
    } finally {
      loansRefreshBtn.disabled = false;
      loansRefreshBtn.classList.remove('is-loading');
      loansRefreshBtn.setAttribute('aria-label', originalLabel);
      loansRefreshBtn.setAttribute('aria-busy', 'false');
      loansRefreshBtn.blur();
      isRefreshingLoans = false;
    }
  }

  // View routing
  function showView(view) {
    if (view === 'reports') {
      viewDashboard.style.display = 'none';
      viewReports.style.display = '';
      const activeTab = getActiveReportTab() || 'sales';
      updateReportsDisplay(activeTab);
      renderActiveReport();
    } else {
      viewReports.style.display = 'none';
      viewDashboard.style.display = '';
      const now = new Date(); renderCalendar(now.getFullYear(), now.getMonth()); renderOrdersFor(ymd(now));
    }
  }

  function wireNav() {
    // Navigation is now handled by the unified view switcher
    // This function is kept for compatibility but view switching is handled elsewhere
  }

  function wireReports() {
    if (!viewReports) return;
    const initialTab = getActiveReportTab() || 'sales';
    updateReportsDisplay(initialTab);
    if (viewReports.style.display !== 'none') {
      renderActiveReport();
    }
    tabs.forEach(t => t.addEventListener('click', () => {
      const tab = t.getAttribute('data-tab') || 'sales';
      updateReportsDisplay(tab);
      renderActiveReport();
    }));
    repApply?.addEventListener('click', renderActiveReport);
    repSearch?.addEventListener('input', renderActiveReport);
    [repDate, repContainer, repOrderType, repPayment, repFrequency].forEach(el => el && el.addEventListener('change', renderActiveReport));
    loanSearch?.addEventListener('input', () => {
      if (getActiveReportTab() === 'loans') {
        renderLoans();
      }
    });
    loanApply?.addEventListener('click', () => {
      if (getActiveReportTab() === 'loans') {
        renderLoans();
      }
    });
    [loanDate, loanContainer, loanOrderType, loanPayment, loanFrequency].forEach(el => el && el.addEventListener('change', () => {
      if (getActiveReportTab() === 'loans') {
        renderLoans();
      }
    }));
    loansRefreshBtn?.addEventListener('click', refreshLoansReports);
  }

  async function init() {
    wireNav();
    wireReports();
    if (ordersRefreshBtn) {
      ordersRefreshBtn.addEventListener('click', refreshPendingOrders);
    }
    await fetchOrders();
    const now = new Date();
    selectedDate = ymd(now);
    renderCalendar(now.getFullYear(), now.getMonth());
    renderOrdersFor(ymd(now));
  }

  // Expose render functions globally for switchView
  window.renderSales = renderSales;
  window.renderLoans = renderLoans;
  window.renderCancelled = renderCancelled;
  window.renderActiveReport = renderActiveReport;

  document.addEventListener('DOMContentLoaded', init);
})();


