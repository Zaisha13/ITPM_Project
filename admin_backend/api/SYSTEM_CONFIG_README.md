# System Configuration Setup

This document explains how to set up and use the System Configuration feature.

## Database Setup

1. **Create the system configuration table:**
   ```sql
   -- Run the SQL file in your database
   source admin_backend/api/create_system_config_table.sql
   ```
   
   Or manually execute the SQL commands in `create_system_config_table.sql`

## Features

### 1. Capacity Limits
- **Daily Order Limit**: Maximum number of orders (refill + brand new) allowed per day (default: 300)
- **Available Capacity**: Automatically calculated based on confirmed orders for today
- Updates automatically when orders are confirmed
- Resets daily (based on order creation date)

### 2. Operating Hours
- **Opening Time**: Business opening time
- **Closing Time**: Business closing time
- **Operating Days**: Days of the week the business operates
- Visible to customers via "Learn More" modal

### 3. Maintenance Notice
- **Enable/Disable**: Toggle maintenance notice visibility
- **Title**: Notice title
- **Message**: Detailed maintenance message
- **Start/End Date**: Maintenance period
- Displays as a banner at the top of customer portal when active

### 4. Contact Details
- Business name, email, phone, address, and website
- Can be used for display in customer portal

## API Endpoints

### Get System Configuration
```
GET /admin_backend/api/get_system_config.php?type={type}
```
**Types:**
- `all` - Returns all configuration
- `capacity` - Returns capacity limits
- `operating_hours` - Returns operating hours
- `maintenance` - Returns maintenance notice

### Update System Configuration
```
POST /admin_backend/api/update_system_config.php
Content-Type: application/json

{
  "type": "capacity|operating_hours|maintenance|contact",
  ...other fields based on type
}
```

## How It Works

1. **Admin saves configuration** → Data is stored in `tbl_system_config` table
2. **Customer portal loads** → Fetches configuration from API
3. **Order confirmed** → Capacity automatically decreases
4. **Daily reset** → Capacity resets based on order creation date (not time-based)

## Capacity Calculation

- When an order status is changed to "Confirmed", the system:
  1. Counts all confirmed orders for today
  2. Calculates: `Available Capacity = Daily Limit - Confirmed Orders`
  3. Updates the `available_capacity` value in the database

## Customer Portal Integration

- **Operating Hours**: Displayed in modal when clicking "Learn More" button
- **Maintenance Notice**: Shows as banner at top of page when active
- **Capacity**: Displayed in order preview before placing order

## Notes

- Capacity is calculated based on order creation date (DATE(CreatedAt))
- Each confirmed order counts as 1, regardless of number of items
- Capacity resets daily automatically (no cron job needed)
- All configuration is stored in the database and persists across sessions



