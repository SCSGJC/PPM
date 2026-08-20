import React, { useState, useRef, useEffect } from 'react';
import { MaintenanceProposalData, MaintenanceTask, FrequencyType, frequencyColumns } from '../types/maintenance';
import html2pdf from 'html2pdf.js';
import { profileService } from '../services/profileService';
import logoImage from '/SCS-logo_(small).png';
import coverPageImage from '/Cover_Page.png';

interface MaintenanceProposalReportProps {
  proposal: MaintenanceProposalData;
  onClose: () => void;
}

export function MaintenanceProposalReport({ proposal, onClose }: MaintenanceProposalReportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [authorSignature, setAuthorSignature] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string>('');

  useEffect(() => {
    loadAuthorSignature();
  }, []);

  const loadAuthorSignature = async () => {
    const { data } = await profileService.getCurrentUserProfile();
    if (data?.signature_url) {
      setAuthorSignature(data.signature_url);
    }
    if (data?.full_name) {
      setAuthorName(data.full_name);
    }
  };

  const loadImageAsDataURL = async (imageUrl: string): Promise<string> => {
    try {
      console.log('Loading image from:', imageUrl);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.warn(`Failed to load image: ${imageUrl} (status: ${response.status})`);
        return '';
      }
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn(`Error loading image ${imageUrl}:`, error);
      return '';
    }
  };

  const removeWhiteBackground = async (imageDataURL: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageDataURL);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (r > 240 && g > 240 && b > 240) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imageDataURL);
      img.src = imageDataURL;
    });
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const currentDate = new Date().toLocaleDateString('en-GB');

      // Pre-load images as data URLs using Vite imports
      console.log('Loading images...');
      const logoDataURL = await loadImageAsDataURL(logoImage);
      console.log('Logo loaded:', logoDataURL ? `Yes (${logoDataURL.substring(0, 50)}...)` : 'Failed');
      const coverPageDataURL = await loadImageAsDataURL(coverPageImage);
      console.log('Cover page loaded:', coverPageDataURL ? `Yes (${coverPageDataURL.substring(0, 50)}...)` : 'Failed');

      let signatureDataURL = '';
      if (authorSignature) {
        try {
          console.log('Fetching signature from:', authorSignature);
          const signatureUrl = authorSignature.includes('?') ? authorSignature : `${authorSignature}?t=${Date.now()}`;
          const response = await fetch(signatureUrl);
          console.log('Signature fetch response:', response.status, response.ok);
          if (response.ok) {
            const blob = await response.blob();
            console.log('Signature blob size:', blob.size);
            const rawSignatureDataURL = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                console.log('Signature converted to data URL, length:', (reader.result as string).length);
                resolve(reader.result as string);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            console.log('Removing white background from signature...');
            signatureDataURL = await removeWhiteBackground(rawSignatureDataURL);
            console.log('Transparent signature ready');
          } else {
            console.error('Failed to fetch signature, status:', response.status);
          }
        } catch (error) {
          console.error('Error loading signature:', error);
        }
      } else {
        console.log('No author signature available');
      }

      console.log('Author name:', authorName);
      console.log('Signature data URL available:', !!signatureDataURL);
      console.log('Will add signature section to PDF:', !!signatureDataURL);
      if (signatureDataURL) {
        console.log('Signature data URL preview:', signatureDataURL.substring(0, 100) + '...');
      }

      // Calculate totals
      const subtotal = calculateSubtotal();
      const grandTotal = calculateGrandTotal();

      // Build tasks HTML
      let tasksHTML = '';
      proposal.tasks.forEach((task, taskIndex) => {
        const activeFreqs = Array.from(task.activeFrequencies);

        if (activeFreqs.length === 0) return;

        activeFreqs.forEach((freqKey, freqIndex) => {
          const freq = frequencyColumns.find(f => f.key === freqKey);
          const freqData = task.frequencies[freqKey];
          const bgColor = taskIndex % 2 === 0 ? 'white' : '#f9fafb';

          // Determine border styles based on position
          const isFirstRow = freqIndex === 0;
          const isLastRow = freqIndex === activeFreqs.length - 1;

          tasksHTML += `
            <tr style="background-color: ${bgColor};">
              ${isFirstRow ? `
                <td rowspan="${activeFreqs.length}" style="border: 1px solid #e5e7eb; padding: 12px; vertical-align: top;">
                  <div style="font-weight: 600; margin-bottom: 4px;">${task.taskDescription || 'No description'}</div>
                  ${task.taskNumber ? `<div style="font-size: 9pt; color: #6b7280;">Task #${task.taskNumber}</div>` : ''}
                </td>
              ` : ''}
              <td style="border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-top: ${isFirstRow ? '1px' : '1px'} solid #e5e7eb; border-bottom: ${isLastRow ? '1px' : '1px'} solid #e5e7eb; padding: 12px; text-align: center;">${getFrequencyLabel(freqKey)}</td>
              <td style="border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-top: ${isFirstRow ? '1px' : '1px'} solid #e5e7eb; border-bottom: ${isLastRow ? '1px' : '1px'} solid #e5e7eb; padding: 12px; text-align: center;">${freqData.noOfVisit || 0}</td>
              <td style="border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-top: ${isFirstRow ? '1px' : '1px'} solid #e5e7eb; border-bottom: ${isLastRow ? '1px' : '1px'} solid #e5e7eb; padding: 12px; text-align: right; font-weight: 600;">${formatCurrency(freqData.quote || 0)}</td>
            </tr>
          `;
        });
      });

      // Create content element
      const content = document.createElement('div');
      content.style.cssText = 'background: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;';

      content.innerHTML = `
        <div style="width: 210mm; padding: 30px; page-break-after: always;">
          <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 3px solid #047857;">
            <div style="display: flex; align-items: center; gap: 15px; flex: 1; min-width: 0;">
              ${logoDataURL ? `<img src="${logoDataURL}" alt="Logo" style="height: 60px; width: auto; flex-shrink: 0;" />` : ''}
              <div style="flex: 1; min-width: 0;">
                <h1 style="font-size: 18pt; font-weight: bold; color: #047857; margin: 0 0 8px 0; line-height: 1.2;">Maintenance<br>Proposal</h1>
                <p style="font-size: 11pt; color: #4b5563; margin: 0;">Job Number: ${proposal.header.jobNumber}</p>
              </div>
            </div>
            <div style="background: #f0fdf4; padding: 12px 16px; border-radius: 6px; border: 2px solid #047857; text-align: right; flex-shrink: 0; margin-left: 15px;">
              <p style="margin: 0 0 4px 0; font-size: 9pt; color: #047857; font-weight: 600;">Date</p>
              <p style="margin: 0; font-size: 11pt; font-weight: bold;">${currentDate}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; padding: 15px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div>
              <h2 style="font-size: 13pt; font-weight: bold; color: #047857; margin: 0 0 12px 0;">Client Information</h2>
              <div style="font-size: 10pt; line-height: 1.6;">
                <p style="margin: 4px 0;"><strong style="color: #4b5563;">Client:</strong> ${proposal.header.clientName}</p>
                <p style="margin: 4px 0;"><strong style="color: #4b5563;">Customer Number:</strong> ${proposal.header.customerNumber}</p>
                <p style="margin: 4px 0;"><strong style="color: #4b5563;">Site:</strong> ${proposal.header.site}</p>
                <p style="margin: 4px 0;"><strong style="color: #4b5563;">Project:</strong> ${proposal.header.project}</p>
              </div>
            </div>
            <div>
              <h2 style="font-size: 13pt; font-weight: bold; color: #047857; margin: 0 0 12px 0;">Contract Details</h2>
              <div style="font-size: 10pt; line-height: 1.6;">
                <p style="margin: 4px 0;"><strong style="color: #4b5563;">Contract Period:</strong> ${proposal.header.contractPeriod} months</p>
                <p style="margin: 4px 0;"><strong style="color: #4b5563;">Prepared By:</strong> ${proposal.header.preparedBy}</p>
                <p style="margin: 4px 0;"><strong style="color: #4b5563;">Date:</strong> ${currentDate}</p>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 25px;">
            <h2 style="font-size: 14pt; font-weight: bold; color: #047857; margin: 0 0 12px 0;">Maintenance Activities</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
              <thead>
                <tr style="background-color: #047857;">
                  <th style="border: 1px solid #047857; padding: 10px; text-align: left; color: white; font-weight: bold;">Task Description</th>
                  <th style="border: 1px solid #047857; padding: 10px; text-align: center; color: white; font-weight: bold;">Frequency</th>
                  <th style="border: 1px solid #047857; padding: 10px; text-align: center; color: white; font-weight: bold;">Visits/Year</th>
                  <th style="border: 1px solid #047857; padding: 10px; text-align: right; color: white; font-weight: bold;">Quote</th>
                </tr>
              </thead>
              <tbody>
                ${tasksHTML}
              </tbody>
            </table>
          </div>
        </div>

        <div style="width: 210mm; padding: 30px; page-break-after: always;">
          <div style="background: #f0fdf4; border: 3px solid #047857; border-radius: 10px; padding: 25px; margin-bottom: 20px;">
            <h2 style="font-size: 16pt; font-weight: bold; color: #047857; margin: 0 0 15px 0;">Cost Summary</h2>

            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 2px solid #d1fae5;">
                <span style="font-size: 11pt; color: #1f2937; font-weight: 600;">Maintenance Activities Subtotal</span>
                <span style="font-size: 14pt; font-weight: bold; color: #1f2937;">${formatCurrency(subtotal)}</span>
              </div>
            </div>

            <div style="background: #047857; padding: 18px; border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 16pt; font-weight: bold; color: white;">Price per annum</span>
                <span style="font-size: 22pt; font-weight: bold; color: white;">${formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          ${proposal.notes.inclusions || proposal.notes.exclusions ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
              ${proposal.notes.inclusions ? `
                <div>
                  <h3 style="font-size: 12pt; font-weight: bold; color: #047857; margin: 0 0 10px 0;">Inclusions</h3>
                  <div style="font-size: 9pt; color: #1f2937; white-space: pre-wrap; line-height: 1.5;">${proposal.notes.inclusions}</div>
                </div>
              ` : ''}
              ${proposal.notes.exclusions ? `
                <div>
                  <h3 style="font-size: 12pt; font-weight: bold; color: #047857; margin: 0 0 10px 0;">Exclusions</h3>
                  <div style="font-size: 9pt; color: #1f2937; white-space: pre-wrap; line-height: 1.5;">${proposal.notes.exclusions}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${proposal.notes.terms && proposal.notes.terms.trim() ? `
            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 12pt; font-weight: bold; color: #047857; margin: 0 0 10px 0;">Terms & Conditions</h3>
              <div style="font-size: 9pt; color: #1f2937; white-space: pre-wrap; background: #f0fdf4; padding: 12px; border-radius: 6px; border: 1px solid #d1fae5; line-height: 1.5;">${proposal.notes.terms}</div>
            </div>
          ` : ''}

          <div style="background: #f0fdf4; border: 3px solid #047857; border-radius: 10px; padding: 25px; margin-bottom: 20px;">
            <h2 style="font-size: 14pt; font-weight: bold; color: #047857; margin: 0 0 20px 0; text-align: center;">Client Acceptance</h2>

            <p style="font-size: 10pt; color: #1f2937; margin: 0 0 25px 0; line-height: 1.6;">
              I/We accept the above proposal and agree to the terms and conditions outlined. I/We authorize the commencement of work as specified.
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px;">
              <div>
                <div style="margin-bottom: 8px;">
                  <label style="font-size: 9pt; font-weight: 600; color: #047857; display: block; margin-bottom: 8px;">Client Name (Print)</label>
                  <div style="border-bottom: 2px solid #047857; padding: 8px 0; min-height: 32px;"></div>
                </div>
              </div>
              <div>
                <div style="margin-bottom: 8px;">
                  <label style="font-size: 9pt; font-weight: 600; color: #047857; display: block; margin-bottom: 8px;">Position/Title</label>
                  <div style="border-bottom: 2px solid #047857; padding: 8px 0; min-height: 32px;"></div>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
              <div>
                <div style="margin-bottom: 8px;">
                  <label style="font-size: 9pt; font-weight: 600; color: #047857; display: block; margin-bottom: 8px;">Signature</label>
                  <div style="border-bottom: 2px solid #047857; padding: 8px 0; min-height: 40px;"></div>
                </div>
              </div>
              <div>
                <div style="margin-bottom: 8px;">
                  <label style="font-size: 9pt; font-weight: 600; color: #047857; display: block; margin-bottom: 8px;">Date</label>
                  <div style="border-bottom: 2px solid #047857; padding: 8px 0; min-height: 40px;"></div>
                </div>
              </div>
            </div>

            ${signatureDataURL ? `
              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #d1fae5;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                  <div>
                    <label style="font-size: 9pt; font-weight: 600; color: #047857; display: block; margin-bottom: 8px;">Author</label>
                    <div style="border-bottom: 2px solid #047857; padding: 8px 0; min-height: 32px;">
                      <span style="font-size: 10pt; color: #1f2937;">${authorName || proposal.header.preparedBy || ''}</span>
                    </div>
                  </div>
                  <div>
                    <label style="font-size: 9pt; font-weight: 600; color: #047857; display: block; margin-bottom: 8px;">Author Signature</label>
                    <div style="padding: 8px 0;">
                      <img src="${signatureDataURL}" alt="Author Signature" style="max-height: 50px; max-width: 200px;" />
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #047857; text-align: center;">
            <p style="font-size: 9pt; color: #6b7280; margin: 0;">This proposal is valid for 30 days from the date of issue</p>
          </div>
        </div>
      `;

      document.body.appendChild(content);

      const opt = {
        margin: 0,
        filename: `Maintenance_Proposal_${proposal.header.jobNumber || 'Draft'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          logging: false,
          backgroundColor: '#ffffff',
          useCORS: false,
          allowTaint: true
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      console.log('Starting PDF generation...');
      const pdfWorker = html2pdf().set(opt).from(content);
      const pdf = await pdfWorker.toPdf().get('pdf');

      // Insert a new page at the beginning for the cover
      if (coverPageDataURL) {
        console.log('Adding cover page to PDF...');
        const pageCount = pdf.internal.getNumberOfPages();
        console.log('Current page count:', pageCount);
        pdf.insertPage(1);
        pdf.setPage(1);

        // Add the cover image to fill the entire first page (A4: 210mm x 297mm)
        console.log('Adding cover image...');
        pdf.addImage(coverPageDataURL, 'PNG', 0, 0, 210, 297);
        // Add project information centered on the cover page
        const centerX = 105; // Center of A4 width (210mm / 2)
        const startY = 120; // Vertical position for text block (moved up for more central placement)

        // Set font for project information - matching "Facilities Management" green color
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(14);
        pdf.setTextColor(96, 125, 69); // Green color matching "Facilities Management"

        // Add each field with spacing
        const lineHeight = 10;
        let currentY = startY;

        pdf.text(`Client: ${proposal.header.clientName}`, centerX, currentY, { align: 'center' });
        currentY += lineHeight;

        pdf.text(`Customer Number: ${proposal.header.customerNumber}`, centerX, currentY, { align: 'center' });
        currentY += lineHeight;

        pdf.text(`Site: ${proposal.header.site}`, centerX, currentY, { align: 'center' });
        currentY += lineHeight;

        pdf.text(`Project: ${proposal.header.project}`, centerX, currentY, { align: 'center' });
        console.log('Cover page added successfully');
      } else {
        console.log('No cover page data - skipping cover page');
      }

      // Add page numbers to all pages
      const totalPages = pdf.internal.getNumberOfPages();
      console.log('Adding page numbers to', totalPages, 'pages');

      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128); // Gray color
        const pageText = `Page ${i} of ${totalPages}`;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const textWidth = pdf.getTextWidth(pageText);

        // Add page number centered at the bottom
        pdf.text(pageText, (pageWidth - textWidth) / 2, pageHeight - 10);
      }

      // Save the PDF
      console.log('Saving PDF...');
      pdf.save(`Maintenance_Proposal_${proposal.header.jobNumber || 'Draft'}.pdf`);

      console.log('PDF generated successfully');

      document.body.removeChild(content);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error generating PDF: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const calculateTaskTotal = (task: MaintenanceTask): number => {
    let total = 0;
    task.activeFrequencies.forEach(freqKey => {
      const freqData = task.frequencies[freqKey];
      total += freqData.quote || 0;
    });
    return total;
  };

  const calculateSubtotal = (): number => {
    return proposal.tasks.reduce((sum, task) => sum + calculateTaskTotal(task), 0);
  };

  const calculateGrandTotal = (): number => {
    const subtotal = calculateSubtotal();
    const emergencyCallouts = proposal.additionalCosts.emergencyCallouts || 0;
    const materials = proposal.additionalCosts.materials || 0;
    return subtotal + emergencyCallouts + materials;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getFrequencyLabel = (freqKey: FrequencyType): string => {
    const freq = frequencyColumns.find(f => f.key === freqKey);
    return freq ? freq.label : freqKey;
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const currentDate = new Date().toLocaleDateString('en-GB');

  return (
    <>
      {/* Modal overlay for preview and controls */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto no-print"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-5xl my-8 max-h-[90vh] overflow-y-auto"
          onClick={handleModalClick}
        >
          <div className="p-8">
            <div className="mb-6 pb-6 border-b-2 border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Maintenance Proposal Preview</h2>
              <p className="text-sm text-gray-600 mt-2">Review the proposal before exporting to PDF</p>
            </div>

            {/* Preview content - Full preview of what will be in PDF */}
            <div className="bg-gray-50 p-6 rounded-lg mb-6 max-h-[60vh] overflow-y-auto">
              <div className="bg-white p-6 rounded shadow-sm">
                <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-green-700">
                  <div className="flex items-center gap-4">
                    <img
                      src="/SCS-logo_(small).png"
                      alt="SCS Logo"
                      className="h-16 w-auto"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <div>
                      <h3 className="text-2xl font-bold text-green-800">Maintenance Proposal</h3>
                      <p className="text-sm text-gray-600">Job: {proposal.header.jobNumber}</p>
                    </div>
                  </div>
                  <div className="bg-green-50 border-2 border-green-700 rounded-lg px-4 py-2 text-right">
                    <p className="text-xs text-green-700 font-semibold mb-1">Date</p>
                    <p className="text-sm font-bold">{currentDate}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <h4 className="font-semibold text-green-800 mb-2">Client Information</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Client:</strong> {proposal.header.clientName}</p>
                      <p><strong>Customer Number:</strong> {proposal.header.customerNumber}</p>
                      <p><strong>Site:</strong> {proposal.header.site}</p>
                      <p><strong>Project:</strong> {proposal.header.project}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800 mb-2">Contract Details</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Contract Period:</strong> {proposal.header.contractPeriod} months</p>
                      <p><strong>Prepared By:</strong> {proposal.header.preparedBy}</p>
                      <p><strong>Date:</strong> {currentDate}</p>
                    </div>
                  </div>
                </div>

                {/* Maintenance Activities Table */}
                <div className="mb-6">
                  <h4 className="font-semibold text-green-800 mb-3 text-lg">Maintenance Activities</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-green-700 text-white">
                          <th className="border border-green-800 px-3 py-2 text-left">Task Description</th>
                          <th className="border border-green-800 px-3 py-2 text-center">Frequency</th>
                          <th className="border border-green-800 px-3 py-2 text-center">Visits/Year</th>
                          <th className="border border-green-800 px-3 py-2 text-right">Quote</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposal.tasks.map((task, taskIndex) => {
                          const activeFreqs = Array.from(task.activeFrequencies);

                          if (activeFreqs.length === 0) {
                            return (
                              <tr key={taskIndex} className={taskIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td colSpan={4} className="border border-gray-300 px-3 py-2 text-gray-500 italic">
                                  {task.taskDescription || 'No description'} - No frequencies selected
                                </td>
                              </tr>
                            );
                          }

                          return activeFreqs.map((freqKey, freqIndex) => {
                            const freq = frequencyColumns.find(f => f.key === freqKey);
                            const freqData = task.frequencies[freqKey];

                            return (
                              <tr key={`${taskIndex}-${freqIndex}`} className={taskIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {freqIndex === 0 ? (
                                  <td
                                    rowSpan={activeFreqs.length}
                                    className="border border-gray-300 px-3 py-2 align-top"
                                    style={{ borderRight: '1px solid #d1d5db' }}
                                  >
                                    <div className="font-semibold">{task.taskDescription || 'No description'}</div>
                                    {task.taskNumber && (
                                      <div className="text-xs text-gray-500">Task #{task.taskNumber}</div>
                                    )}
                                  </td>
                                ) : null}
                                <td className="border border-gray-300 px-3 py-2 text-center" style={freqIndex !== 0 ? { borderLeft: '1px solid #d1d5db' } : undefined}>
                                  {getFrequencyLabel(freqKey)}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center">
                                  {freqData.noOfVisit || 0}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                                  {formatCurrency(freqData.quote || 0)}
                                </td>
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-green-800 mb-3 text-lg">Cost Summary</h4>
                  <div className="bg-green-50 border-2 border-green-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-green-200">
                      <span className="text-gray-700">Maintenance Activities Subtotal</span>
                      <span className="font-semibold text-lg">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-green-700 text-white px-4 rounded-lg">
                      <span className="text-xl font-bold">Price per annum</span>
                      <span className="text-2xl font-bold">{formatCurrency(calculateGrandTotal())}</span>
                    </div>
                  </div>
                </div>

                {(proposal.notes.inclusions || proposal.notes.exclusions) && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {proposal.notes.inclusions && (
                      <div>
                        <h4 className="font-semibold text-green-800 mb-2">Inclusions</h4>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{proposal.notes.inclusions}</div>
                      </div>
                    )}
                    {proposal.notes.exclusions && (
                      <div>
                        <h4 className="font-semibold text-green-800 mb-2">Exclusions</h4>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{proposal.notes.exclusions}</div>
                      </div>
                    )}
                  </div>
                )}

                {proposal.notes.terms && proposal.notes.terms.trim() !== '' && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-green-800 mb-2">Terms & Conditions</h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap bg-green-50 p-3 rounded border border-green-200">
                      {proposal.notes.terms}
                    </div>
                  </div>
                )}

                <div className="bg-green-50 border-3 border-green-700 rounded-lg p-6 mb-4">
                  <h4 className="text-lg font-bold text-green-800 mb-5 text-center">Client Acceptance</h4>

                  <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                    I/We accept the above proposal and agree to the terms and conditions outlined. I/We authorize the commencement of work as specified.
                  </p>

                  <div className="grid grid-cols-2 gap-6 mb-5">
                    <div>
                      <label className="text-xs font-semibold text-green-800 block mb-2">Client Name (Print)</label>
                      <div className="border-b-2 border-green-700 pb-2 min-h-[32px]"></div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-green-800 block mb-2">Position/Title</label>
                      <div className="border-b-2 border-green-700 pb-2 min-h-[32px]"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-semibold text-green-800 block mb-2">Signature</label>
                      <div className="border-b-2 border-green-700 pb-2 min-h-[40px]"></div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-green-800 block mb-2">Date</label>
                      <div className="border-b-2 border-green-700 pb-2 min-h-[40px]"></div>
                    </div>
                  </div>

                  {authorSignature && (
                    <div className="mt-6 pt-5 border-t-2 border-green-200">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-xs font-semibold text-green-800 block mb-2">Author</label>
                          <div className="border-b-2 border-green-700 pb-2 min-h-[32px]">
                            <span className="text-sm text-gray-700">{authorName || proposal.header.preparedBy || ''}</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-green-800 block mb-2">Author Signature</label>
                          <div className="pb-2">
                            <img
                              src={authorSignature}
                              alt="Author Signature"
                              className="max-h-12 max-w-[200px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-600 text-center mt-4 pt-4 border-t">
                  This proposal is valid for 30 days from the date of issue
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handlePrint}
                className="px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden print layout */}
      <div ref={printRef} style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: '210mm',
        backgroundColor: 'white',
        visibility: 'hidden'
      }}>
      </div>
    </>
  );
}
