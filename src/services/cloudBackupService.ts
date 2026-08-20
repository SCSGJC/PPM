import { supabase } from './supabaseClient';

export interface CloudBackup {
  id: string;
  user_id: string;
  backup_type: 'auto' | 'manual' | 'pre_import';
  backup_data: any;
  job_number: string;
  customer_name: string;
  project_name: string;
  created_at: string;
  size_bytes: number;
}

export interface CloudBackupCreate {
  backup_type: 'auto' | 'manual' | 'pre_import';
  backup_data: any;
  job_number?: string;
  customer_name?: string;
  project_name?: string;
}

export class CloudBackupService {
  /**
   * Sync a backup to the cloud
   */
  static async syncBackup(backupData: CloudBackupCreate): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const dataString = JSON.stringify(backupData.backup_data);
      const sizeBytes = new Blob([dataString]).size;

      const { error } = await supabase
        .from('cloud_backups')
        .insert({
          user_id: user.id,
          backup_type: backupData.backup_type,
          backup_data: backupData.backup_data,
          job_number: backupData.job_number || '',
          customer_name: backupData.customer_name || '',
          project_name: backupData.project_name || '',
          size_bytes: sizeBytes,
        });

      if (error) {
        console.error('Failed to sync backup:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception syncing backup:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get all cloud backups for the current user
   */
  static async getBackups(): Promise<{ backups: CloudBackup[]; error?: string }> {
    if (!supabase) {
      return { backups: [], error: 'Supabase not configured' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { backups: [], error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('cloud_backups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Failed to get backups:', error);
        return { backups: [], error: error.message };
      }

      return { backups: data || [] };
    } catch (error) {
      console.error('Exception getting backups:', error);
      return { backups: [], error: String(error) };
    }
  }

  /**
   * Get a specific backup by ID
   */
  static async getBackup(backupId: string): Promise<{ backup: CloudBackup | null; error?: string }> {
    if (!supabase) {
      return { backup: null, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('cloud_backups')
        .select('*')
        .eq('id', backupId)
        .maybeSingle();

      if (error) {
        console.error('Failed to get backup:', error);
        return { backup: null, error: error.message };
      }

      return { backup: data };
    } catch (error) {
      console.error('Exception getting backup:', error);
      return { backup: null, error: String(error) };
    }
  }

  /**
   * Delete a cloud backup
   */
  static async deleteBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { error } = await supabase
        .from('cloud_backups')
        .delete()
        .eq('id', backupId);

      if (error) {
        console.error('Failed to delete backup:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception deleting backup:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Sync local backups to cloud (daily sync)
   * Should be called once per day or when user explicitly requests sync
   */
  static async syncLocalBackupsToCloud(localBackups: any[]): Promise<{
    synced: number;
    failed: number;
    error?: string
  }> {
    if (!supabase) {
      return { synced: 0, failed: 0, error: 'Supabase not configured' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { synced: 0, failed: 0, error: 'User not authenticated' };
      }

      let synced = 0;
      let failed = 0;

      for (const backup of localBackups) {
        const result = await this.syncBackup({
          backup_type: 'auto',
          backup_data: backup.data,
          job_number: backup.jobNumber,
          customer_name: backup.customer,
          project_name: backup.project,
        });

        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      }

      return { synced, failed };
    } catch (error) {
      console.error('Exception syncing local backups:', error);
      return { synced: 0, failed: 0, error: String(error) };
    }
  }

  /**
   * Check if we should sync today (once per day)
   */
  static shouldSyncToday(): boolean {
    const lastSyncDate = localStorage.getItem('scs_last_cloud_sync_date');
    const today = new Date().toDateString();

    if (!lastSyncDate || lastSyncDate !== today) {
      return true;
    }

    return false;
  }

  /**
   * Mark that we've synced today
   */
  static markSyncedToday(): void {
    const today = new Date().toDateString();
    localStorage.setItem('scs_last_cloud_sync_date', today);
  }

  /**
   * Get storage usage summary
   */
  static async getStorageUsage(): Promise<{
    totalBackups: number;
    totalSizeBytes: number;
    error?: string
  }> {
    if (!supabase) {
      return { totalBackups: 0, totalSizeBytes: 0, error: 'Supabase not configured' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { totalBackups: 0, totalSizeBytes: 0, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('cloud_backups')
        .select('size_bytes')
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to get storage usage:', error);
        return { totalBackups: 0, totalSizeBytes: 0, error: error.message };
      }

      const totalBackups = data?.length || 0;
      const totalSizeBytes = data?.reduce((sum, b) => sum + (b.size_bytes || 0), 0) || 0;

      return { totalBackups, totalSizeBytes };
    } catch (error) {
      console.error('Exception getting storage usage:', error);
      return { totalBackups: 0, totalSizeBytes: 0, error: String(error) };
    }
  }
}
