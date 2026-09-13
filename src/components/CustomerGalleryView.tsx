import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Download,
  Calendar,
  Image as ImageIcon,
  AlertCircle,
  Eye,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { PhotoLightbox } from './PhotoLightbox';

interface CustomerGalleryViewProps {
  initialSlug?: string;
  onExit?: () => void;
}

export const CustomerGalleryView: React.FC<CustomerGalleryViewProps> = ({
  initialSlug = 'summer-gala-2026-vip',
  onExit,
}) => {
  const [slug, setSlug] = useState(initialSlug);
  const [pin, setPin] = useState('');
  const [galleryInfo, setGalleryInfo] = useState<{
    id: string;
    slug: string;
    eventName: string;
    publishedAt: string | null;
  } | null>(null);
  const [galleryToken, setGalleryToken] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // Load public gallery info
  useEffect(() => {
    loadGalleryInfo(slug);
  }, [slug]);

  const loadGalleryInfo = async (gallerySlug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCustomerGalleryInfo(gallerySlug);
      setGalleryInfo(res.gallery);
    } catch (err: any) {
      setError(err.message || 'Unable to find this gallery.');
      setGalleryInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setVerifying(true);
    setError(null);

    try {
      const res = await api.verifyCustomerPin(slug, pin.trim());
      setGalleryToken(res.galleryToken);

      // Now fetch the published photographs for this gallery using the session token
      const photosRes = await api.getCustomerGalleryPhotos(slug, res.galleryToken);
      setPhotos(photosRes.photos);
    } catch (err: any) {
      setError(err.message || 'Incorrect gallery PIN. Access denied.');
    } finally {
      setVerifying(false);
    }
  };

  const handleLockGallery = () => {
    setGalleryToken(null);
    setPhotos([]);
    setPin('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Banner Navigation */}
      <div className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onExit && (
            <button
              onClick={onExit}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition-colors border border-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin / Team View</span>
            </button>
          )}

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Customer Experience
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              (No user login required)
            </span>
          </div>
        </div>

        {galleryToken && (
          <button
            onClick={handleLockGallery}
            className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/50 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Gallery</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400 font-medium">Locating customer gallery...</p>
          </div>
        ) : !galleryToken ? (
          /* ========================================================================= */
          /* STAGE 1: PIN CHALLENGE SCREEN */
          /* ========================================================================= */
          <div className="max-w-md mx-auto py-8 animate-in fade-in duration-300">
            <div className="bg-slate-900/90 rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              {/* Glow Accent */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {galleryInfo ? galleryInfo.eventName : 'Protected Photo Gallery'}
                </h1>
                <p className="text-xs text-slate-400 mt-2">
                  This photography collection is private and PIN-protected by the event lead.
                </p>
              </div>

              {/* Demo Hint Helper */}
              <div className="mb-6 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Demo Gallery PIN: </span>
                  <span className="font-mono font-bold text-amber-400">4826</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPin('4826')}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors"
                >
                  Auto Fill PIN
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Enter Gallery Access PIN
                  </label>
                  <div className="relative">
                    <KeyRound className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      autoFocus
                      required
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="e.g. 4826"
                      className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-lg tracking-widest placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Hashed securely on the server with bcrypt. 5 attempt rate-limit enforced.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={verifying || !pin}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-40 transition-all flex items-center justify-center space-x-2"
                >
                  {verifying ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Verifying PIN...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Unlock Gallery</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* STAGE 2: CURATED PUBLISHED PHOTO GALLERY */
          /* ========================================================================= */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Gallery Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>PIN Authenticated Session</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {galleryInfo?.eventName}
                </h1>
                <div className="flex items-center space-x-4 text-xs text-slate-400 mt-2">
                  <span>{photos.length} Published Photos</span>
                  <span>•</span>
                  <span>Official Event Collection</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Published & Verified</span>
                </span>
              </div>
            </div>

            {/* Photos Grid */}
            {photos.length === 0 ? (
              <div className="bg-slate-900/60 rounded-2xl p-12 text-center border border-slate-800">
                <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No published photos yet</h3>
                <p className="text-xs text-slate-500 mt-1">
                  The event admin has not selected any photos for this gallery.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    onClick={() => setActivePhotoIndex(idx)}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:shadow-indigo-500/10"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-950">
                      <img
                        src={photo.url}
                        alt={photo.filename}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <p className="text-xs font-medium text-white truncate">{photo.filename}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                        <span>Click to expand</span>
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {activePhotoIndex !== null && photos[activePhotoIndex] && (
        <PhotoLightbox
          photo={photos[activePhotoIndex]}
          onClose={() => setActivePhotoIndex(null)}
          onNext={() =>
            setActivePhotoIndex((prev) =>
              prev !== null && prev < photos.length - 1 ? prev + 1 : prev
            )
          }
          onPrev={() =>
            setActivePhotoIndex((prev) =>
              prev !== null && prev > 0 ? prev - 1 : prev
            )
          }
          hasNext={activePhotoIndex < photos.length - 1}
          hasPrev={activePhotoIndex > 0}
        />
      )}
    </div>
  );
};
