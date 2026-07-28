import { create } from "zustand";
import type { User, Quota, ActiveTrip } from "@/types/auth";
import { getMe, logout as apiLogout } from "@/services/api";

export type AuthStatus = "unknown" | "authenticated" | "anonymous";

interface AuthStore {
  status: AuthStatus;
  user: User | null;
  quota: Quota | null;
  activeTrip: ActiveTrip | null;
  bootstrapped: boolean;

  bootstrap: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setAuth: (user: User, quota: Quota, activeTrip: ActiveTrip | null) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
}

// 广播频道名
const CHANNEL_NAME = "yuntu_auth_channel";

let bc: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    bc = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    bc = null;
  }
}

export function broadcastAuthEvent(type: "LOGIN" | "LOGOUT" | "EXPIRED" | "ME_UPDATED") {
  if (bc) {
    try {
      bc.postMessage({ type });
    } catch {
      /* ignore */
    }
  }
}

export const useAuthStore = create<AuthStore>((set, get) => {
  // 监听多标签页同步消息
  if (bc) {
    bc.onmessage = (event) => {
      const type = event.data?.type;
      if (type === "LOGOUT" || type === "EXPIRED") {
        set({
          status: "anonymous",
          user: null,
          quota: null,
          activeTrip: null,
          bootstrapped: true,
        });
      } else if (type === "LOGIN" || type === "ME_UPDATED") {
        void get().refreshMe();
      }
    };
  }

  return {
    status: "unknown",
    user: null,
    quota: null,
    activeTrip: null,
    bootstrapped: false,

    bootstrap: async () => {
      try {
        const data = await getMe();
        if (data.ok && data.user) {
          set({
            status: "authenticated",
            user: data.user,
            quota: data.quota,
            activeTrip: data.active_trip,
            bootstrapped: true,
          });
        } else {
          set({
            status: "anonymous",
            user: null,
            quota: null,
            activeTrip: null,
            bootstrapped: true,
          });
        }
      } catch {
        set({
          status: "anonymous",
          user: null,
          quota: null,
          activeTrip: null,
          bootstrapped: true,
        });
      }
    },

    refreshMe: async () => {
      try {
        const data = await getMe();
        if (data.ok && data.user) {
          set({
            status: "authenticated",
            user: data.user,
            quota: data.quota,
            activeTrip: data.active_trip,
          });
        }
      } catch {
        /* ignore silent refresh failure */
      }
    },

    setAuth: (user, quota, activeTrip) => {
      set({
        status: "authenticated",
        user,
        quota,
        activeTrip,
        bootstrapped: true,
      });
      broadcastAuthEvent("LOGIN");
    },

    clearAuth: () => {
      set({
        status: "anonymous",
        user: null,
        quota: null,
        activeTrip: null,
        bootstrapped: true,
      });
    },

    logout: async () => {
      try {
        await apiLogout();
      } catch {
        /* ignore */
      }
      set({
        status: "anonymous",
        user: null,
        quota: null,
        activeTrip: null,
        bootstrapped: true,
      });
      broadcastAuthEvent("LOGOUT");
    },
  };
});
