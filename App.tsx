import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useSyncEngine } from '@sync/useSyncEngine';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 3, staleTime: 5 * 60 * 1000 },
    mutations: { retry: 2 },
  },
});

// Drives offline-first upload of measurements; renders nothing.
function SyncEngine(): null {
  useSyncEngine();
  return null;
}

export default function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <SyncEngine />
      <RootNavigator />
    </QueryClientProvider>
  );
}
