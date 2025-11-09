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
      maintenance_active: '0',
      maintenance_title: '',
      maintenance_message: '',
      maintenance_start_date: '',
      maintenance_end_date: ''
    };
  }
  
  // Load system configuration from localStorage
  function loadSystemConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const config = stored ? JSON.parse(stored) : getDefaultConfig();
      
      // Load capacity limits
      const dailyLimit = document.getElementById('dailyOrderLimit');
      const availableCapacity = document.getElementById('availableCapacity');
      if (dailyLimit) dailyLimit.value = config.daily_order_limit || '300';
      if (availableCapacity) availableCapacity.value = config.available_capacity || '300';
      
      // Load maintenance notice
      const maintenanceActive = document.getElementById('maintenanceActive');
      const maintenanceTitle = document.getElementById('maintenanceTitle');
      const maintenanceMessage = document.getElementById('maintenanceMessage');
      const maintenanceStartDate = document.getElementById('maintenanceStartDate');
      const maintenanceEndDate = document.getElementById('maintenanceEndDate');
      
      if (maintenanceActive) maintenanceActive.checked = config.maintenance_active === '1' || config.maintenance_active === true;
      if (maintenanceTitle) maintenanceTitle.value = config.maintenance_title || '';
      if (maintenanceMessage) maintenanceMessage.value = config.maintenance_message || '';
      if (maintenanceStartDate) maintenanceStartDate.value = config.maintenance_start_date || '';
      if (maintenanceEndDate) maintenanceEndDate.value = config.maintenance_end_date || '';
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
      const stored = localStorage.getItem(STORAGE_KEY);
      const config = stored ? JSON.parse(stored) : getDefaultConfig();
      
      // Merge updates
      Object.assign(config, updates);
      
      // Save back to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      
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
    const result = saveSystemConfig({
      maintenance_active: document.getElementById('maintenanceActive').checked ? '1' : '0',
      maintenance_title: document.getElementById('maintenanceTitle').value,
      maintenance_message: document.getElementById('maintenanceMessage').value,
      maintenance_start_date: document.getElementById('maintenanceStartDate').value,
      maintenance_end_date: document.getElementById('maintenanceEndDate').value
    });
    
    if (result.success) {
      alert('Maintenance notice saved successfully!');
      loadSystemConfig();
    } else {
      alert('Error: ' + result.message);
    }
  });
  
  // Clear maintenance notice
  document.getElementById('clearMaintenanceBtn')?.addEventListener('click', () => {
    if (!confirm('Are you sure you want to clear the maintenance notice?')) return;
    
    const result = saveSystemConfig({
      maintenance_active: '0',
      maintenance_title: '',
      maintenance_message: '',
      maintenance_start_date: '',
      maintenance_end_date: ''
    });
    
    if (result.success) {
      alert('Maintenance notice cleared!');
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


