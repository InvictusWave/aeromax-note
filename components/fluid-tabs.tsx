'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

export interface FluidTabsProps {
  tabs: TabItem[];
  activeTab?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FluidTabs({
  tabs,
  activeTab,
  value,
  defaultValue,
  onChange,
  className = '',
  size = 'md',
}: FluidTabsProps) {
  const currentTab = value !== undefined ? value : activeTab !== undefined ? activeTab : defaultValue ?? tabs[0]?.id;
  const [selectedTab, setSelectedTab] = useState(currentTab);

  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const activeId = value !== undefined ? value : activeTab !== undefined ? activeTab : selectedTab;

  useEffect(() => {
    if (value !== undefined) {
      setSelectedTab(value);
    } else if (activeTab !== undefined) {
      setSelectedTab(activeTab);
    }
  }, [value, activeTab]);

  useEffect(() => {
    if (!containerRef.current) return;
    const activeButton = containerRef.current.querySelector<HTMLButtonElement>(`[data-tab-id="${activeId}"]`);
    if (activeButton) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
        opacity: 1,
      });
    }
  }, [activeId, tabs]);

  const handleTabClick = (tabId: string) => {
    if (value === undefined && activeTab === undefined) {
      setSelectedTab(tabId);
    }
    onChange?.(tabId);
  };

  const sizeClasses = {
    sm: 'h-8 text-xs px-2.5 gap-1.5',
    md: 'h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4 gap-2',
    lg: 'h-11 sm:h-12 text-sm sm:text-base px-4 sm:px-5 gap-2.5',
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={twMerge(
        'relative inline-flex items-center rounded-2xl border border-line bg-mist/90 p-1.5 shadow-xs backdrop-blur-xs select-none max-w-full overflow-x-auto no-scrollbar',
        className
      )}
    >
      {/* Fluid Pill Slider Indicator */}
      <div
        className="pointer-events-none absolute top-1.5 bottom-1.5 rounded-xl bg-white shadow-xs transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          opacity: indicatorStyle.opacity,
        }}
      />

      {/* Tabs */}
      {tabs.map(tab => {
        const isActive = tab.id === activeId;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab-id={tab.id}
            aria-selected={isActive}
            onClick={() => handleTabClick(tab.id)}
            className={twMerge(
              'relative z-10 inline-flex shrink-0 items-center justify-center font-bold tracking-tight transition-colors duration-200 active:scale-95 rounded-xl',
              sizeClasses[size],
              isActive ? 'text-ink' : 'text-slate-500 hover:text-ink'
            )}
          >
            {tab.icon && (
              <span className={twMerge('shrink-0 transition-transform duration-200', isActive ? 'scale-105 text-leaf' : 'text-slate-400')}>
                {tab.icon}
              </span>
            )}
            <span className="truncate">{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={twMerge(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-bold leading-none',
                  isActive ? 'bg-mist text-leaf' : 'bg-slate-200/70 text-slate-600'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default FluidTabs;
