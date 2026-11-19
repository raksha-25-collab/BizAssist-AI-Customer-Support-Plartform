import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Database,
  Download,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  AnalyticsSummary,
  HealthStatus,
  Ticket,
  UserProfile,
} from '../types';
import { api } from '../lib/api';
import { Avatar, SeverityLabel, StatusLabel, formatRelativeTime } from './SharedUI';

export type AdminScreen = 'dashboard' | 'tickets' | 'assign' | 'analytics' | 'config';

interface AdminViewsProps {
  screen: AdminScreen;
  setScreen: (s: AdminScreen) => void;
  user: UserProfile;
  tickets: Ticket[];
  profiles: UserProfile[];
  selectedTicketId: string;
  setSelectedTicketId: (id: string) => void;
  health: HealthStatus | null;
  onRefresh: () => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function AdminViews({
  screen,
  setScreen,
  user,
  tickets,
  profiles,
  selectedTicketId,
  setSelectedTicketId,
  health,
  onRefresh,
  onToast,
}: AdminViewsProps) {
  const [timeframe, setTimeframe] = useState<'Today' | '7D' | '30D' | 'Q3'>('7D');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'P1' | 'unassigned' | 'sla'>('all');
  const [ticketSearch, setTicketSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('staff-sarah');
  const [schemaSql, setSchemaSql] = useState<string>('');

  const specialists = profiles.filter((p) => p.role === 'staff');
  const activeTicket =
    tickets.find((t) => t.id === selectedTicketId) ||
    tickets.find((t) => !t.assignee_id) ||
    tickets[0];

  useEffect(() => {
    if (screen === 'dashboard' || screen === 'analytics') {
      api
        .getAnalytics(timeframe)
        .then((res) => setAnalytics(res.analytics))
        .catch(() => {});
    }
    if (screen === 'config' && !schemaSql) {
      api
        .getSupabaseSchema()
        .then((res) => setSchemaSql(res.sql))
        .catch(() => {});
    }
  }, [screen, timeframe, tickets.length]);

  const handleExportCsv = () => {
    const header = ['Code', 'Title', 'Company', 'Severity', 'Status', 'Assignee', 'SLA Mins Left'];
    const rows = tickets.map((t) => [
      t.code,
      `"${t.title.replace(/"/g, '""')}"`,
      t.company,
      t.severity,
      t.status,
      t.assignee_name || 'Unassigned',
      String(t.sla_minutes_left),
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bizassist-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Exported ticket logs to CSV.');
  };

  // =========================================================
  // 1. ADMIN EXECUTIVE DASHBOARD
  // =========================================================
  if (screen === 'dashboard') {
    const priorityIncident =
      tickets.find((t) => t.severity === 'P1' && t.status !== 'resolved') || tickets[0];
    return (
      <div className="space-y-6">
        <div className="card-surface rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#E43D12]">ACME GLOBAL PROD</p>
            <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
              Admin Executive Dashboard
            </h1>
          </div>
          <span className="px-4 py-2 rounded-full bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-bold text-[#D6536D] tabular-nums">
            SLA 99.98% Live
          </span>
        </div>

        {/* Autonomic Healing Banner */}
        <div className="card-surface rounded-3xl p-5 bg-[#F7F6F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#D6536D]">AUTONOMIC HEALING</span>
              <span className="text-[#686660]">· +12m safe margin</span>
            </div>
            <div className="font-display text-lg font-bold text-[#1E1E24]">
              Cluster IdP Handshake Incident Remediated
            </div>
            <div className="text-xs text-[#686660]">
              Log Reference: <span className="font-mono font-semibold">RB-402</span> · Telemetry
              Synced
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScreen('analytics')}
            className="px-4 h-10 rounded-xl bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] shrink-0"
          >
            Operations Command
          </button>
        </div>

        {/* 4 KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-surface rounded-3xl p-5 space-y-1">
            <div className="text-[11px] font-bold text-[#686660]">TOTAL INCIDENTS</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums">
              {analytics?.total_ingest ? Math.round(analytics.total_ingest / 10) : 142}
            </div>
            <div className="text-xs font-semibold text-[#D6536D]">
              {tickets.filter((t) => t.severity === 'P1').length} P1 Active
            </div>
          </div>

          <div className="card-surface rounded-3xl p-5 space-y-1">
            <div className="text-[11px] font-bold text-[#686660]">SLA COMPLIANCE</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums">
              99.4%
            </div>
            <div className="text-xs text-emerald-700 font-semibold">Target &gt;99.0% · Optimal</div>
          </div>

          <div className="card-surface rounded-3xl p-5 space-y-1">
            <div className="text-[11px] font-bold text-[#686660]">AVG MTTR</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums">
              14m 20s
            </div>
            <div className="text-xs font-semibold text-[#E43D12]">Beat by 3m 40s</div>
          </div>

          <div className="card-surface rounded-3xl p-5 space-y-1">
            <div className="text-[11px] font-bold text-[#686660]">ON-CALL STAFF</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums">
              18 <span className="text-base text-[#686660]">/ 20</span>
            </div>
            <div className="text-xs text-[#D6536D] font-semibold">
              Queue: {tickets.filter((t) => !t.assignee_id).length + 1} Triage
            </div>
          </div>
        </div>

        {/* Priority Incident Card */}
        {priorityIncident && (
          <div className="card-surface rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-lg bg-[#E43D12] text-white font-bold">
                  {priorityIncident.severity} CRITICAL
                </span>
                <span className="font-mono font-bold text-[#1E1E24]">
                  {priorityIncident.code}
                </span>
              </div>
              <span className="font-mono font-semibold text-[#E43D12] tabular-nums">
                {priorityIncident.sla_minutes_left}m 30s
              </span>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-[#1E1E24]">
                {priorityIncident.title}
              </h2>
              <p className="text-xs text-[#686660] mt-1">
                {priorityIncident.company} · {priorityIncident.cluster_name}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  src="/src/assets/images/avatar_sarah_1795079071848.jpg"
                  name={priorityIncident.assignee_name || 'Unassigned'}
                  size="sm"
                />
                <div>
                  <div className="text-xs font-bold text-[#1E1E24]">
                    {priorityIncident.assignee_name || 'Unassigned'}
                  </div>
                  <div className="text-[11px] text-[#686660]">
                    {priorityIncident.assignee_tier || 'Needs Specialist Triage'}
                  </div>
                </div>
              </div>
              <StatusLabel status={priorityIncident.status} />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedTicketId(priorityIncident.id);
                  setScreen('assign');
                }}
                className="flex-1 h-11 rounded-full bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
              >
                Reassign Staff
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTicketId(priorityIncident.id);
                  setScreen('assign');
                }}
                className="flex-1 h-11 rounded-full bg-[#E43D12] text-white text-xs font-semibold"
              >
                Triage Room
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // 2. OPERATIONS COMMAND & ANALYTICS DASHBOARD
  // =========================================================
  if (screen === 'analytics') {
    const pts = analytics?.velocity_points || [
      { label: 'Mon', ingest: 185, resolved: 179 },
      { label: 'Tue', ingest: 210, resolved: 204 },
      { label: 'Wed', ingest: 198, resolved: 196 },
      { label: 'Thu', ingest: 245, resolved: 239 },
      { label: 'Fri', ingest: 268, resolved: 254 },
      { label: 'Sat', ingest: 190, resolved: 186 },
      { label: 'Sun', ingest: 186, resolved: 181 },
    ];
    const maxVal = Math.max(...pts.map((p) => p.ingest), 1);
    const polyPoints = pts
      .map((p, idx) => {
        const x = (idx / (pts.length - 1)) * 560 + 20;
        const y = 130 - (p.ingest / maxVal) * 95;
        return `${x},${y}`;
      })
      .join(' ');
    const resolvedPoints = pts
      .map((p, idx) => {
        const x = (idx / (pts.length - 1)) * 560 + 20;
        const y = 130 - (p.resolved / maxVal) * 95;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#E43D12]">INTELLIGENCE SUITE</p>
            <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
              Operations Command
            </h1>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F7F6F2] rounded-2xl border border-[#E4DFD7]">
            {(['Today', '7D', '30D', 'Q3'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold ${
                  timeframe === tf ? 'bg-[#E43D12] text-white' : 'text-[#686660]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Metric Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-surface rounded-3xl p-5">
            <div className="text-[11px] font-bold text-[#686660]">TOTAL INGEST</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums mt-1">
              {(analytics?.total_ingest || 1482).toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-[#E43D12] mt-1">+12% prev</div>
          </div>
          <div className="card-surface rounded-3xl p-5">
            <div className="text-[11px] font-bold text-[#686660]">PENDING</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums mt-1">
              {analytics?.pending || 68}
            </div>
            <div className="text-xs text-[#9E6F06] font-semibold mt-1">
              {analytics?.sla_at_risk || 14} at SLA risk
            </div>
          </div>
          <div className="card-surface rounded-3xl p-5">
            <div className="text-[11px] font-bold text-[#686660]">RESOLVED</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums mt-1">
              {(analytics?.resolved || 1414).toLocaleString()}
            </div>
            <div className="text-xs text-emerald-700 font-semibold mt-1">95.4% CSAT</div>
          </div>
          <div className="card-surface rounded-3xl p-5">
            <div className="text-[11px] font-bold text-[#686660]">AI HANDLED</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums mt-1">
              {(analytics?.ai_handled || 642).toLocaleString()}
            </div>
            <div className="text-xs text-[#D6536D] font-semibold mt-1">45.4% Zero-Touch</div>
          </div>
        </div>

        {/* Velocity & Trend Chart + Severity Tiers */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 card-surface rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#1E1E24]">
                Velocity &amp; Trend
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-[#E43D12] font-semibold">Ingest</span>
                <span className="text-[#D6536D] font-semibold">Resolved</span>
                <span className="text-[#686660] tabular-nums">Avg: 18m</span>
              </div>
            </div>
            <svg viewBox="0 0 600 160" className="w-full h-44 overflow-visible">
              <polyline
                fill="none"
                stroke="#E43D12"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polyPoints}
              />
              <polyline
                fill="none"
                stroke="#D6536D"
                strokeWidth="2.5"
                strokeDasharray="5 5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={resolvedPoints}
              />
              {pts.map((p, idx) => {
                const x = (idx / (pts.length - 1)) * 560 + 20;
                return (
                  <text
                    key={p.label}
                    x={x}
                    y={155}
                    textAnchor="middle"
                    className="fill-[#686660] text-[11px]"
                  >
                    {p.label}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="lg:col-span-5 card-surface rounded-3xl p-6 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-[#1E1E24]">Severity Tiers</h2>
                <span className="text-xs text-[#686660] tabular-nums">14% P1 · 52% Med · 34% Low</span>
              </div>
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-[#F7F6F2]">
                <div className="bg-[#E43D12] h-full" style={{ width: '14%' }} />
                <div className="bg-[#D6536D] h-full" style={{ width: '52%' }} />
                <div className="bg-[#EFB11D] h-full" style={{ width: '34%' }} />
              </div>
              <div className="flex items-center justify-between text-xs font-semibold tabular-nums pt-1">
                <span className="text-[#E43D12]">
                  High: {analytics?.severity_counts.high || 98}
                </span>
                <span className="text-[#D6536D]">
                  Med: {analytics?.severity_counts.med || 364}
                </span>
                <span className="text-[#9E6F06]">
                  Low: {analytics?.severity_counts.low || 238}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-[#E4DFD7]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1E1E24]">Specialist Shift Board</span>
                <span className="text-[#686660]">{specialists.length} Active</span>
              </div>
              {specialists.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-xs py-1.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar src={s.avatar_url} name={s.full_name} size="sm" />
                    <div>
                      <span className="font-bold text-[#1E1E24]">{s.full_name}</span>
                      <span className="text-[#686660] ml-2">
                        {s.resolved_month} res · {s.avg_resolve_mins}m
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#E43D12] tabular-nums">
                    {s.csat_score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // 3. MANAGE ALL TICKETS
  // =========================================================
  if (screen === 'tickets') {
    const filtered = tickets.filter((t) => {
      const q = ticketSearch.toLowerCase();
      const matchSearch =
        !q ||
        t.code.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q) ||
        (t.assignee_name || '').toLowerCase().includes(q);
      const matchTab =
        ticketFilter === 'all'
          ? true
          : ticketFilter === 'P1'
            ? t.severity === 'P1'
            : ticketFilter === 'unassigned'
              ? !t.assignee_id
              : t.sla_minutes_left <= 10 && t.status !== 'resolved';
      return matchSearch && matchTab;
    });

    const toggleSelect = (id: string) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#E43D12]">
              SLA TELEMETRY LIVE · BREACHES: 0
            </p>
            <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
              All Tickets <span className="text-[#E43D12] tabular-nums">({tickets.length})</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  await Promise.all(
                    selectedIds.map((id) => api.assignTicket(id, 'staff-sarah'))
                  );
                  setSelectedIds([]);
                  await onRefresh();
                  onToast('Bulk assigned selected tickets to Sarah Lin.');
                }}
                className="px-4 h-10 rounded-full bg-[#E43D12] text-white text-xs font-semibold"
              >
                Bulk Assign ({selectedIds.length})
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 h-10 rounded-full bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Logs
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#686660] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              placeholder="Ticket #, customer, specialist, error code..."
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
            />
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-[#F7F6F2] rounded-2xl border border-[#E4DFD7] overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'P1', label: 'P1 Critical' },
              { id: 'unassigned', label: 'Unassigned' },
              { id: 'sla', label: 'SLA Risk' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTicketFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
                  ticketFilter === tab.id ? 'bg-[#1E1E24] text-white' : 'text-[#686660]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((t) => (
            <div key={t.id} className="card-surface rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    className="w-4 h-4 accent-[#E43D12]"
                  />
                  <span className="font-mono text-xs font-bold text-[#E43D12]">{t.code}</span>
                  <span className="text-xs text-[#686660]">{t.company}</span>
                </div>
                <SeverityLabel severity={t.severity} />
              </div>

              <h3 className="font-display text-lg font-bold text-[#1E1E24]">{t.title}</h3>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src="/src/assets/images/avatar_elena_1795079072007.jpg"
                    name={t.customer_name}
                    size="sm"
                  />
                  <div>
                    <div className="font-bold text-[#1E1E24]">{t.customer_name}</div>
                    <div className="text-[#686660]">{t.customer_role}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-[#686660]">SPECIALIST</div>
                  <div className="font-bold text-[#1E1E24]">
                    {t.assignee_name || 'Unassigned'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E4DFD7]">
                <span className="text-xs font-semibold text-[#D6536D]">
                  Auto-Triage Match: {t.ai_diagnosis?.confidence || 94}%
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setScreen('assign');
                    }}
                    className="px-4 h-9 rounded-full bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
                  >
                    Reassign
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setScreen('assign');
                    }}
                    className="px-4 h-9 rounded-full bg-[#E43D12] text-white text-xs font-semibold"
                  >
                    {t.assignee_id ? 'Triage' : 'Assign Specialist Now'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================
  // 4. ASSIGN TICKETS TO STAFF / TICKET DETAIL TRIAGE
  // =========================================================
  if (screen === 'assign' && activeTicket) {
    const selectedSpec =
      specialists.find((s) => s.id === selectedAssigneeId) || specialists[0];
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setScreen('tickets')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#686660]"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel &amp; Return to Queue
          </button>
          <span className="font-mono text-xs font-bold text-[#E43D12]">{activeTicket.code}</span>
        </div>

        <div className="card-surface rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between text-xs">
            <span className="px-3 py-1 rounded-full bg-[#E43D12]/10 text-[#E43D12] font-bold">
              {activeTicket.severity} CRITICAL INCIDENT
            </span>
            <span className="font-mono font-bold text-[#E43D12] tabular-nums">
              07:05 SLA Clock
            </span>
          </div>

          <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
            {activeTicket.title}
          </h1>
          <p className="text-xs text-[#686660]">
            {activeTicket.company} · Tier-1 Enterprise · Opened{' '}
            {formatRelativeTime(activeTicket.created_at)}
          </p>

          <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] space-y-1">
            <div className="text-xs font-bold text-[#E43D12]">ROOT ANOMALY DETECTED</div>
            <p className="text-sm text-[#1E1E24]">
              {activeTicket.ai_diagnosis?.predicted_root_cause || activeTicket.payload_description}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FFA2B6]/15 border border-[#D6536D]/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#D6536D] inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                AI COPILOT RECOMMENDATION
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-xs font-bold text-[#1E1E24] tabular-nums">
                {activeTicket.ai_diagnosis?.confidence || 96}% Match
              </span>
            </div>
            <div className="font-display text-lg font-bold text-[#1E1E24]">
              {activeTicket.ai_diagnosis?.recommended_assignee_name || 'Sarah Lin'} (Tier-2 Infra)
            </div>
            <p className="text-xs text-[#686660]">
              Resolved identical incident class in 18m. On-call shift currently active with
              immediate context readiness.
            </p>
            <div className="flex items-center gap-6 text-xs font-semibold text-[#1E1E24]">
              <span>Skill Fit: {activeTicket.ai_diagnosis?.skill_fit || 'L4 Gateway & IdP'}</span>
              <span>Avg MTTR: 14m</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#1E1E24]">
                Available Specialists
              </h2>
              <span className="text-xs text-[#686660]">{specialists.length} Active in Pool</span>
            </div>

            <div className="space-y-2.5">
              {specialists.map((spec) => {
                const loadPct = Math.round((spec.active_load / Math.max(spec.max_load, 1)) * 100);
                const isSelected = selectedAssigneeId === spec.id;
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => setSelectedAssigneeId(spec.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-colors flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-white border-[#E43D12] ring-1 ring-[#E43D12]'
                        : 'bg-[#F7F6F2] border-[#E4DFD7] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={spec.avatar_url} name={spec.full_name} online={spec.on_call} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1E1E24]">
                            {spec.full_name}
                          </span>
                          {spec.id === 'staff-sarah' && (
                            <span className="text-[11px] font-bold text-[#D6536D]">
                              COPILOT PICK
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#686660]">{spec.title}</div>
                        <div className="text-[11px] text-[#686660] mt-1 tabular-nums">
                          {spec.active_load} Active ({loadPct}% load)
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-[#E43D12] bg-[#E43D12] text-white' : 'border-[#686660]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              await api.assignTicket(activeTicket.id, selectedAssigneeId);
              await onRefresh();
              onToast(
                `Dispatched ${activeTicket.code} to ${selectedSpec?.full_name || 'Specialist'}.`
              );
              setScreen('tickets');
            }}
            className="w-full h-12 rounded-full bg-[#E43D12] text-white font-display font-semibold text-sm"
          >
            Dispatch &amp; Assign to {selectedSpec?.full_name || 'Specialist'}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // 5. ADMIN CONFIG & SUPABASE BACKEND INTEGRATION VIEW
  // =========================================================
  if (screen === 'config') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <p className="text-xs font-bold text-[#E43D12]">SYSTEM CONFIGURATION</p>
          <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
            Supabase Backend &amp; Staff Governance
          </h1>
          <p className="text-sm text-[#686660]">
            PostgreSQL persistence, Realtime channels, and on-call roster configuration.
          </p>
        </div>

        {/* Supabase Status Card (no key input fields!) */}
        <div className="card-surface rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#E43D12]/10 text-[#E43D12] flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-[#1E1E24]">
                  Supabase PostgreSQL Integration
                </h2>
                <p className="text-xs text-[#686660]">
                  Active Driver:{' '}
                  <strong className="text-[#1E1E24]">
                    {health?.supabaseConfigured
                      ? 'Supabase PostgreSQL (@supabase/supabase-js)'
                      : 'Local Persistent Workspace Store (Supabase Ready)'}
                  </strong>
                </p>
              </div>
            </div>
            <span
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
                health?.supabaseConfigured
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-[#F7F6F2] text-[#9E6F06]'
              }`}
            >
              {health?.supabaseConfigured ? 'Connected to Supabase' : 'Awaiting Env Secrets'}
            </span>
          </div>

          <p className="text-xs text-[#686660] leading-relaxed">
            Configure <code className="font-mono">SUPABASE_URL</code>,{' '}
            <code className="font-mono">SUPABASE_ANON_KEY</code>, and{' '}
            <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in{' '}
            <strong>Settings &gt; Secrets</strong>, then run the SQL schema below in your Supabase
            SQL Editor.
          </p>

          {schemaSql && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E1E24]">supabase/schema.sql</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(schemaSql);
                    onToast('Copied supabase/schema.sql to clipboard.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy SQL
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-[#1E1E24] text-[#F7F6F2] text-xs font-mono overflow-x-auto max-h-64">
                {schemaSql}
              </pre>
            </div>
          )}
        </div>

        {/* Staff Governance */}
        <div className="card-surface rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#1E1E24] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D6536D]" />
              Specialist Shift Governance
            </h2>
            <span className="text-xs text-[#686660]">{specialists.length} Specialists</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {specialists.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={s.avatar_url} name={s.full_name} online={s.on_call} />
                  <div>
                    <div className="text-sm font-bold text-[#1E1E24]">{s.full_name}</div>
                    <div className="text-xs text-[#686660]">{s.title}</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-700">
                  {s.csat_score}% CSAT
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
