import React, { useEffect } from "react";
import { open } from '@tauri-apps/plugin-dialog';
import { FolderPlus, Search, Type, AlignLeft, AlignRight, RotateCw } from 'lucide-react';
import { useFontStore } from "./store";
import { FontList } from "./components/FontList";
import "./App.css";

function App() {
  const { 
    query, setQuery, fetchFonts, isLoading, importFolder, scanSystemFonts, 
    previewSize, setPreviewSize, previewRtl, setPreviewRtl, 
    previewText, setPreviewText, tags, selectedTag, setSelectedTag, fetchTags 
  } = useFontStore();

  useEffect(() => {
    const init = async () => {
      await fetchFonts();
      await fetchTags();
      // If first launch (0 fonts indexed), auto-scan system fonts!
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

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Textey</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${!selectedTag ? 'active' : ''}`}
            onClick={() => setSelectedTag('')}
          >
            All Fonts
          </button>
          
          <button 
            className={`nav-item ${selectedTag === 'Favorites' ? 'active' : ''}`}
            onClick={() => setSelectedTag('Favorites')}
          >
            Favorites ⭐
          </button>
          
          {tags.filter(t => t !== 'Favorites').map(t => (
            <button 
              key={t}
              className={`nav-item ${selectedTag === t ? 'active' : ''}`}
              onClick={() => setSelectedTag(t)}
            >
              📁 {t}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="action-btn" onClick={handleImport} disabled={isLoading}>
            <FolderPlus size={18} />
            <span>{isLoading ? 'Indexing...' : 'Import Folder'}</span>
          </button>
          
          <button 
            className="action-btn secondary-btn" 
            onClick={scanSystemFonts} 
            disabled={isLoading}
            style={{ marginTop: '8px' }}
            title="Scan System Fonts for newly installed fonts"
          >
            <RotateCw size={18} className={isLoading ? 'spin' : ''} />
            <span>{isLoading ? 'Scanning...' : 'Rescan System Fonts'}</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="workspace">
        <header className="toolbar">
          <div className="search-bar">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search fonts..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          <div className="controls">
            <div className="control-group">
              <Type size={16} className="control-icon" />
              <input 
                type="range" 
                min="12" 
                max="144" 
                value={previewSize}
                onChange={(e) => setPreviewSize(Number(e.target.value))}
                className="size-slider"
              />
              <span className="size-label">{previewSize}px</span>
            </div>
            
            <div className="control-group toggles">
              <button 
                className={`icon-btn ${!previewRtl ? 'active' : ''}`}
                onClick={() => setPreviewRtl(false)}
                title="Left-to-Right"
              >
                <AlignLeft size={16} />
              </button>
              <button 
                className={`icon-btn ${previewRtl ? 'active' : ''}`}
                onClick={() => setPreviewRtl(true)}
                title="Right-to-Left"
              >
                <AlignRight size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="preview-text-input">
          <label>Type text here to customize all previews below</label>
          <div className="preview-input-container">
            <input 
              type="text" 
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              dir={previewRtl ? "rtl" : "ltr"}
              placeholder="Type here to preview..."
            />
          </div>
        </div>

        <FontList />
      </main>
    </div>
  );
}

export default App;
