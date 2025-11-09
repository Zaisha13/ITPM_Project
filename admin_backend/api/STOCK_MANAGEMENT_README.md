# Stock Management Feature

## Overview
This feature allows admins to manually record and monitor the remaining stock of brand-new containers (both Slim and Round) through a clickable interface in the admin dashboard.

## Features
- Clickable container cards in the dashboard
- Modal popup for stock management
- Add stock with quantity input
- Real-time stock updates

## Database Setup

The feature relies on the existing `tbl_container_count` table that stores container stock counts. No additional tables are required.

## API Endpoints

### 1. Get Container Stock
**Endpoint:** `GET /admin_backend/api/get_container_stock.php`

**Parameters:**
- `containerTypeID` (optional): Get stock for specific container type (1 = Slim, 2 = Round)
  - If omitted, returns all container stocks

**Response:**
```json
{
  "success": true,
  "data": {
    "stock": {
      "CountID": 3,
      "ContainerTypeID": 1,
      "Stock": 42,
      "ContainerTypeName": "Slim"
    }
  }
}
```

### 2. Add Container Stock
**Endpoint:** `POST /admin_backend/api/add_container_stock.php`

**Request Body:**
```json
{
  "containerTypeID": 1,
  "quantity": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "stockBefore": 32,
    "stockAfter": 42,
    "quantityAdded": 10
  }
}
```

## Usage

1. **Access Stock Management:**
   - Navigate to the Admin Dashboard
   - Click on either "Slim Containers" or "Round Containers" card

2. **Add Stock:**
   - Enter the quantity to add
   - Click "Add Stock"

## Files Modified/Created

### Backend
- `admin_backend/api/get_container_stock.php` - Get stock data
- `admin_backend/api/add_container_stock.php` - Add stock count

### Frontend
- `system_admin/index.html` - Added modal HTML and clickable card attributes
- `system_admin/assets/js/admin.js` - Added stock management functionality
- `system_admin/assets/css/admin.css` - Added modal styling

## Notes
- Stock values are automatically loaded when the dashboard loads
- Stock values update in real-time after adding stock
- The modal can be closed by clicking the X button, Cancel button, or clicking outside the modal


