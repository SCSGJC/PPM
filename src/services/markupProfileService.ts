import { supabase } from './supabaseClient';

export interface MarkupProfile {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_default: boolean;
  admin_markup: number;
  consumables_markup: number;
  materials_markup: number;
  subcontractor_markup: number;
  lab_testing_markup: number;
  created_at: string;
  updated_at: string;
}

export const markupProfileService = {
  async getProfiles() {
    const { data, error } = await supabase
      .from('markup_profiles')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');

    if (error) throw error;
    return data as MarkupProfile[];
  },

  async getDefaultProfile() {
    const { data, error } = await supabase
      .from('markup_profiles')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;
    return data as MarkupProfile | null;
  },

  async getProfile(id: string) {
    const { data, error } = await supabase
      .from('markup_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as MarkupProfile | null;
  },

  async createProfile(profile: Partial<MarkupProfile>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (profile.is_default) {
      await supabase
        .from('markup_profiles')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    const { data, error } = await supabase
      .from('markup_profiles')
      .insert({
        ...profile,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as MarkupProfile;
  },

  async updateProfile(id: string, updates: Partial<MarkupProfile>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (updates.is_default) {
      await supabase
        .from('markup_profiles')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', id);
    }

    const { data, error } = await supabase
      .from('markup_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as MarkupProfile;
  },

  async deleteProfile(id: string) {
    const { error } = await supabase
      .from('markup_profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async setDefault(id: string) {
    return this.updateProfile(id, { is_default: true });
  },
};
