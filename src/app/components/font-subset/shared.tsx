import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { C } from "./constants";

export function Card({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 16,
        padding: 20,
        border: `1px solid ${C.border}`,
        boxShadow: `0 2px 12px ${C.shadow}`,
      }}
    >
      {children}
    </div>
  );
}

export function StepBadge({ n }: { n: number }) {
  return (
    <div
      style={{
        width: 23,
        height: 23,
        borderRadius: 7,
        background: C.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        color: C.white,
        flexShrink: 0,
      }}
    >
      {n}
    </div>
  );
}

export function StepLabel({
  n,
  label,
  extra,
}: {
  n: number;
  label: string;
  extra?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        marginBottom: 13,
      }}
    >
      <StepBadge n={n} />
      <span style={{ fontSize: 14, fontWeight: 700, color: C.textDark }}>
        {label}
      </span>
      {extra && (
        <span style={{ fontSize: 12, color: C.textMuted, marginLeft: "auto" }}>
          {extra}
        </span>
      )}
    </div>
  );
}

export function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        color: C.danger,
        background: C.dangerBg,
        border: `1px solid ${C.dangerBdr}`,
        borderRadius: 9,
        padding: "9px 14px",
        fontSize: 12,
        marginTop: 8,
      }}
    >
      <AlertCircle size={13} /> {msg}
    </div>
  );
}
