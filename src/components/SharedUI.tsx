import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import type { TicketSeverity, TicketStatus } from '../types';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <div className="w-9 h-9 rounded-xl bg-[#E43D12] text-white flex items-center justify-center font-display font-bold text-lg shadow-sm">
        B
      </div>
      {!compact && (
        <span className="font-display font-bold text-lg tracking-tight text-[#1E1E24] whitespace-nowrap">
          BizAssist
        </span>
      )}
    </div>
  );
}

export function Avatar({
  src,
  name,
  size = 'md',
  online = false,
}: {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const sizeClass =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
        ? 'w-12 h-12 text-sm'
        : size === 'xl'
          ? 'w-16 h-16 text-base'
          : 'w-10 h-10 text-xs';

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`relative shrink-0 ${sizeClass}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full rounded-full object-cover border border-[#E4DFD7] bg-[#F7F6F2]"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-[#D6536D]/15 text-[#D6536D] border border-[#E4DFD7] flex items-center justify-center font-display font-bold">
          {initials}
        </div>
      )}
      {online && (
        <span
          aria-label="Online"
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white"
        />
      )}
    </div>
  );
}

export function SeverityLabel({ severity }: { severity: TicketSeverity }) {
  const isCritical = severity === 'P1';
  const isHigh = severity === 'P2';
  const textColor = isCritical
    ? 'text-[#E43D12]'
    : isHigh
      ? 'text-[#9E6F06]'
      : 'text-[#686660]';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${textColor}`}>
      {isCritical ? (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Clock className="w-3.5 h-3.5 shrink-0" />
      )}
      {severity === 'P1'
        ? 'P1 Critical'
        : severity === 'P2'
          ? 'P2 High'
          : severity === 'P3'
            ? 'P3 Medium'
            : severity}
    </span>
  );
}

export function StatusLabel({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, { label: string; color: string }> = {
    open: { label: 'Open / Triage', color: 'text-[#D6536D]' },
    in_progress: { label: 'In Progress', color: 'text-[#E43D12]' },
    waiting_customer: { label: 'Waiting on Customer', color: 'text-[#9E6F06]' },
    escalated: { label: 'Escalated Tier-3', color: 'text-[#BA1A1A]' },
    pending_verification: { label: 'Pending Verification', color: 'text-[#D6536D]' },
    resolved: { label: 'Resolved & Closed', color: 'text-emerald-700' },
  };
  const info = map[status] || { label: status, color: 'text-[#686660]' };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${info.color}`}>
      {status === 'resolved' ? (
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
      )}
      {info.label}
    </span>
  );
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ToastBanner({
  message,
  type = 'success',
  onClose,
}: {
  message: string | null;
  type?: 'success' | 'error';
  onClose: () => void;
}) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={`fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 max-w-sm rounded-2xl px-4 py-3 shadow-lg border flex items-center justify-between gap-3 transition-transform ${
        type === 'error'
          ? 'bg-[#FFF5F5] border-[#E43D12]/30 text-[#93000A]'
          : 'bg-[#1E1E24] border-[#1E1E24] text-white'
      }`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-xs font-semibold opacity-80 hover:opacity-100 px-2 py-1"
      >
        Dismiss
      </button>
    </div>
  );
}
