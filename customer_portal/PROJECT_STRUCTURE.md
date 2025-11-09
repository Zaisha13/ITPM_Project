# Water Avenue - Project Structure

## Folder Structure

```
Customer/
├── index.html                 # Main entry point
├── assets/                    # Static assets
│   ├── css/                  # All CSS files
│   │   ├── homepage.css
│   │   ├── login.css
│   │   ├── register.css
│   │   ├── order.css
│   │   └── profile.css
│   └── js/                   # All JavaScript files
│       ├── homepage.js       # Main application logic
│       ├── login.js          # Login modal logic
│       ├── register.js       # Register modal logic
│       ├── order.js          # Order modal logic
│       ├── profile.js        # Profile modal logic
│       └── app.js            # Core app initialization
├── components/               # Reusable UI components
│   ├── login-modal.html
│   ├── register-modal.html
│   ├── order-modal.html
│   ├── profile-modal.html
│   └── confirmation-modal.html
├── utils/                    # Utility functions
│   ├── orderStatus.js       # Order status management
│   ├── api.js               # API calls (for backend integration)
│   └── helpers.js           # General helper functions
├── cnts.js         # Constants and status definitions
└── public/                   # Public assets (images, etc.)
```

## Benefits of This Structure

### 1. **Separation of Concerns**
- `assets/` - All static files (CSS, JS)
- `components/` - Reusable HTML components
- `utils/` - Helper functions and utilities
- `config/` - Configuration and constants

### 2. **Easy Backend Integration**
- `utils/api.js` - Centralized API calls
- Clear separation between frontend and backend logic
- Easy to replace API calls when implementing backend

### 3. **Maintainability**
- Each modal has its own HTML, CSSonfig/                   # Configuration files
│   └── consta, and JS files
- Easy to locate and modify specific features
- Clear file naming conventions

### 4. **Scalability**
- Easy to add new components
- Backend integration won't disrupt file structure
- Clear organization for team collaboration

## Backend Integration Points

### API Endpoints (Future)
```javascript
// utils/api.js
const API_BASE_URL = 'http://localhost/water-avenue/api';

// User endpoints
- POST /auth/login
- POST /auth/register
- GET  /auth/profile
- PUT  /auth/profile
- POST /auth/logout

// Order endpoints
- GET  /orders/history
- POST /orders
- PUT  /orders/{id}/status
- POST /orders/{id}/cancel
- POST /orders/{id}/rate

// Admin endpoints (future)
- GET  /admin/orders
- PUT  /admin/orders/{id}/status
```

### Database Tables (Future)
- `users` - User accounts
- `orders` - Order records
- `order_items` - Order items
- `feedbacks` - User feedback
- `order_history` - Status history


