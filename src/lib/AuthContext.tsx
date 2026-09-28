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
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, githubProvider } from "./firebase";

const TOKEN_STORAGE_KEY = "linku-github-token";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  githubToken: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [githubToken, setGithubToken] = useState<string | null>(null);

  useEffect(() => {
    setGithubToken(sessionStorage.getItem(TOKEN_STORAGE_KEY));
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
  };

  const signOut = async () => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setGithubToken(null);
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, githubToken, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
