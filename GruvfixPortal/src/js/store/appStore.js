/**
 * @file appStore.js
 * @description Centralized, reactive state store for the Gruvfix Portal.
 */

let state = {
    currentRole: 'admin',
    isLoggedIn: false,
    loggedInUser: null,
    currentTab: 'new-entry',
    todayEntriesCount: 0,
    todayQtySum: 0,
    shiftPartsCount: 284,
    rowIdCounter: 0,
    partRows: [],
    activeRowIdForCustomerDropdown: null,
    activeRowIdForPartDropdown: null,
    users: [],
    customers: [],
    parts: [],
    tools: [],
    toolRequests: [],
    historicalEntries: [],
    todayEntries: [],
    todaySchedule: [
        { time: '08:00', text: 'Shift A Start' },
        { time: '12:00', text: 'Lunch Break' },
        { time: '13:00', text: 'Production Resume' },
        { time: '20:00', text: 'Shift B Start' }
    ],
    announcements: [
        { id: 'ann-1', text: 'New Tool Request workflow is now live.', date: 'May 26, 2025', type: 'bell' },
        { id: 'ann-2', text: 'CNC-03 scheduled maintenance at 6 PM.', date: 'May 26, 2025', type: 'gear' },
        { id: 'ann-3', text: 'Monthly Safety Meeting on Friday.', date: 'May 25, 2025', type: 'shield' }
    ],
    machines: []
};

const subscribers = [];

export const appStore = {
    /**
     * Returns the read-only current state object.
     * @returns {Object}
     */
    getState() {
        return state;
    },

    /**
     * Updates the state and notifies all subscribed listeners.
     * @param {Object} updates 
     */
    setState(updates) {
        state = { ...state, ...updates };
        this.notify();
    },

    /**
     * Subscribes a callback to state changes.
     * @param {Function} callback 
     * @returns {Function} Unsubscribe trigger function
     */
    subscribe(callback) {
        subscribers.push(callback);
        return () => {
            const index = subscribers.indexOf(callback);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
        };
    },

    /**
     * Notifies all state subscribers.
     */
    notify() {
        subscribers.forEach(cb => {
            try {
                cb(state);
            } catch (err) {
                console.error("Error in store subscriber callback:", err);
            }
        });
    }
};

// Bind getters and setters to window to ensure absolute sync with legacy non-module scripts
Object.defineProperty(window, 'currentRole', { get: () => state.currentRole, set: (v) => appStore.setState({ currentRole: v }), configurable: true });
Object.defineProperty(window, 'isLoggedIn', { get: () => state.isLoggedIn, set: (v) => appStore.setState({ isLoggedIn: v }), configurable: true });
Object.defineProperty(window, 'loggedInUser', { get: () => state.loggedInUser, set: (v) => appStore.setState({ loggedInUser: v }), configurable: true });
Object.defineProperty(window, 'currentTab', { get: () => state.currentTab, set: (v) => appStore.setState({ currentTab: v }), configurable: true });
Object.defineProperty(window, 'todayEntriesCount', { get: () => state.todayEntriesCount, set: (v) => appStore.setState({ todayEntriesCount: v }), configurable: true });
Object.defineProperty(window, 'todayQtySum', { get: () => state.todayQtySum, set: (v) => appStore.setState({ todayQtySum: v }), configurable: true });
Object.defineProperty(window, 'shiftPartsCount', { get: () => state.shiftPartsCount, set: (v) => appStore.setState({ shiftPartsCount: v }), configurable: true });
Object.defineProperty(window, 'rowIdCounter', { get: () => state.rowIdCounter, set: (v) => appStore.setState({ rowIdCounter: v }), configurable: true });
Object.defineProperty(window, 'partRows', { get: () => state.partRows, set: (v) => appStore.setState({ partRows: v }), configurable: true });
Object.defineProperty(window, 'activeRowIdForCustomerDropdown', { get: () => state.activeRowIdForCustomerDropdown, set: (v) => appStore.setState({ activeRowIdForCustomerDropdown: v }), configurable: true });
Object.defineProperty(window, 'activeRowIdForPartDropdown', { get: () => state.activeRowIdForPartDropdown, set: (v) => appStore.setState({ activeRowIdForPartDropdown: v }), configurable: true });
Object.defineProperty(window, 'users', { get: () => state.users, set: (v) => appStore.setState({ users: v }), configurable: true });
Object.defineProperty(window, 'customers', { get: () => state.customers, set: (v) => appStore.setState({ customers: v }), configurable: true });
Object.defineProperty(window, 'parts', { get: () => state.parts, set: (v) => appStore.setState({ parts: v }), configurable: true });
Object.defineProperty(window, 'tools', { get: () => state.tools, set: (v) => appStore.setState({ tools: v }), configurable: true });
Object.defineProperty(window, 'toolRequests', { get: () => state.toolRequests, set: (v) => appStore.setState({ toolRequests: v }), configurable: true });
Object.defineProperty(window, 'historicalEntries', { get: () => state.historicalEntries, set: (v) => appStore.setState({ historicalEntries: v }), configurable: true });
Object.defineProperty(window, 'todayEntries', { get: () => state.todayEntries, set: (v) => appStore.setState({ todayEntries: v }), configurable: true });
Object.defineProperty(window, 'todaySchedule', { get: () => state.todaySchedule, set: (v) => appStore.setState({ todaySchedule: v }), configurable: true });
Object.defineProperty(window, 'announcements', { get: () => state.announcements, set: (v) => appStore.setState({ announcements: v }), configurable: true });
Object.defineProperty(window, 'machines', { get: () => state.machines, set: (v) => appStore.setState({ machines: v }), configurable: true });
