import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export const useFontStore = create((set, get) => ({
  fonts: [],
  query: '',
  isLoading: false,
  previewText: 'أنا أنوبيس | I am Anobis',
  previewSize: 48,
  previewRtl: false,
  tags: [],
  selectedTag: '',
  
  setQuery: (query) => {
    set({ query });
    get().fetchFonts(query);
  },
  
  setPreviewText: (previewText) => set({ previewText }),
  setPreviewSize: (previewSize) => set({ previewSize }),
  setPreviewRtl: (previewRtl) => set({ previewRtl }),
  
  fetchFonts: async (query = '') => {
    set({ isLoading: true });
    try {
      const tag = get().selectedTag;
      const result = await invoke('get_fonts', { query, tag, offset: 0, limit: 1000 });
      set({ fonts: result, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },
  
  importFolder: async (dir) => {
    set({ isLoading: true });
    try {
      await invoke('scan_directory', { dir });
      await get().fetchFonts(get().query);
      await get().fetchTags();
    } catch (e) {
      console.error(e);
    }
    set({ isLoading: false });
  },
  
  scanSystemFonts: async () => {
    set({ isLoading: true });
    try {
      await invoke('scan_system_fonts');
      await get().fetchFonts(get().query);
      await get().fetchTags();
    } catch (e) {
      console.error(e);
    }
    set({ isLoading: false });
  },

  fetchTags: async () => {
    try {
      const result = await invoke('get_all_tags');
      set({ tags: result });
    } catch (e) {
      console.error(e);
    }
  },

  setSelectedTag: (selectedTag) => {
    set({ selectedTag });
    get().fetchFonts(get().query);
  },

  addFontTag: async (fontId, tag) => {
    try {
      await invoke('add_font_tag', { fontId, tag });
      await get().fetchTags();
      await get().fetchFonts(get().query);
    } catch (e) {
      console.error(e);
    }
  },

  removeFontTag: async (fontId, tag) => {
    try {
      await invoke('remove_font_tag', { fontId, tag });
      await get().fetchTags();
      await get().fetchFonts(get().query);
    } catch (e) {
      console.error(e);
    }
  }
}));
