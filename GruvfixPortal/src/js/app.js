/**
 * @file app.js
 * @description Main application bootstrap coordinate: setups listeners, runs telemetry loops, manages live logs.
 * @project GruvfixPortal
 */

// Import dependent ES modules to consolidate into a single entrypoint bundle
import { appStore } from './store/appStore.js';
import './services/supabase.js';
import './state.js';
import './dropdown.js';
import './auth/authController.js';
import './employee.js';
import './admin.js';
import './tools.js';
import { HashRouter } from './routing/router.js';

// ==========================================
// 1. INITIALIZATION & LISTENERS BOOTSTRAP
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    // Sync state from Supabase on start
    await syncFromSupabase();

    // Initial homepage metrics update
    updateHomepageMetrics();

    // Subscribe dashboard views to appStore changes to redraw automatically and reactively
    appStore.subscribe((state) => {
        if (!state.isLoggedIn) return;
        
        if (state.currentRole === 'admin') {
            const activeTab = state.currentTab;
            if (activeTab === 'dashboard') {
                if (typeof window.updateAdminDashboard === 'function') window.updateAdminDashboard();
            } else if (activeTab === 'entries') {
                if (typeof window.renderAdminEntriesTable === 'function') window.renderAdminEntriesTable();
            } else if (activeTab === 'employees') {
                if (typeof window.renderUsersTable === 'function') window.renderUsersTable();
            } else if (activeTab === 'customers') {
                if (typeof window.renderCustomersTable === 'function') window.renderCustomersTable();
            } else if (activeTab === 'parts') {
                if (typeof window.renderPartsTable === 'function') window.renderPartsTable();
            } else if (activeTab === 'tools') {
                if (typeof window.renderToolsTable === 'function') window.renderToolsTable();
            } else if (activeTab === 'tool-requests') {
                if (typeof window.renderAdminToolRequestsTable === 'function') window.renderAdminToolRequestsTable();
            }
        } else if (state.currentRole === 'employee') {
            const activeTab = state.currentTab;
            if (activeTab === 'new-entry') {
                if (typeof window.updateEmployeeStats === 'function') window.updateEmployeeStats();
            } else if (activeTab === 'my-history') {
                if (typeof window.renderHistoryTable === 'function') window.renderHistoryTable();
            } else if (activeTab === 'tool-requests') {
                if (typeof window.renderEmployeeToolRequests === 'function') window.renderEmployeeToolRequests();
            }
        }
    });

    // Initialize Hash Router which handles session validation and view restoration automatically
    HashRouter.init();

    // Set default date input to today
    const dateInput = document.getElementById('entry-date');
    if (dateInput) {
        dateInput.value = getTodayDateString();
    }
    
    // Seed todayEntries dynamically on page load
    todayEntries = historicalEntries.filter(e => {
        if (!e.date) return false;
        const todayStr = getTodayDateString();
        return e.date.split('T')[0].trim() === todayStr.split('T')[0].trim();
    });
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

// Global helper for homepage metrics
function updateHomepageMetrics() {
    const partsEl = document.getElementById('snap-metric-parts');
    const opsEl = document.getElementById('snap-metric-operators');
    const reqsEl = document.getElementById('snap-metric-tool-reqs');
    const custsEl = document.getElementById('snap-metric-customers');
    
    if (partsEl) {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const dbTodayParts = (typeof historicalEntries !== 'undefined' ? historicalEntries : [])
            .filter(e => e.date === todayStr)
            .reduce((sum, e) => sum + (parseInt(e.qty) || 0), 0);
        
        const baseParts = dbTodayParts > 0 ? dbTodayParts : 1286;
        partsEl.textContent = (baseParts + (shiftPartsCount - 284)).toLocaleString();
    }
    if (opsEl) {
        const dbActiveOps = (typeof users !== 'undefined' ? users : [])
            .filter(u => u.role === 'employee' && u.active).length;
        opsEl.textContent = dbActiveOps > 0 ? (dbActiveOps + 27) : 31;
    }
    if (reqsEl) {
        const pendingRequests = (typeof toolRequests !== 'undefined' ? toolRequests : [])
            .filter(r => r.status === 'Pending Approval').length;
        reqsEl.textContent = pendingRequests;
    }
    if (custsEl) {
        const dbCustomersCount = (typeof customers !== 'undefined' ? customers : []).length;
        custsEl.textContent = dbCustomersCount > 0 ? (dbCustomersCount + 11) : 14;
    }

    renderHomepageSchedule();
    renderHomepageAnnouncements();
}
window.updateHomepageMetrics = updateHomepageMetrics;

function renderHomepageSchedule() {
    const container = document.querySelector('#login-page .timeline-container');
    if (!container) return;
    
    // Clear old items (keep the line)
    container.innerHTML = '<div class="timeline-line"></div>';
    
    const sched = (typeof todaySchedule !== 'undefined' ? todaySchedule : []);
    sched.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'timeline-item';
        itemDiv.innerHTML = `
            <span class="timeline-dot"></span>
            <div>
                <span class="timeline-time">${item.time}</span>
                <p class="timeline-text">${item.text}</p>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}
window.renderHomepageSchedule = renderHomepageSchedule;

function renderHomepageAnnouncements() {
    const listEl = document.querySelector('#login-page .announcements-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    const annList = (typeof announcements !== 'undefined' ? announcements : []);
    // Show only latest 3 on homepage
    const displayAnn = annList.slice(0, 3);
    
    displayAnn.forEach(ann => {
        let iconSvg = '';
        if (ann.type === 'gear') {
            iconSvg = `
                <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" class="ann-icon">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
            `;
        } else if (ann.type === 'shield') {
            iconSvg = `
                <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" class="ann-icon">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
            `;
        } else {
            iconSvg = `
                <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" class="ann-icon">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
            `;
        }
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'announcement-item';
        itemDiv.innerHTML = `
            <div class="ann-icon-circle">${iconSvg}</div>
            <div>
                <p class="ann-text">${ann.text}</p>
                <span class="ann-date">${ann.date}</span>
            </div>
        `;
        listEl.appendChild(itemDiv);
    });
}
window.renderHomepageAnnouncements = renderHomepageAnnouncements;

function openAllAnnouncementsModal(e) {
    if (e) e.preventDefault();
    
    const container = document.getElementById('all-announcements-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const annList = (typeof announcements !== 'undefined' ? announcements : []);
    
    if (annList.length === 0) {
        container.innerHTML = '<p style="font-size: 13px; color: var(--text-medium); text-align: center; margin: 20px 0;">No announcements posted.</p>';
    } else {
        annList.forEach(ann => {
            let iconSvg = '';
            if (ann.type === 'gear') {
                iconSvg = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" class="ann-icon" style="width:14px; height:14px;">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                `;
            } else if (ann.type === 'shield') {
                iconSvg = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" class="ann-icon" style="width:14px; height:14px;">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                `;
            } else {
                iconSvg = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" class="ann-icon" style="width:14px; height:14px;">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                `;
            }
            
            const div = document.createElement('div');
            div.className = 'announcement-item';
            div.style.borderBottom = '1px solid rgba(0,0,0,0.06)';
            div.style.paddingBottom = '12px';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '12px';
            div.innerHTML = `
                <div class="ann-icon-circle" style="background-color: rgba(5,150,105,0.1); width:28px; height:28px; border-radius:50%; display:flex; justify-content:center; align-items:center; flex-shrink:0;">${iconSvg}</div>
                <div style="flex-grow: 1;">
                    <p class="ann-text" style="color: var(--text-dark); font-weight: 600; font-size: 13px; margin: 0; text-align: left;">${ann.text}</p>
                    <span class="ann-date" style="color: var(--text-medium); font-size: 11px; margin-top: 2px; display: block; text-align: left;">${ann.date}</span>
                </div>
            `;
            container.appendChild(div);
        });
    }
    
    if (typeof openModal === 'function') {
        openModal('modal-all-announcements');
    }
}
window.openAllAnnouncementsModal = openAllAnnouncementsModal;

// ==========================================
// 3. PERIODIC SHOP FLOOR TELEMETRY SIMULATOR
// ==========================================
const simMachines = ['CNC-01', 'CNC-02', 'PNS-01', 'MLD-02'];
const simProcesses = ['Punching', 'Molding', 'Curing', 'Trimming', 'Cutting'];

setInterval(() => {
    // Only run simulation when not logged in
    if (isLoggedIn) {
        return;
    }
    
    // Generate telemetry (simulated shift floor logs) using loaded database data
    const empUsers = (typeof users !== 'undefined' ? users : []).filter(u => u.role === 'employee' && u.active);
    if (empUsers.length === 0 || (typeof customers !== 'undefined' && customers.length === 0)) {
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
    const customerParts = (typeof parts !== 'undefined' ? parts : []).filter(p => p.customer === customer);
    let partNo = 'PT-A';
    
    if (customerParts.length > 0) {
        const pObj = customerParts[Math.floor(Math.random() * customerParts.length)];
        partNo = pObj.partNo;
    } else if (parts.length > 0) {
        // Fallback to any part if customer doesn't have parts mapped yet
        const pObj = parts[Math.floor(Math.random() * parts.length)];
        partNo = pObj.partNo;
    }
    
    // If we're on the login screen, show updates in real-time
    shiftPartsCount += qty;
    
    // Update metrics dynamically
    updateHomepageMetrics();
    
    // Also support legacy elements if they are present in DOM
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
}, 10000);
