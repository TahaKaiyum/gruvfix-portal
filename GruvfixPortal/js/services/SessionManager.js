/**
 * @file SessionManager.js
 * @description Services for managing client session persistence and active tab routing.
 */

export const SessionManager = {
    /**
     * Saves user session info to localStorage.
     * @param {Object} user 
     */
    saveSession(user) {
        if (!user) return;
        const sessionData = {
            email: user.email,
            empid: user.empid,
            name: user.name,
            role: user.role,
            loginTime: Date.now()
        };
        localStorage.setItem('gruvfix_session', JSON.stringify(sessionData));
    },

    /**
     * Retrieves the current session if valid and not expired (8 hours).
     * @returns {Object|null}
     */
    getSession() {
        const sessionStr = localStorage.getItem('gruvfix_session');
        if (!sessionStr) return null;
        try {
            const session = JSON.parse(sessionStr);
            const expiryLimit = 8 * 60 * 60 * 1000; // 8 hours in ms
            if (Date.now() - session.loginTime > expiryLimit) {
                this.clearSession();
                return null;
            }
            return session;
        } catch (e) {
            this.clearSession();
            return null;
        }
    },

    /**
     * Deletes the session and active tab from localStorage.
     */
    clearSession() {
        localStorage.removeItem('gruvfix_session');
        localStorage.removeItem('gruvfix_last_tab');
    },

    /**
     * Saves the last visited tab ID.
     * @param {string} tabId 
     */
    saveLastTab(tabId) {
        localStorage.setItem('gruvfix_last_tab', tabId);
    },

    /**
     * Retrieves the last visited tab ID.
     * @returns {string|null}
     */
    getLastTab() {
        return localStorage.getItem('gruvfix_last_tab');
    }
};
