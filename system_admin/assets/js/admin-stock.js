// Stock Management functionality (server-backed)
(function() {
  const STORAGE_KEY_STOCKS = 'container_stocks';
  const STORAGE_KEY_LOGS = 'container_stock_logs';
  
  let currentContainerTypeID = null;
  let currentContainerName = '';
  
  // Initialize default stock values if not exists
  function initStocks() {
    const stocks = getStocks();
    if (!stocks['1'] && !stocks['2']) {
      // Initialize with default values
      setStock(1, 0);
      setStock(2, 0);
    }
  }
  
  // Get stocks from localStorage
  function getStocks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STOCKS);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }
  
  // Set stock value
  function setStock(containerTypeID, value) {
    const stocks = getStocks();
    stocks[containerTypeID] = value;
    localStorage.setItem(STORAGE_KEY_STOCKS, JSON.stringify(stocks));
  }
  
  // Get stock value
  function getStock(containerTypeID) {
    const stocks = getStocks();
    return stocks[containerTypeID] || 0;
  }
  
  // Get all logs from localStorage
  function getLogs() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOGS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }
  
  // Add log entry
  function addLog(log) {
    const logs = getLogs();
    logs.unshift(log); // Add to beginning
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(100);
    }
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }
  
  // Calculate Available Gallons (Slim + Round)
  function calculateAvailableGallons() {
    const slim = getStock(1);
    const round = getStock(2);
    return slim + round;
  }
  
  // Load stock values for dashboard
  function loadStockValues() {
    const slim = getStock(1);
    const round = getStock(2);
    const available = calculateAvailableGallons();
    
    const slimEl = document.getElementById('slimContainers');
    const roundEl = document.getElementById('roundContainers');
    const availableEl = document.getElementById('availableGallons');
    
    if (slimEl) slimEl.textContent = slim;
    if (roundEl) roundEl.textContent = round;
    if (availableEl) availableEl.textContent = available;
  }
  
  // Render stock logs with filter
  function renderStockLogs(filterType = 'all') {
    const logsBody = document.getElementById('stockLogsTableBody');
    const logsCountEl = document.getElementById('stockLogsCount');
    if (!logsBody) return;
    
    let logs = getLogs();
    
    // Filter logs
    if (filterType !== 'all') {
      logs = logs.filter(log => String(log.ContainerTypeID) === String(filterType));
    }
    
    // Update count badge
    if (logsCountEl) {
      const count = logs.length;
      logsCountEl.textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;
    }
    
    if (!logs || logs.length === 0) {
      logsBody.innerHTML = `
        <div class="stock-logs-empty">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12h6m-3-3v6m-9 1V7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
          <p>No stock logs yet</p>
          <span>Stock transactions will appear here once you start adding stock</span>
        </div>
      `;
      return;
    }
    
    const containerNames = { '1': 'Slim', '2': 'Round' };
    
    logsBody.innerHTML = logs.map(log => {
      const date = new Date(log.CreatedAt);
      const formattedDate = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const containerName = containerNames[String(log.ContainerTypeID)] || 'Unknown';
      
      return `
        <div class="stock-logs-row">
          <div>${containerName}</div>
          <div>${formattedDate}</div>
          <div>${log.QuantityAdded || 0}</div>
          <div>${log.StockBefore || 0}</div>
          <div>${log.StockAfter || 0}</div>
          <div>${log.Notes || '-'}</div>
        </div>
      `;
    }).join('');
  }
  
  // Open stock edit modal (for Slim/Round)
  function openStockEditModal(containerTypeID, containerName) {
    currentContainerTypeID = containerTypeID;
    currentContainerName = containerName;
    const titleNameMap = {
      'Slim Containers': 'Slim Containers',
      'Round Containers': 'Round Containers',
      'Slim': 'Slim Containers',
      'Round': 'Round Containers'
    };
    const resolvedName = titleNameMap[containerName] || (containerTypeID === 2 ? 'Round Containers' : 'Slim Containers');
    
    const modal = document.getElementById('stockEditModal');
    const modalTitle = document.getElementById('stockEditModalTitle');
    const containerTypeInput = document.getElementById('stockEditContainerTypeID');
    const currentValueEl = document.getElementById('stockEditCurrentValue');
    
    if (modalTitle) {
      modalTitle.textContent = `${resolvedName} - Edit Stock`;
    }
    
    if (containerTypeInput) {
      containerTypeInput.value = containerTypeID;
    }
    
    if (currentValueEl) {
      currentValueEl.textContent = getStock(containerTypeID);
    }
    
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }
  
  // Open stock logs modal (for Available Gallons)
  function openStockLogsModal() {
    const modal = document.getElementById('stockLogsModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      // Load and render logs
      renderStockLogs('all');
    }
  }
  
  // Close stock edit modal
  function closeStockEditModal() {
    const modal = document.getElementById('stockEditModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      
      // Reset form
      const form = document.getElementById('stockEditForm');
      if (form) {
        form.reset();
      }
    }
  }
  
  // Close stock logs modal
  function closeStockLogsModal() {
    const modal = document.getElementById('stockLogsModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
  
  // Handle stock edit form submission
  function handleStockEditFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const quantity = parseInt(formData.get('quantity'));
    
    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity greater than 0');
      return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Adding...';
    }
    
    try {
      const stockBefore = getStock(currentContainerTypeID);
      const stockAfter = stockBefore + quantity;
      
      // Update stock
      setStock(currentContainerTypeID, stockAfter);
      
      // Add log entry
      addLog({
        ContainerTypeID: currentContainerTypeID,
        QuantityAdded: quantity,
        StockBefore: stockBefore,
        StockAfter: stockAfter,
        Notes: '',
        CreatedAt: new Date().toISOString()
      });
      
      // Reload dashboard values
      loadStockValues();
      
      // Update current value in modal
      const currentValueEl = document.getElementById('stockEditCurrentValue');
      if (currentValueEl) {
        currentValueEl.textContent = stockAfter;
      }
      
      // Reset form
      form.reset();
      
      alert('Stock added successfully!');
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Error adding stock. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Stock';
      }
    }
  }
  
  // Initialize stock management
  function initStockManagement() {
    // Initialize stocks
    initStocks();
    
    // Load initial values
    loadStockValues();
    
    // Make cards clickable
    const clickableCards = document.querySelectorAll('.clickable-card');
    clickableCards.forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function() {
        const action = this.getAttribute('data-action');
        
        if (action === 'view-logs') {
          // Open logs modal
          openStockLogsModal();
        } else if (action === 'edit-stock') {
          // Open edit modal
          const containerTypeID = parseInt(this.getAttribute('data-container-type'));
          const containerName = this.getAttribute('data-container-name');
          openStockEditModal(containerTypeID, containerName);
        }
      });
    });
    
    // Stock Edit Modal close handlers
    const editModalCloseBtn = document.getElementById('stockEditModalClose');
    const editModalCancelBtn = document.getElementById('stockEditFormCancel');
    const editModalOverlay = document.getElementById('stockEditModal');
    
    if (editModalCloseBtn) {
      editModalCloseBtn.addEventListener('click', closeStockEditModal);
    }
    
    if (editModalCancelBtn) {
      editModalCancelBtn.addEventListener('click', closeStockEditModal);
    }
    
    if (editModalOverlay) {
      editModalOverlay.addEventListener('click', function(e) {
        if (e.target === editModalOverlay) {
          closeStockEditModal();
        }
      });
    }
    
    // Stock Logs Modal close handlers
    const logsModalCloseBtn = document.getElementById('stockLogsModalClose');
    const logsModalOverlay = document.getElementById('stockLogsModal');
    
    if (logsModalCloseBtn) {
      logsModalCloseBtn.addEventListener('click', closeStockLogsModal);
    }
    
    if (logsModalOverlay) {
      logsModalOverlay.addEventListener('click', function(e) {
        if (e.target === logsModalOverlay) {
          closeStockLogsModal();
        }
      });
    }
    
    // Stock Edit Form submission
    const stockEditForm = document.getElementById('stockEditForm');
    if (stockEditForm) {
      stockEditForm.addEventListener('submit', handleStockEditFormSubmit);
    }
    
    // Stock Logs Filter
    const stockLogsFilter = document.getElementById('stockLogsFilter');
    if (stockLogsFilter) {
      stockLogsFilter.addEventListener('change', function(e) {
        renderStockLogs(e.target.value);
      });
    }
  }
  
  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    initStockManagement();
  });
  
  // Expose loadStockValues for refresh
  window.loadStockValues = loadStockValues;
})();


