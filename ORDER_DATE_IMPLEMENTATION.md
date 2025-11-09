# Order Date Implementation Based on Operating Hours

## Overview
This implementation ensures that orders are assigned to the correct date based on operating hours (8am-5pm). Orders placed after business hours are scheduled for the next day, while orders placed before business hours are scheduled for the current day.

## Business Rules

### Operating Hours: 8am to 5pm

1. **Orders placed after 5pm (17:00) to 11:59pm**: OrderDate = Next Day
   - Example: Order at 9pm on Nov 7 → OrderDate = Nov 8

2. **Orders placed from 12am (00:00) to before 8am (08:00)**: OrderDate = Current Day
   - Example: Order at 1:02am on Nov 8 → OrderDate = Nov 8

3. **Orders placed from 8am (08:00) to 5pm (17:00)**: OrderDate = Current Day
   - Example: Order at 10am on Nov 8 → OrderDate = Nov 8

## Database Changes

### 1. New Column: `OrderDate`
- Added to `tbl_orders` table
- Type: `DATE`
- Stores the date the order should be processed on
- Migration script: `admin_backend/api/add_orderdate_column.sql`

## API Changes

### 1. `customer_backend/api/add_order.php`
- **Added**: OrderDate calculation based on current time
- **Logic**: If order is placed after 5pm (17:00), OrderDate = next day, otherwise current day
- **Timezone**: Uses 'Asia/Manila' (adjust as needed)

### 2. `admin_backend/api/add_orders.php`
- **Added**: Same OrderDate calculation for manual entry orders

### 3. `admin_backend/api/read_orders.php`
- **Added**: OrderDate field in SELECT query
- **Modified**: Excludes orders with "For Approval" status (OrderStatusID = 1)
  - These orders should only appear in the dashboard, not in the orders table

### 4. `admin_backend/api/get_pending_orders.php` (New)
- **Purpose**: Fetches orders with "For Approval" status for the dashboard
- **Features**: 
  - Filters by OrderStatusID = 1 (For Approval)
  - Optional `orderDate` parameter to filter by specific date
  - Includes OrderDate in response

### 5. `admin_backend/api/update_orders.php`
- **Usage**: Updates order status when admin approves an order
- **Status Change**: OrderStatusID from 1 (For Approval) to 2 (Confirmed)

## Frontend Changes

### 1. `system_admin/assets/js/admin.js`

#### `fetchOrders()`
- **Modified**: Now fetches from both endpoints:
  - `get_pending_orders.php` - for dashboard pending orders
  - `read_orders.php` - for orders table (approved orders)
- **Combines**: Both arrays to show all orders in dashboard, while orders table filters out pending

#### `renderOrdersFor(dateStr)`
- **Modified**: Uses `OrderDate` instead of `CreatedAt` for filtering
- **Purpose**: Shows pending orders for the correct date based on OrderDate

#### `renderCalendar(year, month)`
- **Modified**: Uses `OrderDate` for counting orders in calendar
- **Purpose**: Calendar badges show correct count based on OrderDate

#### `approveOrder(orderId, event)`
- **Modified**: Uses API (`update_orders.php`) to update order status
- **Behavior**: Changes OrderStatusID from 1 to 2 (Confirmed)
- **Result**: Approved orders appear in orders table, removed from dashboard

## Order Flow

### 1. Order Creation
```
Customer places order
  ↓
OrderDate calculated based on time:
  - After 5pm → Next day
  - Before 8am → Current day
  - 8am-5pm → Current day
  ↓
Order inserted with OrderStatusID = 1 (For Approval)
  ↓
Order appears in dashboard for OrderDate
```

### 2. Order Approval
```
Admin views dashboard
  ↓
Sees pending orders for selected date (based on OrderDate)
  ↓
Admin clicks "Approve Order"
  ↓
OrderStatusID updated to 2 (Confirmed)
  ↓
Order removed from dashboard
  ↓
Order appears in Orders table
```

### 3. Order Visibility

**Dashboard (Pending Approval)**:
- Shows orders with OrderStatusID = 1 (For Approval)
- Filtered by OrderDate (the date order should be processed)
- Orders visible until approved

**Orders Table**:
- Shows orders with OrderStatusID != 1 (Excludes "For Approval")
- Only approved/confirmed orders are visible
- Orders appear after admin approval

## Testing Scenarios

### Scenario 1: Order at 1:02am on Nov 8
- Expected: OrderDate = Nov 8
- Dashboard: Shows in Nov 8 pending orders
- Status: For Approval

### Scenario 2: Order at 9pm on Nov 7
- Expected: OrderDate = Nov 8
- Dashboard: Shows in Nov 8 pending orders (not Nov 7)
- Status: For Approval

### Scenario 3: Order at 10am on Nov 8
- Expected: OrderDate = Nov 8
- Dashboard: Shows in Nov 8 pending orders
- Status: For Approval

### Scenario 4: Admin Approves Order
- Before: Order in dashboard (Status: For Approval)
- Action: Admin clicks "Approve Order"
- After: 
  - Order removed from dashboard
  - Order appears in Orders table (Status: Confirmed)

## Migration Steps

1. **Run SQL migration**:
   ```sql
   -- Execute: admin_backend/api/add_orderdate_column.sql
   ```

2. **Deploy updated PHP files**:
   - `customer_backend/api/add_order.php`
   - `admin_backend/api/add_orders.php`
   - `admin_backend/api/read_orders.php`
   - `admin_backend/api/get_pending_orders.php` (new)

3. **Deploy updated JavaScript**:
   - `system_admin/assets/js/admin.js`

4. **Verify**:
   - New orders get correct OrderDate
   - Dashboard shows orders by OrderDate
   - Orders table excludes pending orders
   - Approval flow works correctly

## Notes

- Timezone is set to 'Asia/Manila' - adjust in `add_order.php` and `add_orders.php` if needed
- Existing orders will have OrderDate set to DATE(CreatedAt) during migration
- The system maintains backward compatibility with orders that don't have OrderDate (falls back to CreatedAt)


