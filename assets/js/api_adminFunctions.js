
// assets/js/api_functions.js

// INSERT CUSTOMER
async function insertCustomer(customerData) {
  const response = await fetch(API_BASE + "insert_customers.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customerData)
  });
  const result = await response.json();
  console.log(result);
  return result;
}

// DELETE CUSTOMER
async function deleteCustomer(customerID) {
  const response = await fetch(API_BASE + "delete_customers.php", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ CustomerID: customerID })
  });
  const result = await response.json();
  console.log(result);
  return result;
}

// UPDATE CUSTOMER
async function updateCustomer(updateData) {
  const response = await fetch(API_BASE + "update_customers.php", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData)
  });
  const result = await response.json();
  console.log(result);
  return result;
}

