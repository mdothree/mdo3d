import { useState, useEffect } from 'react';
import './styles/global.css';

import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { listProfiles } from './lib/api.js';

import NavBar from './components/NavBar.jsx';
import Footer from './components/Footer.jsx';

import LoginPage from './pages/LoginPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LeadsPage from './pages/LeadsPage.jsx';
import LeadDetailPage from './pages/LeadDetailPage.jsx';
import PipelinePage from './pages/PipelinePage.jsx';
import BillingPage from './pages/BillingPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function AppContent() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [checkingProfiles, setCheckingProfiles] = useState(true);
  const [userPrefs, setUserPrefs] = useState(null);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [returnedFromStripe, setReturnedFromStripe] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [selectedLead, setSelectedLead] = useState(null);

  // Check for Stripe return URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const profileId = params.get('profile');

    if (paymentStatus === 'success' && profileId) {
      setReturnedFromStripe(profileId);
      setActiveProfileId(profileId);
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'cancelled') {
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Check if user has existing profiles
  useEffect(() => {
    if (isAuthenticated && !loading) {
      listProfiles()
        .then(data => {
          const profiles = data.profiles || [];
          const paidProfiles = profiles.filter(p => p.paid);

          if (paidProfiles.length > 0) {
            setIsOnboarded(true);
            setActiveProfileId(paidProfiles[0].id);
          }
          setCheckingProfiles(false);
        })
        .catch(err => {
          console.error('Failed to check profiles:', err);
          setCheckingProfiles(false);
        });
    } else if (!isAuthenticated && !loading) {
      setCheckingProfiles(false);
    }
  }, [isAuthenticated, loading]);

  const handleOnboardingComplete = prefs => {
    setUserPrefs(prefs);
    setIsOnboarded(true);
    if (prefs.profileId) {
      setActiveProfileId(prefs.profileId);
    }
    setPage('dashboard');
  };

  // Show loading spinner while checking auth or profiles
  if (loading || checkingProfiles) {
    return (
      <div className="ob-root">
        <div className="ob-body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--light)' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show onboarding if user hasn't completed it
  // If returned from Stripe with profile, show preferences step
  if (!isOnboarded) {
    return (
      <OnboardingPage
        onComplete={handleOnboardingComplete}
        profileId={returnedFromStripe}
      />
    );
  }

  return (
    <>
      <NavBar page={page} setPage={setPage} onLogout={logout} user={user} />
      <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          {page === 'dashboard' && <DashboardPage setPage={setPage} userPrefs={userPrefs} profileId={activeProfileId} />}
          {page === 'leads' && <LeadsPage setPage={setPage} setSelectedLead={setSelectedLead} profileId={activeProfileId} />}
          {page === 'lead-detail' && <LeadDetailPage lead={selectedLead} setPage={setPage} />}
          {page === 'pipeline' && <PipelinePage />}
          {page === 'billing' && <BillingPage userPrefs={userPrefs} setPage={setPage} />}
          {page === 'settings' && <SettingsPage userPrefs={userPrefs} setUserPrefs={setUserPrefs} />}
        </div>
        <Footer />
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
