"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

export type Role = "기획자" | "프론트" | "백엔드";

export function useMembership() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(doc(db, "members", user.uid), (snap) => {
      setRole(snap.exists() ? ((snap.data().role as Role) ?? null) : null);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return { role, isMember: role !== null, loading };
}
