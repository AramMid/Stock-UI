"use client";
import { useState, useEffect, useRef } from "react";
import { cursorOptions } from "@/lib/data/cursorOptions";

interface CursorPopupMenuProps {
  isDarkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCursorSelect: (cursorType: 'diagonal' | 'dot' | 'arrow' | 'illustration') => void;
  position?: { x: number; y: number };
}


export default function CursorPopupMenu({ 
  isDarkMode = true, 
  isOpen, 
  onClose, 
  onCursorSelect,
  position = { x: 0, y: 0 }
}: CursorPopupMenuProps) {
  const [selectedCursor, setSelectedCursor] = useState<'diagonal' | 'dot' | 'arrow' | 'illustration'>('dot');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleCursorSelect = (cursorType: 'diagonal' | 'dot' | 'arrow' | 'illustration') => {
    console.log('CursorPopupMenu: Selecting cursor type:', cursorType);
    setSelectedCursor(cursorType);
    onCursorSelect(cursorType);
    // Close menu after a short delay to ensure cursor selection is processed
    setTimeout(() => {
      onClose();
    }, 100);
  };

  if (!isOpen) return null;

  const menuStyle = {
    position: 'fixed' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 1000,
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Popup Menu */}
      <div
        ref={menuRef}
        style={menuStyle}
        className={`w-48 rounded shadow-lg border z-50 ${
          isDarkMode 
            ? "bg-[#2a2e39] border-gray-600" 
            : "bg-white border-gray-200"
        }`}
      >
        {/* Options */}
        <div className="p-2">
          <div className="space-y-2">
            {cursorOptions.map((option) => {
              const IconComponent = option.icon;
              const isSelected = selectedCursor === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleCursorSelect(option.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded transition-all ${
                    isSelected
                      ? isDarkMode 
                        ? "bg-gray-600 text-white" 
                        : "bg-gray-200 text-black"
                      : isDarkMode 
                        ? "hover:bg-gray-600 text-gray-300" 
                        : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-sm">{option.name}</span>
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-full ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
