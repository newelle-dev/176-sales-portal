'use client';

import React, { useState, useRef, useTransition } from 'react';
import { uploadCsvAction, UploadState } from './actions';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, UploadCloud } from 'lucide-react';

export default function UploadZone() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [result, setResult] = useState<UploadState | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
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

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setResult({ error: 'Only CSV files are supported.' });
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    startTransition(async () => {
      const res = await uploadCsvAction(formData);
      setResult(res);
      if (res.success) {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <div className="space-y-4 select-none">
      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 p-6 text-center ${
          isDragActive
            ? 'border-black bg-gray-50'
            : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50/80 hover:border-gray-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
          disabled={isPending}
        />

        <div className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-3">
          {selectedFile ? (
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 animate-pulse" />
          ) : (
            <UploadCloud className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {selectedFile ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900 truncate max-w-xs mx-auto">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-450 text-gray-400">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-700">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-400">WessConnect CSV files only</p>
          </div>
        )}
      </div>

      {/* Selected File Actions */}
      {selectedFile && (
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedFile(null);
              setResult(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            disabled={isPending}
            className="border-gray-200 text-gray-500 hover:text-black h-9 text-xs font-semibold px-4 rounded-lg cursor-pointer"
          >
            Clear File
          </Button>
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
        <div className="space-y-3">
          {result.success && (
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-150 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold">Import Completed</p>
                <p className="text-xs font-medium text-emerald-700">
                  Successfully matched and imported {result.insertedCount} transaction records.
                </p>
              </div>
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
