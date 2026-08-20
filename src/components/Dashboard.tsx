import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadMaintenanceProposals, MaintenanceProposalRecord } from '../services/maintenanceProposalService';
import { getUserActivity, ActivityLog } from '../services/activityLogService';
import { profileService } from '../services/profileService';
import { userApprovalService } from '../services/userApprovalService';
import { ActiveUsers } from './ActiveUsers';
import { UserApprovalManager } from './UserApprovalManager';
import { MaintenanceProposalBrowser } from './MaintenanceProposalBrowser';
import { AdminUserCreation } from './AdminUserCreation';
import { HelpCenter } from './HelpCenter';
import { UserProfileSettings } from './UserProfileSettings';
import {
  Plus,
  Clock,
  ChevronRight,
  Activity,
  Calendar,
  Settings,
  LogOut,
  X,
  UserCheck,
  Users,
  UserPlus,
  ChevronDown,
  Wrench,
  User
} from 'lucide-react';

interface DashboardProps {
  onNavigateToMaintenance: () => void;
}

export function Dashboard({ onNavigateToMaintenance }: DashboardProps) {
  const { user, signOut } = useAuth();
  const [recentMaintenanceProposals, setRecentMaintenanceProposals] = useState<MaintenanceProposalRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);
  const [showUserApprovalModal, setShowUserApprovalModal] = useState(false);
  const [showMaintenanceProposalBrowser, setShowMaintenanceProposalBrowser] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    draft: 0,
    issued: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      userApprovalService.getPendingCount().then(({ count }) => {
        setPendingApprovalsCount(count);
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSettingsMenu && !target.closest('.settings-dropdown-container')) {
        setShowSettingsMenu(false);
      }
    };

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [maintenanceResult, activityResult, profileResult] = await Promise.all([
        loadMaintenanceProposals({ userId: user.id }),
        getUserActivity(user.id, 10),
        profileService.getCurrentUserProfile()
      ]);

      if (!maintenanceResult.error && maintenanceResult.data) {
        const proposals = maintenanceResult.data;
        setRecentMaintenanceProposals(proposals.slice(0, 6));

        const now = new Date();
        const thisMonth = proposals.filter(p => {
          const created = new Date(p.created_at);
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length;

        const draft = proposals.filter(p => p.status === 'draft').length;
        const issued = proposals.filter(p => p.status === 'issued' || p.status === 'submitted').length;

        setStats({
          total: proposals.length,
          thisMonth,
          draft,
          issued
        });
      }

      if (!activityResult.error && activityResult.data) {
        setActivityLogs(activityResult.data);
      }

      if (!profileResult.error && profileResult.data) {
        setIsAdmin(profileResult.data.is_admin || false);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMaintenanceProposalFromBrowser = async (proposal: any) => {
    setShowMaintenanceProposalBrowser(false);
    sessionStorage.setItem('scs_show_maintenance', 'true');
    sessionStorage.setItem('scs_current_maintenance_id', proposal.id);
    onNavigateToMaintenance();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'issued':
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'awaiting_decision':
        return 'bg-amber-100 text-amber-800';
      case 'won':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'ISSUED';
      case 'awaiting_decision':
        return 'AWAITING';
      default:
        return status.toUpperCase();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateToMaintenance}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-sm"
              >
                <Plus className="w-5 h-5" />
                New Maintenance Proposal
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Wrench className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
            </div>
            <p className="text-sm text-gray-600 font-medium">Total Proposals</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.thisMonth}</span>
            </div>
            <p className="text-sm text-gray-600 font-medium">This Month</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.draft}</span>
            </div>
            <p className="text-sm text-gray-600 font-medium">Draft Proposals</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.issued}</span>
            </div>
            <p className="text-sm text-gray-600 font-medium">Issued Proposals</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Quick Start</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={onNavigateToMaintenance}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group"
                >
                  <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <Plus className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">New Maintenance</p>
                    <p className="text-sm text-gray-600">Create maintenance proposal</p>
                  </div>
                </button>

                <button
                  onClick={() => setShowProfileSettings(true)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                >
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">My Profile</p>
                    <p className="text-sm text-gray-600">Settings & signature</p>
                  </div>
                </button>

                {isAdmin && (
                  <div className="relative settings-dropdown-container">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSettingsMenu(!showSettingsMenu);
                      }}
                      className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-500 hover:bg-gray-50 transition-all group w-full"
                    >
                      <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                        <Settings className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-gray-900">Settings</p>
                        <p className="text-sm text-gray-600">Admin settings</p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${showSettingsMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showSettingsMenu && (
                      <div className="absolute left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-2xl z-10">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActiveUsersModal(true);
                              setShowSettingsMenu(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                          >
                            <Users className="w-5 h-5 text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-900">Active Users</p>
                              <p className="text-xs text-gray-500">View online users</p>
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowUserApprovalModal(true);
                              setShowSettingsMenu(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors relative"
                          >
                            <UserCheck className="w-5 h-5 text-gray-600" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">User Approvals</p>
                              <p className="text-xs text-gray-500">Manage user access</p>
                            </div>
                            {pendingApprovalsCount > 0 && (
                              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-600 rounded-full">
                                {pendingApprovalsCount}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCreateUserModal(true);
                              setShowSettingsMenu(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                          >
                            <UserPlus className="w-5 h-5 text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-900">Create User</p>
                              <p className="text-xs text-gray-500">Add new user account</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={signOut}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group"
                >
                  <div className="p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <LogOut className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Sign Out</p>
                    <p className="text-sm text-gray-600">End your session</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Maintenance Proposals</h2>
                <button
                  onClick={() => setShowMaintenanceProposalBrowser(true)}
                  className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {recentMaintenanceProposals.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">No maintenance proposals yet</p>
                  <button
                    onClick={onNavigateToMaintenance}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Proposal
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMaintenanceProposals.map((proposal) => (
                    <button
                      key={proposal.id}
                      onClick={() => handleLoadMaintenanceProposalFromBrowser(proposal)}
                      className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${
                          proposal.status === 'issued' || proposal.status === 'submitted'
                            ? 'bg-green-100'
                            : 'bg-gray-100'
                        }`}>
                          <Wrench className={`w-5 h-5 ${
                            proposal.status === 'issued' || proposal.status === 'submitted'
                              ? 'text-green-600'
                              : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 truncate">
                              {proposal.customer_name || 'Untitled Proposal'}
                            </p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(proposal.status || 'draft')}`}>
                              {getStatusLabel(proposal.status || 'draft')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-gray-600">
                              {proposal.project || 'No project'}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {proposal.job_number}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-600 font-medium">
                            {formatDateTime(proposal.updated_at)}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              </div>

              {activityLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activityLogs.map((activity) => (
                    <div key={activity.id} className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.action === 'created' ? 'bg-green-500' :
                          activity.action === 'updated' ? 'bg-blue-500' :
                          activity.action === 'deleted' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <p className="text-xs text-gray-500">{formatDateTime(activity.created_at)}</p>
                          {activity.maintenance_proposal && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500 truncate">{activity.maintenance_proposal.customer_name}</p>
                              {activity.maintenance_proposal.job_number && (
                                <>
                                  <span className="text-xs text-gray-400">•</span>
                                  <p className="text-xs text-gray-500 truncate">Job #{activity.maintenance_proposal.job_number}</p>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-xl shadow-sm p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
              <p className="text-green-100 text-sm mb-4">
                Access documentation, tutorials, and support resources.
              </p>
              <button
                onClick={() => setShowDocumentation(true)}
                className="w-full px-4 py-2 bg-white/20 text-white rounded-lg font-medium text-sm hover:bg-white/30 transition-colors"
              >
                Open Help Center
              </button>
            </div>
          </div>
        </div>
      </div>

      {showActiveUsersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Active Users</h2>
              </div>
              <button
                onClick={() => setShowActiveUsersModal(false)}
                className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <ActiveUsers />
            </div>
          </div>
        </div>
      )}

      <UserApprovalManager
        isOpen={showUserApprovalModal}
        onClose={() => {
          setShowUserApprovalModal(false);
          if (isAdmin) {
            userApprovalService.getPendingCount().then(({ count }) => {
              setPendingApprovalsCount(count);
            });
          }
        }}
      />

      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <UserPlus className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Create User</h2>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <AdminUserCreation
                onSuccess={() => {
                  setShowCreateUserModal(false);
                  setShowUserApprovalModal(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <MaintenanceProposalBrowser
        isOpen={showMaintenanceProposalBrowser}
        onClose={() => setShowMaintenanceProposalBrowser(false)}
        onLoad={handleLoadMaintenanceProposalFromBrowser}
      />

      <HelpCenter
        isOpen={showDocumentation}
        onClose={() => setShowDocumentation(false)}
      />

      {showProfileSettings && (
        <UserProfileSettings onClose={() => setShowProfileSettings(false)} />
      )}
    </div>
  );
}
