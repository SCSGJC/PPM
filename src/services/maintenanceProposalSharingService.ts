import { supabase } from './supabaseClient';

export interface MaintenanceProposalShare {
  id: string;
  proposal_id: string;
  owner_id: string;
  shared_with_user_id: string;
  permission: 'read' | 'write';
  created_at: string;
  created_by: string;
  user_email?: string;
  user_name?: string;
}

export interface ShareUser {
  user_id: string;
  user_email: string;
  user_name: string;
  permission: 'read' | 'write';
  shared_at: string;
}

export const maintenanceProposalSharingService = {
  async getCurrentUserId(): Promise<{ data: string | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return { data: user?.id || null, error: null };
    } catch (error) {
      console.error('Error getting current user:', error);
      return { data: null, error };
    }
  },

  async shareProposal(proposalId: string, userEmail: string, permission: 'read' | 'write' = 'read') {
    try {
      const { data, error } = await supabase.rpc('share_maintenance_proposal', {
        p_proposal_id: proposalId,
        p_user_email: userEmail,
        p_permission: permission
      });

      if (error) {
        console.error('Error sharing proposal:', error);
        return { data: null, error };
      }

      if (!data.success) {
        return { data: null, error: { message: data.error } };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception sharing proposal:', error);
      return { data: null, error };
    }
  },

  async revokeAccess(proposalId: string, userEmail: string) {
    try {
      const { data, error } = await supabase.rpc('revoke_maintenance_proposal_access', {
        p_proposal_id: proposalId,
        p_user_email: userEmail
      });

      if (error) {
        console.error('Error revoking access:', error);
        return { data: null, error };
      }

      if (!data.success) {
        return { data: null, error: { message: data.error } };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception revoking access:', error);
      return { data: null, error };
    }
  },

  async getProposalShares(proposalId: string): Promise<{ data: ShareUser[] | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('get_maintenance_proposal_shares', {
        p_proposal_id: proposalId
      });

      if (error) {
        console.error('Error getting proposal shares:', error);
        return { data: null, error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Exception getting proposal shares:', error);
      return { data: null, error };
    }
  },

  async getAllUsers(): Promise<{ data: any[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .order('full_name');

      if (error) {
        console.error('Error getting users:', error);
        return { data: null, error };
      }

      const users = (data || []).map(profile => ({
        id: profile.id,
        name: profile.full_name || profile.email || 'Unknown',
        email: profile.email || '',
        created_at: profile.created_at
      }));

      return { data: users, error: null };
    } catch (error) {
      console.error('Exception getting users:', error);
      return { data: null, error };
    }
  },

  async checkProposalPermission(proposalId: string): Promise<{
    isOwner: boolean;
    hasWriteAccess: boolean;
    hasReadAccess: boolean;
    isAdmin: boolean;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { isOwner: false, hasWriteAccess: false, hasReadAccess: false, isAdmin: false };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.is_admin || false;

      const { data: proposal } = await supabase
        .from('maintenance_proposals')
        .select('user_id')
        .eq('id', proposalId)
        .single();

      const isOwner = proposal?.user_id === user.id;

      if (isOwner || isAdmin) {
        return { isOwner, hasWriteAccess: true, hasReadAccess: true, isAdmin };
      }

      const { data: share } = await supabase
        .from('maintenance_proposal_shares')
        .select('permission')
        .eq('proposal_id', proposalId)
        .eq('shared_with_user_id', user.id)
        .single();

      return {
        isOwner: false,
        hasWriteAccess: share?.permission === 'write',
        hasReadAccess: !!share,
        isAdmin
      };
    } catch (error) {
      console.error('Error checking proposal permission:', error);
      return { isOwner: false, hasWriteAccess: false, hasReadAccess: false, isAdmin: false };
    }
  }
};
