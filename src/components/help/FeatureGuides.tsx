import React, { useMemo } from 'react';
import {
  FileText,
  List,
  Package,
  Users,
  Camera,
  Settings,
  Download,
  Clock,
  MessageSquare,
  Share2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Wrench,
  Calendar,
} from 'lucide-react';

interface FeatureGuidesProps {
  searchQuery: string;
}

const FeatureGuides: React.FC<FeatureGuidesProps> = ({ searchQuery }) => {
  const [expandedFeature, setExpandedFeature] = React.useState<string | null>(null);

  const features = [
    {
      id: 'project-info',
      title: 'Project Information',
      icon: FileText,
      description: 'Manage basic project details and customer information',
      content: {
        overview: 'The Project Information section is where you enter all basic details about your quotation, including customer information, site details, and project specifics.',
        steps: [
          'Enter a unique Job Number to identify the quotation',
          'Fill in Customer Number and Customer Name',
          'Specify the Site/Location where work will be performed',
          'Enter the Project Name or description',
          'Add any relevant notes or reference numbers',
        ],
        tips: [
          'Use consistent naming conventions for easier searching later',
          'Job numbers should be unique across all quotations',
          'Include site-specific details that may affect pricing',
        ],
      },
    },
    {
      id: 'line-items',
      title: 'Line Items Management',
      icon: List,
      description: 'Add, edit, and organize quotation line items',
      content: {
        overview: 'Line items are the core of your quotation. Each item can include materials, labour, and equipment costs with detailed calculations.',
        steps: [
          'Click "Add Section" to create a new category or department',
          'Click "Add Line Item" within a section to add an item',
          'Enter a description and item number',
          'Add material costs with quantities and rates',
          'Add labour hours with hourly rates',
          'Add equipment/plant costs with quantities and rates',
          'Use the copy function to duplicate similar items',
          'Reorder items by dragging or using move buttons',
        ],
        tips: [
          'Organize items by trade or phase for clarity',
          'Use item numbers for easy reference',
          'Add internal comments for notes that won\'t appear on final quotations',
          'Break down complex items into smaller components',
          'Use consistent units (e.g., m², linear metres, hours)',
        ],
      },
    },
    {
      id: 'component-library',
      title: 'Component Library',
      icon: Package,
      description: 'Save and reuse frequently used line items',
      content: {
        overview: 'The Component Library allows you to save frequently used line items for quick insertion into quotations, saving time and ensuring consistency.',
        steps: [
          'Create a line item in any quotation',
          'Click "Save to Library" on the line item',
          'Choose a department/category for the component',
          'Add tags for easy searching',
          'Access the library from any quotation',
          'Search or browse by category',
          'Click to insert components into your quotation',
        ],
        tips: [
          'Build your library over time with commonly used items',
          'Use clear, descriptive names for components',
          'Update library items when rates change',
          'Share useful components with your team',
          'Tag components with multiple keywords for better searchability',
        ],
      },
    },
    {
      id: 'comments',
      title: 'Line Item Comments',
      icon: MessageSquare,
      description: 'Add internal notes and comments to line items',
      content: {
        overview: 'Comments allow you to add internal notes to line items that are visible only to team members and won\'t appear on client-facing quotations.',
        steps: [
          'Click the comment icon on any line item',
          'Type your comment or note',
          'Comments are saved automatically',
          'View all comments in the comments panel',
          'Edit or delete comments as needed',
        ],
        tips: [
          'Use comments for clarifications or assumptions',
          'Note any special conditions or requirements',
          'Add reminders about follow-up items',
          'Document why certain rates or quantities were used',
        ],
      },
    },
    {
      id: 'labour-rates',
      title: 'Labour Rates',
      icon: DollarSign,
      description: 'Set and manage labour rates for different roles',
      content: {
        overview: 'Configure standard labour rates for different roles and trades. Rates can be customized per quotation or use system-wide defaults.',
        steps: [
          'Navigate to Labour Rates section',
          'View current rates for all trades',
          'Click "Edit" to modify rates',
          'Enter hourly rate for each role',
          'Save changes to apply to new line items',
          'Admins can set standard rates for all users',
        ],
        tips: [
          'Update rates regularly to reflect current market conditions',
          'Consider different rates for different project types',
          'Document any special rates or overtime multipliers',
          'Standard rates help maintain consistency across quotations',
        ],
      },
    },
    {
      id: 'survey-photos',
      title: 'Survey Photos',
      icon: Camera,
      description: 'Upload and manage site survey photographs',
      content: {
        overview: 'Add photographs from site surveys to support your quotation and provide visual context for the scope of work.',
        steps: [
          'Navigate to Survey Photos section',
          'Click "Upload Photos" or drag and drop images',
          'Add captions to describe each photo',
          'Reorder photos by dragging',
          'Delete photos that are no longer needed',
          'Photos can be included in exported reports',
        ],
        tips: [
          'Take clear, well-lit photos that show relevant details',
          'Add descriptive captions for context',
          'Include photos of access points, existing conditions, and scope areas',
          'Photos help justify costs and clarify scope',
          'Supported formats: JPG, PNG',
        ],
      },
    },
    {
      id: 'collaboration',
      title: 'Collaboration & Sharing',
      icon: Share2,
      description: 'Share quotations with team members',
      content: {
        overview: 'Collaborate with team members by sharing quotations. Multiple users can view and edit shared quotations in real-time.',
        steps: [
          'Open a quotation you want to share',
          'Click "Share" in the top menu',
          'Select team members to share with',
          'Choose permission level (view or edit)',
          'Team members receive notifications',
          'View who is currently editing in real-time',
        ],
        tips: [
          'Share draft quotations for review before submission',
          'Use comments to communicate with collaborators',
          'Check "Active Users" to avoid conflicting edits',
          'Revoke access when collaboration is complete',
        ],
      },
    },
    {
      id: 'version-history',
      title: 'Version History & Revisions',
      icon: Clock,
      description: 'Track changes and create quotation revisions',
      content: {
        overview: 'Every quotation maintains a complete version history with automatic cloud saves. Create formal revisions to track significant changes, variations, or updates after initial submission. The revision system ensures you maintain a complete audit trail of all quotation changes.',
        steps: [
          'Open any quotation to see the "Revisions" option in the top menu bar',
          'Click "Revisions" to view all revisions for the current quotation',
          'The system displays Revision 0 (original) plus any subsequent revisions',
          'To create a new revision, click "Create New Revision" button',
          'The system duplicates the current quotation data as a new revision',
          'Edit the new revision as needed - changes are isolated from previous versions',
          'Add revision notes explaining what changed and why',
          'Each revision has its own revision number (Revision 1, 2, 3, etc.)',
          'View any previous revision by clicking "View" in the revisions list',
          'Compare revisions side-by-side to see differences',
          'Export specific revisions independently as Excel or PDF',
          'Delete unwanted revisions by clicking the trash icon (moves to trash, can be recovered)',
          'Restore deleted revisions from the Trash if needed',
        ],
        tips: [
          'Create a new revision whenever you make significant changes after the client has seen the quotation',
          'Use revisions for scope changes, client requests, or value engineering alternatives',
          'Add detailed notes to each revision explaining what changed (e.g., "Client requested removal of Item 3.2, added upgraded materials to Section 5")',
          'Keep the original (Revision 0) intact - never edit it after submission',
          'Each revision maintains its own line items, costs, and totals independently',
          'Revision numbers help clients track which version they are reviewing',
          'Use the comparison feature to quickly identify changes between versions',
          'Previous revisions remain fully accessible and can be exported at any time',
          'When discussing changes with clients, reference specific revision numbers',
          'The revision system works alongside the automatic version history - revisions are for formal changes, version history is for tracking edits',
          'All revisions are automatically saved to the cloud when signed in',
          'You can share specific revisions with team members or clients',
          'Best practice: Export each revision as PDF for your records before creating the next one',
          'Revisions help you maintain transparency and provide clear documentation for variations and change orders',
        ],
      },
    },
    {
      id: 'export',
      title: 'Export & Reporting',
      icon: Download,
      description: 'Generate Excel and PDF reports',
      content: {
        overview: 'Export your quotations in various formats for submission, review, or record-keeping.',
        steps: [
          'Open the quotation you want to export',
          'Click "Export" in the menu',
          'Choose format: Excel or PDF',
          'Select which sections to include',
          'Configure export options',
          'Download the generated file',
        ],
        tips: [
          'PDF exports are ideal for client submissions',
          'Excel exports are useful for further analysis',
          'Review exports before sending to clients',
          'Save exports for your records',
          'Include survey photos for complete documentation',
        ],
      },
    },
    {
      id: 'maintenance-proposals',
      title: 'Maintenance Proposals',
      icon: Wrench,
      description: 'Create comprehensive maintenance contracts with scheduled tasks',
      content: {
        overview: 'Maintenance Proposals allow you to create detailed maintenance contracts with scheduled tasks at different frequencies (weekly, monthly, quarterly, etc.). Perfect for ongoing maintenance contracts, service agreements, and planned preventative maintenance programs.',
        steps: [
          'Click "New Maintenance Proposal" from the Dashboard',
          'Enter customer details and contract period',
          'Add maintenance tasks with descriptions',
          'For each task, specify frequency (weekly, monthly, quarterly, etc.)',
          'Enter hours required, number of workers, and labour rates',
          'Add consumables, materials, and equipment costs',
          'Set overtime premiums and admin markup percentages',
          'Include additional costs like emergency callouts and out-of-hours rates',
          'Add provisional sums for variable or uncertain costs',
          'Apply contingency percentages for risk management',
          'Fill in scope of work, inclusions, exclusions, and terms',
          'Review totals calculated by frequency and overall contract value',
          'Submit the proposal when ready',
        ],
        tips: [
          'Break down maintenance into clear, specific tasks',
          'Consider seasonal variations in maintenance requirements',
          'Include realistic time estimates based on site conditions',
          'Factor in travel time, access restrictions, and site-specific challenges',
          'Use provisional sums for items with uncertain quantities',
          'Apply contingency percentages to manage risk',
          'Be specific in inclusions and exclusions to avoid disputes',
          'Review contract period carefully - typically 1-5 years',
          'Export to Excel for detailed cost analysis',
          'Keep task descriptions clear and measurable',
        ],
      },
    },
    {
      id: 'maintenance-frequencies',
      title: 'Maintenance Frequencies',
      icon: Calendar,
      description: 'Understanding visit frequencies and scheduling',
      content: {
        overview: 'Maintenance tasks can be scheduled at different frequencies to match equipment requirements and client needs. Each frequency has its own cost calculation based on visits per year.',
        steps: [
          'Select appropriate frequency for each task',
          'Enter number of visits for that frequency',
          'System automatically calculates visits per year',
          'Labour costs multiply by number of visits',
          'Materials and consumables calculated per visit',
          'View total costs by frequency in summary',
          'Combine multiple frequencies for comprehensive coverage',
        ],
        tips: [
          'Weekly: 52 visits per year - for critical equipment',
          'Monthly: 12 visits per year - for regular maintenance',
          'Quarterly: 4 visits per year - for periodic checks',
          'Bimonthly: 6 visits per year - for semi-regular service',
          'Halfyearly: 2 visits per year - for mid-year reviews',
          'Annual: 1 visit per year - for yearly inspections',
          'Match frequency to manufacturer recommendations',
          'Consider compliance and regulatory requirements',
          'Balance cost with risk of equipment failure',
        ],
      },
    },
    {
      id: 'settings',
      title: 'Settings & Preferences',
      icon: Settings,
      description: 'Configure system settings and preferences',
      content: {
        overview: 'Customize the system to match your workflow with various settings and preferences.',
        steps: [
          'Access Settings from the Dashboard',
          'Update your profile information',
          'Configure automatic backup settings',
          'Manage department categories',
          'Set default labour rates (admin only)',
          'Configure notification preferences',
        ],
        tips: [
          'Enable auto-backup for peace of mind',
          'Customize departments to match your business structure',
          'Keep your profile information up to date',
          'Review settings periodically',
        ],
      },
    },
  ];

  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) return features;

    const query = searchQuery.toLowerCase();
    return features.filter((feature) => {
      return (
        feature.title.toLowerCase().includes(query) ||
        feature.description.toLowerCase().includes(query) ||
        feature.content.overview.toLowerCase().includes(query) ||
        feature.content.steps.some((step) => step.toLowerCase().includes(query)) ||
        feature.content.tips.some((tip) => tip.toLowerCase().includes(query))
      );
    });
  }, [searchQuery]);

  const toggleFeature = (id: string) => {
    setExpandedFeature(expandedFeature === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Feature Guides</h3>
        <p className="text-gray-600">
          Detailed documentation for each feature in the quotation system.
        </p>
      </div>

      {filteredFeatures.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No features found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeatures.map((feature) => (
            <div key={feature.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFeature(feature.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-gray-900">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
                {expandedFeature === feature.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedFeature === feature.id && (
                <div className="p-6 pt-2 border-t border-gray-200 space-y-6">
                  <div>
                    <h5 className="font-bold text-gray-900 mb-2">Overview</h5>
                    <p className="text-gray-700">{feature.content.overview}</p>
                  </div>

                  <div>
                    <h5 className="font-bold text-gray-900 mb-3">How to Use</h5>
                    <ol className="space-y-2">
                      {feature.content.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-700">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </span>
                          <span className="pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <h5 className="font-bold text-gray-900 mb-3">Tips & Best Practices</h5>
                    <ul className="space-y-2">
                      {feature.content.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeatureGuides;
