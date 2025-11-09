<?php
// includes/config.php
// General configuration file (NOT for DB credentials)

// Base URL (legacy, not used by customer APIs)
define('API_BASE_URL', 'http://localhost/ITPM_Project/admin_backend/api/');

// Allowed Origin for CORS-enabled endpoints (set to Live Server or production origin if needed)
// For XAMPP same-origin, this is not used; for Live Server use 'http://127.0.0.1:5500'
if (!defined('API_ALLOWED_ORIGIN')) {
    define('API_ALLOWED_ORIGIN', 'http://127.0.0.1:5500');
}

// Environment mode — "development" (show errors) or "production" (hide errors)
define('APP_ENV', 'development');
?>
