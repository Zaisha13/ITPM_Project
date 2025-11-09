// Feedback Management functionality
(function() {
  const API_FEEDBACK = '../admin_backend/api/get_feedback.php';
  
  let allFeedback = [];
  let filteredFeedback = [];
  
  // Rating descriptions mapping
  const ratingDescriptions = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };
  
  // Rating color classes
  const ratingColors = {
    1: 'rating-poor',
    2: 'rating-fair',
    3: 'rating-good',
    4: 'rating-very-good',
    5: 'rating-excellent'
  };
  
  // Load feedback from localStorage (for testing without database)
  function loadFeedback() {
    try {
      // Load from localStorage
      const feedbackStorage = localStorage.getItem('customerFeedback');
      const feedbackData = feedbackStorage ? JSON.parse(feedbackStorage) : [];
      
      if (Array.isArray(feedbackData) && feedbackData.length > 0) {
        allFeedback = feedbackData.map(fb => ({
          feedbackId: fb.Feedback_ID,
          orderId: fb.OrderID,
          customerName: `${fb.FirstName || ''} ${fb.LastName || ''}`.trim() || 'Customer',
          customerPhone: fb.Phone || '',
          rating: parseInt(fb.ScaleValue || fb.RatingScaleID) || 0,
          ratingDescription: fb.RatingDescription || ratingDescriptions[parseInt(fb.ScaleValue || fb.RatingScaleID)] || 'Unknown',
          comments: fb.Comments || '',
          feedbackDate: fb.Feedback_Date || '',
          orderDate: fb.OrderDate || '',
          orderTotal: parseFloat(fb.TotalAmount || 0),
          orderStatus: fb.OrderStatusName || '',
          orderType: fb.OrderTypeName || ''
        }));
        
        filteredFeedback = [...allFeedback];
        updateStats();
        renderFeedbackTable();
      } else {
        allFeedback = [];
        filteredFeedback = [];
        updateStats();
        renderFeedbackTable();
      }
    } catch (error) {
      console.error('Failed to load feedback:', error);
      allFeedback = [];
      filteredFeedback = [];
      updateStats();
      renderFeedbackTable();
    }
  }
  
  // Update statistics
  function updateStats() {
    const totalCount = allFeedback.length;
    const totalCountEl = document.getElementById('feedbackTotalCount');
    if (totalCountEl) totalCountEl.textContent = totalCount;
    
    // Calculate average rating
    if (totalCount > 0) {
      const sum = allFeedback.reduce((acc, fb) => acc + fb.rating, 0);
      const avg = (sum / totalCount).toFixed(1);
      const avgEl = document.getElementById('feedbackAverageRating');
      if (avgEl) avgEl.textContent = avg;
    } else {
      const avgEl = document.getElementById('feedbackAverageRating');
      if (avgEl) avgEl.textContent = '0.0';
    }
    
    // Count excellent (5) ratings
    const excellentCount = allFeedback.filter(fb => fb.rating === 5).length;
    const excellentEl = document.getElementById('feedbackExcellentCount');
    if (excellentEl) excellentEl.textContent = excellentCount;
    
    // Count poor (1-2) ratings
    const poorCount = allFeedback.filter(fb => fb.rating <= 2).length;
    const poorEl = document.getElementById('feedbackPoorCount');
    if (poorEl) poorEl.textContent = poorCount;
  }
  
  // Filter feedback
  function filterFeedback() {
    const ratingFilter = document.getElementById('feedbackFilterRating')?.value || 'All';
    const dateFrom = document.getElementById('feedbackFilterDateFrom')?.value || '';
    const dateTo = document.getElementById('feedbackFilterDateTo')?.value || '';
    const searchTerm = (document.getElementById('feedbackSearch')?.value || '').toLowerCase().trim();
    
    filteredFeedback = allFeedback.filter(fb => {
      // Rating filter
      if (ratingFilter !== 'All' && fb.rating !== parseInt(ratingFilter)) {
        return false;
      }
      
      // Date filter
      if (dateFrom) {
        const fbDate = new Date(fb.feedbackDate);
        const fromDate = new Date(dateFrom);
        if (fbDate < fromDate) return false;
      }
      
      if (dateTo) {
        const fbDate = new Date(fb.feedbackDate);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (fbDate > toDate) return false;
      }
      
      // Search filter
      if (searchTerm) {
        const searchableText = `${fb.feedbackId} ${fb.orderId} ${fb.customerName} ${fb.comments}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) return false;
      }
      
      return true;
    });
    
    renderFeedbackTable();
  }
  
  // Render feedback table
  function renderFeedbackTable() {
    const tableBody = document.getElementById('feedbackTableBody');
    if (!tableBody) return;
    
    if (filteredFeedback.length === 0) {
      tableBody.innerHTML = `
        <div class="feedback-empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <p>No feedback found</p>
          <span>Try adjusting your filters or search criteria</span>
        </div>
      `;
      return;
    }
    
    tableBody.innerHTML = filteredFeedback.map(fb => {
      const feedbackDate = new Date(fb.feedbackDate);
      const orderDate = new Date(fb.orderDate);
      const formattedFeedbackDate = feedbackDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const formattedOrderDate = orderDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
      
      const ratingClass = ratingColors[fb.rating] || 'rating-good';
      const stars = 'â˜…'.repeat(fb.rating) + 'â˜†'.repeat(5 - fb.rating);
      
      return `
        <div class="feedback-table-row">
          <div class="feedback-cell">#${fb.feedbackId}</div>
          <div class="feedback-cell">
            <span class="order-id-link">#${fb.orderId}</span>
          </div>
          <div class="feedback-cell">
            <div class="customer-info">
              <div class="customer-name">${escapeHtml(fb.customerName)}</div>
              ${fb.customerPhone ? `<div class="customer-phone">${escapeHtml(fb.customerPhone)}</div>` : ''}
            </div>
          </div>
          <div class="feedback-cell">
            <div class="rating-display ${ratingClass}">
              <span class="rating-stars">${stars}</span>
              <span class="rating-value">${fb.rating}</span>
              <span class="rating-label">${fb.ratingDescription}</span>
            </div>
          </div>
          <div class="feedback-cell feedback-comments">
            ${fb.comments ? `<div class="comments-text">${escapeHtml(fb.comments)}</div>` : '<span class="no-comments">No comments</span>'}
          </div>
          <div class="feedback-cell">${formattedOrderDate}</div>
          <div class="feedback-cell">${formattedFeedbackDate}</div>
        </div>
      `;
    }).join('');
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Initialize event listeners
  document.addEventListener('DOMContentLoaded', () => {
    // Filter buttons
    const applyBtn = document.getElementById('feedbackApplyBtn');
    const resetBtn = document.getElementById('feedbackResetBtn');
    const searchInput = document.getElementById('feedbackSearch');
    
    if (applyBtn) {
      applyBtn.addEventListener('click', filterFeedback);
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const ratingFilter = document.getElementById('feedbackFilterRating');
        const dateFrom = document.getElementById('feedbackFilterDateFrom');
        const dateTo = document.getElementById('feedbackFilterDateTo');
        
        if (ratingFilter) ratingFilter.value = 'All';
        if (dateFrom) dateFrom.value = '';
        if (dateTo) dateTo.value = '';
        if (searchInput) searchInput.value = '';
        
        filteredFeedback = [...allFeedback];
        renderFeedbackTable();
      });
    }
    
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          filterFeedback();
        }
      });
    }
    
    // Load feedback when feedback view is shown
    const originalSwitchView = window.switchView;
    if (originalSwitchView) {
      const originalSwitch = originalSwitchView;
      window.switchView = function(viewName) {
        originalSwitch(viewName);
        if (viewName === 'feedback') {
          // Reload feedback from localStorage when view is shown
          loadFeedback();
        }
      };
    }
    
    // Also listen for storage events to auto-refresh when feedback is added from customer portal
    window.addEventListener('storage', function(e) {
      if (e.key === 'customerFeedback') {
        // Only reload if we're currently on the feedback view
        const feedbackView = document.getElementById('view-feedback');
        if (feedbackView && feedbackView.style.display !== 'none') {
          loadFeedback();
        }
      }
    });
    
    // Poll for changes (since storage event only works across tabs, not same tab)
    // Check every 2 seconds if on feedback view
    setInterval(function() {
      const feedbackView = document.getElementById('view-feedback');
      if (feedbackView && feedbackView.style.display !== 'none') {
        const currentCount = allFeedback.length;
        const storedFeedback = localStorage.getItem('customerFeedback');
        const storedData = storedFeedback ? JSON.parse(storedFeedback) : [];
        if (storedData.length !== currentCount) {
          loadFeedback();
        }
      }
    }, 2000);
  });
  
  // Make renderFeedback available globally
  window.renderFeedback = loadFeedback;
})();

// Orders Table Management
(function() {
  const API_ORDERS = '../admin_backend/api/read_orders.php';
  let allOrdersTable = [];
  let filteredOrdersTable = [];

  const ORDER_STATUS_OPTIONS = [
    { id: 2, label: 'Confirmed' },
    { id: 4, label: 'In Progress' },
    { id: 6, label: 'Ready for Pick Up' },
    { id: 5, label: 'Out for Delivery' },
    { id: 7, label: 'Completed' },
    { id: 8, label: 'Cancelled' }
  ];

  const ORDER_STATUS_LABEL_BY_ID = {};
  const ORDER_STATUS_ID_BY_LABEL = {
    'ready for pickup': 6,
    'ready-for-pickup': 6
  };

  ORDER_STATUS_OPTIONS.forEach(option => {
    ORDER_STATUS_LABEL_BY_ID[option.id] = option.label;
    ORDER_STATUS_ID_BY_LABEL[option.label.toLowerCase()] = option.id;
  });

  const ORDER_STATUS_COLOR_MAP = {
    2: 'blue',
    4: 'yellow',
    6: 'orange',
    5: 'purple',
    7: 'green',
    8: 'red'
  };

  Object.assign(ORDER_STATUS_ID_BY_LABEL, {
    'confirmed': 2,
    'processing': 4,
    'pending': 4,
    'in progress': 4,
    'in-progress': 4,
    'preparing': 4,
    'out for delivery': 5,
    'out-for-delivery': 5,
    'completed': 7,
    'delivered': 7,
    'cancelled': 8
  });

  const DEFAULT_STATUS_ID = ORDER_STATUS_ID_BY_LABEL['in progress'] || ORDER_STATUS_OPTIONS[0].id;

  const STATUS_DISPLAY_MAP = {
    'confirmed': 'Confirmed',
    'processing': 'In Progress',
    'pending': 'In Progress',
    'in progress': 'In Progress',
    'in-progress': 'In Progress',
    'preparing': 'In Progress',
    'ready for pickup': 'Ready for Pick Up',
    'ready-for-pickup': 'Ready for Pick Up',
    'ready for pick up': 'Ready for Pick Up',
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
    'online': 'Online'
  };

  function normalizeStatusTable(status) {
    const key = (status || '').toLowerCase().trim();
    if (!key) return '';
    if (ORDER_STATUS_ID_BY_LABEL[key]) {
      const id = ORDER_STATUS_ID_BY_LABEL[key];
      if (ORDER_STATUS_LABEL_BY_ID[id]) {
        return ORDER_STATUS_LABEL_BY_ID[id];
      }
    }
    return STATUS_DISPLAY_MAP[key] || (status || '');
  }

  function statusMatchesFilterTable(orderStatus, filterValue) {
    if (filterValue === 'All') return true;
    const normalized = normalizeStatusTable(orderStatus);
    return normalized.toLowerCase() === filterValue.toLowerCase();
  }

  function normalizeOrderTypeLabelTable(type) {
    const key = (type || '').toLowerCase().trim();
    return ORDER_TYPE_LABEL_MAP[key] || (type ? type : '');
  }

  function getOrderTypeLabelTable(order) {
    if (order && order.orderType) {
      return normalizeOrderTypeLabelTable(order.orderType);
    }
    return 'Online';
  }

  function resolveStatusId(rawStatusId, rawStatusName) {
    const numericId = Number(rawStatusId);
    if (Number.isFinite(numericId) && ORDER_STATUS_LABEL_BY_ID[numericId]) {
      return numericId;
    }
    const key = (rawStatusName || '').toLowerCase().trim();
    if (!key) return null;
    return ORDER_STATUS_ID_BY_LABEL[key] || null;
  }

  function derivePaymentStatusLabelFromStatusId(statusId) {
    if (statusId === 7) return 'Paid';
    if (statusId === 8) return 'Cancelled';
    return 'Pending';
  }

  function getPaymentStatusIdForOrderStatus(statusId) {
    if (statusId === 7) return 2; // Paid
    if (statusId === 8) return 4; // Cancelled
    return 1; // Pending
  }

  // Load orders from API
  async function loadOrdersTable() {
    try {
      const response = await fetch(API_ORDERS, { credentials: 'include' });
      const data = await response.json();
      
      if (data.success && data.data) {
        allOrdersTable = data.data.map(order => {
          const orderTypeLabel = normalizeOrderTypeLabelTable(order.OrderTypeName || '');
          const resolvedStatusId = resolveStatusId(order.OrderStatusID, order.OrderStatusName);
          const orderStatusLabel = ORDER_STATUS_LABEL_BY_ID[resolvedStatusId] || normalizeStatusTable(order.OrderStatusName || '');
          const paymentStatusId = Number(order.PaymentStatusID);
          const paymentStatusLabel = order.PaymentStatusName || (resolvedStatusId ? derivePaymentStatusLabelFromStatusId(resolvedStatusId) : '');
          return {
            id: order.OrderID,
            customerName: order.CustomerName || '',
            customerUsername: order.CustomerUsername || '',
            orderType: orderTypeLabel,
            receivingMethod: order.ReceivingMethodName || '',
            mop: order.MOPName || '',
            total: parseFloat(order.TotalAmount || 0),
            paymentStatus: paymentStatusLabel || '',
            paymentStatusId: Number.isFinite(paymentStatusId) ? paymentStatusId : null,
            orderStatus: orderStatusLabel,
            orderStatusId: resolvedStatusId,
            createdAt: order.CreatedAt || '',
            updatedAt: order.UpdatedAt || '',
            orderDate: order.OrderDate || '',
            orderDetails: order.OrderDetails || []
          };
        });
        applyFilters();
        renderOrdersTable();
      } else {
        console.error('Failed to load orders:', data);
        allOrdersTable = [];
        renderOrdersTable();
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      allOrdersTable = [];
      renderOrdersTable();
    }
  }

  // Apply filters to orders
  function applyFilters() {
    const statusFilter = document.getElementById('ordersFilterStatus')?.value || 'All';
    const categoryFilter = document.getElementById('ordersFilterCategory')?.value || 'All';
    const paymentFilter = document.getElementById('ordersFilterPayment')?.value || 'All';
    const orderTypeFilter = document.getElementById('ordersFilterOrderType')?.value || 'All';
    const dateFrom = document.getElementById('ordersFilterDateFrom')?.value || '';
    const dateTo = document.getElementById('ordersFilterDateTo')?.value || '';

    filteredOrdersTable = allOrdersTable.filter(order => {
      // Status filter
      if (!statusMatchesFilterTable(order.orderStatus, statusFilter)) {
        return false;
      }

      // Order type filter
      if (orderTypeFilter !== 'All') {
        const orderTypeLabel = getOrderTypeLabelTable(order);
        if (orderTypeLabel.toLowerCase() !== orderTypeFilter.toLowerCase()) {
          return false;
        }
      }

      // Payment filter
      if (paymentFilter !== 'All' && order.mop !== paymentFilter) {
        return false;
      }

      // Category filter (check order details)
      if (categoryFilter !== 'All') {
        const orderDetails = order.orderDetails || [];
        if (categoryFilter === 'Refill') {
          const hasRefill = orderDetails.some(d => 
            d.OrderCategoryName === 'Refill' || d.OrderCategoryName === 'Online'
          );
          if (!hasRefill) return false;
        } else if (categoryFilter === 'Brand New') {
          const hasBrandNew = orderDetails.some(d => 
            d.OrderCategoryName === 'Brand New' || d.OrderCategoryName === 'New Gallon'
          );
          if (!hasBrandNew) return false;
        } else if (categoryFilter === 'Mixed Order') {
          const hasRefill = orderDetails.some(d => 
            d.OrderCategoryName === 'Refill' || d.OrderCategoryName === 'Online'
          );
          const hasBrandNew = orderDetails.some(d => 
            d.OrderCategoryName === 'Brand New' || d.OrderCategoryName === 'New Gallon'
          );
          if (!(hasRefill && hasBrandNew)) return false;
        }
      }

      // Date filter
      if (dateFrom || dateTo) {
        const orderDate = order.orderDate || order.createdAt || '';
        const orderDateStr = orderDate.substring(0, 10); // Get YYYY-MM-DD part
        
        if (dateFrom && orderDateStr < dateFrom) {
          return false;
        }
        if (dateTo && orderDateStr > dateTo) {
          return false;
        }
      }

      return true;
    });
  }

  async function updateOrderStatus(orderId, newStatusId) {
    const paymentStatusId = getPaymentStatusIdForOrderStatus(newStatusId);
    try {
      const response = await fetch('../admin_backend/api/update_orders.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          OrderID: orderId,
          OrderStatusID: newStatusId,
          PaymentStatusID: paymentStatusId
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || data.error || 'Failed to update order status.');
      }

      const updatedStatusLabel = ORDER_STATUS_LABEL_BY_ID[newStatusId] || '';
      const updatedPaymentStatus = derivePaymentStatusLabelFromStatusId(newStatusId);
      const updatedAt = new Date().toISOString();

      const applyUpdate = (order) => {
        if (!order) return;
        order.orderStatusId = newStatusId;
        if (updatedStatusLabel) {
          order.orderStatus = updatedStatusLabel;
        }
        order.paymentStatusId = paymentStatusId;
        order.paymentStatus = updatedPaymentStatus;
        order.updatedAt = updatedAt;
      };

      const matchAll = allOrdersTable.find(o => String(o.id) === String(orderId));
      applyUpdate(matchAll);

      filteredOrdersTable.forEach(order => {
        if (String(order.id) === String(orderId)) {
          applyUpdate(order);
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      const message = error && error.message ? error.message : 'Failed to update order status. Please try again.';
      alert(message);
      throw error;
    }
  }

  // Render orders table
  function renderOrdersTable() {
    const tableBody = document.getElementById('approvedOrdersTableBody');
    if (!tableBody) return;

    applyFilters();

    if (filteredOrdersTable.length === 0) {
      tableBody.innerHTML = '<div class="orders-empty-state">No orders found</div>';
      return;
    }

    tableBody.innerHTML = '';

    const fragment = document.createDocumentFragment();

    filteredOrdersTable.forEach(order => {
      const resolvedStatusId = Number.isFinite(Number(order.orderStatusId))
        ? Number(order.orderStatusId)
        : (ORDER_STATUS_ID_BY_LABEL[(order.orderStatus || '').toLowerCase()] || DEFAULT_STATUS_ID);

      const row = document.createElement('tr');
      row.className = 'approved-orders-row';
      row.dataset.orderId = order.id;

      const createCell = content => {
        const cell = document.createElement('td');
        cell.className = 'table-cell-align';
        if (typeof content === 'string') {
          cell.textContent = content;
        } else if (content instanceof Node) {
          cell.appendChild(content);
        }
        return cell;
      };

      const statusBadge = document.createElement('span');
      statusBadge.className = `status-badge status-${getStatusClass(order.paymentStatus)}`;
      statusBadge.textContent = (order.paymentStatus || '-').toUpperCase();

      const statusWrapper = document.createElement('div');
      statusWrapper.className = 'order-status-dropdown-wrapper';
      statusWrapper.dataset.statusColor = ORDER_STATUS_COLOR_MAP[resolvedStatusId] || 'default';

      const statusSelect = document.createElement('select');
      statusSelect.className = 'order-status-dropdown';
      statusSelect.dataset.orderId = String(order.id);
      statusSelect.dataset.currentStatusId = String(resolvedStatusId);

      ORDER_STATUS_OPTIONS.forEach(option => {
        const opt = document.createElement('option');
        opt.value = String(option.id);
        opt.textContent = option.label;
        if (option.id === resolvedStatusId) {
          opt.selected = true;
        }
        statusSelect.appendChild(opt);
      });

      statusSelect.addEventListener('click', event => event.stopPropagation());
      statusSelect.addEventListener('change', async event => {
        event.stopPropagation();
        const dropdown = event.currentTarget;
        const orderId = dropdown.getAttribute('data-order-id');
        const previousId = parseInt(dropdown.getAttribute('data-current-status-id'), 10);
        const wrapper = dropdown.closest('.order-status-dropdown-wrapper');
        const previousColorKey = wrapper ? wrapper.dataset.statusColor || 'default' : 'default';
        const newStatusId = parseInt(dropdown.value, 10);

        if (Number.isNaN(newStatusId)) {
          dropdown.value = String(previousId);
          return;
        }

        if (newStatusId === previousId) {
          return;
        }

        dropdown.disabled = true;
        if (wrapper) {
          wrapper.dataset.statusColor = ORDER_STATUS_COLOR_MAP[newStatusId] || 'default';
          wrapper.classList.add('is-updating');
        }
        dropdown.setAttribute('data-current-status-id', String(newStatusId));
        try {
          await updateOrderStatus(orderId, newStatusId);
          renderOrdersTable();
        } catch (error) {
          dropdown.value = String(previousId);
          if (wrapper) {
            wrapper.dataset.statusColor = previousColorKey;
          }
          dropdown.setAttribute('data-current-status-id', String(previousId));
        } finally {
          dropdown.disabled = false;
          if (wrapper) {
            wrapper.classList.remove('is-updating');
          }
        }
      });

      statusWrapper.appendChild(statusSelect);

      const formatMoney = value => {
        const amount = Number(value) || 0;
        return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      const cells = [
        createCell(`#${order.id}`),
        createCell(order.customerName || '-'),
        createCell(order.orderType || '-'),
        createCell(order.receivingMethod || '-'),
        createCell(order.mop || '-'),
        createCell(formatMoney(order.total)),
        createCell(statusBadge),
        createCell(statusWrapper)
      ];

      cells.forEach(cell => row.appendChild(cell));

      row.addEventListener('click', () => {
        showOrderDetails(order.id);
      });

      fragment.appendChild(row);
    });

    tableBody.appendChild(fragment);
  }

  // Get status class for styling
  function getStatusClass(status) {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s.includes('completed') || s.includes('delivered') || s.includes('paid')) return 'completed';
    if (s.includes('cancelled')) return 'cancelled';
    if (s.includes('confirmed')) return 'confirmed';
    if (s.includes('in progress') || s.includes('ready') || s.includes('out for delivery') || s.includes('pending') || s.includes('approval')) return 'pending';
    return 'pending';
  }

  function formatDateTime(value) {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return value;
    }
  }

  function normaliseOrderType(order) {
    const raw = order.orderType || order.order_type || order.OrderTypeName || order.orderTypeName;
    if (raw) {
      const str = raw.toString();
      if (str.toLowerCase() === 'walkin' || str.toLowerCase() === 'walk-in') return 'Walk-in';
      if (str.toLowerCase() === 'online') return 'Online';
      if (str.toLowerCase() === 'manual') return 'Walk-in';
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
    const rawId = order.orderTypeId || order.OrderTypeID || order.OrderTypeId;
    if (Number(rawId) === 1) return 'Walk-in';
    if (Number(rawId) === 2) return 'Online';
    if (order.origin === 'manual' || order.isManualEntry) return 'Walk-in';
    return '';
  }

  function normaliseReceivingMethod(order) {
    const raw = order.receivingMethod || order.receiving_method || order.ReceivingMethodName || order.receivingMethodName;
    if (raw) return raw;
    const id = order.receivingMethodId || order.ReceivingMethodID || order.ReceivingMethodId;
    if (Number(id) === 2) return 'Delivery';
    if (Number(id) === 1) return 'Pickup';
    return '';
  }

  function normalisePaymentMethod(order) {
    const raw = order.modeOfPayment || order.mop || order.MOPName || order.paymentMethod || order.payment_method;
    if (raw) return raw;
    const id = order.MOPID || order.mopId;
    if (Number(id) === 2) return 'GCash';
    if (Number(id) === 3) return 'Loan';
    return Number(id) === 1 ? 'Cash' : '';
  }

  function normaliseCustomerType(order) {
    const raw = order.customerType || order.CustomerTypeName || order.customer_type;
    if (raw) return raw;
    const id = order.customerTypeId || order.CustomerTypeID || order.CustomerTypeId;
    if (Number(id) === 2) return 'Dealer';
    if (Number(id) === 1) return 'Regular';
    return '';
  }

  function renderStatusChip(label, value) {
    if (!value) return '';
    return `
      <div class="status-block">
        <span class="status-label">${label}</span>
        <span class="status-chip status-${getStatusClass(value)}">${value}</span>
      </div>
    `;
  }

  function buildOrderDetailsHTML(order) {
    if (!order) {
      return '<div class="order-empty-state"><p>Order details are unavailable.</p></div>';
    }

    const orderId = order.id ?? order.orderId ?? order.OrderID ?? '-';
    const customerName = (
      order.customerName ||
      order.CustomerName ||
      order.customer ||
      `${order.firstName || ''} ${order.lastName || ''}`.trim()
    ) || 'Customer';
    const username = order.customerUsername || order.CustomerUsername || order.username || order.accountUsername || '';
    const orderType = normaliseOrderType(order);
    const receivingMethod = normaliseReceivingMethod(order);
    const paymentMethod = normalisePaymentMethod(order);
    const customerType = normaliseCustomerType(order);
    const paymentStatus = order.paymentStatus || order.PaymentStatusName || order.PaymentStatus || '';
    const orderStatus = order.orderStatus || order.OrderStatusName || order.OrderStatus || '';
    const totalAmountRaw = order.total ?? order.TotalAmount ?? order.grandTotal ?? order.Total ?? 0;
    const totalAmount = Number.isFinite(Number(totalAmountRaw)) ? Number(totalAmountRaw) : 0;
    const createdAtRaw = order.createdAt || order.CreatedAt || order.Date || order.date || order.OrderDate;
    const updatedAtRaw = order.updatedAt || order.UpdatedAt || createdAtRaw;
    const address = order.deliveryAddress || order.address || order.DeliveryAddress || '';
    const contact = order.phone || order.contactNumber || order.CustomerPhone || '';
    const email = order.email || order.customerEmail || '';
    const notes = order.notes || order.specialInstructions || order.comments || '';

    const itemsSource = order.orderDetails || order.OrderDetails || order.details || [];
    const items = (Array.isArray(itemsSource) ? itemsSource : []).map(item => {
      const quantity = Number(item.Quantity ?? item.qty ?? item.quantity ?? 0) || 0;
      const unitPrice = Number(item.UnitPrice ?? item.unitPrice ?? item.price ?? 0) || 0;
      const subtotal = Number(item.Subtotal ?? item.subtotal ?? quantity * unitPrice) || 0;
      return {
        container: item.ContainerTypeName || item.container || item.containerType || item.container_type || '-',
        category: item.OrderCategoryName || item.category || item.orderCategory || item.OrderCategory || '-',
        quantity,
        unitPrice,
        subtotal
      };
    });
    const itemsCount = items.length;
    const itemsTotal = items.reduce((sum, item) => sum + (Number.isFinite(item.subtotal) ? item.subtotal : 0), 0);

    const createdAt = formatDateTime(createdAtRaw);
    const updatedAt = formatDateTime(updatedAtRaw);

    const summaryData = [
      { label: 'Order Type', value: orderType },
      { label: 'Customer Type', value: customerType },
      { label: 'Receiving Method', value: receivingMethod },
      { label: 'Payment Method', value: paymentMethod },
      { label: 'Total Amount', value: formatMoney(totalAmount), emphasis: true }
    ].filter(item => item.value && String(item.value).trim());

    const summaryCards = summaryData.map(item => `
      <div class="order-summary-card ${item.emphasis ? 'is-emphasis' : ''}">
        <span class="order-summary-label">${item.label}</span>
        <span class="order-summary-value">${item.value}</span>
      </div>
    `).join('');

    const addressSection = (address || contact || email) ? `
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
          ${email ? `
            <div class="order-info-row">
              <span class="order-info-label">Email</span>
              <span class="order-info-value">${email}</span>
            </div>` : ''}
        </div>
      </div>
    ` : '';

    const notesSection = notes ? `
      <div class="order-info-card">
        <div class="order-info-card-header">
          <h4>Notes</h4>
        </div>
        <div class="order-info-body">
          <div class="order-info-value">${notes}</div>
        </div>
      </div>
    ` : '';

    const itemsSection = itemsCount ? `
      <div class="order-info-card">
        <div class="order-info-card-header">
          <h4>Order Items</h4>
          <span class="order-info-chip">${itemsCount} item${itemsCount === 1 ? '' : 's'}</span>
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
                <td>${formatMoney(itemsTotal || totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    ` : `
      <div class="order-info-card">
        <div class="order-info-card-header">
          <h4>Order Items</h4>
        </div>
        <div class="order-empty-state">
          <p>No items recorded for this order.</p>
        </div>
      </div>
    `;

    return `
      <div class="order-details-wrapper">
        <div class="order-details-header">
          <div class="order-header-main">
            <div class="order-meta-row">
              <span class="order-number">#${orderId}</span>
              ${orderType ? `<span class="order-tag">${orderType}</span>` : ''}
              ${username ? `<span class="order-tag is-muted">@${username}</span>` : ''}
            </div>
            <h3>${customerName}</h3>
            <div class="order-meta-details">
              ${createdAt ? `<span>Created ${createdAt}</span>` : ''}
              ${(createdAt && updatedAt && createdAt !== updatedAt) ? '<span class="dot-separator"></span>' : ''}
              ${(updatedAt && createdAt !== updatedAt) ? `<span>Updated ${updatedAt}</span>` : ''}
            </div>
          </div>
          <div class="order-status-group">
            ${renderStatusChip('Order Status', orderStatus || 'Pending')}
            ${renderStatusChip('Payment Status', paymentStatus || 'Pending')}
          </div>
        </div>
        ${summaryCards ? `<div class="order-summary-grid">${summaryCards}</div>` : ''}
        ${addressSection}
        ${notesSection}
        ${itemsSection}
      </div>
    `;
  }

  // Expose builder for other modules (e.g., dashboard view)
  window.__buildOrderDetailsHTML = buildOrderDetailsHTML;

  // Show order details modal
  function showOrderDetails(orderId) {
    if (typeof window.viewOrderDetails === 'function') {
      window.viewOrderDetails(orderId);
      return;
    }

    const order = allOrdersTable.find(o => o.id == orderId);
    if (!order) return;

    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    if (!modal || !content) return;

    content.innerHTML = buildOrderDetailsHTML(order);
    modal.style.display = 'flex';
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    // Wire up filter buttons
    const applyBtn = document.getElementById('ordersApplyBtn');
    const resetBtn = document.getElementById('ordersResetBtn');
    const modalClose = document.getElementById('orderDetailsModalClose');
    const modal = document.getElementById('orderDetailsModal');

    if (applyBtn) {
      applyBtn.addEventListener('click', function() {
        renderOrdersTable();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        const statusFilter = document.getElementById('ordersFilterStatus');
        const categoryFilter = document.getElementById('ordersFilterCategory');
        const paymentFilter = document.getElementById('ordersFilterPayment');
        const orderTypeFilter = document.getElementById('ordersFilterOrderType');
        const dateFrom = document.getElementById('ordersFilterDateFrom');
        const dateTo = document.getElementById('ordersFilterDateTo');

        if (statusFilter) statusFilter.value = 'All';
        if (categoryFilter) categoryFilter.value = 'All';
        if (paymentFilter) paymentFilter.value = 'All';
        if (orderTypeFilter) orderTypeFilter.value = 'All';
        if (dateFrom) dateFrom.value = '';
        if (dateTo) dateTo.value = '';

        renderOrdersTable();
      });
    }

    // Close modal
    if (modalClose) {
      modalClose.addEventListener('click', function() {
        if (modal) modal.style.display = 'none';
      });
    }

    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }

    // Load orders when orders view is shown
    // Use a wrapper to preserve existing switchView overrides
    const setupOrdersViewLoader = () => {
      if (window.__ADMIN_ORDERS_MODULE__) {
        return;
      }
      const existingSwitchView = window.switchView;
      if (existingSwitchView) {
        window.switchView = function(viewName) {
          existingSwitchView(viewName);
          if (viewName === 'orders') {
            loadOrdersTable();
          }
        };
      }
    };
    
    // Wait a bit to ensure other modules have set up their switchView handlers
    setTimeout(setupOrdersViewLoader, 100);
  });

  // Make functions available globally without overriding existing implementations
  if (typeof window.loadOrdersTable !== 'function') {
    window.loadOrdersTable = loadOrdersTable;
  }
  if (typeof window.renderOrdersTable !== 'function') {
    window.renderOrdersTable = renderOrdersTable;
  }
  if (typeof window.loadOrdersForTable !== 'function') {
    window.loadOrdersForTable = loadOrdersTable;
  }
})();


