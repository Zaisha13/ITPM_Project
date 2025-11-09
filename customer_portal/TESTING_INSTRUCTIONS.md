# Testing Instructions for Order History and Rate Button

**Important:** This system now works entirely with localStorage - no PHP or database required! All orders are stored in `localStorage` under the key `orderSubmissions`.

## How to Use Order History

### Viewing Order History
1. Click the **Profile** button in the top-right navbar
2. Click **Order History** in the left sidebar
3. You'll see a table with all your orders

### Clicking Order Rows
1. In Order History, click anywhere on an order row (except on action buttons)
2. The Order Details view will appear showing:
   - Order ID, Date, Delivery Address
   - Payment Status and Order Status
   - All order items with quantities and prices
   - Total amount
   - Action buttons based on order status:
     - **RE-ORDER** button: Always visible (disabled for non-completed orders, clickable only for completed orders)
     - **RATE** button: Only visible for completed orders
     - **CANCEL** button: Only visible for pending/for-approval orders
3. Click the **Back to Order History** button to return to the table

## How to Test the Rate and Re-Order Buttons

### Rate Button
- Only appears when order status is "completed"
- Allows users to rate their experience and leave feedback

### Re-Order Button
- Always visible for ALL orders regardless of status
- Disabled (grayed out) for non-completed orders
- Only works (clickable) when order status is "completed"
- When clicked on a completed order, it loads the order details into the order form

Follow these steps to test:

### Step 1: Place Some Orders
1. Click **ORDER NOW** button
2. Add items to your order
3. Fill in delivery address
4. Select payment method
5. Click **Place Order**
6. Repeat to create multiple orders

### Step 2: Open Browser Console
1. Press `F12` or right-click and select "Inspect"
2. Go to the "Console" tab

### Step 3: View Your Orders
Run this code to see all your orders:

```javascript
// Get all orders from localStorage
let orders = JSON.parse(localStorage.getItem('orderSubmissions') || '[]');

// Display current orders with their IDs and status
console.log('All orders:');
orders.forEach((order, index) => {
  console.log(`Order ${index + 1}:`);
  console.log(`  ID: ${order.id}`);
  console.log(`  Status: ${order.status || 'pending'}`);
  console.log(`  Total: ₱${order.grandTotal}`);
  console.log(`  Date: ${new Date(order.timestamp).toLocaleString()}`);
  console.log('---');
});
```

### Step 4: Choose Which Order to Make "Completed"
**Option A: Make a specific order completed by index**
```javascript
// Make the first order (index 0) completed
let orders = JSON.parse(localStorage.getItem('orderSubmissions') || '[]');
if (orders[0]) {
  orders[0].status = 'completed';
  localStorage.setItem('orderSubmissions', JSON.stringify(orders));
  console.log('Order 1 is now completed!');
  alert('Order status updated! Please close and reopen the profile modal.');
}
```

**Option B: Make a specific order completed by ID**
```javascript
// Make order with specific ID completed
let orders = JSON.parse(localStorage.getItem('orderSubmissions') || '[]');
const targetOrderId = 12345; // Change this to the ID you want

const targetOrder = orders.find(o => o.id === targetOrderId);
if (targetOrder) {
  targetOrder.status = 'completed';
  localStorage.setItem('orderSubmissions', JSON.stringify(orders));
  console.log(`Order ${targetOrderId} is now completed!`);
  alert('Order status updated! Please close and reopen the profile modal.');
} else {
  console.log('Order not found! Check the ID.');
}
```

**Option C: Make ALL orders completed**
```javascript
// Make all orders completed
let orders = JSON.parse(localStorage.getItem('orderSubmissions') || '[]');
orders.forEach(order => {
  order.status = 'completed';
});
localStorage.setItem('orderSubmissions', JSON.stringify(orders));
console.log('All orders are now completed!');
alert('All orders updated! Please close and reopen the profile modal.');
```

**Option D: Make last order completed**
```javascript
// Make the last order completed
let orders = JSON.parse(localStorage.getItem('orderSubmissions') || '[]');
if (orders.length > 0) {
  orders[orders.length - 1].status = 'completed';
  localStorage.setItem('orderSubmissions', JSON.stringify(orders));
  console.log('Last order is now completed!');
  alert('Order status updated! Please close and reopen the profile modal.');
}
```

### Step 5: View Changes
1. Close the profile modal if it's open
2. Click the Profile button again
3. Go to "Order History"
4. You should now see:
   - The **RATE** button on completed orders
   - The **RE-ORDER** button on ALL orders (enabled for completed, disabled/grayed out for others)

**Note:** The order history now loads directly from localStorage (`orderSubmissions`). After changing order status in the console, you may need to close and reopen the profile modal to see the changes, or you can click the "Order History" menu item again to refresh.

### Step 6: Test Rate Button (Only for Completed Orders)
**Option 1: From Order History Table**
1. Click the **RATE** button on a completed order in the table
2. You'll see the feedback form with star ratings
3. Click on stars to select a rating
4. Optionally type feedback in the text area
5. Click "Share My Feedback"
6. You'll see a styled "Thank You!" modal with green checkmark
7. Click "Close"
8. You'll be taken back to Order History

**Option 2: From Order Details View**
1. Click on an order row to see order details
2. Click the **RATE** button at the bottom
3. You'll see the feedback form with star ratings
4. Click on stars to select a rating
5. Optionally type feedback in the text area
6. Click "Share My Feedback"
7. You'll see a styled "Thank You!" modal with green checkmark
8. Click "Close"
9. You'll be taken back to Order History

### Step 7: Test Re-Order Button
**For Completed Orders:**
1. In Order History, look for an order with "Completed" status
2. Click the **RE-ORDER** button (should be clickable/enabled)
3. The order modal will open with all the order details pre-filled:
   - All container items with quantities
   - Additional Wilkins if they were in the original order
   - Delivery address
   - Payment method
4. You can modify the order or place it as-is
5. Click "Place Order" to create a new order

**For Non-Completed Orders:**
1. In Order History, look for an order with status like "Pending", "For Approval", etc.
2. Click the **RE-ORDER** button
3. The button should be disabled/grayed out and won't respond to clicks
4. This indicates the re-order feature only works for completed orders

### Step 8: Test Cancel Button
1. In Order History, look for an order with "Pending" or "For Approval" status
2. Click the **CANCEL** button
3. A confirmation modal will appear asking "Cancel Order?"
4. Click "Yes, Cancel Order"
5. The order status will be updated to "Cancelled" in localStorage
6. The order history will refresh automatically
7. Cancelled orders cannot be cancelled again (button won't appear)

**Note:** Cancel button only appears for orders with "Pending" or "For Approval" status. Once an order is confirmed or in progress, it cannot be cancelled.

## Quick Reference: All Features

### Order History Features
- ✓ View all orders in a table
- ✓ Click any row to see full order details
- ✓ See order items with quantities and prices
- ✓ Re-order button ALWAYS visible for all orders
- ✓ Re-order button only WORKS for completed orders (disabled for others)
- ✓ Cancel button for pending/for-approval orders only
- ✓ Rate button for completed orders only
- ✓ Back button to return to table

### Login Behavior
After logging in, you'll see a "Login successful!" message at the top-right. The homepage appears WITHOUT automatically opening the order modal. Only when you click "ORDER NOW" will the order modal open.

### Logout Confirmation
Both logout buttons (navbar and profile modal) show a styled confirmation modal asking "Are You Sure?" before logging out.

