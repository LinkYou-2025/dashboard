"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useMembership } from "@/lib/useMembership";
import { createBackendIssue } from "@/lib/github";

type Status = "pending" | "approved" | "rejected";

type HistoryEntry = {
  status: Status;
  note: string;
  by: string;
  at: Timestamp;
};

type ContractRequest = {
  id: string;
  title: string;
  method: string;
  endpoint: string;
  description: string;
  affectedScreens: string[];
  status: Status;
  authorUid: string;
  authorName: string;
  authorRole: string;
  reviewerName?: string;
  reviewNote?: string;
  backendIssueUrl?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  history?: HistoryEntry[];
};

const statusMeta: Record<Status, { label: string; bg: string; text: string }> = {
  pending: { label: "검토중", bg: "rgba(245,166,35,0.16)", text: "var(--amber)" },
  approved: { label: "승인됨", bg: "rgba(53,223,121,0.14)", text: "var(--positive)" },
  rejected: { label: "반려됨", bg: "rgba(255,94,94,0.16)", text: "var(--negative)" },
};

function fmt(ts: Timestamp | null | undefined) {
  return ts ? ts.toDate().toLocaleDateString("ko-KR") : "-";
}

export default function ContractPage() {
  const { user } = useAuth();
  const { role, isMember } = useMembership();
  const [contracts, setContracts] = useState<ContractRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [issueNotice, setIssueNotice] = useState<string | null>(null);

  const [form, setForm] = useState({ title: "", method: "GET", endpoint: "", description: "", affectedScreens: "" });

  useEffect(() => {
    const q = query(collection(db, "contracts"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContractRequest);
      setContracts(rows);
      setSelectedId((cur) => cur ?? rows[0]?.id ?? null);
    });
  }, []);

  const selected = useMemo(() => contracts.find((c) => c.id === selectedId) ?? null, [contracts, selectedId]);

  const canCreate = role === "프론트" || role === "백엔드";
  const canReview = role === "백엔드";
  const isAuthor = !!selected && !!user && selected.authorUid === user.uid;

  const resetForm = () => setForm({ title: "", method: "GET", endpoint: "", description: "", affectedScreens: "" });

  const openNewForm = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (c: ContractRequest) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      method: c.method,
      endpoint: c.endpoint,
      description: c.description,
      affectedScreens: c.affectedScreens.join(", "),
    });
    setShowForm(true);
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !role || !form.title.trim() || !form.endpoint.trim()) return;
    setBusy(true);
    const affectedScreens = form.affectedScreens
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingId) {
      // 반려된 요청을 수정해 재제출 (작성자 본인만)
      await updateDoc(doc(db, "contracts", editingId), {
        title: form.title.trim(),
        method: form.method,
        endpoint: form.endpoint.trim(),
        description: form.description.trim(),
        affectedScreens,
        status: "pending",
        updatedAt: serverTimestamp(),
        history: arrayUnion({
          status: "pending",
          note: "반려 사유 반영 후 재제출",
          by: user.displayName ?? user.email ?? "unknown",
          at: Timestamp.now(),
        }),
      });
    } else {
      await addDoc(collection(db, "contracts"), {
        title: form.title.trim(),
        method: form.method,
        endpoint: form.endpoint.trim(),
        description: form.description.trim(),
        affectedScreens,
        status: "pending",
        authorUid: user.uid,
        authorName: user.displayName ?? user.email ?? "unknown",
        authorRole: role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        history: [{ status: "pending", note: "요청 작성", by: user.displayName ?? user.email ?? "unknown", at: Timestamp.now() }],
      });
    }

    setBusy(false);
    setShowForm(false);
    resetForm();
  };

  const decide = async (next: "approved" | "rejected") => {
    if (!selected || !user) return;
    if (next === "rejected" && !reviewNote.trim()) {
      alert("반려 시 상세 사유를 입력해주세요.");
      return;
    }
    setBusy(true);
    setIssueNotice(null);

    let backendIssueUrl: string | undefined;
    if (next === "approved") {
      const token =
        typeof window !== "undefined" ? sessionStorage.getItem("linku-github-token") : null;
      if (token) {
        try {
          const issue = await createBackendIssue(
            token,
            `[API 계약] ${selected.title}`,
            `**요청 엔드포인트**: \`${selected.method} ${selected.endpoint}\`\n\n**내용**\n${selected.description}\n\n**영향받는 화면**: ${selected.affectedScreens.join(", ") || "-"}\n\n**요청자**: ${selected.authorName} (${selected.authorRole})\n**승인자**: ${user.displayName ?? user.email}\n\n---\nLinkU 대시보드 \`/contract\`에서 자동 생성됨.`
          );
          backendIssueUrl = issue.html_url;
        } catch (err) {
          setIssueNotice(
            `승인은 반영됐지만 GitHub 이슈 자동 생성에 실패했어요: ${(err as Error).message}. 백엔드 레포에 직접 이슈를 만들어주세요.`
          );
        }
      } else {
        setIssueNotice("GitHub 토큰이 없어 이슈가 자동 생성되지 못했어요. 다시 로그인한 뒤 승인해주세요.");
      }
    }

    await updateDoc(doc(db, "contracts", selected.id), {
      status: next,
      reviewerName: user.displayName ?? user.email,
      reviewNote: reviewNote.trim(),
      updatedAt: serverTimestamp(),
      ...(backendIssueUrl ? { backendIssueUrl } : {}),
      history: arrayUnion({
        status: next,
        note: reviewNote.trim(),
        by: user.displayName ?? user.email ?? "unknown",
        at: Timestamp.now(),
      }),
    });

    setReviewNote("");
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "20px 32px 28px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--gradient)" }} />
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>API 계약 요청</h1>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>/contract · 프론트 → 백엔드 Fast-Track</span>
          <Link href="/" style={{ fontSize: 12, fontWeight: 700, marginLeft: 8, border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", color: "var(--text-secondary)" }}>
            ← 대시보드로
          </Link>
        </div>
        {canCreate && (
          <button
            onClick={openNewForm}
            style={{ all: "unset", cursor: "pointer", height: 36, padding: "0 16px", borderRadius: 8, background: "var(--gradient)", color: "#fff", fontSize: 13, fontWeight: 700, boxSizing: "border-box", display: "flex", alignItems: "center" }}
          >
            + 새 계약 요청
          </button>
        )}
      </div>

      <div style={{ flexGrow: 1, display: "flex", gap: 20, minHeight: 0 }}>
        {/* List */}
        <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {contracts.length === 0 && <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>등록된 계약 요청이 없어요.</p>}
          {contracts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              style={{
                all: "unset", cursor: "pointer", padding: 14, borderRadius: 12, boxSizing: "border-box",
                border: c.id === selectedId ? "1.5px solid var(--accent-blue)" : "1px solid var(--border)",
                background: c.id === selectedId ? "var(--selected-bg, rgba(44,111,255,0.12))" : "var(--surface)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8 }}>
                {c.authorName}({c.authorRole}) · {fmt(c.createdAt)}
              </div>
              <span style={{ display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: statusMeta[c.status].bg, color: statusMeta[c.status].text }}>
                {statusMeta[c.status].label}
              </span>
            </button>
          ))}
        </div>

        {/* Detail / Form */}
        <div style={{ flexGrow: 1, overflowY: "auto" }}>
          {showForm ? (
            <form onSubmit={submitForm} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, boxSizing: "border-box", maxWidth: 640, display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{editingId ? "요청 수정 후 재제출" : "새 API 계약 요청"}</h2>

              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                제목
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{ height: 38, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", padding: "0 12px", fontSize: 13, boxSizing: "border-box" }} />
              </label>

              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-secondary)", width: 110 }}>
                  Method
                  <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}
                    style={{ height: 38, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", padding: "0 8px", fontSize: 13 }}>
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-secondary)", flexGrow: 1 }}>
                  엔드포인트
                  <input required placeholder="/api/v2/..." value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                    style={{ height: 38, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", padding: "0 12px", fontSize: 13, fontFamily: "ui-monospace, monospace", boxSizing: "border-box" }} />
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                요청 내용
                <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", padding: "10px 12px", fontSize: 13, resize: "none", boxSizing: "border-box" }} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                영향받는 화면 (쉼표로 구분)
                <input value={form.affectedScreens} onChange={(e) => setForm({ ...form, affectedScreens: e.target.value })} placeholder="방 상세, 마이페이지"
                  style={{ height: 38, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", padding: "0 12px", fontSize: 13, boxSizing: "border-box" }} />
              </label>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ all: "unset", cursor: "pointer", padding: "0 16px", height: 38, borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center" }}>취소</button>
                <button type="submit" disabled={busy} style={{ all: "unset", cursor: busy ? "default" : "pointer", flexGrow: 1, textAlign: "center", borderRadius: 8, height: 38, background: "var(--gradient)", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", opacity: busy ? 0.6 : 1 }}>
                  {editingId ? "재제출" : "요청 등록"}
                </button>
              </div>
            </form>
          ) : selected ? (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, boxSizing: "border-box", maxWidth: 760, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 8, background: statusMeta[selected.status].bg, color: statusMeta[selected.status].text }}>
                  {statusMeta[selected.status].label}
                </span>
                {selected.backendIssueUrl && (
                  <a href={selected.backendIssueUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700 }}>
                    백엔드 이슈 열기 →
                  </a>
                )}
              </div>

              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.4 }}>{selected.title}</h2>

              <div style={{ display: "flex", gap: 28, padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700 }}>작성자</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{selected.authorName} ({selected.authorRole})</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700 }}>작성일</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(selected.createdAt)}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>대상 엔드포인트</div>
                <div style={{ fontSize: 13, fontFamily: "ui-monospace, monospace", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px" }}>
                  <span style={{ color: "var(--positive)", fontWeight: 700 }}>{selected.method}</span> {selected.endpoint}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>요청 내용</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>{selected.description}</p>
              </div>

              {selected.affectedScreens.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selected.affectedScreens.map((s) => (
                    <span key={s} style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: "rgba(200,0,255,0.16)", color: "#D28CFF" }}>영향: {s}</span>
                  ))}
                </div>
              )}

              {(selected.history ?? []).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>처리 이력</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(selected.history ?? []).map((h, i) => (
                      <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        <span style={{ fontWeight: 700, color: statusMeta[h.status].text }}>{statusMeta[h.status].label}</span>
                        {" · "}{h.by} · {fmt(h.at)}{h.note ? ` — ${h.note}` : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ height: 1, background: "var(--border)" }} />

              {canReview && selected.status === "pending" && (
                <>
                  <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>검토 의견 · 반려 시 사유 필수</span>
                    <textarea rows={3} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="반려 시 상세 사유를 입력하세요."
                      style={{ resize: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)", background: "rgba(255,255,255,0.03)", boxSizing: "border-box" }} />
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button disabled={busy} onClick={() => decide("rejected")} style={{ all: "unset", cursor: busy ? "default" : "pointer", padding: "0 18px", height: 44, borderRadius: 10, border: "1px solid var(--negative)", color: "var(--negative)", fontSize: 13, fontWeight: 700, boxSizing: "border-box", display: "flex", alignItems: "center", opacity: busy ? 0.6 : 1 }}>반려</button>
                    <button disabled={busy} onClick={() => decide("approved")} style={{ all: "unset", cursor: busy ? "default" : "pointer", flexGrow: 1, textAlign: "center", borderRadius: 10, height: 44, background: "var(--gradient)", color: "#fff", fontSize: 13, fontWeight: 700, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", opacity: busy ? 0.6 : 1 }}>
                      승인 → 백엔드 이슈 자동 생성
                    </button>
                  </div>
                  {issueNotice && <p style={{ fontSize: 12, color: "var(--amber)" }}>{issueNotice}</p>}
                </>
              )}

              {isAuthor && selected.status === "rejected" && (
                <button onClick={() => openEditForm(selected)} style={{ all: "unset", cursor: "pointer", alignSelf: "flex-start", fontSize: 12, fontWeight: 700, color: "var(--accent-blue)", textDecoration: "underline" }}>
                  사유 반영해서 재제출하기
                </button>
              )}

              {!isMember && (
                <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>팀원으로 로그인하면 요청 작성·승인·반려를 할 수 있어요.</p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>왼쪽에서 계약 요청을 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
