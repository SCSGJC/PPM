import { supabase } from './supabaseClient';

export interface TaskTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: string;
  template_data: {
    frequency?: string;
    hours?: number;
    noOfMen?: number;
    noOfVisits?: number;
    consumables?: number;
    ohpConsumables?: number;
    materialsPlantHire?: number;
    ohpMaterialsPlantHire?: number;
    subcontractor?: number;
    ohpSubcontractor?: number;
    laboratoryTesting?: number;
    ohpLaboratoryTesting?: number;
    adminMarkup?: number;
    otPremium?: number;
    labourType?: string;
    band?: string;
    notes?: string;
  };
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export async function loadTaskTemplates(
  categoryFilter?: string
): Promise<{ data: TaskTemplate[]; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: [], error: new Error('Supabase not configured') };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], error: new Error('User not authenticated') };
    }

    let query = supabase
      .from('task_templates')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('name', { ascending: true });

    if (categoryFilter && categoryFilter !== 'All') {
      query = query.eq('category', categoryFilter);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

export async function getTaskCategories(): Promise<{
  data: string[];
  error: Error | null;
}> {
  try {
    if (!supabase) {
      return { data: [], error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase
      .from('task_templates')
      .select('category')
      .order('category');

    if (error) throw error;

    const categories = Array.from(
      new Set(data?.map((item) => item.category) || [])
    ).filter(Boolean);

    return { data: categories, error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

export async function saveTaskTemplate(
  name: string,
  description: string,
  category: string,
  templateData: TaskTemplate['template_data'],
  isPublic: boolean = false
): Promise<{ data: TaskTemplate | null; error: Error | null }> {
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

    const { data, error } = await supabase
      .from('task_templates')
      .insert({
        user_id: user.id,
        name,
        description,
        category,
        template_data: templateData,
        is_public: isPublic,
        usage_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function updateTaskTemplate(
  templateId: string,
  updates: Partial<TaskTemplate>
): Promise<{ data: TaskTemplate | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase
      .from('task_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function deleteTaskTemplate(
  templateId: string
): Promise<{ error: Error | null }> {
  try {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function incrementTaskUsage(
  templateId: string
): Promise<{ error: Error | null }> {
  try {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { data: template } = await supabase
      .from('task_templates')
      .select('usage_count')
      .eq('id', templateId)
      .single();

    if (template) {
      await supabase
        .from('task_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', templateId);
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function searchTaskTemplates(
  searchQuery: string
): Promise<{ data: TaskTemplate[]; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: [], error: new Error('Supabase not configured') };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .or(
        `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`
      )
      .order('usage_count', { ascending: false });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}
