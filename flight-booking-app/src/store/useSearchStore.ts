import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SearchQuery {
  origin: string
  destination: string
  departsAt: string
  passengers: number
  class: 'economy' | 'business' | 'first'
}

interface SearchState {
  searchQuery: SearchQuery | null
  selectedFlightId: string | null
  recentSearches: SearchQuery[]
  setSearchQuery: (query: SearchQuery | null) => void
  setSelectedFlightId: (id: string | null) => void
  addRecentSearch: (query: SearchQuery) => void
  reset: () => void
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      searchQuery: null,
      selectedFlightId: null,
      recentSearches: [],
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedFlightId: (selectedFlightId) => set({ selectedFlightId }),
      addRecentSearch: (query) =>
        set((state) => {
          const filtered = state.recentSearches.filter(
            (q) =>
              !(
                q.origin === query.origin &&
                q.destination === query.destination &&
                q.departsAt === query.departsAt
              )
          )
          return { recentSearches: [query, ...filtered].slice(0, 5) }
        }),
      reset: () => set({ searchQuery: null, selectedFlightId: null }),
    }),
    {
      name: 'skyglide-search-storage',
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        selectedFlightId: state.selectedFlightId,
        recentSearches: state.recentSearches,
      }),
    }
  )
)
