const BACKEND_REPO = "LinkYou-2025/LinkU_backend";

export async function createBackendIssue(token: string, title: string, body: string) {
  const res = await fetch(`https://api.github.com/repos/${BACKEND_REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({ title, body, labels: ["api-contract"] }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? `GitHub API 오류 (${res.status})`);
  }

  return res.json() as Promise<{ html_url: string; number: number }>;
}
