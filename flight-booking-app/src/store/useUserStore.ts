import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  user: { id: string; email: string; name?: string } | null
  setUser: (user: { id: string; email: string; name?: string } | null) => void
  reset: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      reset: () => set({ user: null }),
    }),
    {
      name: 'skyglide-user-storage',
    }
  )
)
