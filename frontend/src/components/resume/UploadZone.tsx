'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Input, FormField } from '@/components/ui';

interface UploadZoneProps {
  onUpload: (file: File, name: string, isDefault: boolean) => Promise<void>;
  isUploading: boolean;
  hasExisting: boolean;
}

export function UploadZone({ onUpload, isUploading, hasExisting }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isDefault, setIsDefault] = useState(!hasExisting);

  const stageFile = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      setNameError('Only PDF files are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setNameError('File must be under 10 MB.');
      return;
    }
    setNameError('');
    setStaged(file);
    // Pre-fill name from filename (strip extension)
    setName(file.name.replace(/\.pdf$/i, ''));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) stageFile(file);
    },
    [stageFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) stageFile(file);
    // reset so the same file can be re-picked
    e.target.value = '';
  };

  const clearStaged = () => {
    setStaged(null);
    setName('');
    setNameError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staged) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Please give this resume a name.');
      return;
    }
    setNameError('');
    await onUpload(staged, trimmed, isDefault);
    clearStaged();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drop target */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !staged && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging
            ? 'border-indigo-400 bg-indigo-50'
            : staged
            ? 'border-emerald-400 bg-emerald-50 cursor-default'
            : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={onFileChange}
          aria-label="Upload PDF resume"
        />

        {staged ? (
          <>
            <FileText className="mb-3 h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium text-gray-900">{staged.name}</p>
            <p className="mt-1 text-xs text-gray-500">
              {(staged.size / 1024).toFixed(0)} KB · PDF
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearStaged(); }}
              className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              aria-label="Remove selected file"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <Upload className="h-6 w-6 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-gray-700">
              Drop your PDF here, or{' '}
              <span className="text-indigo-600">click to browse</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">PDF only · max 10 MB</p>
          </>
        )}
      </div>

      {/* Name + options (only shown when a file is staged) */}
      {staged && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <FormField
            label="Resume name"
            htmlFor="resume-name"
            error={nameError}
            required
          >
            <Input
              id="resume-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="e.g. Software Engineer Resume 2026"
              hasError={!!nameError}
              autoFocus
            />
          </FormField>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700">Set as default resume</span>
          </label>

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              isLoading={isUploading}
              leftIcon={<Upload className="h-4 w-4" />}
              className="flex-1"
            >
              {isUploading ? 'Uploading…' : 'Upload resume'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={clearStaged}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
