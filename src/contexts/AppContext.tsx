import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface AppState {
  sidebarCollapsed: boolean;
  isLoading: boolean;
}

interface AppContextType extends AppState {
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setIsLoading: (loading: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'alta-vista-ui-state';

const loadState = (): Partial<AppState> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveState = (state: Partial<AppState>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading } = useAuth();
  
  const [state, setState] = useState<AppState>(() => {
    const stored = loadState();
    return {
      sidebarCollapsed: stored.sidebarCollapsed ?? false,
      isLoading: true,
    };
  });

  // Sync loading state with auth
  useEffect(() => {
    if (!authLoading) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [authLoading]);

  // Persist UI state
  useEffect(() => {
    const { isLoading, ...persistState } = state;
    saveState(persistState);
  }, [state]);

  const setSidebarCollapsed = (collapsed: boolean) => {
    setState(prev => ({ ...prev, sidebarCollapsed: collapsed }));
  };

  const toggleSidebar = () => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  };

  const setIsLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  };

  return (
    <AppContext.Provider value={{
      ...state,
      setSidebarCollapsed,
      toggleSidebar,
      setIsLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
