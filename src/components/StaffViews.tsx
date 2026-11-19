import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  FileCode2,
  MessageSquare,
  Play,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  AppNotification,
  Runbook,
  Ticket,
  TicketMessage,
  TicketStatus,
  UserProfile,
} from '../types';
import { api } from '../lib/api';
import { Avatar, SeverityLabel, StatusLabel, formatRelativeTime } from './SharedUI';

export type StaffScreen =
  | 'dashboard'
  | 'queue'
  | 'ticket_detail'
  | 'update_status'
  | 'resolve'
  | 'chat'
  | 'profile';

interface StaffViewsProps {
  screen: StaffScreen;
  setScreen: (s: StaffScreen) => void;
  user: UserProfile;
  tickets: Ticket[];
  selectedTicketId: string;
  setSelectedTicketId: (id: string) => void;
  notifications: AppNotification[];
  runbooks: Runbook[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function StaffViews({
  screen,
  setScreen,
  user,
  tickets,
  selectedTicketId,
  setSelectedTicketId,
  notifications,
  runbooks,
  onRefresh,
  onToast,
}: StaffViewsProps) {
  const [queueFilter, setQueueFilter] = useState<'all' | 'P1' | 'in_progress' | 'waiting_customer'>(
    'all'
  );
  const [queueSearch, setQueueSearch] = useState('');
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [draftingReply, setDraftingReply] = useState(false);
  const [urgentRouting, setUrgentRouting] = useState(user.urgent_routing);

  // Update status state
  const [nextStatus, setNextStatus] = useState<TicketStatus>('in_progress');
  const [transitionReason, setTransitionReason] = useState(
    'Canary Deployment Successful (Cluster v2.14)'
  );
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  // Resolve ticket state
  const [rootCauseClass, setRootCauseClass] = useState('Infrastructure -> IdP TLS Certificate Expiration');
  const [remediationMethod, setRemediationMethod] = useState('Automated Runbook RB-402');
  const [internalNotes, setInternalNotes] = useState(
    'Rotated expired wildcard IdP x.509 cert in cluster-east via KMS secret store. Staged synthetic payment probes across 8 regions with 0 error rate.'
  );
  const [customerSummary, setCustomerSummary] = useState(
    'The expired SSL cert on our IdP gateway has been hot-swapped and validated. All stalled webhook queues have drained successfully.'
  );

  useEffect(() => {
    setUrgentRouting(user.urgent_routing);
  }, [user.urgent_routing]);

  const activeTicket =
    tickets.find((t) => t.id === selectedTicketId) ||
    tickets.find((t) => t.status !== 'resolved') ||
    tickets[0];

  useEffect(() => {
    if (activeTicket && (screen === 'chat' || screen === 'ticket_detail')) {
      api
        .getTicketDetail(activeTicket.id)
        .then((res) => setMessages(res.messages))
        .catch(() => {});
    }
    if (activeTicket) {
      setNextStatus(activeTicket.status);
    }
  }, [screen, activeTicket?.id]);

  const handleAcceptTicket = async (ticket: Ticket) => {
    await api.assignTicket(ticket.id, user.id);
    await onRefresh();
    setSelectedTicketId(ticket.id);
    onToast(`Accepted ${ticket.code} into your active queue.`);
  };

  const handleAiDraft = async (mode: 'chat_reply' | 'resolution_summary') => {
    if (!activeTicket) return;
    setDraftingReply(true);
    try {
      const { draft } = await api.draftReply({
        ticketCode: activeTicket.code,
        ticketTitle: activeTicket.title,
        customerName: activeTicket.customer_name,
        payloadDescription: activeTicket.payload_description,
        mode,
      });
      if (mode === 'resolution_summary') {
        setCustomerSummary(draft);
      } else {
        setChatInput(draft);
      }
      onToast('Gemini AI draft generated.');
    } catch (err: any) {
      onToast(err.message || 'AI draft failed', 'error');
    } finally {
      setDraftingReply(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !activeTicket) return;
    await api.sendTicketMessage(activeTicket.id, {
      sender_id: user.id,
      sender_name: user.full_name,
      sender_role: 'staff',
      message_type: 'text',
      body: chatInput.trim(),
    });
    setChatInput('');
    const detail = await api.getTicketDetail(activeTicket.id);
    setMessages(detail.messages);
  };

  // =========================================================
  // 1. STAFF DASHBOARD & WORKLOAD
  // =========================================================
  if (screen === 'dashboard') {
    const activeAssigned = tickets.filter((t) => t.status !== 'resolved');
    const unassigned = tickets.filter((t) => !t.assignee_id && t.status !== 'resolved');
    const resolvedToday = tickets.filter((t) => t.status === 'resolved').length + 7;
    const priorityTicket = activeAssigned[0] || tickets[0];

    return (
      <div className="space-y-6">
        {/* Specialist Profile & Gateway SLA Header */}
        <div className="card-surface rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar src={user.avatar_url} name={user.full_name} size="lg" online />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-xl font-bold text-[#1E1E24]">
                  {user.full_name}
                </h1>
                <span className="text-xs font-semibold text-[#D6536D]">{user.tier}</span>
              </div>
              <p className="text-xs text-[#686660] mt-0.5">{user.shift_label}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7]">
            <TrendingUp className="w-4 h-4 text-[#E43D12]" />
            <div>
              <div className="text-[11px] font-semibold text-[#686660]">
                Gateway SLA Telemetry
              </div>
              <div className="font-mono text-sm font-bold text-[#1E1E24] tabular-nums">
                99.98%
              </div>
            </div>
          </div>
        </div>

        {/* 4 KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-surface rounded-3xl p-5 space-y-1.5">
            <div className="text-[11px] font-bold text-[#686660]">ASSIGNED TO ME</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums">
              {activeAssigned.length} <span className="text-sm font-medium">Active</span>
            </div>
            <div className="text-xs font-semibold text-[#E43D12]">
              {activeAssigned.filter((t) => t.severity === 'P1').length} P1 SLA Warning
            </div>
          </div>

          <div className="card-surface rounded-3xl p-5 space-y-1.5">
            <div className="text-[11px] font-bold text-[#686660]">QUEUE BACKLOG</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums">
              {12 + unassigned.length} <span className="text-sm font-medium">Waiting</span>
            </div>
            <div className="text-xs text-[#686660]">Avg wait 3.2m</div>
          </div>

          <div className="card-surface rounded-3xl p-5 space-y-1.5">
            <div className="text-[11px] font-bold text-[#686660]">TODAY&apos;S RESOLVED</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums">
              {resolvedToday} <span className="text-sm font-medium">Closed</span>
            </div>
            <div className="text-xs font-semibold text-emerald-700">CSAT {user.csat_score}%</div>
          </div>

          <div className="card-surface rounded-3xl p-5 space-y-1.5">
            <div className="text-[11px] font-bold text-[#686660]">AVG TRIAGE TIME</div>
            <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums">
              04m 12s
            </div>
            <div className="text-xs font-semibold text-emerald-700">Target &lt;10m</div>
          </div>
        </div>

        {/* Priority Incident + In-Queue Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {priorityTicket && (
            <section className="lg:col-span-7 card-surface rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[#686660]">
                    {priorityTicket.code}
                  </span>
                  <SeverityLabel severity={priorityTicket.severity} />
                </div>
                <span className="px-3 py-1 rounded-full bg-[#E43D12] text-white font-semibold tabular-nums">
                  {priorityTicket.sla_minutes_left}m remaining
                </span>
              </div>

              <h2 className="font-display text-xl font-bold text-[#1E1E24]">
                {priorityTicket.title}
              </h2>

              <div className="p-3.5 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    src="/src/assets/images/avatar_elena_1795079072007.jpg"
                    name={priorityTicket.customer_name}
                    size="sm"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#1E1E24]">
                      {priorityTicket.customer_name}
                    </div>
                    <div className="text-[11px] text-[#686660]">
                      {priorityTicket.company} · Platinum Tier
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#D6536D]">Verified</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTicketId(priorityTicket.id);
                  setScreen('ticket_detail');
                }}
                className="w-full h-12 rounded-full bg-[#E43D12] hover:bg-[#c8340e] text-white font-display font-semibold text-sm"
              >
                Open Ticket Details
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTicketId(priorityTicket.id);
                    setScreen('chat');
                  }}
                  className="h-11 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-[#D6536D]" />
                  Quick Reply
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await api.executeRunbook('RB-402', priorityTicket.id);
                    await onRefresh();
                    onToast('Runbook RB-402 executed cleanly.');
                  }}
                  className="h-11 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-[#D6536D]" />
                  Runbook RB-402
                </button>
              </div>
            </section>
          )}

          {/* Support Workspace In-Queue & AI Runbooks */}
          <section className="lg:col-span-5 space-y-4">
            <div className="card-surface rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#1E1E24]">
                  In-Queue Tickets ({unassigned.length + 1})
                </h3>
                <button
                  type="button"
                  onClick={() => setScreen('queue')}
                  className="text-xs font-semibold text-[#E43D12] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2.5">
                {tickets
                  .filter((t) => t.status !== 'resolved')
                  .slice(0, 3)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-semibold text-[#686660]">{t.code}</span>
                          <span className="text-[#686660]">·</span>
                          <span className="font-semibold text-[#1E1E24] truncate">
                            {t.company}
                          </span>
                        </div>
                        <div className="text-xs text-[#686660] truncate mt-0.5">{t.title}</div>
                      </div>
                      {!t.assignee_id ? (
                        <button
                          type="button"
                          onClick={() => handleAcceptTicket(t)}
                          className="px-3 py-1.5 rounded-lg bg-[#E43D12] text-white text-xs font-semibold shrink-0"
                        >
                          Quick Accept
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTicketId(t.id);
                            setScreen('ticket_detail');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] shrink-0"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="card-surface rounded-3xl p-5 bg-[#F7F6F2] flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#1E1E24]">
                  AI Quick Diagnostic Runbook
                </div>
                <div className="text-[11px] text-[#686660]">
                  Automated payload replay verified: 94% confidence
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await api.executeRunbook('RB-402', priorityTicket?.id);
                  onToast('Automated payload replay passed (28s).');
                }}
                className="px-4 py-2 rounded-xl bg-[#D6536D] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                Run
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // =========================================================
  // 2. ASSIGNED TICKETS QUEUE
  // =========================================================
  if (screen === 'queue') {
    const activeList = tickets.filter((t) => {
      const q = queueSearch.toLowerCase();
      const matchSearch =
        !q ||
        t.code.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q);
      const matchFilter =
        queueFilter === 'all'
          ? t.status !== 'resolved'
          : queueFilter === 'P1'
            ? t.severity === 'P1' && t.status !== 'resolved'
            : t.status === queueFilter;
      return matchSearch && matchFilter;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
              Assigned Tickets Queue
            </h1>
            <p className="text-xs text-[#686660]">
              Queue Health · Avg First Reply: 4m 12s · 98.4% SLA
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#686660] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              placeholder="Search ticket ID, customer, keyword..."
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[#F7F6F2] rounded-2xl border border-[#E4DFD7]">
            {[
              { id: 'all', label: 'All Assigned' },
              { id: 'P1', label: 'P1 Critical' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'waiting_customer', label: 'Waiting' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQueueFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
                  queueFilter === tab.id ? 'bg-[#E43D12] text-white' : 'text-[#686660]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {activeList.map((t) => (
            <div key={t.id} className="card-surface rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-[#E43D12]">{t.code}</span>
                  <SeverityLabel severity={t.severity} />
                  <span className="text-[#686660]">·</span>
                  <span className="text-[#686660]">
                    {t.company} · {t.customer_name}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-[#E43D12] tabular-nums">
                  {t.sla_minutes_left}m left · {t.severity === 'P1' ? 'SLA Breach Risk' : 'On Track'}
                </span>
              </div>

              <h3 className="font-display text-lg font-bold text-[#1E1E24]">{t.title}</h3>

              {t.ai_diagnosis && (
                <div className="p-3.5 rounded-2xl bg-[#FFA2B6]/15 border border-[#D6536D]/25 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[#D6536D]">AI Assistant Match: </span>
                    <span className="text-[#1E1E24]">
                      Suggested Runbook {t.ai_diagnosis.recommended_runbook} (
                      {t.ai_diagnosis.runbook_title})
                    </span>
                  </div>
                  <span className="font-bold text-[#1E1E24] tabular-nums shrink-0">
                    {t.ai_diagnosis.confidence}% Confidence
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-xs text-[#686660]">
                  Owner: <strong className="text-[#1E1E24]">{t.assignee_name || 'Unassigned'}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setScreen('chat');
                    }}
                    className="px-4 h-10 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
                  >
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setScreen('ticket_detail');
                    }}
                    className="px-4 h-10 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setScreen('resolve');
                    }}
                    className="px-4 h-10 rounded-xl bg-[#E43D12] text-white text-xs font-semibold"
                  >
                    Resolve &rarr;
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
  // 3. STAFF TICKET DETAILS
  // =========================================================
  if (screen === 'ticket_detail' && activeTicket) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setScreen('queue')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#686660] hover:text-[#1E1E24]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Queue
          </button>
          <StatusLabel status={activeTicket.status} />
        </div>

        <div className="card-surface rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar
                src="/src/assets/images/avatar_elena_1795079072007.jpg"
                name={activeTicket.customer_name}
                size="lg"
                online
              />
              <div>
                <h2 className="font-display text-lg font-bold text-[#1E1E24]">
                  {activeTicket.customer_name}
                </h2>
                <p className="text-xs text-[#686660]">
                  {activeTicket.customer_role} · {activeTicket.company} · Tier-1 SLA
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-[#E43D12]">{activeTicket.code}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7]">
              <div className="text-[#686660] font-semibold">CONTACT</div>
              <div className="font-bold text-[#1E1E24] mt-0.5">{activeTicket.customer_email}</div>
              <div className="text-emerald-700 mt-0.5">Phone Verified</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7]">
              <div className="text-[#686660] font-semibold">CLUSTER INFO</div>
              <div className="font-bold text-[#1E1E24] mt-0.5">{activeTicket.cluster_name}</div>
              <div className="text-[#686660] mt-0.5">{activeTicket.domain_category}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <SeverityLabel severity={activeTicket.severity} />
              <span className="text-[#686660]">
                Opened {formatRelativeTime(activeTicket.created_at)}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
              {activeTicket.title}
            </h1>
          </div>

          <div className="p-4 rounded-2xl bg-[#E43D12]/10 border border-[#E43D12]/25 space-y-1.5">
            <div className="text-xs font-bold text-[#E43D12]">CUSTOMER PAYLOAD DESCRIPTION</div>
            <p className="text-sm text-[#1E1E24] italic">
              &ldquo;{activeTicket.payload_description}&rdquo;
            </p>
          </div>

          {activeTicket.attachment_name && (
            <div className="p-3.5 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCode2 className="w-5 h-5 text-[#E43D12]" />
                <div>
                  <div className="text-xs font-bold text-[#1E1E24]">
                    {activeTicket.attachment_name}
                  </div>
                  <div className="text-[11px] text-[#686660]">{activeTicket.attachment_size}</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#D6536D]">Trace Verified</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setScreen('chat')}
              className="flex-1 h-12 rounded-full bg-[#E43D12] text-white font-display font-semibold text-sm"
            >
              Chat with Customer ({activeTicket.customer_name.split(' ')[0]})
            </button>
            <button
              type="button"
              onClick={() => setScreen('update_status')}
              className="px-6 h-12 rounded-full bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
            >
              Update Status
            </button>
            <button
              type="button"
              onClick={() => setScreen('resolve')}
              className="px-6 h-12 rounded-full bg-[#1E1E24] text-white text-xs font-semibold"
            >
              Resolve Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // 4. UPDATE TICKET STATUS
  // =========================================================
  if (screen === 'update_status' && activeTicket) {
    const statuses: Array<{ id: TicketStatus; label: string; tag: string; desc: string }> = [
      {
        id: 'open',
        label: 'Open / Triage',
        tag: 'Triage',
        desc: 'Unassigned or pending initial assessment and scope.',
      },
      {
        id: 'in_progress',
        label: 'In Progress',
        tag: 'ACTIVE SLA',
        desc: 'Specialist actively executing remediation. SLA clock running continuously.',
      },
      {
        id: 'waiting_customer',
        label: 'Waiting on Customer',
        tag: 'Paused SLA',
        desc: `Awaiting ${activeTicket.customer_name}'s verification of staging SSL or config.`,
      },
      {
        id: 'escalated',
        label: 'Escalate Tier-3',
        tag: 'Core Eng',
        desc: 'Handoff to distributed sync architects on-call.',
      },
      {
        id: 'pending_verification',
        label: 'Pending Verification',
        tag: 'Smoke Tests',
        desc: 'Patch applied; synthetic heartbeat monitor validating cluster recovery.',
      },
      {
        id: 'resolved',
        label: 'Resolved & Closed',
        tag: 'Final',
        desc: 'Mitigation verified, RCA logged, summary sent to customer.',
      },
    ];

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setScreen('ticket_detail')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#686660]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Ticket
          </button>
          <span className="font-mono text-xs font-bold text-[#E43D12]">{activeTicket.code}</span>
        </div>

        <div className="card-surface rounded-3xl p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-[#D6536D]">
              Ticket Context · {activeTicket.company}
            </p>
            <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
              Update Ticket Status
            </h1>
            <p className="text-xs text-[#686660] mt-1">{activeTicket.title}</p>
          </div>

          <div className="space-y-2.5">
            {statuses.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setNextStatus(s.id)}
                className={`w-full p-4 rounded-2xl border text-left transition-colors flex items-start gap-3 ${
                  nextStatus === s.id
                    ? 'bg-[#E43D12]/10 border-[#E43D12]'
                    : 'bg-[#F7F6F2] border-[#E4DFD7] hover:bg-white'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full mt-0.5 shrink-0 border-2 ${
                    nextStatus === s.id
                      ? 'bg-[#E43D12] border-[#E43D12]'
                      : 'border-[#686660]'
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#1E1E24]">{s.label}</span>
                    <span className="text-[11px] font-semibold text-[#D6536D]">{s.tag}</span>
                  </div>
                  <p className="text-xs text-[#686660] mt-0.5">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[#1E1E24]">Reason for Transition</label>
              <span className="text-[#E43D12]">Required</span>
            </div>
            <input
              type="text"
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-sm"
            />
          </div>

          <label className="flex items-center gap-3 text-xs text-[#1E1E24] cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="w-4 h-4 accent-[#E43D12]"
            />
            <span>
              Notify <strong>{activeTicket.customer_name}</strong> via Enterprise Push &amp; email
            </span>
          </label>

          <button
            type="button"
            onClick={async () => {
              await api.updateTicketStatus(activeTicket.id, {
                status: nextStatus,
                reason: transitionReason,
                notifyCustomer,
              });
              await onRefresh();
              onToast(`Updated ${activeTicket.code} to ${nextStatus.replace('_', ' ')}.`);
              setScreen('ticket_detail');
            }}
            className="w-full h-12 rounded-full bg-[#E43D12] text-white font-display font-semibold text-sm"
          >
            Save Status Transition
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // 5. RESOLUTION NOTES & RESOLVE TICKET
  // =========================================================
  if (screen === 'resolve' && activeTicket) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setScreen('ticket_detail')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#686660]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Ticket
          </button>
          <span className="font-mono text-xs font-bold text-[#E43D12]">{activeTicket.code}</span>
        </div>

        <div className="card-surface rounded-3xl p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#686660]">Time to Resolution</div>
              <div className="font-display text-3xl font-bold text-[#1E1E24] tabular-nums">
                18m 42s
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#E4DFD7] text-xs font-bold text-[#D6536D]">
              Beat SLA by 06m 18s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1E1E24] mb-1.5">
                Root Cause Classification
              </label>
              <select
                value={rootCauseClass}
                onChange={(e) => setRootCauseClass(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-medium"
              >
                <option>Infrastructure -&gt; IdP TLS Certificate Expiration</option>
                <option>Ingress -&gt; Connection Pool Saturation</option>
                <option>Database -&gt; Replica Buffer I/O Contention</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1E1E24] mb-1.5">
                Remediation Method
              </label>
              <select
                value={remediationMethod}
                onChange={(e) => setRemediationMethod(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-medium"
              >
                <option>Automated Runbook RB-402</option>
                <option>Automated Runbook RB-318</option>
                <option>Manual KMS Vault Rotation</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#1E1E24]">Internal Staff Notes</label>
              <span className="text-xs text-[#686660]">Specialist Only</span>
            </div>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#1E1E24]">
                Customer-Facing Summary (Sent to {activeTicket.customer_name.split(' ')[0]})
              </label>
              <button
                type="button"
                onClick={() => handleAiDraft('resolution_summary')}
                disabled={draftingReply}
                className="text-xs font-semibold text-[#D6536D] inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {draftingReply ? 'Drafting...' : 'AI Draft Summary'}
              </button>
            </div>
            <textarea
              rows={3}
              value={customerSummary}
              onChange={(e) => setCustomerSummary(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs leading-relaxed"
            />
          </div>

          <button
            type="button"
            onClick={async () => {
              await api.resolveTicket(activeTicket.id, {
                root_cause_classification: rootCauseClass,
                remediation_method: remediationMethod,
                internal_staff_notes: internalNotes,
                customer_facing_summary: customerSummary,
                resolved_by: user.full_name,
              });
              await onRefresh();
              onToast(`Ticket ${activeTicket.code} resolved and RCA dispatched.`);
              setScreen('queue');
            }}
            className="w-full h-12 rounded-full bg-[#E43D12] text-white font-display font-semibold text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm &amp; Resolve Ticket</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // 6. STAFF-CUSTOMER CHAT INTERFACE
  // =========================================================
  if (screen === 'chat' && activeTicket) {
    return (
      <div className="max-w-3xl mx-auto card-surface rounded-3xl overflow-hidden flex flex-col h-[75vh] min-h-[540px]">
        <div className="p-5 border-b border-[#E4DFD7] bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScreen('ticket_detail')}
              className="w-9 h-9 rounded-full bg-[#F7F6F2] flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Avatar
              src="/src/assets/images/avatar_elena_1795079072007.jpg"
              name={activeTicket.customer_name}
              online
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1E1E24]">
                  {activeTicket.customer_name}
                </span>
                <SeverityLabel severity={activeTicket.severity} />
              </div>
              <div className="text-xs text-[#686660]">
                {activeTicket.company} · Live Online · {activeTicket.code}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-[#E43D12] tabular-nums">
            SLA {activeTicket.sla_minutes_left}m remaining
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F7F6F2]/50">
          {messages.map((m) => {
            const isStaff = m.sender_role === 'staff' || m.sender_role === 'admin';
            if (m.message_type === 'handover') {
              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl bg-[#FFA2B6]/15 border border-[#D6536D]/25 text-xs text-[#1E1E24]"
                >
                  <strong>{m.sender_name}:</strong> {m.body}
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                <div className="text-[11px] text-[#686660] mb-1">
                  {m.sender_name} · {formatRelativeTime(m.created_at)}
                </div>
                <div
                  className={`max-w-[82%] p-4 rounded-2xl text-sm leading-relaxed ${
                    isStaff
                      ? 'bg-[#E43D12] text-white rounded-br-sm'
                      : 'bg-white border border-[#E4DFD7] text-[#1E1E24] rounded-bl-sm'
                  }`}
                >
                  {m.body}
                  {m.metadata?.runbook_code && (
                    <div className="mt-3 p-3 rounded-xl bg-white text-[#1E1E24] border border-[#E4DFD7] text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span>Runbook {m.metadata.runbook_code} ACTIVE</span>
                        <span className="text-[#E43D12] tabular-nums">
                          {m.metadata.runbook_progress}%
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.executeRunbook(m.metadata!.runbook_code!, activeTicket.id);
                          const refreshed = await api.getTicketDetail(activeTicket.id);
                          setMessages(refreshed.messages);
                          onToast(`Runbook ${m.metadata!.runbook_code} completed 100%.`);
                        }}
                        className="px-3 py-1 rounded-lg bg-[#F7F6F2] text-[#E43D12] font-semibold"
                      >
                        Complete Cluster Sync
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-[#E4DFD7] bg-white space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-[#F7F6F2] font-semibold text-[#1E1E24]">
                Public Customer Reply
              </span>
              <span className="px-3 py-1 rounded-full bg-[#F7F6F2] font-semibold text-[#D6536D]">
                Runbook Synced
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleAiDraft('chat_reply')}
              disabled={draftingReply}
              className="px-3 py-1.5 rounded-full bg-[#FFA2B6]/20 text-[#D6536D] text-xs font-semibold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {draftingReply ? 'Drafting...' : 'AI Draft Reply'}
            </button>
          </div>
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Reply to ${activeTicket.customer_name.split(' ')[0]} as Specialist...`}
              className="flex-1 h-11 px-4 rounded-full bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
            />
            <button
              type="submit"
              className="px-5 h-11 rounded-full bg-[#E43D12] text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================
  // 7. STAFF HUB & PROFILE (NOTIFICATIONS & ROUTING)
  // =========================================================
  if (screen === 'profile') {
    const urgentTickets = tickets.filter((t) => !t.assignee_id && t.status !== 'resolved');
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="card-surface rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar src={user.avatar_url} name={user.full_name} size="xl" online />
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
                  {user.full_name}
                </h1>
                <p className="text-xs text-[#686660]">{user.title}</p>
                <p className="text-xs font-semibold text-[#D6536D] mt-1">{user.shift_label}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700">On-Call Active</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] text-center">
              <div className="font-display text-2xl font-bold text-[#D6536D] tabular-nums">
                {user.csat_score}%
              </div>
              <div className="text-[11px] text-[#686660]">CSAT Score</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] text-center">
              <div className="font-display text-2xl font-bold text-[#1E1E24] tabular-nums">
                {user.avg_resolve_mins}m
              </div>
              <div className="text-[11px] text-[#686660]">Avg Resolve</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] text-center">
              <div className="font-display text-2xl font-bold text-[#1E1E24] tabular-nums">
                {user.resolved_month}
              </div>
              <div className="text-[11px] text-[#686660]">This Month</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-[#1E1E24]">Urgent P1 Ticket Routing</div>
              <div className="text-xs text-[#686660]">Auto-accepting escalations</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={urgentRouting}
              onClick={async () => {
                const next = !urgentRouting;
                setUrgentRouting(next);
                await api.toggleStaffRouting(user.id, next);
                await onRefresh();
                onToast(`Urgent P1 Ticket Routing ${next ? 'enabled' : 'paused'}.`);
              }}
              className={`w-12 h-7 rounded-full p-1 transition-colors ${
                urgentRouting ? 'bg-[#E43D12]' : 'bg-[#E4DFD7]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  urgentRouting ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Live Urgent Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[#1E1E24]">Live Urgent Feed</h2>
            <span className="text-xs font-bold text-[#D6536D]">
              {urgentTickets.length + notifications.length} Alerts
            </span>
          </div>

          {urgentTickets.map((t) => (
            <div key={t.id} className="card-surface rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#E43D12]">P1 CRITICAL ESCALATION</span>
                <span className="text-[#686660]">{formatRelativeTime(t.created_at)}</span>
              </div>
              <h3 className="font-display text-lg font-bold text-[#1E1E24]">
                Ticket {t.code} · {t.title}
              </h3>
              <p className="text-xs text-[#686660]">{t.payload_description}</p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => handleAcceptTicket(t)}
                  className="flex-1 h-10 rounded-full bg-[#E43D12] text-white text-xs font-semibold"
                >
                  Accept Ticket
                </button>
                <button
                  type="button"
                  onClick={() => onToast(`Declined escalation for ${t.code}.`)}
                  className="px-5 h-10 rounded-full bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}

          {runbooks.slice(0, 1).map((rb) => (
            <div key={rb.code} className="card-surface rounded-3xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#D6536D]">AI CO-PILOT ASSISTANT</span>
                <span className="text-[#686660]">{rb.last_status}</span>
              </div>
              <div className="font-display text-base font-bold text-[#1E1E24]">
                Runbook {rb.code} · {rb.title}
              </div>
              <p className="text-xs text-[#686660]">{rb.description}</p>
            </div>
          ))}
        </section>
      </div>
    );
  }

  return null;
}
