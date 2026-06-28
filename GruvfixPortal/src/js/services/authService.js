/**
 * @file authService.js
 * @description Authentication service managing database queries and credential validations.
 */

export const authService = {
    /**
     * Checks if the username exists in the loaded users array.
     * @param {string} username 
     * @param {string} role - 'admin' or 'employee'
     * @param {Array} usersList 
     * @returns {Object|null}
     */
    findUser(username, role, usersList) {
        if (!usersList) return null;
        return usersList.find(u => {
            if (role === 'admin') {
                return u.email.toLowerCase() === username.toLowerCase() && u.role === 'admin';
            } else {
                return u.empid.toLowerCase() === username.toLowerCase() && u.role === 'employee';
            }
        });
    },

    /**
     * Checks if password is correct.
     * @param {Object} user 
     * @param {string} password 
     * @returns {boolean}
     */
    verifyPassword(user, password) {
        return user && user.password === password;
    },

    /**
     * Queries Supabase to verify if a user is active.
     * Used on page startup/restore validation.
     * @param {string} identifier - email for admin, empid for employee
     * @param {string} role 
     * @returns {Promise<boolean>}
     */
    async isUserActiveInDb(identifier, role) {
        if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient) {
            return true; // Fallback to local cache validation if offline/no client
        }
        
        try {
            const queryField = role === 'admin' ? 'email' : 'empid';
            const { data, error } = await window.supabaseClient
                .from('users')
                .select('active')
                .eq(queryField, identifier)
                .single();
                
            if (error || !data) return false;
            return data.active === true;
        } catch (err) {
            console.warn("Offline or database connection failed during startup check. Fallback to cached state.");
            return true; // Graceful fallback
        }
    }
};
