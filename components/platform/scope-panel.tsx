import { ListTree } from "lucide-react";
import Link from "next/link";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";

export interface ScopeLink {
  href: string;
  label: string;
}

export function ScopePanel({
  title = "What this section covers",
  items,
  links,
  note,
}: {
  title?: string;
  items: string[];
  links?: ScopeLink[];
  note?: string;
}) {
  return (
    <Panel>
      <PanelHeader title={title} icon={<ListTree className="h-4 w-4" />} />
      <PanelBody className="space-y-4">
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-content-muted">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
        {note ? <p className="text-xs text-content-subtle">{note}</p> : null}
        {links && links.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-control border border-border bg-surface-muted/40 px-3 py-1.5 text-xs font-medium text-content-muted transition-colors hover:border-border-strong hover:text-content"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
