import { create } from 'zustand';
import type { Member, Role } from '../types';
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  getStoredSession,
  storeSession,
  clearSession,
  getRedirectUri,
  type StoredSession,
} from '../services/oauth.service';
import { getCredentials } from '../services/credential-store';
import { resolveIdentity, createMemberRecord } from '../services/identity.service';

// ─── State Interface ────────────────────────────────────────────────────────

export interface AuthState {
  // State
  isAuthenticated: boolean;
  currentMember: Member | null;
  openId: string | null;
  isLoading: boolean;
  error: string | null;
  isOnboarding: boolean;

  // Actions
  login: () => void;
  handleCallback: (code: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => void;
  completeOnboarding: (role: Role) => Promise<void>;
  clearError: () => void;
}

// ─── Store Implementation ───────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  currentMember: null,
  openId: null,
  isLoading: false,
  error: null,
  isOnboarding: false,

  // ─── Actions ────────────────────────────────────────────────────────────

  login: () => {
    const { appId } = getCredentials();
    const redirectUri = getRedirectUri();
    const url = buildAuthorizationUrl({
      appId,
      redirectUri,
    });
    window.location.href = url;
  },

  handleCallback: async (code: string) => {
    set({ isLoading: true, error: null });

    try {
      const { accessToken, openId, expiresIn, displayName } = await exchangeCodeForToken(code);

      storeSession({
        userAccessToken: accessToken,
        openId,
        expiresAt: Date.now() + expiresIn * 1000,
        displayName,
      });

      const result = await resolveIdentity(openId);

      if (result.status === 'resolved') {
        set({
          isAuthenticated: true,
          currentMember: result.member!,
          openId,
          isOnboarding: false,
        });
      } else if (result.status === 'new_user') {
        set({
          isOnboarding: true,
          openId,
        });
      } else {
        set({
          error: result.error ?? 'Identity resolution failed',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true, error: null });

    try {
      const session = getStoredSession();

      if (!session) {
        set({ isLoading: false });
        return;
      }

      const result = await resolveIdentity(session.openId);

      if (result.status === 'resolved') {
        set({
          isAuthenticated: true,
          currentMember: result.member!,
          openId: session.openId,
          isOnboarding: false,
        });
      } else if (result.status === 'new_user') {
        set({
          isOnboarding: true,
          openId: session.openId,
        });
      } else {
        set({
          error: result.error ?? 'Identity resolution failed',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    clearSession();
    set({
      isAuthenticated: false,
      currentMember: null,
      openId: null,
      isLoading: false,
      error: null,
      isOnboarding: false,
    });
    window.location.href = '/login';
  },

  completeOnboarding: async (role: Role) => {
    const { openId } = get();
    set({ isLoading: true, error: null });

    try {
      // Get display name from stored session (populated during OAuth)
      const session = getStoredSession();
      const displayName = session?.displayName || openId || 'New User';
      const member = await createMemberRecord(openId!, displayName, role);

      set({
        isAuthenticated: true,
        currentMember: member,
        isOnboarding: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
