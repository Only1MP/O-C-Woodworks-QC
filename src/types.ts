/**
 * Represents the structured record of a wooden component part type.
 */
export type Part = 'Side' | 'End' | 'Bottom' | 'Lid' | 'Divider' | 'Other';

/**
 * Defines all standard categories of Quality Control defects.
 */
export type DefectType =
  | 'Assembly Error - Repaired'
  | 'Assembly Error - Scrap'
  | 'Beatle Kill Streaks'
  | 'Damaged During Repair'
  | 'Fastener Defect'
  | 'Length'
  | 'Mold'
  | 'Sanding'
  | 'Thick'
  | 'Thin'
  | 'Width'
  | 'Wood Defect';

/**
 * Ordered list of standard wooden parts used throughout the application.
 */
export const STANDARD_PARTS: Part[] = [
  'Side',
  'End',
  'Bottom',
  'Lid',
  'Divider',
  'Other'
];

/**
 * Alphabetically sorted array of standard quality defect categories.
 */
export const DEFECT_TYPES_LIST: DefectType[] = [
  'Assembly Error - Repaired',
  'Assembly Error - Scrap',
  'Beatle Kill Streaks',
  'Damaged During Repair',
  'Fastener Defect',
  'Length',
  'Mold',
  'Sanding',
  'Thick',
  'Thin',
  'Width',
  'Wood Defect'
];

/**
 * A 2D-like dictionary mapping wood parts to defect categories and their tally counts.
 * Integrators: This can easily map to a JSON field in Postgres or flat relational tables.
 */
export interface DefectMatrix {
  [part: string]: {
    [defect: string]: number;
  };
}

/**
 * Represents the labor assignments for a single shift across workstations.
 */
export interface ShiftAssignments {
  Sides: string[];
  Crates: string[];
  Bottoms: string[];
  Lids: string[];
}

/**
 * Tracks the master employee registry and shift workstation assignments.
 */
export interface ProductionLineState {
  employees: string[];
  morning: ShiftAssignments;
  afternoon: ShiftAssignments;
}

/**
 * Primary model representing a finalized Daily Quality Control Defect Log.
 * Ideal for persistence mapping to SQL databases, REST APIs, or ERP synchronization.
 */
export interface QCDefectLog {
  id: string; // Unique alphanumeric log ID
  date: string; // Date of inspection (YYYY-MM-DD)
  sku: string; // Product SKU being inspected
  shiftReportedBy: string; // QC Inspector/Operator name
  matrix: DefectMatrix; // Quantified defect tally breakdown
  kitBins?: Record<string, boolean>; // Kit Bin flags per Part (default false/unchecked)
  additionalNotes: string; // Qualitative inspector observations
  createdAt: string; // ISO 8601 Timestamp of submission
  positions?: { // Labor layout snapshot at time of report
    morning: ShiftAssignments;
    afternoon: ShiftAssignments;
  };
}

/**
 * Utility function to instantiate zeroed Kit Bin checkbox states.
 */
export function createEmptyKitBins(): Record<string, boolean> {
  const kitBins: Record<string, boolean> = {};
  for (const part of STANDARD_PARTS) {
    kitBins[part] = false;
  }
  return kitBins;
}

/**
 * Utility function to instantiate a zeroed defect tally matrix.
 */
export function createEmptyMatrix(): DefectMatrix {
  const matrix: DefectMatrix = {};
  for (const part of STANDARD_PARTS) {
    matrix[part] = {};
    for (const defect of DEFECT_TYPES_LIST) {
      matrix[part][defect] = 0;
    }
  }
  return matrix;
}
