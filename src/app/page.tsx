"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

export default function Home() {
  const { user, loading, signIn, signOut } = useAuth();
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsMember(false);
      return;
    }
    getDoc(doc(db, "members", user.uid)).then((snap) => {
      setIsMember(snap.exists());
    });
  }, [user]);

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
              {isMember ? "팀원" : "구경 모드 (권한 없음)"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {user.displayName ?? user.email}
            </span>
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
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          로그인 없이도 스펙 현황을 볼 수 있습니다. LinkYou-2025 팀원으로
          등록되면 스펙 업로드·승인 등 쓰기 권한이 열립니다.
        </p>
      </main>
    </div>
  );
}
