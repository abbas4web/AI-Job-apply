'use client';

import { FileText, Star, Trash2, Zap, MoreVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import type { Resume } from '@/lib/resumes';

interface ResumeCardProps {
  resume: Resume;
  isSelected: boolean;
  isAnalyzing: boolean;
  onSelect: (id: string) => void;
  onAnalyze: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ResumeCard({
  resume,
  isSelected,
  isAnalyzing,
  onSelect,
  onAnalyze,
  onSetDefault,
  onDelete,
}: ResumeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formattedDate = new Date(resume.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all',
        isSelected
          ? 'border-indigo-400 ring-2 ring-indigo-200'
          : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
      )}
    >
      {/* Default badge */}
      {resume.isDefault && (
        <span className="absolute right-10 top-4 flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
          <Star className="h-3 w-3 fill-indigo-500 text-indigo-500" />
          Default
        </span>
      )}

      {/* Three-dot menu */}
      <div ref={menuRef} className="absolute right-3 top-3">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Resume options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {!resume.isDefault && (
              <button
                onClick={() => { onSetDefault(resume.id); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Star className="h-4 w-4 text-gray-400" />
                Set as default
              </button>
            )}
            <button
              onClick={() => { onDelete(resume.id); setMenuOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete resume
            </button>
          </div>
        )}
      </div>

      {/* Main content — clicking selects */}
      <button
        onClick={() => onSelect(resume.id)}
        className="flex items-start gap-3 text-left"
      >
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
          <FileText className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <p className="truncate text-sm font-semibold text-gray-900">{resume.name}</p>
          <p className="mt-0.5 text-xs text-gray-400">Uploaded {formattedDate}</p>
        </div>
      </button>

      {/* Analyze button */}
      <Button
        variant="secondary"
        size="sm"
        isLoading={isAnalyzing}
        onClick={() => onAnalyze(resume.id)}
        leftIcon={<Zap className="h-3.5 w-3.5 text-amber-500" />}
        className="w-full text-xs"
      >
        {isAnalyzing ? 'Analyzing…' : 'Analyze with AI'}
      </Button>
    </div>
  );
}
