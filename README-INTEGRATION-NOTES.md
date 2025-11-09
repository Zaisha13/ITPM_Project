Integration Notes (Customer Portal ↔ Customer Backend)

This document summarizes recent changes to connect the customer portal to the PHP APIs and database under XAMPP.

What changed

- Frontend API base resolution made robust
  - File: `customer_portal/assets/js/api.js`
  - Now uses `new URL('../customer_backend/api/', window.location.href)` to compute the API base. This avoids issues when the folder name casing differs (e.g., `ITPM_PROJECT` vs `ITPM_Project`).
  - All API methods log status and JSON to the browser console on non-200 responses for easier debugging.

- Login in development accepts any password for existing accounts
  - File: `customer_backend/api/get_account.php`
  - When `APP_ENV === 'development'`, any password works for an existing username/email. The endpoint sets `$_SESSION['accountID']` and returns the linked customer profile.

- Registration validations and clearer errors
  - File: `customer_backend/api/create_account.php`
  - Trims inputs and checks duplicates for username, email, and phone before inserting. Returns clear error messages (`Username already exists`, `Email already registered`, etc.).

- Profile update safeguards
  - File: `customer_backend/api/update_account.php`
  - Ensures username/email/phone uniqueness excluding the current account; password change remains optional.

- Feedback endpoint
  - File: `customer_backend/api/submit_feedback.php`
  - Adds ability to submit feedback for an order; verifies session + order ownership.

How to run under XAMPP

- Open: `http://localhost/ITPM_Project/customer_portal/index.html`
- Ensure `includes/config.php` has `APP_ENV` set to `development` during testing.
- Login in development: any password is accepted for an existing account (e.g., `htorres / anything`).

Customer endpoints

- `POST customer_backend/api/get_account.php`
- `POST customer_backend/api/create_account.php`
- `POST customer_backend/api/update_account.php`
- `POST customer_backend/api/add_order.php`
- `GET  customer_backend/api/get_orders.php?CustomerID=<id>`
- `GET  customer_backend/api/get_order_details.php?OrderID=<id>`
- `POST customer_backend/api/cancel_order.php`
- `GET  customer_backend/api/get_reorder.php?OrderID=<id>`
- `POST customer_backend/api/submit_feedback.php`

Notes

- Frontend uses `credentials: 'include'` so PHP sessions persist across calls.
- Use the browser console to see detailed API logs from `api.js` if requests fail.
