export type FrequencyType = 'biennial' | 'annual' | 'sixMonthly' | 'quarterly' | 'biMonthly' | 'monthly' | 'weekly' | 'daily';

export interface FrequencyData {
  hours: number;
  noOfMen: number;
  rate: number;
  rateId: string;
  otPremium: number;
  adminMarkup: number;
  noOfVisit: number;
  consumables: number;
  ohpConsumables: number;
  materialsPlantHire: number;
  ohpMaterialsPlantHire: number;
  subContractor: number;
  ohpSubContractor: number;
  laboratoryTesting: number;
  ohpLaboratoryTesting: number;
  quote: number;
}

export interface MaintenanceTask {
  id: string;
  taskDescription: string;
  number: string;
  activeFrequencies: Set<FrequencyType>;
  frequencies: {
    [key in FrequencyType]: FrequencyData;
  };
}

export interface ProvisionalSum {
  id: string;
  description: string;
  amount: number;
}

export interface LabourRateOverride {
  id: string;
  proposal_id: string;
  labour_rate_id: string;
  override_rate: number;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceProposalData {
  id?: string;
  header: {
    customerNumber: string;
    clientName: string;
    site: string;
    project: string;
    jobNumber: string;
    preparedBy: string;
    contractPeriod: number;
    authorNotes?: string;
  };
  tasks: MaintenanceTask[];
  labourRates: Array<{
    id: string;
    name: string;
    base: number;
    overrideRate?: number;
  }>;
  additionalCosts: {
    emergencyCallouts: number;
    outOfHoursRate: number;
    materials: number;
    specialistSubcontractors: number;
    laboratoryTesting: number;
    materialsAddonPerc: number;
    subcontractorAddonPerc: number;
    laboratoryTestingAddonPerc: number;
  };
  adjustments: {
    contingencyPerc: number;
    overallContingencyPct: number;
    provisionalSums: ProvisionalSum[];
  };
  notes: {
    scopeOfWork: string;
    inclusions: string;
    exclusions: string;
    terms: string;
    inclusionsExclusions: string;
  };
  submission: {
    quotedText: string;
    issuedPrice: number | null;
    confirmedAt: string | null;
  };
  currentQuoteId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const frequencyColumns: { key: FrequencyType; label: string; visitsPerYear: number }[] = [
  { key: 'biennial', label: 'Biennial', visitsPerYear: 0.5 },
  { key: 'annual', label: 'Annual', visitsPerYear: 1 },
  { key: 'sixMonthly', label: 'Six Monthly', visitsPerYear: 2 },
  { key: 'quarterly', label: 'Quarterly', visitsPerYear: 4 },
  { key: 'biMonthly', label: 'Bi-Monthly', visitsPerYear: 6 },
  { key: 'monthly', label: 'Monthly', visitsPerYear: 12 },
  { key: 'weekly', label: 'Weekly', visitsPerYear: 52 },
  { key: 'daily', label: 'Daily', visitsPerYear: 260 },
];

export const createEmptyFrequencyData = (): FrequencyData => ({
  hours: 0,
  noOfMen: 0,
  rate: 0,
  rateId: '',
  otPremium: 0,
  adminMarkup: 0,
  noOfVisit: 0,
  consumables: 0,
  ohpConsumables: 0,
  materialsPlantHire: 0,
  ohpMaterialsPlantHire: 0,
  subContractor: 0,
  ohpSubContractor: 0,
  laboratoryTesting: 0,
  ohpLaboratoryTesting: 0,
  quote: 0,
});

export const createEmptyTask = (): MaintenanceTask => ({
  id: `task-${Date.now()}`,
  taskDescription: '',
  number: 'NEW',
  activeFrequencies: new Set<FrequencyType>(),
  frequencies: {
    biennial: createEmptyFrequencyData(),
    annual: createEmptyFrequencyData(),
    sixMonthly: createEmptyFrequencyData(),
    quarterly: createEmptyFrequencyData(),
    biMonthly: createEmptyFrequencyData(),
    monthly: createEmptyFrequencyData(),
    weekly: createEmptyFrequencyData(),
    daily: createEmptyFrequencyData(),
  },
});

export type VisitFrequency = 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual';

export interface MaintenanceVisit {
  id: string;
  frequency: VisitFrequency;
  description: string;
  timePerVisit: number;
  visitsPerYear: number;
  labourRateId?: string;
  band: number;
  materials: number;
  subcontractor: number;
  laboratoryTesting: number;
}

export const frequencyOptions: { value: VisitFrequency; label: string; visitsPerYear: number }[] = [
  { value: 'weekly', label: 'Weekly', visitsPerYear: 52 },
  { value: 'monthly', label: 'Monthly', visitsPerYear: 12 },
  { value: 'quarterly', label: '3 Monthly (Quarterly)', visitsPerYear: 4 },
  { value: 'biannual', label: '6 Monthly (Bi-Annual)', visitsPerYear: 2 },
  { value: 'annual', label: 'Annual', visitsPerYear: 1 },
];

export const otPremiumOptions = [
  { value: 0, label: 'R1 (0%)' },
  { value: 150, label: 'R2 (150%)' },
  { value: 200, label: 'R3 (200%)' },
];
