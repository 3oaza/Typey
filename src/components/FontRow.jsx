import React, { useState, useEffect, useRef } from 'react';
import { Star, FolderPlus, Check, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useFontFace } from '../hooks/useVirtualFonts';
import { useFontStore } from '../store';

export const FontRow = ({ font, style }) => {
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

  const handleRemoveTag = async (tag, e) => {
    e.stopPropagation();
    if (!currentStyle?.id) return;
    try {
      await removeFontTag(currentStyle.id, tag);
      setTags(prev => prev.filter(t => t !== tag));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={style} className="font-row">
      <div className="font-row-inner">
        <div className="font-meta">
          <div className="font-meta-left">
            <h3>{font.family}</h3>
            
            {styles.length > 1 ? (
              <select 
                value={selectedStyleIndex} 
                onChange={(e) => setSelectedStyleIndex(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="style-selector"
              >
                {styles.map((s, idx) => (
                  <option key={s.id} value={idx}>
                    {s.subfamily}
                  </option>
                ))}
              </select>
            ) : (
              <span className="subfamily">{currentStyle.subfamily}</span>
            )}
            
            <div className="tags">
              {font.has_arabic && <span className="tag system-tag">Arabic</span>}
              {font.is_variable && <span className="tag system-tag">Variable</span>}
              {tags.map(t => (
                <span key={t} className="tag user-tag">
                  {t}
                  <X 
                    size={10} 
                    className="remove-tag-icon" 
                    onClick={(e) => handleRemoveTag(t, e)}
                  />
                </span>
              ))}
            </div>
          </div>
          
          <div className="font-meta-right" ref={dropdownRef}>
            <button 
              className={`meta-action-btn ${showDropdown ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              title="Organize / Add to Folders"
            >
              <FolderPlus size={16} />
            </button>
            
            {showDropdown && (
              <div className="collection-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="dropdown-header">Add to Folder</div>
                <div className="dropdown-divider" />
                
                {allCollections.filter(c => c !== 'Favorites').length === 0 ? (
                  <div className="dropdown-empty">No folders created yet.</div>
                ) : (
                  allCollections.filter(c => c !== 'Favorites').map(c => {
                    const hasTag = tags.includes(c);
                    return (
                      <button 
                        key={c}
                        className="dropdown-item" 
                        onClick={(e) => toggleCollectionTag(c, e)}
                      >
                        <span>📁 {c}</span>
                        {hasTag && <Check size={12} className="tag-check" />}
                      </button>
                    );
                  })
                )}
                
                <div className="dropdown-divider" />
                
                {showTagInput ? (
                  <div className="dropdown-input-wrapper">
                    <input 
                      type="text" 
                      placeholder="New folder name..." 
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="inline-tag-input"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button 
                    className="dropdown-item new-folder-btn"
                    onClick={() => setShowTagInput(true)}
                  >
                    <span>➕ New Folder...</span>
                  </button>
                )}
              </div>
            )}
            
            <button 
              className={`meta-action-btn favorite-btn ${isFavorite ? 'active' : ''}`}
              onClick={toggleFavorite}
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Star size={16} fill={isFavorite ? "#ffcc00" : "none"} />
            </button>
          </div>
        </div>
        
        <div 
          className="font-preview"
          dir={previewRtl ? "rtl" : "ltr"}
          style={{
            fontFamily: loaded ? `"${fontFamilyName}", sans-serif` : 'sans-serif',
            fontSize: `${previewSize}px`,
            opacity: loaded ? 1 : 0.2,
            fontFeatureSettings: '"liga" 1, "clig" 1, "calt" 1',
            fontVariantLigatures: 'contextual common-ligatures',
            transition: 'opacity 0.3s ease'
          }}
        >
          {previewText}
        </div>
      </div>
    </div>
  );
};
