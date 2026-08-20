import React from 'react';
import { Home, LogOut, User, Save, LayoutTemplate as BookTemplate, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  showDashboard?: boolean;
  showMaintenance?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  onOpenTaskLibrary?: () => void;
  onOpenTrash?: () => void;
}

export function Header({ showDashboard = false, showMaintenance = false, onSave, isSaving = false, lastSaved = null, onOpenTaskLibrary, onOpenTrash }: HeaderProps = {}) {
  const { user, signOut } = useAuth();

  const handleBackToDashboard = () => {
    const event = new CustomEvent('backToDashboard');
    window.dispatchEvent(event);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <img
              src={`${import.meta.env.BASE_URL}scs_adim_(small).png`}
              alt="SCS Logo"
              className="h-10 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-xl font-bold scs-primary">
                Maintenance Proposal V1.1.1
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSave && lastSaved && (
              <span className="text-xs text-gray-500 mr-1">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}

            {onSave && (
              <button
                onClick={onSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                title="Save proposal"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}

            {user && (
              <>
                <button
                  onClick={onOpenTaskLibrary}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  title="Task Library"
                >
                  <BookTemplate className="w-4 h-4" />
                  <span className="hidden sm:inline">Library</span>
                </button>

                <button
                  onClick={onOpenTrash}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                  title="Recover Deleted Items"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Trash</span>
                </button>
              </>
            )}

            {!showDashboard && (
              <button
                onClick={handleBackToDashboard}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}

            {user && (
              <>
                <div className="h-8 w-px bg-gray-300"></div>
                <NotificationCenter />
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{user.email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
