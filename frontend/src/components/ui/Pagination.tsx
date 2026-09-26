import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pages, total, limit, onChange, className }: PaginationProps) {
  if (pages <= 1) return null;

  const from = Math.min((page - 1) * limit + 1, total);
  const to   = Math.min(page * limit, total);

  // Build page number list with ellipsis
  const getPages = (): (number | '…')[] => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);

    const items: (number | '…')[] = [1];

    if (page > 3)         items.push('…');
    if (page > 2)         items.push(page - 1);
    if (page !== 1 && page !== pages) items.push(page);
    if (page < pages - 1) items.push(page + 1);
    if (page < pages - 2) items.push('…');

    items.push(pages);
    return items;
  };

  const pageList = getPages();

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-4', className)}
    >
      {/* Range label */}
      <p className="text-xs text-gray-500">
        Showing <span className="font-medium text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-gray-700">{total.toLocaleString()}</span>
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border text-gray-600 transition-colors',
            page === 1
              ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'border-gray-300 bg-white hover:bg-gray-50'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {pageList.map((item, i) =>
          item === '…' ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-gray-400">
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors',
                item === page
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              {item}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border text-gray-600 transition-colors',
            page === pages
              ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'border-gray-300 bg-white hover:bg-gray-50'
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
