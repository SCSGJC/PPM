import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Trash2, Eye, FileText, ArrowUpDown, RefreshCw, Wrench, Copy, Share2, Download, RotateCcw, Archive } from 'lucide-react';
import {
  loadMaintenanceProposals,
  deleteMaintenanceProposal,
  restoreMaintenanceProposal,
  permanentlyDeleteMaintenanceProposal,
  updateProposalStatus,
  MaintenanceProposalRecord,
  MaintenanceProposalFilters,
  duplicateMaintenanceProposal,
  createMaintenanceProposalFromTemplate,
} from '../services/maintenanceProposalService';
import { MaintenanceProposalShareManager } from './MaintenanceProposalShareManager';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getCurrentUserProfile, getAllUserProfiles, UserProfile } from '../services/profileService';
import { maintenanceProposalSharingService, ShareUser } from '../services/maintenanceProposalSharingService';
import { exportService } from '../services/exportService';

type SortOption = 'date-desc' | 'date-asc' | 'job-asc' | 'job-desc' | 'customer-asc' | 'customer-desc';

interface MaintenanceProposalBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (proposal: MaintenanceProposalRecord) => void;
}

export function MaintenanceProposalBrowser({ isOpen, onClose, onLoad }: MaintenanceProposalBrowserProps) {
  const { user } = useAuth();
  const { showToast, confirm } = useToast();
  const [proposals, setProposals] = useState<MaintenanceProposalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MaintenanceProposalFilters>({});
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showShareManager, setShowShareManager] = useState(false);
  const [selectedProposalForSharing, setSelectedProposalForSharing] = useState<MaintenanceProposalRecord | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [proposalShares, setProposalShares] = useState<Record<string, ShareUser[]>>({});
  const [viewMode, setViewMode] = useState<'active' | 'trash' | 'archived'>('active');

  useEffect(() => {
    if (isOpen && user) {
      loadProposals();
      checkAdminStatus();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen && user) {
      handleSearch();
    }
  }, [filters]);

  useEffect(() => {
    if (isOpen && user) {
      loadProposals();
    }
  }, [viewMode]);

  const checkAdminStatus = async () => {
    const { data: profile } = await getCurrentUserProfile();
    if (profile?.is_admin) {
      setIsAdmin(true);
      const { data: users } = await getAllUserProfiles();
      if (users) {
        setAllUsers(users);
      }
      // Reload so admin can see all proposals now that isAdmin is set
      loadProposals();
    }
  };

  const loadProposals = async () => {
    setLoading(true);
    try {
      const loadFilters: MaintenanceProposalFilters = {
        showDeleted: viewMode === 'trash',
        showArchived: viewMode === 'archived',
      };
      const { data, error } = await loadMaintenanceProposals(loadFilters);
      if (error) {
        showToast('Failed to load maintenance proposals: ' + error.message, 'error');
      } else {
        setProposals(data || []);
        await loadSharesForProposals(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSharesForProposals = async (proposalsList: MaintenanceProposalRecord[]) => {
    const sharesMap: Record<string, ShareUser[]> = {};
    try {
      for (const proposal of proposalsList) {
        if (proposal.user_id === user?.id || isAdmin) {
          const { data: shares, error } = await maintenanceProposalSharingService.getProposalShares(proposal.id);
          if (!error && shares && shares.length > 0) {
            sharesMap[proposal.id] = shares;
          }
        }
      }
    } catch (error) {
      console.log('Error loading shares (table may not exist yet):', error);
    }
    setProposalShares(sharesMap);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const searchFilters: MaintenanceProposalFilters = {
        ...filters,
        searchTerm: searchTerm || undefined,
        showDeleted: viewMode === 'trash',
        showArchived: viewMode === 'archived',
      };
      const { data, error } = await loadMaintenanceProposals(searchFilters);
      if (error) {
        showToast('Failed to search maintenance proposals: ' + error.message, 'error');
      } else {
        setProposals(data || []);
        await loadSharesForProposals(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, projectName: string) => {
    const confirmed = await confirm(`Move "${projectName}" to trash?\n\nYou can restore it later if needed.`);
    if (!confirmed) return;

    const { error } = await deleteMaintenanceProposal(id);
    if (error) {
      showToast('Failed to move to trash: ' + error.message, 'error');
    } else {
      setProposals(proposals.filter((p) => p.id !== id));
      showToast('Moved to trash successfully', 'success');
    }
  };

  const handleRestore = async (id: string, projectName: string) => {
    const confirmed = await confirm(`Restore "${projectName}" from trash?`);
    if (!confirmed) return;

    const { error } = await restoreMaintenanceProposal(id);
    if (error) {
      showToast('Failed to restore: ' + error.message, 'error');
    } else {
      setProposals(proposals.filter((p) => p.id !== id));
      showToast('Restored successfully', 'success');
    }
  };

  const handlePermanentDelete = async (id: string, projectName: string) => {
    const firstConfirm = await confirm(`Permanently delete "${projectName}"?\n\nThis cannot be undone.`);
    if (!firstConfirm) return;

    const secondConfirm = await confirm(
      `⚠️ FINAL WARNING ⚠️\n\nAre you absolutely sure you want to permanently delete "${projectName}"?\n\nThis action is IRREVERSIBLE and all data will be lost forever.`
    );
    if (!secondConfirm) return;

    const { error } = await permanentlyDeleteMaintenanceProposal(id);
    if (error) {
      showToast('Failed to permanently delete: ' + error.message, 'error');
    } else {
      setProposals(proposals.filter((p) => p.id !== id));
      showToast('Permanently deleted', 'success');
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'issued' | 'won' | 'lost', projectName: string) => {
    const { data, error } = await updateProposalStatus(id, newStatus);
    if (error) {
      showToast('Failed to update status: ' + error.message, 'error');
    } else {
      setProposals(proposals.map(p => p.id === id ? { ...p, proposal_status: newStatus } : p));
      showToast(`Marked "${projectName}" as ${newStatus}`, 'success');
    }
  };

  const handleLoadProposal = async (proposal: MaintenanceProposalRecord) => {
    const projectName = proposal.project || 'Untitled Project';
    const confirmed = await confirm(`Load maintenance proposal "${projectName}"?\n\nYour current work will be replaced.`);
    if (confirmed) {
      onLoad(proposal);
      onClose();
      window.scrollTo(0, 0);
    }
  };

  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [proposalToDuplicate, setProposalToDuplicate] = useState<MaintenanceProposalRecord | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  const handleDuplicate = async (proposal: MaintenanceProposalRecord) => {
    const originalName = proposal.project || 'Untitled Project';
    setProposalToDuplicate(proposal);
    setDuplicateName(`${originalName} (Copy)`);
    setShowDuplicateDialog(true);
  };

  const executeDuplicate = async () => {
    if (!proposalToDuplicate || !duplicateName.trim()) {
      showToast('Please enter a name for the duplicated proposal', 'error');
      return;
    }

    const { data, error } = await duplicateMaintenanceProposal(proposalToDuplicate.id, duplicateName);
    if (error) {
      showToast('Failed to duplicate proposal: ' + error.message, 'error');
    } else if (data) {
      showToast('Proposal duplicated successfully!', 'success');
      setShowDuplicateDialog(false);
      setProposalToDuplicate(null);
      setDuplicateName('');
      loadProposals();

      const openDuplicate = await confirm('Proposal duplicated! Would you like to open it now?');
      if (openDuplicate && data) {
        onLoad(data);
        onClose();
      }
    }
  };

  const handleUseAsTemplate = async (proposal: MaintenanceProposalRecord) => {
    const originalName = proposal.project || 'Untitled Project';
    const newName = prompt(`Enter a name for the new proposal from template:`, `New Project`);

    if (!newName) return;

    const { data, error } = await createMaintenanceProposalFromTemplate(proposal.id, newName);
    if (error) {
      showToast('Failed to create from template: ' + error.message, 'error');
    } else if (data) {
      showToast('Proposal created from template successfully!', 'success');
      loadProposals();
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'issued':
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    // Normalize 'submitted' to 'issued' for display
    if (status === 'submitted') return 'ISSUED';
    return status.toUpperCase();
  };

  const sortProposals = (proposalsToSort: MaintenanceProposalRecord[]): MaintenanceProposalRecord[] => {
    const sorted = [...proposalsToSort];

    switch (sortBy) {
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        break;
      case 'job-asc':
        sorted.sort((a, b) => (a.job_number || '').localeCompare(b.job_number || ''));
        break;
      case 'job-desc':
        sorted.sort((a, b) => (b.job_number || '').localeCompare(a.job_number || ''));
        break;
      case 'customer-asc':
        sorted.sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''));
        break;
      case 'customer-desc':
        sorted.sort((a, b) => (b.customer_name || '').localeCompare(a.customer_name || ''));
        break;
    }

    return sorted;
  };

  const sortedProposals = sortProposals(proposals);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isAdmin ? 'All Maintenance Proposals' : 'My Maintenance Proposals'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{sortedProposals.length} proposals found</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportService.exportToCSV(sortedProposals)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={loadProposals}
              disabled={loading}
              className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh proposals"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setViewMode('active')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Active
            </button>
            <button
              onClick={() => setViewMode('trash')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'trash'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Trash
            </button>
            <button
              onClick={() => setViewMode('archived')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === 'archived'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Archive className="w-4 h-4 inline mr-2" />
              Archived
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by customer, project, or job number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="pl-9 pr-8 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem',
                }}
              >
                <option value="date-desc">Date (Newest)</option>
                <option value="date-asc">Date (Oldest)</option>
                <option value="job-asc">Job # (A-Z)</option>
                <option value="job-desc">Job # (Z-A)</option>
                <option value="customer-asc">Customer (A-Z)</option>
                <option value="customer-desc">Customer (Z-A)</option>
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Issued</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Proposal Status</label>
                <select
                  value={filters.proposalStatus || ''}
                  onChange={(e) => setFilters({ ...filters, proposalStatus: e.target.value as any || undefined })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="draft">Draft</option>
                  <option value="issued">Issued</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
                <input
                  type="text"
                  value={filters.customer || ''}
                  onChange={(e) => setFilters({ ...filters, customer: e.target.value || undefined })}
                  placeholder="Filter by customer..."
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Prepared By</label>
                {isAdmin ? (
                  <select
                    value={filters.preparedBy || ''}
                    onChange={(e) => setFilters({ ...filters, preparedBy: e.target.value || undefined })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {allUsers
                      .sort((a, b) => {
                        const nameA = (a.full_name || a.email).toLowerCase();
                        const nameB = (b.full_name || b.email).toLowerCase();
                        return nameA.localeCompare(nameB);
                      })
                      .map((user) => (
                        <option key={user.id} value={user.email}>
                          {user.full_name || user.email}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={filters.preparedBy || ''}
                    onChange={(e) => setFilters({ ...filters, preparedBy: e.target.value || undefined })}
                    placeholder="Filter by preparer..."
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading maintenance proposals...</p>
            </div>
          ) : sortedProposals.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No maintenance proposals found</p>
              <p className="text-sm text-gray-500 mt-1">Create your first maintenance proposal to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {proposal.project || 'Untitled Project'}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(proposal.status)}`}>
                          {getStatusLabel(proposal.status)}
                        </span>
                        {proposal.version > 1 && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Version {proposal.version}
                          </span>
                        )}
                        {proposal.contract_period && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {proposal.contract_period} months
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-500">Customer:</span>{' '}
                          <span className="text-gray-900">{proposal.customer_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Job #:</span>{' '}
                          <span className="text-gray-900">{proposal.job_number || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Site:</span>{' '}
                          <span className="text-gray-900">{proposal.site || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Prepared By:</span>{' '}
                          <span className="text-gray-900">{proposal.prepared_by || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Updated:</span>{' '}
                          <span className="text-gray-900">{formatDate(proposal.updated_at)}</span>
                        </div>
                        {isAdmin && proposal.user_id !== user?.id && (
                          <div>
                            <span className="text-gray-500">Owner:</span>{' '}
                            <span className="text-gray-900 font-medium">
                              {allUsers.find(u => u.id === proposal.user_id)?.full_name ||
                               allUsers.find(u => u.id === proposal.user_id)?.email ||
                               'Unknown User'}
                            </span>
                          </div>
                        )}
                        {viewMode === 'active' && (proposal.user_id === user?.id || isAdmin) && (
                          <div>
                            <span className="text-gray-500">Proposal Status:</span>{' '}
                            <select
                              value={proposal.proposal_status || 'draft'}
                              onChange={(e) => handleStatusChange(proposal.id, e.target.value as any, proposal.project || 'Untitled Project')}
                              className="text-sm border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="draft">Draft</option>
                              <option value="issued">Issued</option>
                              <option value="won">Won</option>
                              <option value="lost">Lost</option>
                            </select>
                          </div>
                        )}
                      </div>
                      {proposalShares[proposal.id] && proposalShares[proposal.id].length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1.5">
                            {proposalShares[proposal.id].map((share, index) => (
                              <div
                                key={index}
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-sky-50 border border-sky-200 rounded text-xs"
                              >
                                <Share2 className="w-3 h-3 text-sky-600" />
                                <span className="text-gray-900 font-medium">
                                  {share.user_name || share.user_email}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  share.permission === 'write'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {share.permission === 'write' ? 'EDIT' : 'READ'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {viewMode === 'trash' ? (
                        <>
                          {(proposal.user_id === user?.id || isAdmin) && (
                            <>
                              <button
                                onClick={() => handleRestore(proposal.id, proposal.project || 'Untitled Project')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Restore from trash"
                              >
                                <RotateCcw className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handlePermanentDelete(proposal.id, proposal.project || 'Untitled Project')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Permanently delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {proposal.user_id === user?.id && (
                            <button
                              onClick={() => {
                                setSelectedProposalForSharing(proposal);
                                setShowShareManager(true);
                              }}
                              className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                              title="Share proposal"
                            >
                              <Share2 className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDuplicate(proposal)}
                            className="p-2 text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all shadow-md hover:shadow-lg"
                            title="Duplicate proposal"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleUseAsTemplate(proposal)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Use as template (clears project details)"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleLoadProposal(proposal)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Load proposal"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {(proposal.user_id === user?.id || isAdmin) && (
                            <button
                              onClick={() => handleDelete(proposal.id, proposal.project || 'Untitled Project')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Move to trash"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
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
      </div>

      {showShareManager && selectedProposalForSharing && (
        <MaintenanceProposalShareManager
          isOpen={showShareManager}
          onClose={() => {
            setShowShareManager(false);
            setSelectedProposalForSharing(null);
            loadProposals();
          }}
          proposalId={selectedProposalForSharing.id}
          proposalTitle={selectedProposalForSharing.project || 'Untitled Project'}
        />
      )}

      {showDuplicateDialog && proposalToDuplicate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Duplicate Proposal
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Create a copy of "{proposalToDuplicate.project || 'Untitled Project'}"
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Proposal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={duplicateName}
                  onChange={(e) => setDuplicateName(e.target.value)}
                  placeholder="Enter name for duplicate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      executeDuplicate();
                    } else if (e.key === 'Escape') {
                      setShowDuplicateDialog(false);
                      setProposalToDuplicate(null);
                    }
                  }}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>What will be copied:</strong> All tasks, rates, settings, and proposal structure
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDuplicateDialog(false);
                  setProposalToDuplicate(null);
                  setDuplicateName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDuplicate}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors shadow-md"
              >
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
