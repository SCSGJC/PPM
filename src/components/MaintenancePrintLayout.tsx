import React from 'react';
import { MaintenanceProposalData, frequencyColumns } from '../types/maintenance';

interface MaintenancePrintLayoutProps {
  proposal: MaintenanceProposalData;
  isVisible: boolean;
}

export function MaintenancePrintLayout({ proposal, isVisible }: MaintenancePrintLayoutProps) {
  const calculateTotals = () => {
    const frequencyTotals: Record<string, number> = {};
    frequencyColumns.forEach(freq => {
      frequencyTotals[freq.key] = 0;
    });

    proposal.tasks.forEach(task => {
      frequencyColumns.forEach(freq => {
        frequencyTotals[freq.key] += task.frequencies[freq.key].quote || 0;
      });
    });

    return frequencyTotals;
  };

  const calculateGrandTotal = () => {
    const totals = calculateTotals();
    const subtotal = Object.values(totals).reduce((sum, val) => sum + val, 0);
    const contingencyAmount = (subtotal * (proposal.adjustments.overallContingencyPct || 0)) / 100;
    const provisionalTotal = proposal.adjustments.provisionalSums.reduce((sum, ps) => sum + (ps.amount || 0), 0);
    return subtotal + contingencyAmount + provisionalTotal;
  };

  const calculateSubtotal = () => {
    const totals = calculateTotals();
    return Object.values(totals).reduce((sum, val) => sum + val, 0);
  };

  const calculateContingencyAmount = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * (proposal.adjustments.overallContingencyPct || 0)) / 100;
  };

  const calculateProvisionalTotal = () => {
    return proposal.adjustments.provisionalSums.reduce((sum, ps) => sum + (ps.amount || 0), 0);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const totals = calculateTotals();
  const grandTotal = calculateGrandTotal();

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div
      id="maintenance-print-container"
      style={{ display: isVisible ? 'block' : 'none' }}
      className="print-only"
    >
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 15mm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-only {
            display: block !important;
          }

          .no-print {
            display: none !important;
          }

          .page-break {
            page-break-before: always;
          }

          table {
            page-break-inside: avoid;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }

        .maintenance-print-layout {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          font-size: 10pt;
          color: #1f2937;
          background: white;
          padding: 20px;
          line-height: 1.5;
        }

        .maintenance-print-header {
          background: linear-gradient(135deg, #047857 0%, #059669 100%);
          padding: 40px;
          margin: -20px -20px 30px -20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .maintenance-header-logo {
          height: 60px;
          width: auto;
          margin-right: 20px;
          filter: brightness(0) invert(1);
        }

        .maintenance-header-left {
          display: flex;
          align-items: center;
        }

        .maintenance-header-left-text {
          display: flex;
          flex-direction: column;
        }

        .maintenance-header-left h1 {
          font-size: 32pt;
          font-weight: bold;
          color: white;
          margin: 0 0 8px 0;
          letter-spacing: 1px;
        }

        .maintenance-header-left p {
          font-size: 13pt;
          color: white;
          margin: 0;
          opacity: 0.95;
        }

        .maintenance-header-right {
          background: rgba(255, 255, 255, 0.95);
          padding: 20px 30px;
          border-radius: 8px;
          text-align: center;
          min-width: 200px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .maintenance-header-right .reference-label {
          font-size: 11pt;
          color: #047857;
          font-weight: 600;
          margin: 0 0 8px 0;
        }

        .maintenance-header-right .reference-number {
          font-size: 24pt;
          font-weight: bold;
          color: #1f2937;
          margin: 0 0 10px 0;
        }

        .maintenance-header-right .reference-date {
          font-size: 11pt;
          color: #1f2937;
          margin: 0;
        }

        .client-info-section {
          background: white;
          border: 3px solid #047857;
          border-radius: 8px;
          padding: 25px;
          margin-bottom: 30px;
        }

        .client-info-title {
          font-size: 18pt;
          font-weight: bold;
          color: #047857;
          margin: 0 0 20px 0;
          padding-bottom: 10px;
          border-bottom: 2px solid #d1fae5;
        }

        .client-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .client-info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .client-info-label {
          font-size: 9pt;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .client-info-value {
          font-size: 12pt;
          color: #1f2937;
          font-weight: 600;
        }

        .maintenance-section-header {
          font-size: 13pt;
          font-weight: 700;
          color: #047857;
          background: linear-gradient(to right, #d1fae5, white);
          padding: 10px 12px;
          margin: 20px 0 12px 0;
          border-left: 4px solid #047857;
        }

        .maintenance-info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 10pt;
        }

        .maintenance-info-table td {
          padding: 6px 10px;
          border: 1px solid #e5e7eb;
        }

        .maintenance-info-table td:nth-child(odd) {
          background-color: #f9fafb;
          font-weight: 600;
          width: 25%;
        }

        .maintenance-tasks-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 9pt;
        }

        .maintenance-tasks-table th {
          background: linear-gradient(to bottom, #047857, #059669);
          color: white;
          padding: 10px 6px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #047857;
          font-size: 9pt;
        }

        .maintenance-tasks-table td {
          padding: 8px 6px;
          border: 1px solid #e5e7eb;
        }

        .maintenance-tasks-table tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }

        .maintenance-tasks-table tbody tr:hover {
          background-color: #f3f4f6;
        }

        .maintenance-totals-row {
          background-color: #d1fae5 !important;
          font-weight: bold;
          border-top: 2px solid #047857 !important;
        }

        .maintenance-totals-row td {
          background-color: #d1fae5;
          border-top: 2px solid #047857;
          padding: 10px 6px !important;
        }

        .maintenance-grand-total {
          background: linear-gradient(to right, #047857, #059669) !important;
          color: white !important;
          font-weight: bold;
          font-size: 11pt;
        }

        .maintenance-grand-total td {
          background: transparent;
          color: white;
          border: 1px solid #047857;
          padding: 12px 6px !important;
        }

        .maintenance-note-box {
          margin: 10px 0;
          padding: 12px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 4px;
        }

        .maintenance-note-title {
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 8px;
          font-size: 11pt;
        }

        .maintenance-note-content {
          white-space: pre-wrap;
          line-height: 1.6;
          color: #374151;
        }

        .maintenance-print-footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          font-size: 9pt;
          color: #6b7280;
        }

        .maintenance-print-footer p {
          margin: 4px 0;
        }

        .text-right {
          text-align: right;
        }

        .text-center {
          text-align: center;
        }
      `}</style>

      <div className="maintenance-print-layout">
        {/* Print Header - Matches BETA report style */}
        <div className="maintenance-print-header">
          <div className="maintenance-header-left">
            <img
              src={`${window.location.origin}/scs_adim_(small).png`}
              alt="SCS Logo"
              className="maintenance-header-logo"
            />
            <div className="maintenance-header-left-text">
              <h1>MAINTENANCE PROPOSAL</h1>
              <p>Prepared by: {proposal.header.preparedBy || 'N/A'}</p>
            </div>
          </div>
          <div className="maintenance-header-right">
            <p className="reference-label">Reference</p>
            <p className="reference-number">{proposal.header.jobNumber || 'N/A'}</p>
            <p className="reference-date">{currentDate}</p>
          </div>
        </div>

        {/* Client Information - Matches BETA report style */}
        <div className="client-info-section">
          <h2 className="client-info-title">Client Information</h2>
          <div className="client-info-grid">
            <div className="client-info-item">
              <div className="client-info-label">Customer Name</div>
              <div className="client-info-value">{proposal.header.clientName || 'N/A'}</div>
            </div>
            <div className="client-info-item">
              <div className="client-info-label">Customer Number</div>
              <div className="client-info-value">{proposal.header.customerNumber || 'N/A'}</div>
            </div>
            <div className="client-info-item">
              <div className="client-info-label">Site Location</div>
              <div className="client-info-value">{proposal.header.site || 'N/A'}</div>
            </div>
            <div className="client-info-item">
              <div className="client-info-label">Project</div>
              <div className="client-info-value">{proposal.header.project || 'N/A'}</div>
            </div>
            <div className="client-info-item">
              <div className="client-info-label">Prepared By</div>
              <div className="client-info-value">{proposal.header.preparedBy || 'N/A'}</div>
            </div>
            <div className="client-info-item">
              <div className="client-info-label">Contract Period</div>
              <div className="client-info-value">{proposal.header.contractPeriod || 12} months</div>
            </div>
          </div>
        </div>

        {/* Maintenance Tasks Section */}
        <div className="maintenance-section-header">Maintenance Tasks & Schedule</div>

        {proposal.tasks.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
            No tasks have been added to this proposal.
          </div>
        ) : (
          <table className="maintenance-tasks-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}>#</th>
                <th style={{ width: '150px' }}>Task Description</th>
                <th style={{ width: '60px' }}>Number</th>
                {frequencyColumns.map(freq => (
                  <th key={freq.key} className="text-right" style={{ width: '80px' }}>
                    {freq.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposal.tasks.map((task, index) => (
                <tr key={task.id}>
                  <td>{index + 1}</td>
                  <td>{task.taskDescription || 'No description'}</td>
                  <td>{task.number || ''}</td>
                  {frequencyColumns.map(freq => (
                    <td key={freq.key} className="text-right">
                      {task.frequencies[freq.key].quote > 0
                        ? formatCurrency(task.frequencies[freq.key].quote)
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="maintenance-totals-row">
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>SUBTOTALS:</td>
                {frequencyColumns.map(freq => (
                  <td key={freq.key} className="text-right">
                    {formatCurrency(totals[freq.key])}
                  </td>
                ))}
              </tr>
              <tr className="maintenance-totals-row">
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL (all frequencies):</td>
                <td colSpan={frequencyColumns.length} className="text-right">
                  {formatCurrency(calculateSubtotal())}
                </td>
              </tr>
              {(proposal.adjustments.overallContingencyPct || 0) > 0 && (
                <tr className="maintenance-totals-row">
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    Overall Contingency ({(proposal.adjustments.overallContingencyPct || 0).toFixed(1)}%):
                  </td>
                  <td colSpan={frequencyColumns.length} className="text-right">
                    {formatCurrency(calculateContingencyAmount())}
                  </td>
                </tr>
              )}
              {proposal.adjustments.provisionalSums.length > 0 && calculateProvisionalTotal() > 0 && (
                <tr className="maintenance-totals-row">
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>Provisional Sums:</td>
                  <td colSpan={frequencyColumns.length} className="text-right">
                    {formatCurrency(calculateProvisionalTotal())}
                  </td>
                </tr>
              )}
              <tr className="maintenance-grand-total">
                <td colSpan={3} style={{ textAlign: 'right' }}>GRAND TOTAL:</td>
                <td colSpan={frequencyColumns.length} className="text-right">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {proposal.adjustments.provisionalSums.length > 0 && (
          <div style={{ marginTop: '25px' }}>
            <div className="maintenance-section-header">Provisional Sums Breakdown</div>
            <table className="maintenance-tasks-table" style={{ marginTop: '10px' }}>
              <thead>
                <tr>
                  <th style={{ width: '70%' }}>Description</th>
                  <th className="text-right" style={{ width: '30%' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {proposal.adjustments.provisionalSums.map((sum, index) => (
                  <tr key={sum.id}>
                    <td>{sum.description || `Provisional Sum ${index + 1}`}</td>
                    <td className="text-right">{formatCurrency(sum.amount)}</td>
                  </tr>
                ))}
                <tr className="maintenance-totals-row">
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                  <td className="text-right">{formatCurrency(calculateProvisionalTotal())}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {proposal.notes.inclusionsExclusions && proposal.notes.inclusionsExclusions.trim() !== 'Inclusions:\n\nExclusions:\n\n' && (
          <div style={{ marginTop: '25px' }} className="page-break">
            <div className="maintenance-section-header">Inclusions / Exclusions</div>
            <div className="maintenance-note-box">
              <div className="maintenance-note-content">{proposal.notes.inclusionsExclusions}</div>
            </div>
          </div>
        )}

        {(proposal.notes.scopeOfWork || proposal.notes.inclusions || proposal.notes.exclusions || proposal.notes.terms) && (
          <div style={{ marginTop: '25px' }} className="page-break">
            <div className="maintenance-section-header">Proposal Details</div>

            {proposal.notes.scopeOfWork && (
              <div className="maintenance-note-box">
                <div className="maintenance-note-title">Scope of Work</div>
                <div className="maintenance-note-content">{proposal.notes.scopeOfWork}</div>
              </div>
            )}

            {proposal.notes.inclusions && (
              <div className="maintenance-note-box">
                <div className="maintenance-note-title">Inclusions</div>
                <div className="maintenance-note-content">{proposal.notes.inclusions}</div>
              </div>
            )}

            {proposal.notes.exclusions && (
              <div className="maintenance-note-box">
                <div className="maintenance-note-title">Exclusions</div>
                <div className="maintenance-note-content">{proposal.notes.exclusions}</div>
              </div>
            )}

            {proposal.notes.terms && (
              <div className="maintenance-note-box">
                <div className="maintenance-note-title">Terms & Conditions</div>
                <div className="maintenance-note-content">{proposal.notes.terms}</div>
              </div>
            )}
          </div>
        )}

        {proposal.submission.issuedPrice !== null && (
          <div style={{ marginTop: '25px' }}>
            <div className="maintenance-section-header">Submission Information</div>
            <div className="maintenance-note-box">
              {proposal.submission.quotedText && (
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>Type: </span>
                  <span>{proposal.submission.quotedText}</span>
                </div>
              )}
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Issued Price: </span>
                <span style={{ fontSize: '12pt', fontWeight: 'bold', color: '#047857' }}>
                  {formatCurrency(proposal.submission.issuedPrice)}
                </span>
              </div>
              {proposal.submission.confirmedAt && (
                <div style={{ fontSize: '9pt', color: '#6b7280' }}>
                  Confirmed on {new Date(proposal.submission.confirmedAt).toLocaleString('en-GB', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Print Footer - Matches BETA client format */}
        <div className="maintenance-print-footer">
          <p>Generated by SCS Quotation Software V1.1.1 | {currentDate} | All figures shown are ex-VAT</p>
        </div>
      </div>
    </div>
  );
}
