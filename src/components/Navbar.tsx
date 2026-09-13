import React, { useState, useEffect } from 'react';
import {
  Camera,
  LogOut,
  User,
  Shield,
  Users,
  Calendar,
  Layers,
  ExternalLink,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile } from '../types/index';
import { api } from '../services/api';

interface NavbarProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenCustomerGallery: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  activeView,
  setActiveView,
  onOpenCustomerGallery,
}) => {
  const [status, setStatus] = useState<{ firebaseConfigured: boolean } | null>(null);

  useEffect(() => {
    api.getConfigStatus().then(setStatus).catch(() => {});
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div
            onClick={() => setActiveView(currentUser?.role === 'ADMIN' ? 'admin_dashboard' : 'team_dashboard')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                PhotoShare
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO PLATFORM
              </span>
              <span className="hidden lg:inline-flex items-center ml-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                Firebase Connected
              </span>
            </div>
          </div>

          {/* Navigation Links for Authenticated Users */}
          {currentUser && (
            <nav className="hidden md:flex items-center space-x-1 ml-6">
              {currentUser.role === 'ADMIN' ? (
                <>
                  <button
                    onClick={() => setActiveView('admin_dashboard')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                      activeView === 'admin_dashboard'
                        ? 'bg-slate-800 text-indigo-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Events</span>
                  </button>
                  <button
                    onClick={() => setActiveView('admin_galleries')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                      activeView === 'admin_galleries'
                        ? 'bg-slate-800 text-indigo-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Galleries</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setActiveView('team_dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    activeView === 'team_dashboard'
                      ? 'bg-slate-800 text-indigo-400 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>My Assigned Events</span>
                </button>
              )}
            </nav>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-3">
          {/* Customer Gallery Quick Link */}
          <button
            onClick={onOpenCustomerGallery}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
            title="Open demo customer gallery with PIN"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Customer Gallery View</span>
            <span className="sm:hidden">Gallery</span>
          </button>

          {/* User Profile / Status */}
          {currentUser ? (
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-slate-200">{currentUser.name}</div>
                <div className="flex items-center justify-end space-x-1">
                  {currentUser.role === 'ADMIN' ? (
                    <span className="inline-flex items-center text-[10px] uppercase font-bold text-violet-300 bg-violet-950/60 px-1.5 py-0.2 rounded border border-violet-800/50">
                      <Shield className="w-2.5 h-2.5 mr-0.5 text-violet-400" />
                      Lead Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] uppercase font-bold text-sky-300 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-800/50">
                      <Users className="w-2.5 h-2.5 mr-0.5 text-sky-400" />
                      Team Member
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveView('login')}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
