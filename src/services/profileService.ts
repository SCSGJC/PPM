import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  role: string;
  is_admin: boolean;
  signature_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCurrentUserProfile(): Promise<{ data: UserProfile | null; error: Error | null }> {
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
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function getAllUserProfiles(): Promise<{ data: UserProfile[]; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: [], error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('email', { ascending: true });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

export async function isUserAdmin(): Promise<boolean> {
  try {
    const { data } = await getCurrentUserProfile();
    return data?.is_admin || false;
  } catch (error) {
    return false;
  }
}

export async function getAllUsers(): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .order('full_name');

    if (profilesError) throw profilesError;

    const users = (profiles || []).map(profile => ({
      id: profile.id,
      name: profile.full_name || profile.email || 'Unknown',
      email: profile.email || '',
      created_at: profile.created_at
    }));

    return { data: users, error: null };
  } catch (error) {
    console.error('Error getting users:', error);
    return { data: null, error: error as Error };
  }
}

export async function updateUserProfile(userId: string, updates: Partial<Pick<UserProfile, 'full_name' | 'company'>>): Promise<{ data: UserProfile | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function uploadSignature(userId: string, file: File): Promise<{ data: { url: string } | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/signature.${fileExt}`;

    const { data: existingFiles } = await supabase.storage
      .from('signatures')
      .list(userId);

    if (existingFiles && existingFiles.length > 0) {
      for (const existingFile of existingFiles) {
        await supabase.storage
          .from('signatures')
          .remove([`${userId}/${existingFile.name}`]);
      }
    }

    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('signatures')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ signature_url: publicUrl })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { data: { url: publicUrl }, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function deleteSignature(userId: string): Promise<{ error: Error | null }> {
  try {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { data: files } = await supabase.storage
      .from('signatures')
      .list(userId);

    if (files && files.length > 0) {
      const filesToRemove = files.map(file => `${userId}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from('signatures')
        .remove(filesToRemove);

      if (deleteError) throw deleteError;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ signature_url: null })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export const profileService = {
  getCurrentUserProfile,
  getAllUserProfiles,
  isUserAdmin,
  getAllUsers,
  updateUserProfile,
  uploadSignature,
  deleteSignature
};
