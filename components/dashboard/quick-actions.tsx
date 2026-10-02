"use client";

import {
  Camera,
  FolderOpen,
  ArchiveRestore,
  Lock,
  MonitorSmartphone,
  RotateCcw,
  ShieldHalf,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";

interface QuickLink {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const QUICK_LINKS: QuickLink[] = [
  { href: "/console", title: "Open console", description: "VNC, terminal and rescue console", icon: Terminal },
  { href: "/vps", title: "Reinstall OS", description: "Choose a template and reinstall", icon: RotateCcw },
  { href: "/vps", title: "Rescue mode", description: "Enable and manage rescue access", icon: Lock },
  { href: "/snapshots", title: "Snapshots", description: "Restore points and schedules", icon: Camera },
  { href: "/backups", title: "Backups", description: "Create, verify and restore", icon: ArchiveRestore },
  { href: "/files", title: "File manager", description: "Browse and edit guest files", icon: FolderOpen },
  { href: "/monitoring", title: "Monitoring", description: "Charts, history and thresholds", icon: MonitorSmartphone },
  { href: "/security", title: "Security", description: "Firewall, SSH keys and events", icon: ShieldHalf },
];

export function QuickActions() {
  return (
    <Panel>
      <PanelHeader title="Quick actions" description="Jump straight to common operations" />
      <PanelBody className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={`${link.href}-${link.title}`}
              href={link.href}
              className="group flex items-center gap-3 rounded-card border border-border bg-surface-muted/40 px-3 py-2.5 transition-colors hover:border-border-strong hover:bg-surface-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-content">{link.title}</span>
                <span className="block truncate text-2xs text-content-subtle">{link.description}</span>
              </span>
            </Link>
          );
        })}
      </PanelBody>
    </Panel>
  );
}
