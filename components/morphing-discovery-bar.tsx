'use client';

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export interface Category {
  id: string;
  label: string;
  icon?: ReactNode;
  activeColor?: string;
  activeTextColor?: string;
}

export interface MorphingDiscoveryBarProps {
  categories: Category[];
  value?: string;
  defaultValue?: string;
  onChange?: (categoryId: string) => void;
  className?: string;
}

export function MorphingDiscoveryBar({
  categories,
  value,
  defaultValue,
  onChange,
  className = '',
}: MorphingDiscoveryBarProps) {
  const currentCategory = value !== undefined ? value : defaultValue ?? categories[0]?.id;
  const [selectedId, setSelectedId] = useState(currentCategory);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pillProps, setPillProps] = useState<{
    left: number;
    width: number;
    opacity: number;
    bgColor: string;
  }>({
    left: 0,
    width: 0,
    opacity: 0,
    bgColor: '#f1f5f2',
  });

  const activeId = value !== undefined ? value : selectedId;
  const activeCategory = categories.find(c => c.id === activeId) ?? categories[0];

  useEffect(() => {
    if (value !== undefined) {
      setSelectedId(value);
    }
  }, [value]);

  useEffect(() => {
    if (!containerRef.current) return;
    const activeButton = containerRef.current.querySelector<HTMLButtonElement>(`[data-category-id="${activeId}"]`);
    if (activeButton) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setPillProps({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
        opacity: 1,
        bgColor: activeCategory?.activeColor || '#f1f5f2',
      });
    }
  }, [activeId, activeCategory, categories]);

  const handleSelect = (categoryId: string) => {
    if (value === undefined) {
      setSelectedId(categoryId);
    }
    onChange?.(categoryId);
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={twMerge(
        'relative inline-grid grid-flow-col auto-cols-fr items-center rounded-2xl border border-line bg-white/95 p-1.5 shadow-xs backdrop-blur-md select-none w-full sm:w-auto',
        className
      )}
    >
      {/* Morphing Sliding Pill */}
      <div
        className="pointer-events-none absolute top-1.5 bottom-1.5 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-xs border border-black/5"
        style={{
          left: `${pillProps.left}px`,
          width: `${pillProps.width}px`,
          opacity: pillProps.opacity,
          backgroundColor: pillProps.bgColor,
        }}
      />

      {/* Category Buttons */}
      {categories.map(category => {
        const isActive = category.id === activeId;

        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            data-category-id={category.id}
            aria-selected={isActive}
            onClick={() => handleSelect(category.id)}
            className={twMerge(
              'relative z-10 flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95',
              isActive ? 'font-bold' : 'text-slate-500 hover:text-ink'
            )}
            style={{
              color: isActive && category.activeTextColor ? category.activeTextColor : undefined,
            }}
          >
            {category.icon && (
              <span
                className={twMerge(
                  'shrink-0 transition-transform duration-200',
                  isActive ? 'scale-105' : 'text-slate-400'
                )}
                style={{
                  color: isActive && category.activeTextColor ? category.activeTextColor : undefined,
                }}
              >
                {category.icon}
              </span>
            )}
            <span className="truncate">{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default MorphingDiscoveryBar;
