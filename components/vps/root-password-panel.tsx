"use client";

import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Meter } from "@/components/ui/progress";
import { InlineAlert } from "@/components/ui/states";
import { useApiMutation } from "@/hooks/use-virtualizor";
import { apiFetch } from "@/lib/api-client";
import type { ActionSuccess } from "@/lib/virtualizor/types";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

function generatePassword(length = 20): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += CHARSET[(bytes[index] as number) % CHARSET.length];
  }
  return output;
}

function strengthOf(password: string): { score: number; label: string; tone: "danger" | "warning" | "success" } {
  let classes = 0;
  if (/[a-z]/.test(password)) classes += 1;
  if (/[A-Z]/.test(password)) classes += 1;
  if (/[0-9]/.test(password)) classes += 1;
  if (/[^A-Za-z0-9]/.test(password)) classes += 1;
  const raw = password.length * 4 + classes * 10;
  const score = Math.max(0, Math.min(100, raw));
  if (password.length < 8 || classes <= 1) return { score, label: "Weak", tone: "danger" };
  if (password.length < 14 || classes <= 2) return { score, label: "Fair", tone: "warning" };
  return { score, label: "Strong", tone: "success" };
}

export function RootPasswordPanel({ vpsId }: { vpsId: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const strength = useMemo(() => strengthOf(password), [password]);

  const mutation = useApiMutation<{ newPassword: string; confirmPassword: string }, ActionSuccess>({
    mutationFn: (body) =>
      apiFetch<ActionSuccess>(`/api/vps/${vpsId}/root-password`, { method: "POST", body }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "tasks"], ["vps", vpsId, "info"]],
  });

  const mismatch = confirm.length > 0 && confirm !== password;
  const tooShort = password.length > 0 && password.length < 8;
  const canSubmit = password.length >= 8 && password === confirm && !mutation.isPending;

  return (
    <Panel>
      <PanelHeader
        title="Root password"
        description="Set a new root password for the guest operating system"
        icon={<ShieldCheck className="h-4 w-4" />}
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const generated = generatePassword();
              setPassword(generated);
              setConfirm(generated);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Generate
          </Button>
        }
      />
      <PanelBody className="space-y-4">
        <InlineAlert tone="warning" title="This changes live access credentials">
          The server applies the new password immediately. Store it in a password manager before continuing.
        </InlineAlert>
        <div className="space-y-1.5">
          <Label htmlFor="root-password">New root password</Label>
          <div className="flex items-center gap-2">
            <Input
              id="root-password"
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="font-mono"
            />
            {password ? <CopyButton value={password} label="Copy" /> : null}
          </div>
          {password ? (
            <div className="flex items-center gap-3 pt-1">
              <Meter value={strength.score} tone={strength.tone} className="max-w-[12rem]" />
              <span className="text-2xs text-content-subtle">{strength.label} password</span>
            </div>
          ) : null}
          {tooShort ? <p className="text-xs text-danger">Use at least 8 characters.</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="root-password-confirm">Confirm password</Label>
          <Input
            id="root-password-confirm"
            type="text"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            className="font-mono"
          />
          {mismatch ? <p className="text-xs text-danger">Passwords do not match.</p> : null}
        </div>
        <Button
          variant="primary"
          disabled={!canSubmit}
          onClick={() => mutation.mutate({ newPassword: password, confirmPassword: confirm })}
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Change root password
        </Button>
      </PanelBody>
    </Panel>
  );
}
