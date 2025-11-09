/* ============================================
   SYSTEM CONFIGURATION (Using localStorage for testing)
   ============================================ */
(function() {
  const STORAGE_KEY = 'system_config';
  
  // Get default config
  function getDefaultConfig() {
    return {
      daily_order_limit: '300',
      available_capacity: '300',
      maintenance_notices: [],
      maintenance_active: '0',
      maintenance_title: '',
      maintenance_message: '',
      maintenance_start_date: '',
      maintenance_end_date: '',
      maintenance_id: '',
      maintenance_created_at: ''
    };
  }

  function getStoredConfig() {
    const stored = localStorage.getItem(STORAGE_KEY);
    const config = stored ? JSON.parse(stored) : getDefaultConfig();
    if (!Array.isArray(config.maintenance_notices)) {
      config.maintenance_notices = [];
    }
    return config;
  }

  function deriveLegacyMaintenanceFields(config) {
    const notices = Array.isArray(config.maintenance_notices) ? config.maintenance_notices : [];
    const latest = notices.length ? notices[notices.length - 1] : null;

    config.maintenance_active = latest ? '1' : '0';
    config.maintenance_title = latest ? latest.title || '' : '';
    config.maintenance_message = latest ? latest.message || '' : '';
    config.maintenance_start_date = latest ? latest.startDate || '' : '';
    config.maintenance_end_date = latest ? latest.endDate || '' : '';
    config.maintenance_id = latest ? latest.id || '' : '';
    config.maintenance_created_at = latest ? latest.createdAt || '' : '';
  }

  function persistConfig(config) {
    deriveLegacyMaintenanceFields(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function formatDisplayDate(dateTimeStr) {
    if (!dateTimeStr) return '';
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return dateTimeStr;
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (err) {
      return dateTimeStr;
    }
  }

  function renderMaintenanceNoticesList(notices) {
    const list = document.getElementById('maintenanceNoticesList');
    if (!list) return;

    list.innerHTML = '';

    if (!Array.isArray(notices) || !notices.length) {
      const empty = document.createElement('p');
      empty.className = 'maintenance-notices-empty';
      empty.textContent = 'No maintenance notices have been added yet.';
      list.appendChild(empty);
      return;
    }

    const noticesToRender = [...notices].reverse(); // newest first
    noticesToRender.forEach((notice) => {
      const card = document.createElement('article');
      card.className = 'maintenance-notice-card';
      card.setAttribute('data-notice-id', notice.id);

      const header = document.createElement('div');
      header.className = 'maintenance-notice-card-header';

      const title = document.createElement('h4');
      title.className = 'maintenance-notice-card-title';
      title.textContent = notice.title || 'Untitled Notice';
      header.appendChild(title);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'maintenance-notice-delete';
      deleteBtn.setAttribute('data-id', notice.id);
      deleteBtn.setAttribute('aria-label', `Delete notice "${title.textContent}"`);
      deleteBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path d="M9 3a1 1 0 0 0-1 1v1H5.5a.5.5 0 0 0 0 1h.8l.54 11.09A2 2 0 0 0 8.83 19h6.34a2 2 0 0 0 1.99-1.91L17.7 6h.8a.5.5 0 0 0 0-1H16V4a1 1 0 0 0-1-1H9Zm1 2V4h4v1h-4Zm.25 4.25a.5.5 0 0 0-.5.52l.25 6a.5.5 0 1 0 1-.04l-.25-6a.5.5 0 0 0-.5-.48Zm4.5 0a.5.5 0 0 0-.5.48l-.25 6a.5.5 0 1 0 1 .04l.25-6a.5.5 0 0 0-.5-.52Z" fill="currentColor"></path>
        </svg>
      `;
      header.appendChild(deleteBtn);

      card.appendChild(header);

      if (notice.message) {
        const message = document.createElement('p');
        message.className = 'maintenance-notice-card-message';
        message.textContent = notice.message;
        card.appendChild(message);
      }

      const meta = document.createElement('dl');
      meta.className = 'maintenance-notice-card-meta';

      if (notice.startDate) {
        const startLabel = document.createElement('dt');
        startLabel.textContent = 'Start:';
        const startValue = document.createElement('dd');
        startValue.textContent = formatDisplayDate(notice.startDate);
        meta.appendChild(startLabel);
        meta.appendChild(startValue);
      }

      if (notice.endDate) {
        const endLabel = document.createElement('dt');
        endLabel.textContent = 'End:';
        const endValue = document.createElement('dd');
        endValue.textContent = formatDisplayDate(notice.endDate);
        meta.appendChild(endLabel);
        meta.appendChild(endValue);
      }

      if (notice.createdAt) {
        const createdLabel = document.createElement('dt');
        createdLabel.textContent = 'Added on:';
        const createdValue = document.createElement('dd');
        createdValue.textContent = formatDisplayDate(notice.createdAt);
        meta.appendChild(createdLabel);
        meta.appendChild(createdValue);
      }

      if (meta.childNodes.length) {
        card.appendChild(meta);
      }

      deleteBtn.addEventListener('click', () => handleDeleteNotice(notice.id));
      list.appendChild(card);
    });
  }

  function generateNoticeId() {
    if (window.crypto?.randomUUID) {
      return `notice_${crypto.randomUUID()}`;
    }
    return `notice_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function handleDeleteNotice(id) {
    if (!id) return;
    if (!confirm('Delete this maintenance notice?')) return;

    const config = getStoredConfig();
    const filtered = config.maintenance_notices.filter((notice) => notice.id !== id);
    const result = saveSystemConfig({ maintenance_notices: filtered });

    if (result.success) {
      alert('Maintenance notice deleted.');
      loadSystemConfig();
    } else {
      alert('Error: ' + result.message);
    }
  }
  
  // Load system configuration from localStorage
  function loadSystemConfig() {
    try {
      const config = getStoredConfig();
      
      // Load capacity limits
      const dailyLimit = document.getElementById('dailyOrderLimit');
      const availableCapacity = document.getElementById('availableCapacity');
      if (dailyLimit) dailyLimit.value = config.daily_order_limit || '300';
      if (availableCapacity) availableCapacity.value = config.available_capacity || '300';
      
      const maintenanceTitle = document.getElementById('maintenanceTitle');
      const maintenanceMessage = document.getElementById('maintenanceMessage');
      const maintenanceStartDate = document.getElementById('maintenanceStartDate');
      const maintenanceEndDate = document.getElementById('maintenanceEndDate');
      
      if (maintenanceTitle) maintenanceTitle.value = '';
      if (maintenanceMessage) maintenanceMessage.value = '';
      if (maintenanceStartDate) maintenanceStartDate.value = '';
      if (maintenanceEndDate) maintenanceEndDate.value = '';

      renderMaintenanceNoticesList(config.maintenance_notices);
    } catch (e) {
      console.error('Failed to load system config', e);
      // Load defaults if error
      const config = getDefaultConfig();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      loadSystemConfig();
    }
  }
  
  // Save config to localStorage
  function saveSystemConfig(updates) {
    try {
      const config = getStoredConfig();
      Object.keys(updates || {}).forEach((key) => {
        if (key === 'maintenance_notices') {
          config.maintenance_notices = Array.isArray(updates[key]) ? updates[key] : [];
        } else {
          config[key] = updates[key];
        }
      });

      persistConfig(config);
      
      return { success: true, message: 'Saved successfully' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
  
  // Save capacity limits
  document.getElementById('capacityLimitsForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const dailyOrderLimit = parseInt(document.getElementById('dailyOrderLimit').value) || 300;
    const availableCapacity = parseInt(document.getElementById('availableCapacity').value) || dailyOrderLimit;
    
    const result = saveSystemConfig({
      daily_order_limit: dailyOrderLimit.toString(),
      available_capacity: availableCapacity.toString()
    });
    
    if (result.success) {
      alert('Capacity limits saved successfully!');
      loadSystemConfig();
    } else {
      alert('Error: ' + result.message);
    }
  });
  
  // Save maintenance notice
  document.getElementById('maintenanceNoticeForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const titleInput = document.getElementById('maintenanceTitle');
    const messageInput = document.getElementById('maintenanceMessage');
    const startInput = document.getElementById('maintenanceStartDate');
    const endInput = document.getElementById('maintenanceEndDate');

    const title = titleInput?.value.trim() || '';
    const message = messageInput?.value.trim() || '';
    const startDate = startInput?.value || '';
    const endDate = endInput?.value || '';

    if (!title && !message) {
      alert('Please add at least a title or message for the maintenance notice.');
      return;
    }

    const config = getStoredConfig();
    const notices = Array.isArray(config.maintenance_notices) ? [...config.maintenance_notices] : [];

    notices.push({
      id: generateNoticeId(),
      title,
      message,
      startDate,
      endDate,
      createdAt: new Date().toISOString()
    });

    const result = saveSystemConfig({
      maintenance_notices: notices
    });
    
    if (result.success) {
      alert('Maintenance notice added successfully!');
      loadSystemConfig();
    } else {
      alert('Error: ' + result.message);
    }
  });
  
  // Clear maintenance notice
  document.getElementById('clearMaintenanceBtn')?.addEventListener('click', () => {
    if (!confirm('Clear all maintenance notices?')) return;
    
    const result = saveSystemConfig({
      maintenance_notices: []
    });
    
    if (result.success) {
      alert('All maintenance notices cleared!');
      loadSystemConfig();
    } else {
      alert('Error: ' + result.message);
    }
  });
  
  // Checkbox styling for operating days
  document.querySelectorAll('input[name="operatingDays"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        this.closest('.checkbox-day').classList.add('checked');
      } else {
        this.closest('.checkbox-day').classList.remove('checked');
      }
    });
  });
  
  // Load config when system-config view is shown
  const originalSwitchView = window.switchView;
  if (originalSwitchView) {
    window.switchView = function(viewName) {
      originalSwitchView(viewName);
      if (viewName === 'system-config') {
        loadSystemConfig();
      }
    };
  }
  
  // Also load on initial page load if already on system-config
  document.addEventListener('DOMContentLoaded', () => {
    const systemConfigView = document.getElementById('view-system-config');
    if (systemConfigView && systemConfigView.style.display !== 'none') {
      loadSystemConfig();
    }
  });
})();


