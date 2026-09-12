import React, { useState, useEffect } from 'react';
import { Layers, Globe, Lock, ExternalLink, Copy, Check, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.ts';
import { Gallery } from '../types/index.ts';

interface AdminGalleriesViewProps {
  onSelectEvent: (eventId: string) => void;
  onOpenCustomerGallery: (slug: string) => void;
}

export const AdminGalleriesView: React.FC<AdminGalleriesViewProps> = ({
  onSelectEvent,
  onOpenCustomerGallery,
}) => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    loadGalleries();
  }, []);

  const loadGalleries = async () => {
    setLoading(true);
    try {
      const data = await api.getAllGalleries();
      setGalleries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/gallery/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
          <Layers className="w-4 h-4" />
          <span>Customer Delivery Hub</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Client Galleries & PIN Portals
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          All client-facing galleries configured with PIN protection and published photos.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          Loading customer galleries...
        </div>
      ) : galleries.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No customer galleries created yet
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Open any event, select curated photos, and publish a gallery with a PIN to share with clients.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleries.map((gallery) => {
            const isPublished = gallery.status === 'PUBLISHED';
            return (
              <div
                key={gallery.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        isPublished
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {gallery.status}
                    </span>

                    <div className="flex items-center space-x-1 text-xs text-slate-400">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>PIN Protected</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {gallery.event_name || 'Event Gallery'}
                  </h3>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-indigo-600 dark:text-indigo-400 truncate">
                    /gallery/{gallery.slug}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => copyLink(gallery.slug)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center space-x-1"
                    >
                      {copiedSlug === gallery.slug ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied Link</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectEvent(gallery.event_id)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center space-x-1"
                    >
                      <span>Edit Curation</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {isPublished && (
                    <button
                      type="button"
                      onClick={() => onOpenCustomerGallery(gallery.slug)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                      <span>Open Customer Portal</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
