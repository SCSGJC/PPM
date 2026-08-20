import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { MaintenanceProposalData, FrequencyType, frequencyColumns } from '../types/maintenance';

interface MaintenanceInternalReportProps {
  proposal: MaintenanceProposalData;
  onClose: () => void;
}

export function MaintenanceInternalReport({ proposal, onClose }: MaintenanceInternalReportProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getFrequencyLabel = (freqKey: string): string => {
    const freq = frequencyColumns.find(f => f.key === freqKey);
    return freq?.label || freqKey;
  };

  const getLabourRateName = (rateValue: number): string => {
    const rate = proposal.labourRates.find(r => {
      const effectiveRate = r.overrideRate !== undefined ? r.overrideRate : r.base;
      return Math.abs(effectiveRate - rateValue) < 0.01;
    });
    return rate?.name || `Rate ${rateValue}`;
  };

  const calculateTaskSubtotal = (): number => {
    return proposal.tasks.reduce((taskSum, task) => {
      const activeFreqs = Array.from(task.activeFrequencies);
      return taskSum + activeFreqs.reduce((freqSum, freqKey) => {
        const freqData = task.frequencies[freqKey as FrequencyType];
        return freqSum + (freqData?.quote || 0);
      }, 0);
    }, 0);
  };

  const calculateAdditionalCostsTotal = (): number => {
    const { emergencyCallouts, materials, specialistSubcontractors, laboratoryTesting } = proposal.additionalCosts;
    const { materialsAddonPerc, subcontractorAddonPerc, laboratoryTestingAddonPerc } = proposal.additionalCosts;

    return emergencyCallouts +
      (materials * (1 + materialsAddonPerc / 100)) +
      (specialistSubcontractors * (1 + subcontractorAddonPerc / 100)) +
      (laboratoryTesting * (1 + laboratoryTestingAddonPerc / 100));
  };

  const calculateSubtotal = (): number => {
    return calculateTaskSubtotal() + calculateAdditionalCostsTotal();
  };

  const calculateProvisionalSumsTotal = (): number => {
    return proposal.adjustments.provisionalSums.reduce((sum, ps) => sum + ps.amount, 0);
  };

  const calculateGrandTotal = (): number => {
    const subtotal = calculateSubtotal();
    const provisionalSums = calculateProvisionalSumsTotal();
    const contingencyAmount = (subtotal + provisionalSums) * (proposal.adjustments.overallContingencyPct / 100);
    return subtotal + provisionalSums + contingencyAmount;
  };

  const calculateMonthlyPayment = (): number => {
    const total = calculateGrandTotal();
    const months = proposal.header.contractPeriod || 12;
    return total / months;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #internal-report-print, #internal-report-print * {
            visibility: visible;
          }
          #internal-report-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 15mm;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
        <div className="bg-white rounded-lg w-full max-w-[1400px] max-h-[95vh] flex flex-col">
          <div className="flex justify-between items-center p-6 border-b no-print">
            <h2 className="text-2xl font-bold text-green-800">Internal Cost Breakdown Report</h2>
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors font-medium flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Report
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="overflow-auto flex-1">
            <div id="internal-report-print" ref={printRef} style={{ padding: '30px', backgroundColor: 'white' }}>
              {/* Header */}
              <div style={{
                backgroundColor: '#047857',
                color: 'white',
                padding: '25px',
                borderRadius: '12px',
                marginBottom: '30px'
              }}>
                <h1 style={{
                  fontSize: '24pt',
                  fontWeight: 'bold',
                  margin: 0,
                  marginBottom: '20px'
                }}>
                  INTERNAL COST BREAKDOWN REPORT
                </h1>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '11pt' }}>
                  <div><strong>Client:</strong> {proposal.header.clientName}</div>
                  <div><strong>Job Number:</strong> {proposal.header.jobNumber}</div>
                  <div><strong>Site:</strong> {proposal.header.site}</div>
                  <div><strong>Project:</strong> {proposal.header.project}</div>
                  <div><strong>Prepared By:</strong> {proposal.header.preparedBy}</div>
                  <div><strong>Contract Period:</strong> {proposal.header.contractPeriod} months</div>
                </div>
              </div>

              {/* Labour Rates Table */}
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{
                  fontSize: '16pt',
                  fontWeight: 'bold',
                  color: '#047857',
                  marginBottom: '15px',
                  paddingBottom: '10px',
                  borderBottom: '2px solid #047857'
                }}>
                  Labour Rates
                </h2>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '10pt',
                  marginBottom: '20px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f0fdf4' }}>
                      <th style={{ border: '1px solid #d1fae5', padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#047857' }}>
                        Rate Description
                      </th>
                      <th style={{ border: '1px solid #d1fae5', padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#047857' }}>
                        Base Rate
                      </th>
                      <th style={{ border: '1px solid #d1fae5', padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#047857' }}>
                        Override Rate
                      </th>
                      <th style={{ border: '1px solid #d1fae5', padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#047857' }}>
                        Effective Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.labourRates.map((rate, idx) => (
                      <tr key={rate.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>{rate.name}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'right' }}>
                          {formatCurrency(rate.base)}
                        </td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'right' }}>
                          {rate.overrideRate !== undefined ? formatCurrency(rate.overrideRate) : '-'}
                        </td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatCurrency(rate.overrideRate !== undefined ? rate.overrideRate : rate.base)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detailed Task Breakdown */}
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{
                  fontSize: '16pt',
                  fontWeight: 'bold',
                  color: '#047857',
                  marginBottom: '15px',
                  paddingBottom: '10px',
                  borderBottom: '2px solid #047857'
                }}>
                  Detailed Task Cost Breakdown
                </h2>

                {proposal.tasks.map((task, taskIndex) => {
                  const activeFreqs = Array.from(task.activeFrequencies);
                  if (activeFreqs.length === 0) return null;

                  return (
                    <div key={task.id} style={{
                      marginBottom: '25px',
                      border: '2px solid #d1fae5',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        backgroundColor: '#047857',
                        color: 'white',
                        padding: '12px 15px',
                        fontWeight: 'bold',
                        fontSize: '11pt'
                      }}>
                        Task {task.number}: {task.taskDescription}
                      </div>

                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '9pt'
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f0fdf4' }}>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'left', fontSize: '8pt' }}>Frequency</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'center', fontSize: '8pt' }}>Visits</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'center', fontSize: '8pt' }}>Hours</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'center', fontSize: '8pt' }}>Men</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'left', fontSize: '8pt' }}>Rate</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'center', fontSize: '8pt' }}>OT%</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'center', fontSize: '8pt' }}>Admin%</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'right', fontSize: '8pt' }}>Labour Cost</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'right', fontSize: '8pt' }}>Consumables</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'center', fontSize: '8pt' }}>OHP%</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'right', fontSize: '8pt' }}>Materials</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'center', fontSize: '8pt' }}>OHP%</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'right', fontSize: '8pt' }}>Subcontractor</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'center', fontSize: '8pt' }}>OHP%</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'right', fontSize: '8pt' }}>Lab Testing</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'center', fontSize: '8pt' }}>OHP%</th>
                            <th style={{ border: '1px solid #d1fae5', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '8pt' }}>Total Quote</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeFreqs.map((freqKey, idx) => {
                            const freqData = task.frequencies[freqKey as FrequencyType];
                            const labourCost = freqData.hours * freqData.noOfMen * freqData.rate *
                              (1 + freqData.otPremium / 100) * (1 + freqData.adminMarkup / 100);

                            return (
                              <tr key={freqKey} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px' }}>{getFrequencyLabel(freqKey)}</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center' }}>{freqData.noOfVisit}</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center' }}>{freqData.hours}</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center' }}>{freqData.noOfMen}</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px' }}>{getLabourRateName(freqData.rate)}</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center' }}>{freqData.otPremium}%</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center' }}>{freqData.adminMarkup}%</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right', fontWeight: '600' }}>
                                  {formatCurrency(labourCost)}
                                </td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right' }}>
                                  {formatCurrency(freqData.consumables)}
                                </td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center' }}>{freqData.ohpConsumables}%</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right' }}>
                                  {formatCurrency(freqData.materialsPlantHire)}
                                </td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center' }}>{freqData.ohpMaterialsPlantHire}%</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right' }}>
                                  {formatCurrency(freqData.subContractor)}
                                </td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center' }}>{freqData.ohpSubContractor}%</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right' }}>
                                  {formatCurrency(freqData.laboratoryTesting || 0)}
                                </td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center' }}>{freqData.ohpLaboratoryTesting || 0}%</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f0fdf4' }}>
                                  {formatCurrency(freqData.quote)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>

              {/* Financial Summary */}
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '3px solid #047857',
                borderRadius: '12px',
                padding: '25px',
                marginBottom: '30px'
              }}>
                <h2 style={{
                  fontSize: '16pt',
                  fontWeight: 'bold',
                  color: '#047857',
                  marginTop: 0,
                  marginBottom: '20px'
                }}>
                  Financial Summary
                </h2>

                <table style={{ width: '100%', fontSize: '11pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #d1fae5' }}>Tasks Subtotal</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #d1fae5' }}>
                        {formatCurrency(calculateTaskSubtotal())}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #d1fae5' }}>Additional Costs</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #d1fae5' }}>
                        {formatCurrency(calculateAdditionalCostsTotal())}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: 'white' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold', fontSize: '12pt', color: '#047857' }}>Subtotal (before contingency)</td>
                      <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', fontSize: '13pt', color: '#047857' }}>
                        {formatCurrency(calculateSubtotal())}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #d1fae5' }}>
                        Provisional Sums ({proposal.adjustments.provisionalSums.length} items)
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #d1fae5' }}>
                        {formatCurrency(calculateProvisionalSumsTotal())}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid #d1fae5' }}>
                        Contingency ({proposal.adjustments.overallContingencyPct}%)
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #d1fae5' }}>
                        {formatCurrency((calculateSubtotal() + calculateProvisionalSumsTotal()) * (proposal.adjustments.overallContingencyPct / 100))}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#047857', color: 'white' }}>
                      <td style={{ padding: '20px', fontWeight: 'bold', fontSize: '14pt' }}>GRAND TOTAL</td>
                      <td style={{ padding: '20px', textAlign: 'right', fontWeight: 'bold', fontSize: '16pt' }}>
                        {formatCurrency(calculateGrandTotal())}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '15px 0', fontWeight: 'bold', fontSize: '11pt', color: '#047857' }}>
                        Monthly Payment ({proposal.header.contractPeriod} months)
                      </td>
                      <td style={{ padding: '15px 0', textAlign: 'right', fontWeight: 'bold', fontSize: '13pt', color: '#047857' }}>
                        {formatCurrency(calculateMonthlyPayment())}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Provisional Sums Detail */}
              {proposal.adjustments.provisionalSums.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h2 style={{
                    fontSize: '16pt',
                    fontWeight: 'bold',
                    color: '#047857',
                    marginBottom: '15px',
                    paddingBottom: '10px',
                    borderBottom: '2px solid #047857'
                  }}>
                    Provisional Sums Detail
                  </h2>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '10pt'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f0fdf4' }}>
                        <th style={{ border: '1px solid #d1fae5', padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#047857' }}>
                          Description
                        </th>
                        <th style={{ border: '1px solid #d1fae5', padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#047857', width: '200px' }}>
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.adjustments.provisionalSums.map((ps, idx) => (
                        <tr key={ps.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={{ border: '1px solid #e5e7eb', padding: '10px' }}>{ps.description}</td>
                          <td style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                            {formatCurrency(ps.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              <div style={{
                marginTop: '40px',
                paddingTop: '20px',
                borderTop: '2px solid #047857',
                textAlign: 'center',
                fontSize: '9pt',
                color: '#6b7280'
              }}>
                <p style={{ margin: 0 }}>
                  CONFIDENTIAL - Internal Use Only | Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
