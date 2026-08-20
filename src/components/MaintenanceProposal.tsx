import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, Download, ChevronDown, ChevronUp, FileText, Mail, Printer, CheckCircle, Share2, Copy, History, Eye, Settings, Calculator } from 'lucide-react';
import {
  MaintenanceProposalData,
  MaintenanceTask,
  FrequencyType,
  FrequencyData,
  frequencyColumns,
  createEmptyTask,
  otPremiumOptions,
} from '../types/maintenance';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  saveOrUpdateMaintenanceProposal,
  submitMaintenanceProposal,
  loadMaintenanceProposal,
  MaintenanceProposalRecord,
  MaintenanceProposalRevision
} from '../services/maintenanceProposalService';
import { MaintenanceEmailIntegration } from './MaintenanceEmailIntegration';
import { MaintenancePrintLayout } from './MaintenancePrintLayout';
import { MaintenanceProposalShareManager } from './MaintenanceProposalShareManager';
import { MaintenanceProposalRevisionHistory } from './MaintenanceProposalRevisionHistory';
import { MaintenanceProposalReport } from './MaintenanceProposalReport';
import { MaintenanceInternalReport } from './MaintenanceInternalReport';
import { LabourRateOverrideSettings } from './LabourRateOverrideSettings';
import ProposalTemplateManager from './ProposalTemplateManager';
import TaskLibrary from './TaskLibrary';
import EnhancedEmailSender from './EnhancedEmailSender';
import { labourRatesService } from '../services/labourRatesService';
import { labourRateOverrideService } from '../services/labourRateOverrideService';
import { saveProposalAsTemplate } from '../services/proposalTemplateService';
import html2pdf from 'html2pdf.js';

interface MaintenanceProposalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: MaintenanceProposalRecord;
}

const initialProposal: MaintenanceProposalData = {
  header: {
    customerNumber: '',
    clientName: '',
    site: '',
    project: '',
    jobNumber: '',
    preparedBy: '',
    contractPeriod: 12,
    authorNotes: '',
  },
  tasks: [],
  labourRates: [],
  additionalCosts: {
    emergencyCallouts: 0,
    outOfHoursRate: 150,
    materials: 0,
    specialistSubcontractors: 0,
    laboratoryTesting: 0,
    materialsAddonPerc: 0,
    subcontractorAddonPerc: 0,
    laboratoryTestingAddonPerc: 0,
  },
  adjustments: {
    contingencyPerc: 0,
    overallContingencyPct: 0,
    provisionalSums: [],
  },
  notes: {
    scopeOfWork: '',
    inclusions: '',
    exclusions: '',
    terms: '',
    inclusionsExclusions: 'Inclusions:\n\nExclusions:\n\n',
  },
  submission: {
    quotedText: '',
    issuedPrice: null,
    confirmedAt: null,
  },
  currentQuoteId: null,
};

function serializeProposalForSave(proposal: MaintenanceProposalData): any {
  return {
    ...proposal,
    tasks: proposal.tasks.map(task => ({
      ...task,
      activeFrequencies: Array.from(task.activeFrequencies || []),
    })),
  };
}

function deserializeProposalFromLoad(data: any): MaintenanceProposalData {
  return {
    ...data,
    tasks: (data.tasks || []).map((task: any) => ({
      ...task,
      activeFrequencies: new Set(task.activeFrequencies || []),
    })),
  };
}

export function MaintenanceProposal({ isOpen, onClose, initialData }: MaintenanceProposalProps) {
  const [proposal, setProposal] = useState<MaintenanceProposalData>(initialProposal);
  const [currentId, setCurrentId] = useState<string | undefined>(initialData?.id);
  const [status, setStatus] = useState<string>('draft');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isAuthorNotesExpanded, setIsAuthorNotesExpanded] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPrintLayout, setShowPrintLayout] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showInternalReport, setShowInternalReport] = useState(false);
  const [showLabourRateOverrides, setShowLabourRateOverrides] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showTaskLibrary, setShowTaskLibrary] = useState(false);
  const [showEnhancedEmail, setShowEnhancedEmail] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autosaveError, setAutosaveError] = useState(false);
  const { showToast, confirm } = useToast();
  const { user } = useAuth();

  // Refs so event listener callbacks always read latest state without re-registering
  const proposalRef = useRef(proposal);
  const currentIdRef = useRef(currentId);
  const handleSaveRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => { proposalRef.current = proposal; }, [proposal]);
  useEffect(() => { currentIdRef.current = currentId; }, [currentId]);

  useEffect(() => {
    if (isOpen && !currentId) {
      // Only scroll to top when opening a new proposal
      window.scrollTo(0, 0);
    }
    if (isOpen) {
      loadData();
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const handleSaveEvent = () => {
      handleSaveRef.current();
    };

    window.addEventListener('triggerMaintenanceSave', handleSaveEvent);

    return () => {
      window.removeEventListener('triggerMaintenanceSave', handleSaveEvent);
    };
  }, []);

  useEffect(() => {
    const event = new CustomEvent('maintenanceSaveState', {
      detail: { isSaving, lastSaved }
    });
    window.dispatchEvent(event);
  }, [isSaving, lastSaved]);

  useEffect(() => {
    const handleAddTasksEvent = (event: any) => {
      const tasks = event.detail;
      handleAddTasksFromLibrary(tasks);
    };

    window.addEventListener('addTasksFromLibrary', handleAddTasksEvent);

    return () => {
      window.removeEventListener('addTasksFromLibrary', handleAddTasksEvent);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleSaveBeforeHome = async () => {
      const p = proposalRef.current;
      const id = currentIdRef.current;

      if (!p.header.clientName && !p.header.jobNumber && p.tasks.length === 0) {
        window.dispatchEvent(new Event('backToDashboard'));
        return;
      }

      if (!p.header.clientName || !p.header.jobNumber) {
        showToast('Please fill in customer name and job number before navigating home', 'warning');
        return;
      }

      setIsSaving(true);
      try {
        const serializedProposal = serializeProposalForSave(p);
        const { data, error } = await saveOrUpdateMaintenanceProposal(serializedProposal, id);

        if (error) {
          showToast(`Failed to save proposal: ${error.message}`, 'error');
          return;
        }

        if (data) {
          setCurrentId(data.id);
          setStatus(data.status);
          showToast('Maintenance proposal saved successfully!', 'success');
          window.dispatchEvent(new Event('backToDashboard'));
        }
      } catch (error) {
        console.error('Error saving proposal:', error);
        if (error instanceof Error) {
          showToast(`Failed to save proposal: ${error.message}`, 'error');
        } else {
          showToast('Failed to save proposal', 'error');
        }
      } finally {
        setIsSaving(false);
      }
    };

    const handleExportPDFEvent = () => {
      handleExportPDF();
    };

    window.addEventListener('saveMaintenanceBeforeHome', handleSaveBeforeHome);
    window.addEventListener('exportMaintenanceProposalPDF', handleExportPDFEvent);

    return () => {
      window.removeEventListener('saveMaintenanceBeforeHome', handleSaveBeforeHome);
      window.removeEventListener('exportMaintenanceProposalPDF', handleExportPDFEvent);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOpen || !currentId) return;

    const autoSaveInterval = setInterval(async () => {
      const p = proposalRef.current;
      const id = currentIdRef.current;
      if (!p.header.clientName || !p.header.jobNumber) return;

      try {
        const serializedProposal = serializeProposalForSave(p);
        const { data, error } = await saveOrUpdateMaintenanceProposal(serializedProposal, id);

        if (!error && data) {
          setLastSaved(new Date());
          setAutosaveError(false);
        } else if (error) {
          setAutosaveError(true);
        }
      } catch {
        setAutosaveError(true);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(autoSaveInterval);
  }, [isOpen, currentId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const savedProposalId = sessionStorage.getItem('scs_current_maintenance_id');
      let loadedProposalId: string | null = null;

      if (savedProposalId) {
        const { data, error } = await loadMaintenanceProposal(savedProposalId);
        if (!error && data) {
          const baseProposal = deserializeProposalFromLoad(data.data);
          loadedProposalId = data.id;

          const [standardRatesResult, overridesResult] = await Promise.all([
            labourRatesService.getLabourRates(),
            labourRateOverrideService.getOverridesForProposal(loadedProposalId),
          ]);

          if (standardRatesResult.data && overridesResult.data) {
            const overrideMap = new Map<string, number>();
            overridesResult.data.forEach(override => {
              overrideMap.set(override.labour_rate_id, parseFloat(String(override.override_rate)));
            });

            baseProposal.labourRates = standardRatesResult.data
              .filter(rate => rate.is_active)
              .map(rate => ({
                id: rate.id,
                name: rate.name,
                base: parseFloat(String(rate.base_rate)),
                overrideRate: overrideMap.get(rate.id),
              }));
          }

          setProposal(baseProposal);
          setCurrentId(data.id);
          setStatus(data.status);
          sessionStorage.removeItem('scs_current_maintenance_id');
          setIsLoading(false);
          return;
        }
      }

      if (initialData) {
        const baseProposal = deserializeProposalFromLoad(initialData.data);
        loadedProposalId = initialData.id;

        const [standardRatesResult, overridesResult] = await Promise.all([
          labourRatesService.getLabourRates(),
          labourRateOverrideService.getOverridesForProposal(loadedProposalId),
        ]);

        if (standardRatesResult.data && overridesResult.data) {
          const overrideMap = new Map<string, number>();
          overridesResult.data.forEach(override => {
            overrideMap.set(override.labour_rate_id, parseFloat(String(override.override_rate)));
          });

          baseProposal.labourRates = standardRatesResult.data
            .filter(rate => rate.is_active)
            .map(rate => ({
              id: rate.id,
              name: rate.name,
              base: parseFloat(String(rate.base_rate)),
              overrideRate: overrideMap.get(rate.id),
            }));
        }

        setProposal(baseProposal);
        setCurrentId(initialData.id);
        setStatus(initialData.status);
      } else {
        const { data: standardRatesData } = await labourRatesService.getLabourRates();

        setProposal(prev => ({
          ...prev,
          header: {
            ...prev.header,
            preparedBy: user?.email || '',
          },
          labourRates: standardRatesData
            ? standardRatesData.map(rate => ({
                id: rate.id,
                name: rate.name,
                base: parseFloat(String(rate.base_rate)),
              }))
            : [],
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addTask = () => {
    const newTask = createEmptyTask();
    setProposal(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
    }));
    setExpandedRows(prev => new Set(prev).add(newTask.id));
  };

  const updateTask = (taskId: string, updates: Partial<MaintenanceTask>) => {
    setProposal(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    }));
  };

  const updateFrequencyData = (
    taskId: string,
    frequency: FrequencyType,
    updates: Partial<FrequencyData>
  ) => {
    setProposal(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => {
        if (task.id === taskId) {
          const updatedFreqData = { ...task.frequencies[frequency], ...updates };

          const rate = updatedFreqData.rate || 0;
          const otPremium = updatedFreqData.otPremium || 0;
          const hours = updatedFreqData.hours || 0;
          const noOfMen = updatedFreqData.noOfMen || 0;
          const noOfVisit = updatedFreqData.noOfVisit || 0;
          const adminMarkup = updatedFreqData.adminMarkup || 0;
          const consumables = updatedFreqData.consumables || 0;
          const ohpConsumables = updatedFreqData.ohpConsumables || 0;
          const materialsPlantHire = updatedFreqData.materialsPlantHire || 0;
          const ohpMaterialsPlantHire = updatedFreqData.ohpMaterialsPlantHire || 0;
          const subContractor = updatedFreqData.subContractor || 0;
          const ohpSubContractor = updatedFreqData.ohpSubContractor || 0;
          const laboratoryTesting = updatedFreqData.laboratoryTesting || 0;
          const ohpLaboratoryTesting = updatedFreqData.ohpLaboratoryTesting || 0;

          const effectiveRate = rate * (1 + (otPremium / 100));
          const labourCost = hours * noOfMen * effectiveRate * noOfVisit;
          const adminAmount = labourCost * (adminMarkup / 100);

          const consumablesWithOHP = consumables * (1 + (ohpConsumables / 100));
          const materialsWithOHP = materialsPlantHire * (1 + (ohpMaterialsPlantHire / 100));
          const subContractorWithOHP = subContractor * (1 + (ohpSubContractor / 100));
          const laboratoryTestingWithOHP = laboratoryTesting * (1 + (ohpLaboratoryTesting / 100));

          const rawQuote = labourCost + adminAmount + consumablesWithOHP + materialsWithOHP + subContractorWithOHP + laboratoryTestingWithOHP;
          const quote = isNaN(rawQuote) ? 0 : rawQuote;

          updatedFreqData.quote = quote;

          return {
            ...task,
            frequencies: {
              ...task.frequencies,
              [frequency]: updatedFreqData,
            },
          };
        }
        return task;
      }),
    }));
  };

  const toggleFrequency = (taskId: string, frequency: FrequencyType) => {
    setProposal(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => {
        if (task.id === taskId) {
          const newActiveFrequencies = new Set(task.activeFrequencies);
          if (newActiveFrequencies.has(frequency)) {
            newActiveFrequencies.delete(frequency);
          } else {
            newActiveFrequencies.add(frequency);
          }
          return {
            ...task,
            activeFrequencies: newActiveFrequencies,
          };
        }
        return task;
      }),
    }));
  };

  const deleteTask = (taskId: string) => {
    setProposal(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId),
    }));
  };

  const toggleRowExpansion = (taskId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const frequencyTotals = useMemo((): { [key in FrequencyType]: number } => {
    const totals: { [key in FrequencyType]: number } = {
      biennial: 0, annual: 0, sixMonthly: 0, quarterly: 0,
      biMonthly: 0, monthly: 0, weekly: 0, daily: 0,
    };
    proposal.tasks.forEach(task => {
      frequencyColumns.forEach(freq => {
        const q = task.frequencies[freq.key].quote;
        totals[freq.key] += (isNaN(q) || !q) ? 0 : q;
      });
    });
    return totals;
  }, [proposal.tasks]);

  const calculateTotals = () => frequencyTotals;

  const detailedFrequencyTotals = useMemo(() => {
    const dt: {
      [key in FrequencyType]: {
        totalLabourHours: number;
        nettConsumables: number;
        materialsCost: number;
        subContractorCost: number;
        laboratoryTestingCost: number;
        totalCost: number;
      }
    } = {
      biennial: { totalLabourHours: 0, nettConsumables: 0, materialsCost: 0, subContractorCost: 0, laboratoryTestingCost: 0, totalCost: 0 },
      annual: { totalLabourHours: 0, nettConsumables: 0, materialsCost: 0, subContractorCost: 0, laboratoryTestingCost: 0, totalCost: 0 },
      sixMonthly: { totalLabourHours: 0, nettConsumables: 0, materialsCost: 0, subContractorCost: 0, laboratoryTestingCost: 0, totalCost: 0 },
      quarterly: { totalLabourHours: 0, nettConsumables: 0, materialsCost: 0, subContractorCost: 0, laboratoryTestingCost: 0, totalCost: 0 },
      biMonthly: { totalLabourHours: 0, nettConsumables: 0, materialsCost: 0, subContractorCost: 0, laboratoryTestingCost: 0, totalCost: 0 },
      monthly: { totalLabourHours: 0, nettConsumables: 0, materialsCost: 0, subContractorCost: 0, laboratoryTestingCost: 0, totalCost: 0 },
      weekly: { totalLabourHours: 0, nettConsumables: 0, materialsCost: 0, subContractorCost: 0, laboratoryTestingCost: 0, totalCost: 0 },
      daily: { totalLabourHours: 0, nettConsumables: 0, materialsCost: 0, subContractorCost: 0, laboratoryTestingCost: 0, totalCost: 0 },
    };
    proposal.tasks.forEach(task => {
      frequencyColumns.forEach(freq => {
        const freqData = task.frequencies[freq.key];
        const labourHours = (freqData.hours || 0) * (freqData.noOfMen || 0) * (freqData.noOfVisit || 0);
        dt[freq.key].totalLabourHours += labourHours;
        dt[freq.key].nettConsumables += freqData.consumables || 0;
        dt[freq.key].materialsCost += freqData.materialsPlantHire || 0;
        dt[freq.key].subContractorCost += freqData.subContractor || 0;
        dt[freq.key].laboratoryTestingCost += freqData.laboratoryTesting || 0;
        const quote = freqData.quote;
        dt[freq.key].totalCost += (isNaN(quote) || !quote) ? 0 : quote;
      });
    });
    return dt;
  }, [proposal.tasks]);

  const calculateDetailedTotals = () => detailedFrequencyTotals;

  const overallTotals = useMemo(() => {
    const subtotal = Object.values(frequencyTotals).reduce((sum, val) => sum + val, 0);
    const contingencyAmount = (subtotal * (proposal.adjustments.overallContingencyPct || 0)) / 100;
    const provisionalTotal = proposal.adjustments.provisionalSums.reduce((sum, ps) => sum + (ps.amount || 0), 0);
    const grandTotal = subtotal + contingencyAmount + provisionalTotal;
    return { subtotal, contingencyAmount, provisionalTotal, grandTotal };
  }, [frequencyTotals, proposal.adjustments]);

  const calculateOverallTotals = () => overallTotals;

  const handleAddProvisionalSum = () => {
    setProposal(prev => ({
      ...prev,
      adjustments: {
        ...prev.adjustments,
        provisionalSums: [
          ...prev.adjustments.provisionalSums,
          {
            id: `ps-${Date.now()}`,
            description: '',
            amount: 0,
          },
        ],
      },
    }));
  };

  const handleUpdateProvisionalSum = (id: string, field: 'description' | 'amount', value: string | number) => {
    setProposal(prev => ({
      ...prev,
      adjustments: {
        ...prev.adjustments,
        provisionalSums: prev.adjustments.provisionalSums.map(ps =>
          ps.id === id ? { ...ps, [field]: value } : ps
        ),
      },
    }));
  };

  const handleDeleteProvisionalSum = (id: string) => {
    setProposal(prev => ({
      ...prev,
      adjustments: {
        ...prev.adjustments,
        provisionalSums: prev.adjustments.provisionalSums.filter(ps => ps.id !== id),
      },
    }));
  };

  const handleArrowKeyNavigation = (e: React.KeyboardEvent<HTMLInputElement>, taskId: string, rowIndex: number, colIndex: number) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    e.preventDefault();

    let newRowIndex = rowIndex;
    let newColIndex = colIndex;

    switch (e.key) {
      case 'ArrowUp':
        newRowIndex = Math.max(0, rowIndex - 1);
        break;
      case 'ArrowDown':
        newRowIndex = Math.min(8, rowIndex + 1);
        break;
      case 'ArrowLeft':
        newColIndex = Math.max(0, colIndex - 1);
        break;
      case 'ArrowRight':
        newColIndex = Math.min(frequencyColumns.length - 1, colIndex + 1);
        break;
    }

    const targetInput = document.querySelector(
      `input[data-task-id="${taskId}"][data-row="${newRowIndex}"][data-col="${newColIndex}"]`
    ) as HTMLInputElement;

    if (targetInput) {
      targetInput.focus();
      targetInput.select();
    }
  };

  const handleSave = async () => {
    console.log('Save button clicked');
    console.log('Proposal data:', proposal);
    console.log('Current ID:', currentId);

    if (!proposal.header.clientName || !proposal.header.jobNumber) {
      showToast('Please fill in customer name and job number', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      console.log('Calling saveOrUpdateMaintenanceProposal...');
      const serializedProposal = serializeProposalForSave(proposal);
      const { data, error } = await saveOrUpdateMaintenanceProposal(serializedProposal, currentId);

      console.log('Save result:', { data, error });

      if (error) {
        console.error('Save error details:', error);
        throw error;
      }

      if (data) {
        console.log('Proposal saved successfully:', data);
        setCurrentId(data.id);
        setStatus(data.status);
        setLastSaved(new Date());
        showToast('Maintenance proposal saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Error saving proposal:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        showToast(`Failed to save proposal: ${error.message}`, 'error');
      } else {
        showToast('Failed to save proposal', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };
  handleSaveRef.current = handleSave;

  const handleSubmit = async () => {
    if (!currentId) {
      showToast('Please save the proposal first', 'warning');
      return;
    }

    try {
      const { data, error } = await submitMaintenanceProposal(currentId);

      if (error) throw error;

      if (data) {
        setStatus(data.status);
        showToast('Maintenance proposal issued successfully!', 'success');
      }
    } catch (error) {
      console.error('Error submitting proposal:', error);
      showToast('Failed to submit proposal', 'error');
    }
  };

  const handleCopyProposal = async () => {
    if (!currentId) {
      showToast('Please save the proposal first', 'warning');
      return;
    }

    const confirmed = await confirm('Create a copy of this proposal?\n\nA duplicate will be created with "-Copy" appended to the job number.');
    if (!confirmed) return;

    try {
      const copiedProposal = {
        ...proposal,
        header: {
          ...proposal.header,
          jobNumber: `${proposal.header.jobNumber}-Copy`,
        },
        submission: {
          quotedText: '',
          issuedPrice: null,
          confirmedAt: null,
        },
      };

      const serializedProposal = serializeProposalForSave(copiedProposal);
      const { data, error } = await saveOrUpdateMaintenanceProposal(serializedProposal);
      if (error) throw error;

      showToast('Proposal copied successfully!', 'success');
      if (data) {
        setProposal(deserializeProposalFromLoad(data.data));
        setCurrentId(data.id);
        setStatus('draft');
      }
    } catch (error) {
      console.error('Error copying proposal:', error);
      showToast('Failed to copy proposal', 'error');
    }
  };

  const handleSaveAsTemplate = async (templateData?: any) => {
    if (!currentId && !templateData) {
      showToast('Please save the proposal first', 'warning');
      return;
    }

    if (templateData) {
      const serializedData = serializeProposalForSave(proposal);
      const { error } = await saveProposalAsTemplate(
        serializedData,
        templateData.template_name,
        templateData.description,
        templateData.category,
        false
      );

      if (error) {
        showToast('Failed to save template: ' + error.message, 'error');
      } else {
        showToast('Template saved successfully!', 'success');
      }
      return;
    }

    setShowTemplateManager(true);
  };

  const handleLoadFromTemplate = (templateData: any) => {
    const loadedProposal = deserializeProposalFromLoad(templateData);
    setProposal(loadedProposal);
    setCurrentId(undefined);
    setStatus('draft');
    showToast('Template loaded successfully!', 'success');
  };

  const handleAddTasksFromLibrary = (libraryTasks: any[]) => {
    const freqNameToKey: Record<string, FrequencyType> = {
      'daily': 'daily',
      'weekly': 'weekly',
      'fortnightly': 'biMonthly',
      'bi-monthly': 'biMonthly',
      'monthly': 'monthly',
      'quarterly': 'quarterly',
      'bi-annually': 'sixMonthly',
      'six monthly': 'sixMonthly',
      '6 monthly': 'sixMonthly',
      'annually': 'annual',
      'annual': 'annual',
      'biennial': 'biennial',
      'ad-hoc': 'annual',
    };

    const unmatchedTypes = new Set<string>();
    const newTasks: MaintenanceTask[] = libraryTasks.map(lt => {
      const task = createEmptyTask();
      task.id = lt.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      task.taskDescription = lt.taskName || '';
      task.number = 'NEW';

      const freqKey = freqNameToKey[(lt.frequency || '').toLowerCase()] || 'monthly';
      task.activeFrequencies = new Set<FrequencyType>([freqKey]);

      // Find matching rate in proposal labour rates by name
      const matchedRate = proposal.labourRates.find(
        r => r.name.toLowerCase() === (lt.labourType || '').toLowerCase()
      );
      if (!matchedRate && lt.labourType) {
        unmatchedTypes.add(lt.labourType);
      }

      task.frequencies[freqKey] = {
        hours: lt.hours || 0,
        noOfMen: lt.noOfMen || 1,
        rate: matchedRate ? (matchedRate.overrideRate ?? matchedRate.base) : 0,
        rateId: matchedRate?.id || '',
        otPremium: lt.otPremium || 0,
        adminMarkup: lt.adminMarkup || 0,
        noOfVisit: lt.noOfVisits || 1,
        consumables: lt.consumables || 0,
        ohpConsumables: lt.ohpConsumables || 0,
        materialsPlantHire: lt.materialsPlantHire || 0,
        ohpMaterialsPlantHire: lt.ohpMaterialsPlantHire || 0,
        subContractor: lt.subcontractor || 0,
        ohpSubContractor: lt.ohpSubcontractor || 0,
        laboratoryTesting: lt.laboratoryTesting || 0,
        ohpLaboratoryTesting: lt.ohpLaboratoryTesting || 0,
        quote: 0,
      };

      return task;
    });

    setProposal(prev => ({
      ...prev,
      tasks: [...prev.tasks, ...newTasks],
    }));
    showToast(`Added ${newTasks.length} task(s) from library`, 'success');
    if (unmatchedTypes.size > 0) {
      showToast(
        `Labour type not found for: ${[...unmatchedTypes].join(', ')} — rate set to £0, please update manually`,
        'warning'
      );
    }
  };

  const handleLoadRevision = (revision: MaintenanceProposalRevision) => {
    setProposal(deserializeProposalFromLoad(revision.data));
    showToast(`Loaded revision ${revision.revision_number}`, 'success');
  };


  const handleExportPDF = async () => {
    if (!proposal.header.clientName || !proposal.header.jobNumber) {
      showToast('Please fill in customer name and job number before exporting', 'warning');
      return;
    }

    setIsExportingPDF(true);
    setShowPrintLayout(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const element = document.getElementById('maintenance-print-container');
      if (!element) {
        throw new Error('Print container not found');
      }

      const opt = {
        margin: [15, 15, 15, 15],
        filename: `Maintenance_${proposal.header.jobNumber}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: false,
          removeContainer: true,
          backgroundColor: '#ffffff',
          imageTimeout: 0,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 1920,
          windowHeight: 1080,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape',
          compress: true,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
      showToast('PDF exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast('Failed to export PDF', 'error');
    } finally {
      setIsExportingPDF(false);
      setShowPrintLayout(false);
    }
  };

  const handlePrint = () => {
    if (!proposal.header.clientName || !proposal.header.jobNumber) {
      showToast('Please fill in customer name and job number before printing', 'warning');
      return;
    }

    setShowPrintLayout(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setShowPrintLayout(false), 100);
    }, 100);
  };

  if (!isOpen) return null;

  const totals = calculateTotals();
  const detailedTotals = calculateDetailedTotals();

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {autosaveError && (
        <div className="bg-red-600 text-white text-sm px-6 py-2 flex items-center justify-between">
          <span>Autosave failed — your recent changes may not be saved. Please save manually.</span>
          <button
            onClick={() => { setAutosaveError(false); handleSave(); }}
            className="ml-4 underline font-medium hover:no-underline"
          >
            Save now
          </button>
        </div>
      )}
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-semibold text-gray-900">Project Information</h2>
            </div>
            <div className="flex items-center gap-3">
              {currentId && (
                <>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Share proposal"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowTemplateManager(true)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Proposal templates"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowTaskLibrary(true)}
                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Task library"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowEnhancedEmail(true)}
                    disabled={!currentId}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send email"
                  >
                    <Mail className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleCopyProposal}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy proposal"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowRevisionHistory(true)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Revision history"
                  >
                    <History className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowLabourRateOverrides(true)}
                    disabled={!currentId}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Labour Rate Overrides"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowPrintLayout(true)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowReport(true)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Client Report"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowInternalReport(true)}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Internal Cost Breakdown"
                  >
                    <Calculator className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Close"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                status === 'submitted'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {status.toUpperCase()}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Number
                  </label>
                  <input
                    type="text"
                    value={proposal.header.customerNumber}
                    onChange={(e) => setProposal(prev => ({
                      ...prev,
                      header: { ...prev.header, customerNumber: e.target.value }
                    }))}
                    placeholder="e.g., CUST-001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer
                  </label>
                  <input
                    type="text"
                    value={proposal.header.clientName}
                    onChange={(e) => setProposal(prev => ({
                      ...prev,
                      header: { ...prev.header, clientName: e.target.value }
                    }))}
                    placeholder="e.g., ABC Developments"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site
                  </label>
                  <input
                    type="text"
                    value={proposal.header.site}
                    onChange={(e) => setProposal(prev => ({
                      ...prev,
                      header: { ...prev.header, site: e.target.value }
                    }))}
                    placeholder="e.g., Douglas, IOM"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project
                  </label>
                  <input
                    type="text"
                    value={proposal.header.project}
                    onChange={(e) => setProposal(prev => ({
                      ...prev,
                      header: { ...prev.header, project: e.target.value }
                    }))}
                    placeholder="e.g., Office Refurb"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Number
                  </label>
                  <input
                    type="text"
                    value={proposal.header.jobNumber}
                    onChange={(e) => setProposal(prev => ({
                      ...prev,
                      header: { ...prev.header, jobNumber: e.target.value }
                    }))}
                    placeholder="e.g., 123456"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prepared By
                  </label>
                  <input
                    type="text"
                    value={proposal.header.preparedBy}
                    onChange={(e) => setProposal(prev => ({
                      ...prev,
                      header: { ...prev.header, preparedBy: e.target.value }
                    }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base bg-gray-100 cursor-not-allowed text-gray-500"
                    readOnly
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setIsAuthorNotesExpanded(!isAuthorNotesExpanded)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">
                    Author Notes (Sub-contractors, Survey Notes, etc.)
                  </span>
                  {isAuthorNotesExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {isAuthorNotesExpanded && (
                  <div className="mt-3 border border-gray-200 rounded-lg p-4">
                    <textarea
                      value={proposal.header.authorNotes || ''}
                      onChange={(e) => setProposal(prev => ({
                        ...prev,
                        header: { ...prev.header, authorNotes: e.target.value }
                      }))}
                      placeholder="Enter notes about sub-contractors, survey observations, site conditions, or any other relevant information..."
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base resize-y"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      These notes are for internal use and will not appear in client-facing reports
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 border-t border-gray-200 pt-6">
                <div className="flex items-center gap-3">
                  <button
                    disabled
                    className="relative px-4 py-2.5 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed flex items-center gap-2 font-medium opacity-50"
                    title="Coming Soon"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                    <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Soon</span>
                  </button>
                  <button
                    disabled
                    className="relative px-4 py-2.5 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed flex items-center gap-2 font-medium opacity-50"
                    title="Coming Soon"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                    <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Soon</span>
                  </button>
                  <button
                    disabled
                    className="relative px-4 py-2.5 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed flex items-center gap-2 font-medium opacity-50"
                    title="Coming Soon"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                    <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Soon</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Maintenance Tasks</h2>
            <button
              onClick={addTask}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Task
            </button>
          </div>

          {proposal.tasks.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600 text-lg">No tasks added. Click "Add Task" to begin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {proposal.tasks.map((task, index) => {
                const isExpanded = expandedRows.has(task.id);

                return (
                  <div key={task.id} className="border border-gray-300 rounded-lg overflow-hidden">
                    <div
                      className="bg-gray-50 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleRowExpansion(task.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-gray-900">Task #{index + 1}</span>
                        <span className="text-gray-600">{task.taskDescription || 'No description'}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-6 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Task Description
                            </label>
                            <textarea
                              value={task.taskDescription}
                              onChange={(e) => updateTask(task.id, { taskDescription: e.target.value })}
                              placeholder="Enter task description..."
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base resize-none"
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Task Number
                            </label>
                            <input
                              type="text"
                              value={task.number}
                              onChange={(e) => updateTask(task.id, { number: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                            />
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-300 rounded-lg">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-300">
                                  Field
                                </th>
                                {frequencyColumns.map(freq => (
                                  <th
                                    key={freq.key}
                                    className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-300 bg-green-50"
                                  >
                                    <div className="flex flex-col items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={task.activeFrequencies?.has(freq.key) || false}
                                        onChange={() => toggleFrequency(task.id, freq.key)}
                                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                      />
                                      <span>{freq.label}</span>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Hours</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-hours`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].hours || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        hours: Math.max(0, parseFloat(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 0, colIndex)}
                                      data-task-id={task.id}
                                      data-row="0"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      step="0.5"
                                      min="0"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">No. of Men</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-men`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].noOfMen || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        noOfMen: Math.max(0, parseInt(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 1, colIndex)}
                                      data-task-id={task.id}
                                      data-row="1"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      min="0"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Rate (£)</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-rate`} className="px-2 py-2 border-r border-gray-200">
                                    <select
                                      value={task.frequencies[freq.key].rateId || ''}
                                      onChange={(e) => {
                                        const selectedRate = proposal.labourRates.find(r => r.id === e.target.value);
                                        updateFrequencyData(task.id, freq.key, {
                                          rateId: e.target.value,
                                          rate: selectedRate ? (selectedRate.overrideRate ?? selectedRate.base) : 0,
                                        });
                                      }}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                    >
                                      <option value="">Select rate...</option>
                                      {proposal.labourRates.map(rate => {
                                        const displayRate = rate.overrideRate ?? rate.base;
                                        return (
                                          <option key={rate.id} value={rate.id}>
                                            {rate.name} - £{displayRate.toFixed(2)}
                                            {rate.overrideRate && ' (Override)'}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">O/T Premium</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-ot`} className="px-2 py-2 border-r border-gray-200">
                                    <select
                                      value={task.frequencies[freq.key].otPremium || 0}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        otPremium: parseFloat(e.target.value) || 0
                                      })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                    >
                                      {otPremiumOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Admin Markup %</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-markup`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].adminMarkup || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        adminMarkup: Math.max(0, parseFloat(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 4, colIndex)}
                                      data-task-id={task.id}
                                      data-row="4"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      step="1"
                                      min="0"
                                      max="100"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">No of Visit</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-visit`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].noOfVisit || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        noOfVisit: Math.max(0, parseInt(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 5, colIndex)}
                                      data-task-id={task.id}
                                      data-row="5"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      min="0"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Consumables (£)</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-consumables`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].consumables || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        consumables: Math.max(0, parseFloat(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 6, colIndex)}
                                      data-task-id={task.id}
                                      data-row="6"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      step="0.01"
                                      min="0"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">OH&P % on Consumables</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-ohp-consumables`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].ohpConsumables || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        ohpConsumables: Math.max(0, parseFloat(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 7, colIndex)}
                                      data-task-id={task.id}
                                      data-row="7"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      step="0.1"
                                      min="0"
                                      max="100"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Materials/Plant Hire (£)</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-materials`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].materialsPlantHire || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        materialsPlantHire: Math.max(0, parseFloat(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 8, colIndex)}
                                      data-task-id={task.id}
                                      data-row="8"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      step="0.01"
                                      min="0"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">OH&P % on Materials/Plant Hire</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-ohp-materials`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].ohpMaterialsPlantHire || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        ohpMaterialsPlantHire: Math.max(0, parseFloat(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 9, colIndex)}
                                      data-task-id={task.id}
                                      data-row="9"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      step="0.1"
                                      min="0"
                                      max="100"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Sub-Contractor (£)</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-subcontractor`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].subContractor || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        subContractor: Math.max(0, parseFloat(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 10, colIndex)}
                                      data-task-id={task.id}
                                      data-row="10"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      step="0.01"
                                      min="0"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">OH&P % on Sub-Contractor</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-ohp-subcontractor`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].ohpSubContractor || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        ohpSubContractor: Math.max(0, parseFloat(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 11, colIndex)}
                                      data-task-id={task.id}
                                      data-row="11"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      step="0.1"
                                      min="0"
                                      max="100"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">Laboratory Testing (£)</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-laboratory`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].laboratoryTesting || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        laboratoryTesting: Math.max(0, parseFloat(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 12, colIndex)}
                                      data-task-id={task.id}
                                      data-row="12"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      step="0.01"
                                      min="0"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-300">OH&P % on Laboratory Testing</td>
                                {frequencyColumns.map((freq, colIndex) => (
                                  <td key={`${task.id}-${freq.key}-ohp-laboratory`} className="px-2 py-2 border-r border-gray-200">
                                    <input
                                      type="number"
                                      value={task.frequencies[freq.key].ohpLaboratoryTesting || ''}
                                      onChange={(e) => updateFrequencyData(task.id, freq.key, {
                                        ohpLaboratoryTesting: Math.max(0, parseFloat(e.target.value) || 0)
                                      })}
                                      onKeyDown={(e) => handleArrowKeyNavigation(e, task.id, 13, colIndex)}
                                      data-task-id={task.id}
                                      data-row="13"
                                      data-col={colIndex}
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-sm text-center bg-white"
                                      step="0.1"
                                      min="0"
                                      max="100"
                                    />
                                  </td>
                                ))}
                              </tr>
                              <tr className="bg-green-50 font-semibold">
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-300">TOTAL</td>
                                {frequencyColumns.map(freq => (
                                  <td key={`${task.id}-${freq.key}-quote`} className="px-2 py-3 text-center text-sm text-green-700 border-r border-gray-200">
                                    £{(task.frequencies[freq.key].quote ?? 0).toFixed(2)}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="mt-6 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Total Costs by Frequency - Analysis Review</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {frequencyColumns.map(freq => {
                    const details = detailedTotals[freq.key];
                    return (
                      <div key={freq.key} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                        <div className="text-sm font-semibold text-gray-800 mb-3 text-center border-b border-gray-200 pb-2">
                          {freq.label}
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Labour Hours:</span>
                            <span className="font-medium text-gray-900">{details.totalLabourHours.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Nett Consumables:</span>
                            <span className="font-medium text-gray-900">£{details.nettConsumables.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Materials/Plant:</span>
                            <span className="font-medium text-gray-900">£{details.materialsCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Sub-Contractor:</span>
                            <span className="font-medium text-gray-900">£{details.subContractorCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Laboratory Testing:</span>
                            <span className="font-medium text-gray-900">£{details.laboratoryTestingCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
                            <span className="font-semibold text-gray-800">Total Cost:</span>
                            <span className="font-bold text-green-600">£{details.totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg p-6 shadow-lg">
                  <h4 className="text-base font-bold text-white mb-4 text-center">Whole Proposal Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white/95 backdrop-blur rounded-lg p-4 text-center">
                      <div className="text-xs font-medium text-gray-600 mb-2">Total Hours</div>
                      <div className="text-xl font-bold text-blue-700">
                        {Object.values(detailedTotals).reduce((sum, freq) => sum + freq.totalLabourHours, 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white/95 backdrop-blur rounded-lg p-4 text-center">
                      <div className="text-xs font-medium text-gray-600 mb-2">Total Consumables</div>
                      <div className="text-xl font-bold text-green-700">
                        £{Object.values(detailedTotals).reduce((sum, freq) => sum + freq.nettConsumables, 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white/95 backdrop-blur rounded-lg p-4 text-center">
                      <div className="text-xs font-medium text-gray-600 mb-2">Total Materials/Plant</div>
                      <div className="text-xl font-bold text-orange-700">
                        £{Object.values(detailedTotals).reduce((sum, freq) => sum + freq.materialsCost, 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white/95 backdrop-blur rounded-lg p-4 text-center">
                      <div className="text-xs font-medium text-gray-600 mb-2">Total Sub-Contractor</div>
                      <div className="text-xl font-bold text-purple-700">
                        £{Object.values(detailedTotals).reduce((sum, freq) => sum + freq.subContractorCost, 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white/95 backdrop-blur rounded-lg p-4 text-center">
                      <div className="text-xs font-medium text-gray-600 mb-2">Total Lab Testing</div>
                      <div className="text-xl font-bold text-pink-700">
                        £{Object.values(detailedTotals).reduce((sum, freq) => sum + freq.laboratoryTestingCost, 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white/95 backdrop-blur rounded-lg p-4 text-center border-2 border-yellow-400">
                      <div className="text-xs font-medium text-gray-600 mb-2">Grand Total</div>
                      <div className="text-xl font-bold text-green-700">
                        £{Object.values(detailedTotals).reduce((sum, freq) => sum + freq.totalCost, 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Inclusions / Exclusions</h2>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600">
              Free-form text to describe project inclusions or exclusions (appears in client report)
            </label>
            <textarea
              value={proposal.notes.inclusionsExclusions || 'Inclusions:\n\nExclusions:\n\n'}
              onChange={(e) => setProposal(prev => ({
                ...prev,
                notes: { ...prev.notes, inclusionsExclusions: e.target.value }
              }))}
              placeholder="Enter inclusions or exclusions here..."
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-y"
            />
            <p className="text-xs text-gray-500">
              Tip: Use bullet points (•) or dashes (-) to format your list. This section will appear in the client report.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Final Adjustments</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg bg-white p-4">
                <div className="text-xs font-medium text-gray-600 mb-1">
                  Overall contingency % (applies to subtotal)
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={proposal.adjustments.overallContingencyPct || ''}
                  onChange={(e) => setProposal(prev => ({
                    ...prev,
                    adjustments: { ...prev.adjustments, overallContingencyPct: Math.max(0, parseFloat(e.target.value) || 0) }
                  }))}
                  placeholder="e.g., 5"
                  className="w-full font-semibold text-gray-900 bg-transparent border-none focus:outline-none p-0"
                />
              </div>

              <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                <div className="text-xs font-medium text-gray-600 mb-1">Overall contingency amount</div>
                <div className="text-lg font-semibold text-gray-900">
                  £{calculateOverallTotals().contingencyAmount.toFixed(2)}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                <div className="text-xs font-medium text-gray-600 mb-1">Provisional sums total</div>
                <div className="text-lg font-semibold text-gray-900">
                  £{calculateOverallTotals().provisionalTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Provisional Sums</h3>

              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-b border-gray-200">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 border-b border-gray-200">
                        Amount (£)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 border-b border-gray-200">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal.adjustments.provisionalSums.map((sum) => (
                      <tr key={sum.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 border-b border-gray-200">
                          <textarea
                            value={sum.description}
                            onChange={(e) => handleUpdateProvisionalSum(sum.id, 'description', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-colors text-sm resize-none"
                            placeholder="Enter description..."
                            rows={2}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-200">
                          <input
                            type="number"
                            step="0.01"
                            value={sum.amount || ''}
                            onChange={(e) => handleUpdateProvisionalSum(sum.id, 'amount', Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-colors text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-200 text-center">
                          <button
                            onClick={() => handleDeleteProvisionalSum(sum.id)}
                            className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleAddProvisionalSum}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add provisional sum
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Overall Totals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
              <div className="text-xs font-medium text-gray-600 mb-1">Subtotal (all frequencies)</div>
              <div className="text-lg font-semibold text-gray-900">
                £{calculateOverallTotals().subtotal.toFixed(2)}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
              <div className="text-xs font-medium text-gray-600 mb-1">
                Overall contingency ({(proposal.adjustments.overallContingencyPct || 0).toFixed(2)}%)
              </div>
              <div className="text-lg font-semibold text-gray-900">
                £{calculateOverallTotals().contingencyAmount.toFixed(2)}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
              <div className="text-xs font-medium text-gray-600 mb-1">Provisional sums total</div>
              <div className="text-lg font-semibold text-gray-900">
                £{calculateOverallTotals().provisionalTotal.toFixed(2)}
              </div>
            </div>

            <div className="border-2 border-green-600 rounded-lg bg-gradient-to-br from-green-50 to-green-100 p-4">
              <div className="text-xs font-bold text-green-800 mb-1">GRAND TOTAL</div>
              <div className="text-2xl font-bold text-green-700">
                £{calculateOverallTotals().grandTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Submission</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Submission Type
                </label>
                <select
                  value={proposal.submission.quotedText || ''}
                  onChange={(e) => setProposal(prev => ({
                    ...prev,
                    submission: { ...prev.submission, quotedText: e.target.value }
                  }))}
                  disabled={!!proposal.submission.confirmedAt}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select submission type...</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Quotation">Quotation</option>
                  <option value="Budget Price">Budget Price</option>
                  <option value="Target Price">Target Price</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Price Issued (£)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    £
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={proposal.submission.issuedPrice || ''}
                    onChange={(e) => setProposal(prev => ({
                      ...prev,
                      submission: { ...prev.submission, issuedPrice: parseFloat(e.target.value) || null }
                    }))}
                    placeholder="0.00"
                    disabled={!!proposal.submission.confirmedAt}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {proposal.submission.issuedPrice !== null && (
              <div className="mt-4">
                <div className={`border rounded-lg p-4 ${
                  (proposal.submission.issuedPrice - calculateOverallTotals().grandTotal) > 0 ? 'bg-green-50 border-green-200' :
                  (proposal.submission.issuedPrice - calculateOverallTotals().grandTotal) < 0 ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="text-xs font-medium text-gray-600 mb-1">Price Difference</div>
                  <div className={`text-2xl font-bold ${
                    (proposal.submission.issuedPrice - calculateOverallTotals().grandTotal) > 0 ? 'text-green-700' :
                    (proposal.submission.issuedPrice - calculateOverallTotals().grandTotal) < 0 ? 'text-red-700' :
                    'text-blue-700'
                  }`}>
                    {(proposal.submission.issuedPrice - calculateOverallTotals().grandTotal) >= 0 ? '+' : ''}
                    £{(proposal.submission.issuedPrice - calculateOverallTotals().grandTotal).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {(proposal.submission.issuedPrice - calculateOverallTotals().grandTotal) > 0 && 'Above calculated total'}
                    {(proposal.submission.issuedPrice - calculateOverallTotals().grandTotal) < 0 && 'Below calculated total'}
                    {(proposal.submission.issuedPrice - calculateOverallTotals().grandTotal) === 0 && 'Matches calculated total'}
                  </div>
                </div>
              </div>
            )}

            {proposal.submission.confirmedAt && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">Submission Confirmed</div>
                    <div className="text-sm text-green-700 mt-1">
                      Price: £{proposal.submission.issuedPrice?.toFixed(2)}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Confirmed on {new Date(proposal.submission.confirmedAt).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {status === 'draft' && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={!currentId}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <CheckCircle className="w-5 h-5" />
                  Submit Proposal
                </button>
              </div>
            )}
          </div>
        </div>

        <MaintenancePrintLayout
          proposal={proposal}
          isVisible={showPrintLayout}
        />
      </div>

      <MaintenanceEmailIntegration
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        proposal={proposal}
      />

      {currentId && (
        <>
          <MaintenanceProposalShareManager
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            proposalId={currentId}
            proposalTitle={`${proposal.header.jobNumber} - ${proposal.header.clientName}`}
          />

          <MaintenanceProposalRevisionHistory
            isOpen={showRevisionHistory}
            onClose={() => setShowRevisionHistory(false)}
            proposalId={currentId}
            proposalTitle={`${proposal.header.jobNumber} - ${proposal.header.clientName}`}
            onLoadRevision={handleLoadRevision}
          />
        </>
      )}

      {showReport && (
        <MaintenanceProposalReport
          proposal={proposal}
          onClose={() => setShowReport(false)}
        />
      )}

      {showInternalReport && (
        <MaintenanceInternalReport
          proposal={proposal}
          onClose={() => setShowInternalReport(false)}
        />
      )}

      <LabourRateOverrideSettings
        isOpen={showLabourRateOverrides}
        onClose={() => setShowLabourRateOverrides(false)}
        proposalId={currentId}
        onOverridesUpdated={async () => {
          if (!currentId) return;

          const [standardRatesResult, overridesResult] = await Promise.all([
            labourRatesService.getLabourRates(),
            labourRateOverrideService.getOverridesForProposal(currentId),
          ]);

          if (standardRatesResult.data && overridesResult.data) {
            const overrideMap = new Map<string, number>();
            overridesResult.data.forEach(override => {
              overrideMap.set(override.labour_rate_id, parseFloat(String(override.override_rate)));
            });

            setProposal(prev => ({
              ...prev,
              labourRates: standardRatesResult.data!
                .filter(rate => rate.is_active)
                .map(rate => ({
                  id: rate.id,
                  name: rate.name,
                  base: parseFloat(String(rate.base_rate)),
                  overrideRate: overrideMap.get(rate.id),
                })),
            }));
          }
        }}
      />

      {showTemplateManager && (
        <ProposalTemplateManager
          onClose={() => setShowTemplateManager(false)}
          onSelectTemplate={handleLoadFromTemplate}
          onSaveAsTemplate={handleSaveAsTemplate}
          currentProposalData={currentId ? proposal : null}
        />
      )}

      {showTaskLibrary && (
        <TaskLibrary
          onClose={() => setShowTaskLibrary(false)}
          onSelectTasks={handleAddTasksFromLibrary}
        />
      )}

      {showEnhancedEmail && currentId && (
        <EnhancedEmailSender
          proposalId={currentId}
          proposalData={proposal}
          onClose={() => setShowEnhancedEmail(false)}
        />
      )}
    </div>
  );
}
