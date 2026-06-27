/**
 * @file app.js
 * @description Main application bootstrap coordinate: setups listeners, runs telemetry loops, manages live logs.
 * @project GruvfixPortal
 */

// ==========================================
// 1. INITIALIZATION & LISTENERS BOOTSTRAP
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // Set default date input to today
    const dateInput = document.getElementById('entry-date');
    if (dateInput) {
        dateInput.value = getTodayDateString();
    }
    
    // Seed todayEntries dynamically on page load
    todayEntries = historicalEntries.filter(e => e.date === getTodayDateString());
    todayEntriesCount = todayEntries.length;
    todayQtySum = todayEntries.reduce((sum, e) => sum + e.qty, 0);
    
    // Set report from date to 30 days ago, to date to today
    const reportFrom = document.getElementById('report-filter-from');
    const reportTo = document.getElementById('report-filter-to');
    if (reportFrom && reportTo) {
        reportTo.value = getTodayDateString();
        reportFrom.value = getRelativeDateString(30);
    }
    
    // Set admin entries from date to 30 days ago, to date to today
    const adminFrom = document.getElementById('admin-filter-from');
    const adminTo = document.getElementById('admin-filter-to');
    if (adminFrom && adminTo) {
        adminTo.value = getTodayDateString();
        adminFrom.value = getRelativeDateString(30);
    }

    // Set change listeners on admin entry filters
    const adminFilters = [
        'admin-filter-from',
        'admin-filter-to',
        'admin-filter-employee',
        'admin-filter-customer',
        'admin-filter-shift',
        'admin-filter-status'
    ];
    adminFilters.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', filterAdminEntries);
    });

    // Initialize filter dropdowns
    populateFilterDropdowns();
    
    // Populate datalists for searchable comboboxes
    populateDatalists();
    
    // Reset Employee Form
    resetForm();
    
    // Render initial data tables
    renderTodayEntriesTable();
    renderHistoryTable();
    
    // Hook report filters
    hookReportFilters();

    // Global click listener to close custom dropdowns on clicking outside
    document.addEventListener('click', function(e) {
        const dropdowns = document.querySelectorAll('.custom-dropdown');
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });
    });
});

// ==========================================
// 2. LIVE MONITOR WORK LOGGER & TERMINAL
// ==========================================
function addLiveTerminalLog(text, tag = 'success') {
    const logEl = document.getElementById('live-terminal-log');
    if (!logEl) return;
    
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `[${hh}:${mm}]`;
    
    const logLineDiv = document.createElement('div');
    logLineDiv.className = 'log-line';
    logLineDiv.innerHTML = `
        <span class="log-time">${timestamp}</span> 
        <span class="log-tag tag-${tag === 'success' ? 'success' : 'system'}">${tag.toUpperCase()}</span> 
        ${text}
    `;
    
    logEl.appendChild(logLineDiv);
    logEl.scrollTop = logEl.scrollHeight;
    
    while (logEl.children.length > 8) {
        logEl.children[0].remove();
    }
}

// ==========================================
// 3. PERIODIC SHOP FLOOR TELEMETRY SIMULATOR
// ==========================================
const simOperators = ['EMP002 (Anita Rao)', 'EMP003 (Sunil Patel)', 'EMP001 (Ravi Kumar)'];
const simCustomers = ['TATA MOTORS', 'RELIANCE INDUSTRIES', 'COIMBATORE PREMIER INDUSTRIES', 'Acme Test'];
const simMachines = ['CNC-01', 'CNC-02', 'PNS-01', 'MLD-02'];
const simProcesses = ['Punching', 'Molding', 'Curing', 'Trimming', 'Cutting'];

setInterval(() => {
    // Generate telemetry (simulated shift floor logs)
    const operatorStr = simOperators[Math.floor(Math.random() * simOperators.length)];
    const customer = simCustomers[Math.floor(Math.random() * simCustomers.length)];
    const machine = simMachines[Math.floor(Math.random() * simMachines.length)];
    const process = simProcesses[Math.floor(Math.random() * simProcesses.length)];
    const qty = Math.floor(Math.random() * 40) + 10;
    
    const empId = operatorStr.split(' ')[0];
    
    // Look up part choice dynamically
    const customerParts = parts.filter(p => p.customer === customer);
    let partNo = 'PT-A';
    let component = 'Acme Primary Gasket';
    if (customerParts.length > 0) {
        const pObj = customerParts[Math.floor(Math.random() * customerParts.length)];
        partNo = pObj.partNo;
        component = pObj.component;
    }
    
    // Append to dynamic store so admin sees it upon navigation / updates
    const simulatedEntry = {
        id: `sim-${Date.now()}`,
        date: getTodayDateString(),
        hour: '15:00 - 16:00',
        customer: customer,
        part: partNo,
        component: component,
        process: process,
        qty: qty,
        machine: machine,
        status: 'completed',
        file: '—',
        locked: false,
        employee: empId,
        shift: 'Day Shift' // Default shift for simulation
    };
    
    historicalEntries.unshift(simulatedEntry);
    
    // If we're on the login screen, show updates in real-time
    if (!isLoggedIn) {
        shiftPartsCount += qty;
        const monitorPartsEl = document.getElementById('monitor-stat-parts');
        if (monitorPartsEl) {
            monitorPartsEl.innerHTML = `${shiftPartsCount} <span class="target-sub">/ 350</span>`;
        }
        
        addLiveTerminalLog(`Operator ${empId} logged ${qty} parts (${process}) for ${customer} on ${machine}`, 'success');
        
        // Randomly swing machine indicators
        const machineCards = document.querySelectorAll('.machine-card');
        if (machineCards.length > 0 && Math.random() > 0.4) {
            const card = machineCards[Math.floor(Math.random() * machineCards.length)];
            const statusEl = card.querySelector('.machine-status');
            const dotEl = card.querySelector('.indicator-dot');
            
            if (statusEl && dotEl) {
                const randState = Math.random();
                if (randState < 0.6) {
                    statusEl.textContent = 'RUNNING';
                    dotEl.className = 'indicator-dot glow-green';
                } else if (randState < 0.85) {
                    statusEl.textContent = 'IDLE';
                    dotEl.className = 'indicator-dot glow-amber';
                } else {
                    statusEl.textContent = 'DOWN';
                    dotEl.className = 'indicator-dot glow-red';
                }
            }
        }
    } else if (currentRole === 'admin') {
        // If logged in as admin and viewing active tab, live reload stats
        const activeTabEl = document.querySelector('#admin-dashboard .tab-view.active');
        if (activeTabEl) {
            const activeTabId = activeTabEl.id;
            if (activeTabId === 'admin-view-dashboard') {
                updateAdminDashboard();
            } else if (activeTabId === 'admin-view-entries') {
                renderAdminEntriesTable();
            }
        }
    } else if (currentRole === 'employee') {
        // If logged in as employee, refresh counters
        updateEmployeeStats();
        if (currentTab === 'new-entry') {
            renderTodayEntriesTable();
        } else if (currentTab === 'my-history') {
            renderHistoryTable();
        } else if (currentTab === 'tool-requests') {
            renderEmployeeToolRequests();
        }
    }
}, 10000);
