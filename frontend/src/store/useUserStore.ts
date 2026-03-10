import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';
import { useTrackingStore } from './useTrackingStore';
import { useProductCache } from './useProductCache';
import { useCartStore } from './useCartStore';
import { clearImageCache } from '@/api/mappers';

interface UserState {
  user: User | null;
  isLoggedIn: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      setUser: (user) => set({ user, isLoggedIn: true }),
      logout: () => {
        // Flush all pending tracking events before logging out
        useTrackingStore.getState().flush();
        // Clear all caches
        useProductCache.getState().reset();
        useCartStore.getState().clearCart();
        clearImageCache();
        set({ user: null, isLoggedIn: false });
      },
    }),
    {
      name: 'nexpick-user',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
