import { supabase } from './supabaseClient';

export interface LabourRate {
  id: string;
  name: string;
  base_rate: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LabourRateInput {
  name: string;
  base_rate: number;
  sort_order?: number;
  is_active?: boolean;
}

export const labourRatesService = {
  async getLabourRates(): Promise<{ data: LabourRate[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('standard_labour_rates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching labour rates:', error);
      return { data: null, error };
    }
  },

  async getAllLabourRates(): Promise<{ data: LabourRate[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('standard_labour_rates')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching all labour rates:', error);
      return { data: null, error };
    }
  },

  async createLabourRate(input: LabourRateInput): Promise<{ data: LabourRate | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('standard_labour_rates')
        .insert([input])
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error creating labour rate:', error);
      return { data: null, error };
    }
  },

  async updateLabourRate(id: string, updates: Partial<LabourRateInput>): Promise<{ data: LabourRate | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('standard_labour_rates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error updating labour rate:', error);
      return { data: null, error };
    }
  },

  async deleteLabourRate(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('standard_labour_rates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error deleting labour rate:', error);
      return { error };
    }
  },

  async reorderLabourRates(rates: { id: string; sort_order: number }[]): Promise<{ error: any }> {
    try {
      for (const rate of rates) {
        const { error } = await supabase
          .from('standard_labour_rates')
          .update({ sort_order: rate.sort_order })
          .eq('id', rate.id);

        if (error) throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Error reordering labour rates:', error);
      return { error };
    }
  },
};
