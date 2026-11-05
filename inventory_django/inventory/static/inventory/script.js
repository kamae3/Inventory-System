const STORAGE_KEYS = {
    items: "inventory_items",
    requests: "inventory_requests",
    token: "inventory_api_token"
};

let itemsList = loadStoredList(STORAGE_KEYS.items);
let requestsList = loadStoredList(STORAGE_KEYS.requests);
let currentUser = { name: "", role: "" };
let authToken = localStorage.getItem(STORAGE_KEYS.token);

async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (authToken) headers.Authorization = `Token ${authToken}`;

    let response;
    try {
        response = await fetch(`/api${path}`, { ...options, headers });
    } catch (error) {
        throw new Error("Cannot connect to Django. Start the Django server and try again.");
    }

    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
        const detail = data?.error || data?.detail || data?.message;
        const fieldErrors = data?.details
            ? Object.values(data.details).flat().join(" ")
            : "";
        throw new Error(detail || fieldErrors || `Request failed (${response.status}).`);
    }
    return data;
}

function loadStoredList(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
    } catch (error) {
        console.error(`Could not read ${key} from local storage.`, error);
        return [];
    }
}

function saveStoredLists() {
    try {
        localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(itemsList));
        localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(requestsList));
    } catch (error) {
        console.error("Could not save inventory data in this browser.", error);
        showToast("Could not save changes in this browser.", "error");
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function switchView(viewId) {
    if (!currentUser.name && !["login", "register"].includes(viewId)) {
        showToast("Please log in first.", "error");
        return;
    }

    document.querySelectorAll(".view-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === `${viewId}-view`);
    });
    document.querySelectorAll(".nav-item").forEach(button => {
        const action = button.getAttribute("onclick") || "";
        button.classList.toggle("active", action.includes(`'${viewId}'`));
    });

    if (viewId === "items") renderItems();
    if (viewId === "requests") renderRequests();
    if (viewId === "dashboard") renderDashboardContent();
}

function switchAuthView(authType) {
    if (!["login", "register"].includes(authType)) return;
    document.querySelectorAll(".view-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === `${authType}-view`);
    });
}

function renderDashboardContent() {
    const container = document.getElementById("dynamic-dashboard-content");
    if (!container) return;

    const totalParts = itemsList.length;
    const availableParts = itemsList.filter(item =>
        ["available", "return"].includes(String(item.status).toLowerCase())
    ).length;
    const pendingRequests = requestsList.filter(request =>
        String(request.status).toLowerCase() === "pending"
    ).length;
    const pendingStatus = itemsList.filter(item =>
        String(item.status).toLowerCase() === "return"
    ).length + pendingRequests;

    const title = document.getElementById("dash-title");
    const subtitle = document.getElementById("dash-subtitle");
    const admin = currentUser.role === "admin";
    if (title) {
        title.textContent = admin ? "ADMIN DASHBOARD" : "USER DASHBOARD";
    }
    if (subtitle) {
        subtitle.textContent = admin
            ? "Manage inventory records and review part requests."
            : "Enter and track parts for store deployments.";
    }

    const categoryCount = category => itemsList.filter(item =>
        String(item.category).toLowerCase() === category
    ).length;

    container.innerHTML = `
        <div class="metrics-grid">
            <div class="metric-card"><div class="metric-title">Total Parts</div><div class="metric-value">${totalParts}</div></div>
            <div class="metric-card"><div class="metric-title">Available Parts</div><div class="metric-value">${availableParts}</div></div>
            <div class="metric-card"><div class="metric-title">Part Requests</div><div class="metric-value">${requestsList.length}</div></div>
            <div class="metric-card"><div class="metric-title">Pending</div><div class="metric-value">${pendingStatus}</div></div>
        </div>
        <div class="dashboard-cards-grid">
            <div class="feature-card">
                <h4>${admin ? "Inventory Management" : "Deployment Entry Form"}</h4>
                <div class="feature-content">
                    <i class="fa-solid fa-desktop feature-icon"></i>
                    <div><h5>Equipment Categories</h5><p>Desktop, POS, and Cliqq equipment</p></div>
                </div>
                <div class="feature-banner" onclick="switchView('items')" style="cursor:pointer;">View Equipment Records &rarr;</div>
            </div>
            <div class="chart-card">
                <h4>Equipment Categories</h4>
                <p class="sub-text" style="margin-top:10px;">Desktop PC's (${categoryCount("desktop")})</p>
                <p class="sub-text">POS Machine (${categoryCount("pos")})</p>
                <p class="sub-text">Cliqq Machine (${categoryCount("cliqq")})</p>
                <button class="btn btn-secondary btn-sm" style="margin-top:8px; width:100%;" onclick="switchView('requests')">View Part Requests</button>
            </div>
        </div>
        ${admin ? `
            <section class="feature-card" style="margin-top:20px;">
                <h4><i class="fa-solid fa-user-shield"></i> Admin Account Registration</h4>
                <p class="sub-text" style="margin:8px 0 16px;">Create an administrator account. Only an authenticated admin can submit this form.</p>
                <form id="admin-register-form">
                    <div class="form-group">
                        <label for="admin-reg-name">Full Name</label>
                        <input id="admin-reg-name" name="name" type="text" required autocomplete="name">
                    </div>
                    <div class="form-group">
                        <label for="admin-reg-email">Email Address</label>
                        <input id="admin-reg-email" name="email" type="email" required autocomplete="email">
                    </div>
                    <div class="form-group">
                        <label for="admin-reg-password">Password</label>
                        <input id="admin-reg-password" name="password" type="password" required minlength="6" autocomplete="new-password">
                    </div>
                    <button class="btn btn-primary" type="submit">Create Admin Account</button>
                </form>
            </section>
        ` : ""}
    `;
}

function renderItems(data = itemsList) {
    const tbody = document.getElementById("items-table-body");
    const gridWrapper = document.getElementById("items-grid-wrapper");
    if (!tbody || !gridWrapper) return;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b; padding:24px;">No equipment records found. Click "Add Part Record" to create one.</td></tr>';
        gridWrapper.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#ffffff; padding:24px;">No records found.</div>';
        return;
    }

    tbody.innerHTML = data.map(item => {
        const status = String(item.status || "Available");
        const badgeClass = status.toLowerCase() === "deployed" ? "badge-success" : "badge-warning";
        return `<tr>
            <td>${escapeHtml(item.date)}</td>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${escapeHtml(item.serial)}</td>
            <td>${escapeHtml(item.location)}</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(status)}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="openDetailsModal(${Number(item.id)})">Details</button>
                <button class="btn btn-secondary btn-sm" style="color:#c70d0d; border-color:#f8d4d4;" onclick="deleteItem(${Number(item.id)})" aria-label="Delete record"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join("");

    gridWrapper.innerHTML = data.map(item => `
        <div class="grid-card">
            <h4>${escapeHtml(item.name)}</h4>
            <p>SN: ${escapeHtml(item.serial)}</p>
            <div style="font-size:12px; color:#380303; margin-bottom:8px;">Location: ${escapeHtml(item.location)}</div>
            <div style="font-size:12px; color:#64748b; margin-bottom:12px;">Date: ${escapeHtml(item.date)}</div>
            <button class="btn btn-secondary btn-sm" style="width:100%" onclick="openDetailsModal(${Number(item.id)})">View Details</button>
        </div>
    `).join("");
}

function renderRequests() {
    const tbody = document.getElementById("requests-table-body");
    if (!tbody) return;

    if (requestsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b; padding:24px;">No part requests recorded.</td></tr>';
        return;
    }

    tbody.innerHTML = requestsList.map(request => {
        const status = String(request.status || "Pending");
        const badgeClass = status.toLowerCase() === "approved" ? "badge-success" : "badge-warning";
        const actions = currentUser.role === "admin" && status.toLowerCase() === "pending"
            ? `<button class="btn btn-primary btn-sm" onclick="updateRequestStatus(${Number(request.id)}, 'Approved')">Approve</button>
               <button class="btn btn-secondary btn-sm" onclick="updateRequestStatus(${Number(request.id)}, 'Declined')">Decline</button>`
            : "";
        return `<tr>
            <td>${escapeHtml(request.date)}</td>
            <td><strong>${escapeHtml(request.name)}</strong></td>
            <td>${escapeHtml(request.serial)}</td>
            <td>${escapeHtml(request.location)}</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(status)}</span></td>
            <td>${actions}</td>
        </tr>`;
    }).join("");
}

function updateRequestStatus(id, status) {
    if (currentUser.role !== "admin") {
        showToast("Only an admin can review requests.", "error");
        return;
    }
    const request = requestsList.find(entry => entry.id === id);
    if (!request) return;
    request.status = status;
    saveStoredLists();
    renderRequests();
    renderDashboardContent();
    showToast(`Request ${status.toLowerCase()}.`, "success");
}

function deleteItem(id) {
    if (!window.confirm("Delete this inventory record?")) return;
    itemsList = itemsList.filter(item => item.id !== id);
    saveStoredLists();
    renderItems();
    renderDashboardContent();
    showToast("Record deleted.", "success");
}

function toggleLayout(type) {
    const tableView = document.getElementById("table-view-container");
    const gridView = document.getElementById("grid-view-container");
    const tableButton = document.getElementById("btn-table-view");
    const gridButton = document.getElementById("btn-grid-view");
    if (!tableView || !gridView || !tableButton || !gridButton) return;

    const showTable = type === "table";
    tableView.style.display = showTable ? "block" : "none";
    gridView.style.display = showTable ? "none" : "block";
    tableButton.classList.toggle("active", showTable);
    gridButton.classList.toggle("active", !showTable);
}

function filterItems() {
    const search = document.getElementById("search-box");
    const category = document.getElementById("category-filter");
    const query = (search?.value || "").trim().toLowerCase();
    const selectedCategory = category?.value || "all";

    const filtered = itemsList.filter(item => {
        const matchesQuery = [item.name, item.serial, item.location]
            .some(value => String(value || "").toLowerCase().includes(query));
        const matchesCategory = selectedCategory === "all" ||
            String(item.category).toLowerCase() === selectedCategory.toLowerCase();
        return matchesQuery && matchesCategory;
    });
    renderItems(filtered);
}

function openDetailsModal(id) {
    const item = itemsList.find(entry => entry.id === id);
    if (!item) return;

    document.getElementById("modal-title").textContent = item.name;
    document.getElementById("modal-body").innerHTML = `
        <div style="margin-bottom:12px;"><strong>Category:</strong> ${escapeHtml(item.category)}</div>
        <div style="margin-bottom:12px;"><strong>Serial Number:</strong> ${escapeHtml(item.serial)}</div>
        <div style="margin-bottom:12px;"><strong>Location:</strong> ${escapeHtml(item.location)}</div>
        <div style="margin-bottom:12px;"><strong>Date:</strong> ${escapeHtml(item.date)}</div>
        <div style="margin-bottom:12px;"><strong>Status:</strong> ${escapeHtml(item.status)}</div>
    `;
    document.getElementById("modal-footer").innerHTML =
        '<button class="btn btn-secondary" onclick="closeModal()">Close</button>';
    document.getElementById("modal-backdrop").classList.add("active");
}

function openNewItemModal() {
    document.getElementById("modal-title").textContent = "Enter Part & Serial Details";
    document.getElementById("modal-body").innerHTML = `
        <div class="form-group"><label for="new-name">Type of Part / Equipment</label><input type="text" id="new-name" placeholder="e.g. Scanner / Mainboard" required></div>
        <div class="form-group"><label for="new-cat">Category</label>
            <select id="new-cat">
                <option value="desktop">Desktop PC's</option>
                <option value="pos">POS Machine</option>
                <option value="cliqq">Cliqq Machine</option>
            </select>
        </div>
        <div class="form-group"><label for="new-serial">Serial Number</label><input type="text" id="new-serial" placeholder="Serial number" required></div>
        <div class="form-group"><label for="new-location">Deployment Location</label><input type="text" id="new-location" placeholder="Store or office location" required></div>
        <div class="form-group"><label for="new-status">Status</label>
            <select id="new-status">
                <option value="Deployed">Deployed</option>
                <option value="Available">Available</option>
            </select>
        </div>
    `;
    document.getElementById("modal-footer").innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveModalData()">Save Record</button>
    `;
    document.getElementById("modal-backdrop").classList.add("active");
}

function closeModal() {
    document.getElementById("modal-backdrop")?.classList.remove("active");
}

function saveModalData() {
    const name = document.getElementById("new-name")?.value.trim();
    const serial = document.getElementById("new-serial")?.value.trim();
    const location = document.getElementById("new-location")?.value.trim();
    if (!name || !serial || !location) {
        showToast("Please fill out all fields.", "error");
        return;
    }
    if (itemsList.some(item => item.serial.toLowerCase() === serial.toLowerCase())) {
        showToast("That serial number is already in the inventory.", "error");
        return;
    }

    itemsList.push({
        id: Date.now(),
        name,
        category: document.getElementById("new-cat").value,
        serial,
        location,
        date: new Date().toISOString().slice(0, 10),
        status: document.getElementById("new-status").value
    });
    saveStoredLists();
    renderItems();
    renderDashboardContent();
    closeModal();
    showToast("Record saved in this browser.", "success");
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) {
        console[type === "error" ? "error" : "log"](message);
        return;
    }
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    window.setTimeout(() => { toast.className = "toast"; }, 3000);
}

function setCurrentUser(name) {
    currentUser = name;
    document.getElementById("current-user-name").textContent =
        currentUser.name || currentUser.first_name || currentUser.email || "User";
    document.getElementById("current-user-role").textContent =
        currentUser.role === "admin" ? "Admin" : "User";
    document.getElementById("nav-menu").style.display = "flex";
    document.getElementById("sidebar-user").style.display = "block";
    switchView("dashboard");
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("login-form")?.addEventListener("submit", async event => {
        event.preventDefault();
        const email = document.getElementById("login-username")?.value.trim();
        const password = document.getElementById("login-password")?.value;
        if (!email || !password) {
            showToast("Enter your email and password.", "error");
            return;
        }
        try {
            const result = await api("/auth/login/", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });
            authToken = result.token;
            localStorage.setItem(STORAGE_KEYS.token, authToken);
            setCurrentUser({ ...result.user, role: result.role });
            showToast("Login successful.", "success");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    document.getElementById("register-form")?.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            await api("/auth/register/", {
                method: "POST",
                body: JSON.stringify({
                    name: document.getElementById("reg-name").value.trim(),
                    email: document.getElementById("reg-email").value.trim(),
                    password: document.getElementById("reg-password").value
                })
            });
            event.target.reset();
            switchAuthView("login");
            showToast("Account registered. You can now log in.", "success");
        } catch (error) {
            showToast(error.message, "error");
        }
    });

    document.addEventListener("submit", async event => {
        if (event.target.id !== "admin-register-form") return;
        event.preventDefault();
        if (currentUser.role !== "admin" || !authToken) {
            showToast("Only an authenticated admin can create another admin.", "error");
            return;
        }

        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        try {
            await api("/auth/register/", {
                method: "POST",
                body: JSON.stringify({
                    name: document.getElementById("admin-reg-name").value.trim(),
                    email: document.getElementById("admin-reg-email").value.trim(),
                    password: document.getElementById("admin-reg-password").value,
                    role: "admin"
                })
            });
            event.target.reset();
            showToast("Admin account created successfully.", "success");
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            submitButton.disabled = false;
        }
    });

    if (authToken) {
        api("/auth/me/").then(user => {
            setCurrentUser(user);
        }).catch(error => {
            console.error("Could not restore the signed-in account:", error);
            localStorage.removeItem(STORAGE_KEYS.token);
            authToken = null;
            currentUser = { name: "", role: "" };
            switchAuthView("login");
        });
    }
});

async function logout() {
    try {
        if (authToken) await api("/auth/logout/", { method: "POST" });
    } catch (error) {
        console.error("Django logout failed:", error);
    }
    localStorage.removeItem(STORAGE_KEYS.token);
    authToken = null;
    currentUser = { name: "", role: "" };
    const navMenu = document.getElementById("nav-menu");
    const sidebarUser = document.getElementById("sidebar-user");
    if (navMenu) navMenu.style.display = "none";
    if (sidebarUser) sidebarUser.style.display = "none";
    showToast("Logged out.", "success");
    switchAuthView("login");
}
