import { useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

export function useFontFace(font) {
  const [loaded, setLoaded] = useState(false);
  // Remove non-alphanumeric chars from family name for safety in CSS
  const fontFamilyName = `font_${font?.id || 'unknown'}`;

  useEffect(() => {
    if (!font || !font.file_path) return;

    // Check if it's already loaded to prevent duplicate loading
    let isAlreadyLoaded = false;
    document.fonts.forEach((f) => {
      if (f.family === fontFamilyName) {
        isAlreadyLoaded = true;
      }
    });

    if (isAlreadyLoaded) {
      setLoaded(true);
      return;
    }

    const url = convertFileSrc(font.file_path);
    const fontFace = new FontFace(fontFamilyName, `url('${url}')`);

    fontFace.load().then((loadedFace) => {
      document.fonts.add(loadedFace);
      setLoaded(true);
    }).catch(e => {
      console.error("Failed to load font", font.file_path, e);
    });

    return () => {
      // In a hyper-optimized version we might delete the font face here 
      // when it unmounts from the virtual list, but browsers are quite 
      // efficient at holding FontFace objects if not applied to DOM nodes.
      // document.fonts.delete(fontFace);
    };
  }, [font, fontFamilyName]);

  return { loaded, fontFamilyName };
}
