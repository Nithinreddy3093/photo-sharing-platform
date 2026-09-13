import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Camera,
  Users,
  Layers,
  Upload,
  CheckSquare,
  Square,
  Trash2,
  Eye,
  Lock,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Plus,
  AlertCircle,
  Filter,
  Calendar,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Event, Photo, EventMember, Gallery, UserProfile } from '../types/index';
import { PhotoLightbox } from './PhotoLightbox';
import { PhotoUploadModal } from './PhotoUploadModal';

interface EventDetailProps {
  eventId: string;
  currentUser: UserProfile;
  onBack: () => void;
  onOpenCustomerGallery: (slug: string) => void;
}

export const EventDetail: React.FC<EventDetailProps> = ({
  eventId,
  currentUser,
  onBack,
  onOpenCustomerGallery,
}) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<'photos' | 'gallery' | 'team'>('photos');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());

  // Gallery form state
  const [gallerySlug, setGallerySlug] = useState('');
  const [galleryPin, setGalleryPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [galleryStatus, setGalleryStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

  // Modals & UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploaderFilter, setUploaderFilter] = useState<string>('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [assigneeEmail, setAssigneeEmail] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN';

  useEffect(() => {
    loadAllData();
  }, [eventId]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [evtData, membersData, galleryData] = await Promise.all([
        api.getEventById(eventId),
        api.getEventMembers(eventId),
        isAdmin ? api.getEventGallery(eventId).catch(() => ({ gallery: null, selectedPhotoIds: [] })) : Promise.resolve({ gallery: null, selectedPhotoIds: [] }),
      ]);

      setEvent(evtData);
      setMembers(membersData);

      if (galleryData.gallery) {
        setGallery(galleryData.gallery);
        setGallerySlug(galleryData.gallery.slug);
        setGalleryStatus(galleryData.gallery.status);
        setSelectedPhotoIds(new Set(galleryData.selectedPhotoIds || []));
      } else {
        // Generate a clean default slug
        const defaultSlug = evtData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40);
        setGallerySlug(defaultSlug || `event-${eventId.slice(0, 8)}`);
        setGalleryPin('1234');
      }

      if (isAdmin) {
        try {
          const users = await api.getAllUsers();
          // Include registered users other than current admin
          setAllUsers(
            users.filter(
              (u) =>
                u.id !== currentUser.id &&
                (!currentUser.auth_user_id || u.auth_user_id !== currentUser.auth_user_id) &&
                u.email?.toLowerCase() !== currentUser.email?.toLowerCase()
            )
          );
        } catch (uErr) {
          console.warn('Could not fetch all users:', uErr);
        }
      }

      // Load photos
      await loadPhotos();
    } catch (err: any) {
      setError(err.message || 'Failed to load event information.');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async (uploaderId?: string) => {
    try {
      const effectiveUploader = uploaderId === 'ALL' ? undefined : uploaderId;
      const photosData = await api.getEventPhotos(eventId, effectiveUploader);
      setPhotos(photosData);

      // Re-sync selected photos state
      const initialSelected = new Set(photosData.filter((p) => p.is_selected).map((p) => p.id));
      if (initialSelected.size > 0) {
        setSelectedPhotoIds(initialSelected);
      }
    } catch (err: any) {
      console.error('Error loading photos:', err);
    }
  };

  const handleFilterChange = (val: string) => {
    setUploaderFilter(val);
    loadPhotos(val);
  };

  const toggleSelectPhoto = (photoId: string) => {
    if (!isAdmin) return;
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const selectAllPhotos = () => {
    if (!isAdmin) return;
    const allIds = new Set(photos.map((p) => p.id));
    setSelectedPhotoIds(allIds);
  };

  const deselectAllPhotos = () => {
    if (!isAdmin) return;
    setSelectedPhotoIds(new Set());
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm('Are you sure you want to delete this photograph?')) return;
    try {
      await api.deletePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setSelectedPhotoIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
      setSuccessMsg('Photograph removed successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete photo');
    }
  };

  const handleAssignMember = async () => {
    if (!selectedAssignee && !assigneeEmail.trim()) return;
    setIsAssigning(true);
    setError(null);
    try {
      if (selectedAssignee) {
        const newMember = await api.addEventMember(eventId, selectedAssignee);
        setMembers((prev) => {
          if (prev.some((m) => m.user_id === newMember.user_id)) return prev;
          return [...prev, newMember];
        });
        setSelectedAssignee('');
        setSuccessMsg('Photographer assigned to event!');
      } else if (assigneeEmail.trim()) {
        const res = await api.inviteMember({
          email: assigneeEmail.trim(),
          eventId,
        });
        if (res.assignment) {
          const assignment = res.assignment;
          setMembers((prev) => {
            if (prev.some((m) => m.user_id === assignment.user_id)) return prev;
            return [...prev, assignment];
          });
        }
        setAssigneeEmail('');
        setSuccessMsg(`User ${res.user.name || res.user.email} assigned to event!`);
        // Refresh users list
        api.getAllUsers().then((updated) => {
          setAllUsers(
            updated.filter(
              (u) =>
                u.id !== currentUser.id &&
                (!currentUser.auth_user_id || u.auth_user_id !== currentUser.auth_user_id) &&
                u.email?.toLowerCase() !== currentUser.email?.toLowerCase()
            )
          );
        }).catch(() => {});
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to assign photographer');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Remove this photographer from the event?')) return;
    try {
      await api.removeEventMember(eventId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      setSuccessMsg('Photographer removed from event.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to remove photographer');
    }
  };

  const handleSaveGallery = async (publishNow = false) => {
    if (!gallerySlug.trim()) {
      setError('Please provide a gallery slug');
      return;
    }
    if (!galleryPin.trim() && !gallery) {
      setError('Please set a gallery access PIN');
      return;
    }

    setSavingGallery(true);
    setError(null);

    try {
      const statusToSet = publishNow ? 'PUBLISHED' : galleryStatus;

      const res = await api.saveGallery({
        eventId,
        slug: gallerySlug.trim(),
        pin: galleryPin.trim() || '1234',
        status: statusToSet,
        selectedPhotoIds: Array.from(selectedPhotoIds),
      });

      setGallery(res.gallery);
      setGalleryStatus(res.gallery.status);
      setSuccessMsg(publishNow ? 'Gallery published to customers!' : 'Gallery settings saved successfully');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to save gallery');
    } finally {
      setSavingGallery(false);
    }
  };

  const copyCustomerLink = () => {
    const origin = window.location.origin;
    const url = `${origin}/gallery/${gallerySlug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setGalleryPin(pin);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500">Loading event details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-rose-500 font-semibold">Event not found or access denied.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700"
        >
          Return to Events
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center space-x-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photos</span>
          </button>

          {isAdmin && gallery?.status === 'PUBLISHED' && (
            <button
              onClick={() => onOpenCustomerGallery(gallery.slug)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Preview Customer View</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start space-x-2">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Event Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
                Photography Event
              </span>
              {gallery?.status === 'PUBLISHED' ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                  Gallery Published
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Gallery Draft
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {event.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {event.description || 'No description provided.'}
            </p>
          </div>

          <div className="flex items-center space-x-6 text-xs text-slate-600 dark:text-slate-400 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-6">
            <div>
              <span className="block font-bold text-lg text-slate-900 dark:text-white">
                {photos.length}
              </span>
              <span>Total Photos</span>
            </div>
            <div>
              <span className="block font-bold text-lg text-indigo-600 dark:text-indigo-400">
                {selectedPhotoIds.size}
              </span>
              <span>Selected for Gallery</span>
            </div>
            <div>
              <span className="block font-bold text-lg text-slate-900 dark:text-white">
                {members.length}
              </span>
              <span>Photographers</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mt-6 -mb-6">
          <button
            onClick={() => setActiveTab('photos')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'photos'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Photos & Curation ({photos.length})</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('gallery')}
                className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
                  activeTab === 'gallery'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Gallery & Customer PIN</span>
              </button>

              <button
                onClick={() => setActiveTab('team')}
                className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
                  activeTab === 'team'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Team Photographers ({members.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PHOTOS & CURATION */}
      {/* ========================================================================= */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              {/* Filter by uploader */}
              {isAdmin && (
                <div className="flex items-center space-x-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-500">Filter by uploader:</span>
                  <select
                    value={uploaderFilter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="py-1 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="ALL">All Photographers ({photos.length})</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selection Summary */}
              {isAdmin && (
                <div className="text-slate-500 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedPhotoIds.size}
                  </span>{' '}
                  of {photos.length} selected for customer gallery
                </div>
              )}
            </div>

            {/* Quick Select Buttons for Admin */}
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAllPhotos}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllPhotos}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                >
                  Deselect All
                </button>
              </div>
            )}
          </div>

          {/* Photo Grid */}
          {photos.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <Camera className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                No photographs found for this event
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {isAdmin
                  ? 'Assign team members to upload photos, or upload your own photography directly.'
                  : 'You have not uploaded any photographs to this assigned event yet.'}
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow transition-colors"
              >
                Upload First Photos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {photos.map((photo, idx) => {
                const isSelected = selectedPhotoIds.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    className={`relative rounded-xl overflow-hidden group border transition-all duration-200 bg-slate-100 dark:bg-slate-950 ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-500/40 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div
                      onClick={() => setActiveLightboxIndex(idx)}
                      className="aspect-square w-full cursor-pointer overflow-hidden bg-slate-900 flex items-center justify-center"
                    >
                      <img
                        src={photo.url}
                        alt={photo.filename}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Admin Selection Checkbox Badge */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectPhoto(photo.id);
                        }}
                        className={`absolute top-2 left-2 p-1 rounded-lg backdrop-blur-md transition-all shadow ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-black/50 text-white/80 hover:bg-black/80 hover:text-white'
                        }`}
                        title={isSelected ? 'Remove from customer gallery' : 'Include in customer gallery'}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Zoom / Lightbox Trigger */}
                    <button
                      type="button"
                      onClick={() => setActiveLightboxIndex(idx)}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Inspect full resolution"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Footer Info */}
                    <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {photo.filename}
                      </p>
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mt-1">
                        <span className="truncate">{photo.uploader_name || 'Staff'}</span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="text-slate-400 hover:text-rose-500 p-0.5"
                            title="Delete photo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GALLERY & CUSTOMER PIN (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'gallery' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form: Gallery Settings */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Customer Gallery Configuration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate the unique shareable link and set the access PIN for customers.
              </p>
            </div>

            {/* Shareable Slug */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Unique Shareable URL Slug
              </label>
              <div className="flex rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                <span className="px-3 py-2 bg-slate-100 dark:bg-slate-950 text-slate-500 text-xs font-mono flex items-center border-r border-slate-300 dark:border-slate-700">
                  /gallery/
                </span>
                <input
                  type="text"
                  required
                  value={gallerySlug}
                  onChange={(e) =>
                    setGallerySlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '')
                    )
                  }
                  placeholder="event-slug-name"
                  className="flex-1 px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white font-mono focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Only lowercase alphanumeric characters, dashes, and underscores.
              </p>
            </div>

            {/* Gallery PIN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Gallery Access PIN
                </label>
                <button
                  type="button"
                  onClick={generateRandomPin}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate Random PIN</span>
                </button>
              </div>

              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPin ? 'text' : 'password'}
                  value={galleryPin}
                  onChange={(e) => setGalleryPin(e.target.value)}
                  placeholder={gallery ? 'Enter new PIN to update (or leave blank to keep)' : 'Enter 4-8 digit PIN'}
                  className="w-full pl-9 pr-20 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  {showPin ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                PIN is hashed on the server using bcrypt. Never stored in plaintext.
              </p>
            </div>

            {/* Photo Selection Review */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Curation Status
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Customers will see strictly the {selectedPhotoIds.size} selected photographs.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Modify Selection →
              </button>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                disabled={savingGallery}
                onClick={() => handleSaveGallery(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Save Draft
              </button>

              <button
                type="button"
                disabled={savingGallery || selectedPhotoIds.size === 0}
                onClick={() => handleSaveGallery(true)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors disabled:opacity-50 flex items-center space-x-1.5"
              >
                <span>Publish Gallery to Customers</span>
              </button>
            </div>
          </div>

          {/* Right Card: Shareable Preview */}
          <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 p-6 rounded-2xl border border-indigo-900/50 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold mb-2">
                <Globe className="w-4 h-4" />
                <span>Customer Link Preview</span>
              </div>

              <h4 className="text-lg font-bold text-white tracking-tight">
                {event.name}
              </h4>

              <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                  Shareable URL
                </div>
                <div className="font-mono text-xs text-indigo-300 break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/gallery/${gallerySlug}` : `/gallery/${gallerySlug}`}
                </div>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">Access PIN</div>
                  <div className="font-mono text-sm font-bold text-amber-400">
                    {galleryPin || '••••'}
                  </div>
                </div>
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={copyCustomerLink}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Shareable Link</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onOpenCustomerGallery(gallerySlug)}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors flex items-center justify-center space-x-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Customer Experience</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TEAM PHOTOGRAPHERS (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'team' && isAdmin && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Assigned Team Photographers
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Photographers assigned to this event can upload photographs and view their own uploads.
              </p>
            </div>

            {/* Assign Member Form */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {allUsers.filter((u) => !members.some((m) => m.user_id === u.id)).length > 0 ? (
                <select
                  value={selectedAssignee}
                  onChange={(e) => {
                    setSelectedAssignee(e.target.value);
                    if (e.target.value) setAssigneeEmail('');
                  }}
                  className="py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">Choose registered user...</option>
                  {allUsers
                    .filter((u) => !members.some((m) => m.user_id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              ) : null}

              <div className="flex items-center space-x-2">
                <input
                  type="email"
                  value={assigneeEmail}
                  onChange={(e) => {
                    setAssigneeEmail(e.target.value);
                    if (e.target.value) setSelectedAssignee('');
                  }}
                  placeholder="Or enter email (e.g. member@gmail.com)"
                  className="py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none placeholder-slate-400 w-full sm:w-64"
                />

                <button
                  type="button"
                  onClick={handleAssignMember}
                  disabled={isAssigning || (!selectedAssignee && !assigneeEmail.trim())}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow disabled:opacity-40 transition-colors flex items-center space-x-1 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAssigning ? 'Assigning...' : 'Assign'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {members.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No photographers assigned to this event yet.
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 flex items-center justify-between bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs">
                      {member.user_name?.slice(0, 2).toUpperCase() || 'TM'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {member.user_name}
                      </div>
                      <div className="text-[11px] text-slate-500">{member.user_email}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Photographer
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Remove photographer from event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightboxIndex !== null && photos[activeLightboxIndex] && (
        <PhotoLightbox
          photo={photos[activeLightboxIndex]}
          onClose={() => setActiveLightboxIndex(null)}
          onNext={() =>
            setActiveLightboxIndex((prev) =>
              prev !== null && prev < photos.length - 1 ? prev + 1 : prev
            )
          }
          onPrev={() =>
            setActiveLightboxIndex((prev) =>
              prev !== null && prev > 0 ? prev - 1 : prev
            )
          }
          hasNext={activeLightboxIndex < photos.length - 1}
          hasPrev={activeLightboxIndex > 0}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <PhotoUploadModal
          eventId={eventId}
          eventName={event.name}
          onClose={() => setShowUploadModal(false)}
          onSuccess={(newPhotos) => {
            setPhotos((prev) => [...newPhotos, ...prev]);
            setSuccessMsg(`Uploaded ${newPhotos.length} photographs!`);
            setTimeout(() => setSuccessMsg(null), 3500);
          }}
        />
      )}
    </div>
  );
};
