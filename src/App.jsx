import React, { useEffect, useState } from "react";
import { open } from '@tauri-apps/plugin-dialog';
import { useFontStore } from "./store";
import { FontList } from "./components/FontList";

function App() {
  const { 
    query, setQuery, fetchFonts, isLoading, importFolder, scanSystemFonts, 
    previewSize, setPreviewSize, previewRtl, setPreviewRtl, 
    previewText, setPreviewText, tags, selectedTag, setSelectedTag, fetchTags, fonts
  } = useFontStore();

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const init = async () => {
      await fetchFonts();
      await fetchTags();
      const currentFonts = useFontStore.getState().fonts;
      if (currentFonts.length === 0) {
        await scanSystemFonts();
      }
    };
    init();
  }, []);

  const handleImport = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected) {
        await importFolder(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    const htmlEl = document.documentElement;
    if (nextDark) {
      htmlEl.classList.add('dark');
      htmlEl.classList.remove('light');
    } else {
      htmlEl.classList.add('light');
      htmlEl.classList.remove('dark');
    }
  };

  return (
    <div className={`h-screen overflow-hidden flex select-none ${darkMode ? 'bg-[#121214] text-white dark' : 'bg-[#f5f5f7] text-[#1a1b1f]'}`}>
      
      {/* SideNavBar Component */}
      <aside className={`fixed left-0 top-0 h-full w-[250px] border-r border-black/5 flex flex-col py-8 px-4 z-50 transition-colors duration-300 ${darkMode ? 'bg-[#1c1c1e]/60 text-white/90 border-white/5' : 'glass-sidebar'}`}>
        
        {/* macOS Style Window Controls */}
        <div className="flex gap-2 mb-10 px-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
          <div className="w-3 h-3 rounded-full bg-[#FEB12E]"></div>
          <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
        </div>

        {/* Branding */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 bg-[#0058bc] rounded-lg flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>text_fields</span>
          </div>
          <h1 className="text-[18px] font-bold tracking-tight">FontVault</h1>
        </div>

        {/* Import Button */}
        <div className="px-2 mb-6">
          <button 
            onClick={handleImport}
            disabled={isLoading}
            className={`w-full py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all shadow-sm border ${
              darkMode 
                ? 'bg-white/10 hover:bg-white/20 border-white/5 text-white' 
                : 'bg-white/60 hover:bg-white border-black/5 text-[#0058bc]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {isLoading ? 'Indexing...' : 'Import Fonts'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto custom-scrollbar pr-1">
          <p className="text-[10px] text-on-surface-variant/40 uppercase font-bold tracking-widest px-3 mb-2">Main</p>
          
          <button 
            className={`flex items-center gap-2.5 px-3 py-1.5 w-full rounded-lg text-left transition-colors ${
              !selectedTag 
                ? 'bg-[#0058bc]/10 text-[#0058bc] font-semibold' 
                : darkMode ? 'text-white/60 hover:bg-white/5' : 'text-on-surface-variant hover:bg-black/5'
            }`}
            onClick={() => setSelectedTag('')}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: !selectedTag ? '"FILL" 1' : '"FILL" 0' }}>dashboard</span>
            <span className="text-[13px] font-medium">All Fonts</span>
          </button>

          <button 
            className={`flex items-center gap-2.5 px-3 py-1.5 w-full rounded-lg text-left transition-colors ${
              selectedTag === 'Favorites' 
                ? 'bg-[#0058bc]/10 text-[#0058bc] font-semibold' 
                : darkMode ? 'text-white/60 hover:bg-white/5' : 'text-on-surface-variant hover:bg-black/5'
            }`}
            onClick={() => setSelectedTag('Favorites')}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: selectedTag === 'Favorites' ? '"FILL" 1' : '"FILL" 0' }}>star</span>
            <span className="text-[13px] font-medium">Favorites</span>
          </button>

          {/* Dynamic Collections List */}
          <div className="h-px bg-black/5 dark:bg-white/5 my-4 mx-2"></div>
          <p className="text-[10px] text-on-surface-variant/40 uppercase font-bold tracking-widest px-3 mb-2">Collections</p>
          
          {tags.filter(t => t !== 'Favorites').length === 0 ? (
            <p className="text-[11px] text-on-surface-variant/30 italic px-3 py-1">No collections created</p>
          ) : (
            tags.filter(t => t !== 'Favorites').map(t => (
              <button 
                key={t}
                className={`flex items-center gap-2.5 px-3 py-1.5 w-full rounded-lg text-left transition-colors ${
                  selectedTag === t 
                    ? 'bg-[#0058bc]/10 text-[#0058bc] font-semibold' 
                    : darkMode ? 'text-white/60 hover:bg-white/5' : 'text-on-surface-variant hover:bg-black/5'
                }`}
                onClick={() => setSelectedTag(t)}
              >
                <span className="material-symbols-outlined text-[20px]">folder</span>
                <span className="text-[13px] font-medium truncate">{t}</span>
              </button>
            ))
          )}

          <div className="h-px bg-black/5 dark:bg-white/5 my-4 mx-2"></div>
          <p className="text-[10px] text-on-surface-variant/40 uppercase font-bold tracking-widest px-3 mb-2">System</p>

          <button 
            onClick={scanSystemFonts}
            disabled={isLoading}
            className={`flex items-center gap-2.5 px-3 py-1.5 w-full rounded-lg text-left transition-colors ${
              isLoading ? 'opacity-50' : ''
            } ${darkMode ? 'text-white/60 hover:bg-white/5' : 'text-on-surface-variant hover:bg-black/5'}`}
          >
            <span className={`material-symbols-outlined text-[20px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
            <span className="text-[13px] font-medium">{isLoading ? 'Scanning...' : 'Rescan System Fonts'}</span>
          </button>
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto pt-6 border-t border-black/5 dark:border-white/5 space-y-1">
          <a className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${darkMode ? 'text-white/50 hover:bg-white/5' : 'text-on-surface-variant/70 hover:bg-black/5'}`} href="#">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-[13px] font-medium">Settings</span>
          </a>
          
          {/* User Profile */}
          <div className={`flex items-center gap-3 p-2 mt-4 rounded-xl cursor-pointer transition-all border ${
            darkMode 
              ? 'bg-white/5 hover:bg-white/10 border-white/5' 
              : 'bg-white/30 hover:bg-white/50 border-black/[0.03]'
          }`}>
            <img 
              alt="Alexander Vance" 
              className="w-8 h-8 rounded-full object-cover border border-white" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkNJ13RqjsDLnGrbaE56BhFnAaAPNvehaUR_a6q_IxqXBP3jaYH-GGvlR6eMORkzSOnHBoCPN1h8WG_2NpNesHT2GV_NG1lNjMq3jRDB8DDGIgocqS98ZeXy8O8GNmz3zsg75nEKKJNY-kS5jwt_LBsMooycbB8WUldNUKD_C7mY03WB8o-JrdsAshZRXISHfOc8b3SHv4g1YxrJQOBQpd2bxA8fGudXJR0Yn0fFJj7jxHMKOqQwEgJmZBtHtJPy65MC1xK49-oOa3"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate">Alexander Vance</p>
              <p className="text-[10px] text-[#0058bc] font-semibold">Premium</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant/40 text-[18px]">unfold_more</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[250px] flex flex-col h-full bg-white dark:bg-[#121214] relative transition-colors duration-300">
        
        {/* TopNavBar Component */}
        <header className={`h-14 flex items-center justify-between px-6 border-b border-black/5 dark:border-white/5 sticky top-0 z-40 transition-colors duration-300 ${
          darkMode ? 'bg-[#121214]/80' : 'glass-toolbar'
        }`}>
          <div className="flex items-center gap-4 flex-1">
            {/* Search */}
            <div className="relative w-full max-w-[240px] group">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[18px]">search</span>
              <input 
                className={`w-full border-none rounded-lg py-1.5 pl-9 pr-4 text-[13px] outline-none focus:ring-2 focus:ring-[#0058bc]/20 transition-all ${
                  darkMode ? 'bg-white/5 text-white placeholder-white/30' : 'bg-black/5 text-[#1a1b1f] placeholder-black/30'
                }`}
                placeholder="Search font family..." 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Moved Size Slider */}
            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border ${
              darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'
            } ml-2`}>
              <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase">Size</span>
              <input 
                className="w-24 h-1 bg-black/10 dark:bg-white/10 rounded-full appearance-none slider-thumb cursor-pointer" 
                id="size-slider-top" 
                max="120" 
                min="12" 
                type="range"
                value={previewSize}
                onChange={(e) => setPreviewSize(Number(e.target.value))}
              />
              <span className="text-[11px] font-medium w-8 text-right">{previewSize}px</span>
            </div>

            {/* Text Alignment RTL/LTR selector */}
            <div className={`flex gap-0.5 p-0.5 rounded-lg border ${
              darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'
            }`}>
              <button 
                onClick={() => setPreviewRtl(false)}
                className={`flex items-center justify-center p-1 rounded-md transition-all ${
                  !previewRtl 
                    ? darkMode ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-[#0058bc]' 
                    : 'text-on-surface-variant/50 hover:bg-black/5'
                }`}
                title="Left-to-Right"
              >
                <span className="material-symbols-outlined text-[16px]">format_align_left</span>
              </button>
              <button 
                onClick={() => setPreviewRtl(true)}
                className={`flex items-center justify-center p-1 rounded-md transition-all ${
                  previewRtl 
                    ? darkMode ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-[#0058bc]' 
                    : 'text-on-surface-variant/50 hover:bg-black/5'
                }`}
                title="Right-to-Left"
              >
                <span className="material-symbols-outlined text-[16px]">format_align_right</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-4">
            {/* View Toggles */}
            <div className={`p-0.5 rounded-lg flex gap-0.5 border ${
              darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'
            }`}>
              <button className={`flex items-center justify-center p-1 rounded-md ${darkMode ? 'bg-white/10 text-white' : 'bg-white shadow-sm text-[#0058bc]'}`}>
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>grid_view</span>
              </button>
              <button className="flex items-center justify-center p-1 rounded-md text-on-surface-variant/50 hover:bg-white/40">
                <span className="material-symbols-outlined text-[18px]">view_list</span>
              </button>
            </div>

            <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>
            
            <button className="w-8 h-8 rounded-full text-on-surface-variant/70 hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-full text-on-surface-variant/70 hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">
                {darkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            
            <button className="bg-[#0058bc] text-white font-semibold text-[13px] px-4 py-1.5 rounded-lg hover:bg-[#0058bc]/90 transition-all shadow-sm">
              Activate
            </button>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-8 flex flex-col">
          {/* Section Header */}
          <div className="flex justify-between mb-8 items-center">
            <div className="flex flex-col gap-1 min-w-0 pr-4">
              <h2 className="text-[32px] font-bold tracking-tight truncate">
                {selectedTag ? `Collection: ${selectedTag}` : 'All Fonts'}
              </h2>
              <p className="text-[13px] text-on-surface-variant/60">
                {fonts.length} {fonts.length === 1 ? 'font family' : 'font families'} in your vault
              </p>
            </div>
            
            {/* Interactive Preview Text Input */}
            <div className="relative w-full max-w-[400px] group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[20px]">text_fields</span>
              <input 
                className={`w-full border rounded-xl py-2.5 pl-10 pr-4 text-[13px] focus:ring-2 focus:ring-[#0058bc]/20 outline-none transition-all ${
                  darkMode 
                    ? 'bg-white/5 border-white/10 text-white placeholder-white/30' 
                    : 'bg-black/5 border-black/5 text-[#1a1b1f] placeholder-black/30'
                }`}
                id="preview-text-input" 
                placeholder="Enter preview text..." 
                type="text" 
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
              />
            </div>
          </div>

          {/* Virtualized Cards Grid Container */}
          <div className="flex-1 flex flex-col">
            <FontList />
          </div>

          {/* Bottom library details section */}
          {!selectedTag && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-10 pb-6 border-t border-black/5 dark:border-white/5 mt-8">
              {/* Featured Font Preview Panel */}
              <div className={`lg:col-span-2 border rounded-[24px] p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group transition-all duration-300 ${
                darkMode ? 'bg-[#1c1c1e] border-white/5 text-white' : 'bg-[#f8f9fb] border-black/5'
              }`}>
                <div className="absolute -right-8 -top-8 text-black/[0.02] dark:text-white/[0.02] pointer-events-none select-none">
                  <span className="material-symbols-outlined text-[240px]">format_bold</span>
                </div>
                <div className="relative z-10">
                  <span className="bg-[#0058bc]/10 text-[#0058bc] dark:text-[#adc6ff] text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-3 inline-block">
                    Featured Font
                  </span>
                  <h3 className="text-[28px] font-bold">Inter Display</h3>
                  <p className="text-[13px] text-on-surface-variant/60">Rasmus Andersson • Sans Serif</p>
                  
                  <div className="mt-6">
                    <p className="text-[34px] font-extrabold tracking-tighter leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Crafting pixels with intent.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-8 relative z-10">
                  <button className="bg-[#0058bc] text-white px-8 py-2.5 rounded-full font-bold text-[13px] hover:shadow-lg hover:shadow-[#0058bc]/20 transition-all">
                    Activate
                  </button>
                  <button className={`border px-8 py-2.5 rounded-full font-bold text-[13px] transition-all ${
                    darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-black/10 hover:bg-black/5'
                  }`}>
                    View Family
                  </button>
                </div>
              </div>

              {/* Library Health Panel */}
              <div className={`border rounded-[24px] p-8 flex flex-col justify-between shadow-sm transition-all duration-300 ${
                darkMode ? 'bg-[#1c1c1e] border-white/5' : 'bg-white border-black/5'
              }`}>
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined">health_metrics</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[15px]">Library Health</h3>
                      <p className="text-[12px] text-on-surface-variant/50">Maintenance required</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-black/[0.02]'}`}>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500 text-[20px]">broken_image</span>
                        <span className="text-[13px] text-on-surface-variant">Broken Fonts</span>
                      </div>
                      <span className="font-bold">4</span>
                    </div>
                    <div className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-black/[0.02]'}`}>
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-500 text-[20px]">content_copy</span>
                        <span className="text-[13px] text-on-surface-variant">Duplicates</span>
                      </div>
                      <span className="font-bold">12</span>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-6 bg-[#1a1b1f] dark:bg-white dark:text-black text-white py-3 rounded-xl font-bold text-[13px] hover:bg-black dark:hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">build</span>
                  Repair Library
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
