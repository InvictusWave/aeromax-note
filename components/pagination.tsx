'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface PaginationProps {
  totalPages: number;
  value: number;
  onChange: (page: number) => void;
  className?: string;
  siblingCount?: number;
}

export function Pagination({
  totalPages,
  value,
  onChange,
  className = '',
  siblingCount = 1,
}: PaginationProps) {
  const currentPage = Math.max(1, Math.min(value, totalPages));

  const paginationRange = useMemo(() => {
    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, idx) => idx + 1);
      return [...leftRange, 'DOTS_RIGHT', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, idx) => totalPages - rightItemCount + idx + 1
      );
      return [firstPageIndex, 'DOTS_LEFT', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, idx) => leftSiblingIndex + idx
      );
      return [firstPageIndex, 'DOTS_LEFT', ...middleRange, 'DOTS_RIGHT', lastPageIndex];
    }

    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }, [totalPages, currentPage, siblingCount]);

  if (totalPages <= 1) return null;

  return (
    <nav
      role="navigation"
      aria-label="Paginasi Halaman"
      className={twMerge(
        'flex items-center justify-center gap-1 rounded-2xl border border-line bg-white/95 p-1.5 shadow-xs backdrop-blur-xs select-none',
        className
      )}
    >
      {/* Previous Button */}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onChange(currentPage - 1)}
        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-mist hover:text-ink disabled:opacity-40 disabled:pointer-events-none active:scale-95"
        aria-label="Halaman Sebelumnya"
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">Sebelumnya</span>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {paginationRange.map((pageNumber, index) => {
          if (pageNumber === 'DOTS_LEFT' || pageNumber === 'DOTS_RIGHT') {
            return (
              <span
                key={`dots-${index}`}
                className="grid h-9 w-7 place-items-center text-slate-400"
              >
                <MoreHorizontal size={15} />
              </span>
            );
          }

          const page = pageNumber as number;
          const isActive = page === currentPage;

          return (
            <button
              key={page}
              type="button"
              onClick={() => onChange(page)}
              aria-current={isActive ? 'page' : undefined}
              className={twMerge(
                'grid h-9 min-w-[36px] place-items-center rounded-xl px-2 text-xs font-bold transition-all active:scale-95',
                isActive
                  ? 'bg-ink text-white shadow-xs'
                  : 'text-slate-600 hover:bg-mist hover:text-ink'
              )}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onChange(currentPage + 1)}
        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-mist hover:text-ink disabled:opacity-40 disabled:pointer-events-none active:scale-95"
        aria-label="Halaman Berikutnya"
      >
        <span className="hidden sm:inline">Berikutnya</span>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

export default Pagination;
