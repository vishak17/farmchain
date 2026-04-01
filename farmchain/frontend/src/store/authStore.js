import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('farmchain_token', token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('farmchain_token');
        set({ user: null, token: null });
      },
      isAuthenticated: () => !!get().token,
      hasRole: (...roles) => roles.includes(get().user?.role)
    }),
    { name: 'farmchain-auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);
