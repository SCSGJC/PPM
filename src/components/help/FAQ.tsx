import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FAQProps {
  searchQuery: string;
}

const FAQ: React.FC<FAQProps> = ({ searchQuery }) => {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const faqs = [
    {
      id: 'account-access',
      category: 'Account & Access',
      question: 'How do I get access to the system?',
      answer: 'Your system administrator needs to create an account for you. Once created, you will need to wait for admin approval. After approval, you can log in using your email and password. Check your email for any welcome messages or credentials.',
    },
    {
      id: 'reset-password',
      category: 'Account & Access',
      question: 'How do I reset my password?',
      answer: 'Click on "Forgot Password" on the login page. Enter your email address and you will receive instructions to reset your password. If you don\'t receive an email within a few minutes, check your spam folder or contact your administrator.',
    },
    {
      id: 'auto-save',
      category: 'Saving & Backups',
      question: 'Does the system automatically save my work?',
      answer: 'Yes, the system automatically saves your work periodically. However, we recommend manually saving your quotation regularly, especially after making significant changes. Use the Save button in the top menu to manually save at any time.',
    },
    {
      id: 'backup-restore',
      category: 'Saving & Backups',
      question: 'Can I restore a previous version of my quotation?',
      answer: 'Yes! Every quotation maintains a complete version history. Go to "Version History" in the main menu to view all saved versions. You can restore any previous version by selecting it and clicking "Restore". This is useful if you want to undo changes or recover deleted content.',
    },
    {
      id: 'delete-quotation',
      category: 'Quotation Management',
      question: 'How do I delete a quotation?',
      answer: 'You can delete a quotation from the Quotation Browser. Click the delete icon next to the quotation you want to remove. Deleted quotations are moved to "Recently Deleted" where they remain for 30 days before permanent deletion. You can restore them during this period.',
    },
    {
      id: 'share-quotation',
      category: 'Quotation Management',
      question: 'How do I share a quotation with team members?',
      answer: 'Open the quotation and click "Share" in the top menu. Select the team members you want to share with and choose their permission level (view or edit). Shared users will be able to access the quotation from their dashboard. You can revoke access at any time.',
    },
    {
      id: 'create-revision',
      category: 'Quotation Management',
      question: 'When should I create a revision?',
      answer: 'Create a formal revision when you need to make significant changes to a submitted quotation. Revisions are numbered (Rev 1, Rev 2, etc.) and maintain a clear audit trail. Use revisions for scope changes, price updates, or client-requested modifications after the original quotation has been sent. Each revision is independent - changes to one revision don\'t affect other revisions. This is perfect for showing alternatives, value engineering options, or scope variations.',
    },
    {
      id: 'how-revisions-work',
      category: 'Quotation Management',
      question: 'How do quotation revisions work?',
      answer: 'Revisions create a complete copy of your quotation at that point in time. The original becomes "Revision 0", and each new revision gets numbered sequentially (1, 2, 3, etc.). Each revision maintains its own line items, costs, and settings independently. You can view, edit, export, or compare any revision at any time. Deleted revisions go to the trash and can be recovered if needed. The revision system provides a complete audit trail for all quotation changes.',
    },
    {
      id: 'revision-vs-version',
      category: 'Quotation Management',
      question: 'What is the difference between revisions and version history?',
      answer: 'Version history tracks every auto-save and manual save automatically - it\'s a continuous record of all edits. Revisions are formal, numbered versions you create manually for significant changes. Think of version history as your "undo" system for day-to-day edits, and revisions as your numbered submissions to clients (Rev 0, Rev 1, Rev 2). Version history happens automatically; revisions are created deliberately when you need to track major changes or variations.',
    },
    {
      id: 'component-library',
      category: 'Component Library',
      question: 'How do I add items to the Component Library?',
      answer: 'Create a line item in any quotation with all the details (description, rates, quantities). Click "Save to Library" and choose a department category. Add tags to make it easier to find later. The component will then be available to insert into any quotation.',
    },
    {
      id: 'component-update',
      category: 'Component Library',
      question: 'If I update a component in the library, does it update in existing quotations?',
      answer: 'No. Components are inserted as copies into quotations. If you update a component in the library, it only affects future insertions. Existing line items in quotations remain unchanged. This prevents unexpected changes to submitted quotations.',
    },
    {
      id: 'labour-rates',
      category: 'Rates & Pricing',
      question: 'How do I change labour rates?',
      answer: 'Navigate to the Labour Rates section of your quotation. Click "Edit" and enter the hourly rate for each role. Changes apply to new line items you add. Existing line items keep their original rates unless manually updated. Administrators can set standard rates that apply to all users.',
    },
    {
      id: 'markup-discount',
      category: 'Rates & Pricing',
      question: 'How do I apply a markup or discount to the entire quotation?',
      answer: 'Go to the Final Adjustments section. You can apply a percentage markup (positive) or discount (negative) to the subtotal. This adjustment appears separately on the quotation and is clearly labeled. The total is automatically recalculated.',
    },
    {
      id: 'export-excel',
      category: 'Export & Reports',
      question: 'Can I export my quotation to Excel?',
      answer: 'Yes! Click "Export" in the top menu and choose Excel format. The export includes all line items, calculations, and totals. You can customize which sections to include. Excel exports are useful for further analysis or integration with other systems.',
    },
    {
      id: 'export-pdf',
      category: 'Export & Reports',
      question: 'How do I create a PDF for clients?',
      answer: 'Click "Export" and choose PDF format. Configure which sections to include (typically you\'ll exclude internal notes and comments). The PDF is professionally formatted and ready to send to clients. You can include survey photos and company branding.',
    },
    {
      id: 'photos-upload',
      category: 'Photos & Documentation',
      question: 'What types of photos can I upload?',
      answer: 'You can upload JPG and PNG image files. Photos should be from site surveys showing relevant work areas, existing conditions, access points, and other details that support your quotation. Add captions to each photo to provide context.',
    },
    {
      id: 'photos-limit',
      category: 'Photos & Documentation',
      question: 'Is there a limit to how many photos I can upload?',
      answer: 'There is no strict limit on the number of photos, but we recommend keeping it reasonable (typically 10-30 photos per quotation). Very large numbers of photos may slow down loading times. Choose photos that clearly support your scope of work.',
    },
    {
      id: 'line-item-comments',
      category: 'Comments & Notes',
      question: 'Will comments on line items appear on client quotations?',
      answer: 'No. Comments are internal notes only visible to your team. They do not appear on exported PDFs or client-facing documents. Use comments to document assumptions, clarifications, or reminders without cluttering the client view.',
    },
    {
      id: 'preliminaries',
      category: 'Quotation Sections',
      question: 'What are Preliminaries?',
      answer: 'Preliminaries are costs that apply to the entire project rather than specific line items. This includes site setup, facilities, safety equipment, supervision, and other general project costs. Add preliminaries as a separate section to clearly show these overhead costs.',
    },
    {
      id: 'inclusions-exclusions',
      category: 'Quotation Sections',
      question: 'Why should I add Inclusions and Exclusions?',
      answer: 'Inclusions and Exclusions clearly define what is and isn\'t included in your quotation. This prevents misunderstandings and disputes. Be specific about scope boundaries, client responsibilities, and any work explicitly excluded from your price.',
    },
    {
      id: 'active-users',
      category: 'Collaboration',
      question: 'What does "Active Users" show?',
      answer: 'Active Users shows who is currently viewing or editing quotations in real-time. This helps prevent conflicting edits when multiple team members are working. You can see which specific quotation each user is viewing.',
    },
    {
      id: 'conflicts',
      category: 'Collaboration',
      question: 'What happens if two people edit the same quotation?',
      answer: 'The system tracks all changes and will alert you if conflicts occur. The last save overwrites previous changes. To avoid conflicts, check Active Users before editing shared quotations, or communicate with your team about who is working on what.',
    },
    {
      id: 'departments',
      category: 'Organization',
      question: 'How do I organize line items by department?',
      answer: 'Use sections to organize your quotation. Each section can represent a department, trade, or phase of work. Click "Add Section" and give it a name (e.g., "Electrical", "Plumbing", "Phase 1"). Add line items within each section to keep your quotation organized.',
    },
    {
      id: 'reorder-items',
      category: 'Organization',
      question: 'Can I reorder line items?',
      answer: 'Yes! You can reorder both sections and line items. Use the drag handles to drag items to a new position, or use the up/down arrow buttons. Reordering helps you present your quotation in the most logical sequence.',
    },
    {
      id: 'copy-items',
      category: 'Efficiency',
      question: 'Can I copy line items?',
      answer: 'Yes! Click the copy icon on any line item to duplicate it. This is useful when you have similar items with slight variations. After copying, edit the new item as needed. You can also copy items across different quotations using the Line Item Copy Manager.',
    },
    {
      id: 'bulk-operations',
      category: 'Efficiency',
      question: 'Can I add multiple items at once?',
      answer: 'Yes, use the "Bulk Add Sections" feature to quickly add multiple sections or line items. This is particularly useful when setting up a new quotation with a standard structure, or when adding many items from a scope document.',
    },
    {
      id: 'admin-approval',
      category: 'Administration',
      question: 'Why do I need admin approval?',
      answer: 'Admin approval ensures only authorized users access the system. This maintains security and data integrity. Your administrator reviews new account requests and approves legitimate users. This typically happens quickly, but timing depends on your organization.',
    },
    {
      id: 'permissions',
      category: 'Administration',
      question: 'What are the different user roles?',
      answer: 'The system has different permission levels: Standard users can create and manage their own quotations. Admins can view all quotations, manage users, set standard rates, and configure system settings. Your role determines which features you can access.',
    },
    {
      id: 'mobile-access',
      category: 'Technical',
      question: 'Can I access the system on my mobile device?',
      answer: 'Yes, the system is fully responsive and works on tablets and smartphones. However, for the best experience, especially when creating detailed quotations, we recommend using a desktop or laptop computer with a larger screen.',
    },
    {
      id: 'browser-support',
      category: 'Technical',
      question: 'Which web browsers are supported?',
      answer: 'The system works best on modern browsers including Chrome, Firefox, Safari, and Edge (latest versions). Make sure your browser is up to date for the best performance and security. Avoid using Internet Explorer as it is no longer supported.',
    },
    {
      id: 'data-security',
      category: 'Technical',
      question: 'How secure is my data?',
      answer: 'All data is encrypted in transit and at rest. The system uses industry-standard security protocols. Regular backups ensure your data is protected. Only authorized users with proper credentials can access quotations, and all changes are logged in an audit trail.',
    },
    {
      id: 'offline-work',
      category: 'Technical',
      question: 'Can I work offline?',
      answer: 'No, an internet connection is required to use the system as all data is stored in the cloud. This ensures your work is automatically backed up and accessible from any device. We recommend saving your work regularly to protect against connection interruptions.',
    },
    {
      id: 'search-quotations',
      category: 'Quotation Management',
      question: 'How do I find old quotations?',
      answer: 'Use the Quotation Browser from the Cloud menu or Dashboard. You can search by job number, customer name, project name, or date range. Use filters to narrow down results. The browser shows all your quotations with their status, dates, and values.',
    },
    {
      id: 'duplicate-quotation',
      category: 'Efficiency',
      question: 'Can I duplicate a quotation as a template?',
      answer: 'Yes! Open the quotation you want to duplicate, then save it with a new name. This copies all sections, line items, rates, and settings. This is perfect for creating templates for common project types or reusing quotation structures.',
    },
    {
      id: 'keyboard-shortcuts',
      category: 'Efficiency',
      question: 'Are there keyboard shortcuts available?',
      answer: 'Yes! See the Keyboard Shortcuts section in the Help Center for a complete list. Common shortcuts include Ctrl+S to save, Ctrl+N for new line item, and Ctrl+D to duplicate. Using shortcuts significantly speeds up quotation creation.',
    },
    {
      id: 'training',
      category: 'Getting Help',
      question: 'Is training available?',
      answer: 'Yes, check with your administrator about training sessions. The Help Center provides comprehensive documentation including step-by-step guides, video tutorials (coming soon), and FAQs. New users should start with the Getting Started guide.',
    },
    {
      id: 'support-hours',
      category: 'Getting Help',
      question: 'What are the support hours?',
      answer: 'Support availability depends on your organization. Contact your system administrator for assistance. The Help Center is available 24/7 for self-service help. For urgent issues, contact your admin or IT department immediately.',
    },
    {
      id: 'maintenance-proposal-vs-quotation',
      category: 'Maintenance Proposals',
      question: 'What is the difference between a quotation and a maintenance proposal?',
      answer: 'Quotations are for one-time projects with specific deliverables. Maintenance Proposals are for ongoing service contracts with recurring tasks at different frequencies (weekly, monthly, quarterly, etc.). Maintenance proposals calculate costs based on visit frequency over a contract period.',
    },
    {
      id: 'maintenance-frequencies',
      category: 'Maintenance Proposals',
      question: 'How do I choose the right frequency for maintenance tasks?',
      answer: 'Consider manufacturer recommendations, equipment criticality, compliance requirements, and risk of failure. Weekly (52 visits/year) for critical equipment, monthly (12 visits/year) for regular maintenance, quarterly (4 visits/year) for periodic checks, bimonthly (6 visits/year) for semi-regular service, halfyearly (2 visits/year) for mid-year reviews, and annual (1 visit/year) for yearly inspections.',
    },
    {
      id: 'maintenance-contract-period',
      category: 'Maintenance Proposals',
      question: 'How long should a maintenance contract period be?',
      answer: 'Typical contract periods range from 1-5 years. Consider equipment warranty periods, budget cycles, and relationship with the client. Longer contracts provide stability but may require price adjustment clauses. Shorter contracts allow for more frequent rate updates.',
    },
    {
      id: 'maintenance-provisional-sums',
      category: 'Maintenance Proposals',
      question: 'When should I use provisional sums?',
      answer: 'Use provisional sums for costs that are variable or uncertain, such as emergency parts, specialist equipment that may need replacement, or services that depend on usage. Provisional sums allow you to include estimated costs while acknowledging they may change based on actual requirements.',
    },
    {
      id: 'maintenance-contingency',
      category: 'Maintenance Proposals',
      question: 'What contingency percentage should I apply?',
      answer: 'Typical contingency ranges from 5-15% depending on risk factors. Consider: age and condition of equipment, accessibility issues, unknown site conditions, complexity of tasks, and contract length. Higher contingencies for older equipment or uncertain conditions.',
    },
    {
      id: 'maintenance-additional-costs',
      category: 'Maintenance Proposals',
      question: 'What are additional costs in maintenance proposals?',
      answer: 'Additional costs include emergency callouts, out-of-hours rates, materials, specialist subcontractors, and laboratory testing. These are costs beyond regular scheduled maintenance. Define rates clearly in the proposal to avoid disputes when these services are needed.',
    },
    {
      id: 'maintenance-export',
      category: 'Maintenance Proposals',
      question: 'Can I export maintenance proposals?',
      answer: 'Yes! Export maintenance proposals to Excel for detailed cost analysis or PDF for client presentation. Exports include all tasks by frequency, cost breakdowns, additional costs, provisional sums, and summary totals. Use Excel exports to analyze profitability and optimize pricing.',
    },
    {
      id: 'maintenance-overtime',
      category: 'Maintenance Proposals',
      question: 'How do I handle overtime and premium rates?',
      answer: 'Each task can have overtime premium percentages applied to labour rates. This accounts for work outside normal hours. Also set out-of-hours rates for emergency callouts. Be clear in your terms about when premium rates apply to avoid misunderstandings.',
    },
    {
      id: 'maintenance-admin-markup',
      category: 'Maintenance Proposals',
      question: 'What is admin markup for?',
      answer: 'Admin markup covers overhead costs like administration, management, quality control, reporting, and coordination. Typical markups range from 10-25%. Apply to labour costs to ensure all indirect costs are recovered. This is separate from profit margin.',
    },
    {
      id: 'maintenance-edit-submitted',
      category: 'Maintenance Proposals',
      question: 'Can I edit a submitted maintenance proposal?',
      answer: 'Yes, but making changes to a submitted proposal will require re-submission to the client. The system tracks all changes in the activity log. For significant changes after contract award, consider creating a variation or amendment document.',
    },
  ];

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;

    const query = searchQuery.toLowerCase();
    return faqs.filter((faq) => {
      return (
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.category.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  const categories = useMemo(() => {
    const cats = new Set(filteredFaqs.map((faq) => faq.category));
    return Array.from(cats);
  }, [filteredFaqs]);

  const toggleQuestion = (id: string) => {
    setExpandedQuestion(expandedQuestion === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h3>
        <p className="text-gray-600">
          Find answers to common questions about using the quotation system.
        </p>
      </div>

      {filteredFaqs.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No questions found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                {category}
              </h4>
              <div className="space-y-2">
                {filteredFaqs
                  .filter((faq) => faq.category === category)
                  .map((faq) => (
                    <div key={faq.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleQuestion(faq.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <h5 className="font-semibold text-gray-900 pr-4">{faq.question}</h5>
                        {expandedQuestion === faq.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </button>

                      {expandedQuestion === faq.id && (
                        <div className="p-4 pt-0 text-gray-700">
                          <p>{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-bold text-blue-900 mb-2">Still have questions?</h4>
        <p className="text-blue-800 text-sm">
          If you can't find the answer you're looking for, contact your system administrator for additional support
          and guidance. They can help with specific issues or provide training on advanced features.
        </p>
      </div>
    </div>
  );
};

export default FAQ;
