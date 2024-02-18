import * as React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
ReactDOM.createRoot(rootElement!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <React.Suspense fallback={<div>Loading</div>} >
        <App />
        </React.Suspense>
        <ReactQueryDevtools initialIsOpen={false} position='bottom'/>
    </QueryClientProvider>
  </React.StrictMode>
);