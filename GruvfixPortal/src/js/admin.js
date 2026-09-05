/**
 * @file admin.js
 * @description Admin operations: dashboard stats, SVG graph plotting, Master CRUD, Excel/PDF downloads.
 * @project GruvfixPortal
 */

// ==========================================
// 1. DASHBOARD & NAVIGATION ROUTING
// ==========================================

function switchAdminTab(tabId) {
    if (window.location.hash !== `#/admin/${tabId}`) {
        window.location.hash = `#/admin/${tabId}`;
        return;
    }
    
    window.currentTab = tabId; // Sync state variable
    
    const tabViews = document.querySelectorAll('#admin-dashboard .tab-view');
    tabViews.forEach(view => view.classList.remove('active'));
    
    const menuItems = document.querySelectorAll('#admin-dashboard .sidebar-menu .menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    
    const targetView = document.getElementById(`admin-view-${tabId}`);
    if (targetView) targetView.classList.add('active');
    
    const targetMenu = document.getElementById(`admin-menu-${tabId}`);
    if (targetMenu) targetMenu.classList.add('active');
    
    saveLastTab(tabId);
    
    const headerTitle = document.getElementById('admin-header-title');
    if (headerTitle) {
        const titles = {
            'dashboard': 'Production Overview',
            'entries': 'All Work Entries',
            'employees': 'Employees & Admins',
            'customers': 'Customer Directory',
            'parts': 'Parts & Component Master',
            'tools': 'Tools & Inventory',
            'machines': 'Machines Equipment Master',
            'tool-requests': 'Tool Requests Control',
            'reports': 'Performance Reports',
            'homepage-config': 'Homepage Settings'
        };
        headerTitle.textContent = titles[tabId] || 'Admin Console';
    }
    
    if (tabId === 'dashboard') {
        updateAdminDashboard();
    } else if (tabId === 'entries') {
        renderAdminEntriesTable();
    } else if (tabId === 'employees') {
        renderUsersTable();
    } else if (tabId === 'customers') {
        renderCustomersTable();
    } else if (tabId === 'parts') {
        renderPartsTable();
    } else if (tabId === 'tools') {
        renderToolsTable();
    } else if (tabId === 'machines') {
        renderMachinesTable();
    } else if (tabId === 'tool-requests') {
        renderAdminToolRequestsTable();
    } else if (tabId === 'reports') {
        populateFilterDropdowns();
        renderReportsPreview();
    } else if (tabId === 'homepage-config') {
        renderHomepageConfig();
    }
}

function updateAdminDashboard() {
    const todayStr = getTodayDateString();
    const todayLogs = historicalEntries.filter(e => e.date === todayStr);
    
    const entriesCount = todayLogs.length;
    const qtyCount = todayLogs.reduce((sum, e) => sum + e.qty, 0);
    
    const activeEmployeesCount = users.filter(u => u.role === 'employee' && u.active).length;
    const custCount = customers.length;
    const partCount = parts.length;
    
    const completedQty = todayLogs.filter(e => e.status === 'completed').reduce((sum, e) => sum + e.qty, 0);
    const pendingQty = todayLogs.filter(e => e.status === 'pending' || e.status === 'in-progress').reduce((sum, e) => sum + e.qty, 0);
    const reworkQty = todayLogs.filter(e => e.status === 'rework').reduce((sum, e) => sum + e.qty, 0);
    const holdQty = todayLogs.filter(e => e.status === 'hold').reduce((sum, e) => sum + e.qty, 0);
    
    // Inject values
    document.getElementById('admin-kpi-entries').textContent = entriesCount;
    document.getElementById('admin-kpi-qty').textContent = qtyCount;
    document.getElementById('admin-kpi-employees').textContent = activeEmployeesCount;
    document.getElementById('admin-kpi-custparts').textContent = `${custCount} / ${partCount}`;
    
    document.getElementById('admin-kpi-completed').textContent = completedQty;
    document.getElementById('admin-kpi-pending').textContent = pendingQty;
    document.getElementById('admin-kpi-rework').textContent = reworkQty;
    document.getElementById('admin-kpi-hold').textContent = holdQty;
    
    // Render SVG graphs
    renderTrendChart();
    renderShiftChart();
}

// ==========================================
// 2. SVG CHART PLOTTERS
// ==========================================

function renderTrendChart() {
    const svg = document.getElementById('svg-trend-chart');
    if (!svg) return;
    
    const dates = [];
    const labels = [];
    for (let i = 6; i >= 0; i--) {
        dates.push(getRelativeDateString(i));
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() - i);
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        labels.push(`${mm}/${dd}`);
    }
    
    const qtyByDay = dates.map(dt => {
        return historicalEntries
            .filter(e => e.date === dt && e.status === 'completed')
            .reduce((sum, e) => sum + e.qty, 0);
    });
    
    const maxQty = Math.max(...qtyByDay, 50);
    
    const width = 600;
    const height = 220;
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;
    
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;
    
    // Grid ticks
    let gridLinesHtml = '';
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
        const yVal = paddingTop + chartH - (i / ticks) * chartH;
        const tickVal = Math.round((i / ticks) * maxQty);
        gridLinesHtml += `
            <line x1="${paddingLeft}" y1="${yVal}" x2="${width - paddingRight}" y2="${yVal}" stroke="#e5e7eb" stroke-dasharray="4,4" />
            <text x="${paddingLeft - 10}" y="${yVal + 4}" text-anchor="end" font-size="10" fill="#6b7280" font-family="var(--font-sans)">${tickVal}</text>
        `;
    }
    
    // Coordinates mapping
    const points = qtyByDay.map((qty, i) => {
        const x = paddingLeft + (i / 6) * chartW;
        const y = paddingTop + chartH - (qty / maxQty) * chartH;
        return { x, y, qty };
    });
    
    let pathD = '';
    let areaD = `M ${paddingLeft} ${paddingTop + chartH} `;
    
    points.forEach((p, i) => {
        if (i === 0) {
            pathD += `M ${p.x} ${p.y} `;
            areaD += `L ${p.x} ${p.y} `;
        } else {
            pathD += `L ${p.x} ${p.y} `;
            areaD += `L ${p.x} ${p.y} `;
        }
    });
    areaD += `L ${points[points.length - 1].x} ${paddingTop + chartH} Z`;
    
    let pointsHtml = '';
    points.forEach((p, i) => {
        pointsHtml += `
            <circle cx="${p.x}" cy="${p.y}" r="4" fill="#ffffff" stroke="#154726" stroke-width="2" />
            <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="10" font-weight="700" fill="#154726" font-family="var(--font-sans)">${p.qty}</text>
            <text x="${p.x}" y="${height - paddingBottom + 18}" text-anchor="middle" font-size="10" fill="#6b7280" font-family="var(--font-sans)">${labels[i]}</text>
        `;
    });
    
    svg.innerHTML = `
        <defs>
            <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#154726" stop-opacity="0.25" />
                <stop offset="100%" stop-color="#154726" stop-opacity="0.0" />
            </linearGradient>
        </defs>
        ${gridLinesHtml}
        <path d="${areaD}" fill="url(#trend-gradient)" />
        <path d="${pathD}" fill="none" stroke="#154726" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${pointsHtml}
    `;
}

function renderShiftChart() {
    const svg = document.getElementById('svg-shift-chart');
    if (!svg) return;
    
    const todayStr = getTodayDateString();
    const shiftAQty = historicalEntries
        .filter(e => e.date === todayStr && e.shift && e.shift.includes('Day Shift'))
        .reduce((sum, e) => sum + e.qty, 0);
        
    const shiftBQty = historicalEntries
        .filter(e => e.date === todayStr && e.shift && e.shift.includes('Night Shift'))
        .reduce((sum, e) => sum + e.qty, 0);
        
    const maxQty = Math.max(shiftAQty, shiftBQty, 50);
    
    const width = 300;
    const height = 220;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;
    
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;
    
    let gridLinesHtml = '';
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
        const yVal = paddingTop + chartH - (i / ticks) * chartH;
        const tickVal = Math.round((i / ticks) * maxQty);
        gridLinesHtml += `
            <line x1="${paddingLeft}" y1="${yVal}" x2="${width - paddingRight}" y2="${yVal}" stroke="#e5e7eb" stroke-dasharray="4,4" />
            <text x="${paddingLeft - 8}" y="${yVal + 4}" text-anchor="end" font-size="10" fill="#6b7280" font-family="var(--font-sans)">${tickVal}</text>
        `;
    }
    
    const barW = 36;
    const xA = paddingLeft + chartW * 0.3;
    const hA = (shiftAQty / maxQty) * chartH;
    const yA = paddingTop + chartH - hA;
    
    const xB = paddingLeft + chartW * 0.7;
    const hB = (shiftBQty / maxQty) * chartH;
    const yB = paddingTop + chartH - hB;
    
    svg.innerHTML = `
        ${gridLinesHtml}
        <!-- Shift A Bar -->
        <rect x="${xA - barW/2}" y="${yA}" width="${barW}" height="${hA}" rx="4" fill="#154726" />
        <text x="${xA}" y="${yA - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="#154726" font-family="var(--font-sans)">${shiftAQty}</text>
        <text x="${xA}" y="${height - paddingBottom + 18}" text-anchor="middle" font-size="11" font-weight="600" fill="#374151" font-family="var(--font-sans)">Shift A</text>
        <text x="${xA}" y="${height - paddingBottom + 30}" text-anchor="middle" font-size="9" fill="#6b7280" font-family="var(--font-sans)">Day</text>
        
        <!-- Shift B Bar -->
        <rect x="${xB - barW/2}" y="${yB}" width="${barW}" height="${hB}" rx="4" fill="#2e7d32" />
        <text x="${xB}" y="${yB - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="#2e7d32" font-family="var(--font-sans)">${shiftBQty}</text>
        <text x="${xB}" y="${height - paddingBottom + 18}" text-anchor="middle" font-size="11" font-weight="600" fill="#374151" font-family="var(--font-sans)">Shift B</text>
        <text x="${xB}" y="${height - paddingBottom + 30}" text-anchor="middle" font-size="9" fill="#6b7280" font-family="var(--font-sans)">Night</text>
    `;
}

// ==========================================
// 3. ADMIN WORK ENTRIES LOGS
// ==========================================

function getFilteredAdminEntries() {
    const fromVal = document.getElementById('admin-filter-from').value;
    const toVal = document.getElementById('admin-filter-to').value;
    const empVal = document.getElementById('admin-filter-employee').value;
    const custVal = document.getElementById('admin-filter-customer').value;
    const shiftVal = document.getElementById('admin-filter-shift').value;
    const statusVal = document.getElementById('admin-filter-status').value;
    const query = document.getElementById('admin-search-entries').value.toLowerCase().trim();
    
    return historicalEntries.filter(e => {
        if (fromVal && e.date < fromVal) return false;
        if (toVal && e.date > toVal) return false;
        
        if (empVal !== 'All' && e.employee !== empVal) return false;
        if (custVal !== 'All' && e.customer !== custVal) return false;
        
        if (shiftVal !== 'All') {
            const isA = e.shift && (e.shift.includes('Day Shift') || e.shift === 'Shift A');
            const isB = e.shift && (e.shift.includes('Night Shift') || e.shift === 'Shift B');
            if (shiftVal === 'A' && !isA) return false;
            if (shiftVal === 'B' && !isB) return false;
        }
        
        if (statusVal !== 'All') {
            if (statusVal === 'pending') {
                if (e.status !== 'pending' && e.status !== 'in-progress') return false;
            } else {
                if (e.status !== statusVal) return false;
            }
        }
        
        if (query) {
            const matchesQuery = 
                e.part.toLowerCase().includes(query) ||
                e.component.toLowerCase().includes(query) ||
                e.customer.toLowerCase().includes(query) ||
                (e.employee && e.employee.toLowerCase().includes(query));
            if (!matchesQuery) return false;
        }
        
        return true;
    });
}

function renderAdminEntriesTable() {
    const tbody = document.getElementById('admin-entries-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const filtered = getFilteredAdminEntries();
    
    const totalQty = filtered.reduce((sum, e) => sum + e.qty, 0);
    document.getElementById('admin-entries-summary-stats').textContent = 
        `${filtered.length} entries • ${totalQty} total qty`;
        
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="empty-table-state">No entries found matching filters.</td>
            </tr>
        `;
        return;
    }
    
    filtered.forEach(entry => {
        const tr = document.createElement('tr');
        
        let fileLinkHtml = '—';
        const fileVal = entry.file || '—';
        if (fileVal !== '—') {
            fileLinkHtml = `
                <a href="#" class="table-file-link" onclick="event.preventDefault(); alert('Opening attached file: ${fileVal}');" title="${fileVal}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px;">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                    ${fileVal.substring(0, 10)}${fileVal.length > 10 ? '...' : ''}
                </a>
            `;
        }
        
        const shiftLabel = entry.shift && entry.shift.includes('Day Shift') ? 'Shift A' : 'Shift B';
        
        const statusSelect = `
            <select class="status-badge ${entry.status}" onchange="updateEntryStatus('${entry.id}', this.value)" style="border: none; outline: none; font-weight: 700; cursor: pointer; padding: 4px 8px; border-radius: 9999px;">
                <option value="completed" ${entry.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="pending" ${entry.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="rework" ${entry.status === 'rework' ? 'selected' : ''}>Rework</option>
                <option value="hold" ${entry.status === 'hold' ? 'selected' : ''}>Hold</option>
            </select>
        `;
        
        const viewIcon = `
            <button type="button" class="btn-edit-entry" onclick="openLogDetailsModal('${entry.id}')" title="View details" style="background: none; border: none; padding: 6px; cursor: pointer; color: #4b5563; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
            </button>
        `;
        const deleteIcon = `
            <button type="button" class="btn-delete-entry" onclick="deleteAdminEntry('${entry.id}')" title="Delete entry" style="background: none; border: none; padding: 6px; cursor: pointer; color: #b91c1c; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        `;
        
        tr.innerHTML = `
            <td>${entry.date}</td>
            <td><strong>${entry.hour}</strong></td>
            <td>${shiftLabel}</td>
            <td><code>${entry.employee || 'EMP001'}</code></td>
            <td>${entry.customer}</td>
            <td><code>${entry.part}</code></td>
            <td>${entry.component}</td>
            <td>${entry.process}</td>
            <td><strong>${entry.qty}</strong></td>
            <td>${statusSelect}</td>
            <td>${fileLinkHtml}</td>
            <td style="text-align: right; width: 100px;">
                ${viewIcon}
                ${deleteIcon}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterAdminEntries() {
    renderAdminEntriesTable();
}

function resetAdminFilters() {
    const adminFrom = document.getElementById('admin-filter-from');
    const adminTo = document.getElementById('admin-filter-to');
    if (adminFrom && adminTo) {
        adminTo.value = getTodayDateString();
        adminFrom.value = getRelativeDateString(30);
    }
    
    document.getElementById('admin-filter-employee').selectedIndex = 0;
    document.getElementById('admin-filter-customer').selectedIndex = 0;
    document.getElementById('admin-filter-shift').selectedIndex = 0;
    document.getElementById('admin-filter-status').selectedIndex = 0;
    document.getElementById('admin-search-entries').value = '';
    
    filterAdminEntries();
}

async function deleteAdminEntry(id) {
    if (confirm('Are you sure you want to delete this work entry?')) {
        if (typeof window.dbDeleteLog !== 'undefined' && window.supabaseClient) {
            try {
                await window.dbDeleteLog(id);
                await window.syncFromSupabase();
                todayEntries = todayEntries.filter(e => e.id !== id);
            } catch (err) {
                console.error("Error deleting entry:", err);
                window.showToast("Failed to delete entry from database.", "error");
                return;
            }
        } else {
            historicalEntries = historicalEntries.filter(e => e.id !== id);
            todayEntries = todayEntries.filter(e => e.id !== id);
        }
        
        renderAdminEntriesTable();
        updateAdminDashboard();
        showToast('Entry deleted successfully.');
    }
}

async function updateEntryStatus(id, newStatus) {
    const entry = historicalEntries.find(e => e.id === id);
    if (entry) {
        const updatedEntry = {
            ...entry,
            status: newStatus
        };
        
        if (typeof window.dbSaveLog !== 'undefined' && window.supabaseClient) {
            try {
                await window.dbSaveLog(updatedEntry);
                await window.syncFromSupabase();
                const todayEntry = todayEntries.find(e => e.id === id);
                if (todayEntry) todayEntry.status = newStatus;
            } catch (err) {
                console.error("Error updating status:", err);
                showToast("Failed to update status in database.", "error");
                return;
            }
        } else {
            entry.status = newStatus;
            const todayEntry = todayEntries.find(e => e.id === id);
            if (todayEntry) todayEntry.status = newStatus;
        }
        
        updateAdminDashboard();
        filterAdminEntries();
        showToast(`Status updated to ${newStatus.toUpperCase()}.`);
    }
}

// ==========================================
// 4. MASTER DATA: USER MANAGEMENT CRUD
// ==========================================

let userCurrentPage = 1;
const userPageSize = 5;
let userSortField = 'empid';
let userSortDirection = 'asc';

function toggleUserSort(field) {
    if (userSortField === field) {
        userSortDirection = userSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        userSortField = field;
        userSortDirection = 'asc';
    }
    
    // Reset sort indicators
    const icons = { 'empid': 'sort-icon-user-empid', 'email': 'sort-icon-user-email' };
    Object.keys(icons).forEach(f => {
        const el = document.getElementById(icons[f]);
        if (el) {
            if (f === userSortField) {
                el.textContent = userSortDirection === 'asc' ? '▲' : '▼';
                el.style.color = 'var(--primary-color)';
            } else {
                el.textContent = '↕';
                el.style.color = 'var(--text-light)';
            }
        }
    });
    
    renderUsersTable();
}

function changeUserPage(dir) {
    userCurrentPage += dir;
    renderUsersTable();
}

function renderUsersTable() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const query = document.getElementById('admin-search-users').value.toLowerCase().trim();
    const roleFilter = document.getElementById('admin-filter-user-role').value;
    const statusFilter = document.getElementById('admin-filter-user-status').value;
    
    // 1. Filter
    let filtered = users.filter(u => {
        const nameVal = u.name || '';
        const empidVal = u.empid || '';
        const emailVal = u.email || '';
        const matchesQuery = nameVal.toLowerCase().includes(query) || 
                             empidVal.toLowerCase().includes(query) || 
                             emailVal.toLowerCase().includes(query);
                             
        let matchesRole = true;
        if (roleFilter !== 'all') {
            matchesRole = u.role === roleFilter;
        }
        
        let matchesStatus = true;
        if (statusFilter === 'active') {
            matchesStatus = u.active === true;
        } else if (statusFilter === 'inactive') {
            matchesStatus = u.active === false;
        }
        
        return matchesQuery && matchesRole && matchesStatus;
    });
    
    // 2. Sort
    filtered.sort((a, b) => {
        let valA = (a[userSortField] || '').toString().toLowerCase();
        let valB = (b[userSortField] || '').toString().toLowerCase();
        
        if (valA < valB) return userSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return userSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    // 3. Paginate
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / userPageSize));
    
    if (userCurrentPage > totalPages) {
        userCurrentPage = totalPages;
    }
    if (userCurrentPage < 1) {
        userCurrentPage = 1;
    }
    
    const startIndex = (userCurrentPage - 1) * userPageSize;
    const endIndex = Math.min(startIndex + userPageSize, totalItems);
    const paginatedItems = filtered.slice(startIndex, endIndex);
    
    // Update pagination controls info
    const infoEl = document.getElementById('admin-users-pagination-info');
    if (infoEl) {
        infoEl.textContent = totalItems === 0 ? 'Showing 0-0 of 0' : `Showing ${startIndex + 1}-${endIndex} of ${totalItems}`;
    }
    
    const prevBtn = document.getElementById('admin-users-prev-page');
    if (prevBtn) prevBtn.disabled = userCurrentPage === 1;
    
    const nextBtn = document.getElementById('admin-users-next-page');
    if (nextBtn) nextBtn.disabled = userCurrentPage === totalPages;
    
    if (paginatedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-table-state">No users found.</td></tr>`;
        return;
    }
    
    paginatedItems.forEach((user) => {
        const mainIndex = users.findIndex(u => u.email === user.email);
        const tr = document.createElement('tr');
        
        const statusBadge = user.active 
            ? `<span class="status-badge completed" style="cursor: pointer; user-select: none;" onclick="toggleUserActiveStatus(${mainIndex})">Active</span>` 
            : `<span class="status-badge rework" style="cursor: pointer; user-select: none;" onclick="toggleUserActiveStatus(${mainIndex})">Inactive</span>`;
            
        const editIcon = `
            <button type="button" class="btn-edit-entry" onclick="openEditUserModal(${mainIndex})" title="Edit user" style="background: none; border: none; padding: 6px; cursor: pointer; color: #4b5563; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        `;
        const deleteIcon = `
            <button type="button" class="btn-delete-entry" onclick="deleteUser(${mainIndex})" title="Delete user" style="background: none; border: none; padding: 6px; cursor: pointer; color: #b91c1c; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        `;
        
        tr.innerHTML = `
            <td><strong>${user.empid || '—'}</strong></td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${user.role.toUpperCase()}</span></td>
            <td>${statusBadge}</td>
            <td style="text-align: right; width: 100px;">
                ${editIcon}
                ${deleteIcon}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddUserModal() {
    document.getElementById('modal-user-title').textContent = 'Add New User';
    document.getElementById('modal-user-index').value = '-1';
    document.getElementById('modal-user-role').value = 'employee';
    document.getElementById('modal-user-empid').value = '';
    document.getElementById('modal-user-email').value = '';
    document.getElementById('modal-user-password').value = '';
    document.getElementById('modal-user-password-hint').style.display = 'none';
    document.getElementById('modal-user-active').value = 'true';
    
    toggleUserModalFields();
    openModal('modal-user');
}

function openEditUserModal(index) {
    const user = users[index];
    document.getElementById('modal-user-title').textContent = 'Edit User';
    document.getElementById('modal-user-index').value = index;
    document.getElementById('modal-user-role').value = user.role;
    document.getElementById('modal-user-empid').value = user.empid || '';
    document.getElementById('modal-user-email').value = user.email || '';
    document.getElementById('modal-user-password').value = '';
    document.getElementById('modal-user-password-hint').style.display = 'block';
    document.getElementById('modal-user-active').value = user.active.toString();
    
    toggleUserModalFields();
    openModal('modal-user');
}

function toggleUserModalFields() {
    const role = document.getElementById('modal-user-role').value;
    const empidGroup = document.getElementById('modal-user-empid-group');
    const empidInput = document.getElementById('modal-user-empid');
    
    if (role === 'admin') {
        empidGroup.style.display = 'none';
        empidInput.required = false;
    } else {
        empidGroup.style.display = '';
        empidInput.required = true;
    }
}

async function saveUserModal(e) {
    e.preventDefault();
    const index = parseInt(document.getElementById('modal-user-index').value);
    const role = document.getElementById('modal-user-role').value;
    const empid = document.getElementById('modal-user-empid').value.trim();
    const email = document.getElementById('modal-user-email').value.trim();
    const password = document.getElementById('modal-user-password').value;
    const active = document.getElementById('modal-user-active').value === 'true';
    
    // Validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("A valid email address is required.", "error");
        return;
    }
    if (index === -1 && (!password || password.length < 6)) {
        showToast("Password must be at least 6 characters.", "error");
        return;
    }
    if (role === 'employee') {
        if (!empid || !/^(EMP)[0-9]{3,}$/.test(empid)) {
            showToast("Employee ID must start with 'EMP' followed by at least 3 digits.", "error");
            return;
        }
    }
    
    const newUserObj = {
        empid: role === 'admin' ? '' : empid,
        name: email.split('@')[0],
        email,
        password: password || (index !== -1 ? users[index].password : ''),
        role,
        active
    };
    
    // Backup state for Optimistic UI Rollback
    const backupUsers = JSON.parse(JSON.stringify(users));
    
    // Apply local state updates optimistically
    if (index === -1) {
        users.push(newUserObj);
        showToast('User created successfully.');
    } else {
        const oldEmpId = users[index].empid;
        users[index] = newUserObj;
        if (role === 'employee') {
            cascadeEmployeeUpdate(oldEmpId, empid);
        }
        showToast('User updated successfully.');
    }
    
    // Render immediately
    closeModal('modal-user');
    renderUsersTable();
    populateFilterDropdowns();
    updateAdminDashboard();
    
    // Perform background DB sync
    if (typeof window.dbSaveUser !== 'undefined' && window.supabaseClient) {
        try {
            if (index !== -1) {
                const oldEmpId = backupUsers[index].empid;
                if (oldEmpId !== newUserObj.empid) {
                    await window.dbDeleteUser(oldEmpId);
                }
            }
            await window.dbSaveUser(newUserObj);
            await window.syncFromSupabase();
        } catch (err) {
            console.error("Error saving user:", err);
            // Rollback local state
            users = backupUsers;
            renderUsersTable();
            populateFilterDropdowns();
            updateAdminDashboard();
            window.showToast("Failed to save changes. Rolled back.", "error");
        }
    }
}

async function toggleUserActiveStatus(index) {
    const user = users[index];
    const session = window.loggedInUser;
    
    if (user.email === 'admin@gruvfix.com' || (session && user.email === session.email)) {
        showToast('Cannot deactivate the active administrator.', 'error');
        return;
    }
    
    const updatedUser = {
        ...user,
        active: !user.active
    };
    
    // Backup state for Optimistic UI Rollback
    const backupUsers = JSON.parse(JSON.stringify(users));
    
    // Apply local state updates optimistically
    users[index].active = !users[index].active;
    renderUsersTable();
    updateAdminDashboard();
    showToast(`User status toggled.`);
    
    // Perform background DB sync
    if (typeof window.dbSaveUser !== 'undefined' && window.supabaseClient) {
        try {
            await window.dbSaveUser(updatedUser);
            await window.syncFromSupabase();
        } catch (err) {
            console.error("Error toggling status:", err);
            // Rollback local state
            users = backupUsers;
            renderUsersTable();
            updateAdminDashboard();
            window.showToast("Failed to update status. Rolled back.", "error");
        }
    }
}

async function deleteUser(index) {
    const user = users[index];
    const session = window.loggedInUser;
    
    if (user.email === 'admin@gruvfix.com' || (session && user.email === session.email)) {
        showToast('Cannot delete the active administrator.', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete user ${user.empid || user.email}?`)) {
        // Backup state for Optimistic UI Rollback
        const backupUsers = JSON.parse(JSON.stringify(users));
        
        // Apply local state updates optimistically
        users.splice(index, 1);
        renderUsersTable();
        populateFilterDropdowns();
        updateAdminDashboard();
        window.showToast(`User deleted successfully.`);
        
        // Perform background DB sync
        if (typeof window.dbDeleteUser !== 'undefined' && window.supabaseClient) {
            try {
                await window.dbDeleteUser(user.empid);
                await window.syncFromSupabase();
            } catch (err) {
                console.error("Error deleting user:", err);
                // Rollback local state
                users = backupUsers;
                renderUsersTable();
                populateFilterDropdowns();
                updateAdminDashboard();
                window.showToast("Failed to delete user. Rolled back.", "error");
            }
        }
    }
}

// ==========================================
// 5. MASTER DATA: CUSTOMER CRUD
// ==========================================

let customerCurrentPage = 1;
const customerPageSize = 5;
let customerSortField = 'name';
let customerSortDirection = 'asc';

function toggleCustomerSort(field) {
    if (customerSortField === field) {
        customerSortDirection = customerSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        customerSortField = field;
        customerSortDirection = 'asc';
    }
    
    // Reset sort indicators
    const icons = { 'name': 'sort-icon-name', 'code': 'sort-icon-code' };
    Object.keys(icons).forEach(f => {
        const el = document.getElementById(icons[f]);
        if (el) {
            if (f === customerSortField) {
                el.textContent = customerSortDirection === 'asc' ? '▲' : '▼';
                el.style.color = 'var(--primary-color)';
            } else {
                el.textContent = '↕';
                el.style.color = 'var(--text-light)';
            }
        }
    });
    
    renderCustomersTable();
}

function changeCustomerPage(dir) {
    customerCurrentPage += dir;
    renderCustomersTable();
}

function renderCustomersTable() {
    const tbody = document.getElementById('admin-customers-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const query = document.getElementById('admin-search-customers').value.toLowerCase().trim();
    const gstFilter = document.getElementById('admin-filter-customer-gst').value;
    
    // 1. Filter
    let filtered = customers.filter(c => {
        const matchesQuery = c.name.toLowerCase().includes(query) || (c.code && c.code.toLowerCase().includes(query));
        
        let matchesGst = true;
        if (gstFilter === 'registered') {
            matchesGst = c.gst && c.gst !== '—' && c.gst.trim().length > 0;
        } else if (gstFilter === 'unregistered') {
            matchesGst = !c.gst || c.gst === '—' || c.gst.trim().length === 0;
        }
        
        return matchesQuery && matchesGst;
    });
    
    // 2. Sort
    filtered.sort((a, b) => {
        let valA = (a[customerSortField] || '').toString().toLowerCase();
        let valB = (b[customerSortField] || '').toString().toLowerCase();
        
        if (valA < valB) return customerSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return customerSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    // 3. Paginate
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / customerPageSize));
    
    if (customerCurrentPage > totalPages) {
        customerCurrentPage = totalPages;
    }
    if (customerCurrentPage < 1) {
        customerCurrentPage = 1;
    }
    
    const startIndex = (customerCurrentPage - 1) * customerPageSize;
    const endIndex = Math.min(startIndex + customerPageSize, totalItems);
    const paginatedItems = filtered.slice(startIndex, endIndex);
    
    // Update pagination controls info
    const infoEl = document.getElementById('admin-customers-pagination-info');
    if (infoEl) {
        infoEl.textContent = totalItems === 0 ? 'Showing 0-0 of 0' : `Showing ${startIndex + 1}-${endIndex} of ${totalItems}`;
    }
    
    const prevBtn = document.getElementById('admin-customers-prev-page');
    if (prevBtn) prevBtn.disabled = customerCurrentPage === 1;
    
    const nextBtn = document.getElementById('admin-customers-next-page');
    if (nextBtn) nextBtn.disabled = customerCurrentPage === totalPages;
    
    if (paginatedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-table-state">No customers found.</td></tr>`;
        return;
    }
    
    paginatedItems.forEach((cust) => {
        const mainIndex = customers.findIndex(c => c.name === cust.name);
        const tr = document.createElement('tr');
        
        const editIcon = `
            <button type="button" class="btn-edit-entry" onclick="openEditCustomerModal(${mainIndex})" title="Edit customer" style="background: none; border: none; padding: 6px; cursor: pointer; color: #4b5563; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        `;
        const deleteIcon = `
            <button type="button" class="btn-delete-entry" onclick="deleteCustomer(${mainIndex})" title="Delete customer" style="background: none; border: none; padding: 6px; cursor: pointer; color: #b91c1c; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        `;
        
        tr.innerHTML = `
            <td><strong>${cust.name}</strong></td>
            <td><code>${cust.code || '—'}</code></td>
            <td>${cust.notes || '—'}</td>
            <td>${cust.updatedBy || '—'}</td>
            <td style="text-align: right; width: 100px;">
                ${editIcon}
                ${deleteIcon}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddCustomerModal() {
    const errContainer = document.getElementById('modal-customer-error');
    if (errContainer) {
        errContainer.style.display = 'none';
        errContainer.textContent = '';
    }
    document.getElementById('modal-customer-title').textContent = 'Add New Customer';
    document.getElementById('modal-customer-index').value = '-1';
    document.getElementById('modal-customer-name').value = '';
    document.getElementById('modal-customer-contact').value = '';
    document.getElementById('modal-customer-gst').value = '';
    document.getElementById('modal-customer-code').value = '';
    document.getElementById('modal-customer-notes').value = '';
    openModal('modal-customer');
}

function openEditCustomerModal(index) {
    const errContainer = document.getElementById('modal-customer-error');
    if (errContainer) {
        errContainer.style.display = 'none';
        errContainer.textContent = '';
    }
    const customer = customers[index];
    document.getElementById('modal-customer-title').textContent = 'Edit Customer';
    document.getElementById('modal-customer-index').value = index;
    document.getElementById('modal-customer-name').value = customer.name;
    document.getElementById('modal-customer-contact').value = customer.contact || '';
    document.getElementById('modal-customer-gst').value = customer.gst || '';
    document.getElementById('modal-customer-code').value = customer.code || '';
    document.getElementById('modal-customer-notes').value = customer.notes || '';
    openModal('modal-customer');
}

async function saveCustomerModal(e) {
    e.preventDefault();
    
    // Clear previous error
    const errContainer = document.getElementById('modal-customer-error');
    if (errContainer) {
        errContainer.style.display = 'none';
        errContainer.textContent = '';
    }

    const index = parseInt(document.getElementById('modal-customer-index').value);
    const name = document.getElementById('modal-customer-name').value.trim();
    const contact = document.getElementById('modal-customer-contact').value.trim();
    const gst = document.getElementById('modal-customer-gst').value.trim();
    const code = document.getElementById('modal-customer-code').value.trim();
    const notes = document.getElementById('modal-customer-notes').value.trim();
    
    function showErr(msg) {
        if (errContainer) {
            errContainer.textContent = msg;
            errContainer.style.display = 'block';
        } else {
            showToast(msg, 'error');
        }
    }

    // Validation
    if (!name) {
        showErr("Customer name is required.");
        return;
    }
    if (code && !/^[A-Za-z0-9-]+$/.test(code)) {
        showErr("Customer code must be alphanumeric.");
        return;
    }
    if (gst && !/^[A-Za-z0-9]{15}$/.test(gst)) {
        showErr("GST number must be 15 alphanumeric characters.");
        return;
    }
    
    // Get active user context
    const userStr = window.loggedInUser 
        ? (window.loggedInUser.name || window.loggedInUser.empid || window.loggedInUser.email || 'System') 
        : 'System';
        
    let createdBy = userStr;
    let updatedBy = userStr;
    
    if (index !== -1 && customers[index]) {
        createdBy = customers[index].createdBy || userStr;
    }
    
    const newCustObj = { name, code, notes, contact, gst, createdBy, updatedBy };
    
    // Disable form submission / show saving indicator
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Save Customer';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }

    try {
        // Perform non-optimistic DB sync to keep operator in form in case of errors
        if (typeof window.dbSaveCustomer !== 'undefined' && window.supabaseClient) {
            if (index !== -1) {
                const oldName = customers[index].name;
                if (oldName !== name) {
                    await window.dbDeleteCustomer(oldName);
                }
            }
            await window.dbSaveCustomer(newCustObj);
            await window.syncFromSupabase();
        } else {
            // Local fallback
            if (index === -1) {
                window.customers.push(newCustObj);
            } else {
                const oldName = customers[index].name;
                window.customers[index] = newCustObj;
                cascadeCustomerUpdate(oldName, name);
            }
        }
        
        // Success execution
        closeModal('modal-customer');
        showToast(index === -1 ? 'Customer added successfully.' : 'Customer updated successfully.');
        
        renderCustomersTable();
        populateFilterDropdowns();
        updateAdminDashboard();

        if (activeRowIdForCustomerDropdown !== null) {
            selectCustOption(activeRowIdForCustomerDropdown, name);
            activeRowIdForCustomerDropdown = null;
        }

        // Auto-return to Add Part modal if we came from there
        if (window.tempPartModalState) {
            openAddPartModal();

            // Restore input values
            document.getElementById('modal-part-no').value = window.tempPartModalState.partNo;
            document.getElementById('modal-part-comp').value = window.tempPartModalState.comp;
            document.getElementById('modal-part-material').value = window.tempPartModalState.material;
            document.getElementById('modal-part-thickness').value = window.tempPartModalState.thickness;
            setPartProcessSelect(window.tempPartModalState.process);
            document.getElementById('modal-part-index').value = window.tempPartModalState.index;
            selectedPartFile = window.tempPartModalState.file;
            document.getElementById('modal-part-file-name').textContent = window.tempPartModalState.fileLabel;

            // Select newly added customer
            const select = document.getElementById('modal-part-customer');
            if (select) {
                select.value = name;
            }

            window.tempPartModalState = null;
        }

    } catch (err) {
        console.error("Error saving customer:", err);
        showErr(err.message || "Failed to save customer. Please try again.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

async function deleteCustomer(index) {
    const cust = customers[index];
    if (confirm(`Deleting "${cust.name}" will also delete all their Parts. Are you sure you want to proceed?`)) {
        const name = cust.name;
        
        // Backup state for Optimistic UI Rollback
        const backupCustomers = JSON.parse(JSON.stringify(customers));
        const backupParts = JSON.parse(JSON.stringify(parts));
        
        // Apply local state updates optimistically
        window.parts = parts.filter(p => p.customer !== name);
        customers.splice(index, 1);
        
        // Render immediately
        renderCustomersTable();
        renderPartsTable();
        populateFilterDropdowns();
        updateAdminDashboard();
        showToast(`Customer "${name}" removed.`);
        
        // Perform background DB sync
        if (typeof window.dbDeleteCustomer !== 'undefined' && window.supabaseClient) {
            try {
                await window.dbDeleteCustomer(name);
                await window.syncFromSupabase();
            } catch (err) {
                console.error("Error deleting customer:", err);
                // Rollback local state
                window.customers = backupCustomers;
                window.parts = backupParts;
                renderCustomersTable();
                renderPartsTable();
                populateFilterDropdowns();
                updateAdminDashboard();
                showToast("Failed to delete customer. Rolled back.", "error");
            }
        }
    }
}

// ==========================================
// 6. MASTER DATA: PARTS CRUD
// ==========================================

const ALLOWED_DRAWING_EXTENSIONS = ['.pdf', '.dxf'];
const PART_PROCESS_OPTIONS = ['Cutting', 'Milling'];
let selectedPartFile = null;

// Resets the Default Process select to just the two allowed options, then
// selects `value`. If `value` is a legacy value that doesn't match either
// option (real production data has things like "CUTTIG", "MILL", "IDLE"),
// an extra option is injected so the existing value isn't silently blanked
// out and overwritten on save.
function setPartProcessSelect(value) {
    const select = document.getElementById('modal-part-process');
    select.innerHTML = '<option value="">Select process...</option>' +
        PART_PROCESS_OPTIONS.map(p => `<option value="${p}">${p}</option>`).join('');

    if (value && !PART_PROCESS_OPTIONS.includes(value)) {
        const legacyOpt = document.createElement('option');
        legacyOpt.value = value;
        legacyOpt.textContent = `${value} (existing value — pick Cutting or Milling to update)`;
        select.appendChild(legacyOpt);
    }
    select.value = value || '';
    select.dataset.original = value || '';
}

function renderPartsTable() {
    const tbody = document.getElementById('admin-parts-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const query = document.getElementById('admin-search-parts').value.toLowerCase().trim();
    const filtered = parts.filter(p => p.partNo.toLowerCase().includes(query) || p.component.toLowerCase().includes(query) || p.customer.toLowerCase().includes(query));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-table-state">No parts found.</td></tr>`;
        return;
    }

    filtered.forEach((part) => {
        const mainIndex = parts.findIndex(p => p.partNo === part.partNo && p.customer === part.customer);
        const tr = document.createElement('tr');

        const editIcon = `
            <button type="button" class="btn-edit-entry" onclick="openEditPartModal(${mainIndex})" title="Edit part" style="background: none; border: none; padding: 6px; cursor: pointer; color: #4b5563; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        `;
        const deleteIcon = `
            <button type="button" class="btn-delete-entry" onclick="deletePart(${mainIndex})" title="Delete part" style="background: none; border: none; padding: 6px; cursor: pointer; color: #b91c1c; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        `;

        const drawingUrl = part.drawingPath && typeof window.getPartDrawingUrl === 'function' ? window.getPartDrawingUrl(part.drawingPath) : null;
        const drawingCell = drawingUrl
            ? `<a href="${drawingUrl}" target="_blank" rel="noopener noreferrer" title="${part.drawingFileName || 'Drawing'}">${(part.drawingFileName || 'Drawing').substring(0, 14)}${(part.drawingFileName || '').length > 14 ? '...' : ''}</a>`
            : '—';

        tr.innerHTML = `
            <td><code>${part.partNo}</code></td>
            <td>${part.customer}</td>
            <td><strong>${part.component}</strong></td>
            <td>${part.material || '—'}</td>
            <td>${part.thickness || '—'}</td>
            <td>${part.process || '—'}</td>
            <td>${drawingCell}</td>
            <td>${part.updatedBy || '—'}</td>
            <td style="text-align: right; width: 100px;">
                ${editIcon}
                ${deleteIcon}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function resetPartFileInput() {
    selectedPartFile = null;
    const fileInput = document.getElementById('modal-part-file');
    if (fileInput) fileInput.value = '';
}

function handlePartFileSelected() {
    const fileInput = document.getElementById('modal-part-file');
    const label = document.getElementById('modal-part-file-name');
    if (!fileInput || !fileInput.files.length) return;

    const file = fileInput.files[0];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!ALLOWED_DRAWING_EXTENSIONS.includes(ext)) {
        showToast('Only PDF or DXF files are allowed.', 'error');
        fileInput.value = '';
        selectedPartFile = null;
        if (label) label.textContent = 'No file selected.';
        return;
    }

    selectedPartFile = file;
    if (label) label.textContent = `Selected: ${file.name}`;
}

function openAddPartModal() {
    const errContainer = document.getElementById('modal-part-error');
    if (errContainer) {
        errContainer.style.display = 'none';
        errContainer.textContent = '';
    }

    document.getElementById('modal-part-title').textContent = 'Add New Part';
    document.getElementById('modal-part-index').value = '-1';
    document.getElementById('modal-part-no').value = '';
    document.getElementById('modal-part-comp').value = '';
    document.getElementById('modal-part-material').value = '';
    document.getElementById('modal-part-thickness').value = '';
    setPartProcessSelect('');
    resetPartFileInput();
    document.getElementById('modal-part-file-name').textContent = 'No file selected.';

    const select = document.getElementById('modal-part-customer');
    select.innerHTML = '';
    customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        select.appendChild(opt);
    });

    openModal('modal-part');
}

function openEditPartModal(index) {
    const errContainer = document.getElementById('modal-part-error');
    if (errContainer) {
        errContainer.style.display = 'none';
        errContainer.textContent = '';
    }

    const part = parts[index];
    document.getElementById('modal-part-title').textContent = 'Edit Part';
    document.getElementById('modal-part-index').value = index;
    document.getElementById('modal-part-no').value = part.partNo;
    document.getElementById('modal-part-comp').value = part.component;
    document.getElementById('modal-part-material').value = part.material || '';
    document.getElementById('modal-part-thickness').value = part.thickness || '';
    setPartProcessSelect(part.process || '');
    resetPartFileInput();
    document.getElementById('modal-part-file-name').textContent = part.drawingFileName
        ? `Current: ${part.drawingFileName} (choose a new file to replace)`
        : 'No file uploaded yet.';

    const select = document.getElementById('modal-part-customer');
    select.innerHTML = '';
    customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        if (c.name === part.customer) opt.selected = true;
        select.appendChild(opt);
    });

    openModal('modal-part');
}

async function savePartModal(e) {
    e.preventDefault();

    const errContainer = document.getElementById('modal-part-error');
    if (errContainer) {
        errContainer.style.display = 'none';
        errContainer.textContent = '';
    }
    function showErr(msg) {
        if (errContainer) {
            errContainer.textContent = msg;
            errContainer.style.display = 'block';
        }
    }

    const index = parseInt(document.getElementById('modal-part-index').value);
    const partNo = document.getElementById('modal-part-no').value.trim();
    const component = document.getElementById('modal-part-comp').value.trim();
    const customer = document.getElementById('modal-part-customer').value;
    const material = document.getElementById('modal-part-material').value.trim();
    const thickness = document.getElementById('modal-part-thickness').value.trim();
    const processSelect = document.getElementById('modal-part-process');
    const process = processSelect.value.trim();
    const processUnchanged = process === (processSelect.dataset.original || '');

    if (!processUnchanged && process && !PART_PROCESS_OPTIONS.includes(process)) {
        showErr('Default Process must be either Cutting or Milling.');
        return;
    }

    const isDuplicatePartNo = parts.some((p, i) => i !== index && p.partNo.trim().toLowerCase() === partNo.toLowerCase());
    if (isDuplicatePartNo) {
        showErr(`Duplicate Part No. detected. "${partNo}" already exists — please use a different Part No.`);
        return;
    }

    // Get active user context
    const userStr = window.loggedInUser
        ? (window.loggedInUser.name || window.loggedInUser.empid || window.loggedInUser.email || 'System')
        : 'System';

    let createdBy = userStr;
    let updatedBy = userStr;

    if (index !== -1 && parts[index]) {
        createdBy = parts[index].createdBy || userStr;
    }

    let drawingPath = index !== -1 && parts[index] ? parts[index].drawingPath : null;
    let drawingFileName = index !== -1 && parts[index] ? parts[index].drawingFileName : null;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Save Part';

    if (selectedPartFile) {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Uploading...';
        }
        try {
            if (typeof window.uploadPartDrawing === 'function' && window.supabaseClient) {
                const uploaded = await window.uploadPartDrawing(selectedPartFile, partNo);
                drawingPath = uploaded.path;
                drawingFileName = uploaded.fileName;
            } else {
                drawingFileName = selectedPartFile.name;
            }
        } catch (err) {
            console.error("Error uploading part drawing:", err);
            showErr("Failed to upload drawing file. Please try again.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
            return;
        }
    }

    const newPartObj = { partNo, component, customer, material, thickness, process, drawingPath, drawingFileName, createdBy, updatedBy };

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }

    if (index === -1) {
        if (typeof window.dbSavePart !== 'undefined' && window.supabaseClient) {
            try {
                await window.dbSavePart(newPartObj);
                await window.syncFromSupabase();
            } catch (err) {
                console.error("Error creating part:", err);
                showErr("Failed to create part in database.");
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
                return;
            }
        } else {
            parts.push(newPartObj);
        }
        showToast('Part created successfully.');

        if (activeRowIdForPartDropdown !== null) {
            selectPartOption(activeRowIdForPartDropdown, partNo);
            activeRowIdForPartDropdown = null;
        }
    } else {
        const oldPartNo = parts[index].partNo;

        if (typeof window.dbSavePart !== 'undefined' && window.supabaseClient) {
            try {
                if (oldPartNo !== partNo) {
                    await window.dbDeletePart(oldPartNo);
                }
                await window.dbSavePart(newPartObj);
                await window.syncFromSupabase();
            } catch (err) {
                console.error("Error updating part:", err);
                showErr("Failed to update part in database.");
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
                return;
            }
        } else {
            parts[index].partNo = partNo;
            parts[index].component = component;
            parts[index].customer = customer;
            parts[index].material = material;
            parts[index].thickness = thickness;
            parts[index].process = process;
            parts[index].drawingPath = drawingPath;
            parts[index].drawingFileName = drawingFileName;

            cascadePartUpdate(customer, oldPartNo, partNo, component);
        }
        showToast('Part updated successfully.');
    }

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }

    selectedPartFile = null;
    closeModal('modal-part');
    renderPartsTable();
    updateAdminDashboard();
}

async function deletePart(index) {
    const part = parts[index];
    if (confirm(`Are you sure you want to delete part "${part.partNo}"?`)) {
        if (typeof window.dbDeletePart !== 'undefined' && window.supabaseClient) {
            try {
                await window.dbDeletePart(part.partNo);
                await window.syncFromSupabase();
            } catch (err) {
                console.error("Error deleting part:", err);
                window.showToast("Failed to delete part from database.", "error");
                return;
            }
        } else {
            parts.splice(index, 1);
        }
        renderPartsTable();
        updateAdminDashboard();
        showToast('Part deleted.');
    }
}

// ==========================================
// 6a. MASTER DATA: PARTS BULK IMPORT
// ==========================================

const PART_IMPORT_HEADER_ALIASES = {
    partNo: ['partno', 'part', 'partnumber'],
    customer: ['customer', 'customername'],
    component: ['component', 'description', 'componentdescription'],
    material: ['material'],
    thickness: ['thickness'],
    process: ['defaultprocess', 'process']
};

function normalizePartImportHeaderKey(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mapPartImportRow(rawRow) {
    const normalized = {};
    Object.keys(rawRow).forEach(key => {
        normalized[normalizePartImportHeaderKey(key)] = rawRow[key];
    });

    const pick = (aliases) => {
        for (const alias of aliases) {
            const val = normalized[alias];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
                return String(val).trim();
            }
        }
        return '';
    };

    return {
        partNo: pick(PART_IMPORT_HEADER_ALIASES.partNo),
        customer: pick(PART_IMPORT_HEADER_ALIASES.customer),
        component: pick(PART_IMPORT_HEADER_ALIASES.component),
        material: pick(PART_IMPORT_HEADER_ALIASES.material),
        thickness: pick(PART_IMPORT_HEADER_ALIASES.thickness),
        process: pick(PART_IMPORT_HEADER_ALIASES.process)
    };
}

function downloadPartsTemplate() {
    if (typeof XLSX === 'undefined') {
        showToast('Excel engine not loaded. Please try again in a moment.', 'error');
        return;
    }

    const headers = ['Part No', 'Customer', 'Component/Description', 'Material', 'Thickness', 'Default Process'];
    const example = ['TM-GASK-04', 'TATA MOTORS', 'Manifold Gasket', 'Mild Steel', '3mm', 'Cutting'];

    // Data lives on its own sheet so a leftover example/instructions row can
    // never get parsed back in as a bogus part on re-import.
    const wsData = XLSX.utils.aoa_to_sheet([headers, example]);
    wsData['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];

    const wsNotes = XLSX.utils.aoa_to_sheet([
        ['Instructions'],
        ['Fill out the "Parts" sheet - delete the example row before importing.'],
        ['- Part No must be unique across the whole Parts Master.'],
        ['- Customer must exactly match an existing name in the Customer master.'],
        ['- Default Process must be exactly "Cutting" or "Milling", or left blank.']
    ]);
    wsNotes['!cols'] = [{ wch: 70 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, 'Parts');
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');
    XLSX.writeFile(wb, 'gruvfix_parts_import_template.xlsx');
    showToast('Template downloaded.');
}

async function handlePartsImportFile(event) {
    const fileInput = event.target;
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        showToast('Excel engine not loaded. Please try again in a moment.', 'error');
        fileInput.value = '';
        return;
    }

    let rawRows;
    try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    } catch (err) {
        console.error("Error parsing parts import file:", err);
        showToast('Could not read that file. Please use the downloaded template.', 'error');
        fileInput.value = '';
        return;
    }

    fileInput.value = '';

    if (!rawRows.length) {
        showToast('That file has no data rows to import.', 'error');
        return;
    }

    const existingPartNos = new Set(parts.map(p => p.partNo.trim().toLowerCase()));
    const seenInFile = new Set();
    const validRows = [];
    const errors = [];

    rawRows.forEach((raw, i) => {
        const rowNum = i + 2; // header occupies row 1
        const row = mapPartImportRow(raw);

        // Silently skip fully blank rows (trailing/interstitial empty rows are common in real spreadsheets)
        const isBlankRow = !row.partNo && !row.customer && !row.component && !row.material && !row.thickness && !row.process;
        if (isBlankRow) return;

        if (!row.partNo) { errors.push({ row: rowNum, reason: 'Missing Part No.' }); return; }
        if (!row.customer) { errors.push({ row: rowNum, partNo: row.partNo, reason: 'Missing Customer.' }); return; }
        if (!row.component) { errors.push({ row: rowNum, partNo: row.partNo, reason: 'Missing Component/Description.' }); return; }

        const custMatch = customers.find(c => c.name.trim().toLowerCase() === row.customer.toLowerCase());
        if (!custMatch) { errors.push({ row: rowNum, partNo: row.partNo, reason: `Customer "${row.customer}" not found in Customer master.` }); return; }

        if (row.process) {
            const normalizedProcess = row.process.toLowerCase();
            if (normalizedProcess === 'cutting') row.process = 'Cutting';
            else if (normalizedProcess === 'milling') row.process = 'Milling';
            else { errors.push({ row: rowNum, partNo: row.partNo, reason: 'Default Process must be Cutting or Milling.' }); return; }
        }

        const key = row.partNo.toLowerCase();
        if (existingPartNos.has(key)) { errors.push({ row: rowNum, partNo: row.partNo, reason: 'Duplicate Part No. detected — already exists in Parts Master.' }); return; }
        if (seenInFile.has(key)) { errors.push({ row: rowNum, partNo: row.partNo, reason: 'Duplicate Part No. detected — appears more than once in this file.' }); return; }

        seenInFile.add(key);
        validRows.push({ ...row, customer: custMatch.name });
    });

    if (!validRows.length) {
        showPartsImportResults(0, errors);
        return;
    }

    const userStr = window.loggedInUser
        ? (window.loggedInUser.name || window.loggedInUser.empid || window.loggedInUser.email || 'System')
        : 'System';

    let importedCount = 0;
    for (const row of validRows) {
        const partObj = {
            partNo: row.partNo,
            component: row.component,
            customer: row.customer,
            material: row.material,
            thickness: row.thickness,
            process: row.process,
            drawingPath: null,
            drawingFileName: null,
            createdBy: userStr,
            updatedBy: userStr
        };
        try {
            if (typeof window.dbSavePart !== 'undefined' && window.supabaseClient) {
                await window.dbSavePart(partObj);
            } else {
                parts.push(partObj);
            }
            importedCount++;
        } catch (err) {
            console.error("Error importing part", row.partNo, err);
            errors.push({ row: '—', partNo: row.partNo, reason: 'Database error while saving this row.' });
        }
    }

    if (typeof window.syncFromSupabase !== 'undefined' && window.supabaseClient) {
        await window.syncFromSupabase();
    }

    renderPartsTable();
    updateAdminDashboard();
    showPartsImportResults(importedCount, errors);
}

function showPartsImportResults(importedCount, errors) {
    const summaryEl = document.getElementById('parts-import-summary');
    const errorsEl = document.getElementById('parts-import-errors');

    let summary = `${importedCount} part${importedCount === 1 ? '' : 's'} imported successfully.`;
    if (errors.length) {
        summary += ` ${errors.length} row${errors.length === 1 ? '' : 's'} skipped.`;
    }
    summaryEl.textContent = summary;
    summaryEl.style.color = errors.length ? '#b45309' : '#166534';

    errorsEl.innerHTML = errors.length
        ? errors.map(e => `
            <div style="padding: 10px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px;">
                <strong>Row ${e.row}${e.partNo ? ` (${e.partNo})` : ''}:</strong> ${e.reason}
            </div>
        `).join('')
        : '';

    if (importedCount > 0) {
        showToast(`${importedCount} part(s) imported successfully.`);
    }

    openModal('modal-part-import');
}

// ==========================================
// 6b. MASTER DATA: MACHINES CRUD
// ==========================================

function renderMachinesTable() {
    const tbody = document.getElementById('admin-machines-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const searchInput = document.getElementById('admin-search-machines');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const filtered = (typeof machines !== 'undefined' ? machines : []).filter(m => 
        m.name.toLowerCase().includes(query) || 
        m.condition.toLowerCase().includes(query)
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-table-state">No machines found.</td></tr>`;
        return;
    }
    
    filtered.forEach((mach) => {
        const tr = document.createElement('tr');
        
        // Find index in global machines array
        const mainIndex = machines.findIndex(m => m.id === mach.id);
        
        const editIcon = `
            <button type="button" class="btn-edit-entry" onclick="openEditMachineModal(${mainIndex})" title="Edit machine" style="background: none; border: none; padding: 6px; cursor: pointer; color: #4b5563; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        `;
        const deleteIcon = `
            <button type="button" class="btn-delete-entry" onclick="deleteMachine(${mainIndex})" title="Delete machine" style="background: none; border: none; padding: 6px; cursor: pointer; color: #b91c1c; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        `;
        
        tr.innerHTML = `
            <td><strong>${mach.name}</strong></td>
            <td><span class="status-badge" style="background-color: ${getConditionBg(mach.condition)}; color: ${getConditionColor(mach.condition)}; border: 1px solid ${getConditionBorder(mach.condition)}; padding: 4px 10px; font-size: 11px; font-weight: 600;">${mach.condition}</span></td>
            <td>${mach.yearsOfUse} years</td>
            <td style="text-align: right;">${editIcon}${deleteIcon}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

function getConditionBg(cond) {
    if (cond === 'Good') return '#dcfce7';
    if (cond === 'OK') return '#fef3c7';
    if (cond === 'Needs Service') return '#ffedd5';
    return '#fee2e2'; // Broken
}
function getConditionColor(cond) {
    if (cond === 'Good') return '#10b981';
    if (cond === 'OK') return '#d97706';
    if (cond === 'Needs Service') return '#ea580c';
    return '#b91c1c';
}
function getConditionBorder(cond) {
    if (cond === 'Good') return '#bbf7d0';
    if (cond === 'OK') return '#fde68a';
    if (cond === 'Needs Service') return '#fed7aa';
    return '#fca5a5';
}

function openAddMachineModal() {
    const title = document.getElementById('modal-machine-title');
    if (title) title.textContent = 'Add New Machine';
    
    const idInput = document.getElementById('modal-machine-id');
    if (idInput) idInput.value = '';
    
    const nameInput = document.getElementById('modal-machine-name');
    if (nameInput) nameInput.value = '';
    
    const condInput = document.getElementById('modal-machine-condition');
    if (condInput) condInput.value = 'Good';
    
    const yearsInput = document.getElementById('modal-machine-years');
    if (yearsInput) yearsInput.value = '';
    
    openModal('modal-machine');
}

function openEditMachineModal(index) {
    const mach = machines[index];
    if (!mach) return;
    
    const title = document.getElementById('modal-machine-title');
    if (title) title.textContent = 'Edit Machine';
    
    const idInput = document.getElementById('modal-machine-id');
    if (idInput) idInput.value = index;
    
    const nameInput = document.getElementById('modal-machine-name');
    if (nameInput) nameInput.value = mach.name;
    
    const condInput = document.getElementById('modal-machine-condition');
    if (condInput) condInput.value = mach.condition;
    
    const yearsInput = document.getElementById('modal-machine-years');
    if (yearsInput) yearsInput.value = mach.yearsOfUse;
    
    openModal('modal-machine');
}

async function saveMachineModal(e) {
    e.preventDefault();
    
    const idInput = document.getElementById('modal-machine-id');
    const nameInput = document.getElementById('modal-machine-name');
    const condInput = document.getElementById('modal-machine-condition');
    const yearsInput = document.getElementById('modal-machine-years');
    
    const indexStr = idInput ? idInput.value : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const condition = condInput ? condInput.value : 'Good';
    const yearsOfUse = yearsInput ? parseInt(yearsInput.value) || 0 : 0;
    
    if (!name) {
        showToast('Machine name is required.', 'error');
        return;
    }
    
    const newMach = {
        id: indexStr !== '' ? machines[parseInt(indexStr)].id : 'mach-' + Date.now(),
        name,
        condition,
        yearsOfUse
    };
    
    let updatedMachines = [...machines];
    if (indexStr !== '') {
        updatedMachines[parseInt(indexStr)] = newMach;
    } else {
        updatedMachines.push(newMach);
    }
    
    if (typeof window.dbSaveMachines !== 'undefined' && window.supabaseClient) {
        try {
            await window.dbSaveMachines(updatedMachines);
            await window.syncFromSupabase();
        } catch (err) {
            console.error("Error saving machine:", err);
            showToast("Failed to save machine to database.", "error");
            return;
        }
    } else {
        machines = updatedMachines;
    }
    
    showToast(indexStr !== '' ? 'Machine updated successfully.' : 'Machine added successfully.');
    closeModal('modal-machine');
    renderMachinesTable();
}

async function deleteMachine(index) {
    const mach = machines[index];
    if (!mach) return;
    
    if (confirm(`Are you sure you want to permanently delete machine "${mach.name}"?`)) {
        let updatedMachines = machines.filter((_, i) => i !== index);
        
        if (typeof window.dbSaveMachines !== 'undefined' && window.supabaseClient) {
            try {
                await window.dbSaveMachines(updatedMachines);
                await window.syncFromSupabase();
            } catch (err) {
                console.error("Error deleting machine:", err);
                showToast("Failed to delete machine from database.", "error");
                return;
            }
        } else {
            machines = updatedMachines;
        }
        
        showToast(`Machine "${mach.name}" deleted.`);
        renderMachinesTable();
    }
}

// ==========================================
// 7. PERFORMANCE REPORTS ENGINE
// ==========================================

function getFilteredReports() {
    const fromVal = document.getElementById('report-filter-from').value;
    const toVal = document.getElementById('report-filter-to').value;
    const empVal = document.getElementById('report-filter-employee').value;
    const custVal = document.getElementById('report-filter-customer').value;
    const shiftVal = document.getElementById('report-filter-shift').value;
    const statusVal = document.getElementById('report-filter-status').value;
    const partQuery = document.getElementById('report-filter-part').value.toLowerCase().trim();
    
    return historicalEntries.filter(e => {
        if (fromVal && e.date < fromVal) return false;
        if (toVal && e.date > toVal) return false;
        
        if (empVal !== 'All' && e.employee !== empVal) return false;
        if (custVal !== 'All' && e.customer !== custVal) return false;
        
        if (shiftVal !== 'All') {
            const isA = e.shift && (e.shift.includes('Day Shift') || e.shift === 'Shift A');
            const isB = e.shift && (e.shift.includes('Night Shift') || e.shift === 'Shift B');
            if (shiftVal === 'A' && !isA) return false;
            if (shiftVal === 'B' && !isB) return false;
        }
        
        if (statusVal !== 'All') {
            if (statusVal === 'pending') {
                if (e.status !== 'pending' && e.status !== 'in-progress') return false;
            } else {
                if (e.status !== statusVal) return false;
            }
        }
        
        if (partQuery && !e.part.toLowerCase().includes(partQuery)) return false;
        
        return true;
    });
}

function renderReportsPreview() {
    const tbody = document.getElementById('report-preview-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const filtered = getFilteredReports();
    
    const totalQty = filtered.reduce((sum, e) => sum + e.qty, 0);
    document.getElementById('report-preview-summary-stats').textContent = 
        `${filtered.length} entries • ${totalQty} qty`;
        
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table-state">No matching reports to preview. Adjust filters above.</td>
            </tr>
        `;
        return;
    }
    
    filtered.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${e.date}</td>
            <td><strong>${e.hour}</strong></td>
            <td><code>${e.employee || 'EMP001'}</code></td>
            <td>${e.customer}</td>
            <td><code>${e.part}</code></td>
            <td><strong>${e.qty}</strong></td>
            <td><span class="status-badge ${e.status}">${e.status.replace('-', ' ')}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function hookReportFilters() {
    const filterIds = [
        'report-filter-from',
        'report-filter-to',
        'report-filter-employee',
        'report-filter-customer',
        'report-filter-shift',
        'report-filter-status'
    ];
    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderReportsPreview);
    });
    
    const partFilter = document.getElementById('report-filter-part');
    if (partFilter) partFilter.addEventListener('input', renderReportsPreview);
}

// ==========================================
// 8. EXPORT CHANNELS (CSV / EXCEL / PDF)
// ==========================================

function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportReport(format) {
    const filtered = getFilteredReports();
    const today = new Date().toISOString().split('T')[0];
    
    if (format === 'csv') {
        let csv = 'Date,Hour,Employee,Customer,Part #,Component,Process,Qty,Status,Machine,File\n';
        filtered.forEach(e => {
            csv += `"${e.date}","${e.hour}","${e.employee || 'EMP001'}","${e.customer}","${e.part}","${e.component}","${e.process}","${e.qty}","${e.status}","${e.machine}","${e.file}"\n`;
        });
        downloadCSV(csv, `gruvfix_report_${today}.csv`);
        showToast('Report exported successfully as CSV.');
    } else if (format === 'excel') {
        if (typeof XLSX === 'undefined') {
            showToast('Excel engine not loaded. Exporting CSV instead.', 'error');
            exportReport('csv');
            return;
        }
        if (filtered.length === 0) {
            showToast('No matching reports to export. Adjust filters above.', 'error');
            return;
        }
        exportReportWorkbook(filtered, today);
        showToast('Report + dashboard exported as Excel workbook.');
    } else if (format === 'pdf') {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        
        let tableRows = '';
        filtered.forEach(e => {
            tableRows += `
                <tr>
                    <td>${e.date}</td>
                    <td>${e.hour}</td>
                    <td>${e.employee || 'EMP001'}</td>
                    <td>${e.customer}</td>
                    <td>${e.part}</td>
                    <td>${e.component}</td>
                    <td>${e.qty}</td>
                    <td><span class="status-badge ${e.status}">${e.status}</span></td>
                </tr>
            `;
        });
        
        const fromDate = document.getElementById('report-filter-from').value || 'All';
        const toDate = document.getElementById('report-filter-to').value || 'All';
        const emp = document.getElementById('report-filter-employee').value;
        const cust = document.getElementById('report-filter-customer').value;
        const shift = document.getElementById('report-filter-shift').value;
        const status = document.getElementById('report-filter-status').value;
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Gruvfix Production Report</title>
                <style>
                    body { font-family: 'Inter', sans-serif; color: #1f2937; padding: 40px; margin: 0; }
                    .header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #154726; padding-bottom: 20px; margin-bottom: 24px; }
                    .brand-title { color: #154726; margin: 0; font-size: 24px; font-weight: 800; }
                    .brand-sub { font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
                    .report-meta { margin-bottom: 24px; font-size: 13px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; }
                    .meta-item { margin-bottom: 5px; }
                    .meta-label { font-weight: 700; color: #4b5563; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 13px; }
                    th { background-color: #f3f4f6; font-weight: 700; color: #374151; }
                    tr:nth-child(even) { background-color: #f9fafb; }
                    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
                    .status-badge.completed { background-color: #ecfdf5; color: #047857; }
                    .status-badge.pending { background-color: #fffbeb; color: #b45309; }
                    .status-badge.rework { background-color: #fef2f2; color: #b91c1c; }
                    .status-badge.hold { background-color: #eff6ff; color: #1d4ed8; }
                    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
                </style>
            </head>
            <body>
                <div class="header-row">
                    <div>
                        <h1 class="brand-title">GRUVFIX GASKETS & SEALS LLP</h1>
                        <div class="brand-sub">Production Performance Report</div>
                    </div>
                    <img src="Logo.png" alt="Gruvfix Logo" style="height: 50px; border-radius: 4px;" />
                </div>
                
                <div class="report-meta">
                    <div class="meta-item"><span class="meta-label">Date Range:</span> ${fromDate} to ${toDate}</div>
                    <div class="meta-item"><span class="meta-label">Employee:</span> ${emp}</div>
                    <div class="meta-item"><span class="meta-label">Customer:</span> ${cust}</div>
                    <div class="meta-item"><span class="meta-label">Shift:</span> ${shift}</div>
                    <div class="meta-item"><span class="meta-label">Status Filter:</span> ${status}</div>
                    <div class="meta-item"><span class="meta-label">Generated:</span> ${new Date().toLocaleString()}</div>
                </div>
                
                <h3>Performance Log (${filtered.length} entries)</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Hour</th>
                            <th>Employee</th>
                            <th>Customer</th>
                            <th>Part #</th>
                            <th>Component</th>
                            <th>Qty</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="8" style="text-align:center;">No records match the selected filters.</td></tr>'}
                    </tbody>
                </table>
                
                <div class="footer">
                    © 2026 Gruvfix Gaskets and Seals LLP. Confidential document.
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        showToast('PDF print layout opened in new window.');
    }
}

// ==========================================
// 8b. EXCEL WORKBOOK + DASHBOARD BUILDER
// ==========================================

// One "man-hour" = one distinct (employee + date + hour-slot) combination,
// regardless of how many part rows were logged inside that slot.
function _slotKey(e) {
    return `${e.employee || 'EMP001'}|${e.date}|${e.hour}`;
}

function _employeeName(empid) {
    const list = (typeof users !== 'undefined' && Array.isArray(users)) ? users : [];
    const match = list.find(u => u.empid === empid);
    return (match && match.name) ? match.name : (empid || 'EMP001');
}

function _shiftLabel(shift) {
    if (!shift) return '—';
    if (shift.includes('Night') || shift === 'Shift B') return 'Night (B)';
    if (shift.includes('Day') || shift === 'Shift A') return 'Day (A)';
    return shift;
}

function _round1(n) {
    return Math.round(n * 10) / 10;
}

// Slots available in a single full shift (see populateHourSlots in employee.js)
const SHIFT_SLOT_COUNT = 12;

function exportReportWorkbook(filtered, today) {
    const wb = XLSX.utils.book_new();

    // ---- Filter context (for the Summary sheet) ----
    const f = id => {
        const el = document.getElementById(id);
        return el && el.value ? el.value : 'All';
    };
    const totalHours = new Set(filtered.map(_slotKey)).size;
    const totalQty = filtered.reduce((s, e) => s + (Number(e.qty) || 0), 0);
    const uniqueCustomers = new Set(filtered.map(e => e.customer)).size;
    const uniqueEmployees = new Set(filtered.map(e => e.employee || 'EMP001')).size;

    // ---- Sheet 1: Summary ----
    const summaryRows = [
        ['Gruvfix Production Report'],
        ['Generated', new Date().toLocaleString()],
        [],
        ['Filters applied'],
        ['From date', f('report-filter-from')],
        ['To date', f('report-filter-to')],
        ['Employee', f('report-filter-employee')],
        ['Customer', f('report-filter-customer')],
        ['Shift', f('report-filter-shift')],
        ['Status', f('report-filter-status')],
        ['Part #', f('report-filter-part')],
        [],
        ['Totals'],
        ['Detail rows', filtered.length],
        ['Hours worked (distinct hour-slots)', totalHours],
        ['Quantity produced', totalQty],
        ['Customers touched', uniqueCustomers],
        ['Employees active', uniqueEmployees]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 34 }, { wch: 26 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // ---- Sheet 2: Work Log (raw hourly detail) ----
    const logHeader = ['Date', 'Hour', 'Employee ID', 'Employee', 'Customer', 'Part #',
        'Component', 'Process', 'Qty', 'Status', 'Machine', 'Shift', 'File'];
    const logRows = filtered.map(e => [
        e.date, e.hour, e.employee || 'EMP001', _employeeName(e.employee || 'EMP001'),
        e.customer, e.part, e.component, e.process, Number(e.qty) || 0,
        e.status, e.machine, _shiftLabel(e.shift), e.file
    ]);
    const wsLog = XLSX.utils.aoa_to_sheet([logHeader, ...logRows]);
    wsLog['!cols'] = [10, 14, 12, 20, 20, 14, 16, 14, 8, 12, 12, 12, 18].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsLog, 'Work Log');

    // ---- Sheet 3: Hours by Customer ----
    const byCustomer = {};
    filtered.forEach(e => {
        const key = e.customer || '—';
        if (!byCustomer[key]) byCustomer[key] = { slots: new Set(), qty: 0, entries: 0 };
        byCustomer[key].slots.add(_slotKey(e));
        byCustomer[key].qty += Number(e.qty) || 0;
        byCustomer[key].entries += 1;
    });
    const custHeader = ['Customer', 'Hours Worked', 'Entries', 'Qty Produced', '% of Hours'];
    const custRows = Object.keys(byCustomer)
        .map(name => {
            const c = byCustomer[name];
            const hrs = c.slots.size;
            return [name, hrs, c.entries, c.qty, totalHours ? _round1((hrs / totalHours) * 100) : 0];
        })
        .sort((a, b) => b[1] - a[1]);
    const custTotal = ['TOTAL', totalHours,
        custRows.reduce((s, r) => s + r[2], 0),
        custRows.reduce((s, r) => s + r[3], 0),
        custRows.length ? 100 : 0];
    const custNote = ['Note: an hour-slot split across two customers counts as an hour for each, so column may exceed TOTAL.'];
    const wsCust = XLSX.utils.aoa_to_sheet([custHeader, ...custRows, [], custTotal, [], custNote]);
    wsCust['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsCust, 'Hours by Customer');

    // ---- Sheet 4: Hours by Employee (Daily) ----
    const byEmpDay = {};
    filtered.forEach(e => {
        const empid = e.employee || 'EMP001';
        const key = `${empid}|${e.date}`;
        if (!byEmpDay[key]) {
            byEmpDay[key] = { empid, date: e.date, shift: e.shift, hours: new Set(), qty: 0, entries: 0 };
        }
        byEmpDay[key].hours.add(e.hour);
        byEmpDay[key].qty += Number(e.qty) || 0;
        byEmpDay[key].entries += 1;
    });
    const empHeader = ['Employee ID', 'Employee', 'Date', 'Shift', 'Hours Logged',
        'Shift Hours', 'Coverage %', 'Missing Hours', 'Qty Produced', 'Entries'];
    const empRows = Object.values(byEmpDay)
        .map(d => {
            const hrs = d.hours.size;
            return [
                d.empid, _employeeName(d.empid), d.date, _shiftLabel(d.shift), hrs,
                SHIFT_SLOT_COUNT, _round1((hrs / SHIFT_SLOT_COUNT) * 100),
                Math.max(0, SHIFT_SLOT_COUNT - hrs), d.qty, d.entries
            ];
        })
        .sort((a, b) => (a[1] + a[2]).localeCompare(b[1] + b[2]));
    const empHoursTotal = empRows.reduce((s, r) => s + r[4], 0);
    const empTotal = ['TOTAL', '', '', '', empHoursTotal, '',
        empRows.length ? _round1((empHoursTotal / (empRows.length * SHIFT_SLOT_COUNT)) * 100) : 0,
        empRows.reduce((s, r) => s + r[7], 0),
        empRows.reduce((s, r) => s + r[8], 0),
        empRows.reduce((s, r) => s + r[9], 0)];
    const wsEmp = XLSX.utils.aoa_to_sheet([empHeader, ...empRows, [], empTotal]);
    wsEmp['!cols'] = [12, 20, 12, 10, 13, 11, 11, 13, 13, 9].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsEmp, 'Hours by Employee');

    XLSX.writeFile(wb, `gruvfix_report_${today}.xlsx`);
}

function populateFilterDropdowns() {
    const selectors = [
        { admin: 'admin-filter-employee', report: 'report-filter-employee', data: users.filter(u => u.role === 'employee'), key: 'empid', label: 'name' },
        { admin: 'admin-filter-customer', report: 'report-filter-customer', data: customers, key: 'name', label: 'name' }
    ];

    selectors.forEach(sel => {
        const adminEl = document.getElementById(sel.admin);
        const reportEl = document.getElementById(sel.report);
        
        if (adminEl) adminEl.innerHTML = '<option value="All">All</option>';
        if (reportEl) reportEl.innerHTML = '<option value="All">All</option>';
        
        sel.data.forEach(item => {
            const val = item[sel.key];
            const text = sel.label && item[sel.label] ? `${item[sel.label]} (${val})` : val;
            
            if (adminEl) {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = text;
                adminEl.appendChild(opt);
            }
            if (reportEl) {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = text;
                reportEl.appendChild(opt);
            }
        });
    });
}


// ==========================================
// 8. HOMEPAGE CONFIGURATION MANAGER (ADMIN)
// ==========================================

function renderHomepageConfig() {
    // 1. Render Schedule
    const schedContainer = document.getElementById('admin-schedule-list');
    if (schedContainer) {
        schedContainer.innerHTML = '';
        const sched = (typeof todaySchedule !== 'undefined' ? todaySchedule : []);
        if (sched.length === 0) {
            schedContainer.innerHTML = '<p style="font-size: 13px; color: var(--text-medium); text-align: center; margin: 20px 0;">No schedule events defined.</p>';
        } else {
            sched.forEach((item, index) => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.padding = '8px 12px';
                row.style.background = '#ffffff';
                row.style.border = '1px solid #e2e8f0';
                row.style.borderRadius = '6px';
                row.style.marginBottom = '6px';
                
                row.innerHTML = `
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <span style="font-weight: 700; color: var(--primary-color); font-size: 13px;">${item.time}</span>
                        <span style="font-size: 13px; color: var(--text-dark); font-weight: 600;">${item.text}</span>
                    </div>
                    <button type="button" class="btn-reset" onclick="deleteScheduleEvent(${index})" style="padding: 4px 8px; font-size: 11px; margin: 0; color: #ef4444; border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); cursor: pointer;">Remove</button>
                `;
                schedContainer.appendChild(row);
            });
        }
    }

    // 2. Render Announcements
    const annContainer = document.getElementById('admin-announcements-list');
    if (annContainer) {
        annContainer.innerHTML = '';
        const annList = (typeof announcements !== 'undefined' ? announcements : []);
        if (annList.length === 0) {
            annContainer.innerHTML = '<p style="font-size: 13px; color: var(--text-medium); text-align: center; margin: 20px 0;">No announcements posted.</p>';
        } else {
            annList.forEach((ann, index) => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.padding = '10px 12px';
                row.style.background = '#ffffff';
                row.style.border = '1px solid #e2e8f0';
                row.style.borderRadius = '6px';
                row.style.marginBottom = '6px';

                let badgeColor = 'rgba(16, 185, 129, 0.15)';
                let badgeText = ann.type.toUpperCase();
                
                row.innerHTML = `
                    <div style="flex-grow: 1; margin-right: 12px;">
                        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                            <span style="background: ${badgeColor}; color: #059669; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">${badgeText}</span>
                            <span style="font-size: 10px; color: var(--text-medium);">${ann.date}</span>
                        </div>
                        <p style="font-size: 12.5px; color: var(--text-dark); margin: 0; font-weight: 600; text-align: left;">${ann.text}</p>
                    </div>
                    <button type="button" class="btn-reset" onclick="deleteAnnouncementEvent(${index})" style="padding: 4px 8px; font-size: 11px; margin: 0; color: #ef4444; border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); flex-shrink: 0; cursor: pointer;">Remove</button>
                `;
                annContainer.appendChild(row);
            });
        }
    }

    // Prefill date input with today's date (formatted e.g. May 26, 2025)
    const dateInput = document.getElementById('ann-input-date');
    if (dateInput && !dateInput.value) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const today = new Date();
        dateInput.value = `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    }
}

async function addScheduleEvent(e) {
    if (e) e.preventDefault();
    const timeVal = document.getElementById('sched-input-time').value.trim();
    const textVal = document.getElementById('sched-input-text').value.trim();
    
    if (!timeVal || !textVal) return;
    
    const sched = [...todaySchedule];
    sched.push({ time: timeVal, text: textVal });
    // Sort schedule by time
    sched.sort((a, b) => a.time.localeCompare(b.time));
    
    todaySchedule = sched;
    
    try {
        await dbSaveSystemSettings(todaySchedule, announcements);
        showToast("Schedule event added successfully!", "success");
        document.getElementById('sched-input-time').value = '';
        document.getElementById('sched-input-text').value = '';
        renderHomepageConfig();
        if (typeof updateHomepageMetrics === 'function') updateHomepageMetrics();
    } catch (err) {
        console.error("Error saving schedule:", err);
        showToast("Failed to save schedule to database.", "error");
    }
}

async function deleteScheduleEvent(index) {
    const sched = [...todaySchedule];
    sched.splice(index, 1);
    todaySchedule = sched;
    
    try {
        await dbSaveSystemSettings(todaySchedule, announcements);
        showToast("Schedule event removed.", "success");
        renderHomepageConfig();
        if (typeof updateHomepageMetrics === 'function') updateHomepageMetrics();
    } catch (err) {
        console.error("Error deleting schedule event:", err);
        showToast("Failed to update database.", "error");
    }
}

async function addAnnouncementEvent(e) {
    if (e) e.preventDefault();
    const dateVal = document.getElementById('ann-input-date').value.trim();
    const typeVal = document.getElementById('ann-input-type').value;
    const textVal = document.getElementById('ann-input-text').value.trim();
    
    if (!dateVal || !textVal) return;
    
    const list = [...announcements];
    list.unshift({
        id: 'ann-' + Date.now(),
        date: dateVal,
        type: typeVal,
        text: textVal
    });
    
    announcements = list;
    
    try {
        await dbSaveSystemSettings(todaySchedule, announcements);
        showToast("Announcement posted successfully!", "success");
        document.getElementById('ann-input-text').value = '';
        renderHomepageConfig();
        if (typeof updateHomepageMetrics === 'function') updateHomepageMetrics();
    } catch (err) {
        console.error("Error posting announcement:", err);
        showToast("Failed to save announcement to database.", "error");
    }
}

async function deleteAnnouncementEvent(index) {
    const list = [...announcements];
    list.splice(index, 1);
    announcements = list;
    
    try {
        await dbSaveSystemSettings(todaySchedule, announcements);
        showToast("Announcement removed.", "success");
        renderHomepageConfig();
        if (typeof updateHomepageMetrics === 'function') updateHomepageMetrics();
    } catch (err) {
        console.error("Error deleting announcement:", err);
        showToast("Failed to update database.", "error");
    }
}

window.renderHomepageConfig = renderHomepageConfig;
window.addScheduleEvent = addScheduleEvent;
window.deleteScheduleEvent = deleteScheduleEvent;
window.addAnnouncementEvent = addAnnouncementEvent;
window.deleteAnnouncementEvent = deleteAnnouncementEvent;

// Helper variables & controllers for customer creation within part modal
window.tempPartModalState = null;

function openAddCustomerModalFromPartModal(event) {
    if (event) event.stopPropagation();
    
    window.tempPartModalState = {
        partNo: document.getElementById('modal-part-no').value,
        comp: document.getElementById('modal-part-comp').value,
        material: document.getElementById('modal-part-material').value,
        thickness: document.getElementById('modal-part-thickness').value,
        process: document.getElementById('modal-part-process').value,
        index: document.getElementById('modal-part-index').value,
        file: selectedPartFile,
        fileLabel: document.getElementById('modal-part-file-name').textContent
    };

    closeModal('modal-part');
    openAddCustomerModal();
}

function cancelCustomerModal() {
    closeModal('modal-customer');
    if (window.tempPartModalState) {
        openAddPartModal();
        // Restore input values
        document.getElementById('modal-part-no').value = window.tempPartModalState.partNo;
        document.getElementById('modal-part-comp').value = window.tempPartModalState.comp;
        document.getElementById('modal-part-material').value = window.tempPartModalState.material;
        document.getElementById('modal-part-thickness').value = window.tempPartModalState.thickness;
        setPartProcessSelect(window.tempPartModalState.process);
        document.getElementById('modal-part-index').value = window.tempPartModalState.index;
        selectedPartFile = window.tempPartModalState.file;
        document.getElementById('modal-part-file-name').textContent = window.tempPartModalState.fileLabel;

        window.tempPartModalState = null;
    }
}

// Export functions for ESM imports
export {
    renderHomepageConfig, addScheduleEvent, deleteScheduleEvent, addAnnouncementEvent, deleteAnnouncementEvent,
    switchAdminTab, updateAdminDashboard, renderTrendChart, renderShiftChart,
    getFilteredAdminEntries, renderAdminEntriesTable, filterAdminEntries, resetAdminFilters,
    deleteAdminEntry, updateEntryStatus, renderUsersTable, openAddUserModal,
    openEditUserModal, toggleUserModalFields, saveUserModal, toggleUserActiveStatus, deleteUser,
    toggleUserSort, changeUserPage,
    renderCustomersTable, openAddCustomerModal, openEditCustomerModal, saveCustomerModal, deleteCustomer,
    toggleCustomerSort, changeCustomerPage,
    renderPartsTable, openAddPartModal, openEditPartModal, savePartModal, deletePart,
    getFilteredReports, renderReportsPreview, hookReportFilters, downloadCSV, exportReport,
    populateFilterDropdowns,
    renderMachinesTable, openAddMachineModal, openEditMachineModal, saveMachineModal, deleteMachine,
    openAddCustomerModalFromPartModal, cancelCustomerModal
};

// Bind functions to window for backward compatibility
window.switchAdminTab = switchAdminTab;
window.updateAdminDashboard = updateAdminDashboard;
window.renderTrendChart = renderTrendChart;
window.renderShiftChart = renderShiftChart;
window.getFilteredAdminEntries = getFilteredAdminEntries;
window.renderAdminEntriesTable = renderAdminEntriesTable;
window.filterAdminEntries = filterAdminEntries;
window.resetAdminFilters = resetAdminFilters;
window.deleteAdminEntry = deleteAdminEntry;
window.updateEntryStatus = updateEntryStatus;
window.renderUsersTable = renderUsersTable;
window.openAddUserModal = openAddUserModal;
window.openEditUserModal = openEditUserModal;
window.toggleUserModalFields = toggleUserModalFields;
window.saveUserModal = window.saveUserModal || saveUserModal; // Safe check
window.toggleUserActiveStatus = toggleUserActiveStatus;
window.deleteUser = deleteUser;
window.toggleUserSort = toggleUserSort;
window.changeUserPage = changeUserPage;
window.renderCustomersTable = renderCustomersTable;
window.openAddCustomerModal = openAddCustomerModal;
window.openEditCustomerModal = openEditCustomerModal;
window.saveCustomerModal = saveCustomerModal;
window.deleteCustomer = deleteCustomer;
window.toggleCustomerSort = toggleCustomerSort;
window.changeCustomerPage = changeCustomerPage;
window.renderPartsTable = renderPartsTable;
window.openAddPartModal = openAddPartModal;
window.openEditPartModal = openEditPartModal;
window.savePartModal = savePartModal;
window.deletePart = deletePart;
window.handlePartFileSelected = handlePartFileSelected;
window.downloadPartsTemplate = downloadPartsTemplate;
window.handlePartsImportFile = handlePartsImportFile;
window.getFilteredReports = getFilteredReports;
window.renderReportsPreview = renderReportsPreview;
window.hookReportFilters = hookReportFilters;
window.downloadCSV = downloadCSV;
window.exportReport = exportReport;
window.populateFilterDropdowns = populateFilterDropdowns;
window.renderMachinesTable = renderMachinesTable;
window.openAddMachineModal = openAddMachineModal;
window.openEditMachineModal = openEditMachineModal;
window.saveMachineModal = saveMachineModal;
window.deleteMachine = deleteMachine;
window.openAddCustomerModalFromPartModal = openAddCustomerModalFromPartModal;
window.cancelCustomerModal = cancelCustomerModal;



