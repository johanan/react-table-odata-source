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

export class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return <h1>Something went wrong: {this.state.error}</h1>;
        }

        return this.props.children;
    }
  }