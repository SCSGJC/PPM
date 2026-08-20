import { supabase } from './supabaseClient';
import { MaintenanceProposalData } from '../types/maintenance';
import { logActivity } from './activityLogService';

export interface MaintenanceProposalRecord {
  id: string;
  user_id: string;
  customer_number: string;
  customer_name: string;
  site: string;
  project: string;
  job_number: string;
  prepared_by: string;
  contract_period: number;
  data: MaintenanceProposalData;
  status: string;
  version: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  proposal_status?: 'draft' | 'issued' | 'won' | 'lost';
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  archived?: boolean;
  archived_at?: string | null;
}

export interface MaintenanceProposalFilters {
  customer?: string;
  project?: string;
  preparedBy?: string;
  status?: string;
  jobNumber?: string;
  searchTerm?: string;
  userId?: string;
  proposalStatus?: 'draft' | 'issued' | 'won' | 'lost';
  showDeleted?: boolean;
  showArchived?: boolean;
}

export async function saveMaintenanceProposal(
  data: MaintenanceProposalData
): Promise<{ data: MaintenanceProposalRecord | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const proposalData: any = {
      user_id: user.id,
      customer_number: data.header.customerNumber || '',
      customer_name: data.header.clientName || '',
      site: data.header.site || '',
      project: data.header.project || '',
      job_number: data.header.jobNumber || `MAINT-${Date.now()}`,
      prepared_by: data.header.preparedBy || user.email || '',
      contract_period: data.header.contractPeriod || 12,
      data: data,
      status: 'draft',
      version: 1,
    };

    const { data: result, error } = await supabase
      .from('maintenance_proposals')
      .insert([proposalData])
      .select()
      .single();

    if (error) throw error;

    if (result) {
      await logActivity(
        'maintenance_proposal',
        result.id,
        'created',
        'created a new maintenance proposal'
      );
    }

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function saveOrUpdateMaintenanceProposal(
  data: MaintenanceProposalData,
  existingId?: string
): Promise<{ data: MaintenanceProposalRecord | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    if (existingId) {
      const { data: exists } = await supabase
        .from('maintenance_proposals')
        .select('id')
        .eq('id', existingId)
        .maybeSingle();

      if (exists) {
        return await updateMaintenanceProposal(existingId, data);
      }
    }

    return await saveMaintenanceProposal(data);
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function updateMaintenanceProposal(
  id: string,
  data: MaintenanceProposalData
): Promise<{ data: MaintenanceProposalRecord | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const updateData: any = {
      customer_number: data.header.customerNumber || '',
      customer_name: data.header.clientName || '',
      site: data.header.site || '',
      project: data.header.project || '',
      job_number: data.header.jobNumber || '',
      prepared_by: data.header.preparedBy || user.email || '',
      contract_period: data.header.contractPeriod || 12,
      data: data,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from('maintenance_proposals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (result) {
      await logActivity(
        'maintenance_proposal',
        id,
        'updated',
        'updated the maintenance proposal'
      );
    }

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function loadMaintenanceProposal(
  id: string
): Promise<{ data: MaintenanceProposalRecord | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase
      .from('maintenance_proposals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function loadMaintenanceProposals(
  filters?: MaintenanceProposalFilters
): Promise<{ data: MaintenanceProposalRecord[] | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    let query = supabase
      .from('maintenance_proposals')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.proposalStatus) {
      query = query.eq('proposal_status', filters.proposalStatus);
    }

    if (!filters?.showDeleted) {
      query = query.eq('is_deleted', false);
    } else {
      query = query.eq('is_deleted', true);
    }

    if (!filters?.showArchived) {
      query = query.eq('archived', false);
    }

    if (filters?.customer) {
      query = query.ilike('customer_name', `%${filters.customer}%`);
    }

    if (filters?.project) {
      query = query.ilike('project', `%${filters.project}%`);
    }

    if (filters?.jobNumber) {
      query = query.ilike('job_number', `%${filters.jobNumber}%`);
    }

    if (filters?.preparedBy) {
      query = query.ilike('prepared_by', `%${filters.preparedBy}%`);
    }

    if (filters?.searchTerm) {
      query = query.or(
        `customer_name.ilike.%${filters.searchTerm}%,` +
        `project.ilike.%${filters.searchTerm}%,` +
        `job_number.ilike.%${filters.searchTerm}%,` +
        `prepared_by.ilike.%${filters.searchTerm}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function deleteMaintenanceProposal(
  id: string
): Promise<{ error: Error | null }> {
  try {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('maintenance_proposals')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', id);

    if (error) throw error;

    await logActivity(
      'maintenance_proposal',
      id,
      'deleted',
      'moved maintenance proposal to trash'
    );

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function restoreMaintenanceProposal(
  id: string
): Promise<{ error: Error | null }> {
  try {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase
      .from('maintenance_proposals')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
      })
      .eq('id', id);

    if (error) throw error;

    await logActivity(
      'maintenance_proposal',
      id,
      'restored',
      'restored maintenance proposal from trash'
    );

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function permanentlyDeleteMaintenanceProposal(
  id: string
): Promise<{ error: Error | null }> {
  try {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase
      .from('maintenance_proposals')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity(
      'maintenance_proposal',
      id,
      'deleted',
      'permanently deleted maintenance proposal'
    );

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function updateProposalStatus(
  id: string,
  proposalStatus: 'draft' | 'issued' | 'won' | 'lost'
): Promise<{ data: MaintenanceProposalRecord | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase
      .from('maintenance_proposals')
      .update({ proposal_status: proposalStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (data) {
      await logActivity(
        'maintenance_proposal',
        id,
        'updated',
        `marked proposal as ${proposalStatus}`
      );
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function archiveOldLostProposals(): Promise<{ count: number; error: Error | null }> {
  try {
    if (!supabase) {
      return { count: 0, error: new Error('Supabase not configured') };
    }

    const { error } = await supabase.rpc('archive_old_lost_proposals');

    if (error) throw error;

    return { count: 0, error: null };
  } catch (error) {
    return { count: 0, error: error as Error };
  }
}

export async function submitMaintenanceProposal(
  id: string
): Promise<{ data: MaintenanceProposalRecord | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase
      .from('maintenance_proposals')
      .update({ status: 'submitted' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (data) {
      await logActivity(
        'maintenance_proposal',
        id,
        'submitted',
        'submitted maintenance proposal'
      );
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function createMaintenanceProposalRevision(
  parentId: string,
  data: MaintenanceProposalData,
  notes: string
): Promise<{ data: MaintenanceProposalRecord | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data: parent } = await supabase
      .from('maintenance_proposals')
      .select('version')
      .eq('id', parentId)
      .maybeSingle();

    const newVersion = (parent?.version || 0) + 1;

    const proposalData: any = {
      user_id: user.id,
      customer_number: data.header.customerNumber || '',
      customer_name: data.header.clientName || '',
      site: data.header.site || '',
      project: data.header.project || '',
      job_number: data.header.jobNumber || '',
      prepared_by: data.header.preparedBy || user.email || '',
      contract_period: data.header.contractPeriod || 12,
      data: data,
      status: 'draft',
      version: newVersion,
      parent_id: parentId,
    };

    const { data: result, error } = await supabase
      .from('maintenance_proposals')
      .insert([proposalData])
      .select()
      .single();

    if (error) throw error;

    if (result) {
      await logActivity(
        'maintenance_proposal',
        result.id,
        'created',
        `created revision ${newVersion}: ${notes}`
      );
    }

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export interface MaintenanceProposalRevision {
  id: string;
  proposal_id: string;
  user_id: string | null;
  revision_number: number;
  data: MaintenanceProposalData;
  issued_price: number | null;
  issued_at: string | null;
  revision_notes: string;
  status: string;
  created_at: string;
  created_by_name: string;
}

export async function createMaintenanceProposalRevisionSnapshot(
  proposalId: string,
  revisionNotes: string = '',
  issuedPrice: number | null = null,
  status: string = 'draft'
): Promise<{ data: string | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase.rpc(
      'create_maintenance_proposal_revision_snapshot',
      {
        p_proposal_id: proposalId,
        p_revision_notes: revisionNotes,
        p_issued_price: issuedPrice,
        p_status: status,
      }
    );

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function getMaintenanceProposalRevisions(
  proposalId: string
): Promise<{ data: MaintenanceProposalRevision[]; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: [], error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase
      .from('maintenance_proposal_revisions')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('revision_number', { ascending: false });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

export async function duplicateMaintenanceProposal(
  proposalId: string,
  newProjectName: string
): Promise<{ data: MaintenanceProposalRecord | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data: originalProposal, error: fetchError } = await supabase
      .from('maintenance_proposals')
      .select('*')
      .eq('id', proposalId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!originalProposal) throw new Error('Proposal not found');

    const duplicatedData = {
      ...originalProposal.data,
      header: {
        ...originalProposal.data.header,
        project: newProjectName,
        jobNumber: `${originalProposal.data.header.jobNumber}-Copy`,
      },
    };

    const proposalData: any = {
      user_id: user.id,
      customer_number: originalProposal.customer_number,
      customer_name: originalProposal.customer_name,
      site: originalProposal.site,
      project: newProjectName,
      job_number: `${originalProposal.job_number}-Copy`,
      prepared_by: user.email || '',
      contract_period: originalProposal.contract_period,
      data: duplicatedData,
      status: 'draft',
      version: 1,
    };

    const { data: result, error } = await supabase
      .from('maintenance_proposals')
      .insert([proposalData])
      .select()
      .single();

    if (error) throw error;

    if (result) {
      await logActivity(
        'maintenance_proposal',
        result.id,
        'created',
        `duplicated from ${originalProposal.job_number}`
      );
    }

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function createMaintenanceProposalFromTemplate(
  templateId: string,
  newProjectName: string
): Promise<{ data: MaintenanceProposalRecord | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data: templateProposal, error: fetchError } = await supabase
      .from('maintenance_proposals')
      .select('*')
      .eq('id', templateId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!templateProposal) throw new Error('Template not found');

    const newData = {
      ...templateProposal.data,
      header: {
        ...templateProposal.data.header,
        customerNumber: '',
        clientName: '',
        site: '',
        project: newProjectName,
        jobNumber: `MAINT-${Date.now()}`,
        preparedBy: user.email || '',
      },
      submission: {
        quotedText: '',
        issuedPrice: null,
        confirmedAt: null,
      },
    };

    const proposalData: any = {
      user_id: user.id,
      customer_number: '',
      customer_name: '',
      site: '',
      project: newProjectName,
      job_number: `MAINT-${Date.now()}`,
      prepared_by: user.email || '',
      contract_period: templateProposal.contract_period,
      data: newData,
      status: 'draft',
      version: 1,
    };

    const { data: result, error } = await supabase
      .from('maintenance_proposals')
      .insert([proposalData])
      .select()
      .single();

    if (error) throw error;

    if (result) {
      await logActivity(
        'maintenance_proposal',
        result.id,
        'created',
        `created from template ${templateProposal.job_number}`
      );
    }

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
