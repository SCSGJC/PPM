import { supabase } from './supabaseClient';

export interface TaskTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: string;
  template_data: unknown;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export const taskTemplateService = {
  async getTemplates(includePublic = true) {
    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data as TaskTemplate[];
  },

  async getTemplate(id: string) {
    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as TaskTemplate | null;
  },

  async createTemplate(template: Partial<TaskTemplate>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('task_templates')
      .insert({
        ...template,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as TaskTemplate;
  },

  async updateTemplate(id: string, updates: Partial<TaskTemplate>) {
    const { data, error } = await supabase
      .from('task_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as TaskTemplate;
  },

  async deleteTemplate(id: string) {
    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async incrementUsage(id: string) {
    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: id,
    });

    if (error) {
      const { data: template } = await supabase
        .from('task_templates')
        .select('usage_count')
        .eq('id', id)
        .maybeSingle();

      if (template) {
        await supabase
          .from('task_templates')
          .update({ usage_count: (template.usage_count || 0) + 1 })
          .eq('id', id);
      }
    }
  },
};
