"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GithubAuthProvider,
  getAdditionalUserInfo,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, githubProvider } from "./firebase";

const TOKEN_STORAGE_KEY = "linku-github-token";
const USERNAME_STORAGE_KEY = "linku-github-username";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  githubToken: string | null;
  githubUsername: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);

  useEffect(() => {
    setGithubToken(sessionStorage.getItem(TOKEN_STORAGE_KEY));
    setGithubUsername(sessionStorage.getItem(USERNAME_STORAGE_KEY));
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    const result = await signInWithPopup(auth, githubProvider);

    const credential = GithubAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
      setGithubToken(credential.accessToken);
    }

    // GitHub 로그인 아이디(handle)는 Firebase User.displayName(실명)과 달라서
    // signIn 직후 additionalUserInfo에서만 얻을 수 있다 — 세션에 캐싱해둔다.
    const info = getAdditionalUserInfo(result);
    const username = (info?.username as string | undefined) ?? null;
    if (username) {
      sessionStorage.setItem(USERNAME_STORAGE_KEY, username);
      setGithubUsername(username);
    }
  };

  const signOut = async () => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USERNAME_STORAGE_KEY);
    setGithubToken(null);
    setGithubUsername(null);
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, githubToken, githubUsername, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
