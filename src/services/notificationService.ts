import { supabase } from './supabaseClient';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  link_url: string;
  read_at: string | null;
  created_at: string;
  related_entity_type: string;
  related_entity_id: string | null;
}

export const notificationService = {
  async getNotifications(unreadOnly = false) {
    let query = supabase
      .from('user_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Notification[];
  },

  async getUnreadCount() {
    const { count, error } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null);

    if (error) throw error;
    return count || 0;
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async markAllAsRead() {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null);

    if (error) throw error;
  },

  async deleteNotification(id: string) {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    linkUrl = '',
    entityType = '',
    entityId: string | null = null
  ) {
    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        notification_type: type,
        title,
        message,
        link_url: linkUrl,
        related_entity_type: entityType,
        related_entity_id: entityId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  },

  async subscribeToNotifications(callback: (notification: Notification) => void) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return channel;
  },
};
