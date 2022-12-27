import React from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

export const AppProvider = ({ children } : {children: React.ReactNode}) => {
    return (<QueryClientProvider client={queryClient}>
    <React.Suspense fallback={<div>Loading</div>} >
        {children}
      </React.Suspense>
  </QueryClientProvider>)
}