import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Trash2, Calendar, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface DeletedProposal {
  id: string;
  customer_name: string;
  job_number: string;
  project: string;
  site: string;
  deleted_at: string;
  deleted_by: string;
  deleted_by_email?: string;
  created_at: string;
}

interface TrashRecoveryProps {
  onClose: () => void;
  onRecover?: () => void;
}

export function TrashRecovery({ onClose, onRecover }: TrashRecoveryProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [deletedProposals, setDeletedProposals] = useState<DeletedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState<string | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadDeletedProposals();
  }, [user]);

  const loadDeletedProposals = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('maintenance_proposals')
        .select(`
          id,
          customer_name,
          job_number,
          project,
          site,
          deleted_at,
          deleted_by,
          created_at
        `)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      if (error) throw error;

      const proposalsWithEmails = await Promise.all(
        (data || []).map(async (proposal) => {
          if (proposal.deleted_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', proposal.deleted_by)
              .maybeSingle();

            return {
              ...proposal,
              deleted_by_email: profile?.email || 'Unknown',
            };
          }
          return { ...proposal, deleted_by_email: 'Unknown' };
        })
      );

      setDeletedProposals(proposalsWithEmails);
    } catch (error) {
      console.error('Error loading deleted proposals:', error);
      showToast('Failed to load deleted items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (proposalId: string) => {
    try {
      setRecovering(proposalId);

      const { error } = await supabase
        .from('maintenance_proposals')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        })
        .eq('id', proposalId);

      if (error) throw error;

      showToast('Proposal recovered successfully', 'success');
      setDeletedProposals((prev) => prev.filter((p) => p.id !== proposalId));

      if (onRecover) {
        onRecover();
      }
    } catch (error) {
      console.error('Error recovering proposal:', error);
      showToast('Failed to recover proposal', 'error');
    } finally {
      setRecovering(null);
    }
  };

  const handlePermanentDelete = async (proposalId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this proposal? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setPermanentDeleting(proposalId);

      const { error } = await supabase
        .from('maintenance_proposals')
        .delete()
        .eq('id', proposalId);

      if (error) throw error;

      showToast('Proposal permanently deleted', 'success');
      setDeletedProposals((prev) => prev.filter((p) => p.id !== proposalId));
    } catch (error) {
      console.error('Error permanently deleting proposal:', error);
      showToast('Failed to permanently delete proposal', 'error');
    } finally {
      setPermanentDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Trash2 className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Trash</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : deletedProposals.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No deleted items</p>
              <p className="text-gray-400 text-sm mt-2">
                Deleted proposals will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {deletedProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {proposal.customer_name || 'Untitled Proposal'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Job Number:</span>{' '}
                          {proposal.job_number || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Project:</span>{' '}
                          {proposal.project || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Site:</span>{' '}
                          {proposal.site || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Created: {formatDate(proposal.created_at)}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>Deleted by: {proposal.deleted_by_email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Deleted: {formatDate(proposal.deleted_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleRecover(proposal.id)}
                        disabled={recovering === proposal.id}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Recover proposal"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            recovering === proposal.id ? 'animate-spin' : ''
                          }`}
                        />
                        {recovering === proposal.id ? 'Recovering...' : 'Recover'}
                      </button>

                      <button
                        onClick={() => handlePermanentDelete(proposal.id)}
                        disabled={permanentDeleting === proposal.id}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Permanently delete"
                      >
                        <Trash2 className="w-4 h-4" />
                        {permanentDeleting === proposal.id
                          ? 'Deleting...'
                          : 'Delete Forever'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {deletedProposals.length} deleted{' '}
              {deletedProposals.length === 1 ? 'item' : 'items'}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
