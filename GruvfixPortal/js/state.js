/**
 * @file state.js
 * @description Global state management, data stores, utility helpers, and modal/toast handlers.
 * @project GruvfixPortal
 */

// ==========================================
// 1. APPLICATION STATE
// ==========================================
let currentRole = 'admin'; // 'admin' or 'employee'
let isLoggedIn = false;
let loggedInUser = null;
let currentTab = 'new-entry'; // employee tab: 'new-entry' or 'my-history'

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
let users = [
    { empid: 'EMP001', name: 'Ravi Kumar', email: 'ravi@gruvfix.com', password: 'Emp@12345', role: 'employee', active: true },
    { empid: 'EMP002', name: 'Anita Rao', email: 'anita@gruvfix.com', password: 'Emp@12345', role: 'employee', active: true },
    { empid: 'EMP003', name: 'Sunil Patel', email: 'sunil@gruvfix.com', password: 'Emp@12345', role: 'employee', active: true },
    { empid: 'EMP004', name: 'John Doe', email: 'john@gruvfix.com', password: 'Emp@12345', role: 'employee', active: false }, // inactive
    { empid: '', name: 'Administrator', email: 'admin@gruvfix.com', password: 'Admin123', role: 'admin', active: true }
];

let customers = [
    { name: 'Acme Test', code: 'ACME', notes: 'Standard test customer' },
    { name: 'COIMBATORE PREMIER INDUSTRIES', code: 'CPI', notes: 'Key manufacturing client' },
    { name: 'TATA MOTORS', code: 'TM', notes: 'Automotive components' },
    { name: 'RELIANCE INDUSTRIES', code: 'RI', notes: 'Industrial gaskets division' }
];

let parts = [
    { partNo: 'PT-A', component: 'Acme Primary Gasket', customer: 'Acme Test', process: 'Cutting' },
    { partNo: 'PT-B', component: 'Acme Secondary Gasket', customer: 'Acme Test', process: 'Cutting' },
    { partNo: 'PT-C', component: 'Acme High Temp Seal', customer: 'Acme Test', process: 'Molding' },
    { partNo: 'AV030ME0283', component: 'Engine Block Gasket M10', customer: 'COIMBATORE PREMIER INDUSTRIES', process: 'Cutting' },
    { partNo: 'AV030ME0284', component: 'Engine Head Gasket M12', customer: 'COIMBATORE PREMIER INDUSTRIES', process: 'Punching' },
    { partNo: 'AV030ME0285', component: 'Flange Gasket 4 Inch', customer: 'COIMBATORE PREMIER INDUSTRIES', process: 'Molding' },
    { partNo: 'TM-GASK-04', component: 'Tata Manifold Gasket', customer: 'TATA MOTORS', process: 'Punching' },
    { partNo: 'TM-GASK-05', component: 'Tata Exhaust Gasket', customer: 'TATA MOTORS', process: 'Trimming' },
    { partNo: 'TM-SEAL-12', component: 'Tata Water Pump Seal', customer: 'TATA MOTORS', process: 'Curing' },
    { partNo: 'RL-SEAL-89', component: 'Reliance Heavy Duty Seal', customer: 'RELIANCE INDUSTRIES', process: 'Molding' },
    { partNo: 'RL-SEAL-90', component: 'Reliance High Pressure Ring', customer: 'RELIANCE INDUSTRIES', process: 'Curing' }
];

let tools = [
    { name: 'Carbide End Mill - 4 Flute', dia: '10mm', fluteLen: '25mm', toolLen: '75mm', toolDia: '10mm', qty: 12, condition: 90 },
    { name: 'HSS Drill Bit', dia: '8mm', fluteLen: '50mm', toolLen: '100mm', toolDia: '8mm', qty: 8, condition: 75 },
    { name: 'Face Mill Cutter', dia: '20mm', fluteLen: '15mm', toolLen: '60mm', toolDia: '50mm', qty: 3, condition: 45 }
];

let toolRequests = [
    {
        id: 'req-1',
        employeeId: 'EMP001',
        employeeName: 'Ravi Kumar',
        customer: 'TATA MOTORS',
        toolName: 'Carbide End Mill - 4 Flute',
        requirements: 'Dia: 10mm, Flute Length: 25mm, Tool Length: 75mm, Tool Dia: 10mm, Qty: 2. For Tata Manifold Gasket milling.',
        status: 'Requested',
        conditionOnClose: null
    },
    {
        id: 'req-2',
        employeeId: 'EMP002',
        employeeName: 'Anita Rao',
        customer: 'COIMBATORE PREMIER INDUSTRIES',
        toolName: 'HSS Drill Bit',
        requirements: 'Dia: 8mm, Flute Length: 50mm, Tool Length: 100mm, Qty: 1. For Engine Head Gasket drilling.',
        status: 'Pending Close',
        conditionOnClose: 85
    }
];

let historicalEntries = [
    {
        id: 'hist-1',
        date: getRelativeDateString(0), // today
        hour: '09:00 - 10:00',
        customer: 'Acme Test',
        part: 'PT-A',
        component: 'Acme Primary Gasket',
        process: 'Cutting',
        qty: 25,
        machine: 'CNC-01',
        status: 'completed',
        file: '—',
        locked: false,
        employee: 'EMP001'
    },
    {
        id: 'hist-2',
        date: getRelativeDateString(0), // today
        hour: '10:00 - 11:00',
        customer: 'TATA MOTORS',
        part: 'TM-GASK-04',
        component: 'Tata Manifold Gasket',
        process: 'Punching',
        qty: 40,
        machine: 'PNS-01',
        status: 'pending',
        file: 'test_manifold.pdf',
        locked: false,
        employee: 'EMP002'
    },
    {
        id: 'hist-3',
        date: getRelativeDateString(0), // today
        hour: '14:00 - 15:00',
        customer: 'RELIANCE INDUSTRIES',
        part: 'RL-SEAL-90',
        component: 'Reliance High Pressure Ring',
        process: 'Curing',
        qty: 15,
        machine: 'CNC-02',
        status: 'completed',
        file: '—',
        locked: false,
        employee: 'EMP003'
    },
    {
        id: 'hist-4',
        date: getRelativeDateString(0), // today
        hour: '15:00 - 16:00',
        customer: 'COIMBATORE PREMIER INDUSTRIES',
        part: 'AV030ME0284',
        component: 'Engine Head Gasket M12',
        process: 'Punching',
        qty: 30,
        machine: 'CNC-03',
        status: 'rework',
        file: 'head_gasket_check.png',
        locked: false,
        employee: 'EMP001'
    },
    {
        id: 'hist-5',
        date: getRelativeDateString(1), // yesterday
        hour: '11:00 - 12:00',
        customer: 'TATA MOTORS',
        part: 'TM-SEAL-12',
        component: 'Tata Water Pump Seal',
        process: 'Curing',
        qty: 60,
        machine: 'MLD-02',
        status: 'completed',
        file: '—',
        locked: true,
        employee: 'EMP003'
    },
    {
        id: 'hist-6',
        date: getRelativeDateString(2), // 2 days ago
        hour: '16:00 - 17:00',
        customer: 'Acme Test',
        part: 'PT-B',
        component: 'Acme Secondary Gasket',
        process: 'Cutting',
        qty: 18,
        machine: 'CNC-01',
        status: 'hold',
        file: 'hold_spec.xlsx',
        locked: true,
        employee: 'EMP002'
    },
    {
        id: 'hist-7',
        date: getRelativeDateString(3), // 3 days ago
        hour: '08:00 - 09:00',
        customer: 'RELIANCE INDUSTRIES',
        part: 'RL-SEAL-89',
        component: 'Reliance Heavy Duty Seal',
        process: 'Molding',
        qty: 45,
        machine: 'MLD-02',
        status: 'completed',
        file: '—',
        locked: true,
        employee: 'EMP001'
    },
    {
        id: 'hist-8',
        date: getRelativeDateString(4), // 4 days ago
        hour: '13:00 - 14:00',
        customer: 'COIMBATORE PREMIER INDUSTRIES',
        part: 'AV030ME0283',
        component: 'Engine Block Gasket M10',
        process: 'Cutting',
        qty: 28,
        machine: 'CNC-03',
        status: 'rework',
        file: 'coimbatore_block.png',
        locked: true,
        employee: 'EMP003'
    },
    {
        id: 'hist-9',
        date: getRelativeDateString(5), // 5 days ago
        hour: '18:00 - 19:00',
        customer: 'TATA MOTORS',
        part: 'TM-GASK-04',
        component: 'Tata Manifold Gasket',
        process: 'Punching',
        qty: 50,
        machine: 'PNS-01',
        status: 'completed',
        file: '—',
        locked: true,
        employee: 'EMP002'
    },
    {
        id: 'hist-10',
        date: getRelativeDateString(6), // 6 days ago
        hour: '09:00 - 10:00',
        customer: 'Acme Test',
        part: 'PT-A',
        component: 'Acme Primary Gasket',
        process: 'Cutting',
        qty: 35,
        machine: 'CNC-01',
        status: 'completed',
        file: '—',
        locked: true,
        employee: 'EMP001'
    }
];

let todayEntries = [];

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
