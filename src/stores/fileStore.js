import { create } from 'zustand';
import { fetchFiles, fetchTransfers, uploadFile, deleteFile, downloadFile } from '../services/api';

const useFileStore = create((set, get) => ({
  currentPath: '/',
  breadcrumbs: [{ name: 'This PC', path: '/' }],
  items: [],
  transfers: [],
  searchQuery: '',
  sortBy: 'name', // 'name' | 'size' | 'modified'
  sortOrder: 'asc',
  selectedFiles: [],
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,

  navigate: async (path) => {
    set({ isLoading: true });
    try {
      const items = await fetchFiles(path);
      // Build breadcrumbs from path
      const parts = path.split('/').filter(Boolean);
      const breadcrumbs = [{ name: 'This PC', path: '/' }];
      let accumulated = '';
      for (const part of parts) {
        accumulated += '/' + part;
        breadcrumbs.push({ name: part, path: accumulated });
      }
      set({ currentPath: path, items, breadcrumbs, isLoading: false, searchQuery: '' });
    } catch {
      set({ isLoading: false, items: [] });
    }
  },

  refreshCurrent: async () => {
    const path = get().currentPath;
    await get().navigate(path);
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSortBy: (field) => {
    const { sortBy, sortOrder } = get();
    if (sortBy === field) {
      set({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      set({ sortBy: field, sortOrder: 'asc' });
    }
  },

  getFilteredItems: () => {
    const { items, searchQuery, sortBy, sortOrder } = get();
    let filtered = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((f) => f.name.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => {
      // Folders before files
      if (a.type !== b.type) {
        if (a.type === 'folder' || a.type === 'drive') return -1;
        if (b.type === 'folder' || b.type === 'drive') return 1;
      }
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'modified') cmp = (a.modified || '').localeCompare(b.modified || '');
      else if (sortBy === 'size') cmp = (a.sizeBytes || 0) - (b.sizeBytes || 0);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  },

  selectFile: (id) => {
    set((state) => {
      const isSelected = state.selectedFiles.includes(id);
      return {
        selectedFiles: isSelected
          ? state.selectedFiles.filter((f) => f !== id)
          : [...state.selectedFiles, id],
      };
    });
  },

  clearSelection: () => set({ selectedFiles: [] }),

  uploadMockFile: async (fileName) => {
    set({ isUploading: true, uploadProgress: 0 });
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      set((s) => {
        const next = Math.min(s.uploadProgress + 15, 90);
        return { uploadProgress: next };
      });
    }, 200);

    try {
      const result = await uploadFile(fileName);
      clearInterval(progressInterval);
      set({ isUploading: false, uploadProgress: 100 });
      // Reset progress after a beat
      setTimeout(() => set({ uploadProgress: 0 }), 500);
      return result;
    } catch {
      clearInterval(progressInterval);
      set({ isUploading: false, uploadProgress: 0 });
      throw new Error('Upload failed');
    }
  },

  deleteMockFile: async (fileId) => {
    try {
      await deleteFile(fileId);
      set((state) => ({
        items: state.items.filter((f) => f.id !== fileId),
        selectedFiles: state.selectedFiles.filter((id) => id !== fileId),
      }));
    } catch {
      throw new Error('Delete failed');
    }
  },

  downloadMockFile: async (fileName) => {
    return await downloadFile(fileName);
  },

  fetchTransfers: async () => {
    try {
      const data = await fetchTransfers();
      set({ transfers: data });
    } catch {
      // silent
    }
  },
}));

export default useFileStore;
