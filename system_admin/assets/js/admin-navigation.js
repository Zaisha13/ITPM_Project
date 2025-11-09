// Unified view switching functionality
(function() {
  // Get references to dashboard and reports elements
  const viewDashboard = document.getElementById('view-dashboard');
  const viewReports = document.getElementById('view-reports');
  
  async function switchView(viewName) {
    // Hide all view containers (elements with id starting with 'view-')
    const allViews = document.querySelectorAll('[id^="view-"]');
    allViews.forEach(v => {
      v.style.display = 'none';
    });
    
    // Show selected view
    const targetView = document.querySelector(`#view-${viewName}`);
    if (targetView) {
      targetView.style.display = 'block';
    }
    
    // Special handling for reports and dashboard
    if (viewName === 'reports' && viewReports) {
      // Trigger reports rendering - use window functions if available
      setTimeout(() => {
        if (typeof window.renderActiveReport === 'function') {
          window.renderActiveReport();
        } else if (typeof window.renderSales === 'function') {
          window.renderSales();
        }
      }, 100);
    } else if (viewName === 'dashboard' && viewDashboard) {
      // Re-render calendar and orders if needed
      const calendarEl = document.getElementById('calendar');
      if (calendarEl && typeof renderCalendar === 'function') {
        const now = new Date();
        renderCalendar(now.getFullYear(), now.getMonth());
        if (typeof renderOrdersFor === 'function' && typeof ymd === 'function') {
          renderOrdersFor(ymd(now));
        }
      }
    } else if (viewName === 'orders') {
      // Hide topbar for orders page (has its own header)
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        topbar.style.display = 'none';
      }
      // Trigger orders rendering - load approved orders from API
      setTimeout(() => {
        if (typeof window.loadOrdersTable === 'function') {
          window.loadOrdersTable();
        }
      }, 100);
    } else if (viewName === 'logbook') {
      // Hide topbar for logbook page (has its own header)
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        topbar.style.display = 'none';
      }
      // Trigger logbook rendering
      setTimeout(() => {
        if (typeof window.renderLogbookPage === 'function') {
          window.renderLogbookPage();
        }
      }, 100);
    } else if (viewName === 'loans') {
      // Hide topbar for loans page (has its own header)
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        topbar.style.display = 'none';
      }
      // Trigger loans rendering
      setTimeout(() => {
        if (typeof window.renderLoansPage === 'function') {
          window.renderLoansPage();
        }
      }, 100);
    } else if (viewName === 'system-config') {
      // Hide topbar for system config page (has its own header)
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        topbar.style.display = 'none';
      }
    } else if (viewName === 'feedback') {
      // Hide topbar for feedback page (has its own header)
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        topbar.style.display = 'none';
      }
      // Trigger feedback rendering
      setTimeout(() => {
        if (typeof window.renderFeedback === 'function') {
          window.renderFeedback();
        }
      }, 100);
    } else {
      // Show topbar for other views
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        topbar.style.display = '';
      }
    }
    
    // Update menu active state
    const menuItems = document.querySelectorAll('.menu-item[data-view]');
    menuItems.forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Update page title
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
      const titles = {
        'dashboard': 'Admin Dashboard',
        'manual-entry': 'Manual Order Entry',
        'admin-mgmt': 'Admin Management',
        'system-config': 'System Configuration',
        'orders': 'Orders',
        'loans': 'Loans',
        'logbook': 'Logbook',
        'reports': 'Reports',
        'feedback': 'Feedback'
      };
      pageTitle.textContent = titles[viewName] || 'Admin Dashboard';
    }
  }
  
  // Wire up menu item clicks
  document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item[data-view]');
    menuItems.forEach(item => {
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        const viewName = item.getAttribute('data-view');
        if (viewName) {
          await switchView(viewName);
        }
      });
    });
    
    // Initialize with dashboard view visible
    switchView('dashboard');
  });
  
  // Make switchView available globally for reports module
  window.switchView = switchView;
})();


