import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFontStore } from '../store';
import { FontCard } from './FontCard';

export const FontList = () => {
  const fonts = useFontStore(state => state.fonts);
  const previewSize = useFontStore(state => state.previewSize);
  const parentRef = useRef(null);

  // Group fonts into chunks of 3 for the grid layout
  const chunkedFonts = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < fonts.length; i += 3) {
      chunks.push(fonts.slice(i, i + 3));
    }
    return chunks;
  }, [fonts]);

  const rowVirtualizer = useVirtualizer({
    count: chunkedFonts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => Math.max(280, previewSize + 180),
    overscan: 5,
  });

  if (fonts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center w-full">
        <span className="material-symbols-outlined text-[64px] text-on-surface-variant/20 mb-4">
          text_fields
        </span>
        <h4 className="text-[18px] font-bold text-on-surface mb-1">No fonts found</h4>
        <p className="text-[13px] text-on-surface-variant/50 max-w-xs">
          Import a folder of fonts or click "Rescan System Fonts" to index your local system fonts.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="flex-1 overflow-y-auto custom-scrollbar w-full"
      style={{ height: 'calc(100vh - 180px)' }}
    >
      <div
        className="relative w-full"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const rowChunk = chunkedFonts[virtualItem.index] || [];
          return (
            <div
              key={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
                paddingBottom: '24px', // Gap between rows
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full h-full">
                {rowChunk.map((font) => (
                  <div key={font.id || font.family} className="h-full">
                    <FontCard font={font} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
