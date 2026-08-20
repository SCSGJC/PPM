import { supabase } from './supabaseClient';

export interface UserPresence {
  user_id: string;
  last_seen: string;
  is_online: boolean;
  current_quotation_id?: string | null;
  updated_at: string;
}

export interface UserPresenceWithProfile extends UserPresence {
  email?: string;
  full_name?: string;
}

export const updateUserPresence = async (
  userId: string,
  isOnline: boolean,
  quotationId?: string | null
): Promise<{ data: UserPresence | null; error: any }> => {
  const { data, error } = await supabase
    .from('user_presence')
    .upsert(
      {
        user_id: userId,
        is_online: isOnline,
        current_quotation_id: quotationId,
        last_seen: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle();

  return { data, error };
};

export const getOnlineUsers = async (): Promise<{
  data: UserPresenceWithProfile[] | null;
  error: any;
}> => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('user_presence')
    .select('*')
    .eq('is_online', true)
    .gte('last_seen', fiveMinutesAgo);

  if (error) return { data: null, error };

  const userIds = data?.map((p) => p.user_id) || [];

  if (userIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);

  if (profileError) {
    return { data: data as UserPresenceWithProfile[], error: null };
  }

  const enrichedData = data?.map((presence) => {
    const profile = profiles?.find((p) => p.id === presence.user_id);
    return {
      ...presence,
      email: profile?.email,
      full_name: profile?.full_name,
    };
  });

  return { data: enrichedData || [], error: null };
};

export const getUsersViewingQuotation = async (
  quotationId: string
): Promise<{ data: UserPresenceWithProfile[] | null; error: any }> => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('user_presence')
    .select('*')
    .eq('current_quotation_id', quotationId)
    .eq('is_online', true)
    .gte('last_seen', fiveMinutesAgo);

  if (error) return { data: null, error };

  const userIds = data?.map((p) => p.user_id) || [];

  if (userIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);

  if (profileError) {
    return { data: data as UserPresenceWithProfile[], error: null };
  }

  const enrichedData = data?.map((presence) => {
    const profile = profiles?.find((p) => p.id === presence.user_id);
    return {
      ...presence,
      email: profile?.email,
      full_name: profile?.full_name,
    };
  });

  return { data: enrichedData || [], error: null };
};

export const markUserOffline = async (
  userId: string
): Promise<{ data: UserPresence | null; error: any }> => {
  const { data, error } = await supabase
    .from('user_presence')
    .update({
      is_online: false,
      current_quotation_id: null,
    })
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  return { data, error };
};

export const subscribeToPresenceChanges = (
  quotationId: string | null,
  callback: (payload: any) => void
) => {
  const channel = supabase
    .channel('user-presence-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: quotationId
          ? `current_quotation_id=eq.${quotationId}`
          : undefined,
      },
      callback
    )
    .subscribe();

  return channel;
};
