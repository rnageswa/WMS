import React, { ReactNode } from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

// Mock react-router-dom or wouter
const mockNavigate = vi.fn();
vi.mock('wouter', () => ({
  ...vi.importActual('wouter'),
  useLocation: () => ["/current-path", mockNavigate],
  Link: ({ children }: { children: ReactNode }) => children,
}));

// Mock toast functionality
vi.mock('@/components/ui/sonner', () => ({
  toast: vi.fn()
}));

// Mock global fetch for API calls
global.fetch = vi.fn();

/**
 * Creates a new QueryClient for tests to prevent state leakage
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Renders a component with the necessary providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { queryClient = createTestQueryClient() } = {}
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return {
    ...rtlRender(ui, { wrapper: Wrapper }),
    queryClient,
    mockNavigate,
    mockToast: toast,
    mockFetch: global.fetch as jest.Mock,
  };
}
