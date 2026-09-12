import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle2, Image as ImageIcon, FileText } from 'lucide-react';
import { api } from '../services/api.ts';
import { Photo } from '../types/index.ts';

interface PhotoUploadModalProps {
  eventId: string;
  eventName: string;
  onClose: () => void;
  onSuccess: (newPhotos: Photo[]) => void;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  eventId,
  eventName,
  onClose,
  onSuccess,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ name: string; size: number; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setError(null);

    const validFiles: File[] = [];
    const validPreviews: { name: string; size: number; url: string }[] = [];

    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}" rejected: Only JPG, PNG, and WEBP images are supported.`);
        return;
      }
      if (file.size > MAX_SIZE) {
        setError(`"${file.name}" rejected: Exceeds the maximum 10MB size limit.`);
        return;
      }

      validFiles.push(file);
      validPreviews.push({
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...validPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index].url);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setError(null);
    setUploadProgress(20);

    try {
      setUploadProgress(50);
      const uploaded = await api.uploadPhotos(eventId, selectedFiles);
      setUploadProgress(100);
      onSuccess(uploaded);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload photographs.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload Event Photographs</h3>
            <p className="text-xs text-slate-500">{eventName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer bg-indigo-50/30 dark:bg-indigo-950/20 transition-all hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFiles(e.target.files)}
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-inner">
              <Upload className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Click to select or drag and drop event photos
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports JPG, PNG, and WEBP (Up to 10MB each, up to 20 files per batch)
            </p>
          </div>

          {/* Selected Files List */}
          {previews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Ready to Upload ({previews.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    previews.forEach((p) => URL.revokeObjectURL(p.url));
                    setSelectedFiles([]);
                    setPreviews([]);
                  }}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                {previews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800"
                  >
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="w-full h-24 object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors opacity-80 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-1.5 text-[10px] text-slate-600 dark:text-slate-300 truncate bg-white/90 dark:bg-slate-900/90">
                      {preview.name} ({formatSize(preview.size)})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span>Uploading & saving to cloud storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedFiles.length === 0 || uploading}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md disabled:opacity-40 transition-colors flex items-center space-x-2"
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload {selectedFiles.length} Photos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
