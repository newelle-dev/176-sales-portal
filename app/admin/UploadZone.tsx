'use client';

import React, { useState, useRef, useTransition } from 'react';
import { uploadCsvAction, UploadState } from './actions';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, UploadCloud, X, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function UploadZone() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [result, setResult] = useState<UploadState | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFiles = (fileList: FileList) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      if (!file.name.endsWith('.csv')) {
        errors.push(`"${file.name}" is not a CSV file.`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setResult({ error: errors.join(' ') });
    } else {
      setResult(null);
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => {
        // Prevent duplicate files by checking names
        const existingNames = new Set(prev.map((f) => f.name));
        const filteredNew = validFiles.filter((f) => !existingNames.has(f.name));
        return [...prev, ...filteredNew];
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    startTransition(async () => {
      const res = await uploadCsvAction(formData);
      setResult(res);
      if (res.success) {
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-6 select-none">
      {/* Drag & Drop Area */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload CSV files — click or drag and drop"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerFileInput();
          }
        }}
        className={`h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 p-6 text-center focus:outline-none focus:ring-2 focus:ring-black/20 ${
          isDragActive
            ? 'border-black bg-gray-50/80'
            : 'border-gray-200 bg-gray-50/30 hover:bg-gray-50/80 hover:border-gray-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={isPending}
        />

        <div className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-3">
          <UploadCloud className="w-5 h-5 text-gray-400" />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-700">
            Click to upload or drag and drop files
          </p>
          <p className="text-xs text-gray-400">WessConnect CSV files only (You can select multiple)</p>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="border border-gray-150 rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-700">
              Selected Files ({selectedFiles.length})
            </span>
            <button
              onClick={() => {
                setSelectedFiles([]);
                setResult(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={isPending}
              className="text-[10px] font-bold text-red-650 hover:underline disabled:opacity-50 cursor-pointer"
            >
              Clear All
            </button>
          </div>
          <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, idx) => (
              <div key={file.name + idx} className="px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-4">
                  <FileSpreadsheet className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-semibold text-gray-900 truncate">{file.name}</span>
                  <span className="text-[10px] text-gray-400 font-medium shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  disabled={isPending}
                  className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected File Actions */}
      {selectedFiles.length > 0 && (
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isPending}
            className="bg-black text-white hover:bg-slate-800 h-9 px-4 gap-1.5 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing...
              </>
            ) : (
              'Start Import'
            )}
          </Button>
        </div>
      )}

      {/* Upload Feedback */}
      {result && (
        <div className="space-y-4">
          {result.success && (
            <div className="space-y-3">
              {/* Success Banner */}
              <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-150 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold">Import Completed Successfully</p>
                  <p className="text-xs font-medium text-emerald-700">
                    Imported/updated a total of <strong>{result.insertedCount}</strong> transaction records.
                  </p>
                </div>
              </div>

              {/* Individual File Stats */}
              {result.filesProcessed && result.filesProcessed.length > 0 && (
                <div className="border border-gray-150 rounded-xl bg-white overflow-hidden shadow-sm p-4 space-y-2.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Processed Files Detail</span>
                  <div className="space-y-1.5">
                    {result.filesProcessed.map((file, idx) => (
                      <div key={file.name + idx} className="flex justify-between items-center text-xs text-gray-600">
                        <span className="font-semibold text-gray-800 truncate max-w-xs">{file.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            {file.branchDetected}
                          </span>
                          <span className="text-emerald-700 font-bold">
                            +{file.insertedCount} rows
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmapped Employees Warning */}
              {result.unmappedEmployees && result.unmappedEmployees.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-900">Unmapped Employees Found</p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        The following employee names from your CSV files were imported, but are <strong>not linked</strong> to any active stylist profile in the portal. Stylists won't see these transactions on their dashboards until they are linked in the Team Manager.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/60 rounded-lg p-3 border border-amber-100 divide-y divide-amber-100/50 max-h-36 overflow-y-auto">
                    {result.unmappedEmployees.map((emp) => (
                      <div key={emp.name} className="py-1.5 first:pt-0 last:pb-0 flex justify-between text-xs">
                        <span className="font-semibold text-amber-950">{emp.name}</span>
                        <span className="text-amber-800 font-medium">{emp.count} transactions</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-1">
                    <Link
                      href="/admin/team"
                      className="inline-flex items-center gap-1 bg-amber-950 hover:bg-amber-900 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      Manage Team Aliases <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {result.error && (
            <div className="p-4 bg-red-50 text-red-900 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
              <div className="space-y-1.5 w-full">
                <p className="text-xs font-bold text-red-850">Import Failed</p>
                <p className="text-xs font-medium text-red-750">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
