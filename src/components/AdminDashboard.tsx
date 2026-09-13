import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Camera,
  Layers,
  Users,
  Plus,
  ArrowRight,
  ExternalLink,
  Shield,
  Trash2,
  CheckCircle2,
  Database,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Event, DashboardStats, UserProfile } from '../types/index';

interface AdminDashboardProps {
  currentUser: UserProfile;
  onSelectEvent: (eventId: string) => void;
  onOpenCustomerGallery: (slug: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onSelectEvent,
  onOpenCustomerGallery,
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<{ firebaseConfigured: boolean } | null>(null);

  // New Event Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

  useEffect(() => {
    loadData();
    api.getConfigStatus().then(setConfigStatus).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsData, statsData] = await Promise.all([
        api.getEvents(),
        api.getDashboardStats(),
      ]);
      setEvents(eventsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    setCreatingEvent(true);
    try {
      const created = await api.createEvent({
        name: newEventName.trim(),
        description: newEventDesc.trim(),
      });
      setEvents((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setNewEventName('');
      setNewEventDesc('');
      onSelectEvent(created.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleDeleteEvent = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this event and all associated photos and galleries?')) return;

    try {
      await api.deleteEvent(eventId);
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <Shield className="w-4 h-4 text-violet-500" />
            <span>Lead Admin Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Studio Event Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Coordinate team photographers, curate high-res photography, and publish PIN-protected customer galleries.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Events
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.totalEvents ?? events.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active photography sessions</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Uploaded Photos
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.totalPhotos ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across all team uploads</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Curated Photos
            </span>
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.totalSelectedPhotos ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Selected for customer galleries</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Published Galleries
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats?.totalGalleries ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Live customer PIN links</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Photographers
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.totalMembers ?? 1}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active team collaborators</div>
        </div>
      </div>

      {/* Events List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Events & Photography Collections
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Showing {events.length} events
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No events created yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by creating your first photography event to assign team members and upload photos.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow transition-colors"
            >
              Create Event Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event.id)}
                className="group bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {event.name}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteEvent(e, event.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {event.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(event.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Manage Event</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Event</h3>
            <p className="text-xs text-slate-500">
              Set up a new event for team members to collaborate and upload photographs.
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Event Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="e.g. Winter Gala 2026"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Description / Client Details
                </label>
                <textarea
                  rows={3}
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="e.g. Annual charity auction and dinner photography coverage"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingEvent || !newEventName.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow disabled:opacity-40"
                >
                  {creatingEvent ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
