import React, { useState, useEffect } from 'react';
import { X, History, FileText, Clock, DollarSign, Eye, MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getMaintenanceProposalRevisions, MaintenanceProposalRevision } from '../services/maintenanceProposalService';
import { useToast } from '../context/ToastContext';

interface MaintenanceProposalRevisionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  proposalTitle: string;
  onLoadRevision: (revision: MaintenanceProposalRevision) => void;
}

export function MaintenanceProposalRevisionHistory({
  isOpen,
  onClose,
  proposalId,
  proposalTitle,
  onLoadRevision,
}: MaintenanceProposalRevisionHistoryProps) {
  const { showToast, confirm } = useToast();
  const [revisions, setRevisions] = useState<MaintenanceProposalRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<MaintenanceProposalRevision | null>(null);

  useEffect(() => {
    if (isOpen && proposalId) {
      loadRevisions();
    }
  }, [isOpen, proposalId]);

  const loadRevisions = async () => {
    setLoading(true);
    try {
      const { data, error } = await getMaintenanceProposalRevisions(proposalId);
      if (error) {
        console.error('Error loading revisions:', error);
        let errorMessage = 'Failed to load revisions';

        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          errorMessage = 'The revision history feature requires a database migration. Please contact support or apply the maintenance_proposal_revisions migration.';
        } else if (error.message.includes('authentication') || error.message.includes('JWT')) {
          errorMessage = 'Authentication error. Please sign in again.';
        } else {
          errorMessage = `Failed to load revisions: ${error.message}`;
        }

        showToast(errorMessage, 'error', 6000);
      } else {
        setRevisions(data);
      }
    } catch (err) {
      console.error('Unexpected error loading revisions:', err);
      showToast('Failed to load revisions: ' + String(err), 'error', 6000);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'issued':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'revised':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'issued':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'revised':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleLoadRevision = async (revision: MaintenanceProposalRevision, displayNumber: number) => {
    const confirmed = await confirm(`Load Revision ${displayNumber}?\n\nYour current work will be replaced.`);
    if (confirmed) {
      onLoadRevision(revision);
      onClose();
    }
  };

  const handleViewDetails = (revision: MaintenanceProposalRevision) => {
    setSelectedRevision(revision === selectedRevision ? null : revision);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Revision History</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">{proposalTitle}</p>
            <p className="text-xs text-gray-500 mt-0.5">{revisions.length} revisions found</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading revisions...</p>
            </div>
          ) : revisions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No revisions found</p>
              <p className="text-sm text-gray-500 mt-1">Revisions are created when you issue a proposal</p>
            </div>
          ) : (
            <div className="space-y-4">
              {revisions.map((revision, index) => {
                const displayRevisionNumber = revisions.length - index;
                return (
                <div
                  key={revision.id}
                  className={`border rounded-lg overflow-hidden transition-all ${
                    selectedRevision?.id === revision.id
                      ? 'border-blue-300 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="p-4 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Revision {displayRevisionNumber}
                          </h3>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(revision.status)}`}>
                            {getStatusIcon(revision.status)}
                            {revision.status.toUpperCase()}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>Created: {formatDate(revision.created_at)}</span>
                          </div>
                          {revision.issued_at && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>Issued: {formatDate(revision.issued_at)}</span>
                            </div>
                          )}
                          {revision.issued_price && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-semibold">
                                ${revision.issued_price.toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="text-xs">By: {revision.created_by_name}</span>
                          </div>
                        </div>
                        {revision.revision_notes && (
                          <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-900">{revision.revision_notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleViewDetails(revision)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleLoadRevision(revision, displayRevisionNumber)}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedRevision?.id === revision.id && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Proposal Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Customer:</span>{' '}
                          <span className="text-gray-900">{revision.data.header.clientName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Site:</span>{' '}
                          <span className="text-gray-900">{revision.data.header.site || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Job Number:</span>{' '}
                          <span className="text-gray-900">{revision.data.header.jobNumber || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Contract Period:</span>{' '}
                          <span className="text-gray-900">{revision.data.header.contractPeriod} months</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Loading a revision will replace your current proposal data</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
