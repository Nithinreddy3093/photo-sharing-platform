import React from 'react';
import { X, Download, Calendar, HardDrive, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Photo } from '../types/index.ts';

interface PhotoLightboxProps {
  photo: Photo | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photo,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}) => {
  if (!photo) return null;

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between backdrop-blur-sm animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent text-white">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
            {photo.filename}
          </span>
          <span className="text-xs text-slate-400">
            {formatSize(photo.file_size)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {photo.url && (
            <a
              href={photo.url}
              download={photo.filename}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Download full resolution photo"
            >
              <Download className="w-5 h-5" />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-900/80 hover:text-rose-200 text-slate-200 transition-colors"
            title="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        {hasPrev && onPrev && (
          <button
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white shadow-xl transition-transform hover:scale-110 z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <img
          src={photo.url || ''}
          alt={photo.filename}
          className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-all"
        />

        {hasNext && onNext && (
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white shadow-xl transition-transform hover:scale-110 z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Metadata Bar */}
      <div className="px-6 py-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-slate-300 text-xs flex flex-wrap items-center justify-center gap-6">
        {photo.uploader_name && (
          <div className="flex items-center space-x-1.5">
            <User className="w-4 h-4 text-indigo-400" />
            <span>Photographer: {photo.uploader_name}</span>
          </div>
        )}
        <div className="flex items-center space-x-1.5">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Uploaded: {formatDate(photo.created_at)}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <HardDrive className="w-4 h-4 text-slate-400" />
          <span>Type: {photo.mime_type || 'image/jpeg'}</span>
        </div>
      </div>
    </div>
  );
};
