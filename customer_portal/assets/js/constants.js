/* =====================================
   Constants for Water Avenue System
   ===================================== */

// ORDER STATUSES (for backend integration)
const ORDER_STATUSES = {
  FOR_APPROVAL: 'for-approval',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready-for-pickup',
  OUT_FOR_DELIVERY: 'out-for-delivery',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  QUEUED: 'queued'
};

// STATUS LABELS
const STATUS_LABELS = {
  'for-approval': 'For Approval',
  'pending': 'Pending',
  'confirmed': 'Confirmed',
  'preparing': 'Preparing',
  'ready-for-pickup': 'Ready for Pickup',
  'out-for-delivery': 'Out for Delivery',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'queued': 'Queued'
};

// STATUS CLASSES for styling
const STATUS_CLASSES = {
  'for-approval': 'status-for-approval',
  'pending': 'status-pending',
  'confirmed': 'status-confirmed',
  'preparing': 'status-preparing',
  'ready-for-pickup': 'status-ready-for-pickup',
  'out-for-delivery': 'status-out-for-delivery',
  'completed': 'status-completed',
  'cancelled': 'status-cancelled',
  'queued': 'status-queued'
};

// Payment methods
const PAYMENT_METHODS = {
  CASH: 'cash',
  GCASH: 'gcash',
  LOAN: 'loan'
};

// Delivery methods
const DELIVERY_METHODS = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery'
};

// Prices
const PRICES_CONST = {
  refill: 25,
  brandNew: 225,
  wilkins: 10
};

// Action buttons visibility rules
const ACTION_VISIBILITY = {
  // Cancel button is only visible for these statuses
  CANCEL: ['for-approval', 'pending'],
  
  // Rate button is only visible for these statuses
  RATE: ['completed'],
  
  // Reorder button is only clickable for these statuses
  REORDER_CLICKABLE: ['completed']
};

window.CONSTANTS = { ORDER_STATUSES, STATUS_LABELS, STATUS_CLASSES, PAYMENT_METHODS, DELIVERY_METHODS, PRICES_CONST, ACTION_VISIBILITY };

