/**
 * @file employee.js
 * @description Controller for operator actions: logging hours, dynamically adding rows, files, and personal tables.
 * @project GruvfixPortal
 */

// ==========================================
// 1. NAVIGATION & STATISTICS
// ==========================================

function switchDashboardTab(tabId) {
    if (window.location.hash !== `#/operator/${tabId}`) {
        window.location.hash = `#/operator/${tabId}`;
        return;
    }
    
    currentTab = tabId;
    
    // Remove active class from all sidebar menu items and tab views in employee panel
    const menuItems = document.querySelectorAll('#employee-dashboard .sidebar-menu .menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    
    const tabViews = document.querySelectorAll('#employee-dashboard .tab-view');
    tabViews.forEach(view => view.classList.remove('active'));
    
    const targetMenu = document.getElementById(`menu-${tabId}`);
    if (targetMenu) targetMenu.classList.add('active');
    
    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.add('active');
    
    saveLastTab(tabId);
    
    if (tabId === 'new-entry') {
        updateEmployeeStats();
    } else if (tabId === 'my-history') {
        renderHistoryTable();
    } else if (tabId === 'tool-requests') {
        renderEmployeeToolRequests();
    }
}

function updateEmployeeStats() {
    const loggedInUser = window.loggedInUser || (typeof window.getSession === 'function' ? window.getSession() : null);
    if (!loggedInUser) return;
    const todayStr = getTodayDateString();
    const empTodayEntries = historicalEntries.filter(e => {
        if (!e.date || !todayStr) return false;
        return e.date.split('T')[0].trim() === todayStr.split('T')[0].trim() && e.employee === loggedInUser.empid;
    });
    const count = empTodayEntries.length;
    const qty = empTodayEntries.reduce((sum, e) => sum + e.qty, 0);
    
    const countEl = document.getElementById('stat-today-entries');
    if (countEl) countEl.textContent = count;
    
    const qtyEl = document.getElementById('stat-today-qty');
    if (qtyEl) qtyEl.textContent = qty;
}

// ==========================================
// 2. DYNAMIC WORK ENTRY ROW MANAGEMENT
// ==========================================

function addPartRow() {
    const container = document.getElementById('part-rows-container');
    if (!container) return;
    
    const rowId = ++rowIdCounter;
    
    const rowDiv = document.createElement('div');
    rowDiv.className = 'part-row';
    rowDiv.id = `part-row-${rowId}`;

    rowDiv.innerHTML = `
        <div class="col-part">
            <div class="custom-dropdown" id="part-dropdown-${rowId}">
                <button type="button" class="custom-dropdown-trigger" id="part-trigger-${rowId}" onclick="toggleCustomDropdown('part', ${rowId}, event)">
                    <span id="part-label-${rowId}" style="color: var(--text-light);">Select Part #</span>
                    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </button>
                <div class="custom-dropdown-menu" id="part-menu-${rowId}">
                    <div class="custom-dropdown-actions">
                        <button type="button" class="btn-add-new-dropdown" onclick="openAddPartModalFromDropdown(${rowId}, event)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            + Add New Part
                        </button>
                    </div>
                    <div class="custom-dropdown-search-wrapper">
                        <input type="text" class="custom-dropdown-search" id="part-search-${rowId}" placeholder="Search part..." oninput="filterPartDropdown(${rowId}, this.value)" onclick="event.stopPropagation()">
                    </div>
                    <div class="custom-dropdown-options" id="part-options-${rowId}">
                        <!-- Options populated dynamically -->
                    </div>
                </div>
            </div>
        </div>
        <div class="col-comp">
            <div class="custom-dropdown" id="cust-dropdown-${rowId}">
                <button type="button" class="custom-dropdown-trigger" id="cust-trigger-${rowId}" onclick="toggleCustomDropdown('customer', ${rowId}, event)">
                    <span id="cust-label-${rowId}" style="color: var(--text-light);">Select Customer</span>
                    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </button>
                <div class="custom-dropdown-menu" id="cust-menu-${rowId}">
                    <div class="custom-dropdown-actions">
                        <button type="button" class="btn-add-new-dropdown" onclick="openAddCustModalFromDropdown(${rowId}, event)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            + Add New Customer
                        </button>
                    </div>
                    <div class="custom-dropdown-search-wrapper">
                        <input type="text" class="custom-dropdown-search" id="cust-search-${rowId}" placeholder="Search customer..." oninput="filterCustDropdown(${rowId}, this.value)" onclick="event.stopPropagation()">
                    </div>
                    <div class="custom-dropdown-options" id="cust-options-${rowId}">
                        <!-- Options populated dynamically -->
                    </div>
                </div>
            </div>
        </div>
        <div class="col-proc">
            <select id="proc-select-${rowId}" required>
                <option value="Cutting" selected>Cutting</option>
                <option value="Punching">Punching</option>
                <option value="Molding">Molding</option>
                <option value="Curing">Curing</option>
                <option value="Trimming">Trimming</option>
            </select>
        </div>
        <div class="col-qty">
            <input type="number" id="qty-input-${rowId}" value="1" min="1" oninput="handleQtyChange(${rowId})" required>
        </div>
        <div class="col-mach">
            <input type="text" id="mach-input-${rowId}" value="CNC-03" required>
        </div>
        <div class="col-status">
            <select id="status-select-${rowId}" required>
                <option value="completed" selected>Completed</option>
                <option value="pending">Pending</option>
                <option value="rework">Rework</option>
                <option value="hold">Hold</option>
            </select>
        </div>
        <div class="col-remarks">
            <input type="text" id="remarks-input-${rowId}" placeholder="Optional">
        </div>
        <div class="col-attach">
            <button type="button" id="attach-btn-${rowId}" class="btn-attach" onclick="triggerAttachment(${rowId})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                <span id="attach-label-${rowId}">Attach</span>
            </button>
            <input type="file" id="file-input-${rowId}" style="display: none;" onchange="handleFileSelected(${rowId})">
        </div>
        <div class="col-actions">
            <button type="button" class="btn-delete-row" onclick="deletePartRow(${rowId})" title="Remove row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            </button>
        </div>
    `;
    
    container.appendChild(rowDiv);
    
    partRows.push({
        id: rowId,
        customer: '',
        partNo: '',
        component: '',
        qty: 1,
        fileName: '—'
    });
    
    updateSummary();
}

function deletePartRow(rowId) {
    if (partRows.length === 1) {
        showToast('You must have at least one part entry.', 'error');
        return;
    }
    const rowEl = document.getElementById(`part-row-${rowId}`);
    if (rowEl) rowEl.remove();
    partRows = partRows.filter(r => r.id !== rowId);
    updateSummary();
}

function handleQtyChange(rowId) {
    const qtyInput = document.getElementById(`qty-input-${rowId}`);
    if (!qtyInput) return;
    let qty = parseInt(qtyInput.value) || 0;
    if (qty < 1) {
        qty = 1;
        qtyInput.value = 1;
    }
    
    const row = partRows.find(r => r.id === rowId);
    if (row) {
        row.qty = qty;
        updateSummary();
    }
}

function triggerAttachment(rowId) {
    const fileInput = document.getElementById(`file-input-${rowId}`);
    if (fileInput) fileInput.click();
}

function handleFileSelected(rowId) {
    const fileInput = document.getElementById(`file-input-${rowId}`);
    const attachBtn = document.getElementById(`attach-btn-${rowId}`);
    const attachLabel = document.getElementById(`attach-label-${rowId}`);
    
    const row = partRows.find(r => r.id === rowId);
    if (!row || !fileInput) return;
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        row.fileName = file.name;
        
        attachBtn.classList.add('attached');
        attachLabel.textContent = file.name.substring(0, 10) + (file.name.length > 10 ? '...' : '');
        attachBtn.title = file.name;
        showToast(`File "${file.name}" attached.`, 'success');
    } else {
        row.fileName = '—';
        attachBtn.classList.remove('attached');
        attachLabel.textContent = 'Attach';
        attachBtn.title = '';
    }
}

function updateSummary() {
    const totalRows = partRows.length;
    const totalQty = partRows.reduce((acc, row) => acc + row.qty, 0);
    
    const summaryText = document.getElementById('parts-summary-text');
    if (summaryText) summaryText.textContent = `${totalRows} row${totalRows > 1 ? 's' : ''} • ${totalQty} total qty`;
    
    const saveBtn = document.getElementById('btn-save-entries');
    if (saveBtn) {
        saveBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save ${totalRows} entr${totalRows > 1 ? 'ies' : 'y'}
        `;
    }
}

function resetForm() {
    const hourSelect = document.getElementById('entry-hour');
    if (hourSelect) hourSelect.selectedIndex = 0;
    
    const shiftSelect = document.getElementById('entry-shift');
    if (shiftSelect) shiftSelect.selectedIndex = 0;
    
    const container = document.getElementById('part-rows-container');
    if (container) container.innerHTML = '';
    
    partRows = [];
    rowIdCounter = 0;
    
    addPartRow();
}

// ==========================================
// 3. LOG ENTRIES CONTROLLER
// ==========================================

async function saveWorkEntries(e) {
    e.preventDefault();
    const loggedInUser = window.loggedInUser || (typeof window.getSession === 'function' ? window.getSession() : null);
    if (!loggedInUser) {
        showToast('Session expired. Please log in again.', 'error');
        return;
    }
    
    const date = document.getElementById('entry-date').value;
    const shift = document.getElementById('entry-shift').value;
    const hour = document.getElementById('entry-hour').value;
    
    if (!date) { showToast('Please select a valid date.', 'error'); return; }
    if (!hour) { showToast('Please pick an hour slot.', 'error'); return; }
    
    // Validation
    let validationFailed = false;
    partRows.forEach(row => {
        const qtyInput = document.getElementById(`qty-input-${row.id}`);
        
        if (!row.customer) {
            showToast(`Row ${row.id}: Pick a Customer from the dropdown or add a new one.`, 'error');
            validationFailed = true;
        }
        if (!row.partNo) {
            showToast(`Row ${row.id}: Pick a Part number from the dropdown or add a new one.`, 'error');
            validationFailed = true;
        }
        if (!qtyInput || !qtyInput.value || parseInt(qtyInput.value) < 1) {
            showToast(`Row ${row.id}: Quantity must be 1 or more.`, 'error');
            validationFailed = true;
        }
    });
    
    if (validationFailed) return;
    
    // Write entries to store
    const savePromises = [];
    partRows.forEach(row => {
        const rowId = `entry-${Date.now()}-${row.id}`;
        const rowCust = row.customer;
        const rowPart = row.partNo;
        const process = document.getElementById(`proc-select-${row.id}`).value;
        const machine = document.getElementById(`mach-input-${row.id}`).value;
        const status = document.getElementById(`status-select-${row.id}`).value;
        const qtyVal = parseInt(document.getElementById(`qty-input-${row.id}`).value) || 1;
        
        const newEntry = {
            id: rowId,
            date: date,
            hour: hour,
            customer: rowCust,
            part: rowPart,
            component: row.component || '—',
            process: process,
            qty: qtyVal,
            machine: machine,
            status: status,
            file: row.fileName || '—',
            locked: false,
            employee: loggedInUser.empid,
            shift: shift // Preserve selected shift
        };
        
        if (typeof dbSaveLog !== 'undefined' && supabaseClient) {
            savePromises.push(dbSaveLog(newEntry));
        } else {
            todayEntries.push(newEntry);
            historicalEntries.unshift(newEntry); // Prepend to history
        }
    });
    
    if (savePromises.length > 0) {
        try {
            await Promise.all(savePromises);
            await syncFromSupabase();
        } catch (err) {
            console.error("Error saving to database:", err);
            showToast("Failed to save entries to Supabase database.", "error");
            return;
        }
    }
    
    // Adjust Shift Stats indicator
    const totalQtyLogged = partRows.reduce((sum, r) => {
        const inputEl = document.getElementById(`qty-input-${r.id}`);
        return sum + (inputEl ? parseInt(inputEl.value) || 1 : r.qty);
    }, 0);
    shiftPartsCount += totalQtyLogged;
    const monitorPartsEl = document.getElementById('monitor-stat-parts');
    if (monitorPartsEl) {
        monitorPartsEl.innerHTML = `${shiftPartsCount} <span class="target-sub">/ 350</span>`;
    }
    
    addLiveTerminalLog(`Operator ${loggedInUser.empid} logged ${totalQtyLogged} parts`, 'success');
    
    // Seed todayEntries dynamically
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        todayEntries = historicalEntries.filter(e => {
            if (!e.date) return false;
            const todayStr = getTodayDateString();
            return e.date.split('T')[0].trim() === todayStr.split('T')[0].trim() && e.employee === loggedInUser?.empid;
        });
    }
    
    // Re-render views
    updateEmployeeStats();
    renderTodayEntriesTable();
    renderHistoryTable();
    
    showToast(`Saved ${partRows.length} work entries!`);
    resetForm();
}

function renderTodayEntriesTable() {
    const loggedInUser = window.loggedInUser || (typeof window.getSession === 'function' ? window.getSession() : null);
    const tbody = document.getElementById('today-entries-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const todayStr = getTodayDateString();
    const todays = historicalEntries.filter(e => {
        if (!e.date || !todayStr) return false;
        return e.date.split('T')[0].trim() === todayStr.split('T')[0].trim() && e.employee === loggedInUser?.empid;
    });
    
    if (todays.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row-tr">
                <td colspan="8" class="empty-table-state">No entries logged for today yet.</td>
            </tr>
        `;
        return;
    }
    
    todays.forEach(entry => {
        const tr = document.createElement('tr');
        
        let fileLinkHtml = '—';
        const fileVal = entry.file || '—';
        if (fileVal !== '—') {
            fileLinkHtml = `
                <a href="#" class="table-file-link" onclick="event.preventDefault(); alert('Opening file: ${fileVal}');" title="${fileVal}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                    ${fileVal.substring(0, 10)}${fileVal.length > 10 ? '...' : ''}
                </a>
            `;
        }
        
        tr.innerHTML = `
            <td><strong>${entry.hour}</strong></td>
            <td>${entry.customer}</td>
            <td><code>${entry.part}</code></td>
            <td>${entry.process}</td>
            <td><strong>${entry.qty}</strong></td>
            <td><span class="status-badge ${entry.status}">${entry.status.replace('-', ' ')}</span></td>
            <td>${fileLinkHtml}</td>
            <td>
                <button type="button" class="btn-delete-entry" onclick="deleteTodayEntry('${entry.id}')" title="Delete entry">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteTodayEntry(entryId) {
    if (confirm('Are you sure you want to delete this entry?')) {
        if (typeof dbDeleteLog !== 'undefined' && supabaseClient) {
            try {
                await dbDeleteLog(entryId);
                await syncFromSupabase();
                todayEntries = todayEntries.filter(e => e.id !== entryId);
            } catch (err) {
                console.error("Error deleting from database:", err);
                showToast("Failed to delete entry from database.", "error");
                return;
            }
        } else {
            historicalEntries = historicalEntries.filter(e => e.id !== entryId);
            todayEntries = todayEntries.filter(e => e.id !== entryId);
        }
        
        updateEmployeeStats();
        renderTodayEntriesTable();
        renderHistoryTable();
        showToast('Entry deleted.', 'info');
    }
}

// ==========================================
// 4. HISTORICAL SEARCH
// ==========================================

function renderHistoryTable() {
    const loggedInUser = window.loggedInUser || (typeof window.getSession === 'function' ? window.getSession() : null);
    const tbody = document.getElementById('history-entries-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const fromDateVal = document.getElementById('filter-from-date').value;
    const toDateVal = document.getElementById('filter-to-date').value;
    
    const filtered = historicalEntries.filter(e => {
        if (loggedInUser && loggedInUser.role === 'employee' && e.employee !== loggedInUser.empid) {
            return false;
        }
        if (fromDateVal && e.date < fromDateVal) return false;
        if (toDateVal && e.date > toDateVal) return false;
        return true;
    });

    const totalHistEntries = filtered.length;
    const totalHistQty = filtered.reduce((acc, e) => acc + e.qty, 0);
    const summaryText = document.getElementById('history-summary-stats');
    if (summaryText) {
        summaryText.textContent = `${totalHistEntries} entry${totalHistEntries !== 1 ? 'es' : ''} • ${totalHistQty} qty`;
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-table-state">No entries found for the selected date range.</td>
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
                <a href="#" class="table-file-link" onclick="event.preventDefault(); alert('Opening file: ${fileVal}');" title="${fileVal}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                    ${fileVal.substring(0, 15)}${fileVal.length > 15 ? '...' : ''}
                </a>
            `;
        }
        
        let actionColumn = '';
        if (entry.locked) {
            actionColumn = `
                <span class="lock-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor" style="width:12px; height:12px; margin-right:4px;">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    locked
                </span>
            `;
        } else {
            actionColumn = `
                <button type="button" class="btn-delete-entry" onclick="deleteTodayEntry('${entry.id}')" title="Delete entry">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            `;
        }
        
        tr.innerHTML = `
            <td>${entry.date}</td>
            <td><strong>${entry.hour}</strong></td>
            <td>${entry.customer}</td>
            <td><code>${entry.part}</code></td>
            <td>${entry.process}</td>
            <td><strong>${entry.qty}</strong></td>
            <td><span class="status-badge ${entry.status}">${entry.status.replace('-', ' ')}</span></td>
            <td>${fileLinkHtml}</td>
            <td style="text-align: right; width: 100px;">${actionColumn}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function clearAllTodayEntries() {
    const loggedInUser = window.loggedInUser || (typeof window.getSession === 'function' ? window.getSession() : null);
    if (!loggedInUser) {
        showToast('Session expired. Please log in again.', 'error');
        return;
    }
    
    const todayStr = getTodayDateString();
    
    if (confirm("Are you sure you want to permanently delete ALL your logged entries for today? This action cannot be undone.")) {
        if (typeof dbDeleteAllTodayLogs !== 'undefined' && supabaseClient) {
            try {
                await dbDeleteAllTodayLogs(loggedInUser.empid, todayStr);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error clearing today's entries:", err);
                showToast("Failed to clear entries from the database.", "error");
                return;
            }
        } else {
            // Fallback for offline usage
            historicalEntries = historicalEntries.filter(e => {
                if (!e.date) return true;
                return !(e.date.split('T')[0].trim() === todayStr.split('T')[0].trim() && e.employee === loggedInUser.empid);
            });
            todayEntries = [];
        }
        
        // Re-seed todayEntries locally
        todayEntries = historicalEntries.filter(e => {
            if (!e.date) return false;
            return e.date.split('T')[0].trim() === todayStr.split('T')[0].trim() && e.employee === loggedInUser.empid;
        });
        
        updateEmployeeStats();
        renderTodayEntriesTable();
        renderHistoryTable();
        showToast("All today's entries cleared successfully.", "success");
    }
}

// Export functions for ESM imports
export {
    switchDashboardTab, updateEmployeeStats, addPartRow, deletePartRow,
    handleQtyChange, triggerAttachment, handleFileSelected,
    resetForm, saveWorkEntries, renderTodayEntriesTable, deleteTodayEntry, clearAllTodayEntries, renderHistoryTable
};

// Bind functions to window for backward compatibility
window.switchDashboardTab = switchDashboardTab;
window.updateEmployeeStats = updateEmployeeStats;
window.addPartRow = addPartRow;
window.deletePartRow = deletePartRow;
window.handleQtyChange = handleQtyChange;
window.triggerAttachment = triggerAttachment;
window.handleFileSelected = handleFileSelected;
window.resetForm = resetForm;
window.saveWorkEntries = saveWorkEntries;
window.renderTodayEntriesTable = renderTodayEntriesTable;
window.deleteTodayEntry = deleteTodayEntry;
window.clearAllTodayEntries = clearAllTodayEntries;
window.renderHistoryTable = renderHistoryTable;



