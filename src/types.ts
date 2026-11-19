export type UserRole = 'customer' | 'staff' | 'admin';

export type TicketSeverity = 'P1' | 'P2' | 'P3' | 'Low' | 'Medium';

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'escalated'
  | 'pending_verification'
  | 'resolved';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  title: string;
  company: string;
  department: string;
  tier: string;
  avatar_url: string;
  on_call: boolean;
  urgent_routing: boolean;
  csat_score: number;
  avg_resolve_mins: number;
  resolved_month: number;
  active_load: number;
  max_load: number;
  shift_label: string;
}

export interface AIDiagnosis {
  predicted_root_cause: string;
  confidence: number;
  recommended_runbook: string;
  runbook_title: string;
  estimated_resolution: string;
  routing_destination: string;
  recommended_assignee_id: string;
  recommended_assignee_name: string;
  skill_fit?: string;
}

export interface ResolutionNotes {
  root_cause_classification: string;
  remediation_method: string;
  internal_staff_notes: string;
  customer_facing_summary: string;
  resolved_by: string;
  resolved_at: string;
  time_to_resolution_label: string;
  sla_beat_label: string;
}

export interface Ticket {
  id: string;
  code: string;
  title: string;
  domain_category: string;
  severity: TicketSeverity;
  status: TicketStatus;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_role: string;
  company: string;
  cluster_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_tier: string | null;
  payload_description: string;
  attachment_name: string | null;
  attachment_size: string | null;
  ai_diagnosis: AIDiagnosis | null;
  resolution_notes: ResolutionNotes | null;
  sla_minutes_left: number;
  sla_target_mins: number;
  progress_pct: number;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'customer' | 'staff' | 'admin' | 'ai' | 'system';
  message_type: 'text' | 'handover' | 'runbook' | 'diagnostic';
  body: string;
  metadata?: {
    runbook_code?: string;
    runbook_progress?: number;
    cluster_sync?: string;
    bundle_id?: string;
    bundle_size?: string;
    badge?: string;
  };
  created_at: string;
}

export interface TimelineStage {
  id: string;
  ticket_id: string;
  stage_order: number;
  title: string;
  description: string;
  badge_text?: string;
  status: 'completed' | 'active' | 'pending';
  progress_pct?: number;
  attachment_name?: string;
  timestamp_label: string;
}

export interface AppNotification {
  id: string;
  target_role: UserRole | 'all';
  ticket_id?: string;
  ticket_code?: string;
  category: 'urgent' | 'ai_update' | 'assignment' | 'runbook';
  title: string;
  body: string;
  is_read: boolean;
  action_type?: string;
  created_at: string;
}

export interface Runbook {
  code: string;
  title: string;
  description: string;
  estimated_secs: number;
  confidence: number;
  last_status: string;
  last_executed_at?: string;
}

export interface AICopilotMessage {
  id: string;
  session_user_id: string;
  sender: 'user' | 'assistant';
  body: string;
  diagnosis_card?: {
    root_cause_title: string;
    root_cause_detail: string;
    runbook_code: string;
    runbook_detail: string;
    est_secs: number;
    recommended_specialist: string;
  };
  created_at: string;
}

export interface AnalyticsSummary {
  timeframe: 'Today' | '7D' | '30D' | 'Q3';
  total_ingest: number;
  ingest_delta: string;
  pending: number;
  sla_at_risk: number;
  resolved: number;
  csat_pct: number;
  ai_handled: number;
  ai_auto_pct: number;
  sla_compliance: number;
  avg_mttr_label: string;
  on_call_active: number;
  on_call_total: number;
  severity_counts: {
    high: number;
    med: number;
    low: number;
  };
  velocity_points: Array<{
    label: string;
    ingest: number;
    resolved: number;
  }>;
}

export interface HealthStatus {
  status: string;
  dbProvider: 'supabase' | 'local-store';
  supabaseConfigured: boolean;
  geminiConfigured: boolean;
}
