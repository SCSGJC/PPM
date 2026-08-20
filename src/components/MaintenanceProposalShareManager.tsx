import React, { useState, useEffect } from 'react';
import { X, Share2, Trash2, UserPlus, Eye, Edit3 } from 'lucide-react';
import { maintenanceProposalSharingService, ShareUser } from '../services/maintenanceProposalSharingService';
import { useToast } from '../context/ToastContext';

interface MaintenanceProposalShareManagerProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  proposalTitle: string;
}

export function MaintenanceProposalShareManager({ isOpen, onClose, proposalId, proposalTitle }: MaintenanceProposalShareManagerProps) {
  const { showToast } = useToast();
  const [shares, setShares] = useState<ShareUser[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<'read' | 'write'>('read');

  useEffect(() => {
    if (isOpen) {
      loadShares();
      loadUsers();
    }
  }, [isOpen, proposalId]);

  const loadShares = async () => {
    setLoading(true);
    const { data, error } = await maintenanceProposalSharingService.getProposalShares(proposalId);
    if (error) {
      showToast('Failed to load shares: ' + error.message, 'error');
    } else {
      setShares(data || []);
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data, error } = await maintenanceProposalSharingService.getAllUsers();
    if (error) {
      showToast('Failed to load users: ' + error.message, 'error');
    } else {
      const currentUserId = (await maintenanceProposalSharingService.getCurrentUserId()).data;
      const filteredUsers = (data || []).filter(user => user.id !== currentUserId);
      setAllUsers(filteredUsers);
    }
  };

  const handleShare = async () => {
    if (!selectedUserEmail) {
      showToast('Please select a user', 'warning');
      return;
    }

    const { data, error } = await maintenanceProposalSharingService.shareProposal(
      proposalId,
      selectedUserEmail,
      selectedPermission
    );

    if (error) {
      showToast('Failed to share proposal: ' + error.message, 'error');
    } else {
      showToast(`Proposal shared successfully with ${selectedPermission} access`, 'success');
      setShowAddUser(false);
      setSelectedUserEmail('');
      setSelectedPermission('read');
      loadShares();
    }
  };

  const handleRevoke = async (userEmail: string, userName: string) => {
    const { data, error } = await maintenanceProposalSharingService.revokeAccess(proposalId, userEmail);

    if (error) {
      showToast('Failed to revoke access: ' + error.message, 'error');
    } else {
      showToast(`Access revoked for ${userName}`, 'success');
      loadShares();
    }
  };

  const handleChangePermission = async (userEmail: string, userName: string, newPermission: 'read' | 'write') => {
    const { data, error } = await maintenanceProposalSharingService.shareProposal(
      proposalId,
      userEmail,
      newPermission
    );

    if (error) {
      showToast('Failed to update permission: ' + error.message, 'error');
    } else {
      showToast(`Permission updated for ${userName}`, 'success');
      loadShares();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Share Maintenance Proposal</h2>
            <p className="text-sm text-gray-600 mt-1">{proposalTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {!showAddUser ? (
            <button
              onClick={() => setShowAddUser(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-green-600 border border-green-700 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Share with Another User
            </button>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Share with User</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  value={selectedUserEmail}
                  onChange={(e) => setSelectedUserEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                >
                  <option value="">Choose a user to share with...</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permission Level
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedPermission('read')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                      selectedPermission === 'read'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    Read Only
                  </button>
                  <button
                    onClick={() => setSelectedPermission('write')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                      selectedPermission === 'write'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    Can Edit
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-700 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                >
                  Share
                </button>
                <button
                  onClick={() => {
                    setShowAddUser(false);
                    setSelectedUserEmail('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Users with Access ({shares.length})
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-600 mt-2">Loading shares...</p>
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">This proposal hasn't been shared yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.user_id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{share.user_name || 'Unknown User'}</div>
                      <div className="text-sm text-gray-600">{share.user_email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Shared {new Date(share.shared_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={share.permission}
                        onChange={(e) => handleChangePermission(share.user_email, share.user_name, e.target.value as 'read' | 'write')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                          share.permission === 'write'
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-gray-50 text-gray-700'
                        }`}
                      >
                        <option value="read">👁️ Read Only</option>
                        <option value="write">✏️ Can Edit</option>
                      </select>
                      <button
                        onClick={() => handleRevoke(share.user_email, share.user_name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
