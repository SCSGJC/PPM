import { supabase } from './supabaseClient';
import { LabourRateOverride } from '../types/maintenance';

export const labourRateOverrideService = {
  async getOverridesForProposal(proposalId: string): Promise<{ data: LabourRateOverride[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('proposal_labour_rate_overrides')
        .select('*')
        .eq('proposal_id', proposalId);

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching labour rate overrides:', error);
      return { data: null, error };
    }
  },

  async setOverride(
    proposalId: string,
    labourRateId: string,
    overrideRate: number
  ): Promise<{ data: LabourRateOverride | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('proposal_labour_rate_overrides')
        .upsert({
          proposal_id: proposalId,
          labour_rate_id: labourRateId,
          override_rate: overrideRate,
        }, {
          onConflict: 'proposal_id,labour_rate_id'
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error setting labour rate override:', error);
      return { data: null, error };
    }
  },

  async removeOverride(
    proposalId: string,
    labourRateId: string
  ): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('proposal_labour_rate_overrides')
        .delete()
        .eq('proposal_id', proposalId)
        .eq('labour_rate_id', labourRateId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error removing labour rate override:', error);
      return { error };
    }
  },

  async clearAllOverrides(proposalId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('proposal_labour_rate_overrides')
        .delete()
        .eq('proposal_id', proposalId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error clearing labour rate overrides:', error);
      return { error };
    }
  },
};
