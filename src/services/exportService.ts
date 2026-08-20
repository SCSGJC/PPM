import type { MaintenanceProposal } from '../types/maintenance';

export const exportService = {
  exportToCSV(proposals: MaintenanceProposal[], filename = 'proposals.csv') {
    const headers = [
      'Job Number',
      'Customer Name',
      'Site',
      'Project',
      'Status',
      'Created Date',
      'Total Value',
      'Task Count',
    ];

    const rows = proposals.map((proposal) => {
      const data = proposal.data as {
        tasks?: unknown[];
        financialSummary?: { grandTotal?: number };
      };
      const tasks = data?.tasks || [];
      const grandTotal = data?.financialSummary?.grandTotal || 0;

      return [
        proposal.job_number,
        proposal.customer_name,
        proposal.site || '',
        proposal.project || '',
        proposal.status || 'draft',
        new Date(proposal.created_at).toLocaleDateString(),
        grandTotal.toFixed(2),
        tasks.length.toString(),
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportProposalToCSV(proposal: MaintenanceProposal, filename?: string) {
    const data = proposal.data as {
      tasks?: Array<{
        taskDescription?: string;
        frequency?: string;
        visits?: number;
        hours?: number;
        men?: number;
        tradeType?: string;
        quote?: number;
      }>;
    };
    const tasks = data?.tasks || [];

    const headers = [
      'Task Description',
      'Frequency',
      'Visits',
      'Hours',
      'Men',
      'Trade Type',
      'Quote',
    ];

    const rows = tasks.map((task) => [
      task.taskDescription || '',
      task.frequency || '',
      (task.visits || 0).toString(),
      (task.hours || 0).toString(),
      (task.men || 0).toString(),
      task.tradeType || '',
      (task.quote || 0).toFixed(2),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `proposal_${proposal.job_number}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportToJSON(data: unknown, filename = 'export.json') {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  },
};
