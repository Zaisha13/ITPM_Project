/* =====================================
   Order Status Management Utilities
   ===================================== */

// Order statuses
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

// Status labels
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

// Status CSS classes
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

// Get status label
function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

// Get status CSS class
function getStatusClass(status) {
  return STATUS_CLASSES[status] || '';
}

// Check if cancel button should be visible
function canCancel(status) {
  return ['for-approval', 'pending'].includes(status);
}

// Check if rate button should be visible
function canRate(status) {
  return ['completed'].includes(status);
}

// Check if reorder button should be clickable
function canReorder(status) {
  return ['completed'].includes(status);
}

// Export to window for global access
window.OrderStatusUtils = {
  getStatusLabel,
  getStatusClass,
  canCancel,
  canRate,
  canReorder,
  ORDER_STATUSES,
  STATUS_LABELS,
  STATUS_CLASSES
};

