"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // one client per browser session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // sensible defaults
            retry: 2,
            refetchOnWindowFocus: false,
            staleTime: 1000 * 30, // 30s: treat fresh for 30s
            // Retain unmounted queries for 30 min so table → detail → table
            // paints from cache (converted screens spread a preset on top).
            gcTime: 1000 * 60 * 30,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
