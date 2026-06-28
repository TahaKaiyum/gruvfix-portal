/**
 * @file routeGuards.js
 * @description Permission guard mapping roles to page routing coordinates.
 */

const ROLE_ROUTES = {
    admin: [
        '#/admin',
        '#/admin/dashboard',
        '#/admin/users',
        '#/admin/customers',
        '#/admin/parts',
        '#/admin/all-entries',
        '#/admin/reports',
        '#/admin/tool-requests'
    ],
    employee: [
        '#/operator',
        '#/operator/new-entry',
        '#/operator/my-history',
        '#/operator/tool-requests'
    ]
};

export const routeGuards = {
    /**
     * Checks if a role can access the specified hash route.
     * @param {string} route 
     * @param {string} role - 'admin' or 'employee'
     * @returns {boolean}
     */
    canAccess(route, role) {
        if (!route || route === '#/login' || route === '#/') return true;
        
        // Admins can access admin routes
        if (role === 'admin' && ROLE_ROUTES.admin.some(r => route.startsWith(r))) {
            return true;
        }
        
        // Employees can access operator routes
        if (role === 'employee' && ROLE_ROUTES.employee.some(r => route.startsWith(r))) {
            return true;
        }
        
        return false;
    },

    /**
     * Identifies the default route for a specific user role.
     * @param {string} role 
     * @returns {string}
     */
    getDefaultRoute(role) {
        return role === 'admin' ? '#/admin/dashboard' : '#/operator/new-entry';
    }
};
