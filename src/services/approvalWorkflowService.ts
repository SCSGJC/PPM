import { supabase } from './supabaseClient';

export interface ApprovalWorkflow {
  id: string;
  proposal_id: string;
  requester_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  requested_at: string;
  responded_at: string | null;
  requester?: {
    full_name: string;
    email: string;
  };
  approver?: {
    full_name: string;
    email: string;
  };
}

export const approvalWorkflowService = {
  async requestApproval(proposalId: string, approverId: string, notes = '') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('approval_workflows')
      .insert({
        proposal_id: proposalId,
        requester_id: user.id,
        approver_id: approverId,
        notes,
      })
      .select(`
        *,
        requester:profiles!requester_id (
          full_name,
          email
        ),
        approver:profiles!approver_id (
          full_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    await supabase.from('user_notifications').insert({
      user_id: approverId,
      notification_type: 'approval_request',
      title: 'Approval Request',
      message: `You have a new approval request for proposal`,
      link_url: `/proposals/${proposalId}`,
      related_entity_type: 'approval_workflow',
      related_entity_id: (data as ApprovalWorkflow).id,
    });

    return data as unknown as ApprovalWorkflow;
  },

  async getWorkflows(proposalId: string) {
    const { data, error } = await supabase
      .from('approval_workflows')
      .select(`
        *,
        requester:profiles!requester_id (
          full_name,
          email
        ),
        approver:profiles!approver_id (
          full_name,
          email
        )
      `)
      .eq('proposal_id', proposalId)
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return data as unknown as ApprovalWorkflow[];
  },

  async getPendingApprovals() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('approval_workflows')
      .select(`
        *,
        requester:profiles!requester_id (
          full_name,
          email
        ),
        proposal:maintenance_proposals!proposal_id (
          customer_name,
          job_number
        )
      `)
      .eq('approver_id', user.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async respondToApproval(workflowId: string, approved: boolean, responseNotes = '') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('approval_workflows')
      .update({
        status: approved ? 'approved' : 'rejected',
        notes: responseNotes,
        responded_at: new Date().toISOString(),
      })
      .eq('id', workflowId)
      .select(`
        *,
        requester:profiles!requester_id (
          full_name,
          email
        ),
        approver:profiles!approver_id (
          full_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    const workflow = data as unknown as ApprovalWorkflow;

    await supabase.from('user_notifications').insert({
      user_id: workflow.requester_id,
      notification_type: 'approval_response',
      title: approved ? 'Approval Granted' : 'Approval Rejected',
      message: `Your approval request has been ${approved ? 'approved' : 'rejected'}`,
      link_url: `/proposals/${workflow.proposal_id}`,
      related_entity_type: 'approval_workflow',
      related_entity_id: workflowId,
    });

    if (approved) {
      await supabase
        .from('maintenance_proposals')
        .update({ status: 'approved' })
        .eq('id', workflow.proposal_id);
    }

    return workflow;
  },

  async cancelApproval(workflowId: string) {
    const { error } = await supabase
      .from('approval_workflows')
      .delete()
      .eq('id', workflowId);

    if (error) throw error;
  },
};
