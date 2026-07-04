/**
 * @file state.js
 * @description Global state management, data stores, utility helpers, and modal/toast handlers.
 * @project GruvfixPortal
 */

var supabaseClient = window.supabaseClient;

// Helper to decode condition from DB integer to status string
function decodeCondition(dbVal) {
    if (dbVal === null || dbVal === undefined) return 'Good';
    const val = parseInt(dbVal);
    if (isNaN(val)) return 'Good';
    if (val >= 80) return 'Good';
    if (val >= 30) return 'OK';
    return 'Broken';
}

// Helper to encode status string to DB integer condition
function encodeCondition(strVal) {
    if (strVal === 'OK') return 50;
    if (strVal === 'Broken') return 0;
    return 100; // 'Good'
}

// Helper to decode status from requirements (to bypass db constraints)
function decodeStatusFromRequirements(dbRequirements, dbStatus) {
    if (!dbRequirements) {
        return {
            requirements: '',
            status: dbStatus === 'Requested' ? 'Approved' : dbStatus
        };
    }
    const match = dbRequirements.match(/\n__status:\s*([^\n]+)$/);
    if (match) {
        const status = match[1].trim();
        const requirements = dbRequirements.replace(/\n__status:\s*[^\n]+$/, '');
        return { requirements, status };
    } else {
        let mappedStatus = dbStatus;
        if (dbStatus === 'Requested') {
            mappedStatus = 'Approved';
        }
        return {
            requirements: dbRequirements,
            status: mappedStatus
        };
    }
}

// ==========================================
// 2. DATE GENERATION HELPERS
// ==========================================
function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function getRelativeDateString(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// ==========================================
// 4. CASCADING UPDATES LOGIC
// ==========================================
function cascadeCustomerUpdate(oldName, newName) {
    if (oldName === newName) return;
    
    parts.forEach(p => {
        if (p.customer === oldName) p.customer = newName;
    });
    historicalEntries.forEach(e => {
        if (e.customer === oldName) e.customer = newName;
    });
    todayEntries.forEach(e => {
        if (e.customer === oldName) e.customer = newName;
    });
}

function cascadePartUpdate(customer, oldPartNo, newPartNo, newComponent) {
    historicalEntries.forEach(e => {
        if (e.customer === customer && e.part === oldPartNo) {
            e.part = newPartNo;
            if (newComponent) e.component = newComponent;
        }
    });
    todayEntries.forEach(e => {
        if (e.customer === customer && e.part === oldPartNo) {
            e.part = newPartNo;
            if (newComponent) e.component = newComponent;
        }
    });
}

function cascadeEmployeeUpdate(oldEmpId, newEmpId) {
    if (oldEmpId === newEmpId) return;
    
    historicalEntries.forEach(e => {
        if (e.employee === oldEmpId) e.employee = newEmpId;
    });
    todayEntries.forEach(e => {
        if (e.employee === oldEmpId) e.employee = newEmpId;
    });
}

// ==========================================
// 5. TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
        </svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`;
    } else {
        iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>`;
    }
    
    toast.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Slide out after 3.5 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// ==========================================
// 6. MODAL WINDOW UTILITIES
// ==========================================
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.offsetHeight; // repaint
        modal.style.opacity = '1';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }, 200);
    }
    if (id === 'modal-customer') {
        activeRowIdForCustomerDropdown = null;
    } else if (id === 'modal-part') {
        activeRowIdForPartDropdown = null;
    }
}

function openLogDetailsModal(id) {
    const entry = historicalEntries.find(e => e.id === id);
    if (!entry) return;
    
    document.getElementById('detail-date').textContent = entry.date;
    document.getElementById('detail-hour').textContent = entry.hour;
    document.getElementById('detail-shift').textContent = entry.shift;
    document.getElementById('detail-employee').textContent = entry.employee || 'EMP001';
    document.getElementById('detail-customer').textContent = entry.customer;
    document.getElementById('detail-part').textContent = entry.part;
    document.getElementById('detail-component').textContent = entry.component;
    document.getElementById('detail-process').textContent = entry.process;
    document.getElementById('detail-qty').textContent = entry.qty;
    document.getElementById('detail-machine').textContent = entry.machine;
    
    const statusVal = document.getElementById('detail-status');
    if (statusVal) {
        statusVal.innerHTML = `<span class="status-badge ${entry.status}">${entry.status.replace('-', ' ')}</span>`;
    }
    
    const fileVal = document.getElementById('detail-file');
    if (fileVal) {
        if (entry.file && entry.file !== '—') {
            fileVal.innerHTML = `
                <a href="#" onclick="event.preventDefault(); alert('Downloading ${entry.file}');" style="color: var(--primary-accent); font-weight: 600; text-decoration: underline;">
                    ${entry.file}
                </a>
            `;
        } else {
            fileVal.textContent = '—';
        }
    }
    
    openModal('modal-log-details');
}

// ==========================================
// 7. SUPABASE DATABASE SYNC & CRUD OPERATIONS
// ==========================================
function toggleLoadingSkeletons(show) {
    const panels = ['admin-dashboard', 'employee-dashboard'];
    panels.forEach(pid => {
        const panel = document.getElementById(pid);
        if (!panel) return;
        if (show) {
            panel.classList.add('loading-shimmer-state');
        } else {
            panel.classList.remove('loading-shimmer-state');
        }
    });
}

async function syncFromSupabase() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        console.warn("Supabase client not initialized, using local mock data.");
        return;
    }
    
    toggleLoadingSkeletons(true);
    try {
        // 1. Fetch Users
        const { data: dbUsers, error: usersErr } = await supabaseClient
            .from('users')
            .select('*');
        if (usersErr) throw usersErr;
        users = dbUsers.map(u => ({
            empid: u.empid === 'ADMIN' ? '' : u.empid,
            name: u.name,
            email: u.email,
            password: u.password,
            role: u.role,
            active: u.active
        }));
        
        // 2. Fetch Customers
        const { data: dbCustomers, error: custErr } = await supabaseClient
            .from('customers')
            .select('*');
        if (custErr) throw custErr;

        // Extract settings config from special customer __SYSTEM_SETTINGS
        const settingsRecord = dbCustomers.find(c => c.name === '__SYSTEM_SETTINGS');
        if (settingsRecord) {
            try {
                const settingsObj = JSON.parse(settingsRecord.notes);
                if (settingsObj.schedule) todaySchedule = settingsObj.schedule;
                if (settingsObj.announcements) announcements = settingsObj.announcements;
            } catch (e) {
                console.error("Error decoding __SYSTEM_SETTINGS:", e);
            }
        }

        customers = dbCustomers
            .filter(c => c.name !== '__SYSTEM_SETTINGS')
            .map(c => ({
                name: c.name,
                code: c.code,
                notes: c.notes,
                contact: c.contact,
                gst: c.gst
            }));
        
        // 3. Fetch Parts
        const { data: dbParts, error: partsErr } = await supabaseClient
            .from('parts')
            .select('*');
        if (partsErr) throw partsErr;
        parts = dbParts.map(p => ({
            partNo: p.part_no,
            component: p.component,
            customer: p.customer,
            process: p.process
        }));
        
        // 4. Fetch Tools
        const { data: dbTools, error: toolsErr } = await supabaseClient
            .from('tools')
            .select('*');
        if (toolsErr) throw toolsErr;
        tools = dbTools.map(t => ({
            name: t.name,
            dia: t.dia,
            fluteLen: t.flute_len,
            toolLen: t.tool_len,
            toolDia: t.tool_dia,
            qty: t.qty,
            condition: decodeCondition(t.condition)
        }));
        
        // 5. Fetch Tool Requests
        const { data: dbRequests, error: reqErr } = await supabaseClient
            .from('tool_requests')
            .select('*');
        if (reqErr) throw reqErr;
        toolRequests = dbRequests.map(r => {
            const { requirements, status } = decodeStatusFromRequirements(r.requirements, r.status);
            return {
                id: r.id,
                employeeId: r.employee_id,
                employeeName: r.employee_name,
                customer: r.customer,
                toolName: r.tool_name,
                requirements: requirements,
                status: status,
                conditionOnClose: r.condition_on_close !== null ? decodeCondition(r.condition_on_close) : null
            };
        });
        
        // 6. Fetch Logs
        const { data: dbLogs, error: logsErr } = await supabaseClient
            .from('logs')
            .select('*')
            .order('id', { ascending: false });
        if (logsErr) throw logsErr;
        historicalEntries = dbLogs.map(l => ({
            id: l.id,
            date: l.date,
            hour: l.hour,
            customer: l.customer,
            part: l.part,
            component: l.component,
            process: l.process,
            qty: l.qty,
            machine: l.machine,
            status: l.status,
            file: l.file,
            locked: l.locked,
            employee: l.employee,
            shift: l.shift
        }));
        
        console.log("State synced from Supabase successfully!");
        toggleLoadingSkeletons(false);
        if (typeof window.updateHomepageMetrics === 'function') {
            window.updateHomepageMetrics();
        }
    } catch (err) {
        console.error("Error syncing from Supabase:", err);
        showToast("Database sync error. Using offline state.", "error");
        toggleLoadingSkeletons(false);
    }
}

async function dbSaveUser(userObj) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const dbEmpid = userObj.empid === '' ? 'ADMIN' : userObj.empid;
    const { error } = await supabaseClient
        .from('users')
        .upsert({
            empid: dbEmpid,
            name: userObj.name,
            email: userObj.email,
            password: userObj.password,
            role: userObj.role,
            active: userObj.active
        });
    if (error) throw error;
}

async function dbDeleteUser(empid) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const dbEmpid = empid === '' ? 'ADMIN' : empid;
    const { error } = await supabaseClient
        .from('users')
        .delete()
        .eq('empid', dbEmpid);
    if (error) throw error;
}

async function dbSaveCustomer(custObj) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const { error } = await supabaseClient
        .from('customers')
        .upsert({
            name: custObj.name,
            code: custObj.code,
            notes: custObj.notes,
            contact: custObj.contact,
            gst: custObj.gst
        });
    if (error) throw error;
}

async function dbDeleteCustomer(name) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const { error } = await supabaseClient
        .from('customers')
        .delete()
        .eq('name', name);
    if (error) throw error;
}

async function dbSavePart(partObj) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const { error } = await supabaseClient
        .from('parts')
        .upsert({
            part_no: partObj.partNo,
            component: partObj.component,
            customer: partObj.customer,
            process: partObj.process
        });
    if (error) throw error;
}

async function dbDeletePart(partNo) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const { error } = await supabaseClient
        .from('parts')
        .delete()
        .eq('part_no', partNo);
    if (error) throw error;
}

async function dbSaveToolRequest(reqObj) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    
    // Map the rich JS status to an allowed DB status
    let dbStatus = 'Requested';
    if (reqObj.status === 'Pending Close') {
        dbStatus = 'Pending Close';
    } else if (reqObj.status === 'Closed' || reqObj.status === 'Rejected') {
        dbStatus = 'Closed';
    }
    
    // Encode the rich JS status inside requirements field
    const cleanRequirements = (reqObj.requirements || '').replace(/\n__status:[\s\S]*$/, '');
    const dbRequirements = cleanRequirements + `\n__status: ${reqObj.status}`;
    
    const { error } = await supabaseClient
        .from('tool_requests')
        .upsert({
            id: reqObj.id,
            employee_id: reqObj.employeeId,
            employee_name: reqObj.employeeName,
            customer: reqObj.customer,
            tool_name: reqObj.toolName,
            requirements: dbRequirements,
            status: dbStatus,
            condition_on_close: reqObj.conditionOnClose !== null ? encodeCondition(reqObj.conditionOnClose) : null
        });
    if (error) throw error;
}

async function dbSaveLog(logObj) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const { error } = await supabaseClient
        .from('logs')
        .upsert({
            id: logObj.id,
            date: logObj.date,
            hour: logObj.hour,
            customer: logObj.customer,
            part: logObj.part,
            component: logObj.component,
            process: logObj.process,
            qty: logObj.qty,
            machine: logObj.machine,
            status: logObj.status,
            file: logObj.file,
            locked: logObj.locked,
            employee: logObj.employee,
            shift: logObj.shift
        });
    if (error) throw error;
}

async function dbDeleteLog(id) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const { error } = await supabaseClient
        .from('logs')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

async function dbSaveTool(toolObj) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const { error } = await supabaseClient
        .from('tools')
        .upsert({
            name: toolObj.name,
            dia: toolObj.dia,
            flute_len: toolObj.fluteLen,
            tool_len: toolObj.toolLen,
            tool_dia: toolObj.toolDia,
            qty: toolObj.qty,
            condition: encodeCondition(toolObj.condition)
        });
    if (error) throw error;
}

async function dbDeleteTool(name) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    const { error } = await supabaseClient
        .from('tools')
        .delete()
        .eq('name', name);
    if (error) throw error;
}

// Export functions for module imports
async function dbSaveSystemSettings(schedule, annList) {
    if (typeof dbSaveCustomer !== 'undefined' && supabaseClient) {
        const notesStr = JSON.stringify({ schedule: schedule, announcements: annList });
        await dbSaveCustomer({
            name: '__SYSTEM_SETTINGS',
            code: 'SETTINGS',
            notes: notesStr,
            contact: '',
            gst: ''
        });
    }
}

export {
    getTodayDateString, getRelativeDateString, cascadeCustomerUpdate, cascadePartUpdate, cascadeEmployeeUpdate,
    showToast, openModal, closeModal, openLogDetailsModal, syncFromSupabase,
    dbSaveUser, dbDeleteUser, dbSaveCustomer, dbDeleteCustomer, dbSavePart, dbDeletePart,
    dbSaveToolRequest, dbSaveLog, dbDeleteLog, dbSaveTool, dbDeleteTool, dbSaveSystemSettings
};

// Bind all state functions to window
window.getTodayDateString = getTodayDateString;
window.getRelativeDateString = getRelativeDateString;
window.cascadeCustomerUpdate = cascadeCustomerUpdate;
window.cascadePartUpdate = cascadePartUpdate;
window.cascadeEmployeeUpdate = cascadeEmployeeUpdate;
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.openLogDetailsModal = openLogDetailsModal;
window.syncFromSupabase = syncFromSupabase;
window.dbSaveUser = dbSaveUser;
window.dbDeleteUser = dbDeleteUser;
window.dbSaveCustomer = dbSaveCustomer;
window.dbDeleteCustomer = dbDeleteCustomer;
window.dbSavePart = dbSavePart;
window.dbDeletePart = dbDeletePart;
window.dbSaveToolRequest = dbSaveToolRequest;
window.dbSaveLog = dbSaveLog;
window.dbDeleteLog = dbDeleteLog;
window.dbSaveTool = dbSaveTool;
window.dbDeleteTool = dbDeleteTool;
window.dbSaveSystemSettings = dbSaveSystemSettings;




