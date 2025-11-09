// Loans Page functionality
(function() {
  const API_ORDERS = '../admin_backend/api/read_orders.php';
  
  let allLoansData = [];
  let filteredLoansData = [];
  
  // Loans elements
  let loansFilterPaymentStatus, loansFilterOrderStatus, loansFilterDateFrom, loansFilterDateTo;
  let loansSearch, loansApplyBtn, loansResetBtn, loansTableBody;
  let loansTotalOutstanding, loansTotalOrders, loansPaidCount, loansRepayRate;
  let loansViewReportsBtn;

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

  const ORDER_STATUS_IDS = Object.keys(ORDER_STATUSES).map(Number);
  const ORDER_STATUS_NAME_TO_ID = ORDER_STATUS_IDS.reduce((acc, id) => {
    const name = ORDER_STATUSES[id];
    if (name) {
      acc[name.toLowerCase()] = id;
    }
    return acc;
  }, {});

  const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  });

  const ORDER_STATUS_BADGE_MAP = {
    'for approval': 'status-for-approval',
    'pending': 'status-pending',
    'confirmed': 'status-confirmed',
    'processing': 'status-in-progress',
    'in progress': 'status-in-progress',
    'in-progress': 'status-in-progress',
    'ready for pickup': 'status-ready-for-pickup',
    'ready-for-pickup': 'status-ready-for-pickup',
    'ready for pick up': 'status-ready-for-pickup',
    'out for delivery': 'status-out-for-delivery',
    'out-for-delivery': 'status-out-for-delivery',
    'completed': 'status-completed',
    'delivered': 'status-completed',
    'cancelled': 'status-cancelled'
  };

  function toNumberLoans(value) {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]/g, '');
      if (!cleaned) return 0;
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatStatusLabel(status, fallback = 'Pending') {
    const label = (status || fallback || '').toString().trim();
    return label ? label.toUpperCase() : fallback.toUpperCase();
  }

  function getOrderStatusBadge(status) {
    const normalized = (status || '').toString().toLowerCase().trim();
    const badgeClass = ORDER_STATUS_BADGE_MAP[normalized] || 'status-pending';
    return `<span class="status-badge ${badgeClass}">${formatStatusLabel(status)}</span>`;
  }
  
  // Function to get loan elements
  function getLoanElements() {
    loansFilterPaymentStatus = document.getElementById('loansFilterPaymentStatus');
    loansFilterOrderStatus = document.getElementById('loansFilterOrderStatus');
    loansFilterDateFrom = document.getElementById('loansFilterDateFrom');
    loansFilterDateTo = document.getElementById('loansFilterDateTo');
    loansSearch = document.getElementById('loansSearch');
    loansApplyBtn = document.getElementById('loansApplyBtn');
    loansResetBtn = document.getElementById('loansResetBtn');
    loansTableBody = document.getElementById('loansTableBody');
    loansTotalOutstanding = document.getElementById('loansTotalOutstanding');
    loansTotalOrders = document.getElementById('loansTotalOrders');
    loansPaidCount = document.getElementById('loansPaidCount');
    loansRepayRate = document.getElementById('loansRepayRate');
    loansViewReportsBtn = document.getElementById('loansViewReportsBtn');
  }
  
  // Load loan orders from API
  async function loadLoans() {
    try {
      const response = await fetch(API_ORDERS, { credentials: 'include' });
      const data = await response.json();
      
      if (data && data.success && data.data) {
        // Filter orders with loan payment method
        allLoansData = data.data
          .filter(order => (order.MOPName || '').toLowerCase() === 'loan')
          .map(order => ({
            id: order.OrderID,
            customerName: order.CustomerName || '',
            orderType: order.OrderTypeName || '',
            total: toNumberLoans(order.TotalAmount ?? order.Total ?? order.GrandTotal ?? 0),
            paymentStatus: order.PaymentStatusName || '',
            orderStatus: order.OrderStatusName || '',
            orderStatusID: Number(order.OrderStatusID) || getOrderStatusId(order.OrderStatusName),
            createdAt: order.CreatedAt || '',
            updatedAt: order.UpdatedAt || '',
            details: Array.isArray(order.OrderDetails) ? order.OrderDetails : []
          }));
        filteredLoansData = [...allLoansData];
        updateLoansStatistics();
        renderLoansTable();
      } else {
        allLoansData = [];
        filteredLoansData = [];
        updateLoansStatistics();
        renderLoansTable();
      }
    } catch (error) {
      console.error('Error loading loans:', error);
      allLoansData = [];
      filteredLoansData = [];
      updateLoansStatistics();
      renderLoansTable();
    }
  }
  
  // Calculate days difference
  function diffDays(dateStr1, dateStr2) {
    if (!dateStr1 || !dateStr2) return 0;
    const ms = Math.abs(new Date(dateStr1) - new Date(dateStr2));
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }
  
  // Update loans statistics
  function updateLoansStatistics() {
    const outstanding = allLoansData
      .filter(o => (o.paymentStatus || '').toLowerCase() !== 'paid')
      .reduce((sum, o) => sum + toNumberLoans(o.total), 0);
    
    const totalOrders = allLoansData.length;
    
    const paidCount = allLoansData.filter(o => 
      (o.paymentStatus || '').toLowerCase() === 'paid'
    ).length;
    
    const paidLoans = allLoansData.filter(o => 
      (o.paymentStatus || '').toLowerCase() === 'paid'
    );
    const repaidFast = paidLoans.filter(o => diffDays(o.createdAt, o.updatedAt) <= 15);
    const rate = paidLoans.length ? Math.round((repaidFast.length / paidLoans.length) * 100) : 0;
    
    if (loansTotalOutstanding) {
      loansTotalOutstanding.textContent = formatMoneyLoans(outstanding);
    }
    if (loansTotalOrders) {
      loansTotalOrders.textContent = totalOrders;
    }
    if (loansPaidCount) {
      loansPaidCount.textContent = paidCount;
    }
    if (loansRepayRate) {
      loansRepayRate.textContent = `${rate}%`;
    }
  }
  
  // Format money
  function formatMoneyLoans(value) {
    const amount = toNumberLoans(value);
    try {
      return pesoFormatter.format(amount);
    } catch {
      return `₱${amount.toFixed(2)}`;
    }
  }
  
  // Get payment status badge class
  function getPaymentStatusClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'delivered' || s === 'paid') return 'status-completed';
    if (s === 'cancelled') return 'status-cancelled';
    return 'status-pending';
  }
  
  // Apply filters
  function applyLoansFilters() {
    if (!loansFilterPaymentStatus || !loansFilterOrderStatus) {
      getLoanElements();
    }
    
    const paymentStatus = loansFilterPaymentStatus?.value || 'All';
    const orderStatus = loansFilterOrderStatus?.value || 'All';
    const dateFrom = loansFilterDateFrom?.value || '';
    const dateTo = loansFilterDateTo?.value || '';
    const searchQuery = (loansSearch?.value || '').toLowerCase();
    
    filteredLoansData = allLoansData.filter(loan => {
      // Payment status filter
      if (paymentStatus !== 'All') {
        const loanPaymentStatus = (loan.paymentStatus || '').toLowerCase();
        const filterStatus = paymentStatus.toLowerCase();
        if (loanPaymentStatus !== filterStatus && !loanPaymentStatus.includes(filterStatus)) {
          return false;
        }
      }
      
      // Order status filter
      if (orderStatus !== 'All') {
        const loanOrderStatus = (loan.orderStatus || '').toLowerCase();
        const filterStatus = orderStatus.toLowerCase();
        if (loanOrderStatus !== filterStatus && !loanOrderStatus.includes(filterStatus)) {
          return false;
        }
      }
      
      // Date filter
      if (dateFrom || dateTo) {
        const loanDate = loan.createdAt ? loan.createdAt.substring(0, 10) : '';
        if (dateFrom && loanDate < dateFrom) return false;
        if (dateTo && loanDate > dateTo) return false;
      }
      
      // Search filter
      if (searchQuery) {
        const idMatch = String(loan.id).includes(searchQuery);
        const customerMatch = (loan.customerName || '').toLowerCase().includes(searchQuery);
        if (!idMatch && !customerMatch) return false;
      }
      
      return true;
    });
    
    renderLoansTable();
  }
  
  // Reset filters
  function resetLoansFilters() {
    if (!loansFilterPaymentStatus || !loansFilterOrderStatus) {
      getLoanElements();
    }
    
    if (loansFilterPaymentStatus) loansFilterPaymentStatus.value = 'All';
    if (loansFilterOrderStatus) loansFilterOrderStatus.value = 'All';
    if (loansFilterDateFrom) loansFilterDateFrom.value = '';
    if (loansFilterDateTo) loansFilterDateTo.value = '';
    if (loansSearch) loansSearch.value = '';
    
    filteredLoansData = [...allLoansData];
    renderLoansTable();
  }
  
  // Render loans table
  function renderLoansTable() {
    if (!loansTableBody) {
      loansTableBody = document.getElementById('loansTableBody');
    }
    if (!loansTableBody) return;
    
    loansTableBody.innerHTML = '';
    
    if (filteredLoansData.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'orders-empty-row';
      const emptyCell = document.createElement('td');
      emptyCell.className = 'orders-empty-state';
      emptyCell.colSpan = 8;
      emptyCell.textContent = 'No loan orders found';
      emptyRow.appendChild(emptyCell);
      loansTableBody.appendChild(emptyRow);
      return;
    }
    
    filteredLoansData.forEach(loan => {
      const daysOld = diffDays(loan.createdAt, new Date());
      const orderDate = loan.createdAt ? loan.createdAt.substring(0, 10) : '-';
      const paymentStatusClass = getPaymentStatusClass(loan.paymentStatus);
      const paymentStatusLabel = formatStatusLabel(loan.paymentStatus, 'Pending');
      const customerName = loan.customerName || '-';
      const orderType = loan.orderType || '-';
      const orderStatusBadge = getOrderStatusBadge(loan.orderStatus);
      
      const row = document.createElement('tr');
      row.className = 'approved-orders-row loans-table-row';
      row.dataset.orderId = loan.id;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      
      row.innerHTML = `
        <td>#${loan.id}</td>
        <td>${customerName}</td>
        <td>${orderType}</td>
        <td class="loans-total-amount">${formatMoneyLoans(loan.total)}</td>
        <td><span class="status-badge ${paymentStatusClass}">${paymentStatusLabel}</span></td>
        <td>${orderStatusBadge}</td>
        <td>${orderDate}</td>
        <td class="loans-days-old">${daysOld} days</td>
      `;

      row.addEventListener('click', () => {
        if (typeof window.viewLoanOrderDetails === 'function') {
          window.viewLoanOrderDetails(loan.id);
        }
      });
      
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (typeof window.viewLoanOrderDetails === 'function') {
            window.viewLoanOrderDetails(loan.id);
          }
        }
      });
      
      loansTableBody.appendChild(row);
    });
  }
  
  function getOrderStatusId(statusName) {
    if (!statusName) return 2;
    const key = statusName.toString().toLowerCase();
    return ORDER_STATUS_NAME_TO_ID[key] || 2;
  }

  function deriveLoanPaymentStatus(statusId) {
    if (statusId === 7) return 'Paid';
    if (statusId === 8) return 'Cancelled';
    return 'Pending';
  }

  function applyLoanStatusLocal(orderId, statusId) {
    const statusName = ORDER_STATUSES[statusId] || ORDER_STATUSES[2];
    const paymentStatus = deriveLoanPaymentStatus(statusId);
    const updateLoan = (loan) => {
      if (!loan || loan.id !== orderId) return;
      loan.orderStatusID = statusId;
      loan.orderStatus = statusName;
      loan.paymentStatus = paymentStatus;
      loan.updatedAt = new Date().toISOString();
    };

    const loanRef = allLoansData.find(l => l.id === orderId);
    if (loanRef) {
      updateLoan(loanRef);
    }

    const filteredRef = filteredLoansData.find(l => l.id === orderId);
    if (filteredRef) {
      updateLoan(filteredRef);
    }
  }

  async function handleLoanStatusChange(orderId, newStatusID, selectEl) {
    const previousValue = parseInt(selectEl?.dataset.previousValue || '0', 10) || newStatusID;
    if (selectEl) {
      selectEl.disabled = true;
    }

    try {
      if (typeof window.updateOrderStatus === 'function') {
        await window.updateOrderStatus(orderId, newStatusID);
      } else {
        throw new Error('Order status updater is not available.');
      }

      applyLoanStatusLocal(orderId, newStatusID);
      updateLoansStatistics();
      renderLoansTable();
    } catch (error) {
      console.error('Failed to update loan order status:', error);
      alert('Failed to update order status. Please try again.');
      if (selectEl) {
        selectEl.value = previousValue;
      }
    } finally {
      if (selectEl && document.body.contains(selectEl)) {
        selectEl.disabled = false;
        selectEl.dataset.previousValue = selectEl.value;
      }
    }
  }
  
  // View loan order details (can link to Orders page)
  window.viewLoanOrderDetails = function(orderId) {
    if (typeof window.switchView === 'function') {
      window.switchView('orders');
      setTimeout(() => {
        if (typeof window.focusOrderRowInOrdersTable === 'function') {
          window.focusOrderRowInOrdersTable(orderId, { openDetails: true, openDetailsDelay: 350 });
        } else if (typeof window.viewOrderDetails === 'function') {
          window.viewOrderDetails(orderId);
        }
      }, 150);
    }
  };
  
  // Wire up event listeners
  function wireLoansPage() {
    getLoanElements();
    
    if (loansApplyBtn) {
      loansApplyBtn.addEventListener('click', applyLoansFilters);
    }
    
    if (loansResetBtn) {
      loansResetBtn.addEventListener('click', resetLoansFilters);
    }
    
    // Auto-apply on filter change
    [loansFilterPaymentStatus, loansFilterOrderStatus, loansFilterDateFrom, loansFilterDateTo].forEach(el => {
      if (el) {
        el.removeEventListener('change', applyLoansFilters);
        el.addEventListener('change', applyLoansFilters);
      }
    });
    
    // Search on input
    if (loansSearch) {
      loansSearch.addEventListener('input', applyLoansFilters);
    }
    
    // View Reports button - switch to Reports and show Loans tab
    if (loansViewReportsBtn) {
      loansViewReportsBtn.addEventListener('click', () => {
        if (typeof window.switchView === 'function') {
          window.switchView('reports');
          // Switch to loans tab in reports
          setTimeout(() => {
            const loansTab = document.querySelector('.tab[data-tab="loans"]');
            if (loansTab) {
              loansTab.click();
            }
          }, 100);
        }
      });
    }
  }
  
  // Initialize when Loans view is shown
  function initLoansPage() {
    wireLoansPage();
    loadLoans();
  }
  
  // Expose render function globally for switchView
  window.renderLoansPage = function() {
    wireLoansPage();
    loadLoans();
  };
  
  // Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on loans page initially
    const loansView = document.getElementById('view-loans');
    if (loansView && loansView.style.display !== 'none') {
      initLoansPage();
    }
  });
})();
   
