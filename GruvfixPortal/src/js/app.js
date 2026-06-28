/**
 * @file app.js
 * @description Main application bootstrap coordinate: setups listeners, runs telemetry loops, manages live logs.
 * @project GruvfixPortal
 */

// Import dependent ES modules to consolidate into a single entrypoint bundle
import './supabase.js';
import './state.js';
import './dropdown.js';
import './auth/authController.js';
import './employee.js';
import './admin.js';
import './tools.js';

// ==========================================
// 1. INITIALIZATION & LISTENERS BOOTSTRAP
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    // Sync state from Supabase on start
    await syncFromSupabase();

    // Restore Session if it exists
    const cachedUser = getSession();
    if (cachedUser) {
        // Find matching user in the database users list
        const dbUser = users.find(u => {
            if (cachedUser.role === 'admin') {
                return u.email.toLowerCase() === cachedUser.email.toLowerCase() && u.role === 'admin';
            } else {
                return u.empid.toLowerCase() === cachedUser.empid.toLowerCase() && u.role === 'employee';
            }
        });

        if (dbUser && dbUser.active) {
            // Restore user session!
            isLoggedIn = true;
            loggedInUser = dbUser;
            currentRole = dbUser.role;
            
            // Set sidebar names and info
            const sideNames = document.querySelectorAll('.user-name-sidebar');
            sideNames.forEach(el => el.textContent = dbUser.role === 'admin' ? 'Administrator' : (dbUser.name || dbUser.empid));
            
            const sideRoles = document.querySelectorAll('.user-role-sidebar');
            sideRoles.forEach(el => el.textContent = dbUser.role.toUpperCase());
            
            const dispNames = document.querySelectorAll('.user-display-name');
            dispNames.forEach(el => el.textContent = dbUser.role === 'admin' ? 'Administrator' : (dbUser.name || dbUser.empid));
            
            const dispIds = document.querySelectorAll('.user-display-id');
            dispIds.forEach(el => el.textContent = dbUser.role === 'admin' ? dbUser.email : dbUser.empid);
            
            // Bypass login page and show the correct dashboard
            const loginPage = document.getElementById('login-page');
            const targetDashboardId = dbUser.role === 'admin' ? 'admin-dashboard' : 'employee-dashboard';
            const targetDashboard = document.getElementById(targetDashboardId);
            
            if (loginPage && targetDashboard) {
                loginPage.classList.remove('active');
                loginPage.style.opacity = '0';
                targetDashboard.classList.add('active');
                targetDashboard.style.opacity = '1';
                targetDashboard.style.transform = 'translateY(0)';
            }
            
            // Restore last visited tab
            const lastTab = getLastTab();
            if (dbUser.role === 'admin') {
                const defaultTab = lastTab || 'dashboard';
                switchAdminTab(defaultTab);
            } else {
                const defaultTab = lastTab || 'new-entry';
                switchDashboardTab(defaultTab);
            }
            
            showToast(`Session restored for ${dbUser.name || dbUser.role}.`);
        } else {
            // Invalid session or deactivated user
            clearSession();
        }
    }

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
const simMachines = ['CNC-01', 'CNC-02', 'PNS-01', 'MLD-02'];
const simProcesses = ['Punching', 'Molding', 'Curing', 'Trimming', 'Cutting'];

setInterval(() => {
    // Generate telemetry (simulated shift floor logs) using loaded database data
    const empUsers = users.filter(u => u.role === 'employee' && u.active);
    if (empUsers.length === 0 || customers.length === 0) {
        return; // Skip simulation if database is not loaded yet or has no data
    }
    
    const operatorObj = empUsers[Math.floor(Math.random() * empUsers.length)];
    const customerObj = customers[Math.floor(Math.random() * customers.length)];
    
    const empId = operatorObj.empid;
    const customer = customerObj.name;
    const machine = simMachines[Math.floor(Math.random() * simMachines.length)];
    const process = simProcesses[Math.floor(Math.random() * simProcesses.length)];
    const qty = Math.floor(Math.random() * 40) + 10;
    
    // Look up part choice dynamically
    const customerParts = parts.filter(p => p.customer === customer);
    let partNo = 'PT-A';
    let component = 'Acme Primary Gasket';
    
    if (customerParts.length > 0) {
        const pObj = customerParts[Math.floor(Math.random() * customerParts.length)];
        partNo = pObj.partNo;
        component = pObj.component;
    } else if (parts.length > 0) {
        // Fallback to any part if customer doesn't have parts mapped yet
        const pObj = parts[Math.floor(Math.random() * parts.length)];
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
    
    if (typeof dbSaveLog !== 'undefined' && supabaseClient) {
        dbSaveLog(simulatedEntry).then(() => {
            syncFromSupabase().then(() => {
                if (isLoggedIn && currentRole === 'admin') {
                    const activeTabEl = document.querySelector('#admin-dashboard .tab-view.active');
                    if (activeTabEl) {
                        const activeTabId = activeTabEl.id;
                        if (activeTabId === 'admin-view-dashboard') {
                            updateAdminDashboard();
                        } else if (activeTabId === 'admin-view-entries') {
                            renderAdminEntriesTable();
                        }
                    }
                }
            });
        }).catch(err => console.error("Error saving simulated entry:", err));
    } else {
        historicalEntries.unshift(simulatedEntry);
    }
    
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
