import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchApps, launchApp as launchAppApi } from '../services/mockApi';

const useAppStore = create(
  persist(
    (set, get) => ({
      apps: [],
      categories: ['All'],
      searchQuery: '',
      activeCategory: 'All',
      launchingApp: null,
      favorites: [], // persisted list of app IDs
      isLoading: false,

      fetchApps: async () => {
        set({ isLoading: true });
        try {
          const data = await fetchApps();
          // Merge persisted favorites into fetched app data
          const { favorites } = get();
          const apps = data.apps.map((app) => ({
            ...app,
            isFavorite: favorites.includes(app.id),
          }));
          set({ apps, categories: data.categories, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveCategory: (category) => set({ activeCategory: category }),

      toggleFavorite: (appId) => {
        set((state) => {
          const isFav = state.favorites.includes(appId);
          const newFavorites = isFav
            ? state.favorites.filter((id) => id !== appId)
            : [...state.favorites, appId];
          const apps = state.apps.map((app) =>
            app.id === appId ? { ...app, isFavorite: !isFav } : app
          );
          return { favorites: newFavorites, apps };
        });
      },

      launchApp: async (appId) => {
        set({ launchingApp: appId });
        try {
          await launchAppApi(appId);
          // Clear launching state after animation time
          setTimeout(() => set({ launchingApp: null }), 600);
        } catch {
          set({ launchingApp: null });
        }
      },

      getFilteredApps: () => {
        const { apps, searchQuery, activeCategory } = get();
        let filtered = [...apps];

        if (activeCategory !== 'All') {
          filtered = filtered.filter((a) => a.category === activeCategory);
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (a) =>
              a.name.toLowerCase().includes(q) ||
              a.category.toLowerCase().includes(q)
          );
        }

        return filtered;
      },
    }),
    {
      name: 'nova-link-apps',
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
);

export default useAppStore;
