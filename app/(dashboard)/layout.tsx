import { AppShell } from "@/components/shell/app-shell";
import { CommandPalette } from "@/components/shell/command-palette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <CommandPalette />
    </AppShell>
  );
}
