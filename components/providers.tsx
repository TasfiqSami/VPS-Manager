"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";

import { VpsProvider } from "@/hooks/use-vps";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            gcTime: 5 * 60_000,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <VpsProvider>{children}</VpsProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
