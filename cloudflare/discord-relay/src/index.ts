export interface Env {
  DISCORD_WEBHOOK_URL: string;
  CLIENT_KEY: string;
  ALLOWED_ORIGIN: string;
}

type EventType = "prd_comment" | "contract_created" | "contract_approved" | "contract_rejected";

type Payload = {
  event: EventType;
  title: string;
  description?: string;
  url?: string;
  mentions?: string[];
  author?: string;
};

const EVENT_COLOR: Record<EventType, number> = {
  prd_comment: 0x2c6fff,
  contract_created: 0xf5a623,
  contract_approved: 0x35df79,
  contract_rejected: 0xff5e5e,
};

const EVENT_LABEL: Record<EventType, string> = {
  prd_comment: "💬 PRD 새 댓글",
  contract_created: "📄 새 API 계약 요청",
  contract_approved: "✅ API 계약 승인",
  contract_rejected: "🚫 API 계약 반려",
};

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-linku-key",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers });
    }
    if (request.headers.get("x-linku-key") !== env.CLIENT_KEY) {
      return new Response("Forbidden", { status: 403, headers });
    }

    let body: Payload;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad Request", { status: 400, headers });
    }

    if (!body.event || !EVENT_LABEL[body.event] || !body.title) {
      return new Response("Bad Request", { status: 400, headers });
    }

    const mentionLine =
      body.mentions && body.mentions.length > 0
        ? `\n👉 ${body.mentions.map((m) => `@${m}`).join(" ")}`
        : "";

    const discordPayload = {
      embeds: [
        {
          title: `${EVENT_LABEL[body.event]} — ${body.title}`,
          description: `${body.description ?? ""}${mentionLine}`.slice(0, 4000),
          url: body.url,
          color: EVENT_COLOR[body.event],
          footer: body.author ? { text: body.author } : undefined,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    if (!res.ok) {
      return new Response(`Discord error (${res.status})`, { status: 502, headers });
    }

    return new Response("ok", { headers });
  },
};
