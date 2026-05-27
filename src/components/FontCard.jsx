import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useFontFace } from '../hooks/useVirtualFonts';
import { useFontStore } from '../store';

export const FontCard = ({ font }) => {
  const styles = font.styles || [];
  
  // Find "Regular" style index or fallback to the first style (0)
  const defaultStyleIndex = styles.findIndex(
    s => s.subfamily.toLowerCase() === 'regular' || s.subfamily.toLowerCase() === 'normal'
  );
  const [selectedStyleIndex, setSelectedStyleIndex] = useState(defaultStyleIndex >= 0 ? defaultStyleIndex : 0);
  
  const currentStyle = styles[selectedStyleIndex] || {};
  
  // Load the font face dynamically for the currently selected style
  const { loaded, fontFamilyName } = useFontFace(currentStyle);
  
  const previewText = useFontStore(state => state.previewText);
  const previewSize = useFontStore(state => state.previewSize);
  const previewRtl = useFontStore(state => state.previewRtl);
  
  const allCollections = useFontStore(state => state.tags);
  const addFontTag = useFontStore(state => state.addFontTag);
  const removeFontTag = useFontStore(state => state.removeFontTag);

  const [tags, setTags] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const dropdownRef = useRef(null);

  // Load tags associated with the currently selected style
  useEffect(() => {
    let active = true;
    if (currentStyle?.id) {
      invoke('get_font_tags', { fontId: currentStyle.id })
        .then(res => {
          if (active) setTags(res);
        })
        .catch(err => console.error("Error loading tags", err));
    }
    return () => {
      active = false;
    };
  }, [currentStyle?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isFavorite = tags.includes('Favorites');

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (!currentStyle?.id) return;
    try {
      if (isFavorite) {
        await removeFontTag(currentStyle.id, 'Favorites');
        setTags(prev => prev.filter(t => t !== 'Favorites'));
      } else {
        await addFontTag(currentStyle.id, 'Favorites');
        setTags(prev => [...prev, 'Favorites']);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCollectionTag = async (tag, e) => {
    e.stopPropagation();
    if (!currentStyle?.id) return;
    try {
      if (tags.includes(tag)) {
        await removeFontTag(currentStyle.id, tag);
        setTags(prev => prev.filter(t => t !== tag));
      } else {
        await addFontTag(currentStyle.id, tag);
        setTags(prev => [...prev, tag]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTag = async (e) => {
    if (e.key === 'Enter' && newTag.trim() && currentStyle?.id) {
      const tag = newTag.trim();
      try {
        await addFontTag(currentStyle.id, tag);
        setTags(prev => [...new Set([...prev, tag])]);
        setNewTag('');
        setShowTagInput(false);
        setShowDropdown(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const designer = font.designer || "System Font";
  const type = font.classification || (font.mono ? "Monospace" : "Sans Serif");

  return (
    <div className="font-card bg-white dark:bg-[#1c1c1e] p-6 rounded-[20px] shadow-sm hover:shadow-md border border-black/5 dark:border-white/5 transition-all duration-300 group relative flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="font-bold text-on-surface dark:text-white text-[16px] truncate" title={font.family}>{font.family}</h3>
            <p className="text-[11px] text-on-surface-variant/50 dark:text-white/40 truncate" title={`${designer} • ${type}`}>
              {designer} • {type}
            </p>
          </div>
          
          <div className="flex items-center gap-1.5" ref={dropdownRef}>
            {/* Add to collection dropdown trigger */}
            <button 
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-on-surface-variant/40 dark:text-white/40 hover:text-[#0058bc] dark:hover:text-[#adc6ff] transition-all relative"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              title="Add to Collection"
            >
              <span className="material-symbols-outlined text-[18px]">folder_open</span>
              
              {showDropdown && (
                <div 
                  className="absolute right-0 top-8 w-48 bg-white dark:bg-[#1e1e20] border border-black/10 dark:border-white/10 rounded-xl shadow-lg p-2 z-50 text-left" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold text-on-surface-variant/40 dark:text-white/40 uppercase px-2 py-1">Add to Folder</div>
                  <div className="h-px bg-black/5 dark:bg-white/5 my-1" />
                  
                  <div className="max-h-32 overflow-y-auto custom-scrollbar">
                    {allCollections.filter(c => c !== 'Favorites').length === 0 ? (
                      <div className="text-[11px] text-on-surface-variant/50 dark:text-white/40 px-2 py-1.5">No folders created yet.</div>
                    ) : (
                      allCollections.filter(c => c !== 'Favorites').map(c => {
                        const hasTag = tags.includes(c);
                        return (
                          <button 
                            key={c}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-left text-[12px] text-on-surface-variant dark:text-white/80 transition-colors" 
                            onClick={(e) => toggleCollectionTag(c, e)}
                          >
                            <span className="truncate">📁 {c}</span>
                            {hasTag && <span className="material-symbols-outlined text-[#0058bc] dark:text-[#adc6ff] text-[14px]">check</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                  
                  <div className="h-px bg-black/5 dark:bg-white/5 my-1" />
                  
                  {showTagInput ? (
                    <div className="px-1 py-1">
                      <input 
                        type="text" 
                        placeholder="New folder..." 
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleAddTag}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-2 py-1 text-[12px] text-on-surface dark:text-white outline-none focus:ring-1 focus:ring-[#0058bc]/20"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button 
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-left text-[12px] text-[#0058bc] dark:text-[#adc6ff] font-semibold transition-colors"
                      onClick={() => setShowTagInput(true)}
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      <span>New Folder...</span>
                    </button>
                  )}
                </div>
              )}
            </button>

            {/* Favorite Star Button */}
            <button 
              className={`favorite-btn ${isFavorite ? 'opacity-100 text-amber-500' : 'opacity-0 group-hover:opacity-100 text-on-surface-variant/40 dark:text-white/40 hover:text-amber-500'} p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all`}
              onClick={toggleFavorite}
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
              <span 
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: isFavorite ? '"FILL" 1' : '"FILL" 0' }}
              >
                star
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic style/weight dropdown if multiple weights exist */}
        {styles.length > 1 && (
          <div className="mb-3">
            <select 
              value={selectedStyleIndex} 
              onChange={(e) => setSelectedStyleIndex(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-none rounded-lg px-2.5 py-1 text-[11px] text-on-surface-variant dark:text-white/70 cursor-pointer outline-none transition-all"
            >
              {styles.map((s, idx) => (
                <option key={s.id} value={idx}>
                  {s.subfamily}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Font Preview Text */}
      <div className="flex-1 flex items-center overflow-hidden py-4">
        <p 
          className="font-preview text-on-surface dark:text-white leading-snug w-full break-words"
          dir={previewRtl ? "rtl" : "ltr"}
          style={{
            fontFamily: loaded ? `"${fontFamilyName}", sans-serif` : 'sans-serif',
            fontSize: `${Math.min(previewSize, 64)}px`,
            opacity: loaded ? 1 : 0.25,
            fontFeatureSettings: '"liga" 1, "clig" 1, "calt" 1',
            fontVariantLigatures: 'contextual common-ligatures',
            transition: 'opacity 0.3s ease, font-size 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {previewText}
        </p>
      </div>

      {/* Footer tags & check indicator */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/[0.03] dark:border-white/[0.03]">
        <div className="flex flex-wrap gap-1.5">
          {font.is_variable && (
            <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-on-surface-variant dark:text-white/50 text-[9px] font-bold uppercase tracking-wide">
              Variable
            </span>
          )}
          {font.has_arabic && (
            <span className="px-2 py-0.5 rounded bg-[#0058bc]/10 dark:bg-[#adc6ff]/10 text-[#0058bc] dark:text-[#adc6ff] text-[9px] font-bold uppercase tracking-wide">
              Arabic
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-on-surface-variant dark:text-white/50 text-[9px] font-bold uppercase tracking-wide">
            {styles.length} {styles.length > 1 ? 'Styles' : 'Style'}
          </span>
        </div>
        <span className="material-symbols-outlined text-[#0058bc]/30 dark:text-[#adc6ff]/30 group-hover:text-[#0058bc] dark:group-hover:text-[#adc6ff] transition-colors text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
          check_circle
        </span>
      </div>
    </div>
  );
};
