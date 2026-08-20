import { supabase } from './supabaseClient';

export interface ProposalComment {
  id: string;
  proposal_id: string;
  user_id: string;
  comment_text: string;
  is_internal: boolean;
  mentions: string[];
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export const proposalCommentsService = {
  async getComments(proposalId: string) {
    const { data, error } = await supabase
      .from('proposal_comments')
      .select(`
        *,
        user:profiles!user_id (
          full_name,
          email
        )
      `)
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as unknown as ProposalComment[];
  },

  async createComment(
    proposalId: string,
    commentText: string,
    isInternal = true,
    mentions: string[] = []
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('proposal_comments')
      .insert({
        proposal_id: proposalId,
        user_id: user.id,
        comment_text: commentText,
        is_internal: isInternal,
        mentions,
      })
      .select(`
        *,
        user:profiles!user_id (
          full_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    if (mentions.length > 0) {
      for (const mentionedUserId of mentions) {
        await supabase.from('user_notifications').insert({
          user_id: mentionedUserId,
          notification_type: 'mention',
          title: 'You were mentioned in a comment',
          message: commentText.slice(0, 100),
          link_url: `/proposals/${proposalId}`,
          related_entity_type: 'proposal_comment',
          related_entity_id: (data as ProposalComment).id,
        });
      }
    }

    return data as unknown as ProposalComment;
  },

  async updateComment(id: string, commentText: string) {
    const { data, error } = await supabase
      .from('proposal_comments')
      .update({
        comment_text: commentText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        user:profiles!user_id (
          full_name,
          email
        )
      `)
      .single();

    if (error) throw error;
    return data as unknown as ProposalComment;
  },

  async deleteComment(id: string) {
    const { error } = await supabase
      .from('proposal_comments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async subscribeToComments(proposalId: string, callback: (comment: ProposalComment) => void) {
    const channel = supabase
      .channel(`proposal-comments:${proposalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proposal_comments',
          filter: `proposal_id=eq.${proposalId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('proposal_comments')
            .select(`
              *,
              user:profiles!user_id (
                full_name,
                email
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data as unknown as ProposalComment);
          }
        }
      )
      .subscribe();

    return channel;
  },
};
