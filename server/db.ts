import fs from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  INITIAL_COPILOT_MESSAGES,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PROFILES,
  INITIAL_RUNBOOKS,
  INITIAL_TICKETS,
  INITIAL_TIMELINE,
} from './seedData.ts';

interface LocalStore {
  profiles: any[];
  tickets: any[];
  ticket_messages: any[];
  ticket_timeline: any[];
  notifications: any[];
  runbooks: any[];
  ai_copilot_messages: any[];
}

const LOCAL_DB_PATH = path.resolve(process.cwd(), '.bizassist-local-db.json');

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('MY_SUPABASE') || key.includes('MY_SUPABASE')) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseEnabled(): boolean {
  return getSupabaseAdmin() !== null;
}

function readLocalStore(): LocalStore {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const initial: LocalStore = {
      profiles: structuredClone(INITIAL_PROFILES),
      tickets: structuredClone(INITIAL_TICKETS),
      ticket_messages: structuredClone(INITIAL_MESSAGES),
      ticket_timeline: structuredClone(INITIAL_TIMELINE),
      notifications: structuredClone(INITIAL_NOTIFICATIONS),
      runbooks: structuredClone(INITIAL_RUNBOOKS),
      ai_copilot_messages: structuredClone(INITIAL_COPILOT_MESSAGES),
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
  return JSON.parse(raw) as LocalStore;
}

function writeLocalStore(store: LocalStore): void {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

let seededSupabase = false;

export async function ensureDatabaseSeeded(): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    readLocalStore();
    return;
  }
  if (seededSupabase) return;

  try {
    const { data: existingProfiles, error } = await sb.from('profiles').select('id').limit(1);
    if (error) {
      console.warn('[Supabase] Schema check warning:', error.message);
      return;
    }
    if (!existingProfiles || existingProfiles.length === 0) {
      await sb.from('profiles').upsert(INITIAL_PROFILES);
      await sb.from('tickets').upsert(INITIAL_TICKETS);
      await sb.from('ticket_messages').upsert(INITIAL_MESSAGES);
      await sb.from('ticket_timeline').upsert(INITIAL_TIMELINE);
      await sb.from('notifications').upsert(INITIAL_NOTIFICATIONS);
      await sb.from('runbooks').upsert(INITIAL_RUNBOOKS);
      await sb.from('ai_copilot_messages').upsert(INITIAL_COPILOT_MESSAGES);
    }
    seededSupabase = true;
  } catch (err) {
    console.warn('[Supabase] Auto-seed skipped:', err);
  }
}

export async function listProfiles() {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('profiles').select('*').order('full_name');
    if (!error && data) return data;
  }
  return readLocalStore().profiles;
}

export async function findOrCreateUserByEmail(email: string, roleHint?: string, fullName?: string) {
  const normalized = email.trim().toLowerCase();
  const sb = getSupabaseAdmin();
  const profiles = await listProfiles();
  const found = profiles.find((p) => p.email.toLowerCase() === normalized);
  if (found) return found;

  const newProfile = {
    id: `user-${Date.now()}`,
    email: normalized,
    full_name: fullName?.trim() || normalized.split('@')[0].replace(/[._]/g, ' '),
    role: roleHint === 'staff' || roleHint === 'admin' ? roleHint : 'customer',
    title: roleHint === 'staff' ? 'Support Specialist' : roleHint === 'admin' ? 'Operations Admin' : 'Enterprise Lead',
    company: 'Acme Enterprise',
    department: 'Cloud Platform',
    tier: 'Tier-1 SLA',
    avatar_url: '/src/assets/images/avatar_elena_1795079072007.jpg',
    on_call: roleHint !== 'customer',
    urgent_routing: true,
    csat_score: 99.0,
    avg_resolve_mins: 15,
    resolved_month: 12,
    active_load: 1,
    max_load: 5,
    shift_label: 'Active Session',
  };

  if (sb) {
    const { data, error } = await sb.from('profiles').insert(newProfile).select().single();
    if (!error && data) return data;
  }
  const store = readLocalStore();
  store.profiles.push(newProfile);
  writeLocalStore(store);
  return newProfile;
}

export async function listTickets() {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data;
  }
  const store = readLocalStore();
  return [...store.tickets].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getTicketDetail(ticketId: string) {
  const sb = getSupabaseAdmin();
  if (sb) {
    const [{ data: ticket }, { data: messages }, { data: timeline }] = await Promise.all([
      sb.from('tickets').select('*').eq('id', ticketId).maybeSingle(),
      sb.from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
      sb.from('ticket_timeline').select('*').eq('ticket_id', ticketId).order('stage_order', { ascending: true }),
    ]);
    if (ticket) {
      return { ticket, messages: messages || [], timeline: timeline || [] };
    }
  }
  const store = readLocalStore();
  const ticket = store.tickets.find((t) => t.id === ticketId || t.code === ticketId);
  if (!ticket) return null;
  const messages = store.ticket_messages
    .filter((m) => m.ticket_id === ticket.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const timeline = store.ticket_timeline
    .filter((t) => t.ticket_id === ticket.id)
    .sort((a, b) => a.stage_order - b.stage_order);
  return { ticket, messages, timeline };
}

export async function createTicketRecord(payload: {
  title: string;
  domain_category: string;
  severity: string;
  payload_description: string;
  attachment_name?: string | null;
  attachment_size?: string | null;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_role: string;
  company: string;
  cluster_name?: string;
  ai_diagnosis?: any;
}) {
  const existing = await listTickets();
  const randomNum = 8920 + existing.length + Math.floor(Math.random() * 50);
  const id = `tkt-${randomNum}`;
  const code = `#BA-${randomNum}`;
  const now = new Date().toISOString();
  const assigneeId = payload.ai_diagnosis?.recommended_assignee_id || 'staff-sarah';
  const assigneeName = payload.ai_diagnosis?.recommended_assignee_name || 'Sarah Lin';

  const ticket = {
    id,
    code,
    title: payload.title,
    domain_category: payload.domain_category,
    severity: payload.severity,
    status: 'open',
    customer_id: payload.customer_id,
    customer_name: payload.customer_name,
    customer_email: payload.customer_email,
    customer_role: payload.customer_role,
    company: payload.company,
    cluster_name: payload.cluster_name || 'auth-cluster-east',
    assignee_id: assigneeId,
    assignee_name: assigneeName,
    assignee_tier: 'Tier-2 Infra Specialist',
    payload_description: payload.payload_description,
    attachment_name: payload.attachment_name || null,
    attachment_size: payload.attachment_size || null,
    ai_diagnosis: payload.ai_diagnosis || null,
    resolution_notes: null,
    sla_minutes_left: payload.severity === 'P1' ? 15 : payload.severity === 'P2' ? 45 : 120,
    sla_target_mins: payload.severity === 'P1' ? 15 : payload.severity === 'P2' ? 45 : 120,
    progress_pct: 25,
    created_at: now,
    updated_at: now,
  };

  const timeline = [
    {
      id: `tl-${Date.now()}-1`,
      ticket_id: id,
      stage_order: 1,
      title: 'Ticket Recorded & Tokenized',
      description: `Initiated by ${payload.customer_name} via Enterprise Support Portal.`,
      status: 'completed',
      attachment_name: payload.attachment_name || undefined,
      timestamp_label: 'Just now',
    },
    {
      id: `tl-${Date.now()}-2`,
      ticket_id: id,
      stage_order: 2,
      title: 'Telemetry & Log Correlator',
      description: payload.ai_diagnosis?.predicted_root_cause || 'Correlating edge cluster latency & memory spikes.',
      badge_text: `${payload.ai_diagnosis?.confidence || 94}% Fit`,
      status: 'active',
      progress_pct: 45,
      timestamp_label: 'Running',
    },
    {
      id: `tl-${Date.now()}-3`,
      ticket_id: id,
      stage_order: 3,
      title: 'Specialist Handover Routing',
      description: `Queued to ${assigneeName} · Tier-2 Infrastructure.`,
      status: 'pending',
      timestamp_label: 'Pending Stage 3',
    },
  ];

  const initialMsg = {
    id: `msg-${Date.now()}`,
    ticket_id: id,
    sender_id: 'ai-copilot',
    sender_name: 'BizAssist AI Handover',
    sender_role: 'ai',
    message_type: 'handover',
    body: `BizAssist AI auto-triaged ${code} and routed diagnostic telemetry to ${assigneeName}.`,
    metadata: {
      bundle_id: `#DIAG-${randomNum}`,
      bundle_size: '2.4MB',
    },
    created_at: now,
  };

  const notif = {
    id: `notif-${Date.now()}`,
    target_role: 'staff',
    ticket_id: id,
    ticket_code: code,
    category: payload.severity === 'P1' ? 'urgent' : 'assignment',
    title: `New ${payload.severity} Ticket ${code}`,
    body: `${payload.title} · Assigned to ${assigneeName}`,
    is_read: false,
    action_type: 'open_chat',
    created_at: now,
  };

  const sb = getSupabaseAdmin();
  if (sb) {
    await sb.from('tickets').insert(ticket);
    await sb.from('ticket_timeline').insert(timeline);
    await sb.from('ticket_messages').insert(initialMsg);
    await sb.from('notifications').insert(notif);
    return ticket;
  }

  const store = readLocalStore();
  store.tickets.unshift(ticket);
  store.ticket_timeline.push(...timeline);
  store.ticket_messages.push(initialMsg);
  store.notifications.unshift(notif);
  writeLocalStore(store);
  return ticket;
}

export async function addTicketMessage(
  ticketId: string,
  msg: {
    sender_id: string;
    sender_name: string;
    sender_role: string;
    message_type?: string;
    body: string;
    metadata?: any;
  }
) {
  const record = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ticket_id: ticketId,
    sender_id: msg.sender_id,
    sender_name: msg.sender_name,
    sender_role: msg.sender_role,
    message_type: msg.message_type || 'text',
    body: msg.body,
    metadata: msg.metadata || null,
    created_at: new Date().toISOString(),
  };

  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('ticket_messages').insert(record).select().single();
    if (!error && data) return data;
  }
  const store = readLocalStore();
  store.ticket_messages.push(record);
  writeLocalStore(store);
  return record;
}

export async function updateTicketStatusRecord(
  ticketId: string,
  updates: { status: string; reason?: string; notifyCustomer?: boolean }
) {
  const now = new Date().toISOString();
  const progressMap: Record<string, number> = {
    open: 20,
    in_progress: 68,
    waiting_customer: 55,
    escalated: 75,
    pending_verification: 90,
    resolved: 100,
  };
  const progress_pct = progressMap[updates.status] ?? 50;

  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from('tickets')
      .update({ status: updates.status, progress_pct, updated_at: now })
      .eq('id', ticketId)
      .select()
      .single();

    if (updates.reason) {
      await addTicketMessage(ticketId, {
        sender_id: 'system',
        sender_name: 'Status Transition',
        sender_role: 'system',
        message_type: 'diagnostic',
        body: `Ticket moved to ${updates.status.replace('_', ' ')}: ${updates.reason}`,
      });
    }
    if (data) return data;
  }

  const store = readLocalStore();
  const idx = store.tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return null;
  store.tickets[idx] = {
    ...store.tickets[idx],
    status: updates.status,
    progress_pct,
    updated_at: now,
  };
  if (updates.reason) {
    store.ticket_messages.push({
      id: `msg-${Date.now()}`,
      ticket_id: ticketId,
      sender_id: 'system',
      sender_name: 'Status Transition',
      sender_role: 'system',
      message_type: 'diagnostic',
      body: `Ticket moved to ${updates.status.replace('_', ' ')}: ${updates.reason}`,
      created_at: now,
    });
  }
  writeLocalStore(store);
  return store.tickets[idx];
}

export async function assignTicketRecord(ticketId: string, assigneeId: string) {
  const profiles = await listProfiles();
  const specialist = profiles.find((p) => p.id === assigneeId);
  if (!specialist) return null;
  const now = new Date().toISOString();

  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from('tickets')
      .update({
        assignee_id: specialist.id,
        assignee_name: specialist.full_name,
        assignee_tier: specialist.title,
        status: 'in_progress',
        updated_at: now,
      })
      .eq('id', ticketId)
      .select()
      .single();

    await sb.from('notifications').insert({
      id: `notif-${Date.now()}`,
      target_role: 'customer',
      ticket_id: ticketId,
      ticket_code: data?.code || '',
      category: 'assignment',
      title: `Specialist Assigned: ${specialist.full_name}`,
      body: `${specialist.full_name} (${specialist.title}) is now actively investigating your ticket.`,
      is_read: false,
      action_type: 'open_chat',
      created_at: now,
    });
    if (data) return data;
  }

  const store = readLocalStore();
  const idx = store.tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return null;
  store.tickets[idx] = {
    ...store.tickets[idx],
    assignee_id: specialist.id,
    assignee_name: specialist.full_name,
    assignee_tier: specialist.title,
    status: 'in_progress',
    updated_at: now,
  };
  store.notifications.unshift({
    id: `notif-${Date.now()}`,
    target_role: 'customer',
    ticket_id: ticketId,
    ticket_code: store.tickets[idx].code,
    category: 'assignment',
    title: `Specialist Assigned: ${specialist.full_name}`,
    body: `${specialist.full_name} (${specialist.title}) is now actively investigating your ticket.`,
    is_read: false,
    action_type: 'open_chat',
    created_at: now,
  });
  writeLocalStore(store);
  return store.tickets[idx];
}

export async function resolveTicketRecord(
  ticketId: string,
  notes: {
    root_cause_classification: string;
    remediation_method: string;
    internal_staff_notes: string;
    customer_facing_summary: string;
    resolved_by: string;
  }
) {
  const now = new Date().toISOString();
  const resolution_notes = {
    ...notes,
    resolved_at: now,
    time_to_resolution_label: '18m 42s',
    sla_beat_label: 'Beat SLA by 06m 18s',
  };

  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from('tickets')
      .update({
        status: 'resolved',
        progress_pct: 100,
        sla_minutes_left: 0,
        resolution_notes,
        updated_at: now,
      })
      .eq('id', ticketId)
      .select()
      .single();

    await sb
      .from('ticket_timeline')
      .update({ status: 'completed', progress_pct: 100 })
      .eq('ticket_id', ticketId);

    if (data) return data;
  }

  const store = readLocalStore();
  const idx = store.tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return null;
  store.tickets[idx] = {
    ...store.tickets[idx],
    status: 'resolved',
    progress_pct: 100,
    sla_minutes_left: 0,
    resolution_notes,
    updated_at: now,
  };
  store.ticket_timeline = store.ticket_timeline.map((tl) =>
    tl.ticket_id === ticketId ? { ...tl, status: 'completed', progress_pct: 100 } : tl
  );
  writeLocalStore(store);
  return store.tickets[idx];
}

export async function listNotifications(role?: string) {
  const sb = getSupabaseAdmin();
  if (sb) {
    let query = sb.from('notifications').select('*').order('created_at', { ascending: false });
    if (role && role !== 'all') {
      query = query.in('target_role', [role, 'all']);
    }
    const { data, error } = await query;
    if (!error && data) return data;
  }
  const store = readLocalStore();
  return store.notifications
    .filter((n) => !role || role === 'all' || n.target_role === role || n.target_role === 'all')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function markAllNotificationsRead(role?: string) {
  const sb = getSupabaseAdmin();
  if (sb) {
    if (role && role !== 'all') {
      await sb.from('notifications').update({ is_read: true }).eq('target_role', role);
    } else {
      await sb.from('notifications').update({ is_read: true }).neq('id', '');
    }
    return listNotifications(role);
  }
  const store = readLocalStore();
  store.notifications = store.notifications.map((n) =>
    !role || role === 'all' || n.target_role === role ? { ...n, is_read: true } : n
  );
  writeLocalStore(store);
  return listNotifications(role);
}

export async function listRunbooks() {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('runbooks').select('*');
    if (!error && data) return data;
  }
  return readLocalStore().runbooks;
}

export async function executeRunbookRecord(code: string, ticketId?: string) {
  const now = new Date().toISOString();
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from('runbooks')
      .update({ last_status: 'Pass (28s)', last_executed_at: now })
      .eq('code', code)
      .select()
      .single();
    if (ticketId) {
      await addTicketMessage(ticketId, {
        sender_id: 'ai-copilot',
        sender_name: 'BizAssist Runbook Engine',
        sender_role: 'ai',
        message_type: 'runbook',
        body: `Runbook ${code} executed across target cluster with 0 errors (99.98% traffic verified).`,
        metadata: {
          runbook_code: code,
          runbook_progress: 100,
          cluster_sync: 'Cluster sync verified',
        },
      });
    }
    if (data) return data;
  }

  const store = readLocalStore();
  const idx = store.runbooks.findIndex((r) => r.code === code);
  if (idx !== -1) {
    store.runbooks[idx] = { ...store.runbooks[idx], last_status: 'Pass (28s)', last_executed_at: now };
  }
  if (ticketId) {
    store.ticket_messages.push({
      id: `msg-${Date.now()}`,
      ticket_id: ticketId,
      sender_id: 'ai-copilot',
      sender_name: 'BizAssist Runbook Engine',
      sender_role: 'ai',
      message_type: 'runbook',
      body: `Runbook ${code} executed across target cluster with 0 errors (99.98% traffic verified).`,
      metadata: {
        runbook_code: code,
        runbook_progress: 100,
        cluster_sync: 'Cluster sync verified',
      },
      created_at: now,
    });
  }
  writeLocalStore(store);
  return idx !== -1 ? store.runbooks[idx] : { code, last_status: 'Pass (28s)' };
}

export async function toggleStaffRoutingRecord(profileId: string, urgentRouting: boolean) {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from('profiles')
      .update({ urgent_routing: urgentRouting })
      .eq('id', profileId)
      .select()
      .single();
    if (data) return data;
  }
  const store = readLocalStore();
  const idx = store.profiles.findIndex((p) => p.id === profileId);
  if (idx === -1) return null;
  store.profiles[idx] = { ...store.profiles[idx], urgent_routing: urgentRouting };
  writeLocalStore(store);
  return store.profiles[idx];
}

export async function listCopilotMessages(sessionUserId = 'default') {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from('ai_copilot_messages')
      .select('*')
      .in('session_user_id', [sessionUserId, 'default'])
      .order('created_at', { ascending: true });
    if (!error && data) return data;
  }
  const store = readLocalStore();
  return store.ai_copilot_messages.filter(
    (m) => m.session_user_id === sessionUserId || m.session_user_id === 'default'
  );
}

export async function saveCopilotMessage(msg: {
  session_user_id: string;
  sender: 'user' | 'assistant';
  body: string;
  diagnosis_card?: any;
}) {
  const record = {
    id: `ai-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    session_user_id: msg.session_user_id || 'default',
    sender: msg.sender,
    body: msg.body,
    diagnosis_card: msg.diagnosis_card || null,
    created_at: new Date().toISOString(),
  };

  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('ai_copilot_messages').insert(record).select().single();
    if (!error && data) return data;
  }
  const store = readLocalStore();
  store.ai_copilot_messages.push(record);
  writeLocalStore(store);
  return record;
}
