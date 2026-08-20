import { supabase } from './supabaseClient';
import { CloudBackupService } from './cloudBackupService';

export interface DailyBackupStatus {
  lastBackupDate: string | null;
  lastBackupTime: string | null;
  nextBackupDue: string | null;
  totalQuotations: number;
  totalMaintenanceProposals: number;
}

const BACKUP_STORAGE_KEY = 'scs_daily_backup_status';

export class DailyBackupService {
  static async performDailyBackup(): Promise<{
    success: boolean;
    quotationsBackedUp: number;
    maintenanceBackedUp: number;
    error?: string;
  }> {
    if (!supabase) {
      return {
        success: false,
        quotationsBackedUp: 0,
        maintenanceBackedUp: 0,
        error: 'Supabase not configured',
      };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          quotationsBackedUp: 0,
          maintenanceBackedUp: 0,
          error: 'User not authenticated',
        };
      }

      let quotationsBackedUp = 0;
      let maintenanceBackedUp = 0;

      const { data: quotations } = await supabase
        .from('quotations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      if (quotations && quotations.length > 0) {
        for (const quotation of quotations) {
          const result = await CloudBackupService.syncBackup({
            backup_type: 'auto',
            backup_data: quotation.data,
            job_number: quotation.job_number || quotation.quote_id,
            customer_name: quotation.customer_name || '',
            project_name: quotation.project_name || quotation.title,
          });

          if (result.success) {
            quotationsBackedUp++;
          }
        }
      }

      const { data: maintenanceProposals } = await supabase
        .from('maintenance_proposals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      if (maintenanceProposals && maintenanceProposals.length > 0) {
        for (const proposal of maintenanceProposals) {
          const result = await CloudBackupService.syncBackup({
            backup_type: 'auto',
            backup_data: proposal.data,
            job_number: proposal.job_number || proposal.proposal_id,
            customer_name: proposal.customer_name || '',
            project_name: proposal.project_name || proposal.title,
          });

          if (result.success) {
            maintenanceBackedUp++;
          }
        }
      }

      this.markBackupCompleted();

      return {
        success: true,
        quotationsBackedUp,
        maintenanceBackedUp,
      };
    } catch (error) {
      console.error('Daily backup failed:', error);
      return {
        success: false,
        quotationsBackedUp: 0,
        maintenanceBackedUp: 0,
        error: String(error),
      };
    }
  }

  static shouldPerformBackupToday(): boolean {
    const status = this.getBackupStatus();
    const today = new Date().toDateString();

    if (!status.lastBackupDate || status.lastBackupDate !== today) {
      return true;
    }

    return false;
  }

  static getBackupStatus(): DailyBackupStatus {
    try {
      const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to get backup status:', error);
    }

    return {
      lastBackupDate: null,
      lastBackupTime: null,
      nextBackupDue: new Date().toDateString(),
      totalQuotations: 0,
      totalMaintenanceProposals: 0,
    };
  }

  static markBackupCompleted(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const status: DailyBackupStatus = {
      lastBackupDate: now.toDateString(),
      lastBackupTime: now.toLocaleTimeString(),
      nextBackupDue: tomorrow.toDateString(),
      totalQuotations: 0,
      totalMaintenanceProposals: 0,
    };

    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(status));
  }

  static async initializeDailyBackup(onProgress?: (message: string) => void): Promise<void> {
    if (!this.shouldPerformBackupToday()) {
      console.log('Daily backup already completed today');
      return;
    }

    if (!supabase) {
      console.log('Supabase not configured, skipping daily backup');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('User not authenticated, skipping daily backup');
        return;
      }

      onProgress?.('Starting daily backup...');

      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await this.performDailyBackup();

      if (result.success) {
        const totalBackedUp = result.quotationsBackedUp + result.maintenanceBackedUp;
        if (totalBackedUp > 0) {
          onProgress?.(
            `Daily backup completed: ${result.quotationsBackedUp} quotation(s) and ${result.maintenanceBackedUp} maintenance proposal(s) backed up`
          );
        }
      } else if (result.error) {
        console.error('Daily backup failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to initialize daily backup:', error);
    }
  }

  static getNextBackupTime(): string {
    const status = this.getBackupStatus();
    if (status.nextBackupDue) {
      return status.nextBackupDue;
    }
    return new Date().toDateString();
  }

  static formatBackupStatus(): string {
    const status = this.getBackupStatus();

    if (!status.lastBackupDate) {
      return 'No backups yet';
    }

    const lastBackup = new Date(status.lastBackupDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      return `Last backup: Today at ${status.lastBackupTime}`;
    } else if (daysDiff === 1) {
      return `Last backup: Yesterday at ${status.lastBackupTime}`;
    } else {
      return `Last backup: ${daysDiff} days ago at ${status.lastBackupTime}`;
    }
  }
}
