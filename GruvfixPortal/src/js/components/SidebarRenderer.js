/**
 * @file SidebarRenderer.js
 * @description Component utility to render user profile values across sidebar and header sections.
 */

export const SidebarRenderer = {
    /**
     * Renders user details to UI placeholder components.
     * @param {Object} user 
     */
    renderUserProfile(user) {
        if (!user) return;
        
        const isAdmin = user.role === 'admin';
        const displayName = isAdmin ? 'Administrator' : (user.name || user.empid);
        const displayId = isAdmin ? user.email : user.empid;
        const roleLabel = isAdmin ? 'ADMIN' : 'EMPLOYEE';

        // Update sidebar names
        const sideNames = document.querySelectorAll('.user-name-sidebar');
        sideNames.forEach(el => el.textContent = displayName);
        
        // Update sidebar roles
        const sideRoles = document.querySelectorAll('.user-role-sidebar');
        sideRoles.forEach(el => el.textContent = roleLabel);
        
        // Update header display names
        const dispNames = document.querySelectorAll('.user-display-name');
        dispNames.forEach(el => el.textContent = displayName);
        
        // Update header display IDs
        const dispIds = document.querySelectorAll('.user-display-id');
        dispIds.forEach(el => el.textContent = displayId);
    }
};
