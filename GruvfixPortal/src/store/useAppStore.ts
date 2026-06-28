import { useState, useEffect } from 'react';

export function useAppStore() {
  const [state, setState] = useState(() => {
    const store = (window as any).appStore;
    return store ? store.getState() : {
      users: [],
      customers: [],
      parts: [],
      tools: [],
      toolRequests: [],
      historicalEntries: [],
      isLoggedIn: false,
      currentRole: null,
      currentTab: null,
      loggedInUser: null
    };
  });

  useEffect(() => {
    const store = (window as any).appStore;
    if (!store) return;

    // Set initial state
    setState(store.getState());

    // Subscribe to updates reactively
    const unsubscribe = store.subscribe((newState: any) => {
      setState({ ...newState });
    });

    return () => unsubscribe();
  }, []);

  return state;
}
