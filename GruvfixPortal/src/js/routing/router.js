/**
 * @file router.js
 * @description Main application routing manager handling URL hash checks and permissions verification.
 */

import { routeGuards } from './routeGuards.js';
import { SessionManager } from '../services/SessionManager.js';
import { SidebarRenderer } from '../components/SidebarRenderer.js';

export const HashRouter = {
    /**
     * Initializes the hash router.
     */
    init() {
        window.addEventListener('hashchange', () => this.handleRouting());
        
        // Expose router globally to preserve backward compatibility
        window.navigate = (hash) => {
            window.location.hash = hash;
        };

        // Run initial routing on startup
        this.handleRouting();
    },

    /**
     * Inspects target route and transitions views.
     */
    async handleRouting() {
        const hash = window.location.hash || '#/';
        const session = SessionManager.getSession();
        
        // 1. Unauthenticated state
        if (!session) {
            if (hash !== '#/' && hash !== '#/login') {
                window.location.hash = '#/login';
                return;
            }
            this.transitionView('login-page');
            return;
        }

        // 2. Session verification against database
        const isActive = await this.verifyUserStatus(session);
        if (!isActive) {
            SessionManager.clearSession();
            window.location.hash = '#/login';
            window.showToast('Your account is deactivated or session is invalid.', 'error');
            return;
        }

        // 3. Permission verification
        const hasAccess = routeGuards.canAccess(hash, session.role);
        if (!hasAccess) {
            const defaultRoute = routeGuards.getDefaultRoute(session.role);
            window.location.hash = defaultRoute;
            window.showToast('Access restricted: Invalid role permissions.', 'error');
            return;
        }

        // 4. Mount Layout
        const targetView = session.role === 'admin' ? 'admin-dashboard' : 'employee-dashboard';
        this.transitionView(targetView);

        // Render user details in sidebar
        SidebarRenderer.renderUserProfile(session);

        // Show welcome toast once on load
        if (!this.greetingShown) {
            this.greetingShown = true;
            const displayName = session.role === 'admin' ? 'Administrator' : (session.name || session.empid);
            window.showToast(`Welcome back, ${displayName}!`);
        }

        // 5. Switch Tab
        this.syncSubTab(hash, session.role);
    },

    /**
     * Verifies that the user remains active in the database.
     * @param {Object} session 
     * @returns {Promise<boolean>}
     */
    async verifyUserStatus(session) {
        if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient) {
            return true; // Graceful fallback
        }
        try {
            const queryField = session.role === 'admin' ? 'email' : 'empid';
            const identifier = session.role === 'admin' ? session.email : session.empid;
            
            const { data, error } = await window.supabaseClient
                .from('users')
                .select('active')
                .eq(queryField, identifier)
                .single();
                
            if (error || !data) return false;
            return data.active === true;
        } catch (err) {
            return true; // Graceful offline/network error fallback
        }
    },

    transitionView(toPageId) {
        const pages = ['login-page', 'admin-dashboard', 'employee-dashboard'];
        const activePage = pages.map(id => document.getElementById(id)).find(el => el && el.classList.contains('active'));
        
        if (activePage && activePage.id !== toPageId) {
            activePage.style.opacity = '0';
            activePage.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                activePage.classList.remove('active');
                activePage.style.display = 'none';
                
                const targetPage = document.getElementById(toPageId);
                if (targetPage) {
                    targetPage.classList.add('active');
                    targetPage.style.display = toPageId === 'login-page' ? 'block' : 'flex';
                    targetPage.offsetHeight; // force reflow
                    targetPage.style.opacity = '1';
                    targetPage.style.transform = 'translateY(0)';
                }
            }, 200);
        } else {
            pages.forEach(pid => {
                const page = document.getElementById(pid);
                if (!page) return;
                if (pid === toPageId) {
                    page.classList.add('active');
                    page.style.display = pid === 'login-page' ? 'block' : 'flex';
                    page.style.opacity = '1';
                    page.style.transform = 'translateY(0)';
                } else {
                    page.classList.remove('active');
                    page.style.display = 'none';
                    page.style.opacity = '0';
                }
            });
        }
    },

    /**
     * Synchronizes URL hashes with legacy tab triggers.
     * @param {string} hash 
     * @param {string} role 
     */
    syncSubTab(hash, role) {
        const parts = hash.split('/');
        if (parts.length < 3) {
            // Default sub-tab falls back
            if (role === 'admin') {
                if (window.currentTab !== 'dashboard') window.switchAdminTab('dashboard');
            } else {
                if (window.currentTab !== 'new-entry') window.switchDashboardTab('new-entry');
            }
            return;
        }

        const tabId = parts[2];
        if (role === 'admin') {
            if (window.currentTab !== tabId && typeof window.switchAdminTab === 'function') {
                window.switchAdminTab(tabId);
            }
        } else {
            if (window.currentTab !== tabId && typeof window.switchDashboardTab === 'function') {
                window.switchDashboardTab(tabId);
            }
        }
    }
};
