# Deployment and Local Setup Guide

## Prerequisites
- XAMPP (Apache + MySQL)
- PHP 8+

## Project paths (XAMPP)
- Place the repo under: `C:\xampp\htdocs\ITPM_PROJECT`
- Frontend entry: `http://localhost/ITPM_PROJECT/customer_portal/index.php`
- Backend APIs: `http://localhost/ITPM_PROJECT/customer_backend/api/*.php`

## Database
1. Start MySQL in XAMPP.
2. Import `itpm_db-design.md` SQL (or ensure tables exist).
3. Check DB connection in `includes/db_connection.php`:
   - host: `localhost`
   - user: `root`
   - pass: `` (empty by default)
   - db: `itpm_db`

## Configurable Origin (for Live Server)
- Edit `includes/config.php`:
  - `API_ALLOWED_ORIGIN` controls CORS for development.
  - For XAMPP same-origin (localhost), this is ignored.
  - For VS Code Live Server, set to `http://127.0.0.1:5500`.

## Running locally (recommended)
1. Start Apache + MySQL.
2. Visit `http://localhost/ITPM_PROJECT/customer_portal/index.php`.
3. Use the UI; all requests go to `customer_backend/api/` and read/write the DB.

## Testing
- Register → creates rows in `tbl_account` + `tbl_customer`.
- Login → session set; `session_me.php` reflects current user.
- Prices → loaded from `tbl_container_type` via `get_prices.php`.
- Place order → `add_order.php` inserts order + details.
- Cancel order → `cancel_order.php` restocks Brand New items to `tbl_container_count`.
- Reorder → `get_reorder.php` seeds order form.
- Feedback → `submit_feedback.php` inserts rating/feedback without FK errors.

## Deploying to hosting
1. Upload files to your host’s document root.
2. Create DB and import schema.
3. Update `includes/db_connection.php` with host/user/pass/db.
4. If serving frontend from a different origin than backend, set `API_ALLOWED_ORIGIN` to that origin and ensure `credentials: 'include'` is preserved in the frontend.


