import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  approval_notes: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  department: string | null;
  role: 'admin' | 'project_engineer' | 'foreman' | 'viewer';
  is_admin: boolean;
}

class UserApprovalService {
  async getPendingUsers(): Promise<{ data: UserProfile[] | null; error: Error | null }> {
    try {
      console.log('🔍 Calling get_users_with_auth_metadata RPC...');
      const { data, error } = await supabase.rpc('get_users_with_auth_metadata');

      console.log('📊 RPC Response:', { data, error });

      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }

      console.log(`📋 Total users from RPC: ${data?.length || 0}`);
      const filteredData = data?.filter((user: UserProfile) => !user.approved) || [];
      console.log(`⏳ Pending users (approved=false): ${filteredData.length}`);
      console.log('Pending users data:', filteredData);

      return { data: filteredData.length > 0 ? filteredData : null, error: null };
    } catch (error) {
      console.error('Error fetching pending users:', error);
      return { data: null, error: error as Error };
    }
  }

  async getAllUsers(): Promise<{ data: UserProfile[] | null; error: Error | null }> {
    try {
      console.log('🔍 Calling get_users_with_auth_metadata RPC (all users)...');
      const { data, error } = await supabase.rpc('get_users_with_auth_metadata');

      console.log('📊 All Users RPC Response:', { data, error });

      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }

      console.log(`👥 Total users: ${data?.length || 0}`);
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching all users:', error);
      return { data: null, error: error as Error };
    }
  }

  async approveUser(
    userId: string,
    notes?: string
  ): Promise<{ data: UserProfile | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('approve_user_by_admin', {
        target_user_id: userId,
        admin_notes: notes || null,
      });

      if (error) throw error;
      return { data: data as UserProfile, error: null };
    } catch (error) {
      console.error('Error approving user:', error);
      return { data: null, error: error as Error };
    }
  }

  async rejectUser(
    userId: string,
    _notes?: string
  ): Promise<{ error: Error | null }> {
    try {
      // Delete the user's profile
      // This effectively blocks them from using the system since all RLS policies require a profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Note: The auth.users record remains, but the user cannot access the system
      // without a profile. This is by design for audit purposes.

      return { error: null };
    } catch (error) {
      console.error('Error rejecting user:', error);
      return { error: error as Error };
    }
  }

  async revokeApproval(
    userId: string,
    notes?: string
  ): Promise<{ data: UserProfile | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('revoke_user_approval_by_admin', {
        target_user_id: userId,
        admin_notes: notes || 'Approval revoked',
      });

      if (error) throw error;
      return { data: data as UserProfile, error: null };
    } catch (error) {
      console.error('Error revoking approval:', error);
      return { data: null, error: error as Error };
    }
  }

  async checkUserApprovalStatus(): Promise<{ approved: boolean; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔐 Current user:', user?.id, user?.email);
      if (!user) return { approved: false, error: new Error('Not authenticated') };

      console.log('📋 Querying profiles table for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('approved, is_admin, role, email')
        .eq('id', user.id)
        .maybeSingle();

      console.log('✅ Query result:', { data, error });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      if (!data) {
        console.warn('⚠️  No profile found for user');
        return { approved: false, error: null };
      }

      console.log(`✓ User approval status: ${data.approved}, admin: ${data.is_admin}, role: ${data.role}`);
      return { approved: data?.approved ?? false, error: null };
    } catch (error) {
      console.error('�� Exception in checkUserApprovalStatus:', error);
      return { approved: false, error: error as Error };
    }
  }

  async getPendingCount(): Promise<{ count: number; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('get_users_with_auth_metadata');

      if (error) throw error;

      const count = data?.filter((user: UserProfile) => !user.approved).length || 0;
      return { count, error: null };
    } catch (error) {
      console.error('Error fetching pending count:', error);
      return { count: 0, error: error as Error };
    }
  }

  async deleteUserCompletely(userId: string): Promise<{ error: Error | null }> {
    try {
      // Call the database function to delete user completely
      const { data, error } = await supabase.rpc('delete_user_completely', {
        user_id: userId
      });

      if (error) throw error;

      // Check if the function returned an error
      if (data && typeof data === 'object' && 'error' in data) {
        throw new Error(data.error as string);
      }

      return { error: null };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { error: error as Error };
    }
  }

  async sendPasswordReset(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error sending password reset:', error);
      return { error: error as Error };
    }
  }

  async updateUserDepartment(
    userId: string,
    department: string
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ department })
        .eq('id', userId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error updating user department:', error);
      return { error: error as Error };
    }
  }

  async updateUserRole(
    userId: string,
    role: 'admin' | 'project_engineer' | 'foreman' | 'viewer'
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: role
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { error: error as Error };
    }
  }

  async createUserAdmin(
    email: string,
    password: string,
    fullName: string,
    company?: string,
    role?: 'admin' | 'project_engineer' | 'foreman' | 'viewer'
  ): Promise<{ data: { id: string; email: string } | null; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          company: company || null,
          role: role || 'viewer'
        })
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to create user');
      }

      return {
        data: result.user,
        error: null
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return { data: null, error: error as Error };
    }
  }
}

export const userApprovalService = new UserApprovalService();
