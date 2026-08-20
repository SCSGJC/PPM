import { supabase } from './supabaseClient';

export interface ProposalTemplate {
  id: string;
  user_id: string;
  template_name: string;
  description: string;
  category: string;
  template_data: any;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export async function saveProposalAsTemplate(
  proposalData: any,
  templateName: string,
  description: string,
  category: string,
  isPublic: boolean = false
): Promise<{ data: ProposalTemplate | null; error: Error | null }> {
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
      .from('proposal_templates')
      .insert({
        user_id: user.id,
        template_name: templateName,
        description,
        category,
        template_data: proposalData,
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

export async function loadProposalTemplates(
  categoryFilter?: string
): Promise<{ data: ProposalTemplate[]; error: Error | null }> {
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
      .from('proposal_templates')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false });

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

export async function getTemplateCategories(): Promise<{
  data: string[];
  error: Error | null;
}> {
  try {
    if (!supabase) {
      return { data: [], error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase
      .from('proposal_templates')
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

export async function deleteTemplate(
  templateId: string
): Promise<{ error: Error | null }> {
  try {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase
      .from('proposal_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function updateTemplate(
  templateId: string,
  updates: Partial<ProposalTemplate>
): Promise<{ data: ProposalTemplate | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase
      .from('proposal_templates')
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

export async function incrementTemplateUsage(
  templateId: string
): Promise<{ error: Error | null }> {
  try {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId,
    });

    if (error) {
      const { data: template } = await supabase
        .from('proposal_templates')
        .select('usage_count')
        .eq('id', templateId)
        .single();

      if (template) {
        await supabase
          .from('proposal_templates')
          .update({ usage_count: (template.usage_count || 0) + 1 })
          .eq('id', templateId);
      }
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function createProposalFromTemplate(
  templateId: string,
  customizations: {
    customer_name?: string;
    site?: string;
    project?: string;
    job_number?: string;
    prepared_by?: string;
  }
): Promise<{ data: any; error: Error | null }> {
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

    const { data: template, error: templateError } = await supabase
      .from('proposal_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;
    if (!template) throw new Error('Template not found');

    await incrementTemplateUsage(templateId);

    const proposalData = {
      ...template.template_data,
      ...customizations,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return { data: proposalData, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
