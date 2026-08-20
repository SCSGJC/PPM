import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { MaintenanceProposal } from './components/MaintenanceProposal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { ToastProvider, useToast } from './context/ToastContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { ResetPassword } from './components/ResetPassword';
import { userApprovalService } from './services/userApprovalService';
import { DailyBackupService } from './services/dailyBackupService';
import TaskLibrary from './components/TaskLibrary';
import { TrashRecovery } from './components/TrashRecovery';
import './utils/tooltipPositioning';
import './App.css';

function MainContent() {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();

  const [showDashboard, setShowDashboard] = useState(true);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showTaskLibrary, setShowTaskLibrary] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    const handleBackToDashboard = () => {
      sessionStorage.removeItem('scs_show_maintenance');
      sessionStorage.removeItem('scs_current_maintenance_id');
      setShowDashboard(true);
      setShowMaintenance(false);
      setIsSaving(false);
      setLastSaved(null);
    };

    const handleMaintenanceSaveState = (event: any) => {
      const { isSaving: saving, lastSaved: saved } = event.detail;
      setIsSaving(saving);
      setLastSaved(saved);
    };

    window.addEventListener('backToDashboard', handleBackToDashboard);
    window.addEventListener('maintenanceSaveState', handleMaintenanceSaveState);

    return () => {
      window.removeEventListener('backToDashboard', handleBackToDashboard);
      window.removeEventListener('maintenanceSaveState', handleMaintenanceSaveState);
    };
  }, []);

  const hasInitialized = React.useRef(false);

  useEffect(() => {
    if (!user || hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const isFreshLogin = sessionStorage.getItem('scs_fresh_login') === 'true';

    if (isFreshLogin) {
      sessionStorage.removeItem('scs_fresh_login');
      sessionStorage.removeItem('scs_show_maintenance');
      sessionStorage.removeItem('scs_current_maintenance_id');
      setShowDashboard(true);
      setShowMaintenance(false);
      console.log('Fresh login detected - showing dashboard');
    } else {
      const shouldShowMaintenance = sessionStorage.getItem('scs_show_maintenance') === 'true';
      const hasMaintenanceId = sessionStorage.getItem('scs_current_maintenance_id');

      // Only show maintenance if both the flag is set AND there's a valid ID
      if (shouldShowMaintenance && hasMaintenanceId) {
        setShowDashboard(false);
        setShowMaintenance(true);
      } else {
        // Clear stale session data if flag is set but no ID
        sessionStorage.removeItem('scs_show_maintenance');
        sessionStorage.removeItem('scs_current_maintenance_id');
        setShowDashboard(true);
        setShowMaintenance(false);
      }
      console.log('Session restored - showDashboard:', !shouldShowMaintenance || !hasMaintenanceId);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    DailyBackupService.initializeDailyBackup((message) => {
      showToast(message, 'success');
    });
  }, [user, showToast]);

  const handleNavigateToMaintenance = () => {
    sessionStorage.setItem('scs_show_maintenance', 'true');
    setShowDashboard(false);
    setShowMaintenance(true);
  };

  const handleNavigateToDashboard = () => {
    sessionStorage.removeItem('scs_show_maintenance');
    sessionStorage.removeItem('scs_current_maintenance_id');
    setShowDashboard(true);
    setShowMaintenance(false);
  };

  const handleMaintenanceSave = () => {
    window.dispatchEvent(new Event('triggerMaintenanceSave'));
  };

  const handleOpenTaskLibrary = () => {
    setShowTaskLibrary(true);
  };

  const handleTaskLibraryClose = () => {
    setShowTaskLibrary(false);
  };

  const handleSelectTasks = (tasks: any[]) => {
    window.dispatchEvent(new CustomEvent('addTasksFromLibrary', { detail: tasks }));
    setShowTaskLibrary(false);
  };

  const handleOpenTrash = () => {
    setShowTrash(true);
  };

  const handleTrashClose = () => {
    setShowTrash(false);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Header
          showDashboard={showDashboard}
          showMaintenance={showMaintenance}
          onSave={showMaintenance ? handleMaintenanceSave : undefined}
          isSaving={isSaving}
          lastSaved={lastSaved}
          onOpenTaskLibrary={handleOpenTaskLibrary}
          onOpenTrash={handleOpenTrash}
        />
        {showDashboard ? (
          <Dashboard onNavigateToMaintenance={handleNavigateToMaintenance} />
        ) : showMaintenance ? (
          <MaintenanceProposal
            isOpen={showMaintenance}
            onClose={handleNavigateToDashboard}
          />
        ) : null}
      </div>

      {showTaskLibrary && (
        <TaskLibrary
          onClose={handleTaskLibraryClose}
          onSelectTasks={handleSelectTasks}
        />
      )}

      {showTrash && (
        <TrashRecovery
          onClose={handleTrashClose}
          onRecover={() => {
            window.dispatchEvent(new Event('proposalRecovered'));
          }}
        />
      )}

      <ToastContainer />
    </>
  );
}

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
      setCheckingApproval(false);
    } else {
      setShowAuthModal(false);
    }
  }, [user, loading]);

  useEffect(() => {
    const checkApproval = async () => {
      if (!user) {
        setCheckingApproval(false);
        return;
      }

      setCheckingApproval(true);
      const { approved, error } = await userApprovalService.checkUserApprovalStatus();

      if (error) {
        console.error('Error checking approval:', error);
        setIsApproved(false);
      } else {
        setIsApproved(approved);
      }

      setCheckingApproval(false);
    };

    checkApproval();
  }, [user]);

  if (loading || checkingApproval) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-8 flex flex-col items-center">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={`${import.meta.env.BASE_URL}scs_adim_(small).png`}
                  alt="SCS Logo"
                  className="h-20 w-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="text-left">
                  <h1 className="text-3xl font-bold scs-primary">Maintenance Proposal Software</h1>
                  <p className="text-lg text-gray-600">V1.1.1</p>
                </div>
              </div>
              <p className="text-gray-500">Professional maintenance proposal management</p>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <p className="text-gray-700 mb-6">Please sign in to access the application</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white bg-green-600 border border-green-700 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => {}}
          />
        )}
      </>
    );
  }

  if (user && isApproved === false) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4 justify-center">
              <img
                src={`${import.meta.env.BASE_URL}scs_adim_(small).png`}
                alt="SCS Logo"
                className="h-20 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="text-left">
                <h1 className="text-3xl font-bold scs-primary">Maintenance Proposal Software</h1>
                <p className="text-lg text-gray-600">V1.1.1</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-amber-300">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Account Pending Approval</h2>
            <p className="text-gray-700 mb-6">
              Your account is awaiting administrator approval. You will receive access once an administrator has reviewed and approved your account.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              If you have any questions, please contact your system administrator.
            </p>
            <button
              onClick={signOut}
              className="w-full px-6 py-3 text-base font-medium text-white bg-gray-600 border border-gray-700 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <MainContent />;
}

function App() {
  const [isResetPassword, setIsResetPassword] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;

    if (path === '/reset-password' || (hash && hash.includes('type=recovery'))) {
      setIsResetPassword(true);
    }
  }, []);

  if (isResetPassword) {
    return (
      <ToastProvider>
        <AuthProvider>
          <ResetPassword />
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
