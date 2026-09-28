"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useMembership } from "@/lib/useMembership";
import { Avatar } from "@/components/Avatar";

export default function Home() {
  const { user, loading, githubUsername, signIn, signOut } = useAuth();
  const { role, isMember } = useMembership();
  const [copied, setCopied] = useState(false);

  const name = githubUsername ?? user?.displayName ?? user?.email ?? "";

  const copyUid = async () => {
    if (!user) return;
    await navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "24px 32px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 20,
          borderBottom: "1px solid var(--border)",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--gradient)",
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 800 }}>LinkU Dashboard</span>
        </div>

        {loading ? (
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            로딩 중…
          </span>
        ) : user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 6,
                background: isMember
                  ? "rgba(53,223,121,0.14)"
                  : "rgba(255,255,255,0.06)",
                color: isMember ? "var(--positive)" : "var(--text-secondary)",
              }}
            >
              {isMember ? role : "구경 모드 (권한 없음)"}
            </span>
            <Avatar src={user.photoURL} name={name} size={26} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
            <button
              onClick={() => signOut()}
              style={{
                all: "unset",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn()}
            style={{
              all: "unset",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: 8,
              background: "var(--gradient)",
              boxSizing: "border-box",
            }}
          >
            GitHub으로 로그인
          </button>
        )}
      </header>

      <main>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          Spec Center
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          로그인 없이도 스펙 현황을 볼 수 있습니다. LinkYou-2025 팀원으로
          등록되면 스펙 업로드·승인 등 쓰기 권한이 열립니다.
        </p>

        {user && !isMember && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              marginBottom: 20,
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            아직 팀원 명단에 없어요. 이 uid를 프로젝트 소유자에게 전달하면
            Firestore <code style={{ color: "var(--text)" }}>members</code> 컬렉션에 등록해줄 수 있어요.
            <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 6, color: "var(--text)" }}>
              {user.uid}
            </code>
            <button
              onClick={copyUid}
              style={{ all: "unset", cursor: "pointer", fontWeight: 700, color: "var(--accent-blue)" }}
            >
              {copied ? "복사됨!" : "복사"}
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/prd"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: 8,
              background: "var(--gradient)",
              color: "#fff",
            }}
          >
            PRD 문서 보기 →
          </Link>
          <Link
            href="/contract"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            API 계약 요청 →
          </Link>
        </div>
      </main>
    </div>
  );
}
