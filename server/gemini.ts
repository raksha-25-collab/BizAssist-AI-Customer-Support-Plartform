import { GoogleGenAI, Type } from '@google/genai';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface DiagnosisInput {
  title: string;
  domain_category: string;
  severity: string;
  payload_description: string;
  cluster_name?: string;
}

export async function diagnoseTicketWithGemini(input: DiagnosisInput) {
  const ai = getGeminiClient();

  const prompt = `Analyze this enterprise support incident and produce a technical triage diagnosis.
Domain: ${input.domain_category}
Severity: ${input.severity}
Cluster: ${input.cluster_name || 'auth-cluster-east'}
Title: ${input.title}
Context: ${input.payload_description}

Available specialists:
- staff-sarah: Sarah Lin (Tier-2 Infra Specialist, skill fit: L4 Gateway & IdP)
- staff-marcus-kane: Marcus Kane (Senior Distributed Systems, skill fit: Distributed Sync & TLS)
- staff-aisha: Aisha Patel (API & Webhook Architect, skill fit: API Gateway & Webhooks)

Available runbooks:
- RB-402: OAuth2 Bearer & KMS Cert Hot-Reload
- RB-318: Ingress Pool Drain & Upstream Rebalance
- RB-215: Redis Replica Buffer Throttling`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are BizAssist AI Copilot, an enterprise SRE incident diagnostics engine. Return concise, realistic technical root cause predictions.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          predicted_root_cause: { type: Type.STRING },
          confidence: { type: Type.INTEGER },
          recommended_runbook: { type: Type.STRING },
          runbook_title: { type: Type.STRING },
          estimated_resolution: { type: Type.STRING },
          routing_destination: { type: Type.STRING },
          recommended_assignee_id: { type: Type.STRING },
          recommended_assignee_name: { type: Type.STRING },
          skill_fit: { type: Type.STRING },
        },
        required: [
          'predicted_root_cause',
          'confidence',
          'recommended_runbook',
          'runbook_title',
          'estimated_resolution',
          'routing_destination',
          'recommended_assignee_id',
          'recommended_assignee_name',
          'skill_fit',
        ],
      },
    },
  });

  const text = (response.text ?? '{}').trim();
  return JSON.parse(text);
}

export async function askAssistantWithGemini(prompt: string, ticketsSummary: string) {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Active Platform Tickets Context:\n${ticketsSummary}\n\nUser Question: ${prompt}`,
    config: {
      systemInstruction:
        'You are BizAssist AI, an enterprise support and SRE co-pilot. Answer concisely and accurately using the provided platform ticket context. If the prompt relates to an outage, ticket code, or infrastructure failure, include a structured diagnosis_card; otherwise omit diagnosis_card or set has_diagnosis to false.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          has_diagnosis: { type: Type.BOOLEAN },
          diagnosis_card: {
            type: Type.OBJECT,
            properties: {
              root_cause_title: { type: Type.STRING },
              root_cause_detail: { type: Type.STRING },
              runbook_code: { type: Type.STRING },
              runbook_detail: { type: Type.STRING },
              est_secs: { type: Type.INTEGER },
              recommended_specialist: { type: Type.STRING },
            },
          },
        },
        required: ['reply', 'has_diagnosis'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  return {
    reply: String(parsed.reply || 'Analysis complete.'),
    diagnosis_card: parsed.has_diagnosis ? parsed.diagnosis_card : undefined,
  };
}

export async function draftStaffReplyWithGemini(input: {
  ticketCode: string;
  ticketTitle: string;
  customerName: string;
  payloadDescription: string;
  mode: 'chat_reply' | 'resolution_summary';
}) {
  const ai = getGeminiClient();

  const prompt =
    input.mode === 'resolution_summary'
      ? `Write a concise, reassuring 2-sentence customer-facing resolution summary for ticket ${input.ticketCode} (${input.ticketTitle}) addressed to ${input.customerName}. Context: ${input.payloadDescription}`
      : `Write a concise, helpful 2-sentence specialist chat response to ${input.customerName} regarding ${input.ticketCode} (${input.ticketTitle}). Context: ${input.payloadDescription}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are drafting an enterprise support response for a Tier-2 Infrastructure Specialist. Be direct, calm, and technically precise.',
    },
  });

  return (response.text ?? '').trim();
}
