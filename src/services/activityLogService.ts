import { supabase } from './supabaseClient';

export type EntityType =
  | 'quotation'
  | 'maintenance_proposal'
  | 'component'
  | 'line_item'
  | 'section'
  | 'photo'
  | 'revision'
  | 'task';

export type ActionType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'restored'
  | 'shared'
  | 'unshared'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'duplicated'
  | 'exported'
  | 'imported'
  | 'commented';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: ActionType;
  entity_type: EntityType;
  entity_id: string;
  description: string;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: {
    email: string;
    full_name?: string;
  };
}

export async function getActivityLog(
  entityType: EntityType,
  entityId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      user:profiles!activity_logs_user_id_fkey(email, full_name)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activity log:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function logActivity(
  entityType: EntityType,
  entityId: string,
  action: ActionType,
  description: string,
  changes?: Record<string, unknown>,
  metadata?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('Activity not logged: User not authenticated');
      return { data: null, error: new Error('Not authenticated') };
    }

    const now = new Date();
    const oneSecondAgo = new Date(now.getTime() - 1000);

    const { data: recentActivity } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('action', action)
      .gte('created_at', oneSecondAgo.toISOString())
      .maybeSingle();

    if (recentActivity) {
      console.log('Skipping duplicate activity log');
      return { data: recentActivity, error: null };
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        action,
        description,
        changes: changes || {},
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging activity:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception logging activity:', error);
    return { data: null, error: error as Error };
  }
}

export async function getRecentActivity(days = 7, entityType?: EntityType) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  let query = supabase
    .from('activity_logs')
    .select(`
      *,
      user:profiles!activity_logs_user_id_fkey(email, full_name)
    `)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent activity:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function getUserActivity(userId: string, limit = 50, entityType?: EntityType) {
  let baseQuery = supabase
    .from('activity_logs')
    .select(`
      *,
      user:profiles!activity_logs_user_id_fkey(email, full_name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (entityType) {
    baseQuery = baseQuery.eq('entity_type', entityType);
  }

  const { data: activities, error } = await baseQuery;

  if (error) {
    console.error('Error fetching user activity:', error);
    return { data: null, error };
  }

  if (!activities || activities.length === 0) {
    return { data: [], error: null };
  }

  const quotationIds = activities
    .filter(a => a.entity_type === 'quotation')
    .map(a => a.entity_id);

  const maintenanceIds = activities
    .filter(a => a.entity_type === 'maintenance_proposal')
    .map(a => a.entity_id);

  let quotationsMap = new Map();
  let maintenanceMap = new Map();

  if (quotationIds.length > 0) {
    const { data: quotations } = await supabase
      .from('quotations')
      .select('id, title, customer_name, job_number')
      .in('id', quotationIds);

    if (quotations) {
      quotations.forEach(q => quotationsMap.set(q.id, q));
    }
  }

  if (maintenanceIds.length > 0) {
    const { data: maintenance } = await supabase
      .from('maintenance_proposals')
      .select('id, customer_name, job_number')
      .in('id', maintenanceIds);

    if (maintenance) {
      maintenance.forEach(m => maintenanceMap.set(m.id, m));
    }
  }

  const enrichedActivities = activities.map(activity => ({
    ...activity,
    quotation: activity.entity_type === 'quotation' ? quotationsMap.get(activity.entity_id) : undefined,
    maintenance_proposal: activity.entity_type === 'maintenance_proposal' ? maintenanceMap.get(activity.entity_id) : undefined,
  }));

  return { data: enrichedActivities, error: null };
}
