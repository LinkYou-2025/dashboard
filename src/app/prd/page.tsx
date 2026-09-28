"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useMembership } from "@/lib/useMembership";
import {
  confirmations,
  linkedSpecs,
  prdMeta,
  prdSections,
  prdVersions,
  statusColors,
} from "@/lib/prdContent";

type Tab = "문서" | "버전 이력" | "연결된 스펙";

type Comment = {
  id: string;
  body: string;
  author: string;
  role: string | null;
  createdAt: Timestamp | null;
};

const roleBadgeColor: Record<string, { bg: string; text: string }> = {
  기획자: { bg: "rgba(200,0,255,0.16)", text: "#D28CFF" },
  프론트: { bg: "rgba(44,111,255,0.18)", text: "#6FA0FF" },
  백엔드: { bg: "rgba(53,223,121,0.14)", text: "var(--positive)" },
};

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M12 4v12m0 0 5-5m-5 5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function PRDPage() {
  const { user } = useAuth();
  const { role, isMember } = useMembership();
  const [tab, setTab] = useState<Tab>("문서");
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "prd", "main", "comments"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setComments(
        snap.docs.map((d) => ({
          id: d.id,
          body: d.data().body,
          author: d.data().author,
          role: d.data().role ?? null,
          createdAt: d.data().createdAt ?? null,
        }))
      );
    });
  }, []);

  const postComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !user || !isMember) return;
    setPosting(true);
    await addDoc(collection(db, "prd", "main", "comments"), {
      body: draft.trim(),
      author: user.displayName ?? user.email,
      role,
      createdAt: serverTimestamp(),
    });
    setDraft("");
    setPosting(false);
  };

  const tabs: Tab[] = ["문서", "버전 이력", "연결된 스펙"];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "20px 32px 0", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--gradient)" }} />
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>LinkU PRD</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: "rgba(44,111,255,0.18)", color: "#6FA0FF" }}>
              v{prdMeta.version}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href="/"
              style={{ fontSize: 12, fontWeight: 700, border: "1px solid var(--border)", borderRadius: 8, padding: "7px 14px", color: "var(--text-secondary)", boxSizing: "border-box" }}
            >
              ← Spec Center
            </Link>
            <button
              style={{
                all: "unset", cursor: "pointer", border: "1px solid var(--border)", borderRadius: 8,
                padding: "7px 14px", fontSize: 12, color: "var(--text-secondary)", boxSizing: "border-box",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <DownloadIcon /> 다운로드
            </button>
            {role === "기획자" && (
              <button
                style={{
                  all: "unset", cursor: "pointer", height: 34, padding: "0 16px", borderRadius: 8,
                  background: "var(--gradient)", color: "#fff", fontSize: 12, fontWeight: 700,
                  boxSizing: "border-box", display: "flex", alignItems: "center",
                }}
              >
                PRD 개정 업로드
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginTop: 18, borderBottom: "1px solid var(--border)" }}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                all: "unset", cursor: "pointer", padding: "10px 16px", fontSize: 13,
                fontWeight: tab === t ? 700 : 500, color: tab === t ? "var(--text)" : "var(--text-secondary)",
                borderBottom: `2px solid ${tab === t ? "var(--accent-blue)" : "transparent"}`, boxSizing: "border-box",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flexGrow: 1, display: "flex", gap: 20, margin: "20px 32px 28px", minHeight: 0 }}>
        {tab === "문서" && (
          <div style={{ flexGrow: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, boxSizing: "border-box" }}>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, marginBottom: 24, maxWidth: 520 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700 }}>버전</span>
              <span style={{ fontSize: 12 }}>{prdMeta.version}</span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700 }}>생성일</span>
              <span style={{ fontSize: 12 }}>{prdMeta.createdAt} · {prdMeta.createdBy}</span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700 }}>최종 수정일</span>
              <span style={{ fontSize: 12 }}>{prdMeta.updatedAt} · {prdMeta.updatedBy}</span>
            </div>
            {prdSections.map((s) => (
              <div key={s.heading} style={{ marginBottom: 18 }}>
                <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800 }}>{s.heading}</h2>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: "#D7D9E4", margin: 0 }}>{s.body}</p>
              </div>
            ))}
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>전문은 다운로드하거나 연결된 스펙에서 확인하세요.</p>
          </div>
        )}

        {tab === "버전 이력" && (
          <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", padding: "0 2px" }}>버전 스냅샷</div>
            {prdVersions.map((v) => (
              <div
                key={v.version}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12,
                  background: "var(--surface)", border: "1px solid var(--border)", boxSizing: "border-box",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, width: 60 }}>{v.version}</span>
                <span
                  style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                    background: v.type === "PATCH" ? "rgba(53,223,121,0.14)" : v.type === "MINOR" ? "rgba(245,166,35,0.16)" : "rgba(255,255,255,0.06)",
                    color: v.type === "PATCH" ? "var(--positive)" : v.type === "MINOR" ? "var(--amber)" : "var(--text-secondary)",
                  }}
                >
                  {v.type}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", flexGrow: 1 }}>
                  {v.date}{v.author ? ` · ${v.author}` : ""} · {v.note}
                </span>
                {v.type !== "최초" && (
                  <button style={{ all: "unset", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px" }}>
                    변경분
                  </button>
                )}
                <button
                  aria-label={`${v.version} 다운로드`}
                  style={{ all: "unset", cursor: "pointer", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 8px", display: "flex", color: "var(--text-secondary)" }}
                >
                  <DownloadIcon />
                </button>
              </div>
            ))}

            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", padding: "16px 2px 0" }}>컨펌 이력</div>
            {confirmations.map((c, i) => (
              <div key={i} style={{ padding: "12px 16px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                      background: c.type === "반려" ? "rgba(255,94,94,0.16)" : "rgba(200,0,255,0.16)",
                      color: c.type === "반려" ? "var(--negative)" : "#D28CFF",
                    }}
                  >
                    {c.type}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{c.author}</span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{c.date}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{c.note}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "연결된 스펙" && (
          <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", padding: "0 2px 4px" }}>이 PRD와 연결된 Feature 스펙</div>
            {linkedSpecs.map((s) => (
              <div
                key={s.slug}
                style={{
                  padding: "14px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)",
                  boxSizing: "border-box", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "ui-monospace, monospace", marginTop: 2 }}>
                    {s.slug}{s.version ? ` · ${s.version}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: statusColors[s.status].bg, color: statusColors[s.status].text }}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "문서" && (
          <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
              <CommentIcon /> 논의 {comments.length}건
            </div>
            <div style={{ flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {comments.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>아직 논의가 없어요. 가장 먼저 의견을 남겨보세요.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)", boxSizing: "border-box" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{c.author}</span>
                    {c.role && (
                      <span
                        style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                          background: roleBadgeColor[c.role]?.bg ?? "rgba(255,255,255,0.06)",
                          color: roleBadgeColor[c.role]?.text ?? "var(--text-secondary)",
                        }}
                      >
                        {c.role}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                      {c.createdAt ? c.createdAt.toDate().toLocaleDateString("ko-KR") : "방금"}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{c.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={postComment} style={{ position: "relative" }}>
              <label htmlFor="prd-comment" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                PRD에 대한 의견
              </label>
              <textarea
                id="prd-comment"
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!isMember}
                placeholder={isMember ? "PRD에 대한 의견을 남기세요." : "팀원으로 등록되면 의견을 남길 수 있어요."}
                style={{
                  width: "100%", resize: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px",
                  fontSize: 12, color: "var(--text)", background: "var(--surface)", boxSizing: "border-box",
                }}
              />
              {isMember && (
                <button
                  type="submit"
                  disabled={posting || !draft.trim()}
                  style={{
                    all: "unset", cursor: posting ? "default" : "pointer", marginTop: 8, fontSize: 12, fontWeight: 700,
                    padding: "7px 14px", borderRadius: 8, background: "var(--gradient)", color: "#fff",
                    opacity: !draft.trim() ? 0.5 : 1, display: "inline-block",
                  }}
                >
                  등록
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
