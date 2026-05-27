import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFontStore } from '../store';
import { FontRow } from './FontRow';

export const FontList = () => {
  const fonts = useFontStore(state => state.fonts);
  const previewSize = useFontStore(state => state.previewSize);
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: fonts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => Math.max(160, previewSize + 145),
    overscan: 10,
  });

  if (fonts.length === 0) {
    return (
      <div className="empty-state">
        <p>No fonts found.</p>
        <p className="subtitle">Import a folder or search to begin.</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="virtual-list-container">
      <div
        className="virtual-list-inner"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => (
          <FontRow
            key={fonts[virtualItem.index].id || virtualItem.index}
            font={fonts[virtualItem.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
