import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  addTicketMessage,
  assignTicketRecord,
  createTicketRecord,
  ensureDatabaseSeeded,
  executeRunbookRecord,
  findOrCreateUserByEmail,
  getTicketDetail,
  isSupabaseEnabled,
  listCopilotMessages,
  listNotifications,
  listProfiles,
  listRunbooks,
  listTickets,
  markAllNotificationsRead,
  resolveTicketRecord,
  saveCopilotMessage,
  toggleStaffRoutingRecord,
  updateTicketStatusRecord,
} from './server/db.ts';
import {
  askAssistantWithGemini,
  diagnoseTicketWithGemini,
  draftStaffReplyWithGemini,
} from './server/gemini.ts';

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  await ensureDatabaseSeeded();

  // Health & database provider status
  app.get('/api/health', (_req, res) => {
    const supabaseConfigured = isSupabaseEnabled();
    const geminiConfigured = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    res.json({
      status: 'ok',
      dbProvider: supabaseConfigured ? 'supabase' : 'local-store',
      supabaseConfigured,
      geminiConfigured,
    });
  });

  // Expose Supabase SQL schema for admin configuration reference (never exposes secrets)
  app.get('/api/supabase/schema', (_req, res) => {
    const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
    const sql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf-8') : '';
    res.json({
      supabaseConfigured: isSupabaseEnabled(),
      sql,
    });
  });

  // Authentication / Demo Persona & Work Email Sign-In
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, role, fullName } = req.body || {};
      if (!email) {
        return res.status(400).json({ error: 'Work email is required.' });
      }
      const profile = await findOrCreateUserByEmail(email, role, fullName);
      res.json({ profile });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Authentication failed' });
    }
  });

  // Profiles & Specialists
  app.get('/api/profiles', async (_req, res) => {
    try {
      const profiles = await listProfiles();
      res.json({ profiles });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/profiles/:id/routing', async (req, res) => {
    try {
      const { urgent_routing } = req.body || {};
      const updated = await toggleStaffRoutingRecord(req.params.id, Boolean(urgent_routing));
      if (!updated) return res.status(404).json({ error: 'Profile not found' });
      res.json({ profile: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Tickets
  app.get('/api/tickets', async (_req, res) => {
    try {
      const tickets = await listTickets();
      res.json({ tickets });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/tickets/:id', async (req, res) => {
    try {
      const detail = await getTicketDetail(req.params.id);
      if (!detail) return res.status(404).json({ error: 'Ticket not found' });
      res.json(detail);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tickets', async (req, res) => {
    try {
      const ticket = await createTicketRecord(req.body);
      res.status(201).json({ ticket });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tickets/:id/messages', async (req, res) => {
    try {
      const message = await addTicketMessage(req.params.id, req.body);
      res.status(201).json({ message });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/tickets/:id/status', async (req, res) => {
    try {
      const ticket = await updateTicketStatusRecord(req.params.id, req.body);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      res.json({ ticket });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tickets/:id/assign', async (req, res) => {
    try {
      const { assignee_id } = req.body || {};
      const ticket = await assignTicketRecord(req.params.id, assignee_id);
      if (!ticket) return res.status(404).json({ error: 'Ticket or specialist not found' });
      res.json({ ticket });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tickets/:id/resolve', async (req, res) => {
    try {
      const ticket = await resolveTicketRecord(req.params.id, req.body);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      res.json({ ticket });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const role = typeof req.query.role === 'string' ? req.query.role : 'all';
      const notifications = await listNotifications(role);
      res.json({ notifications });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/notifications/mark-read', async (req, res) => {
    try {
      const role = req.body?.role || 'all';
      const notifications = await markAllNotificationsRead(role);
      res.json({ notifications });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Runbooks
  app.get('/api/runbooks', async (_req, res) => {
    try {
      const runbooks = await listRunbooks();
      res.json({ runbooks });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/runbooks/:code/execute', async (req, res) => {
    try {
      const { ticket_id } = req.body || {};
      const runbook = await executeRunbookRecord(req.params.code, ticket_id);
      res.json({ runbook });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Analytics Summary
  app.get('/api/analytics', async (req, res) => {
    try {
      const timeframe = (typeof req.query.timeframe === 'string' ? req.query.timeframe : '7D') as
        | 'Today'
        | '7D'
        | '30D'
        | 'Q3';
      const tickets = await listTickets();
      const openCount = tickets.filter((t) => t.status !== 'resolved').length;
      const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
      const p1Count = tickets.filter((t) => t.severity === 'P1').length;

      const scaleMap = { Today: 1, '7D': 1, '30D': 4, Q3: 11 };
      const mult = scaleMap[timeframe] || 1;

      res.json({
        analytics: {
          timeframe,
          total_ingest: (1477 + tickets.length) * mult,
          ingest_delta: '+12% prev',
          pending: 64 + openCount,
          sla_at_risk: p1Count + 11,
          resolved: (1413 + resolvedCount) * mult,
          csat_pct: 99.4,
          ai_handled: 642 * mult,
          ai_auto_pct: 45.4,
          sla_compliance: 99.4,
          avg_mttr_label: '14m 20s',
          on_call_active: 18,
          on_call_total: 20,
          severity_counts: {
            high: 96 + p1Count,
            med: 364,
            low: 238,
          },
          velocity_points: [
            { label: 'Mon', ingest: 185 * mult, resolved: 179 * mult },
            { label: 'Tue', ingest: 210 * mult, resolved: 204 * mult },
            { label: 'Wed', ingest: 198 * mult, resolved: 196 * mult },
            { label: 'Thu', ingest: 245 * mult, resolved: 239 * mult },
            { label: 'Fri', ingest: 268 * mult, resolved: 254 * mult },
            { label: 'Sat', ingest: 190 * mult, resolved: 186 * mult },
            { label: 'Sun', ingest: 186 * mult, resolved: 181 * mult },
          ],
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Gemini AI Endpoints (Server-Side Only)
  app.post('/api/ai/diagnose', async (req, res) => {
    try {
      const diagnosis = await diagnoseTicketWithGemini(req.body);
      res.json({ diagnosis });
    } catch (err: any) {
      res.status(500).json({
        error: err.message || 'AI diagnosis failed. Verify GEMINI_API_KEY in Settings > Secrets.',
      });
    }
  });

  app.get('/api/ai/assistant', async (req, res) => {
    try {
      const sessionId = typeof req.query.userId === 'string' ? req.query.userId : 'default';
      const messages = await listCopilotMessages(sessionId);
      res.json({ messages });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ai/assistant', async (req, res) => {
    try {
      const { prompt, userId = 'default' } = req.body || {};
      if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

      await saveCopilotMessage({ session_user_id: userId, sender: 'user', body: prompt });

      const tickets = await listTickets();
      const summary = tickets
        .slice(0, 6)
        .map(
          (t) =>
            `${t.code} [${t.severity}] (${t.status}) - ${t.title} | Cluster: ${t.cluster_name} | Assignee: ${t.assignee_name || 'Unassigned'}`
        )
        .join('\n');

      const aiResult = await askAssistantWithGemini(prompt, summary);
      const savedReply = await saveCopilotMessage({
        session_user_id: userId,
        sender: 'assistant',
        body: aiResult.reply,
        diagnosis_card: aiResult.diagnosis_card,
      });

      res.json({ message: savedReply });
    } catch (err: any) {
      res.status(500).json({
        error: err.message || 'BizAssist AI request failed. Check GEMINI_API_KEY in Settings > Secrets.',
      });
    }
  });

  app.post('/api/ai/draft-reply', async (req, res) => {
    try {
      const draft = await draftStaffReplyWithGemini(req.body);
      res.json({ draft });
    } catch (err: any) {
      res.status(500).json({
        error: err.message || 'AI draft failed. Check GEMINI_API_KEY in Settings > Secrets.',
      });
    }
  });

  // Vite middleware for development or static serving in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BizAssist server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
