import React, { useState } from 'react';
import { X, Mail, Send, FileText, Copy, AlertCircle } from 'lucide-react';
import { MaintenanceProposalData } from '../types/maintenance';
import { useToast } from '../context/ToastContext';

interface MaintenanceEmailIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: MaintenanceProposalData;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Maintenance Proposal',
    subject: 'Maintenance Proposal #{jobNumber} - {projectName}',
    body: `Dear {customerName},

Please find attached our maintenance proposal for {projectName} at {site}.

Proposal Details:
- Job Number: {jobNumber}
- Contract Period: {contractPeriod} months
- Total Annual Value: {totalValue}

This proposal outlines the maintenance schedule, scope of work, and associated costs for the specified contract period. Please review the document carefully, including the inclusions and exclusions sections.

If you have any questions or require clarification on any aspect of this proposal, please don't hesitate to contact us.

We look forward to working with you on this maintenance contract.

Best regards,
SCS Maintenance Services`,
  },
  {
    id: 'followup',
    name: 'Follow-up Email',
    subject: 'Following up: Maintenance Proposal #{jobNumber}',
    body: `Dear {customerName},

I hope this email finds you well. I wanted to follow up on the maintenance proposal we sent for {projectName}.

Proposal Reference: {jobNumber}
Contract Period: {contractPeriod} months
Date Sent: {sentDate}

Have you had a chance to review our maintenance proposal? I'm happy to answer any questions you may have or discuss any modifications needed.

Please let me know if you need any additional information or if you'd like to proceed with the maintenance contract.

Looking forward to your response.

Best regards,
SCS Maintenance Services`,
  },
  {
    id: 'revision',
    name: 'Revised Proposal',
    subject: 'Revised Maintenance Proposal #{jobNumber} - {projectName}',
    body: `Dear {customerName},

As discussed, please find attached the revised maintenance proposal for {projectName}.

Changes Made:
- [Please describe key changes]

Updated Contract Period: {contractPeriod} months
Updated Total Value: {totalValue}

All other terms and conditions remain as per the original proposal. Please review the updated document and let us know if you have any questions.

We appreciate your business and look forward to working with you.

Best regards,
SCS Maintenance Services`,
  },
];

export function MaintenanceEmailIntegration({ isOpen, onClose, proposal }: MaintenanceEmailIntegrationProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(emailTemplates[0]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (isOpen) {
      setCustomSubject(replaceVariables(selectedTemplate.subject));
      setCustomBody(replaceVariables(selectedTemplate.body));
    }
  }, [isOpen, selectedTemplate, proposal]);

  const replaceVariables = (text: string): string => {
    const totalValue = calculateAnnualTotal();

    return text
      .replace(/{jobNumber}/g, proposal.header.jobNumber || '[Job Number]')
      .replace(/{projectName}/g, proposal.header.project || '[Project Name]')
      .replace(/{customerName}/g, proposal.header.clientName || '[Customer Name]')
      .replace(/{site}/g, proposal.header.site || '[Site]')
      .replace(/{contractPeriod}/g, proposal.header.contractPeriod?.toString() || '12')
      .replace(/{totalValue}/g, `£${totalValue.toFixed(2)}`)
      .replace(/{sentDate}/g, new Date().toLocaleDateString('en-GB'));
  };

  const calculateAnnualTotal = (): number => {
    let total = 0;
    proposal.tasks.forEach(task => {
      Object.values(task.frequencies).forEach(freq => {
        total += freq.quote || 0;
      });
    });
    return total;
  };

  const handleTemplateChange = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setCustomSubject(replaceVariables(template.subject));
      setCustomBody(replaceVariables(template.body));
    }
  };

  const handleCopyToClipboard = () => {
    const emailContent = `To: ${recipientEmail}\nSubject: ${customSubject}\n\n${customBody}`;
    navigator.clipboard.writeText(emailContent);
    showToast('Email content copied to clipboard', 'success');
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      showToast('Please enter a recipient email address', 'warning');
      return;
    }

    if (!recipientEmail.includes('@')) {
      showToast('Please enter a valid email address', 'warning');
      return;
    }

    if (!proposal.header.clientName || !proposal.header.jobNumber) {
      showToast('Please fill in customer name and job number before sending', 'warning');
      return;
    }

    setIsSending(true);
    try {
      showToast('Email functionality requires SMTP configuration. Email content has been prepared.', 'info');
      handleCopyToClipboard();
    } catch (error) {
      console.error('Error sending email:', error);
      showToast('Failed to send email', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Send Maintenance Proposal</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Email Configuration Required</p>
              <p>To send emails directly, SMTP configuration is required. For now, you can copy the email content and send it through your email client, or export the proposal as PDF to attach.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Template
            </label>
            <select
              value={selectedTemplate.id}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            >
              {emailTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Email *
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Body
            </label>
            <textarea
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-mono text-sm resize-none"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Proposal Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Job Number:</span>
                <span className="ml-2 font-medium text-gray-900">{proposal.header.jobNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Customer:</span>
                <span className="ml-2 font-medium text-gray-900">{proposal.header.clientName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Project:</span>
                <span className="ml-2 font-medium text-gray-900">{proposal.header.project || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Contract Period:</span>
                <span className="ml-2 font-medium text-gray-900">{proposal.header.contractPeriod || 12} months</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleCopyToClipboard}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy to Clipboard
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmail}
              disabled={isSending || !recipientEmail}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Preparing...' : 'Prepare Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
