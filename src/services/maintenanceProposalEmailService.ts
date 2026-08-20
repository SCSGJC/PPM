import { supabase } from './supabaseClient';

export interface ProposalEmail {
  id: string;
  proposal_id: string;
  sent_by: string;
  recipient_email: string;
  recipient_name: string;
  email_type: 'proposal' | 'reminder' | 'follow_up' | 'acceptance';
  subject: string;
  message: string;
  sent_at: string;
  opened_at?: string;
  acceptance_token: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  message: string;
}

const defaultEmailTemplates: EmailTemplate[] = [
  {
    name: 'Initial Proposal',
    subject: 'Maintenance Proposal - {project_name}',
    message: `Dear {recipient_name},

Please find attached our maintenance proposal for {project_name}.

This proposal outlines the scope of work, pricing, and terms for the maintenance services we discussed.

If you have any questions or would like to discuss any aspect of this proposal, please don't hesitate to contact me.

Best regards,
{sender_name}`,
  },
  {
    name: 'Follow-up',
    subject: 'Following up on Maintenance Proposal - {project_name}',
    message: `Dear {recipient_name},

I wanted to follow up on the maintenance proposal I sent you for {project_name}.

Have you had a chance to review it? I'd be happy to answer any questions or discuss any modifications you might need.

Looking forward to hearing from you.

Best regards,
{sender_name}`,
  },
  {
    name: 'Reminder',
    subject: 'Reminder: Maintenance Proposal - {project_name}',
    message: `Dear {recipient_name},

This is a friendly reminder about the maintenance proposal for {project_name} that we sent on {sent_date}.

Please let us know if you need any additional information or clarification.

Best regards,
{sender_name}`,
  },
];

export function getEmailTemplates(): EmailTemplate[] {
  return defaultEmailTemplates;
}

export async function sendProposalEmail(
  proposalId: string,
  recipientEmail: string,
  recipientName: string,
  emailType: ProposalEmail['email_type'],
  subject: string,
  message: string
): Promise<{ data: ProposalEmail | null; error: Error | null }> {
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
      .from('maintenance_proposal_emails')
      .insert({
        proposal_id: proposalId,
        sent_by: user.id,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        email_type: emailType,
        subject,
        message,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function loadEmailHistory(
  proposalId: string
): Promise<{ data: ProposalEmail[]; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: [], error: new Error('Supabase not configured') };
    }

    const { data, error } = await supabase
      .from('maintenance_proposal_emails')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

export async function trackEmailOpen(
  acceptanceToken: string
): Promise<{ error: Error | null }> {
  try {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase
      .from('maintenance_proposal_emails')
      .update({ opened_at: new Date().toISOString() })
      .eq('acceptance_token', acceptanceToken)
      .is('opened_at', null);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function getEmailStats(
  proposalId: string
): Promise<{
  data: {
    totalSent: number;
    totalOpened: number;
    openRate: number;
    lastSent?: string;
  };
  error: Error | null;
}> {
  try {
    if (!supabase) {
      return {
        data: { totalSent: 0, totalOpened: 0, openRate: 0 },
        error: new Error('Supabase not configured'),
      };
    }

    const { data, error } = await supabase
      .from('maintenance_proposal_emails')
      .select('sent_at, opened_at')
      .eq('proposal_id', proposalId);

    if (error) throw error;

    const totalSent = data?.length || 0;
    const totalOpened = data?.filter((email) => email.opened_at).length || 0;
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const lastSent = data?.[0]?.sent_at;

    return {
      data: { totalSent, totalOpened, openRate, lastSent },
      error: null,
    };
  } catch (error) {
    return {
      data: { totalSent: 0, totalOpened: 0, openRate: 0 },
      error: error as Error,
    };
  }
}

export function interpolateEmailTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  });
  return result;
}
