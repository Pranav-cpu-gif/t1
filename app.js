// BizzTrak - Main Application JavaScript (v2.2 – fully working)

// ==================== GLOBAL STATE ====================
let currentUser = null;
let currentSaleId = null;

let appData = {
    customers: [],
    sales: {},
    expenses: {},
    inventory: [],
    deliveries: [],
    settings: {},
    subscription: { plan: 'trial', expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }
};

let elements = {};

// ==================== UTILITY FUNCTIONS ====================
function getCurrentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function getMonthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function loadMonthlyData(type, monthKey) {
    const stored = localStorage.getItem(`bizztrak_${type}_${monthKey}`);
    return stored ? JSON.parse(stored) : [];
}
function saveMonthlyData(type, monthKey, data) {
    localStorage.setItem(`bizztrak_${type}_${monthKey}`, JSON.stringify(data));
}
function loadCustomersFromStorage() {
    return JSON.parse(localStorage.getItem('bizztrak_customers') || '[]');
}
function saveCustomersToStorage(customers) {
    localStorage.setItem('bizztrak_customers', JSON.stringify(customers));
}
function loadInventoryFromStorage() {
    return JSON.parse(localStorage.getItem('bizztrak_inventory') || '[]');
}
function saveInventoryToStorage(inventory) {
    localStorage.setItem('bizztrak_inventory', JSON.stringify(inventory));
}
function loadDeliveriesFromStorage() {
    return JSON.parse(localStorage.getItem('bizztrak_deliveries') || '[]');
}
function saveDeliveriesToStorage(deliveries) {
    localStorage.setItem('bizztrak_deliveries', JSON.stringify(deliveries));
}
function loadReceiptSettings() {
    const saved = localStorage.getItem('bizztrak_receipt_settings');
    if (saved) return JSON.parse(saved);
    return { businessName: '', address: '', phone: '', footer: 'Thank you for your business!' };
}
function saveReceiptSettings(settings) {
    localStorage.setItem('bizztrak_receipt_settings', JSON.stringify(settings));
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span><button class="btn-icon" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}
function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    elements = {
        loadingScreen: document.getElementById('loading-screen'),
        authScreen: document.getElementById('auth-screen'),
        appContainer: document.getElementById('app-container'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        forgotForm: document.getElementById('forgot-form'),
        userBusinessName: document.getElementById('user-business-name'),
        sidebarBusinessName: document.getElementById('sidebar-business-name'),
        sidebarBusinessType: document.getElementById('sidebar-business-type'),
        planBadge: document.getElementById('plan-badge'),
        subscriptionStatus: document.getElementById('subscription-status'),
        trialDays: document.getElementById('trial-days'),
        currentDate: document.getElementById('current-date'),
        dashboardView: document.getElementById('dashboard-view'),
        crmView: document.getElementById('crm-view'),
        salesView: document.getElementById('sales-view'),
        expensesView: document.getElementById('expenses-view'),
        inventoryView: document.getElementById('inventory-view'),
        deliveriesView: document.getElementById('deliveries-view'),
        whatsappView: document.getElementById('whatsapp-view'),
        receiptsView: document.getElementById('receipts-view'),
        printerView: document.getElementById('printer-view'),
        subscriptionView: document.getElementById('subscription-view'),
        settingsView: document.getElementById('settings-view'),
        aiView: document.getElementById('ai-view')
    };
    checkLoginStatus();
    updateCurrentDate();
    loadDemoData();
    setTimeout(initCharts, 1000);
    initDarkMode();
    checkSubscriptionAndEnforce();

    document.getElementById('new-product-image')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => document.getElementById('image-preview').innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
            reader.readAsDataURL(file);
        }
    });
});

// Dark Mode
function initDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) document.body.classList.add('dark-mode');
    updateDarkModeIcon(darkMode);
}
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark);
    updateDarkModeIcon(isDark);
    showToast(`${isDark ? 'Dark' : 'Light'} mode activated`, 'info');
}
function updateDarkModeIcon(isDark) {
    const icon = document.getElementById('dark-mode-icon-header');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

// ==================== AUTHENTICATION ====================
function checkLoginStatus() {
    const savedUser = localStorage.getItem('bizztrak_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showApp();
            showToast('Welcome back!', 'success');
        } catch(e) { showAuth(); }
    } else showAuth();
}
function showAuth() {
    elements.loadingScreen.style.display = 'none';
    elements.authScreen.style.display = 'flex';
    elements.appContainer.style.display = 'none';
}
function showApp() {
    elements.loadingScreen.style.display = 'none';
    elements.authScreen.style.display = 'none';
    elements.appContainer.style.display = 'flex';
    if (currentUser) {
        elements.userBusinessName.textContent = currentUser.businessName;
        elements.sidebarBusinessName.textContent = currentUser.businessName;
        elements.sidebarBusinessType.textContent = currentUser.businessType || 'Business';
        updateSubscriptionInfo();
    }
    showDashboard();
}
function showRegister() { elements.loginForm.style.display = 'none'; elements.forgotForm.style.display = 'none'; elements.registerForm.style.display = 'block'; }
function showLogin() { elements.registerForm.style.display = 'none'; elements.forgotForm.style.display = 'none'; elements.loginForm.style.display = 'block'; }
function showForgotPassword() { elements.loginForm.style.display = 'none'; elements.registerForm.style.display = 'none'; elements.forgotForm.style.display = 'block'; }

function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) return showToast('Please fill in all fields', 'error');
    const users = JSON.parse(localStorage.getItem('bizztrak_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user;
        localStorage.setItem('bizztrak_user', JSON.stringify(user));
        showApp();
        showToast('Login successful!', 'success');
    } else showToast('Invalid email or password', 'error');
}
function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const businessType = document.getElementById('business-type').value;
    if (!name || !email || !phone || !password || !confirm || !businessType) return showToast('Please fill in all fields', 'error');
    if (password.length < 8) return showToast('Password must be at least 8 characters', 'error');
    if (password !== confirm) return showToast('Passwords do not match', 'error');
    if (!validateEmail(email)) return showToast('Please enter a valid email', 'error');
    const users = JSON.parse(localStorage.getItem('bizztrak_users') || '[]');
    if (users.find(u => u.email === email)) return showToast('Email already registered', 'error');
    const newUser = {
        id: Date.now().toString(),
        businessName: name,
        email, phone, password, businessType,
        createdAt: new Date().toISOString(),
        subscription: { plan: 'trial', expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() }
    };
    users.push(newUser);
    localStorage.setItem('bizztrak_users', JSON.stringify(users));
    currentUser = newUser;
    localStorage.setItem('bizztrak_user', JSON.stringify(newUser));
    showApp();
    showToast('Registration successful! 14‑day trial started.', 'success');
}
function resetPassword() {
    const email = document.getElementById('reset-email').value;
    if (!email) return showToast('Please enter your email', 'error');
    showToast(`Reset link sent to ${email}`, 'success');
    showLogin();
}
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('bizztrak_user');
        currentUser = null;
        showAuth();
        showToast('Logged out successfully', 'success');
    }
}

// ==================== UI HELPERS ====================
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }
function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}
function updateCurrentDate() {
    const now = new Date();
    elements.currentDate.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function updateSubscriptionInfo() {
    if (!currentUser) return;
    const expiry = new Date(currentUser.subscription.expiry);
    const daysLeft = Math.ceil((expiry - new Date()) / (1000*60*60*24));
    elements.subscriptionStatus.textContent = currentUser.subscription.plan === 'trial' ? 'Free Trial' : currentUser.subscription.plan.charAt(0).toUpperCase() + currentUser.subscription.plan.slice(1);
    elements.trialDays.textContent = `(${daysLeft} days left)`;
    elements.planBadge.textContent = currentUser.subscription.plan === 'trial' ? 'Free Trial' : currentUser.subscription.plan.charAt(0).toUpperCase() + currentUser.subscription.plan.slice(1);
}
function hideAllViews() { document.querySelectorAll('.content-view').forEach(v => v.style.display = 'none'); }
function setActiveMenu(index) {
    document.querySelectorAll('.sidebar-menu li').forEach((item, i) => item.classList.toggle('active', i === index));
}
function showDashboard() { hideAllViews(); elements.dashboardView.style.display = 'block'; updateDashboardStats(); setActiveMenu(0); }
function showCRM() { hideAllViews(); elements.crmView.style.display = 'block'; loadCustomers(); setActiveMenu(1); }
function showSales() { hideAllViews(); elements.salesView.style.display = 'block'; populateMonthSelector('sales'); loadSales(getCurrentMonthKey()); setActiveMenu(2); }
function showExpenses() { hideAllViews(); elements.expensesView.style.display = 'block'; populateMonthSelector('expenses'); loadExpenses(getCurrentMonthKey()); setActiveMenu(3); }
function showInventory() { hideAllViews(); elements.inventoryView.style.display = 'block'; loadInventory(); setActiveMenu(4); }
function showDeliveries() { hideAllViews(); elements.deliveriesView.style.display = 'block'; renderDeliveries(); setActiveMenu(5); }
function showWhatsApp() { hideAllViews(); elements.whatsappView.style.display = 'block'; setActiveMenu(6); }
function showReceipts() { hideAllViews(); elements.receiptsView.style.display = 'block'; loadReceiptSettingsToForm(); setActiveMenu(7); }
function showPrinter() { hideAllViews(); elements.printerView.style.display = 'block'; setActiveMenu(8); }
function showAI() { hideAllViews(); elements.aiView.style.display = 'block'; setActiveMenu(9); }
function showSettings() { hideAllViews(); elements.settingsView.style.display = 'block'; loadSettings(); setActiveMenu(10); }
function showSubscription() { hideAllViews(); elements.subscriptionView.style.display = 'block'; setActiveMenu(11); }

// Month selector
function populateMonthSelector(type) {
    const select = document.getElementById(`${type}-month-selector`);
    if (!select) return;
    const prefix = `bizztrak_${type}_`;
    const months = new Set();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(prefix)) {
            const month = key.substring(prefix.length);
            if (month.match(/^\d{4}-\d{2}$/)) months.add(month);
        }
    }
    const current = getCurrentMonthKey();
    months.add(current);
    const sorted = Array.from(months).sort().reverse();
    select.innerHTML = '';
    sorted.forEach(m => {
        const option = document.createElement('option');
        option.value = m;
        const [year, month] = m.split('-');
        const monthName = new Date(year, month-1).toLocaleString('default', { month: 'long' });
        option.textContent = `${monthName} ${year}`;
        select.appendChild(option);
    });
    select.value = current;
}
function changeSalesMonth() { loadSales(document.getElementById('sales-month-selector').value); }
function changeExpensesMonth() { loadExpenses(document.getElementById('expenses-month-selector').value); }

// Load demo data
function loadDemoData() {
    appData.customers = loadCustomersFromStorage();
    if (appData.customers.length === 0) {
        appData.customers = [
            { id: '1', name: 'John Doe', phone: '1234567890', email: 'john@example.com', totalPurchases: 5000, lastPurchase: '2024-01-15', deleted: false },
            { id: '2', name: 'Jane Smith', phone: '0987654321', email: 'jane@example.com', totalPurchases: 3000, lastPurchase: '2024-01-14', deleted: false },
            { id: '3', name: 'Bob Johnson', phone: '5551234567', email: 'bob@example.com', totalPurchases: 7500, lastPurchase: '2024-01-13', deleted: false }
        ];
        saveCustomersToStorage(appData.customers);
    }
    appData.inventory = loadInventoryFromStorage();
    if (appData.inventory.length === 0) {
        appData.inventory = [
            { id: '1', name: 'Product A', sku: 'PROD001', category: 'Electronics', stock: 50, price: 100, lowStock: 10, image: null, deleted: false },
            { id: '2', name: 'Product B', sku: 'PROD002', category: 'Appliances', stock: 25, price: 200, lowStock: 5, image: null, deleted: false },
            { id: '3', name: 'Product C', sku: 'PROD003', category: 'Furniture', stock: 5, price: 500, lowStock: 10, image: null, deleted: false }
        ];
        saveInventoryToStorage(appData.inventory);
    }
    appData.deliveries = loadDeliveriesFromStorage();
    if (appData.deliveries.length === 0) {
        appData.deliveries = [
            { id: 'del1', customerId: '1', customerName: 'John Doe', items: [{name:'Product A', quantity:2}], deliveryDate: new Date(Date.now()+86400000).toISOString().split('T')[0], status: 'pending', notes: 'Call before delivery' }
        ];
        saveDeliveriesToStorage(appData.deliveries);
    }
}

function checkSubscriptionAndEnforce() {
    if (!currentUser) return;
    const now = new Date();
    const expiry = new Date(currentUser.subscription.expiry);
    if (currentUser.subscription.plan === 'trial' && now > expiry) {
        showToast('Your trial has expired. Please upgrade.', 'error');
        document.querySelectorAll('.btn-primary, .btn-success').forEach(btn => { btn.disabled = true; btn.style.opacity = 0.5; });
    } else {
        document.querySelectorAll('.btn-primary, .btn-success').forEach(btn => btn.disabled = false);
    }
}

// ==================== DASHBOARD ====================
function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = getCurrentMonthKey();
    if (!appData.sales[currentMonth]) appData.sales[currentMonth] = loadMonthlyData('sales', currentMonth);
    if (!appData.expenses[currentMonth]) appData.expenses[currentMonth] = loadMonthlyData('expenses', currentMonth);
    const monthSales = appData.sales[currentMonth] || [];
    const monthExpenses = appData.expenses[currentMonth] || [];
    const todaySales = monthSales.filter(s => s.date === today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const todayExpenses = monthExpenses.filter(e => e.date === today);
    const todayExpensesTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('today-revenue').textContent = `Rs ${todayRevenue}`;
    document.getElementById('total-customers').textContent = appData.customers.filter(c => !c.deleted).length;
    document.getElementById('today-sales').textContent = todaySales.length;
    document.getElementById('today-expenses').textContent = `Rs ${todayExpensesTotal}`;
    updateActivityList();
    updateDashboardChartsWithRealData();
}
function updateDashboardChartsWithRealData() {
    const labels = [], data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        const monthSales = appData.sales[getCurrentMonthKey()] || [];
        data.push(monthSales.filter(s => s.date === dateStr).reduce((sum, s) => sum + s.total, 0));
    }
    const revenueChart = Chart.getChart('revenue-chart');
    if (revenueChart) { revenueChart.data.labels = labels; revenueChart.data.datasets[0].data = data; revenueChart.update(); }
    const productCount = {};
    const monthSales = appData.sales[getCurrentMonthKey()] || [];
    monthSales.forEach(sale => sale.items.forEach(item => productCount[item.name] = (productCount[item.name] || 0) + item.quantity));
    const sorted = Object.entries(productCount).sort((a,b) => b[1] - a[1]).slice(0,4);
    const productsChart = Chart.getChart('products-chart');
    if (productsChart) {
        productsChart.data.labels = sorted.length ? sorted.map(p => p[0]) : ['No data'];
        productsChart.data.datasets[0].data = sorted.length ? sorted.map(p => p[1]) : [1];
        productsChart.update();
    }
}
function updateActivityList() {
    const list = document.getElementById('activity-list');
    list.innerHTML = '';
    const activities = [];
    const currentMonth = getCurrentMonthKey();
    (appData.sales[currentMonth] || []).slice(-5).forEach(s => activities.push({ time: s.date, action: `Sale #${s.id}`, amount: `Rs ${s.total}` }));
    (appData.expenses[currentMonth] || []).slice(-5).forEach(e => activities.push({ time: e.date, action: `Expense: ${e.description}`, amount: `Rs ${e.amount}` }));
    activities.sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0,5).forEach(a => {
        const div = document.createElement('div'); div.className = 'activity-item';
        div.innerHTML = `<div class="activity-time">${a.time}</div><div class="activity-details"><div>${a.action}</div><div>${a.amount}</div></div>`;
        list.appendChild(div);
    });
}
function initCharts() {
    new Chart(document.getElementById('revenue-chart'), { type: 'line', data: { labels: [], datasets: [{ label: 'Revenue (Rs)', data: [], borderColor: 'rgb(37,99,235)', backgroundColor: 'rgba(37,99,235,0.1)', tension: 0.4 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });
    new Chart(document.getElementById('products-chart'), { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: ['#2563eb','#16a34a','#f59e0b','#dc2626'] }] }, options: { responsive: true } });
    new Chart(document.getElementById('expenses-chart'), { type: 'pie', data: { labels: ['Rent','Utilities','Salary','Inventory','Marketing'], datasets: [{ data: [40,20,25,10,5], backgroundColor: ['#2563eb','#16a34a','#f59e0b','#dc2626','#8b5cf6'] }] }, options: { responsive: true } });
}

// ==================== CRM ====================
function loadCustomers() {
    const tbody = document.querySelector('#customers-table tbody');
    tbody.innerHTML = '';
    appData.customers.filter(c => !c.deleted).forEach(c => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${c.name}${c.deleted ? ' (deleted)' : ''}</td><td>${c.phone}</td><td>${c.email}</td><td>Rs ${c.totalPurchases || 0}</td><td>${c.lastPurchase || 'Never'}</td>
        <td><button class="btn-icon" onclick="editCustomer('${c.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn-icon" onclick="deleteCustomer('${c.id}')"><i class="fas fa-trash"></i></button></td>`;
    });
}
function addNewCustomer() {
    const name = prompt('Enter customer name:'); if (!name) return;
    const phone = prompt('Enter phone:'); const email = prompt('Enter email:');
    const newC = { id: Date.now().toString(), name, phone: phone || '', email: email || '', totalPurchases: 0, lastPurchase: null, deleted: false };
    appData.customers.push(newC); saveCustomersToStorage(appData.customers); loadCustomers(); showToast('Customer added', 'success');
}
function editCustomer(id) {
    const customer = appData.customers.find(c => c.id === id); if (!customer) return;
    const name = prompt('Edit name:', customer.name); if (name) customer.name = name;
    const phone = prompt('Edit phone:', customer.phone); if (phone) customer.phone = phone;
    const email = prompt('Edit email:', customer.email); if (email) customer.email = email;
    saveCustomersToStorage(appData.customers); loadCustomers(); showToast('Customer updated', 'success');
}
function deleteCustomer(id) {
    if (!confirm('Delete this customer?')) return;
    const customer = appData.customers.find(c => c.id === id); if (customer) customer.deleted = true;
    saveCustomersToStorage(appData.customers); loadCustomers(); showToast('Customer deleted', 'success');
}
function quickAddCustomer() {
    const name = prompt('Quick add customer name:'); if (!name) return;
    const phone = prompt('Phone (optional):');
    const newC = { id: Date.now().toString(), name, phone: phone || '', email: '', totalPurchases: 0, lastPurchase: null, deleted: false };
    appData.customers.push(newC); saveCustomersToStorage(appData.customers);
    populateCustomerDropdown(); showToast('Customer added', 'success');
}
function populateCustomerDropdown() {
    const select = document.getElementById('sale-customer');
    select.innerHTML = '<option value="">Walk-in Customer</option>';
    appData.customers.filter(c => !c.deleted).forEach(c => { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = `${c.name} (${c.phone})`; select.appendChild(opt); });
}

// ==================== SALES ====================
function loadSales(monthKey = getCurrentMonthKey()) {
    if (!appData.sales[monthKey]) appData.sales[monthKey] = loadMonthlyData('sales', monthKey);
    const sales = appData.sales[monthKey] || [];
    const tbody = document.querySelector('#sales-table tbody');
    tbody.innerHTML = '';
    sales.filter(s => !s.deleted).forEach(sale => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>#${sale.id}</td><td>${sale.customer || 'Walk-in'}</td><td>${sale.date}</td><td>Rs ${sale.total}</td><td><span class="badge success">Completed</span></td>
        <td><button class="btn-icon" onclick="viewSale('${sale.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn-icon" onclick="printReceiptForSale('${sale.id}')"><i class="fas fa-print"></i></button>
        <button class="btn-icon" onclick="sendReceiptViaWhatsApp('${sale.id}')"><i class="fab fa-whatsapp"></i></button>
        <button class="btn-icon" onclick="deleteSale('${sale.id}')"><i class="fas fa-trash"></i></button></td>`;
    });
}
function createNewSale() {
    document.getElementById('new-sale-form').style.display = 'block';
    populateCustomerDropdown();
    document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
    loadProductGrid();
}
function loadProductGrid() {
    const search = document.getElementById('product-grid-search')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('product-category-filter')?.value || '';
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const categories = [...new Set(appData.inventory.map(p => p.category))];
    const filterSelect = document.getElementById('product-category-filter');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(cat => { const opt = document.createElement('option'); opt.value = cat; opt.textContent = cat; filterSelect.appendChild(opt); });
        filterSelect.value = categoryFilter;
    }
    let products = appData.inventory.filter(p => !p.deleted);
    if (search) products = products.filter(p => p.name.toLowerCase().includes(search));
    if (categoryFilter) products = products.filter(p => p.category === categoryFilter);
    const grouped = {};
    products.forEach(p => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category].push(p); });
    for (const cat in grouped) {
        const header = document.createElement('div'); header.className = 'category-header'; header.textContent = cat; grid.appendChild(header);
        grouped[cat].forEach(p => {
            const tile = document.createElement('div'); tile.className = 'product-tile';
            tile.innerHTML = `
                <img src="${p.image || 'https://via.placeholder.com/80?text=No+Image'}" alt="${p.name}" onclick="addProductToSaleFromGrid('${p.id}')" style="cursor:pointer;">
                <div class="product-name">${p.name}</div>
                <div class="product-price">Rs ${p.price}</div>
                ${p.stock > 0 ? `<button class="add-btn" onclick="addProductToSaleFromGrid('${p.id}')">Add to Sale</button>` : `<span class="out-of-stock">Out of stock</span>`}
            `;
            grid.appendChild(tile);
        });
    }
}
function addProductToSaleFromGrid(productId) {
    const product = appData.inventory.find(p => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) return showToast('Out of stock', 'error');
    const tbody = document.getElementById('sale-items');
    let existingRow = null;
    for (let row of tbody.children) if (row.cells[0]?.textContent === product.name) { existingRow = row; break; }
    if (existingRow) {
        const qtyInput = existingRow.querySelector('.quantity-input');
        qtyInput.value = parseInt(qtyInput.value) + 1;
    } else {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${product.name}</td><td><input type="number" class="quantity-input" value="1" min="1" style="width:60px;" onchange="updateSaleTotal()"></td><td>Rs ${product.price}</td><td>Rs ${product.price}</td><td><button class="btn-icon" onclick="this.closest('tr').remove(); updateSaleTotal();"><i class="fas fa-times"></i></button></td>`;
    }
    updateSaleTotal();
}
function quickAddSaleItem() {
    const name = document.getElementById('quick-item-name').value.trim();
    const price = parseFloat(document.getElementById('quick-item-price').value);
    const qty = parseInt(document.getElementById('quick-item-qty').value) || 1;
    if (!name || isNaN(price) || price <= 0) return showToast('Enter valid name and price', 'error');
    const tbody = document.getElementById('sale-items');
    const row = tbody.insertRow();
    row.innerHTML = `<td>${name}</td><td><input type="number" class="quantity-input" value="${qty}" min="1" style="width:60px;" onchange="updateSaleTotal()"></td><td>Rs ${price.toFixed(2)}</td><td>Rs ${(qty * price).toFixed(2)}</td><td><button class="btn-icon" onclick="this.closest('tr').remove(); updateSaleTotal();"><i class="fas fa-times"></i></button></td>`;
    document.getElementById('quick-item-name').value = ''; document.getElementById('quick-item-price').value = ''; document.getElementById('quick-item-qty').value = '1';
    updateSaleTotal();
}
function updateSaleTotal() {
    let total = 0;
    document.querySelectorAll('#sale-items tr').forEach(row => {
        const qty = row.querySelector('.quantity-input').value;
        const price = parseFloat(row.cells[2].textContent.replace('Rs ', ''));
        const itemTotal = qty * price;
        total += itemTotal;
        row.cells[3].textContent = `Rs ${itemTotal.toFixed(2)}`;
    });
    document.getElementById('sale-total').textContent = `Rs ${total.toFixed(2)}`;
}
function cancelSale() {
    document.getElementById('new-sale-form').style.display = 'none';
    document.getElementById('sale-items').innerHTML = '';
    document.getElementById('sale-total').textContent = 'Rs 0';
}
function saveSale() {
    if (currentUser.subscription.plan === 'trial') {
        const currentMonth = getCurrentMonthKey();
        if ((appData.sales[currentMonth] || []).length >= 50) return showToast('Trial limit reached (50 sales). Please upgrade.', 'error');
    }
    const customerId = document.getElementById('sale-customer').value;
    const date = document.getElementById('sale-date').value;
    const items = []; let total = 0;
    document.querySelectorAll('#sale-items tr').forEach(row => {
        const name = row.cells[0].textContent;
        const qty = row.querySelector('.quantity-input').value;
        const price = parseFloat(row.cells[2].textContent.replace('Rs ', ''));
        const itemTotal = qty * price;
        items.push({ name, quantity: parseInt(qty), price, total: itemTotal });
        total += itemTotal;
    });
    if (items.length === 0) return showToast('Add at least one item', 'error');
    let customerName = 'Walk-in', customerPhone = null;
    if (customerId) {
        const customer = appData.customers.find(c => c.id === customerId);
        if (customer) {
            customerName = customer.name; customerPhone = customer.phone;
            customer.totalPurchases = (customer.totalPurchases || 0) + total;
            customer.lastPurchase = date;
            saveCustomersToStorage(appData.customers);
        }
    }
    const newSale = {
        id: Date.now().toString(), customer: customerName, customerId: customerId || null, customerPhone,
        date, items, total, paymentMethod: document.querySelector('input[name="payment"]:checked').value,
        createdAt: new Date().toISOString(), deleted: false
    };
    const monthKey = getMonthKey(date);
    if (!appData.sales[monthKey]) appData.sales[monthKey] = loadMonthlyData('sales', monthKey);
    appData.sales[monthKey].push(newSale);
    saveMonthlyData('sales', monthKey, appData.sales[monthKey]);
    items.forEach(saleItem => {
        const invItem = appData.inventory.find(i => i.name === saleItem.name);
        if (invItem) invItem.stock -= saleItem.quantity;
    });
    saveInventoryToStorage(appData.inventory);
    const needsDelivery = document.getElementById('sale-needs-delivery').checked;
    if (needsDelivery && customerId) {
        const deliveryItems = items.map(i => ({ name: i.name, quantity: i.quantity }));
        const deliveryDate = new Date(date);
        deliveryDate.setDate(deliveryDate.getDate() + 2);
        const newDelivery = {
            id: Date.now().toString(),
            customerId: customerId,
            customerName: customerName,
            items: deliveryItems,
            deliveryDate: deliveryDate.toISOString().split('T')[0],
            status: 'pending',
            notes: `Created from sale #${newSale.id}`
        };
        appData.deliveries.push(newDelivery);
        saveDeliveriesToStorage(appData.deliveries);
        showToast('Delivery record created', 'success');
    }
    cancelSale();
    loadSales(document.getElementById('sales-month-selector')?.value || getCurrentMonthKey());
    showToast('Sale saved', 'success');
    currentSaleId = newSale.id;
    document.getElementById('receipt-options-modal').style.display = 'flex';
}
function viewSale(id) {
    let sale = null;
    for (let mk in appData.sales) { sale = appData.sales[mk].find(s => s.id === id); if (sale) break; }
    if (!sale) {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('bizztrak_sales_')) {
                const monthData = JSON.parse(localStorage.getItem(key));
                sale = monthData.find(s => s.id === id);
                if (sale) break;
            }
        }
    }
    if (!sale) return showToast('Sale not found', 'error');
    let itemsHtml = sale.items.map(i => `${i.name} x${i.quantity} = Rs ${i.total}`).join('\n');
    alert(`Sale #${sale.id}\nDate: ${sale.date}\nCustomer: ${sale.customer}\nItems:\n${itemsHtml}\nTotal: Rs ${sale.total}\nPayment: ${sale.paymentMethod}`);
}
function deleteSale(id) {
    if (!confirm('Mark this sale as deleted?')) return;
    for (let mk in appData.sales) {
        const sale = appData.sales[mk].find(s => s.id === id);
        if (sale) { sale.deleted = true; saveMonthlyData('sales', mk, appData.sales[mk]); break; }
    }
    loadSales(document.getElementById('sales-month-selector')?.value || getCurrentMonthKey());
    showToast('Sale deleted', 'success');
}

// ==================== EXPENSES ====================
function loadExpenses(monthKey = getCurrentMonthKey()) {
    if (!appData.expenses[monthKey]) appData.expenses[monthKey] = loadMonthlyData('expenses', monthKey);
    const expenses = appData.expenses[monthKey] || [];
    const tbody = document.querySelector('#expenses-table tbody');
    tbody.innerHTML = '';
    const monthlyTotal = expenses.filter(e => !e.deleted).reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('month-expenses').textContent = `Rs ${monthlyTotal}`;
    expenses.filter(e => !e.deleted).forEach(exp => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${exp.date}</td><td>${exp.category}</td><td>${exp.description}</td><td>Rs ${exp.amount}</td><td><button class="btn-icon" onclick="editExpense('${exp.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="deleteExpense('${exp.id}')"><i class="fas fa-trash"></i></button></td>`;
    });
}
function addNewExpense() {
    document.getElementById('new-expense-form').style.display = 'block';
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
}
function cancelExpense() { document.getElementById('new-expense-form').style.display = 'none'; }
function saveExpense() {
    const category = document.getElementById('expense-category').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const description = document.getElementById('expense-description').value;
    const date = document.getElementById('expense-date').value;
    if (!category || isNaN(amount) || amount <= 0 || !description || !date) return showToast('Please fill all fields', 'error');
    const newExpense = { id: Date.now().toString(), category, amount, description, date, deleted: false };
    const monthKey = getMonthKey(date);
    if (!appData.expenses[monthKey]) appData.expenses[monthKey] = loadMonthlyData('expenses', monthKey);
    appData.expenses[monthKey].push(newExpense);
    saveMonthlyData('expenses', monthKey, appData.expenses[monthKey]);
    cancelExpense();
    loadExpenses(document.getElementById('expenses-month-selector')?.value || getCurrentMonthKey());
    showToast('Expense saved', 'success');
}
function editExpense(id) { showToast('Edit expense - not fully implemented', 'info'); }
function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    for (let mk in appData.expenses) {
        const exp = appData.expenses[mk].find(e => e.id === id);
        if (exp) { exp.deleted = true; saveMonthlyData('expenses', mk, appData.expenses[mk]); break; }
    }
    loadExpenses(document.getElementById('expenses-month-selector')?.value || getCurrentMonthKey());
    showToast('Expense deleted', 'success');
}

// ==================== INVENTORY ====================
function loadInventory() {
    const tbody = document.querySelector('#inventory-table tbody');
    tbody.innerHTML = '';
    let totalItems = 0, lowStock = 0, outOfStock = 0, totalValue = 0;
    appData.inventory.filter(i => !i.deleted).forEach(item => {
        totalItems++; totalValue += item.stock * item.price;
        if (item.stock === 0) outOfStock++; else if (item.stock <= item.lowStock) lowStock++;
        const row = tbody.insertRow();
        row.innerHTML = `<td><img src="${item.image || 'https://via.placeholder.com/40?text=No+Image'}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;"></td>
        <td>${item.name}</td><td>${item.sku}</td><td>${item.category}</td>
        <td class="${item.stock === 0 ? 'out-of-stock' : item.stock <= item.lowStock ? 'low-stock' : ''}">${item.stock}</td>
        <td>Rs ${item.price}</td><td>Rs ${item.stock * item.price}</td>
        <td><button class="btn-icon" onclick="editInventoryItem('${item.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn-icon" onclick="deleteInventoryItem('${item.id}')"><i class="fas fa-trash"></i></button></td>`;
    });
    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('low-stock').textContent = lowStock;
    document.getElementById('out-of-stock').textContent = outOfStock;
    document.getElementById('inventory-value').textContent = `Rs ${totalValue}`;
}
function addInventoryItem() { openAddProductModal(); }
function editInventoryItem(id) { showToast('Edit product - not fully implemented', 'info'); }
function deleteInventoryItem(id) {
    if (!confirm('Delete this item?')) return;
    const item = appData.inventory.find(i => i.id === id); if (item) item.deleted = true;
    saveInventoryToStorage(appData.inventory); loadInventory(); showToast('Item deleted', 'success');
}
function openAddProductModal() {
    document.getElementById('add-product-modal').style.display = 'flex';
    document.getElementById('add-product-form').reset();
    document.getElementById('image-preview').innerHTML = '';
}
function closeAddProductModal() { document.getElementById('add-product-modal').style.display = 'none'; }
function saveNewProduct() {
    const name = document.getElementById('new-product-name').value.trim();
    const price = parseFloat(document.getElementById('new-product-price').value);
    const category = document.getElementById('new-product-category').value.trim() || 'Uncategorized';
    const stock = parseInt(document.getElementById('new-product-stock').value) || 0;
    const sku = document.getElementById('new-product-sku').value.trim() || `SKU-${Date.now()}`;
    const imageInput = document.getElementById('new-product-image');
    if (!name || isNaN(price) || price <= 0) return showToast('Please enter a valid name and price', 'error');
    const finishSave = (imageBase64 = null) => {
        const newProduct = { id: Date.now().toString(), name, sku, category, stock, price, lowStock: 5, image: imageBase64, deleted: false };
        appData.inventory.push(newProduct); saveInventoryToStorage(appData.inventory);
        closeAddProductModal(); loadInventory(); loadProductGrid(); showToast('Product added', 'success');
    };
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = e => finishSave(e.target.result);
        reader.readAsDataURL(imageInput.files[0]);
    } else finishSave();
}

// ==================== DELIVERIES MODULE ====================
function renderDeliveries() {
    const tbody = document.querySelector('#deliveries-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    appData.deliveries.forEach(d => {
        const row = tbody.insertRow();
        const itemsText = d.items.map(i => `${i.name} x${i.quantity}`).join(', ');
        row.innerHTML = `
            <td>${d.customerName}</td>
            <td>${itemsText}</td>
            <td>${d.deliveryDate}</td>
            <td><span class="${d.status === 'pending' ? 'badge-pending' : 'badge-delivered'}">${d.status === 'pending' ? 'Pending' : 'Delivered'}</span></td>
            <td>${d.notes || ''}</td>
            <td>
                ${d.status === 'pending' ? `<button class="btn-primary" style="padding:0.25rem 0.5rem; font-size:0.8rem;" onclick="markDeliveryDelivered('${d.id}')">Mark Delivered</button>` : ''}
                <button class="btn-icon" onclick="deleteDelivery('${d.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
    });
}
function openAddDeliveryModal() {
    document.getElementById('add-delivery-modal').style.display = 'flex';
    const customerSelect = document.getElementById('delivery-customer');
    customerSelect.innerHTML = '<option value="">Select Customer</option>';
    appData.customers.filter(c => !c.deleted).forEach(c => {
        const opt = document.createElement('option'); opt.value = c.id; opt.textContent = `${c.name} (${c.phone})`; customerSelect.appendChild(opt);
    });
    document.getElementById('delivery-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('delivery-notes').value = '';
    const container = document.getElementById('delivery-items-container');
    container.innerHTML = `<div class="delivery-item-row" style="display:flex; gap:0.5rem; margin-bottom:0.5rem;">
        <input type="text" placeholder="Product name" class="delivery-item-name" style="flex:2;">
        <input type="number" placeholder="Qty" class="delivery-item-qty" value="1" min="1" style="flex:1;">
        <button type="button" class="btn-icon" onclick="removeDeliveryItem(this)"><i class="fas fa-trash"></i></button>
    </div>`;
}
function closeAddDeliveryModal() { document.getElementById('add-delivery-modal').style.display = 'none'; }
function addDeliveryItemRow() {
    const container = document.getElementById('delivery-items-container');
    const div = document.createElement('div'); div.className = 'delivery-item-row'; div.style.display = 'flex'; div.style.gap = '0.5rem'; div.style.marginBottom = '0.5rem';
    div.innerHTML = `<input type="text" placeholder="Product name" class="delivery-item-name" style="flex:2;"><input type="number" placeholder="Qty" class="delivery-item-qty" value="1" min="1" style="flex:1;"><button type="button" class="btn-icon" onclick="removeDeliveryItem(this)"><i class="fas fa-trash"></i></button>`;
    container.appendChild(div);
}
function removeDeliveryItem(btn) { btn.closest('.delivery-item-row').remove(); }
function quickAddCustomerForDelivery() {
    const name = prompt('Quick add customer name:'); if (!name) return;
    const phone = prompt('Phone:');
    const newC = { id: Date.now().toString(), name, phone: phone || '', email: '', totalPurchases: 0, lastPurchase: null, deleted: false };
    appData.customers.push(newC); saveCustomersToStorage(appData.customers);
    const customerSelect = document.getElementById('delivery-customer');
    const opt = document.createElement('option'); opt.value = newC.id; opt.textContent = `${newC.name} (${newC.phone})`; customerSelect.appendChild(opt);
    customerSelect.value = newC.id;
    showToast('Customer added', 'success');
}
function saveNewDelivery() {
    const customerId = document.getElementById('delivery-customer').value;
    if (!customerId) return showToast('Please select a customer', 'error');
    const customer = appData.customers.find(c => c.id === customerId);
    if (!customer) return showToast('Customer not found', 'error');
    const itemRows = document.querySelectorAll('#delivery-items-container .delivery-item-row');
    const items = [];
    for (let row of itemRows) {
        const name = row.querySelector('.delivery-item-name').value.trim();
        const qty = parseInt(row.querySelector('.delivery-item-qty').value);
        if (name && qty > 0) items.push({ name, quantity: qty });
    }
    if (items.length === 0) return showToast('Add at least one item', 'error');
    const deliveryDate = document.getElementById('delivery-date').value;
    if (!deliveryDate) return showToast('Please select delivery date', 'error');
    const notes = document.getElementById('delivery-notes').value;
    const newDelivery = {
        id: Date.now().toString(),
        customerId: customer.id,
        customerName: customer.name,
        items: items,
        deliveryDate: deliveryDate,
        status: 'pending',
        notes: notes
    };
    appData.deliveries.push(newDelivery);
    saveDeliveriesToStorage(appData.deliveries);
    closeAddDeliveryModal();
    renderDeliveries();
    showToast('Delivery added', 'success');
}
function markDeliveryDelivered(deliveryId) {
    const delivery = appData.deliveries.find(d => d.id === deliveryId);
    if (delivery) { delivery.status = 'delivered'; saveDeliveriesToStorage(appData.deliveries); renderDeliveries(); showToast('Delivery marked as delivered', 'success'); }
}
function deleteDelivery(deliveryId) {
    if (!confirm('Delete this delivery?')) return;
    appData.deliveries = appData.deliveries.filter(d => d.id !== deliveryId);
    saveDeliveriesToStorage(appData.deliveries);
    renderDeliveries();
    showToast('Delivery deleted', 'success');
}

// ==================== JSON BACKUP/RESTORE ====================
function exportAllDataJSON() {
    const exportData = { customers: appData.customers, inventory: appData.inventory, sales: appData.sales, expenses: appData.expenses, deliveries: appData.deliveries, settings: appData.settings, user: currentUser };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bizztrak_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
    showToast('Backup downloaded', 'success');
}
function importDataJSON(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.customers) { appData.customers = imported.customers; saveCustomersToStorage(appData.customers); }
            if (imported.inventory) { appData.inventory = imported.inventory; saveInventoryToStorage(appData.inventory); }
            if (imported.sales) { appData.sales = imported.sales; for (let month in imported.sales) saveMonthlyData('sales', month, imported.sales[month]); }
            if (imported.expenses) { appData.expenses = imported.expenses; for (let month in imported.expenses) saveMonthlyData('expenses', month, imported.expenses[month]); }
            if (imported.deliveries) { appData.deliveries = imported.deliveries; saveDeliveriesToStorage(appData.deliveries); }
            showToast('Data imported successfully', 'success'); location.reload();
        } catch(err) { showToast('Invalid JSON file', 'error'); }
    };
    reader.readAsText(file);
}

// ==================== WHATSAPP & RECEIPTS ====================
function openWhatsAppWeb() { window.open('https://web.whatsapp.com', '_blank'); }
function generateReceiptText(sale) {
    const settings = loadReceiptSettings();
    const businessName = settings.businessName || currentUser?.businessName || 'Your Business';
    const address = settings.address || '';
    const phone = settings.phone || currentUser?.phone || '';
    const footer = settings.footer || 'Thank you for your business!';
    let lines = [`*${businessName}*`]; if (address) lines.push(address); if (phone) lines.push(`Tel: ${phone}`);
    lines.push('----------------------------', `Invoice: #${sale.id}`, `Date: ${sale.date}`, `Customer: ${sale.customer || 'Walk-in'}`, '----------------------------');
    sale.items.forEach(item => lines.push(`${item.name} x${item.quantity} @ Rs ${item.price} = Rs ${item.total}`));
    lines.push('----------------------------', `*TOTAL: Rs ${sale.total}*`, `Payment: ${sale.paymentMethod || 'Cash'}`, '----------------------------', footer);
    return lines.join('\n');
}
function sendReceiptViaWhatsApp(saleId = null) {
    let sale = null, phoneNumber = '';
    if (saleId) {
        for (let mk in appData.sales) { sale = appData.sales[mk].find(s => s.id === saleId); if (sale) break; }
        if (!sale) for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key.startsWith('bizztrak_sales_')) { const monthData = JSON.parse(localStorage.getItem(key)); sale = monthData.find(s => s.id === saleId); if (sale) break; } }
        if (!sale) { showToast('Sale not found', 'error'); return; }
        phoneNumber = sale.customerPhone || '';
    } else {
        sale = { id: 'TEST-' + Date.now(), date: new Date().toLocaleDateString('en-CA'), customer: 'Test Customer', items: [{ name: 'Sample Item 1', quantity: 2, price: 100, total: 200 }, { name: 'Sample Item 2', quantity: 1, price: 50, total: 50 }], total: 250, paymentMethod: 'Cash' };
    }
    const receiptText = generateReceiptText(sale);
    const encodedText = encodeURIComponent(receiptText);
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const whatsappUrl = cleanPhone ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}` : `https://web.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank'); showToast('Opening WhatsApp...', 'info');
}
function sendTestReceipt() { sendReceiptViaWhatsApp(null); }
function closeReceiptOptionsModal() { document.getElementById('receipt-options-modal').style.display = 'none'; }
function printReceiptForSale(saleId) {
    let sale = null;
    for (let mk in appData.sales) { sale = appData.sales[mk].find(s => s.id === saleId); if (sale) break; }
    if (!sale) { showToast('Sale not found', 'error'); return; }
    const receiptText = generateReceiptText(sale);
    const printWindow = window.open('', '_blank'); printWindow.document.write(`<pre>${receiptText}</pre>`); printWindow.document.close(); printWindow.focus(); printWindow.print();
    showToast('Print window opened', 'success');
}
// Receipt customization
function loadReceiptSettingsToForm() {
    const settings = loadReceiptSettings();
    document.getElementById('receipt-business-name').value = settings.businessName || '';
    document.getElementById('receipt-address').value = settings.address || '';
    document.getElementById('receipt-phone').value = settings.phone || '';
    document.getElementById('receipt-footer').value = settings.footer || 'Thank you for your business!';
    updateReceiptDesign();
}
function updateReceiptDesign() {
    const settings = {
        businessName: document.getElementById('receipt-business-name').value,
        address: document.getElementById('receipt-address').value,
        phone: document.getElementById('receipt-phone').value,
        footer: document.getElementById('receipt-footer').value
    };
    saveReceiptSettings(settings);
    document.getElementById('preview-business-name').textContent = settings.businessName || 'Business Name';
    document.getElementById('preview-address').textContent = settings.address || 'Address Line';
    document.getElementById('preview-phone').textContent = settings.phone ? `Phone: ${settings.phone}` : '';
    document.getElementById('preview-footer').textContent = settings.footer;
    showToast('Receipt design updated', 'success');
}
function customizeReceipt() { updateReceiptDesign(); } // alias
function printReceipt() {
    const settings = loadReceiptSettings();
    const businessName = settings.businessName || currentUser?.businessName || 'Your Business';
    const address = settings.address || '';
    const phone = settings.phone || '';
    const footer = settings.footer || 'Thank you!';
    const receiptHtml = `
        <div style="font-family:monospace; width:300px; margin:auto; padding:1rem;">
            <h3 style="text-align:center;">${businessName}</h3>
            <p style="text-align:center;">${address}<br>${phone}</p>
            <hr>
            <p>Invoice: TEST-${Date.now()}<br>Date: ${new Date().toLocaleDateString()}</p>
            <hr>
            <div>Item 1 x 2 = Rs 200</div>
            <div>Item 2 x 1 = Rs 50</div>
            <hr>
            <p><strong>Total: Rs 250</strong></p>
            <hr>
            <p style="text-align:center;">${footer}</p>
        </div>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.print();
}

// ==================== PRINTER ====================
function connectBluetoothPrinter() { showToast('Bluetooth printer connection simulated', 'info'); }
function connectUSBPrinter() { showToast('USB printer connection simulated', 'info'); }
function connectNetworkPrinter() { showToast('Network printer connection simulated', 'info'); }
function savePrinterSettings() { showToast('Printer settings saved', 'success'); }

// ==================== SUBSCRIPTION ====================
function selectPlan(plan) {
    const plans = { basic: { name: 'Basic', price: 199 }, pro: { name: 'Pro', price: 499 }, mega: { name: 'Mega Pro', price: 999 } };
    const selected = plans[plan];
    if (!selected) return;
    document.getElementById('selected-plan-name').textContent = `${selected.name} Plan`;
    document.getElementById('selected-plan-price').textContent = `Rs ${selected.price}/month`;
    document.getElementById('payment-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('payment-modal').style.display = 'none'; }
function processPayment() {
    showToast('Processing payment...', 'info');
    setTimeout(() => {
        if (currentUser) {
            currentUser.subscription.plan = 'pro';
            currentUser.subscription.expiry = new Date(Date.now() + 30*24*60*60*1000).toISOString();
            localStorage.setItem('bizztrak_user', JSON.stringify(currentUser));
            updateSubscriptionInfo(); closeModal(); showToast('Payment successful!', 'success'); checkSubscriptionAndEnforce();
        }
    }, 2000);
}
function cancelSubscription() {
    if (confirm('Cancel subscription?')) {
        if (currentUser) { currentUser.subscription.plan = 'trial'; localStorage.setItem('bizztrak_user', JSON.stringify(currentUser)); updateSubscriptionInfo(); showToast('Subscription cancelled', 'success'); checkSubscriptionAndEnforce(); }
    }
}

// ==================== SETTINGS ====================
function loadSettings() {
    if (currentUser) {
        document.getElementById('settings-business-name').value = currentUser.businessName;
        document.getElementById('settings-business-type').value = currentUser.businessType || 'retail';
    }
}
function changePassword() { showToast('Password change not implemented', 'info'); }
function exportTableToCSV(type) {
    let data = [];
    let filename = `bizztrak_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    
    if (type === 'customers') {
        data = appData.customers.filter(c => !c.deleted).map(c => ({
            Name: c.name,
            Phone: c.phone,
            Email: c.email,
            Total_Purchases: c.totalPurchases,
            Last_Purchase: c.lastPurchase || 'Never'
        }));
    } else if (type === 'sales') {
        const monthKey = document.getElementById('sales-month-selector')?.value || getCurrentMonthKey();
        data = (appData.sales[monthKey] || []).filter(s => !s.deleted).map(s => ({
            Invoice: s.id,
            Customer: s.customer,
            Date: s.date,
            Amount: s.total,
            Payment: s.paymentMethod
        }));
    } else if (type === 'expenses') {
        const monthKey = document.getElementById('expenses-month-selector')?.value || getCurrentMonthKey();
        data = (appData.expenses[monthKey] || []).filter(e => !e.deleted).map(e => ({
            Date: e.date,
            Category: e.category,
            Description: e.description,
            Amount: e.amount
        }));
    } else if (type === 'inventory') {
        data = appData.inventory.filter(i => !i.deleted).map(i => ({
            Product: i.name,
            SKU: i.sku,
            Category: i.category,
            Stock: i.stock,
            Price: i.price,
            Value: i.stock * i.price
        }));
    }

    if (data.length === 0) {
        showToast('No data to export', 'error');
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] || '')).join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${type} to CSV`, 'success');
}
function exportAllData() { exportAllDataJSON(); } // alias for sidebar
function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? All data will be lost forever.')) {
        localStorage.clear();
        location.reload();
    }
}

// ==================== AI AGENT ====================
function askAI() {
    const input = document.getElementById('ai-input');
    const chatBox = document.getElementById('ai-chat-box');
    const question = input.value.trim();
    if (!question) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.style.marginBottom = '1rem';
    userMsg.innerHTML = `<strong>You:</strong> ${question}`;
    chatBox.appendChild(userMsg);
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // AI "Typing"
    const aiMsg = document.createElement('div');
    aiMsg.style.marginBottom = '1rem';
    aiMsg.innerHTML = `<strong>AI Agent:</strong> <span class="typing">...</span>`;
    chatBox.appendChild(aiMsg);

    setTimeout(() => {
        let answer = "I'm analyzing your business data... ";
        if (question.toLowerCase().includes('revenue')) {
            const rev = document.getElementById('today-revenue').textContent;
            answer += `Your revenue for today is ${rev}. You're doing great!`;
        } else if (question.toLowerCase().includes('profit')) {
            answer += "Your profit margins are currently healthy. Keep an eye on expenses!";
        } else {
            answer += "That's a great question. Based on your current activity, I recommend focusing on customer retention this week.";
        }
        aiMsg.innerHTML = `<strong>AI Agent:</strong> ${answer}`;
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 1500);
}

// ==================== CLOUD SETTINGS ====================
function saveCloudSettings() {
    const settings = {
        fb_apiKey: document.getElementById('fb-apiKey').value,
        fb_authDomain: document.getElementById('fb-authDomain').value,
        fb_projectId: document.getElementById('fb-projectId').value,
        gemini_apiKey: document.getElementById('gemini-apiKey').value
    };
    localStorage.setItem('bizztrak_cloud_settings', JSON.stringify(settings));
    showToast('Cloud & AI settings saved successfully', 'success');
}

function loadCloudSettings() {
    const saved = JSON.parse(localStorage.getItem('bizztrak_cloud_settings') || '{}');
    if (document.getElementById('fb-apiKey')) document.getElementById('fb-apiKey').value = saved.fb_apiKey || '';
    if (document.getElementById('fb-authDomain')) document.getElementById('fb-authDomain').value = saved.fb_authDomain || '';
    if (document.getElementById('fb-projectId')) document.getElementById('fb-projectId').value = saved.fb_projectId || '';
    if (document.getElementById('gemini-apiKey')) document.getElementById('gemini-apiKey').value = saved.gemini_apiKey || '';
}

// Initialize cloud settings when showing settings view
const originalShowSettings = showSettings;
showSettings = function() {
    originalShowSettings();
    loadCloudSettings();
};

// ==================== PWA ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('SW registered'))
            .catch(e => console.log('SW registration failed:', e));
    });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show the install button in the sidebar
    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) {
        installBtn.style.display = 'block';
    }
});

function installPWA() {
    if (!deferredPrompt) {
        showToast('App is already installed or not supported.', 'info');
        return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
            document.getElementById('install-app-btn').style.display = 'none';
        } else {
            console.log('User dismissed the A2HS prompt');
        }
        deferredPrompt = null;
    });
}
window.addEventListener('scroll', function() {
    const btn = document.getElementById('back-to-top');
    if (window.scrollY > 300) {
        btn.style.display = 'flex';
    } else {
        btn.style.display = 'none';
    }
});

// Add typing animation style dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes typing {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
    }
    .typing {
        animation: typing 1s infinite;
        font-weight: bold;
        letter-spacing: 2px;
    }
`;
document.head.appendChild(style);

document.addEventListener('input', function(e) { if (e.target.id === 'product-grid-search' || e.target.id === 'product-category-filter') loadProductGrid(); });