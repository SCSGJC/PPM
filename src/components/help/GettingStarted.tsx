import React from 'react';
import { FileText, Users, DollarSign, Upload, CheckCircle, Settings } from 'lucide-react';

const GettingStarted: React.FC = () => {
  const steps = [
    {
      number: 1,
      title: 'Create Your Account',
      description: 'Your administrator will create an account for you. Once approved, you can log in and start creating quotations.',
      icon: Users,
      details: [
        'Wait for admin approval after account creation',
        'Check your email for login credentials',
        'Log in using your email and password',
        'Update your profile information in Settings',
      ],
    },
    {
      number: 2,
      title: 'Set Up Your First Quotation',
      description: 'Start by entering basic project information to create your first quotation.',
      icon: FileText,
      details: [
        'Click "New Quotation" from the Dashboard',
        'Enter Job Number and Project Information',
        'Fill in Customer details, Site, and Project name',
        'Add any preliminary notes or references',
      ],
    },
    {
      number: 3,
      title: 'Add Line Items',
      description: 'Build your quotation by adding line items with materials, labour, and equipment costs.',
      icon: DollarSign,
      details: [
        'Use "Add Section" to organize items by category',
        'Click "Add Line Item" to add individual items',
        'Enter description, quantities, and rates',
        'Use the Component Library for quick access to common items',
        'Add comments to line items for internal notes',
      ],
    },
    {
      number: 4,
      title: 'Add Supporting Documentation',
      description: 'Enhance your quotation with photos and additional documentation.',
      icon: Upload,
      details: [
        'Upload survey photos in the Survey Photos section',
        'Add captions to describe each photo',
        'Include inclusions and exclusions',
        'Add terms and conditions',
      ],
    },
    {
      number: 5,
      title: 'Review and Submit',
      description: 'Review your quotation, apply final adjustments, and submit for approval.',
      icon: CheckCircle,
      details: [
        'Review all line items and totals',
        'Apply final adjustments (markup/discount)',
        'Check the submission preview',
        'Submit the quotation when ready',
        'Export to Excel or PDF as needed',
      ],
    },
    {
      number: 6,
      title: 'Explore Advanced Features',
      description: 'Take advantage of advanced features to improve efficiency.',
      icon: Settings,
      details: [
        'Use the Component Library to save frequently used items',
        'Share quotations with team members for collaboration',
        'View version history and create revisions',
        'Set up automatic backups in Settings',
        'Manage your department categories',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Getting Started Guide</h3>
        <p className="text-gray-600">
          Follow these steps to create your first quotation and become familiar with the system.
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((step) => (
          <div key={step.number} className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {step.number}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <step.icon className="w-6 h-6 text-blue-600" />
                  <h4 className="text-xl font-bold text-gray-900">{step.title}</h4>
                </div>
                <p className="text-gray-600 mb-4">{step.description}</p>
                <ul className="space-y-2">
                  {step.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Quick Tips for Success
        </h4>
        <ul className="space-y-2 text-sm text-green-800">
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>Save your work frequently - the system auto-saves, but manual saves ensure nothing is lost</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>Use meaningful section names to organize your quotation clearly</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>Add comments to line items for internal notes that won't appear on the final quotation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>Explore the Component Library to speed up quotation creation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>Use keyboard shortcuts to navigate faster (see Keyboard Shortcuts section)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>Double-check all totals and calculations before submitting your quotation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>Use the version history feature to track changes and restore previous versions if needed</span>
          </li>
        </ul>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-bold text-blue-900 mb-3">Common Workflows</h4>
        <div className="space-y-4">
          <div>
            <h5 className="font-semibold text-blue-900 mb-2">Creating a Simple Quotation</h5>
            <p className="text-sm text-blue-800">Dashboard → New Quotation → Fill Project Info → Add Line Items → Review → Save → Submit</p>
          </div>
          <div>
            <h5 className="font-semibold text-blue-900 mb-2">Duplicating an Existing Quotation</h5>
            <p className="text-sm text-blue-800">Dashboard → Browse Quotations → Select Quote → Save As New → Modify Details → Save</p>
          </div>
          <div>
            <h5 className="font-semibold text-blue-900 mb-2">Sharing a Quotation with Team</h5>
            <p className="text-sm text-blue-800">Open Quotation → Settings → Share → Add Team Members → Set Permissions → Save</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GettingStarted;
