let products = [];
let categories = [];
let orders = [];
let activeSection = "dashboard";
let editState = { type: "", index: -1 };

const STORAGE_KEYS = { products: "inventoryProducts", categories: "inventoryCategories", orders: "inventoryOrders", login: "inventoryLoggedIn", theme: "inventoryDarkMode" };
const sectionTitles = { dashboard: "Inventory Dashboard", products: "Products", categories: "Categories", orders: "Orders", reports: "Reports & Billing", settings: "Settings" };
const money = value => `₹${Number(value || 0).toFixed(2)}`;

window.addEventListener("DOMContentLoaded", init);

function init() {
    bindEvents();
    loadData();
    changeTheme(localStorage.getItem(STORAGE_KEYS.theme) === "true");
    document.getElementById("todayLabel").textContent = new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    if (sessionStorage.getItem(STORAGE_KEYS.login) === "true") showApp();
    else showLogin();
}

function bindEvents() {
    document.querySelectorAll(".sidebar li[data-section]").forEach(item => item.addEventListener("click", () => showSection(item.dataset.section)));
    document.getElementById("loginForm").addEventListener("submit", login);
    document.getElementById("togglePassword").addEventListener("click", togglePassword);
    ["sidebarLogout", "headerLogout", "settingsLogout"].forEach(id => document.getElementById(id).addEventListener("click", logout));
    document.getElementById("themeButton").addEventListener("click", () => changeTheme(!document.body.classList.contains("dark-mode")));
    document.getElementById("productSaveButton").addEventListener("click", saveProduct);
    document.getElementById("productCancelButton").addEventListener("click", cancelProductEdit);
    document.getElementById("categorySaveButton").addEventListener("click", saveCategory);
    document.getElementById("categoryCancelButton").addEventListener("click", cancelCategoryEdit);
    document.getElementById("orderProduct").addEventListener("change", updateOrderPrice);
    document.getElementById("orderQuantity").addEventListener("input", calculateOrderTotal);
    document.getElementById("orderSaveButton").addEventListener("click", saveOrder);
    document.getElementById("orderCancelButton").addEventListener("click", cancelOrderEdit);
    document.getElementById("search").addEventListener("input", searchItems);
    document.addEventListener("click", event => { if (!event.target.closest(".search-wrap")) hideSuggestions(); });
}

function login(event) {
    event.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    const error = document.getElementById("loginError");
    if (!username || !password) { error.textContent = "Username and password are required."; return; }
    if (username !== "admin" || password !== "admin123") { error.textContent = "Invalid login. Use the demo credentials provided below."; return; }
    sessionStorage.setItem(STORAGE_KEYS.login, "true");
    error.textContent = "";
    showApp();
}

function togglePassword() {
    const password = document.getElementById("loginPassword");
    const toggle = document.getElementById("togglePassword");
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    toggle.textContent = visible ? "Show" : "Hide";
    toggle.setAttribute("aria-label", visible ? "Show password" : "Hide password");
}

function logout() {
    sessionStorage.removeItem(STORAGE_KEYS.login);
    showLogin();
}

function showLogin() {
    document.getElementById("loginView").classList.remove("hidden");
    document.getElementById("appView").classList.add("hidden");
}

function showApp() {
    document.getElementById("loginView").classList.add("hidden");
    document.getElementById("appView").classList.remove("hidden");
    showSection("dashboard");
}

function showSection(section) {
    activeSection = section;
    document.querySelectorAll(".section").forEach(item => { item.style.display = item.id === `${section}Section` ? "block" : "none"; });
    document.querySelectorAll(".sidebar li").forEach(item => item.classList.toggle("active", item.dataset.section === section));
    document.getElementById("pageTitle").textContent = sectionTitles[section];
    const search = document.getElementById("search");
    search.value = "";
    search.placeholder = section === "products" ? "Search products..." : section === "categories" ? "Search categories..." : section === "orders" ? "Search orders..." : "Search products...";
    document.getElementById("searchWrap").style.display = ["products", "categories", "orders"].includes(section) ? "block" : "none";
    hideSuggestions();
    if (section !== "products") cancelProductEdit();
    if (section !== "categories") cancelCategoryEdit();
    if (section !== "orders") cancelOrderEdit();
    renderAll();
}

function loadData() {
    products = safeParse(localStorage.getItem(STORAGE_KEYS.products), []).map(product => ({ name: product.name || "", category: product.category || "", price: Number(product.price) || 0, stock: Math.max(0, Number(product.stock) || 0) }));
    categories = safeParse(localStorage.getItem(STORAGE_KEYS.categories), []).map(category => typeof category === "string" ? { name: category } : { name: category.name || "" });
    orders = safeParse(localStorage.getItem(STORAGE_KEYS.orders), []).map((order, index) => ({ id: order.id || `ORD-${String(index + 1).padStart(3, "0")}`, productName: order.productName || "", price: Number(order.price) || 0, quantity: Number(order.quantity) || 0, total: Number(order.total) || (Number(order.price) || 0) * (Number(order.quantity) || 0), payment: order.payment || order.paymentMethod || "", status: order.status || "Pending", date: order.date || "" }));
}

function safeParse(value, fallback) { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
function saveData() { localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products)); localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories)); localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders)); }
function getMetrics() { const items = orders.reduce((sum, order) => sum + order.quantity, 0); const revenue = orders.reduce((sum, order) => sum + order.total, 0); return { items, revenue, low: products.filter(product => product.stock < 10).length }; }
function renderAll() { renderDashboard(); renderProducts(); renderCategories(); renderOrders(); renderReports(); renderCategoryOptions(); renderOrderProductOptions(); }

function renderDashboard() {
    const metrics = getMetrics();
    document.getElementById("totalProducts").textContent = products.length;
    document.getElementById("totalCategories").textContent = categories.length;
    document.getElementById("totalOrders").textContent = orders.length;
    document.getElementById("lowStock").textContent = metrics.low;
    document.getElementById("totalRevenue").textContent = money(metrics.revenue);
    document.getElementById("dashboardItemsSold").textContent = metrics.items;
}

function renderProducts() {
    const body = document.getElementById("productTableBody"); body.innerHTML = "";
    if (!products.length) { body.innerHTML = '<tr><td colspan="5">No products found. Add a product to get started.</td></tr>'; return; }
    products.forEach((product, index) => { const row = document.createElement("tr"); row.innerHTML = `<td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.category)}</td><td>${money(product.price)}</td><td>${stockBadge(product.stock)}</td><td><button type="button" onclick="editProduct(${index})">Edit</button><button type="button" onclick="deleteProduct(${index})">Delete</button></td>`; body.appendChild(row); });
}
function stockBadge(stock) { const state = stock === 0 ? ["Out of Stock", "stock-out"] : stock < 10 ? ["Low Stock", "stock-low"] : ["In Stock", "stock-in"]; return `<span class="badge ${state[1]}">${state[0]} (${stock})</span>`; }

function renderCategories() { const body = document.getElementById("categoryTableBody"); body.innerHTML = ""; if (!categories.length) { body.innerHTML = '<tr><td colspan="2">No categories found. Add a category to get started.</td></tr>'; return; } categories.forEach((category, index) => { const row = document.createElement("tr"); row.innerHTML = `<td>${escapeHtml(category.name)}</td><td><button type="button" onclick="editCategory(${index})">Edit</button><button type="button" onclick="deleteCategory(${index})">Delete</button></td>`; body.appendChild(row); }); }

function renderOrders() { const body = document.getElementById("orderTableBody"); body.innerHTML = ""; if (!orders.length) { body.innerHTML = '<tr><td colspan="9">No orders found. Add an order to get started.</td></tr>'; return; } orders.forEach((order, index) => { const row = document.createElement("tr"); row.innerHTML = `<td>${escapeHtml(order.id)}</td><td>${escapeHtml(order.productName)}</td><td>${money(order.price)}</td><td>${order.quantity}</td><td>${money(order.total)}</td><td>${escapeHtml(order.payment || "Not recorded")}</td><td>${statusBadge(order.status)}</td><td>${escapeHtml(order.date)}</td><td><button type="button" onclick="editOrder(${index})">Edit</button><button type="button" onclick="deleteOrder(${index})">Delete</button></td>`; body.appendChild(row); }); }
function statusBadge(status) { return `<span class="badge badge-${status.toLowerCase()}">${escapeHtml(status)}</span>`; }

function renderReports() {
    const metrics = getMetrics(); const counts = { Pending: 0, Processing: 0, Completed: 0, Cancelled: 0 }; const paymentMethods = ["UPI", "PhonePe", "Google Pay", "Cash", "Credit Card", "Debit Card"]; const paymentTotals = Object.fromEntries(paymentMethods.map(method => [method, 0])); orders.forEach(order => { counts[order.status] = (counts[order.status] || 0) + 1; if (paymentTotals[order.payment] !== undefined) paymentTotals[order.payment] += order.total; });
    document.getElementById("reportTotal").textContent = products.length; document.getElementById("reportCategories").textContent = categories.length; document.getElementById("reportOrders").textContent = orders.length; document.getElementById("reportLow").textContent = metrics.low; document.getElementById("reportItemsSold").textContent = metrics.items; document.getElementById("reportRevenue").textContent = money(metrics.revenue);
    document.getElementById("billingSubtotal").textContent = `Subtotal: ${money(metrics.revenue)}`; document.getElementById("billingOrders").textContent = orders.length; document.getElementById("billingItems").textContent = metrics.items; Object.keys(counts).forEach(status => { document.getElementById(`billing${status}`).textContent = counts[status]; });
    document.getElementById("paymentSummary").innerHTML = paymentMethods.map(method => `<div class="payment-card"><span>${method}</span><strong>${money(paymentTotals[method])}</strong></div>`).join("");
    const body = document.getElementById("billingTableBody"); body.innerHTML = orders.length ? orders.map(order => `<tr><td>${escapeHtml(order.id)}</td><td>${escapeHtml(order.productName)}</td><td>${money(order.price)}</td><td>${order.quantity}</td><td>${money(order.total)}</td><td>${escapeHtml(order.payment || "Not recorded")}</td><td>${statusBadge(order.status)}</td><td>${escapeHtml(order.date)}</td></tr>`).join("") : '<tr><td colspan="8">No billing records yet.</td></tr>';
}

function renderCategoryOptions() { const select = document.getElementById("productCategory"); const current = select.value; select.innerHTML = '<option value="" disabled>Select a category</option>'; categories.forEach(category => { const option = new Option(category.name, category.name); select.add(option); }); select.disabled = !categories.length; select.value = categories.some(category => category.name === current) ? current : ""; }
function renderOrderProductOptions() { const select = document.getElementById("orderProduct"); const current = select.value; select.innerHTML = '<option value="" disabled>Select a product</option>'; products.forEach(product => { const option = new Option(`${product.name} (${product.category})`, product.name); select.add(option); }); select.disabled = !products.length; select.value = products.some(product => product.name === current) ? current : ""; if (select.value) updateOrderPrice(); }

function saveProduct() {
    const name = document.getElementById("productName").value.trim(); const category = document.getElementById("productCategory").value; const price = Number(document.getElementById("productPrice").value); const stock = Number(document.getElementById("productStock").value); const error = document.getElementById("productError");
    const duplicate = products.some((product, index) => product.name.toLowerCase() === name.toLowerCase() && !(editState.type === "product" && index === editState.index));
    if (!name) { error.textContent = "Product name cannot be empty."; return; } if (!category) { error.textContent = "Please select a category."; return; } if (!Number.isFinite(price) || price <= 0) { error.textContent = "Price must be greater than 0."; return; } if (!Number.isInteger(stock) || stock < 0) { error.textContent = "Stock must be 0 or greater."; return; } if (duplicate) { error.textContent = "A product with this name already exists."; return; }
    const product = { name, category, price, stock }; if (editState.type === "product") { const oldName = products[editState.index].name; products[editState.index] = product; orders.forEach(order => { if (order.productName === oldName) { order.productName = name; order.price = price; order.total = Number((price * order.quantity).toFixed(2)); } }); } else products.push(product);
    editState = { type: "", index: -1 }; saveData(); resetProductForm(); renderAll(); showSection("products");
}
function editProduct(index) { const product = products[index]; if (!product) return; document.getElementById("productName").value = product.name; document.getElementById("productCategory").value = product.category; document.getElementById("productPrice").value = product.price; document.getElementById("productStock").value = product.stock; document.getElementById("productFormTitle").textContent = "Edit Product"; document.getElementById("productSaveButton").textContent = "Update Product"; document.getElementById("productCancelButton").classList.remove("hidden"); editState = { type: "product", index }; showSection("products"); }
function deleteProduct(index) { if (!products[index] || !confirm("Delete this product? Existing orders will remain in billing history.")) return; products.splice(index, 1); saveData(); renderAll(); }
function cancelProductEdit() { if (editState.type === "product") editState = { type: "", index: -1 }; resetProductForm(); }
function resetProductForm() { document.getElementById("productName").value = ""; document.getElementById("productPrice").value = ""; document.getElementById("productStock").value = ""; document.getElementById("productError").textContent = ""; document.getElementById("productFormTitle").textContent = "Add Product"; document.getElementById("productSaveButton").textContent = "Add Product"; document.getElementById("productCancelButton").classList.add("hidden"); }

function saveCategory() { const input = document.getElementById("categoryName"); const name = input.value.trim(); const error = document.getElementById("categoryError"); if (!name) { error.textContent = "Category name cannot be empty."; return; } if (categories.some((category, index) => category.name.toLowerCase() === name.toLowerCase() && !(editState.type === "category" && index === editState.index))) { error.textContent = "This category already exists."; return; } if (editState.type === "category") { const old = categories[editState.index].name; categories[editState.index].name = name; products.forEach(product => { if (product.category === old) product.category = name; }); } else categories.push({ name }); editState = { type: "", index: -1 }; saveData(); resetCategoryForm(); renderAll(); showSection("categories"); }
function editCategory(index) { const category = categories[index]; if (!category) return; document.getElementById("categoryName").value = category.name; document.getElementById("categoryFormTitle").textContent = "Edit Category"; document.getElementById("categorySaveButton").textContent = "Update Category"; document.getElementById("categoryCancelButton").classList.remove("hidden"); editState = { type: "category", index }; showSection("categories"); }
function deleteCategory(index) { const name = categories[index]?.name; if (!name) return; if (products.some(product => product.category === name)) { alert("Remove or update linked products before deleting this category."); return; } if (!confirm("Delete this category?")) return; categories.splice(index, 1); saveData(); renderAll(); }
function cancelCategoryEdit() { if (editState.type === "category") editState = { type: "", index: -1 }; resetCategoryForm(); }
function resetCategoryForm() { document.getElementById("categoryName").value = ""; document.getElementById("categoryError").textContent = ""; document.getElementById("categoryFormTitle").textContent = "Add Category"; document.getElementById("categorySaveButton").textContent = "Add Category"; document.getElementById("categoryCancelButton").classList.add("hidden"); }

function updateOrderPrice() { const product = products.find(item => item.name === document.getElementById("orderProduct").value); document.getElementById("orderPrice").value = product ? money(product.price) : ""; document.getElementById("orderAvailableStock").value = product ? product.stock : ""; document.getElementById("orderQuantity").max = product ? product.stock : ""; calculateOrderTotal(); }
function calculateOrderTotal() { const product = products.find(item => item.name === document.getElementById("orderProduct").value); const quantity = Number(document.getElementById("orderQuantity").value); document.getElementById("orderTotal").value = product && quantity > 0 ? money(product.price * quantity) : money(0); const error = document.getElementById("orderError"); if (product && quantity > product.stock) error.textContent = `Only ${product.stock} items are available in stock.`; else error.textContent = ""; }
function saveOrder() {
    const productName = document.getElementById("orderProduct").value; const quantity = Number(document.getElementById("orderQuantity").value); const payment = document.getElementById("orderPayment").value; const status = document.getElementById("orderStatus").value; const product = products.find(item => item.name === productName); const error = document.getElementById("orderError");
    if (!product) { error.textContent = "Please choose a product."; return; } if (!Number.isInteger(quantity) || quantity < 1) { error.textContent = "Quantity must be at least 1."; return; } if (!payment) { error.textContent = "Please select a payment method."; return; }
    const oldOrder = editState.type === "order" ? orders[editState.index] : null; const available = product.stock + (oldOrder && oldOrder.productName === product.name ? oldOrder.quantity : 0); if (quantity > available) { error.textContent = `Only ${available} items are available in stock.`; return; }
    if (oldOrder) restoreOrderStock(oldOrder); product.stock -= quantity; const order = { id: oldOrder?.id || `ORD-${String(Date.now()).slice(-6)}`, productName, price: product.price, quantity, total: Number((product.price * quantity).toFixed(2)), payment, status, date: oldOrder?.date || new Date().toLocaleString() }; if (oldOrder) orders[editState.index] = order; else orders.push(order);
    editState = { type: "", index: -1 }; saveData(); resetOrderForm(); renderAll(); showSection("orders");
}
function restoreOrderStock(order) { const product = products.find(item => item.name === order.productName); if (product) product.stock += order.quantity; }
function editOrder(index) { const order = orders[index]; if (!order) return; document.getElementById("orderProduct").value = order.productName; document.getElementById("orderQuantity").value = order.quantity; document.getElementById("orderPayment").value = order.payment || ""; document.getElementById("orderStatus").value = order.status; document.getElementById("orderFormTitle").textContent = "Edit Order"; document.getElementById("orderSaveButton").textContent = "Update Order"; document.getElementById("orderCancelButton").classList.remove("hidden"); editState = { type: "order", index }; showSection("orders"); document.getElementById("orderPayment").value = order.payment || ""; updateOrderPrice(); }
function deleteOrder(index) { if (!orders[index] || !confirm("Delete this order and restore its stock?")) return; restoreOrderStock(orders[index]); orders.splice(index, 1); saveData(); renderAll(); }
function cancelOrderEdit() { if (editState.type === "order") editState = { type: "", index: -1 }; resetOrderForm(); }
function resetOrderForm() { document.getElementById("orderQuantity").value = ""; document.getElementById("orderPrice").value = ""; document.getElementById("orderAvailableStock").value = ""; document.getElementById("orderTotal").value = money(0); document.getElementById("orderPayment").value = ""; document.getElementById("orderError").textContent = ""; document.getElementById("orderStatus").value = "Pending"; document.getElementById("orderFormTitle").textContent = "Add Order"; document.getElementById("orderSaveButton").textContent = "Add Order"; document.getElementById("orderCancelButton").classList.add("hidden"); }

function searchItems() { const value = document.getElementById("search").value.trim().toLowerCase(); if (activeSection === "products") { filterRows("#productTableBody tr", value); showProductSuggestions(value); } else if (activeSection === "categories") filterRows("#categoryTableBody tr", value); else if (activeSection === "orders") filterRows("#orderTableBody tr", value); }
function filterRows(selector, value) { document.querySelectorAll(selector).forEach(row => { row.style.display = !value || row.innerText.toLowerCase().includes(value) ? "" : "none"; }); }
function showProductSuggestions(value) { const box = document.getElementById("searchSuggestions"); box.innerHTML = ""; if (!value) { hideSuggestions(); return; } const matches = products.filter(product => `${product.name} ${product.category}`.toLowerCase().includes(value)); if (!matches.length) { box.innerHTML = '<div class="suggestion">No products found</div>'; box.style.display = "block"; return; } matches.forEach(product => { const button = document.createElement("button"); button.type = "button"; button.className = "suggestion"; button.textContent = `${product.name} · ${product.category}`; button.addEventListener("click", () => { document.getElementById("search").value = product.name; filterRows("#productTableBody tr", product.name.toLowerCase()); hideSuggestions(); }); box.appendChild(button); }); box.style.display = "block"; }
function hideSuggestions() { document.getElementById("searchSuggestions").style.display = "none"; }
function changeTheme(enabled) { document.body.classList.toggle("dark-mode", enabled); localStorage.setItem(STORAGE_KEYS.theme, String(enabled)); document.getElementById("themeButton").textContent = enabled ? "Disable Dark Mode" : "Enable Dark Mode"; }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
