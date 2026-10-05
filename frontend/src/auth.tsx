import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { api } from "./api";
import type { Child } from "./types";

const STORAGE_KEY = "starlit-session";

type Session = {
  parentToken: string | null;
  childToken: string | null;
  email: string | null;
  children: Child[];
  child: Child | null;
};

type AuthValue = Session & {
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  unlock: (childId: string, pin: string) => Promise<void>;
  lockChild: () => void;
  logout: () => void;
  setChildren: (children: Child[]) => void;
  updateChild: (child: Child) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

function emptySession(): Session {
  return { parentToken: null, childToken: null, email: null, children: [], child: null };
}

function loadSession(): Session {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySession();
    return { ...emptySession(), ...(JSON.parse(raw) as Session) };
  } catch {
    return emptySession();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const saved = loadSession();
  const [ready, setReady] = useState(false);
  const [parentToken, setParentToken] = useState<string | null>(saved.parentToken);
  const [childToken, setChildToken] = useState<string | null>(saved.childToken);
  const [email, setEmail] = useState<string | null>(saved.email);
  const [kids, setKids] = useState<Child[]>(saved.children);
  const [child, setChild] = useState<Child | null>(saved.child);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const stored = loadSession();
      if (stored.parentToken) {
        try {
          const me = await api<{ role: string; user: { email: string }; children: Child[] }>("/api/auth/me", {
            token: stored.parentToken,
          });
          if (!cancel && me.role === "parent") {
            setParentToken(stored.parentToken);
            setEmail(me.user.email);
            setKids(me.children);
          }
        } catch {
          if (!cancel) setParentToken(null);
        }
      }
      if (stored.childToken) {
        try {
          const me = await api<{ role: string; child: Child }>("/api/auth/me", { token: stored.childToken });
          if (!cancel && me.role === "child") {
            setChildToken(stored.childToken);
            setChild(me.child);
          }
        } catch {
          if (!cancel) {
            setChildToken(null);
            setChild(null);
          }
        }
      }
      if (!cancel) setReady(true);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload: Session = { parentToken, childToken, email, children: kids, child };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ready, parentToken, childToken, email, kids, child]);

  const login = useCallback(async (nextEmail: string, password: string) => {
    const result = await api<{ token: string; user: { email: string }; children: Child[] }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: nextEmail, password }),
    });
    setParentToken(result.token);
    setEmail(result.user.email);
    setKids(result.children);
    setChildToken(null);
    setChild(null);
  }, []);

  const register = useCallback(async (nextEmail: string, password: string) => {
    const result = await api<{ token: string; user: { email: string } }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: nextEmail, password }),
    });
    setParentToken(result.token);
    setEmail(result.user.email);
    setKids([]);
    setChildToken(null);
    setChild(null);
  }, []);

  const unlock = useCallback(
    async (childId: string, pin: string) => {
      const result = await api<{ token: string; child: Child }>("/api/auth/pin", {
        method: "POST",
        token: parentToken,
        body: JSON.stringify({ child_id: childId, pin }),
      });
      setChildToken(result.token);
      setChild(result.child);
    },
    [parentToken],
  );

  const lockChild = useCallback(() => {
    setChildToken(null);
    setChild(null);
  }, []);

  const logout = useCallback(() => {
    setParentToken(null);
    setChildToken(null);
    setEmail(null);
    setKids([]);
    setChild(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateChild = useCallback((next: Child) => {
    setChild(next);
    setKids((current) => current.map((item) => (item.id === next.id ? next : item)));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      parentToken,
      childToken,
      email,
      children: kids,
      child,
      login,
      register,
      unlock,
      lockChild,
      logout,
      setChildren: setKids,
      updateChild,
    }),
    [ready, parentToken, childToken, email, kids, child, login, register, unlock, lockChild, logout, updateChild],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}

export function RequireChild({ children }: { children: ReactNode }) {
  const { ready, childToken } = useAuth();
  if (!ready) return <Splash />;
  if (!childToken) return <Navigate to="/" replace />;
  return children;
}

export function RequireParent({ children }: { children: ReactNode }) {
  const { ready, parentToken } = useAuth();
  if (!ready) return <Splash />;
  if (!parentToken) return <Navigate to="/" replace />;
  return children;
}

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-night text-paper">
      <div className="text-center">
        <p className="font-display text-5xl">星光书架</p>
        <p className="mt-3 text-lg text-marigold">正在把故事铺开…</p>
      </div>
    </div>
  );
}
