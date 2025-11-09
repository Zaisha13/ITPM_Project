Folder Integration (How it Connects Later)

When your frontend (for example, in customer_portal/) is done,
you’ll import api_config.js and call your PHP APIs like this:

<script src="../assets/js/api_config.js"></script>
<script>
fetch(API_BASE + "insert_customers.php", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    CustomerTypeID: 1,
    FirstName: "Ana",
    LastName: "Santos",
    Phone: "09179992222",
    HouseAddress: "Lot 5, Brgy. Uno"
  })
})
.then(res => res.json())
.then(data => console.log(data));
</script>


✅ Why this matters now:
If you do this setup early, all your future frontend and backend files will “automatically” connect through that one constant (API_BASE), so you don’t have to rewrite URLs later.

-----------------------------------------

When You Deploy (Later)

Only two files will need updates:

includes/config.php
→ Change from http://localhost/... to your domain.

assets/js/api_config.js
→ Update the same URL if your frontend uses it directly.

Everything else — your backend, database logic, headers, API calls — will work as-is.

------------------------------------------

When you deploy (what you'll change)

Upload project files (preserve structure) to your web host.

Update DB credentials:

Replace admin_backend/includes/db_config.php values with production DB host/user/pass.

Update admin_backend/includes/config.php:

define('API_BASE_URL', 'https://yourdomain.com/admin_backend/api/');
define('APP_ENV', 'production');


If your frontend is static (HTML/JS), update frontend/js/api_config.js to use production API:

const API_BASE = 'https://yourdomain.com/admin_backend/api/';


Or rely on server injection (STEP 4) if pages are served by PHP.

Set Access-Control-Allow-Origin header to https://yourdomain.com (not *).

Use HTTPS — ensure SSL certificate is installed (Let’s Encrypt or host-provided).