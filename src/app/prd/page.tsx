"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useMembership } from "@/lib/useMembership";
import { Avatar } from "@/components/Avatar";
import { extractMentions, notifyDiscord, TEAM_HANDLES } from "@/lib/discord";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  confirmations,
  linkedSpecs,
  prdMarkdown,
  prdMeta,
  prdVersions,
  statusColors,
} from "@/lib/prdContent";

type Tab = "문서" | "버전 이력" | "연결된 스펙" | "구현 현황";

type ImplStatus = {
  markdown: string;
  updatedAt: Timestamp | null;
  updatedBy: string | null;
};

type Comment = {
  id: string;
  body: string;
  author: string;
  authorPhoto: string | null;
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
  const { user, githubUsername } = useAuth();
  const { role, isMember } = useMembership();
  const [tab, setTab] = useState<Tab>("문서");
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const [implStatus, setImplStatus] = useState<ImplStatus | null>(null);
  const [implEditing, setImplEditing] = useState(false);
  const [implDraft, setImplDraft] = useState("");
  const [implSaving, setImplSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "prd", "main", "comments"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setComments(
        snap.docs.map((d) => ({
          id: d.id,
          body: d.data().body,
          author: d.data().author,
          authorPhoto: d.data().authorPhoto ?? null,
          role: d.data().role ?? null,
          createdAt: d.data().createdAt ?? null,
        }))
      );
    });
  }, []);

  useEffect(() => {
    return onSnapshot(doc(db, "implementationStatus", "main"), (snap) => {
      if (snap.exists()) {
        setImplStatus({
          markdown: snap.data().markdown ?? "",
          updatedAt: snap.data().updatedAt ?? null,
          updatedBy: snap.data().updatedBy ?? null,
        });
      } else {
        setImplStatus(null);
      }
    });
  }, []);

  const startImplEdit = () => {
    setImplDraft(implStatus?.markdown ?? "");
    setImplEditing(true);
  };

  const saveImplStatus = async () => {
    if (!user || !isMember) return;
    setImplSaving(true);
    await setDoc(doc(db, "implementationStatus", "main"), {
      markdown: implDraft,
      updatedAt: serverTimestamp(),
      updatedBy: user.displayName ?? user.email,
    });
    setImplSaving(false);
    setImplEditing(false);
  };

  const postComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !user || !isMember) return;
    setPosting(true);
    const author = githubUsername ?? user.displayName ?? user.email ?? "unknown";
    await addDoc(collection(db, "prd", "main", "comments"), {
      body: draft.trim(),
      author,
      authorPhoto: user.photoURL ?? null,
      role,
      createdAt: serverTimestamp(),
    });
    const mentions = extractMentions(draft);
    notifyDiscord({
      event: "prd_comment",
      title: `${author}님이 PRD에 댓글을 남겼어요`,
      description: draft.trim(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      mentions,
      author,
    });
    setDraft("");
    setPosting(false);
  };

  const tabs: Tab[] = ["문서", "버전 이력", "연결된 스펙", "구현 현황"];

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
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: (p) => <h2 style={{ margin: "26px 0 10px", fontSize: 19, fontWeight: 800 }} {...p} />,
                h3: (p) => <h3 style={{ margin: "20px 0 8px", fontSize: 15, fontWeight: 800, color: "var(--text-secondary)" }} {...p} />,
                p: (p) => <p style={{ fontSize: 13, lineHeight: 1.8, color: "#D7D9E4", margin: "0 0 10px" }} {...p} />,
                strong: (p) => <strong style={{ color: "var(--text)" }} {...p} />,
                ul: (p) => <ul style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 13, lineHeight: 1.8, color: "#D7D9E4" }} {...p} />,
                li: (p) => <li style={{ marginBottom: 4 }} {...p} />,
                blockquote: (p) => <blockquote style={{ margin: "0 0 12px", padding: "8px 14px", borderLeft: "3px solid var(--accent-blue)", background: "rgba(44,111,255,0.08)", fontSize: 12, color: "var(--text-secondary)" }} {...p} />,
                code: (p) => <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, fontSize: 12, fontFamily: "ui-monospace, monospace" }} {...p} />,
                table: (p) => (
                  <div style={{ overflowX: "auto", marginBottom: 14 }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }} {...p} />
                  </div>
                ),
                th: (p) => <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)", fontWeight: 700, whiteSpace: "nowrap" }} {...p} />,
                td: (p) => <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "#D7D9E4", verticalAlign: "top" }} {...p} />,
              }}
            >
              {prdMarkdown}
            </ReactMarkdown>
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

        {tab === "구현 현황" && (
          <div style={{ flexGrow: 1, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                  프론트(LinkU_Android)·백엔드(LinkU_backend) 레포 기준 실제 구현 현황
                </div>
                {implStatus?.updatedAt && (
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                    최종 갱신 {implStatus.updatedAt.toDate().toLocaleString("ko-KR")} · {implStatus.updatedBy}
                  </div>
                )}
              </div>
              {isMember && !implEditing && (
                <button
                  onClick={startImplEdit}
                  style={{ all: "unset", cursor: "pointer", fontSize: 12, fontWeight: 700, border: "1px solid var(--border)", borderRadius: 8, padding: "7px 14px", color: "var(--text-secondary)" }}
                >
                  {implStatus ? "붙여넣기로 갱신" : "구현 현황 문서 붙여넣기"}
                </button>
              )}
            </div>

            {implEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label htmlFor="impl-md" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                  구현 현황 마크다운
                </label>
                <textarea
                  id="impl-md"
                  rows={22}
                  value={implDraft}
                  onChange={(e) => setImplDraft(e.target.value)}
                  placeholder="Codex 등으로 생성한 구현 현황 마크다운 문서를 그대로 붙여넣으세요."
                  style={{
                    width: "100%", resize: "vertical", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px",
                    fontSize: 12, lineHeight: 1.6, color: "var(--text)", background: "var(--surface)", fontFamily: "ui-monospace, monospace",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setImplEditing(false)} style={{ all: "unset", cursor: "pointer", padding: "0 16px", height: 36, borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center" }}>
                    취소
                  </button>
                  <button
                    onClick={saveImplStatus}
                    disabled={implSaving}
                    style={{ all: "unset", cursor: implSaving ? "default" : "pointer", padding: "0 16px", height: 36, borderRadius: 8, background: "var(--gradient)", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", opacity: implSaving ? 0.6 : 1 }}
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : implStatus?.markdown ? (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, boxSizing: "border-box" }}>
                <pre style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, color: "#D7D9E4", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                  {implStatus.markdown}
                </pre>
              </div>
            ) : (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, boxSizing: "border-box" }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                  아직 구현 현황 문서가 없어요. Codex 같은 코드 에이전트로 LinkU_Android·LinkU_backend 레포를 탐색해 이 PRD 대비 실제 구현 상태를 정리한 뒤, 결과 마크다운을 여기에 붙여넣으면 팀 전체가 볼 수 있어요.
                </p>
              </div>
            )}
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
                    <Avatar src={c.authorPhoto} name={c.author} size={20} />
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
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {c.body.split(/(@[a-zA-Z0-9_-]+)/g).map((part, i) =>
                      part.startsWith("@") && TEAM_HANDLES.includes(part.slice(1)) ? (
                        <span key={i} style={{ color: "var(--accent-blue)", fontWeight: 700 }}>{part}</span>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </p>
                </div>
              ))}
            </div>
            <form onSubmit={postComment} style={{ position: "relative" }}>
              {isMember && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {TEAM_HANDLES.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setDraft((d) => `${d}${d.endsWith(" ") || d === "" ? "" : " "}@${h} `)}
                      style={{ all: "unset", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 12, border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                    >
                      @{h}
                    </button>
                  ))}
                </div>
              )}
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
