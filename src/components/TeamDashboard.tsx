import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Camera,
  Upload,
  ArrowRight,
  Users,
  ShieldAlert,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Event, UserProfile, Photo } from '../types/index.ts';
import { PhotoUploadModal } from './PhotoUploadModal.tsx';

interface TeamDashboardProps {
  currentUser: UserProfile;
  onSelectEvent: (eventId: string) => void;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({
  currentUser,
  onSelectEvent,
}) => {
  const [assignedEvents, setAssignedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUploadEvent, setActiveUploadEvent] = useState<Event | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAssignedEvents();
  }, []);

  const loadAssignedEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const events = await api.getEvents();
      setAssignedEvents(events);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned events');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950/60 p-6 sm:p-8 rounded-3xl border border-slate-800 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
            <Users className="w-4 h-4" />
            <span>Photographer Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Assigned Event Assignments
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Upload raw event photographs for Lead review and customer gallery curation.
          </p>
        </div>

        <div className="flex items-center space-x-6 text-xs text-slate-300 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
          <div>
            <span className="block font-bold text-2xl text-white">
              {assignedEvents.length}
            </span>
            <span>Assigned Events</span>
          </div>
          <div>
            <span className="block font-bold text-2xl text-sky-400">Team</span>
            <span>Role: Member</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Role Security Note */}
      <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 text-xs text-sky-800 dark:text-sky-300 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 flex-shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
        <div>
          <span className="font-semibold">Team Member Permission Boundary:</span>
          <p className="text-sky-700 dark:text-sky-400 mt-0.5">
            You have access strictly to upload and manage your own photographs for the events you are assigned to. Admin leads handle client curation, customer PIN creation, and public gallery publishing.
          </p>
        </div>
      </div>

      {/* Assigned Events List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            My Event Assignments
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {assignedEvents.length} active assignments
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading assigned events...
          </div>
        ) : assignedEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No active event assignments
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You have not been assigned to any events yet. When a Lead Admin assigns you to an event, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2 text-xs font-semibold text-sky-600 dark:text-sky-400 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Assigned Photographer</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {event.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {event.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setActiveUploadEvent(event)}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photos</span>
                  </button>

                  <button
                    onClick={() => onSelectEvent(event.id)}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {activeUploadEvent && (
        <PhotoUploadModal
          eventId={activeUploadEvent.id}
          eventName={activeUploadEvent.name}
          onClose={() => setActiveUploadEvent(null)}
          onSuccess={(uploaded) => {
            setSuccessMsg(`Successfully uploaded ${uploaded.length} photographs to ${activeUploadEvent.name}!`);
            setTimeout(() => setSuccessMsg(null), 4000);
          }}
        />
      )}
    </div>
  );
};
