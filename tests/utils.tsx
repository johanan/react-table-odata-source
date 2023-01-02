import React from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

export const AppProvider = ({ children } : {children: React.ReactNode}) => {
  const queryClient = new QueryClient();
    return (<QueryClientProvider client={queryClient}>
    <React.Suspense fallback={<div>Loading</div>} >
        {children}
      </React.Suspense>
  </QueryClientProvider>)
}