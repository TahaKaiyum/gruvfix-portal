/**
 * @file auth.js
 * @description Authentication controller handling logins, credentials pre-fills, logouts, and page transitions.
 * @project GruvfixPortal
 */

/**
 * Handles switching roles on the login screen.
 * @param {string} role - 'admin' or 'employee'
 */
function switchRole(role) {
    currentRole = role;
    
    const tabAdmin = document.getElementById('tab-admin');
    const tabEmployee = document.getElementById('tab-employee');
    const formInstruction = document.getElementById('form-instruction');
    const labelUsername = document.getElementById('label-username');
    const inputUsername = document.getElementById('login-username');

    if (role === 'admin') {
        tabAdmin.classList.add('active');
        tabEmployee.classList.remove('active');
        formInstruction.textContent = 'LOGIN WITH ADMIN EMAIL';
        labelUsername.textContent = 'EMAIL';
        inputUsername.placeholder = 'admin@gruvfix.com';
        inputUsername.value = 'admin@gruvfix.com';
    } else {
        tabAdmin.classList.remove('active');
        tabEmployee.classList.add('active');
        formInstruction.textContent = 'LOGIN WITH EMPLOYEE ID';
        labelUsername.textContent = 'EMPLOYEE ID';
        inputUsername.placeholder = 'e.g., EMP001';
        inputUsername.value = 'EMP001';
    }
    
    document.getElementById('login-password').value = '';
}

/**
 * Fills in mock credentials to ease local evaluation.
 */
function fillCreds(username, password) {
    const isEmployee = username.startsWith('EMP');
    switchRole(isEmployee ? 'employee' : 'admin');
    
    document.getElementById('login-username').value = username;
    document.getElementById('login-password').value = password;
    
    showToast('Credentials filled. Click "Sign in" to access.', 'info');
}

/**
 * Performs user validation and launches dashboard workspace.
 */
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    // Find user in users array
    const user = users.find(u => {
        if (currentRole === 'admin') {
            return u.email.toLowerCase() === username.toLowerCase() && u.role === 'admin';
        } else {
            return u.empid.toLowerCase() === username.toLowerCase() && u.role === 'employee';
        }
    });
    
    if (!user) {
        showToast(`Invalid ${currentRole} credentials.`, 'error');
        return;
    }
    
    if (user.password !== password) {
        showToast('Incorrect password. Please try again.', 'error');
        return;
    }
    
    if (!user.active) {
        showToast('This account has been deactivated. Please contact your system administrator.', 'error');
        return;
    }
    
    // Successful Login
    isLoggedIn = true;
    loggedInUser = user;
    
    if (currentRole === 'admin') {
        // Update header and sidebar values for admin
        const sideNames = document.querySelectorAll('.user-name-sidebar');
        sideNames.forEach(el => el.textContent = 'Administrator');
        
        const sideRoles = document.querySelectorAll('.user-role-sidebar');
        sideRoles.forEach(el => el.textContent = 'ADMIN');
        
        const dispNames = document.querySelectorAll('.user-display-name');
        dispNames.forEach(el => el.textContent = 'Administrator');
        
        const dispIds = document.querySelectorAll('.user-display-id');
        dispIds.forEach(el => el.textContent = user.email);
        
        transitionPages('login-page', 'admin-dashboard');
        switchAdminTab('dashboard'); // Default to dashboard on admin login
        showToast('Logged in successfully as Administrator.');
    } else {
        // Update header and sidebar values for employee
        const sideNames = document.querySelectorAll('.user-name-sidebar');
        sideNames.forEach(el => el.textContent = user.name || user.empid);
        
        const sideRoles = document.querySelectorAll('.user-role-sidebar');
        sideRoles.forEach(el => el.textContent = 'EMPLOYEE');
        
        const dispNames = document.querySelectorAll('.user-display-name');
        dispNames.forEach(el => el.textContent = user.name || user.empid);
        
        const dispIds = document.querySelectorAll('.user-display-id');
        dispIds.forEach(el => el.textContent = user.empid);
        
        transitionPages('login-page', 'employee-dashboard');
        switchDashboardTab('new-entry'); // Default to new entry on employee login
        
        // Refresh local counters and history tables
        updateEmployeeStats();
        renderTodayEntriesTable();
        renderHistoryTable();
        
        showToast(`Logged in successfully as ${user.name || user.empid}.`);
        resetForm();
    }
}

/**
 * Resets user context and redirects to login view.
 */
function logout() {
    isLoggedIn = false;
    loggedInUser = null;
    const activeDashboard = currentRole === 'admin' ? 'admin-dashboard' : 'employee-dashboard';
    transitionPages(activeDashboard, 'login-page');
    document.getElementById('login-password').value = '';
    showToast('Logged out successfully.', 'info');
}

/**
 * Page transition utility carrying fade and slide animation.
 */
function transitionPages(fromPageId, toPageId) {
    const fromPage = document.getElementById(fromPageId);
    const toPage = document.getElementById(toPageId);
    
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
