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
            'tool-requests': 'Tool Requests Control',
            'reports': 'Performance Reports'
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
    } else if (tabId === 'tool-requests') {
        renderAdminToolRequestsTable();
    } else if (tabId === 'reports') {
        populateFilterDropdowns();
        renderReportsPreview();
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
        if (entry.file !== '—') {
            fileLinkHtml = `
                <a href="#" class="table-file-link" onclick="event.preventDefault(); alert('Opening attached file: ${entry.file}');" title="${entry.file}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px;">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                    ${entry.file.substring(0, 10)}${entry.file.length > 10 ? '...' : ''}
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
        if (typeof dbDeleteLog !== 'undefined' && supabaseClient) {
            try {
                await dbDeleteLog(id);
                await syncFromSupabase();
                todayEntries = todayEntries.filter(e => e.id !== id);
            } catch (err) {
                console.error("Error deleting entry:", err);
                showToast("Failed to delete entry from database.", "error");
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
        
        if (typeof dbSaveLog !== 'undefined' && supabaseClient) {
            try {
                await dbSaveLog(updatedEntry);
                await syncFromSupabase();
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

function renderUsersTable() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    users.forEach((user, i) => {
        const tr = document.createElement('tr');
        
        const statusBadge = user.active 
            ? `<span class="status-badge completed" style="cursor: pointer;" onclick="toggleUserActiveStatus(${i})">Active</span>` 
            : `<span class="status-badge rework" style="cursor: pointer;" onclick="toggleUserActiveStatus(${i})">Inactive</span>`;
            
        const editIcon = `
            <button type="button" class="btn-edit-entry" onclick="openEditUserModal(${i})" title="Edit user" style="background: none; border: none; padding: 6px; cursor: pointer; color: #4b5563; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        `;
        const deleteIcon = `
            <button type="button" class="btn-delete-entry" onclick="deleteUser(${i})" title="Delete user" style="background: none; border: none; padding: 6px; cursor: pointer; color: #b91c1c; transition: color 0.15s;">
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
    
    const newUserObj = {
        empid: role === 'admin' ? '' : empid,
        name: email.split('@')[0],
        email,
        password,
        role,
        active
    };
    
    if (index === -1) {
        if (!password) {
            showToast('Password is required for new users.', 'error');
            return;
        }
        if (typeof dbSaveUser !== 'undefined' && supabaseClient) {
            try {
                await dbSaveUser(newUserObj);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error creating user:", err);
                showToast("Failed to create user in database.", "error");
                return;
            }
        } else {
            users.push(newUserObj);
        }
        showToast('User created successfully.');
    } else {
        const user = users[index];
        const oldEmpId = user.empid;
        
        const updatedUserObj = {
            empid: role === 'admin' ? '' : empid,
            name: email.split('@')[0],
            email,
            password: password || user.password,
            role,
            active
        };
        
        if (typeof dbSaveUser !== 'undefined' && supabaseClient) {
            try {
                if (oldEmpId !== updatedUserObj.empid) {
                    await dbDeleteUser(oldEmpId);
                }
                await dbSaveUser(updatedUserObj);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error updating user:", err);
                showToast("Failed to update user in database.", "error");
                return;
            }
        } else {
            user.role = role;
            user.empid = role === 'admin' ? '' : empid;
            user.email = email;
            user.active = active;
            if (password) user.password = password;
            
            if (role === 'employee') {
                cascadeEmployeeUpdate(oldEmpId, empid);
            }
        }
        showToast('User updated successfully.');
    }
    
    closeModal('modal-user');
    renderUsersTable();
    populateFilterDropdowns();
    updateAdminDashboard();
}

async function toggleUserActiveStatus(index) {
    const user = users[index];
    if (user.email === 'admin@gruvfix.com') {
        showToast('Cannot deactivate the main administrator.', 'error');
        return;
    }
    const updatedUser = {
        ...user,
        active: !user.active
    };
    if (typeof dbSaveUser !== 'undefined' && supabaseClient) {
        try {
            await dbSaveUser(updatedUser);
            await syncFromSupabase();
        } catch (err) {
            console.error("Error toggling user status:", err);
            showToast("Failed to toggle user status in database.", "error");
            return;
        }
    } else {
        user.active = !user.active;
    }
    renderUsersTable();
    updateAdminDashboard();
    showToast(`User ${user.empid || user.email} active status toggled.`);
}

async function deleteUser(index) {
    const user = users[index];
    if (user.email === 'admin@gruvfix.com') {
        showToast('Cannot delete the main administrator.', 'error');
        return;
    }
    if (confirm(`Are you sure you want to delete user ${user.empid || user.email}?`)) {
        if (typeof dbDeleteUser !== 'undefined' && supabaseClient) {
            try {
                await dbDeleteUser(user.empid);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error deleting user:", err);
                showToast("Failed to delete user from database.", "error");
                return;
            }
        } else {
            users.splice(index, 1);
        }
        renderUsersTable();
        populateFilterDropdowns();
        updateAdminDashboard();
        showToast('User deleted successfully.');
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
        tbody.innerHTML = `<tr><td colspan="4" class="empty-table-state">No customers found.</td></tr>`;
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
            <td style="text-align: right; width: 100px;">
                ${editIcon}
                ${deleteIcon}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddCustomerModal() {
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
    const index = parseInt(document.getElementById('modal-customer-index').value);
    const name = document.getElementById('modal-customer-name').value.trim();
    const contact = document.getElementById('modal-customer-contact').value.trim();
    const gst = document.getElementById('modal-customer-gst').value.trim();
    const code = document.getElementById('modal-customer-code').value.trim();
    const notes = document.getElementById('modal-customer-notes').value.trim();
    
    // Validation
    if (!name) {
        showToast("Customer name is required.", "error");
        return;
    }
    if (code && !/^[A-Za-z0-9-]+$/.test(code)) {
        showToast("Customer code must be alphanumeric.", "error");
        return;
    }
    if (gst && !/^[A-Za-z0-9]{15}$/.test(gst)) {
        showToast("GST number must be 15 alphanumeric characters.", "error");
        return;
    }
    
    const newCustObj = { name, code, notes, contact, gst };
    
    // Backup state for Optimistic UI Rollback
    const backupCustomers = JSON.parse(JSON.stringify(customers));
    const backupParts = JSON.parse(JSON.stringify(parts));
    
    // Apply local state updates optimistically
    if (index === -1) {
        customers.push(newCustObj);
        showToast('Customer added successfully.');
    } else {
        const oldName = customers[index].name;
        customers[index] = newCustObj;
        cascadeCustomerUpdate(oldName, name);
        showToast('Customer updated successfully.');
    }
    
    // Render immediately
    closeModal('modal-customer');
    renderCustomersTable();
    populateFilterDropdowns();
    updateAdminDashboard();
    
    // Perform background DB sync
    if (typeof dbSaveCustomer !== 'undefined' && supabaseClient) {
        try {
            if (index !== -1) {
                const oldName = backupCustomers[index].name;
                if (oldName !== name) {
                    await dbDeleteCustomer(oldName);
                }
            }
            await dbSaveCustomer(newCustObj);
            await syncFromSupabase();
        } catch (err) {
            console.error("Error saving customer:", err);
            // Rollback local state
            customers = backupCustomers;
            parts = backupParts;
            renderCustomersTable();
            populateFilterDropdowns();
            updateAdminDashboard();
            showToast("Failed to save changes. Rolled back.", "error");
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
        parts = parts.filter(p => p.customer !== name);
        customers.splice(index, 1);
        
        // Render immediately
        renderCustomersTable();
        renderPartsTable();
        populateFilterDropdowns();
        updateAdminDashboard();
        showToast(`Customer "${name}" removed.`);
        
        // Perform background DB sync
        if (typeof dbDeleteCustomer !== 'undefined' && supabaseClient) {
            try {
                await dbDeleteCustomer(name);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error deleting customer:", err);
                // Rollback local state
                customers = backupCustomers;
                parts = backupParts;
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

function renderPartsTable() {
    const tbody = document.getElementById('admin-parts-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const query = document.getElementById('admin-search-parts').value.toLowerCase().trim();
    const filtered = parts.filter(p => p.partNo.toLowerCase().includes(query) || p.component.toLowerCase().includes(query) || p.customer.toLowerCase().includes(query));
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-table-state">No parts found.</td></tr>`;
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
        
        tr.innerHTML = `
            <td><code>${part.partNo}</code></td>
            <td><strong>${part.component}</strong></td>
            <td>${part.customer}</td>
            <td>${part.process || '—'}</td>
            <td style="text-align: right; width: 100px;">
                ${editIcon}
                ${deleteIcon}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddPartModal() {
    document.getElementById('modal-part-title').textContent = 'Add New Part';
    document.getElementById('modal-part-index').value = '-1';
    document.getElementById('modal-part-no').value = '';
    document.getElementById('modal-part-comp').value = '';
    document.getElementById('modal-part-process').value = '';
    
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
    const part = parts[index];
    document.getElementById('modal-part-title').textContent = 'Edit Part';
    document.getElementById('modal-part-index').value = index;
    document.getElementById('modal-part-no').value = part.partNo;
    document.getElementById('modal-part-comp').value = part.component;
    document.getElementById('modal-part-process').value = part.process || '';
    
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
    const index = parseInt(document.getElementById('modal-part-index').value);
    const partNo = document.getElementById('modal-part-no').value.trim();
    const component = document.getElementById('modal-part-comp').value.trim();
    const customer = document.getElementById('modal-part-customer').value;
    const process = document.getElementById('modal-part-process').value.trim();
    
    const newPartObj = { partNo, component, customer, process };
    
    if (index === -1) {
        if (typeof dbSavePart !== 'undefined' && supabaseClient) {
            try {
                await dbSavePart(newPartObj);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error creating part:", err);
                showToast("Failed to create part in database.", "error");
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
        
        if (typeof dbSavePart !== 'undefined' && supabaseClient) {
            try {
                if (oldPartNo !== partNo) {
                    await dbDeletePart(oldPartNo);
                }
                await dbSavePart(newPartObj);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error updating part:", err);
                showToast("Failed to update part in database.", "error");
                return;
            }
        } else {
            parts[index].partNo = partNo;
            parts[index].component = component;
            parts[index].customer = customer;
            parts[index].process = process;
            
            cascadePartUpdate(customer, oldPartNo, partNo, component);
        }
        showToast('Part updated successfully.');
    }
    
    closeModal('modal-part');
    renderPartsTable();
    updateAdminDashboard();
}

async function deletePart(index) {
    const part = parts[index];
    if (confirm(`Are you sure you want to delete part "${part.partNo}"?`)) {
        if (typeof dbDeletePart !== 'undefined' && supabaseClient) {
            try {
                await dbDeletePart(part.partNo);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error deleting part:", err);
                showToast("Failed to delete part from database.", "error");
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
    
    if (format === 'csv' || format === 'excel') {
        let csv = 'Date,Hour,Employee,Customer,Part #,Component,Process,Qty,Status,Machine,File\n';
        filtered.forEach(e => {
            csv += `"${e.date}","${e.hour}","${e.employee || 'EMP001'}","${e.customer}","${e.part}","${e.component}","${e.process}","${e.qty}","${e.status}","${e.machine}","${e.file}"\n`;
        });
        downloadCSV(csv, `gruvfix_report_${today}.csv`);
        showToast(`Report exported successfully as ${format.toUpperCase()}.`);
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

// Export functions for ESM imports
export {
    switchAdminTab, updateAdminDashboard, renderTrendChart, renderShiftChart,
    getFilteredAdminEntries, renderAdminEntriesTable, filterAdminEntries, resetAdminFilters,
    deleteAdminEntry, updateEntryStatus, renderUsersTable, openAddUserModal,
    openEditUserModal, toggleUserModalFields, saveUserModal, toggleUserActiveStatus, deleteUser,
    renderCustomersTable, openAddCustomerModal, openEditCustomerModal, saveCustomerModal, deleteCustomer,
    toggleCustomerSort, changeCustomerPage,
    renderPartsTable, openAddPartModal, openEditPartModal, savePartModal, deletePart,
    getFilteredReports, renderReportsPreview, hookReportFilters, downloadCSV, exportReport,
    populateFilterDropdowns
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
window.saveUserModal = saveUserModal;
window.toggleUserActiveStatus = toggleUserActiveStatus;
window.deleteUser = deleteUser;
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
window.getFilteredReports = getFilteredReports;
window.renderReportsPreview = renderReportsPreview;
window.hookReportFilters = hookReportFilters;
window.downloadCSV = downloadCSV;
window.exportReport = exportReport;
window.populateFilterDropdowns = populateFilterDropdowns;



