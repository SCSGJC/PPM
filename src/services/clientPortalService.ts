import { supabase } from './supabaseClient';

export interface ClientPortalAccess {
  id: string;
  proposal_id: string;
  access_token: string;
  client_email: string;
  client_name: string;
  expires_at: string;
  viewed_at: string | null;
  accepted_at: string | null;
  signature_data: string;
  created_by: string;
  created_at: string;
}

export const clientPortalService = {
  async createPortalAccess(
    proposalId: string,
    clientEmail: string,
    clientName: string,
    expiresInDays = 30
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data, error } = await supabase
      .from('client_portal_access')
      .insert({
        proposal_id: proposalId,
        client_email: clientEmail,
        client_name: clientName,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClientPortalAccess;
  },

  async getPortalAccess(proposalId: string) {
    const { data, error } = await supabase
      .from('client_portal_access')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) throw error;
    return data as ClientPortalAccess | null;
  },

  async getPortalAccessByToken(token: string) {
    const { data, error } = await supabase
      .from('client_portal_access')
      .select(`
        *,
        proposal:maintenance_proposals!proposal_id (*)
      `)
      .eq('access_token', token)
      .maybeSingle();

    if (error) throw error;

    if (data && !data.viewed_at) {
      await supabase
        .from('client_portal_access')
        .update({ viewed_at: new Date().toISOString() })
        .eq('access_token', token);
    }

    return data;
  },

  async acceptProposal(token: string, signatureData: string) {
    const { data, error } = await supabase
      .from('client_portal_access')
      .update({
        accepted_at: new Date().toISOString(),
        signature_data: signatureData,
      })
      .eq('access_token', token)
      .select()
      .single();

    if (error) throw error;

    const access = data as ClientPortalAccess;

    await supabase
      .from('maintenance_proposals')
      .update({ status: 'accepted' })
      .eq('id', access.proposal_id);

    const { data: proposal } = await supabase
      .from('maintenance_proposals')
      .select('user_id')
      .eq('id', access.proposal_id)
      .single();

    if (proposal) {
      await supabase.from('user_notifications').insert({
        user_id: proposal.user_id,
        notification_type: 'proposal_accepted',
        title: 'Proposal Accepted',
        message: `Your proposal has been accepted by ${access.client_name}`,
        link_url: `/proposals/${access.proposal_id}`,
        related_entity_type: 'maintenance_proposal',
        related_entity_id: access.proposal_id,
      });
    }

    return access;
  },

  async revokeAccess(proposalId: string) {
    const { error } = await supabase
      .from('client_portal_access')
      .delete()
      .eq('proposal_id', proposalId);

    if (error) throw error;
  },

  async extendAccess(proposalId: string, additionalDays: number) {
    const { data: access } = await supabase
      .from('client_portal_access')
      .select('expires_at')
      .eq('proposal_id', proposalId)
      .single();

    if (!access) throw new Error('Portal access not found');

    const newExpiry = new Date(access.expires_at);
    newExpiry.setDate(newExpiry.getDate() + additionalDays);

    const { data, error } = await supabase
      .from('client_portal_access')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('proposal_id', proposalId)
      .select()
      .single();

    if (error) throw error;
    return data as ClientPortalAccess;
  },

  getPortalUrl(token: string): string {
    return `${window.location.origin}/client-portal/${token}`;
  },
};
