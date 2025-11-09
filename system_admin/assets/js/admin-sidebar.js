// Sidebar toggle functionality
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    if (!sidebar || !sidebarToggle) return;
    
    // Check for saved state in localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
      sidebar.classList.add('collapsed');
    }
    
    // Toggle sidebar on button click
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('collapsed');
      
      // Save state to localStorage
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
    });
  });
})();


