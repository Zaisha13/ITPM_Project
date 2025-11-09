# Water Avenue - Customer Portal

## Project Structure

```
Customer/
├── index.html                      # Main entry point
├── PROJECT_STRUCTURE.md            # Detailed structure documentation
├── README.md                       # This file
├── assets/                         # All static assets
│   ├── css/                       # Stylesheets
│   │   ├── homepage.css
│   │   ├── login.css
│   │   ├── register.css
│   │   ├── order.css
│   │   └── profile.css
│   └── js/                        # JavaScript files
│       ├── homepage.js            # Main application logic
│       └── constants.js           # Order status constants
└── components/                     # Reusable components
```

## Features

### Order Status System
- **9 Status Types**: For Approval, Pending, Confirmed, Preparing, Ready for Pickup, Out for Delivery, Completed, Cancelled, Queued
- **Dynamic Badge Colors**: Each status has a unique visual design
- **Conditional Buttons**: Cancel, Rate, and Reorder buttons appear based on status

### Conditional Button Logic
- **Cancel Button**: Only visible for "For Approval" and "Pending" statuses
- **Rate Button**: Only visible for "Completed" statuses
- **Reorder Button**: Only clickable for "Completed" statuses, locked for others

### Payment Methods
- Cash
- GCash
- Loan

### Order Placement
- Allows Wilkins-only orders (no container requirement)
- Success message on placement
- Form reset after successful order

## File Organization

### Why This Structure?
1. **Easy Backend Integration**: Clear separation allows easy API integration
2. **Maintainability**: Each feature has its own files
3. **Scalability**: Easy to add new features or components
4. **Team Collaboration**: Clear file organization for multiple developers

## Backend Integration Points

When implementing PHP backend, you'll need to create:

### Database Tables
```sql
- users (id, firstName, lastName, username, phone, email, address, password, customerType)
- orders (id, userId, status, address, paymentMethod, grandTotal, timestamp)
- order_items (id, orderId, containerType, orderType, quantity, price, total)
- feedbacks (id, orderId, rating, feedback, timestamp)
```

### API Endpoints
```javascript
POST /api/auth/login
POST /api/auth/register
PUT  /api/auth/profile
GET  /api/orders
POST /api/orders
PUT  /api/orders/{id}/cancel
POST /api/orders/{id}/rate
GET  /api/orders/{id}/status
```

## Getting Started

1. Open `index.html` in your browser
2. The application uses localStorage for data (ready for backend integration)
3. All features are functional without a backend

## Testing Order Status Changes

To test different statuses, edit in browser console:
```javascript
// Change order status to 'completed' for testing
const orders = JSON.parse(localStorage.getItem('orderSubmissions') || '[]');
orders[0].status = 'completed'; // Change to any status
localStorage.setItem('orderSubmissions', JSON.stringify(orders));
// Reload profile modal to see changes
```

## Next Steps for Backend Integration

1. Replace localStorage calls with API calls in `assets/js/homepage.js`
2. Create PHP API endpoints matching the structure above
3. Update constants in `assets/js/constants.js` for API endpoints
4. Add authentication tokens for secure API calls


