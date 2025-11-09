C:\xampp\htdocs\
│
└── ITPM_PROJECT/
│
├── index.php                  
│   # 👀 The public homepage — customers first see this when they visit your site.
│   # It might contain buttons or links to "Login" or "Register".
│
├── customer_portal/                  
│   # 👤 The customer portal (frontend). 
|   # EXAMPLE MODULES INSIDE
│   # All files here show the UI for customers (HTML + CSS + JS + PHP if needed).
│   │
│   ├── login.php
│   │   # 🪪 Displays the login form (email + password).
│   │   # Sends the data via JavaScript `fetch()` to → ../api/login.php (backend endpoint).
│   │
│   ├── register.php
│   │   # 📝 Displays registration form.
│   │   # Sends new customer details to → ../api/register.php (which inserts into DB).
│   │
│   ├── dashboard.php
│   │   # 📊 The main page after logging in.
│   │   # Fetches customer data (orders, profile, etc.) from → ../api/orders.php or ../api/customers.php.
│   │
│   └── orders.php
│       # 🧾 Shows order history or a form to place new orders.
│       # Uses → ../api/orders.php (to GET order data or POST new orders).
│
├── system_admin/                     
│   # 🧑‍💼 Admin portal (hidden area).
│   # The admin logs in separately and can view or manage records.
|   # EXAMPLE MODULES INSIDE
│   │
│   ├── index.php
│   │   # 🔐 Admin login page.
│   │   # Sends login data to → ../api/login.php too (same endpoint, reusable!).
│   │
│   ├── manage_customers.php
│   │   # 📋 Admin can view, edit, or delete customer accounts.
│   │   # Fetches or sends data to → ../api/customers.php (CRUD operations).
│   │
│   ├── view_orders.php
│   │   # 🧾 Admin can monitor all customer orders.
│   │   # Uses → ../api/orders.php (GET request for all orders).
│   │
│   └── reports.php
│       # 📈 Shows analytics (total sales, customers, water refills, etc.).
│       # Might use → ../api/reports.php to fetch summarized data.
│
├── api/                       
│   # ⚙️ PURE BACKEND — all endpoints that handle database actions.
│   # Each PHP file here is an API "endpoint" — reusable and testable in Postman.
|   # EXAMPLE API ENDPOINTS INSIDE
│   │
│   ├── login.php
│   │   # 🔑 Handles login validation.
│   │   # Checks the database for correct email/password and returns JSON.
│   │
│   ├── register.php
│   │   # 🧾 Handles registration — inserts new customer records into the DB.
│   │
│   ├── orders.php
│   │   # 🧃 Handles all order-related actions (place order, view order history).
│   │   # Receives POST requests for new orders, GET requests for listing orders.
│   │
│   ├── customers.php
│   │   # 👥 Manages customer details (fetch all, update info, delete, etc.).
│   │   # Reused by both admin and customer portals.
│   │
│   ├── reports.php
│   │   # 📊 Generates report data (e.g., total gallons sold, earnings, etc.).
│   │   # Returns JSON for dashboards.
│   │
│   └── sms_api.php
│       # 📱 Handles sending SMS notifications via your SMS API provider.
│       # Called by other API files (like orders.php) when an order is placed or delivered.
│
├── includes/                  
│   # 🔗 Shared backend code used by multiple API files.
│   │
│   ├── db_connect.php
│   │   # 🧩 Establishes connection to MySQL.
│   │   # Included in every API file (e.g., include "../includes/db_connect.php";)
│   │
│   └── functions.php
│       # 🧠 Contains reusable helper functions (like input validation or logging actions).
│
├── config/                    
│   # 🔒 Configuration and secret keys.
│   │
│   └── sms_config.php
│       # 🗝️ Contains SMS API credentials (like API key, endpoint URL).
│       # Included in → api/sms_api.php for sending messages.
│
└── assets/                    
    # 🎨 Stores design and visual files for your front-end pages.
    │
    ├── css/
    │   # 💅 CSS stylesheets (layout, buttons, colors).
    │
    ├── js/
    │   # ⚡ JavaScript files (frontend logic, fetch calls to API, etc.)
    │
    └── images/
        # 🖼️ Logos, icons, product pictures, etc.
