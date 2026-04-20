import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: string;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Slight delay to prevent immediate close on the same right-click if events bubble strangely
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside); // Close on another right click
    }, 10);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [onClose]);

  // Prevent default context menu from showing over this one
  useEffect(() => {
    const preventDefault = (e: MouseEvent) => e.preventDefault();
    if (menuRef.current) {
      menuRef.current.addEventListener('contextmenu', preventDefault);
    }
  }, []);

  return createPortal(
    <div 
      ref={menuRef}
      className="fixed z-[9999] bg-[#1a1130] border-2 border-[#a48cff] min-w-[150px] shadow-[4px_4px_0_rgba(0,0,0,0.5)] pixel-font"
      style={{ top: y, left: x }}
    >
      <div className="flex flex-col py-1">
        {items.map((item, index) => (
          <button
            key={index}
            className={`
              w-full text-left px-3 py-1.5 text-sm transition-colors
              ${item.disabled 
                ? 'text-white/30 cursor-not-allowed' 
                : 'text-[#0ff] hover:bg-[#a48cff]/30 hover:text-white'}
            `}
            onClick={() => {
              if (item.disabled) return;
              item.onClick();
              onClose();
            }}
            disabled={item.disabled}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};
