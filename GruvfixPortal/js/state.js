/**
 * @file state.js
 * @description Global state management, data stores, utility helpers, and modal/toast handlers.
 * @project GruvfixPortal
 */

var supabaseClient = window.supabaseClient;

// ==========================================
// 1. APPLICATION STATE
// ==========================================
var currentRole = 'admin'; // 'admin' or 'employee'
var isLoggedIn = false;
var loggedInUser = null;
var currentTab = 'new-entry'; // employee tab: 'new-entry' or 'my-history'

// Shift & operator stats
let todayEntriesCount = 0;
let todayQtySum = 0;
let shiftPartsCount = 284; // Simulated live monitor starting count

// Form and search dropdown tracking
let rowIdCounter = 0;
let partRows = [];
let activeRowIdForCustomerDropdown = null;
let activeRowIdForPartDropdown = null;

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
// 3. MASTER DATA STORES
// ==========================================
var users = [];
var customers = [];
var parts = [];
var tools = [];
var toolRequests = [];
var historicalEntries = [];

var todayEntries = [];

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
async function syncFromSupabase() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        console.warn("Supabase client not initialized, using local mock data.");
        return;
    }
    
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
        customers = dbCustomers.map(c => ({
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
            condition: t.condition
        }));
        
        // 5. Fetch Tool Requests
        const { data: dbRequests, error: reqErr } = await supabaseClient
            .from('tool_requests')
            .select('*');
        if (reqErr) throw reqErr;
        toolRequests = dbRequests.map(r => ({
            id: r.id,
            employeeId: r.employee_id,
            employeeName: r.employee_name,
            customer: r.customer,
            toolName: r.tool_name,
            requirements: r.requirements,
            status: r.status,
            conditionOnClose: r.condition_on_close
        }));
        
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
    } catch (err) {
        console.error("Error syncing from Supabase:", err);
        showToast("Database sync error. Using offline state.", "error");
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
    const { error } = await supabaseClient
        .from('tool_requests')
        .upsert({
            id: reqObj.id,
            employee_id: reqObj.employeeId,
            employee_name: reqObj.employeeName,
            customer: reqObj.customer,
            tool_name: reqObj.toolName,
            requirements: reqObj.requirements,
            status: reqObj.status,
            condition_on_close: reqObj.conditionOnClose
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
            condition: toolObj.condition
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


