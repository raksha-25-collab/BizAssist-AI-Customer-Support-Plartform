import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  FileCode2,
  FileText,
  KeyRound,
  Paperclip,
  PhoneCall,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import type {
  AICopilotMessage,
  AppNotification,
  Ticket,
  TicketMessage,
  TimelineStage,
  UserProfile,
} from '../types';
import { api } from '../lib/api';
import { Avatar, SeverityLabel, StatusLabel, formatRelativeTime } from './SharedUI';

export type CustomerScreen =
  | 'portal'
  | 'submit'
  | 'review'
  | 'success'
  | 'tickets'
  | 'ticket_detail'
  | 'chat'
  | 'assistant'
  | 'notifications';

interface CustomerViewsProps {
  screen: CustomerScreen;
  setScreen: (s: CustomerScreen) => void;
  user: UserProfile;
  tickets: Ticket[];
  selectedTicketId: string;
  setSelectedTicketId: (id: string) => void;
  notifications: AppNotification[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function CustomerViews({
  screen,
  setScreen,
  user,
  tickets,
  selectedTicketId,
  setSelectedTicketId,
  notifications,
  onRefresh,
  onToast,
}: CustomerViewsProps) {
  const [quickAiInput, setQuickAiInput] = useState('');
  const [trackerFilter, setTrackerFilter] = useState<'active' | 'resolved' | 'all'>('active');
  const [trackerSearch, setTrackerSearch] = useState('');
  const [detailTab, setDetailTab] = useState<'timeline' | 'runbooks' | 'notes'>('timeline');
  const [notifFilter, setNotifFilter] = useState<'all' | 'urgent' | 'ai_update'>('all');
  const [instantModal, setInstantModal] = useState<'mfa' | 'billing' | 'seats' | null>(null);

  // Ticket detail state
  const [detailData, setDetailData] = useState<{
    ticket: Ticket;
    messages: TicketMessage[];
    timeline: TimelineStage[];
  } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Submit wizard state
  const [domainCategory, setDomainCategory] = useState('API Integration');
  const [issueTitle, setIssueTitle] = useState(
    'Webhook payload latency exceeding 4500ms'
  );
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'P1'>('P1');
  const [detailedContext, setDetailedContext] = useState(
    'Starting 14:15 UTC, webhook listener endpoint latency is 4200ms–5100ms with HTTP 504 timeouts from upstream edge proxies.'
  );
  const [attachmentName, setAttachmentName] = useState<string | null>(
    'webhook_timeout_logs_2025.json'
  );
  const [aiDiagnosis, setAiDiagnosis] = useState<any>({
    predicted_root_cause: 'IdP x.509 handshake latency spike on Tier-2 proxy (US-East-1 routing tables)',
    confidence: 94,
    recommended_runbook: 'RB-402',
    runbook_title: 'Webhook Latency Guide & KMS Hot-Reload',
    estimated_resolution: '< 15 mins',
    routing_destination: 'Tier-2 Esc. Infrastructure Queue',
    recommended_assignee_id: 'staff-sarah',
    recommended_assignee_name: 'Sarah Lin',
    skill_fit: 'L4 Gateway & IdP',
  });
  const [diagnosing, setDiagnosing] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);

  // AI Assistant state
  const [copilotMsgs, setCopilotMsgs] = useState<AICopilotMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [askingAssistant, setAskingAssistant] = useState(false);

  useEffect(() => {
    if (screen === 'ticket_detail' || screen === 'chat') {
      const targetId = selectedTicketId || tickets[0]?.id;
      if (!targetId) return;
      api
        .getTicketDetail(targetId)
        .then(setDetailData)
        .catch(() => {});
    }
  }, [screen, selectedTicketId, tickets]);

  useEffect(() => {
    if (screen === 'assistant') {
      api
        .getAssistantMessages(user.id)
        .then((res) => setCopilotMsgs(res.messages))
        .catch(() => {});
    }
  }, [screen, user.id]);

  const activeTicket =
    detailData?.ticket || tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const handleRunAiDiagnosis = async () => {
    if (!issueTitle.trim()) {
      onToast('Enter an issue title before running diagnosis.', 'error');
      return;
    }
    setDiagnosing(true);
    try {
      const res = await api.diagnoseTicket({
        title: issueTitle,
        domain_category: domainCategory,
        severity,
        payload_description: detailedContext,
        cluster_name: 'auth-cluster-east',
      });
      setAiDiagnosis(res.diagnosis);
      onToast('Gemini AI diagnosis updated.');
    } catch (err: any) {
      onToast(err.message || 'AI diagnosis unavailable.', 'error');
    } finally {
      setDiagnosing(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setSubmittingTicket(true);
    try {
      const { ticket } = await api.createTicket({
        title: issueTitle,
        domain_category: domainCategory,
        severity,
        payload_description: detailedContext,
        attachment_name: attachmentName,
        attachment_size: attachmentName ? '240 KB · JSON Trace Log' : null,
        customer_id: user.id,
        customer_name: user.full_name,
        customer_email: user.email,
        customer_role: user.title,
        company: user.company,
        cluster_name: 'auth-cluster-east',
        ai_diagnosis: aiDiagnosis,
      });
      setSubmittedTicket(ticket);
      setSelectedTicketId(ticket.id);
      await onRefresh();
      setScreen('success');
      onToast(`Ticket ${ticket.code} dispatched to queue.`);
    } catch (err: any) {
      onToast(err.message || 'Failed to submit ticket.', 'error');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendChatMessage = async (textOverride?: string) => {
    const body = (textOverride ?? chatInput).trim();
    if (!body || !activeTicket) return;
    setSendingMsg(true);
    try {
      await api.sendTicketMessage(activeTicket.id, {
        sender_id: user.id,
        sender_name: user.full_name,
        sender_role: 'customer',
        message_type: 'text',
        body,
      });
      if (!textOverride) setChatInput('');
      const refreshed = await api.getTicketDetail(activeTicket.id);
      setDetailData(refreshed);
    } catch (err: any) {
      onToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleAskAssistant = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? assistantInput).trim();
    if (!prompt) return;
    setAskingAssistant(true);
    setAssistantInput('');
    const optimistic: AICopilotMessage = {
      id: `tmp-${Date.now()}`,
      session_user_id: user.id,
      sender: 'user',
      body: prompt,
      created_at: new Date().toISOString(),
    };
    setCopilotMsgs((prev) => [...prev, optimistic]);
    try {
      const { message } = await api.askAssistant(prompt, user.id);
      setCopilotMsgs((prev) => [...prev, message]);
    } catch (err: any) {
      onToast(err.message || 'AI Assistant error', 'error');
    } finally {
      setAskingAssistant(false);
    }
  };

  const handleQuickPortalAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAiInput.trim()) return;
    const q = quickAiInput.trim();
    setQuickAiInput('');
    setScreen('assistant');
    await handleAskAssistant(q);
  };

  // =========================================================
  // 1. CUSTOMER PORTAL & OVERVIEW
  // =========================================================
  if (screen === 'portal') {
    const activeInquiries = tickets.filter((t) => t.status !== 'resolved').slice(0, 3);
    return (
      <div className="space-y-6">
        {/* Top Priority Concierge Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <section className="lg:col-span-7 card-surface rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-[#D6536D]">
                  Priority Concierge · Live Fleet
                </span>
                <span className="text-xs font-medium text-[#686660] tabular-nums">
                  12 Specialists Online
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E1E24] tracking-tight">
                Good morning, {user.full_name.split(' ')[0]}
              </h1>
              <p className="text-sm text-[#686660]">
                All 3 production clusters running nominal · SLA 99.98%
              </p>
            </div>

            <form onSubmit={handleQuickPortalAsk} className="flex items-center gap-2">
              <input
                type="text"
                value={quickAiInput}
                onChange={(e) => setQuickAiInput(e.target.value)}
                placeholder="Ask BizAssist AI about logs, webhooks, or SSL..."
                className="flex-1 h-12 px-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
              />
              <button
                type="submit"
                className="h-12 px-5 rounded-2xl bg-[#E43D12] text-white text-xs font-semibold hover:bg-[#c8340e] transition-colors whitespace-nowrap"
              >
                Run
              </button>
            </form>

            <button
              type="button"
              onClick={() => setScreen('submit')}
              className="w-full h-12 rounded-full bg-[#E43D12] hover:bg-[#c8340e] text-white font-display font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Start New Request</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </section>

          {/* Instant AI Actions */}
          <section className="lg:col-span-5 card-surface rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-4 bg-[#F7F6F2]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-[#1E1E24]">
                  Instant AI Actions
                </h2>
                <p className="text-xs text-[#686660]">Zero-wait automated tenant tools</p>
              </div>
              <Bot className="w-5 h-5 text-[#D6536D]" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setInstantModal('mfa')}
                className="p-4 rounded-2xl bg-white border border-[#E4DFD7] hover:border-[#E43D12] transition-colors text-left flex flex-col gap-2.5"
              >
                <KeyRound className="w-5 h-5 text-[#D6536D]" />
                <div>
                  <div className="text-xs font-bold text-[#1E1E24]">Reset MFA</div>
                  <div className="text-[11px] text-[#686660]">Execute</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInstantModal('billing')}
                className="p-4 rounded-2xl bg-white border border-[#E4DFD7] hover:border-[#E43D12] transition-colors text-left flex flex-col gap-2.5"
              >
                <Receipt className="w-5 h-5 text-[#D6536D]" />
                <div>
                  <div className="text-xs font-bold text-[#1E1E24]">Billing & Tax</div>
                  <div className="text-[11px] text-[#686660]">Receipt</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInstantModal('seats')}
                className="p-4 rounded-2xl bg-white border border-[#E4DFD7] hover:border-[#E43D12] transition-colors text-left flex flex-col gap-2.5"
              >
                <Users className="w-5 h-5 text-[#D6536D]" />
                <div>
                  <div className="text-xs font-bold text-[#1E1E24]">Org Seats</div>
                  <div className="text-[11px] text-[#686660]">Manage</div>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-[#E4DFD7] flex items-center justify-between text-xs text-[#686660]">
              <span>All Core Services Normal · 99.98%</span>
              <span className="font-mono tabular-nums">24ms</span>
            </div>
          </section>
        </div>

        {/* Active Inquiries */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl font-bold text-[#1E1E24]">Active Inquiries</h2>
              <span className="text-xs font-semibold text-[#D6536D] tabular-nums">
                {activeInquiries.length} Active
              </span>
            </div>
            <button
              type="button"
              onClick={() => setScreen('tickets')}
              className="text-xs font-semibold text-[#E43D12] hover:underline"
            >
              View History
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeInquiries.map((t) => (
              <div
                key={t.id}
                className="card-surface rounded-3xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-[#686660]">{t.code}</span>
                    <SeverityLabel severity={t.severity} />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#1E1E24] leading-snug">
                    {t.title}
                  </h3>
                  <p className="text-xs text-[#686660] line-clamp-2">
                    {t.ai_diagnosis?.predicted_root_cause || t.payload_description}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#686660]">
                      {t.assignee_name ? `Specialist: ${t.assignee_name}` : 'Auto-Triaging'}
                    </span>
                    <span className="font-mono font-semibold text-[#E43D12] tabular-nums">
                      {t.progress_pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#F7F6F2] overflow-hidden">
                    <div
                      className="h-full bg-[#E43D12] rounded-full transition-all"
                      style={{ width: `${t.progress_pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setScreen('ticket_detail');
                    }}
                    className="flex-1 h-10 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] hover:bg-white"
                  >
                    Track Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setScreen('chat');
                    }}
                    className="flex-1 h-10 rounded-xl bg-[#E43D12] text-white text-xs font-semibold hover:bg-[#c8340e]"
                  >
                    Open Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Instant Action Modal */}
        {instantModal && (
          <div className="fixed inset-0 z-50 bg-[#1E1E24]/35 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="card-surface rounded-3xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[#1E1E24]">
                  {instantModal === 'mfa'
                    ? 'Reset Hardware MFA Token'
                    : instantModal === 'billing'
                      ? 'Enterprise Billing & Tax Receipt'
                      : 'Manage Organization Seats'}
                </h3>
                <button
                  type="button"
                  onClick={() => setInstantModal(null)}
                  className="text-xs font-semibold text-[#686660] hover:text-[#1E1E24]"
                >
                  Close
                </button>
              </div>
              <p className="text-sm text-[#686660]">
                {instantModal === 'mfa'
                  ? `Issue an authenticated FIDO2/WebAuthn enrollment reset link to ${user.email}.`
                  : instantModal === 'billing'
                    ? 'Latest invoice #INV-2026-11 ($4,850.00 · Acme Enterprise Tier-1 SLA) is paid and reconciled.'
                    : 'Acme Enterprise currently uses 42 of 50 licensed DevOps seats across us-east-1 and eu-central.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onToast(
                    instantModal === 'mfa'
                      ? 'MFA reset link sent to your verified domain email.'
                      : instantModal === 'billing'
                        ? 'Tax receipt PDF prepared for download.'
                        : 'Seat allocation synced with Okta directory.'
                  );
                  setInstantModal(null);
                }}
                className="w-full h-11 rounded-full bg-[#E43D12] text-white text-xs font-semibold"
              >
                {instantModal === 'mfa'
                  ? 'Dispatch Reset Link'
                  : instantModal === 'billing'
                    ? 'Download Tax Receipt'
                    : 'Sync Okta Directory'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // 2. SUBMIT TICKET & AI DIAGNOSIS (STEP 1)
  // =========================================================
  if (screen === 'submit') {
    const categories = ['Billing & Invoices', 'API Integration', 'Account Access', 'Bug Report'];
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#D6536D]">
              Step 1 of 3 · SLA Target &lt; 15m
            </p>
            <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
              Create Inbound Ticket
            </h1>
            <p className="text-sm text-[#686660]">
              AI diagnoses issues instantly to match the best infrastructure specialist.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScreen('portal')}
            className="text-xs font-semibold text-[#686660] hover:text-[#1E1E24]"
          >
            Cancel
          </button>
        </div>

        <div className="card-surface rounded-3xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#1E1E24] mb-2">
              Select Domain Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDomainCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    domainCategory === cat
                      ? 'bg-[#E43D12] text-white border-[#E43D12]'
                      : 'bg-[#F7F6F2] text-[#1E1E24] border-[#E4DFD7] hover:bg-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#1E1E24]">Issue Title</label>
              <span className="text-xs text-[#686660]">Synced with Logs</span>
            </div>
            <input
              type="text"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#1E1E24]">Severity Level</label>
              <span className="text-xs text-[#686660]">&lt; 15 mins target</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['Low', 'Medium', 'P1'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  className={`h-11 rounded-xl border text-xs font-semibold transition-colors ${
                    severity === sev
                      ? sev === 'P1'
                        ? 'bg-[#E43D12]/10 border-[#E43D12] text-[#E43D12]'
                        : 'bg-white border-[#1E1E24] text-[#1E1E24]'
                      : 'bg-[#F7F6F2] border-[#E4DFD7] text-[#686660]'
                  }`}
                >
                  {sev === 'P1' ? 'Critical P1' : sev}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#1E1E24]">Detailed Context</label>
              <span className="text-xs text-[#686660]">Markdown</span>
            </div>
            <textarea
              rows={4}
              value={detailedContext}
              onChange={(e) => setDetailedContext(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F7F6F2] border border-dashed border-[#E4DFD7]">
            <div className="flex items-center gap-2.5 text-xs text-[#1E1E24]">
              <Paperclip className="w-4 h-4 text-[#686660]" />
              <span>{attachmentName || 'Attach screenshot or log dump (Max 25MB)'}</span>
            </div>
            <label className="px-3 py-1.5 rounded-lg bg-white border border-[#E4DFD7] text-xs font-semibold cursor-pointer hover:border-[#1E1E24]">
              Choose File
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAttachmentName(file.name);
                }}
              />
            </label>
          </div>
        </div>

        {/* Real-Time AI Diagnosis Box */}
        <div className="card-surface rounded-3xl p-6 bg-[#F7F6F2] space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#E43D12]">Real-Time AI Diagnosis</p>
              <h3 className="font-display text-base font-bold text-[#1E1E24]">
                {aiDiagnosis?.predicted_root_cause}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#D6536D] text-white text-xs font-bold tabular-nums whitespace-nowrap">
              {aiDiagnosis?.confidence || 94}% Confidence
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-[#E4DFD7] flex items-center justify-between text-xs">
            <span className="font-medium text-[#1E1E24]">
              Runbook {aiDiagnosis?.recommended_runbook}: {aiDiagnosis?.runbook_title}
            </span>
            <span className="text-[#686660]">Est. {aiDiagnosis?.estimated_resolution}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleRunAiDiagnosis}
              disabled={diagnosing}
              className="flex-1 h-12 rounded-xl bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] hover:border-[#1E1E24] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4 text-[#D6536D]" />
              <span>{diagnosing ? 'Diagnosing with Gemini...' : 'Refresh AI Diagnosis'}</span>
            </button>
            <button
              type="button"
              onClick={() => setScreen('review')}
              className="flex-1 h-12 rounded-xl bg-[#E43D12] hover:bg-[#c8340e] text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              <span>Review &amp; Dispatch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // 3. REVIEW TICKET DETAILS (STEP 2)
  // =========================================================
  if (screen === 'review') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setScreen('submit')}
            className="w-10 h-10 rounded-full bg-white border border-[#E4DFD7] flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
              Review Ticket Details
            </h1>
            <p className="text-xs text-[#686660]">
              1. Details &rarr; <strong className="text-[#E43D12]">2. Review</strong> &rarr; 3.
              Triage
            </p>
          </div>
        </div>

        <div className="card-surface rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#D6536D]">
              {domainCategory} · {severity === 'P1' ? 'Critical (P1)' : severity}
            </span>
            <span className="font-mono text-[#686660]">Draft Preview</span>
          </div>
          <h2 className="font-display text-xl font-bold text-[#1E1E24]">{issueTitle}</h2>
          <p className="text-xs text-[#686660]">
            {user.company} · auth-cluster-east
          </p>
          <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7]">
            <div className="text-[11px] font-bold text-[#686660] mb-1">
              CUSTOMER QUERY PAYLOAD
            </div>
            <p className="text-sm text-[#1E1E24] italic">"{detailedContext}"</p>
          </div>

          {attachmentName && (
            <div className="p-3.5 rounded-2xl bg-white border border-[#E4DFD7] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCode2 className="w-5 h-5 text-[#E43D12]" />
                <div>
                  <div className="text-xs font-bold text-[#1E1E24]">{attachmentName}</div>
                  <div className="text-[11px] text-[#686660]">240 KB · JSON Trace Log</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#686660]">Ready</span>
            </div>
          )}
        </div>

        <div className="card-surface rounded-3xl p-6 bg-[#F7F6F2] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#D6536D]">BizAssist AI Copilot</span>
            <span className="text-xs font-bold text-[#1E1E24] tabular-nums">
              {aiDiagnosis?.confidence || 94}% Match
            </span>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#686660]">PREDICTED ROOT CAUSE</div>
            <p className="text-sm font-semibold text-[#1E1E24] mt-0.5">
              {aiDiagnosis?.predicted_root_cause}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-white border border-[#E4DFD7]">
              <div className="text-[11px] text-[#686660]">Estimated Resolution</div>
              <div className="text-sm font-bold text-[#1E1E24] mt-0.5">
                {aiDiagnosis?.estimated_resolution}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#E4DFD7]">
              <div className="text-[11px] text-[#686660]">Routing Destination</div>
              <div className="text-sm font-bold text-[#1E1E24] mt-0.5">
                {aiDiagnosis?.recommended_assignee_name || 'Tier-2 Esc.'}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setScreen('submit')}
              className="px-6 h-12 rounded-xl bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={submittingTicket}
              onClick={handleConfirmSubmit}
              className="flex-1 h-12 rounded-full bg-[#E43D12] hover:bg-[#c8340e] text-white font-display font-semibold text-sm disabled:opacity-60"
            >
              {submittingTicket ? 'Submitting to Supabase...' : 'Confirm & Submit'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // 4. TICKET SUBMISSION SUCCESS (STEP 3)
  // =========================================================
  if (screen === 'success') {
    const t = submittedTicket || tickets[0];
    return (
      <div className="max-w-xl mx-auto card-surface rounded-3xl p-6 sm:p-8 space-y-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#E43D12] text-white flex items-center justify-center mx-auto">
          <Check className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
            Ticket Submitted Successfully!
          </h1>
          <p className="text-sm text-[#686660]">
            Your query is being processed by BizAssist Autonomous Auto-Triage.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] text-left space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#E43D12]">
              {t?.severity} · IN AUTO-DIAGNOSIS
            </span>
            <span className="text-[#686660]">Encrypted</span>
          </div>
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E4DFD7]">
            <div>
              <div className="text-[11px] text-[#686660]">REFERENCE CODE</div>
              <div className="font-mono text-lg font-bold text-[#1E1E24]">{t?.code}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(t?.code || '#BA-8902');
                onToast(`Copied ${t?.code} to clipboard.`);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#F7F6F2] text-xs font-semibold text-[#E43D12] flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-[#E4DFD7]">
              <div className="text-[#686660]">EST. PICKUP</div>
              <div className="font-bold text-[#1E1E24] mt-0.5 tabular-nums">01:02 mins</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#E4DFD7]">
              <div className="text-[#686660]">ASSIGNED SPECIALIST</div>
              <div className="font-bold text-[#1E1E24] mt-0.5">
                {t?.assignee_name || 'Sarah Lin'}
              </div>
            </div>
          </div>
        </div>

        <div className="text-left space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#1E1E24]">
            <span>Auto-Dispatch Pipeline</span>
            <span className="text-[#D6536D]">Live Sync</span>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#E43D12] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-[#1E1E24]">Ticket Recorded &amp; Tokenized</div>
                <div className="text-[#686660]">
                  Parsed payload &amp; created persistent record in Supabase
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#D6536D] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-[#1E1E24]">
                  Telemetry &amp; Log Correlator Running
                </div>
                <div className="text-[#686660]">Scanning edge cluster latency &amp; memory spikes</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-[#686660] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-[#1E1E24]">Specialist Handover Routing</div>
                <div className="text-[#686660]">
                  Queued to {t?.assignee_name || 'Sarah Lin'} · Tier-2 Infrastructure
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              if (t) setSelectedTicketId(t.id);
              setScreen('ticket_detail');
            }}
            className="w-full h-12 rounded-full bg-[#E43D12] text-white font-display font-semibold text-sm"
          >
            Track Ticket Status
          </button>
          <button
            type="button"
            onClick={() => setScreen('portal')}
            className="w-full h-11 rounded-full bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
          >
            Return to Customer Dashboard
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // 5. TICKET TRACKER & QUERY HISTORY
  // =========================================================
  if (screen === 'tickets') {
    const filtered = tickets.filter((t) => {
      const matchesTab =
        trackerFilter === 'all'
          ? true
          : trackerFilter === 'resolved'
            ? t.status === 'resolved'
            : t.status !== 'resolved';
      const q = trackerSearch.toLowerCase();
      const matchesSearch =
        !q ||
        t.code.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.domain_category.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });

    const activeCount = tickets.filter((t) => t.status !== 'resolved').length;
    const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
              Ticket Tracker &amp; Query History
            </h1>
            <p className="text-sm text-[#686660]">Tracking live queries and past resolutions</p>
          </div>
          <button
            type="button"
            onClick={() => setScreen('submit')}
            className="h-11 px-5 rounded-full bg-[#E43D12] text-white text-xs font-semibold whitespace-nowrap"
          >
            New Support Request
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#686660] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={trackerSearch}
              onChange={(e) => setTrackerSearch(e.target.value)}
              placeholder="Search ticket ID or keyword..."
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F7F6F2] rounded-2xl border border-[#E4DFD7]">
            <button
              type="button"
              onClick={() => setTrackerFilter('active')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                trackerFilter === 'active' ? 'bg-white text-[#1E1E24] shadow-sm' : 'text-[#686660]'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setTrackerFilter('resolved')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                trackerFilter === 'resolved'
                  ? 'bg-white text-[#1E1E24] shadow-sm'
                  : 'text-[#686660]'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              type="button"
              onClick={() => setTrackerFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                trackerFilter === 'all' ? 'bg-white text-[#1E1E24] shadow-sm' : 'text-[#686660]'
              }`}
            >
              All Tickets
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((t) => (
            <div key={t.id} className="card-surface rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <StatusLabel status={t.status} />
                  <span className="text-[#686660]">·</span>
                  <SeverityLabel severity={t.severity} />
                  <span className="text-[#686660]">·</span>
                  <span className="font-mono text-[#686660]">{t.code}</span>
                </div>
                <span className="text-[#686660]">{formatRelativeTime(t.created_at)}</span>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display text-lg font-bold text-[#1E1E24]">{t.title}</h3>
                <p className="text-xs text-[#686660]">
                  {t.assignee_name
                    ? `Assigned to ${t.assignee_name} (${t.assignee_tier || 'Tier-2'})`
                    : 'Awaiting Specialist Assignment'}{' '}
                  · {t.cluster_name}
                </p>
              </div>

              <p className="text-sm text-[#1E1E24] bg-[#F7F6F2] p-3.5 rounded-2xl border border-[#E4DFD7]">
                {t.status === 'resolved' && t.resolution_notes
                  ? t.resolution_notes.customer_facing_summary
                  : t.payload_description}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  {t.status === 'resolved' ? (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.updateTicketStatus(t.id, {
                            status: 'open',
                            reason: 'Customer requested follow-up verification',
                          });
                          await onRefresh();
                          onToast(`Ticket ${t.code} reopened.`);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
                      >
                        Reopen Query
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTicketId(t.id);
                          setScreen('ticket_detail');
                        }}
                        className="px-4 py-2 rounded-xl bg-white border border-[#E4DFD7] text-xs font-semibold text-[#E43D12]"
                      >
                        Audit Certificate
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTicketId(t.id);
                          setScreen('chat');
                        }}
                        className="px-4 py-2 rounded-full bg-[#E43D12] text-white text-xs font-semibold"
                      >
                        Reply Directly
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTicketId(t.id);
                          setScreen('ticket_detail');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Timeline &amp; Cert
                      </button>
                    </>
                  )}
                </div>
                <span className="text-xs text-[#686660] tabular-nums">
                  {t.status === 'resolved' ? 'Resolved' : `ETA: ~${t.sla_minutes_left} mins`}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Urgent escalation banner */}
        <div className="card-surface rounded-3xl p-5 bg-[#F7F6F2] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-[#1E1E24]">Need urgent escalation?</div>
            <div className="text-xs text-[#686660]">
              Concierge live support available 24/7 for Tier-1 Enterprise SLA tenants.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onToast('Priority callback queued. On-call lead will reach out in < 2m.')}
            className="px-5 h-11 rounded-xl bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] flex items-center gap-2 hover:border-[#E43D12]"
          >
            <PhoneCall className="w-4 h-4 text-[#E43D12]" />
            Quick Callback
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // 6. INDIVIDUAL TICKET DETAILS
  // =========================================================
  if (screen === 'ticket_detail' && activeTicket) {
    const timeline = detailData?.timeline || [];
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setScreen('tickets')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#686660] hover:text-[#1E1E24]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tickets
          </button>
          <span className="text-xs font-semibold text-[#E43D12] tabular-nums">
            SLA: {activeTicket.sla_minutes_left}m remaining
          </span>
        </div>

        <div className="card-surface rounded-3xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <SeverityLabel severity={activeTicket.severity} />
              <span className="font-mono text-[#686660]">{activeTicket.code}</span>
            </div>
            <StatusLabel status={activeTicket.status} />
          </div>

          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#1E1E24]">
            {activeTicket.title}
          </h1>
          <p className="text-xs text-[#686660]">
            {activeTicket.company} · {activeTicket.cluster_name}
          </p>

          <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar
                src="/src/assets/images/avatar_sarah_1795079071848.jpg"
                name={activeTicket.assignee_name || 'Sarah Lin'}
                online
              />
              <div>
                <div className="text-sm font-bold text-[#1E1E24]">
                  {activeTicket.assignee_name || 'Sarah Lin'}
                </div>
                <div className="text-xs text-[#686660]">
                  {activeTicket.assignee_tier || 'Tier-2 Infra Specialist'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScreen('assistant')}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
            >
              Copilot Sync
            </button>
          </div>

          <div className="flex items-center gap-2 border-b border-[#E4DFD7] pb-2">
            {(['timeline', 'runbooks', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDetailTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                  detailTab === tab
                    ? 'bg-[#1E1E24] text-white'
                    : 'text-[#686660] hover:text-[#1E1E24]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {detailTab === 'timeline' && (
            <div className="space-y-5 pt-2">
              {timeline.map((stage) => (
                <div key={stage.id} className="flex items-start gap-4">
                  <div
                    className={`w-3.5 h-3.5 rounded-full mt-1 shrink-0 ${
                      stage.status === 'completed'
                        ? 'bg-[#D6536D]'
                        : stage.status === 'active'
                          ? 'bg-[#E43D12]'
                          : 'bg-[#E4DFD7]'
                    }`}
                  />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#1E1E24]">{stage.title}</span>
                      <span className="text-xs text-[#686660]">{stage.timestamp_label}</span>
                    </div>
                    <p className="text-xs text-[#686660] leading-relaxed">{stage.description}</p>
                    {stage.progress_pct !== undefined && (
                      <div className="p-3 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>{stage.attachment_name || 'Execution Progress'}</span>
                          <span className="text-[#E43D12] tabular-nums">{stage.progress_pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white overflow-hidden">
                          <div
                            className="h-full bg-[#E43D12] rounded-full"
                            style={{ width: `${stage.progress_pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {stage.attachment_name && stage.progress_pct === undefined && (
                      <div className="text-xs font-mono text-[#686660] bg-[#F7F6F2] px-3 py-1.5 rounded-xl inline-block">
                        {stage.attachment_name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {detailTab === 'runbooks' && (
            <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-[#E43D12]">
                    {activeTicket.ai_diagnosis?.recommended_runbook || 'RB-402'}
                  </div>
                  <div className="text-sm font-bold text-[#1E1E24]">
                    {activeTicket.ai_diagnosis?.runbook_title || 'OAuth2 Bearer Cluster Hot-Reload'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await api.executeRunbook(
                      activeTicket.ai_diagnosis?.recommended_runbook || 'RB-402',
                      activeTicket.id
                    );
                    const refreshed = await api.getTicketDetail(activeTicket.id);
                    setDetailData(refreshed);
                    onToast('Runbook executed and logged to ticket timeline.');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#E43D12] text-white text-xs font-semibold"
                >
                  Approve Runbook
                </button>
              </div>
              <p className="text-xs text-[#686660]">
                Zero-downtime KMS certificate rotation across edge clusters with automated smoke test
                probes.
              </p>
            </div>
          )}

          {detailTab === 'notes' && (
            <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] space-y-2 text-sm">
              <div className="text-xs font-bold text-[#686660]">ORIGINAL PAYLOAD &amp; NOTES</div>
              <p className="text-[#1E1E24]">{activeTicket.payload_description}</p>
              {activeTicket.resolution_notes && (
                <div className="pt-3 border-t border-[#E4DFD7]">
                  <div className="text-xs font-bold text-emerald-700">RESOLUTION SUMMARY</div>
                  <p className="text-[#1E1E24] mt-1">
                    {activeTicket.resolution_notes.customer_facing_summary}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDetailTab('runbooks')}
              className="px-5 h-12 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
            >
              Runbook
            </button>
            <button
              type="button"
              onClick={() => setScreen('chat')}
              className="flex-1 h-12 rounded-full bg-[#E43D12] text-white font-display font-semibold text-sm"
            >
              Chat with {activeTicket.assignee_name?.split(' ')[0] || 'Specialist'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // 7. CUSTOMER-AGENT CHAT
  // =========================================================
  if (screen === 'chat' && activeTicket) {
    const messages = detailData?.messages || [];
    return (
      <div className="max-w-3xl mx-auto card-surface rounded-3xl overflow-hidden flex flex-col h-[75vh] min-h-[540px]">
        {/* Chat Header */}
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
              src="/src/assets/images/avatar_sarah_1795079071848.jpg"
              name={activeTicket.assignee_name || 'Sarah Lin'}
              online
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1E1E24]">
                  {activeTicket.assignee_name || 'Sarah Lin'}
                </span>
                <span className="text-[11px] font-semibold text-[#D6536D]">Staff</span>
              </div>
              <div className="text-xs text-[#686660]">
                {activeTicket.code} · Replies &lt; 1m
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#E43D12] tabular-nums">
            SLA {activeTicket.sla_minutes_left}m
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F7F6F2]/50">
          {messages.map((m) => {
            if (m.message_type === 'handover') {
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-[#FFA2B6]/15 border border-[#D6536D]/25 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-[#1E1E24]">
                    <span>{m.sender_name}</span>
                    <span className="text-[#686660]">{formatRelativeTime(m.created_at)}</span>
                  </div>
                  <p className="text-[#686660]">{m.body}</p>
                  {m.metadata?.bundle_id && (
                    <div className="text-[#D6536D] font-semibold">
                      Diagnostics bundle {m.metadata.bundle_id} ({m.metadata.bundle_size})
                    </div>
                  )}
                </div>
              );
            }

            const isCustomer = m.sender_role === 'customer';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[11px] text-[#686660] mb-1 px-1">
                  {m.sender_name} · {formatRelativeTime(m.created_at)}
                </div>
                <div
                  className={`max-w-[82%] p-4 rounded-2xl text-sm leading-relaxed ${
                    isCustomer
                      ? 'bg-[#E43D12] text-white rounded-br-sm'
                      : 'bg-white border border-[#E4DFD7] text-[#1E1E24] rounded-bl-sm'
                  }`}
                >
                  {m.body}
                  {m.metadata?.runbook_code && (
                    <div className="mt-3 p-3 rounded-xl bg-[#F7F6F2] text-[#1E1E24] border border-[#E4DFD7] text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold">
                        <span>Runbook {m.metadata.runbook_code}</span>
                        <span className="text-[#E43D12]">
                          {m.metadata.runbook_progress || 85}%
                        </span>
                      </div>
                      <div className="text-[#686660]">{m.metadata.cluster_sync}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions + Composer */}
        <div className="p-4 border-t border-[#E4DFD7] bg-white space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() =>
                handleSendChatMessage('Staging probe verified—please proceed with Canary rollout.')
              }
              className="px-3.5 py-1.5 rounded-full bg-[#FFA2B6]/20 text-[#D6536D] text-xs font-semibold whitespace-nowrap"
            >
              Verify Staging
            </button>
            <button
              type="button"
              onClick={() =>
                handleSendChatMessage('Runbook RB-402 approved for zero-downtime execution.')
              }
              className="px-3.5 py-1.5 rounded-full bg-[#F7F6F2] border border-[#E4DFD7] text-[#1E1E24] text-xs font-semibold whitespace-nowrap"
            >
              Approve Runbook
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Type message to ${activeTicket.assignee_name?.split(' ')[0] || 'Sarah'}...`}
              className="flex-1 h-11 px-4 rounded-full bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
            />
            <button
              type="submit"
              disabled={sendingMsg}
              className="w-11 h-11 rounded-full bg-[#E43D12] text-white flex items-center justify-center shrink-0 hover:bg-[#c8340e]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================
  // 8. AI SMART ASSISTANT
  // =========================================================
  if (screen === 'assistant') {
    return (
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 card-surface rounded-3xl overflow-hidden flex flex-col h-[74vh] min-h-[540px]">
          <div className="p-5 border-b border-[#E4DFD7] bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E43D12] text-white flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-[#1E1E24]">BizAssist AI</h2>
                <p className="text-xs text-[#686660]">Autonomous Co-Pilot · Gemini Connected</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700">99.4% SLA Ready</span>
          </div>

          <div className="p-3 border-b border-[#E4DFD7] bg-[#F7F6F2] flex items-center gap-2 overflow-x-auto">
            {['SAML SSO #BA-8902', 'Cluster Uptime', 'Webhook 504 Triage'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleAskAssistant(`Analyze ${chip}`)}
                className="px-3 py-1.5 rounded-full bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] whitespace-nowrap hover:border-[#E43D12]"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {copilotMsgs.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#1E1E24] text-white'
                      : 'bg-[#F7F6F2] border border-[#E4DFD7] text-[#1E1E24]'
                  }`}
                >
                  <p>{msg.body}</p>

                  {msg.diagnosis_card && (
                    <div className="mt-4 p-4 rounded-2xl bg-white border border-[#E4DFD7] space-y-3">
                      <div className="p-3 rounded-xl bg-[#E43D12]/10 text-xs">
                        <div className="font-bold text-[#E43D12]">
                          {msg.diagnosis_card.root_cause_title}
                        </div>
                        <div className="text-[#1E1E24] mt-0.5">
                          {msg.diagnosis_card.root_cause_detail}
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-[#1E1E24]">
                          <span>Runbook {msg.diagnosis_card.runbook_code}</span>
                          <span className="text-[#686660]">Est. {msg.diagnosis_card.est_secs}s</span>
                        </div>
                        <p className="text-[#686660]">{msg.diagnosis_card.runbook_detail}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await api.executeRunbook(
                              msg.diagnosis_card!.runbook_code,
                              tickets[0]?.id
                            );
                            onToast(
                              `Executed Runbook ${msg.diagnosis_card!.runbook_code} cleanly.`
                            );
                          }}
                          className="flex-1 h-9 rounded-xl bg-[#E43D12] text-white text-xs font-semibold"
                        >
                          Auto-Deploy Fix
                        </button>
                        <button
                          type="button"
                          onClick={() => setScreen('chat')}
                          className="px-4 h-9 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
                        >
                          Handover to Sarah L.
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {askingAssistant && (
              <div className="text-xs text-[#686660] italic">BizAssist AI is analyzing...</div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskAssistant();
            }}
            className="p-4 border-t border-[#E4DFD7] bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              placeholder="Ask BizAssist AI or enter issue ID..."
              className="flex-1 h-11 px-4 rounded-full bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
            />
            <button
              type="submit"
              disabled={askingAssistant}
              className="w-11 h-11 rounded-full bg-[#E43D12] text-white flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <div className="card-surface rounded-3xl p-5 space-y-3">
            <h3 className="font-display text-base font-bold text-[#1E1E24]">
              Common Workflows &amp; FAQs
            </h3>
            <div className="space-y-2 text-xs">
              {[
                'Auto-triage severity logic',
                'Safe operator rollbacks via KMS',
                'IdP wildcard certificate hot-swap',
              ].map((guide) => (
                <button
                  key={guide}
                  type="button"
                  onClick={() => handleAskAssistant(`Explain workflow: ${guide}`)}
                  className="w-full p-3 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] text-left font-medium text-[#1E1E24] hover:border-[#E43D12]"
                >
                  {guide}
                </button>
              ))}
            </div>
          </div>

          <div className="card-surface rounded-3xl p-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar
                src="/src/assets/images/avatar_sarah_1795079071848.jpg"
                name="Sarah Lin"
                online
              />
              <div>
                <div className="text-xs font-bold text-[#1E1E24]">Sarah Lin</div>
                <div className="text-[11px] text-[#686660]">On-call · Pickup &lt; 2m</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScreen('chat')}
              className="px-3.5 py-2 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold"
            >
              Handover
            </button>
          </div>
        </aside>
      </div>
    );
  }

  // =========================================================
  // 9. NOTIFICATIONS CENTER
  // =========================================================
  if (screen === 'notifications') {
    const unread = notifications.filter((n) => !n.is_read).length;
    const filteredNotifs = notifications.filter((n) =>
      notifFilter === 'all' ? true : n.category === notifFilter
    );

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#1E1E24]">
              Notifications <span className="text-[#E43D12] text-base">{unread} New</span>
            </h1>
            <p className="text-sm text-[#686660]">
              Real-time alerts, SLA milestones &amp; AI updates
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await api.markAllNotificationsRead('customer');
              await onRefresh();
              onToast('All notifications marked as read.');
            }}
            className="px-4 py-2 rounded-xl bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
          >
            Mark all read
          </button>
        </div>

        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'urgent', label: 'Urgent P1' },
            { id: 'ai_update', label: 'AI Updates' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setNotifFilter(tab.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                notifFilter === tab.id
                  ? 'bg-[#1E1E24] text-white'
                  : 'bg-white border border-[#E4DFD7] text-[#686660]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredNotifs.map((n) => (
            <div key={n.id} className="card-surface rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#E43D12] uppercase tracking-wide">
                  {n.category === 'urgent' ? 'Urgent P1 Escalation' : 'BizAssist Co-Pilot'}
                </span>
                <span className="text-[#686660]">{formatRelativeTime(n.created_at)}</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold text-[#1E1E24]">{n.title}</h3>
                <p className="text-sm text-[#686660]">{n.body}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (n.ticket_id) setSelectedTicketId(n.ticket_id);
                    setScreen(n.action_type === 'review_approve' ? 'ticket_detail' : 'chat');
                  }}
                  className="px-5 h-10 rounded-full bg-[#E43D12] text-white text-xs font-semibold"
                >
                  {n.action_type === 'review_approve' ? 'Review & Approve' : 'Open Chat'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (n.ticket_id) setSelectedTicketId(n.ticket_id);
                    setScreen('ticket_detail');
                  }}
                  className="px-5 h-10 rounded-full bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
