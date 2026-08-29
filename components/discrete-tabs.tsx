'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

export interface DiscreteTabItem {
  id: string;
  icon: ReactNode;
  label: string;
  activeColor?: string;
  href?: string;
  onClick?: () => void;
}

export interface DiscreteTabsProps {
  tabs: DiscreteTabItem[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (id: string) => void;
  className?: string;
  tone?: 'light' | 'dark';
}

export function DiscreteTabs({
  tabs,
  defaultTab,
  activeTab,
  onChange,
  className = '',
  tone = 'light',
}: DiscreteTabsProps) {
  const [selected, setSelected] = useState(activeTab || defaultTab || tabs[0]?.id);

  useEffect(() => {
    if (activeTab !== undefined) {
      setSelected(activeTab);
    }
  }, [activeTab]);

  const handleSelect = (tab: DiscreteTabItem) => {
    if (activeTab === undefined) {
      setSelected(tab.id);
    }
    onChange?.(tab.id);
    tab.onClick?.();
  };

  return (
    <nav
      role="tablist"
      aria-label="Navigasi Menu"
      className={twMerge(
        'inline-flex items-center gap-1.5 rounded-full border border-line/90 bg-white/95 p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.08)] backdrop-blur-xl select-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = selected === tab.id;

        const content = (
          <>
            <span
              className={twMerge(
                'grid h-9 w-9 shrink-0 place-items-center transition-all duration-200',
                isActive
                  ? (tab.activeColor || (tone === 'dark' ? 'text-lime' : 'text-leaf'))
                  : 'text-slate-400 group-hover:text-slate-700',
                isActive && 'scale-105'
              )}
            >
              {tab.icon}
            </span>

            {/* Expanding Label */}
            <div
              className={twMerge(
                'grid transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
                isActive ? 'grid-rows-[1fr] opacity-100 pr-3.5 pl-0.5' : 'grid-rows-[0fr] opacity-0 p-0 w-0'
              )}
            >
              <span
                className={twMerge(
                  'overflow-hidden whitespace-nowrap text-xs font-bold tracking-tight',
                  tone === 'dark' ? 'text-white' : 'text-ink'
                )}
              >
                {tab.label}
              </span>
            </div>
          </>
        );

        const tabClasses = twMerge(
          'group relative flex h-10 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] active:scale-95',
          isActive
            ? tone === 'dark'
              ? 'bg-ink text-white shadow-sm ring-1 ring-white/10'
              : 'bg-mist text-ink border border-line/80 shadow-xs ring-1 ring-black/5'
            : 'text-slate-500 hover:bg-slate-100/60 hover:text-ink w-10'
        );

        if (tab.href) {
          return (
            <Link
              key={tab.id}
              href={tab.href}
              prefetch={true}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelect(tab)}
              className={tabClasses}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleSelect(tab)}
            className={tabClasses}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}

export default DiscreteTabs;

