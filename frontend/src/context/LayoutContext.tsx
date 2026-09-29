import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const COLLAPSED_KEY = "smartloan.sidebar.collapsed";
const MOBILE_BREAKPOINT = 768;

interface LayoutContextValue {
  isMobile: boolean;
  collapsed: boolean;       // desktop: icon-only vs icon+label
  toggleCollapsed: () => void;
  mobileOpen: boolean;      // mobile: off-canvas drawer open/closed
  setMobileOpen: (open: boolean) => void;
  toggleSidebar: () => void; // the one hamburger action, context-aware
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem(COLLAPSED_KEY) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Closing the drawer whenever the viewport crosses into desktop keeps the
  // two modes from getting stuck in an inconsistent combination.
  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  function toggleSidebar() {
    if (isMobile) {
      setMobileOpen((o) => !o);
    } else {
      setCollapsed((c) => !c);
    }
  }

  return (
    <LayoutContext.Provider
      value={{ isMobile, collapsed, toggleCollapsed: () => setCollapsed((c) => !c), mobileOpen, setMobileOpen, toggleSidebar }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}
