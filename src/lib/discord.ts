type EventType = "prd_comment" | "contract_created" | "contract_approved" | "contract_rejected";

type NotifyArgs = {
  event: EventType;
  title: string;
  description?: string;
  url?: string;
  mentions?: string[];
  author?: string;
};

export async function notifyDiscord(args: NotifyArgs) {
  const relayUrl = process.env.NEXT_PUBLIC_DISCORD_RELAY_URL;
  const clientKey = process.env.NEXT_PUBLIC_DISCORD_CLIENT_KEY;
  // Worker가 아직 배포되지 않았으면 조용히 건너뛴다 (기능은 그대로 동작).
  if (!relayUrl || !clientKey) return;

  try {
    await fetch(relayUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "x-linku-key": clientKey },
      body: JSON.stringify(args),
    });
  } catch {
    // 알림 실패가 실제 기능(댓글 작성, 계약 승인 등)을 막으면 안 된다.
  }
}

// @username, 쉼표/공백으로 구분된 팀원 목록 — 댓글 @멘션 자동완성에 쓴다.
export const TEAM_HANDLES = [
  "dinah05",
  "KateteDeveloper",
  "Hongji03",
  "ugmin1030",
  "codebidoof",
  "hyorim-jo",
  "JiwonLee42",
  "oculo0204",
];

export function extractMentions(text: string): string[] {
  const found = text.match(/@[a-zA-Z0-9_-]+/g) ?? [];
  const handles = new Set(found.map((m) => m.slice(1)));
  return TEAM_HANDLES.filter((h) => handles.has(h));
}
