'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AIContextType {
  context: string;
  setContext: (context: string) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<string>('Forum');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AIContext.Provider value={{ context, setContext, isSidebarOpen, setSidebarOpen }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAIContext must be used within an AIContextProvider');
  }
  return context;
}
