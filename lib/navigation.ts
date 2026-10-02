import {
  Activity,
  ArchiveRestore,
  Bell,
  Boxes,
  Camera,
  Code2,
  FolderOpen,
  Gauge,
  HardDrive,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Network,
  Package,
  ScrollText,
  Server,
  ServerCog,
  Settings2,
  ShieldCheck,
  ShieldHalf,
  Terminal,
  UserCog,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavGroup = "Operate" | "Insight" | "Security" | "Automation" | "Platform";

export const NAV_GROUP_ORDER: NavGroup[] = ["Operate", "Insight", "Security", "Automation", "Platform"];

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: NavGroup;
}

export const NAV_ITEMS: NavItem[] = [
  /* Operate */
  {
    href: "/",
    label: "Overview",
    description: "Live status, power and key metrics",
    icon: LayoutDashboard,
    group: "Operate",
  },
  {
    href: "/vps",
    label: "VPS",
    description: "Full server control: compute, hardware, boot and OS",
    icon: Server,
    group: "Operate",
  },
  {
    href: "/console",
    label: "Console",
    description: "VNC, terminal and rescue console access",
    icon: Terminal,
    group: "Operate",
  },
  {
    href: "/network",
    label: "Network",
    description: "Addresses, interfaces, DNS, firewall and diagnostics",
    icon: Network,
    group: "Operate",
  },
  {
    href: "/storage",
    label: "Storage",
    description: "Disks, volumes, ISO library and performance",
    icon: HardDrive,
    group: "Operate",
  },
  {
    href: "/snapshots",
    label: "Snapshots",
    description: "Restore points, schedules and retention policies",
    icon: Camera,
    group: "Operate",
  },
  {
    href: "/backups",
    label: "Backups",
    description: "Full and incremental backups, restore and retention",
    icon: ArchiveRestore,
    group: "Operate",
  },
  {
    href: "/files",
    label: "Files",
    description: "Browser file manager with editor and archives",
    icon: FolderOpen,
    group: "Operate",
  },

  /* Insight */
  {
    href: "/monitoring",
    label: "Monitoring",
    description: "CPU, memory, disk, network history and alerts",
    icon: Gauge,
    group: "Insight",
  },
  {
    href: "/health",
    label: "Health",
    description: "System health checks and diagnostics",
    icon: HeartPulse,
    group: "Insight",
  },
  {
    href: "/logs",
    label: "Logs",
    description: "Activity, audit, security and API logs",
    icon: ScrollText,
    group: "Insight",
  },
  {
    href: "/tasks",
    label: "Tasks",
    description: "Background Virtualizor task queue",
    icon: ListChecks,
    group: "Insight",
  },
  {
    href: "/system",
    label: "System",
    description: "Connectivity, capabilities and configuration",
    icon: ShieldCheck,
    group: "Insight",
  },

  /* Security */
  {
    href: "/security",
    label: "Security",
    description: "Firewall, SSH keys, access control and events",
    icon: ShieldHalf,
    group: "Security",
  },
  {
    href: "/access",
    label: "Access",
    description: "Users, roles, permissions and invitations",
    icon: Users,
    group: "Security",
  },
  {
    href: "/developers",
    label: "API",
    description: "API keys, service accounts, docs and request logs",
    icon: Code2,
    group: "Security",
  },

  /* Automation */
  {
    href: "/automation",
    label: "Automation",
    description: "Scheduled tasks, scripts, rules and webhooks",
    icon: Workflow,
    group: "Automation",
  },
  {
    href: "/notifications",
    label: "Notifications",
    description: "Alerts and delivery channels per event",
    icon: Bell,
    group: "Automation",
  },
  {
    href: "/templates",
    label: "Templates",
    description: "OS, application and custom images",
    icon: Package,
    group: "Automation",
  },

  /* Platform */
  {
    href: "/infrastructure",
    label: "Infrastructure",
    description: "Nodes, datacenters, resource and IP pools",
    icon: Boxes,
    group: "Platform",
  },
  {
    href: "/account",
    label: "Account",
    description: "Profile, security, sessions and preferences",
    icon: UserCog,
    group: "Platform",
  },
  {
    href: "/support",
    label: "Support",
    description: "Help, troubleshooting and diagnostic reports",
    icon: LifeBuoy,
    group: "Platform",
  },
  {
    href: "/admin",
    label: "Admin",
    description: "Platform administration, audit and roles",
    icon: ServerCog,
    group: "Platform",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "VPS, console, security, appearance and units",
    icon: Settings2,
    group: "Platform",
  },
];

export const ACTIVITY_ICON = Activity;
