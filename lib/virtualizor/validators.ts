import { z } from "zod";

/** Shared validation schemas for API route inputs. */

export const hostnameSchema = z
  .string()
  .trim()
  .min(1, "Hostname is required.")
  .max(253, "Hostname is too long.")
  .regex(
    /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/,
    "Enter a valid hostname (letters, numbers, dots and hyphens).",
  );

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.");

export const passwordChangeSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const vpsIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "VPS ID must be numeric.");

export const powerActionSchema = z.object({
  action: z.enum(["start", "stop", "restart", "poweroff"]),
});

export const osReinstallSchema = z
  .object({
    osId: z.union([z.string(), z.number()]).transform((value) => String(value)),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
    rebuildSshKey: z.boolean().optional(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const firewallRuleSchema = z.object({
  name: z.string().trim().min(1, "Rule name is required.").max(64),
  defaultPolicy: z.enum(["ACCEPT", "DROP"]).optional(),
  note: z.string().trim().max(255).optional(),
  rules: z
    .array(
      z.object({
        action: z.enum(["ACCEPT", "DROP"]),
        protocol: z.enum(["TCP", "UDP", "ICMP", "ALL"]),
        port: z.string().trim().max(64).optional(),
        source: z.string().trim().max(128).optional(),
        destination: z.string().trim().max(128).optional(),
      }),
    )
    .min(1, "At least one rule is required."),
});

export const firewallDeleteSchema = z.object({
  planIds: z.array(z.union([z.string(), z.number()]).transform((value) => String(value))).min(1),
});

const OPENSSH_KEY_PATTERN =
  /^(ssh-(rsa|ed25519|dss)|ecdsa-sha2-nistp(256|384|521)|sk-(ssh-ed25519|ecdsa-sha2-nistp256)) [A-Za-z0-9+/=]+( \S+)?$/;

export const sshKeySchema = z.object({
  name: z.string().trim().min(1, "Key name is required.").max(64),
  value: z
    .string()
    .trim()
    .min(1, "Public key is required.")
    .max(8_192, "Public key is too long.")
    .regex(OPENSSH_KEY_PATTERN, "Enter a valid OpenSSH public key."),
});

export const sshKeyEditSchema = sshKeySchema.extend({
  keyId: z.union([z.string(), z.number()]).transform((value) => String(value)),
});

export const applySshKeysSchema = z.object({
  keyIds: z.array(z.union([z.string(), z.number()])).min(1, "Select at least one SSH key."),
});

export const volumeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Volume name is required.")
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dots, underscores or hyphens."),
  size: z.coerce.number().positive("Volume size must be greater than zero.").max(1_048_576),
  format: z.enum(["ext4", "ext3", "xfs", "btrfs"]).default("ext4"),
  attach: z.boolean().optional(),
  mountPoint: z
    .string()
    .trim()
    .regex(/^\/[A-Za-z0-9._/-]*$/, "Mount point must be an absolute path.")
    .max(255)
    .optional(),
});

export const volumeDeleteSchema = z.object({
  volumeId: z.union([z.string(), z.number()]).transform((value) => String(value)),
});

export const backupIdSchema = z.object({
  backupId: z.union([z.string(), z.number()]).transform((value) => String(value)),
});

export const killProcessSchema = z.object({
  pids: z.array(z.union([z.string(), z.number()])).min(1, "Select at least one process."),
});

export const serviceActionSchema = z.object({
  action: z.enum(["start", "stop", "restart"]),
  services: z.array(z.string().trim().min(1)).min(1, "Select at least one service."),
});

export const reverseDnsSchema = z.object({
  ip: z.string().trim().ip({ version: "v4", message: "Enter a valid IPv4 address." }),
  domain: hostnameSchema,
});

export const reverseDnsDeleteSchema = z.object({
  recordId: z.union([z.string(), z.number()]).transform((value) => String(value)),
});

export const dnsRecordSchema = z.object({
  domainId: z.union([z.string(), z.number()]).transform((value) => String(value)),
  name: z.string().trim().min(1, "Record name is required.").max(255),
  type: z.enum(["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SRV"]),
  content: z.string().trim().min(1, "Record value is required.").max(512),
  priority: z.coerce.number().int().min(0).max(65535).optional(),
  ttl: z.coerce.number().int().min(0).max(2_147_483_647).optional(),
});

export const dnsRecordEditSchema = dnsRecordSchema.extend({
  recordId: z.union([z.string(), z.number()]).transform((value) => String(value)),
});

export const dnsZoneIdSchema = z.object({
  zoneId: z.union([z.string(), z.number()]).transform((value) => String(value)),
});

export const isoAddSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required.").max(255),
  isoUrl: z
    .string()
    .trim()
    .url("Enter a valid URL.")
    .refine((value) => value.startsWith("https://"), "The ISO URL must use HTTPS."),
});

export const isoDeleteSchema = z.object({
  isoId: z.union([z.string(), z.number()]).transform((value) => String(value)),
});

export const apiKeyIdSchema = z.object({
  keyId: z.union([z.string(), z.number()]).transform((value) => String(value)),
});

export const vncPasswordSchema = z.object({
  password: z
    .string()
    .min(6, "VNC password must be at least 6 characters.")
    .max(8, "VNC passwords are limited to 8 characters by the protocol."),
});

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required.").max(256),
});

export type FirewallRuleInput = z.infer<typeof firewallRuleSchema>;
export type SshKeyInput = z.infer<typeof sshKeySchema>;
export type VolumeInput = z.infer<typeof volumeSchema>;
export type DnsRecordInput = z.infer<typeof dnsRecordSchema>;
export type IsoAddInput = z.infer<typeof isoAddSchema>;
export type PowerActionInput = z.infer<typeof powerActionSchema>;

/** Flatten a ZodError into a single human readable message. */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join(" ");
}
