import React, { useState, useEffect } from 'react';
import { X, Send, Clock, Mail, FileText, TrendingUp } from 'lucide-react';
import {
  sendProposalEmail,
  loadEmailHistory,
  getEmailTemplates,
  getEmailStats,
  interpolateEmailTemplate,
  ProposalEmail,
} from '../services/maintenanceProposalEmailService';
import { useToast } from '../context/ToastContext';

interface EnhancedEmailSenderProps {
  proposalId: string;
  proposalData: any;
  onClose: () => void;
}

export default function EnhancedEmailSender({
  proposalId,
  proposalData,
  onClose,
}: EnhancedEmailSenderProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [emailType, setEmailType] = useState<'proposal' | 'reminder' | 'follow_up'>('proposal');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [emailHistory, setEmailHistory] = useState<ProposalEmail[]>([]);
  const [emailStats, setEmailStats] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();

  const emailTemplates = getEmailTemplates();

  useEffect(() => {
    loadHistory();
    loadStats();

    if (proposalData?.customer_name) {
      setRecipientName(proposalData.customer_name);
    }
  }, [proposalId]);

  async function loadHistory() {
    const { data } = await loadEmailHistory(proposalId);
    if (data) {
      setEmailHistory(data);
    }
  }

  async function loadStats() {
    const { data } = await getEmailStats(proposalId);
    if (data) {
      setEmailStats(data);
    }
  }

  function handleTemplateSelect(templateName: string) {
    setSelectedTemplate(templateName);
    const template = emailTemplates.find((t) => t.name === templateName);
    if (!template) return;

    const variables = {
      recipient_name: recipientName || 'Valued Customer',
      project_name: proposalData?.project || 'Your Project',
      sender_name: proposalData?.prepared_by || 'The Team',
      sent_date: new Date().toLocaleDateString(),
    };

    setSubject(interpolateEmailTemplate(template.subject, variables));
    setMessage(interpolateEmailTemplate(template.message, variables));
  }

  async function handleSendEmail() {
    if (!recipientEmail || !recipientName || !subject || !message) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    if (!recipientEmail.includes('@')) {
      addToast('Please enter a valid email address', 'error');
      return;
    }

    setSending(true);
    const { error } = await sendProposalEmail(
      proposalId,
      recipientEmail,
      recipientName,
      emailType,
      subject,
      message
    );

    if (error) {
      addToast(error.message, 'error');
    } else {
      addToast('Email sent successfully', 'success');
      setRecipientEmail('');
      setSubject('');
      setMessage('');
      loadHistory();
      loadStats();
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Send Proposal Email</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {emailStats && emailStats.totalSent > 0 && (
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {emailStats.totalSent} Sent
                  </div>
                  <div className="text-xs text-gray-600">Total emails</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {emailStats.totalOpened} Opened
                  </div>
                  <div className="text-xs text-gray-600">
                    {emailStats.openRate.toFixed(0)}% rate
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="ml-auto text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {showHistory ? 'Hide History' : 'View History'}
              </button>
            </div>
          </div>
        )}

        {showHistory ? (
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Email History</h3>
            {emailHistory.length === 0 ? (
              <p className="text-gray-600">No emails sent yet</p>
            ) : (
              <div className="space-y-3">
                {emailHistory.map((email) => (
                  <div
                    key={email.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {email.recipient_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {email.recipient_email}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {new Date(email.sent_at).toLocaleDateString()}
                        </div>
                        {email.opened_at && (
                          <div className="text-xs text-green-600 font-medium">
                            Opened
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">Subject:</span> {email.subject}
                    </div>
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {email.email_type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Type
                  </label>
                  <select
                    value={emailType}
                    onChange={(e) =>
                      setEmailType(e.target.value as 'proposal' | 'reminder' | 'follow_up')
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="proposal">Initial Proposal</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Custom Email</option>
                    {emailTemplates.map((template) => (
                      <option key={template.name} value={template.name}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your email message"
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Note about attachments:</p>
                    <p>
                      The proposal PDF will be generated and attached automatically
                      when the email is sent.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!showHistory && (
          <div className="border-t p-4 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmail}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
