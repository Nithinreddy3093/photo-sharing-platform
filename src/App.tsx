import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { TeamDashboard } from './components/TeamDashboard.tsx';
import { EventDetail } from './components/EventDetail.tsx';
import { AdminGalleriesView } from './components/AdminGalleriesView.tsx';
import { CustomerGalleryView } from './components/CustomerGalleryView.tsx';
import { UserProfile } from './types/index.ts';
import { getStoredUser, clearAuthSession, api } from './services/api.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<string>('admin_dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [customerGallerySlug, setCustomerGallerySlug] = useState<string>('summer-gala-2026-vip');

  useEffect(() => {
    // Check if path has /gallery/:slug
    const path = window.location.pathname;
    if (path.startsWith('/gallery/')) {
      const slug = path.replace('/gallery/', '').trim();
      if (slug) {
        setCustomerGallerySlug(slug);
        setActiveView('customer_gallery');
        return;
      }
    }

    // Check stored user session
    const stored = getStoredUser();
    if (stored) {
      setCurrentUser(stored);
      setActiveView(stored.role === 'ADMIN' ? 'admin_dashboard' : 'team_dashboard');
      // Validate session in background
      api.getCurrentUser()
        .then((user) => setCurrentUser(user))
        .catch(() => {
          clearAuthSession();
          setCurrentUser(null);
          setActiveView('login');
        });
    } else {
      setActiveView('login');
    }
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.role === 'ADMIN') {
      setActiveView('admin_dashboard');
    } else {
      setActiveView('team_dashboard');
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setActiveView('login');
  };

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setActiveView('event_detail');
  };

  const handleOpenCustomerGallery = (slug?: string) => {
    if (slug) {
      setCustomerGallerySlug(slug);
    }
    setActiveView('customer_gallery');
  };

  // If in customer gallery mode, show customer view with exit option back to dashboard
  if (activeView === 'customer_gallery') {
    return (
      <CustomerGalleryView
        initialSlug={customerGallerySlug}
        onExit={() => {
          if (currentUser) {
            setActiveView(currentUser.role === 'ADMIN' ? 'admin_dashboard' : 'team_dashboard');
          } else {
            setActiveView('login');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenCustomerGallery={() => handleOpenCustomerGallery()}
      />

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentUser || activeView === 'login' ? (
          <AuthModal onSuccess={handleLoginSuccess} />
        ) : activeView === 'admin_dashboard' ? (
          <AdminDashboard
            currentUser={currentUser}
            onSelectEvent={handleSelectEvent}
            onOpenCustomerGallery={handleOpenCustomerGallery}
          />
        ) : activeView === 'team_dashboard' ? (
          <TeamDashboard
            currentUser={currentUser}
            onSelectEvent={handleSelectEvent}
          />
        ) : activeView === 'event_detail' && selectedEventId ? (
          <EventDetail
            eventId={selectedEventId}
            currentUser={currentUser}
            onBack={() =>
              setActiveView(currentUser.role === 'ADMIN' ? 'admin_dashboard' : 'team_dashboard')
            }
            onOpenCustomerGallery={handleOpenCustomerGallery}
          />
        ) : activeView === 'admin_galleries' ? (
          <AdminGalleriesView
            onSelectEvent={handleSelectEvent}
            onOpenCustomerGallery={handleOpenCustomerGallery}
          />
        ) : (
          <AdminDashboard
            currentUser={currentUser}
            onSelectEvent={handleSelectEvent}
            onOpenCustomerGallery={handleOpenCustomerGallery}
          />
        )}
      </div>
    </div>
  );
}
