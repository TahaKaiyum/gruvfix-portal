/**
 * @file authController.js
 * @description Authentication controller coordinating UI actions, validation service calls, and layout rendering.
 */

import { SessionManager } from '../services/SessionManager.js';
import { authService } from '../services/authService.js';
import { SidebarRenderer } from '../components/SidebarRenderer.js';

/**
 * Handles switching roles on the login screen.
 * @param {string} role - 'admin' or 'employee'
 */
export function switchRole(role) {
    window.currentRole = role;
    
    const tabAdmin = document.getElementById('tab-admin');
    const tabEmployee = document.getElementById('tab-employee');
    const formInstruction = document.getElementById('form-instruction');
    const labelUsername = document.getElementById('label-username');
    const inputUsername = document.getElementById('login-username');

    if (role === 'admin') {
        if (tabAdmin) tabAdmin.classList.add('active');
        if (tabEmployee) tabEmployee.classList.remove('active');
        if (formInstruction) formInstruction.textContent = 'LOGIN WITH ADMIN EMAIL';
        if (labelUsername) labelUsername.textContent = 'EMAIL';
        
        const dbAdmin = typeof window.users !== 'undefined' ? window.users.find(u => u.role === 'admin' && u.active) : null;
        const defaultAdminEmail = dbAdmin ? dbAdmin.email : 'admin@gruvfix.com';
        if (inputUsername) {
            inputUsername.placeholder = defaultAdminEmail;
            inputUsername.value = defaultAdminEmail;
        }
    } else {
        if (tabAdmin) tabAdmin.classList.remove('active');
        if (tabEmployee) tabEmployee.classList.add('active');
        if (formInstruction) formInstruction.textContent = 'LOGIN WITH EMPLOYEE ID';
        if (labelUsername) labelUsername.textContent = 'EMPLOYEE ID';
        
        const dbEmp = typeof window.users !== 'undefined' ? window.users.find(u => u.role === 'employee' && u.active) : null;
        const defaultEmpId = dbEmp ? dbEmp.empid : 'EMP001';
        if (inputUsername) {
            inputUsername.placeholder = 'e.g., ' + defaultEmpId;
            inputUsername.value = defaultEmpId;
        }
    }
    
    const pwdInput = document.getElementById('login-password');
    if (pwdInput) pwdInput.value = '';
}

/**
 * Fills in mock credentials to ease local evaluation.
 */
export function fillCreds(username, password) {
    const isEmployee = username.startsWith('EMP') || !username.includes('@');
    switchRole(isEmployee ? 'employee' : 'admin');
    
    const inputUsername = document.getElementById('login-username');
    const inputPassword = document.getElementById('login-password');
    if (inputUsername) inputUsername.value = username;
    if (inputPassword) inputPassword.value = password;
    
    window.showToast('Credentials filled. Click "Sign in" to access.', 'info');
}

/**
 * Performs user validation and launches dashboard workspace.
 */
export function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    // Find user in window.users array via authService
    const user = authService.findUser(username, window.currentRole, window.users);
    
    if (!user) {
        window.showToast(`Invalid ${window.currentRole} credentials.`, 'error');
        return;
    }
    
    if (!authService.verifyPassword(user, password)) {
        window.showToast('Incorrect password. Please try again.', 'error');
        return;
    }
    
    if (!user.active) {
        window.showToast('This account has been deactivated. Please contact your system administrator.', 'error');
        return;
    }
    
    // Successful Login
    window.isLoggedIn = true;
    window.loggedInUser = user;
    SessionManager.saveSession(user);
    
    // Render profile details via reusable component
    SidebarRenderer.renderUserProfile(user);
    
    if (window.currentRole === 'admin') {
        transitionPages('login-page', 'admin-dashboard');
        window.switchAdminTab('dashboard'); // Default to dashboard on admin login
        window.showToast('Logged in successfully as Administrator.');
    } else {
        transitionPages('login-page', 'employee-dashboard');
        window.switchDashboardTab('new-entry'); // Default to new entry on employee login
        
        // Refresh local counters and history tables
        window.updateEmployeeStats();
        window.renderTodayEntriesTable();
        window.renderHistoryTable();
        
        window.showToast(`Logged in successfully as ${user.name || user.empid}.`);
        window.resetForm();
    }
}

/**
 * Resets user context and redirects to login view.
 */
export function logout() {
    window.isLoggedIn = false;
    window.loggedInUser = null;
    SessionManager.clearSession();
    
    const activeDashboard = window.currentRole === 'admin' ? 'admin-dashboard' : 'employee-dashboard';
    transitionPages(activeDashboard, 'login-page');
    
    const pwdInput = document.getElementById('login-password');
    if (pwdInput) pwdInput.value = '';
    window.showToast('Logged out successfully.', 'info');
}

/**
 * Page transition utility carrying fade and slide animation.
 */
export function transitionPages(fromPageId, toPageId) {
    const fromPage = document.getElementById(fromPageId);
    const toPage = document.getElementById(toPageId);
    
    if (fromPage && toPage) {
        fromPage.style.opacity = '0';
        fromPage.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            fromPage.classList.remove('active');
            toPage.classList.add('active');
            
            // Force layout repaint
            toPage.offsetHeight;
            
            toPage.style.opacity = '1';
            toPage.style.transform = 'translateY(0)';
        }, 250);
    }
}

// Attach functions to the global window object to preserve backward compatibility
window.switchRole = switchRole;
window.fillCreds = fillCreds;
window.handleLogin = handleLogin;
window.logout = logout;
window.transitionPages = transitionPages;

// Expose SessionManager methods globally for legacy script integration
window.saveSession = SessionManager.saveSession.bind(SessionManager);
window.getSession = SessionManager.getSession.bind(SessionManager);
window.clearSession = SessionManager.clearSession.bind(SessionManager);
window.saveLastTab = SessionManager.saveLastTab.bind(SessionManager);
window.getLastTab = SessionManager.getLastTab.bind(SessionManager);

