api_config.js — for your JavaScript (frontend)

🧩 This file is used by your frontend (HTML + JS),
so your pages know where to send requests (to which backend URL).

It defines the API base path for JavaScript only.

✅ Example — assets/js/api_config.js
// Base URL for all API requests
const API_BASE = "http://localhost/ITPM_Project/admin_backend/api/";


Then anywhere in your JS, you can use:

fetch(API_BASE + "insert_customers.php", {...})

