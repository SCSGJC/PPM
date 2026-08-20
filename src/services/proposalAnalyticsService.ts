import { supabase } from './supabaseClient';
import type { MaintenanceProposal } from '../types/maintenance';

export interface ProposalAnalytics {
  id: string;
  proposal_id: string;
  total_value: number;
  labour_cost: number;
  materials_cost: number;
  profit_margin: number;
  task_count: number;
  calculated_at: string;
}

export interface AnalyticsSummary {
  totalProposals: number;
  totalValue: number;
  averageValue: number;
  totalProfit: number;
  averageMargin: number;
  proposalsByStatus: Record<string, number>;
  monthlyTrends: Array<{
    month: string;
    count: number;
    value: number;
  }>;
}

export const proposalAnalyticsService = {
  async calculateAnalytics(proposal: MaintenanceProposal) {
    const data = proposal.data as {
      tasks?: Array<{
        frequency?: string;
        visits?: number;
        hours?: number;
        men?: number;
        rate?: string;
        adminPerc?: number;
        consumables?: number;
        ohpConsumables?: number;
        materialsPlantHire?: number;
        ohpMaterialsPlantHire?: number;
        subContractor?: number;
        ohpSubContractor?: number;
        laboratoryTesting?: number;
        ohpLaboratoryTesting?: number;
      }>;
    };

    const tasks = data?.tasks || [];
    let totalValue = 0;
    let labourCost = 0;
    let materialsCost = 0;

    tasks.forEach((task) => {
      const visits = task.visits || 0;
      const hours = task.hours || 0;
      const men = task.men || 0;
      const rate = parseFloat(task.rate || '0');
      const adminPerc = task.adminPerc || 0;

      const baseLabour = visits * hours * men * rate;
      const labourWithAdmin = baseLabour * (1 + adminPerc / 100);

      const consumables = (task.consumables || 0) * (1 + (task.ohpConsumables || 0) / 100);
      const materials = (task.materialsPlantHire || 0) * (1 + (task.ohpMaterialsPlantHire || 0) / 100);
      const subcontractor = (task.subContractor || 0) * (1 + (task.ohpSubContractor || 0) / 100);
      const labTesting = (task.laboratoryTesting || 0) * (1 + (task.ohpLaboratoryTesting || 0) / 100);

      labourCost += labourWithAdmin;
      materialsCost += consumables + materials + subcontractor + labTesting;
      totalValue += labourWithAdmin + consumables + materials + subcontractor + labTesting;
    });

    const profitMargin = totalValue > 0 ? ((totalValue - (labourCost + materialsCost)) / totalValue) * 100 : 0;

    const analytics = {
      proposal_id: proposal.id,
      total_value: totalValue,
      labour_cost: labourCost,
      materials_cost: materialsCost,
      profit_margin: profitMargin,
      task_count: tasks.length,
    };

    const { data: existing } = await supabase
      .from('proposal_analytics')
      .select('id')
      .eq('proposal_id', proposal.id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('proposal_analytics')
        .update({
          ...analytics,
          calculated_at: new Date().toISOString(),
        })
        .eq('proposal_id', proposal.id)
        .select()
        .single();

      if (error) throw error;
      return data as ProposalAnalytics;
    } else {
      const { data, error } = await supabase
        .from('proposal_analytics')
        .insert(analytics)
        .select()
        .single();

      if (error) throw error;
      return data as ProposalAnalytics;
    }
  },

  async getAnalytics(proposalId: string) {
    const { data, error } = await supabase
      .from('proposal_analytics')
      .select('*')
      .eq('proposal_id', proposalId)
      .maybeSingle();

    if (error) throw error;
    return data as ProposalAnalytics | null;
  },

  async getDashboardSummary(startDate?: string, endDate?: string): Promise<AnalyticsSummary> {
    let query = supabase
      .from('maintenance_proposals')
      .select(`
        id,
        status,
        created_at,
        proposal_analytics (
          total_value,
          labour_cost,
          materials_cost,
          profit_margin
        )
      `);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: proposals, error } = await query;

    if (error) throw error;

    const summary: AnalyticsSummary = {
      totalProposals: proposals?.length || 0,
      totalValue: 0,
      averageValue: 0,
      totalProfit: 0,
      averageMargin: 0,
      proposalsByStatus: {},
      monthlyTrends: [],
    };

    if (!proposals || proposals.length === 0) return summary;

    const monthlyData: Record<string, { count: number; value: number }> = {};

    proposals.forEach((proposal: { status: string; created_at: string; proposal_analytics?: ProposalAnalytics[] }) => {
      summary.proposalsByStatus[proposal.status] = (summary.proposalsByStatus[proposal.status] || 0) + 1;

      const analytics = proposal.proposal_analytics?.[0];
      if (analytics) {
        summary.totalValue += analytics.total_value;
        summary.totalProfit += analytics.total_value - (analytics.labour_cost + analytics.materials_cost);

        const month = new Date(proposal.created_at).toISOString().slice(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { count: 0, value: 0 };
        }
        monthlyData[month].count += 1;
        monthlyData[month].value += analytics.total_value;
      }
    });

    summary.averageValue = summary.totalProposals > 0 ? summary.totalValue / summary.totalProposals : 0;
    summary.averageMargin = summary.totalValue > 0 ? (summary.totalProfit / summary.totalValue) * 100 : 0;

    summary.monthlyTrends = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        count: data.count,
        value: data.value,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return summary;
  },

  async compareProposals(proposalIds: string[]) {
    const { data, error } = await supabase
      .from('maintenance_proposals')
      .select(`
        id,
        customer_name,
        job_number,
        created_at,
        proposal_analytics (*)
      `)
      .in('id', proposalIds);

    if (error) throw error;
    return data;
  },
};
