import type {
  AICopilotMessage,
  AnalyticsSummary,
  AppNotification,
  HealthStatus,
  Runbook,
  Ticket,
  TicketMessage,
  TimelineStage,
  UserProfile,
} from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getHealth: () => request<HealthStatus>('/api/health'),
  getSupabaseSchema: () => request<{ supabaseConfigured: boolean; sql: string }>('/api/supabase/schema'),

  login: (email: string, role?: string, fullName?: string) =>
    request<{ profile: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, role, fullName }),
    }),

  getProfiles: () => request<{ profiles: UserProfile[] }>('/api/profiles'),
  toggleStaffRouting: (id: string, urgent_routing: boolean) =>
    request<{ profile: UserProfile }>(`/api/profiles/${id}/routing`, {
      method: 'PATCH',
      body: JSON.stringify({ urgent_routing }),
    }),

  getTickets: () => request<{ tickets: Ticket[] }>('/api/tickets'),
  getTicketDetail: (id: string) =>
    request<{ ticket: Ticket; messages: TicketMessage[]; timeline: TimelineStage[] }>(
      `/api/tickets/${encodeURIComponent(id)}`
    ),
  createTicket: (payload: any) =>
    request<{ ticket: Ticket }>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendTicketMessage: (ticketId: string, payload: any) =>
    request<{ message: TicketMessage }>(`/api/tickets/${encodeURIComponent(ticketId)}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTicketStatus: (
    ticketId: string,
    payload: { status: string; reason?: string; notifyCustomer?: boolean }
  ) =>
    request<{ ticket: Ticket }>(`/api/tickets/${encodeURIComponent(ticketId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  assignTicket: (ticketId: string, assignee_id: string) =>
    request<{ ticket: Ticket }>(`/api/tickets/${encodeURIComponent(ticketId)}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignee_id }),
    }),
  resolveTicket: (ticketId: string, payload: any) =>
    request<{ ticket: Ticket }>(`/api/tickets/${encodeURIComponent(ticketId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getNotifications: (role: string) =>
    request<{ notifications: AppNotification[] }>(
      `/api/notifications?role=${encodeURIComponent(role)}`
    ),
  markAllNotificationsRead: (role: string) =>
    request<{ notifications: AppNotification[] }>('/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  getRunbooks: () => request<{ runbooks: Runbook[] }>('/api/runbooks'),
  executeRunbook: (code: string, ticket_id?: string) =>
    request<{ runbook: Runbook }>(`/api/runbooks/${encodeURIComponent(code)}/execute`, {
      method: 'POST',
      body: JSON.stringify({ ticket_id }),
    }),

  getAnalytics: (timeframe: string) =>
    request<{ analytics: AnalyticsSummary }>(
      `/api/analytics?timeframe=${encodeURIComponent(timeframe)}`
    ),

  diagnoseTicket: (payload: {
    title: string;
    domain_category: string;
    severity: string;
    payload_description: string;
    cluster_name?: string;
  }) =>
    request<{ diagnosis: any }>('/api/ai/diagnose', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAssistantMessages: (userId: string) =>
    request<{ messages: AICopilotMessage[] }>(
      `/api/ai/assistant?userId=${encodeURIComponent(userId)}`
    ),
  askAssistant: (prompt: string, userId: string) =>
    request<{ message: AICopilotMessage }>('/api/ai/assistant', {
      method: 'POST',
      body: JSON.stringify({ prompt, userId }),
    }),
  draftReply: (payload: {
    ticketCode: string;
    ticketTitle: string;
    customerName: string;
    payloadDescription: string;
    mode: 'chat_reply' | 'resolution_summary';
  }) =>
    request<{ draft: string }>('/api/ai/draft-reply', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
