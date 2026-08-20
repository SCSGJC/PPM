import React from 'react';
import { LucideIcon, FileText, FolderOpen, Search, AlertCircle, Inbox, Users, MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default'
}: EmptyStateProps) {
  const defaultIcon = variant === 'search' ? Search : variant === 'error' ? AlertCircle : Inbox;
  const IconComponent = Icon || defaultIcon;

  const variantColors = {
    default: 'text-[var(--muted)]',
    search: 'text-blue-400',
    error: 'text-red-400'
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className={`rounded-full bg-gray-50 p-6 mb-4 ${variantColors[variant]}`}>
        <IconComponent className="w-12 h-12" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted)] mb-6 max-w-md">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-[var(--primary)] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[var(--primary-700)] transition-all hover:scale-105 hover:shadow-lg"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function EmptyQuotations({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No Quotations Yet"
      description="Get started by creating your first quotation. You can add line items, calculate costs, and generate professional reports."
      action={{
        label: 'Create Your First Quotation',
        onClick: onCreateNew
      }}
    />
  );
}

export function EmptySearchResults({ searchTerm }: { searchTerm: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No Results Found"
      description={`We couldn't find any quotations matching "${searchTerm}". Try adjusting your search or create a new quotation.`}
      variant="search"
    />
  );
}

export function EmptyLineItems({ onAddItem }: { onAddItem: () => void }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No Line Items"
      description="This section is empty. Add your first line item to start building your quotation."
      action={{
        label: 'Add Line Item',
        onClick: onAddItem
      }}
    />
  );
}

export function EmptyComponents({ onAddComponent }: { onAddComponent: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="No Saved Components"
      description="Save commonly used line items as reusable components to speed up your quotation process."
      action={{
        label: 'Create Component',
        onClick: onAddComponent
      }}
    />
  );
}

export function EmptyComments() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No Comments Yet"
      description="Start a conversation about this line item. Add notes, questions, or suggestions for your team."
    />
  );
}

export function EmptyActivityLog() {
  return (
    <EmptyState
      icon={FileText}
      title="No Activity Yet"
      description="Activity will appear here as changes are made to this quotation."
    />
  );
}

export function EmptySharedQuotations() {
  return (
    <EmptyState
      icon={Users}
      title="No Shared Quotations"
      description="Quotations shared with you by team members will appear here."
    />
  );
}
