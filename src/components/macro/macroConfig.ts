/**
 * Configuration for how each macro series should be displayed in the heatmap.
 * Defines split rules (multiple rows per series) and default display modes.
 */

export type DisplayMode = 'level' | 'mom' | 'yoy';

export interface SplitRule {
  suffix: string;
  mode: DisplayMode;
}

/**
 * Series that should be shown as multiple rows with different display modes.
 * Key = series_code from macro_series_metadata
 */
export const SPLIT_SERIES: Record<string, SplitRule[]> = {
  // === BRASIL ===
  '24364': [
    { suffix: '(M/M)', mode: 'mom' },
    { suffix: '(A/A)', mode: 'yoy' },
  ],
  '433': [
    { suffix: '(M/M)', mode: 'mom' },
  ],
  '7478': [
    { suffix: '(M/M)', mode: 'mom' },
    { suffix: '(12m)', mode: 'yoy' },
  ],
  '11427': [
    { suffix: '(M/M)', mode: 'mom' },
    { suffix: '(12m)', mode: 'yoy' },
  ],
  '10844': [
    { suffix: '(M/M)', mode: 'mom' },
    { suffix: '(12m)', mode: 'yoy' },
  ],

  // === ESTADOS UNIDOS ===
  'CPIAUCSL': [
    { suffix: '(M/M)', mode: 'mom' },
    { suffix: '(A/A)', mode: 'yoy' },
  ],
  'CPILFESL': [
    { suffix: '(M/M)', mode: 'mom' },
    { suffix: '(A/A)', mode: 'yoy' },
  ],
  'PCEPI': [
    { suffix: '(M/M)', mode: 'mom' },
    { suffix: '(A/A)', mode: 'yoy' },
  ],
  'PCEPILFE': [
    { suffix: '(M/M)', mode: 'mom' },
    { suffix: '(A/A)', mode: 'yoy' },
  ],
};

/**
 * Series where the raw_value from the API IS already the % variation.
 * For these, display raw_value directly when mode is 'mom',
 * instead of the computed mom_value (which would be change-of-change).
 */
export const RAW_IS_VARIATION: Set<string> = new Set([
  '433',    // IPCA mensal
  '7478',   // IPCA-15
  '11427',  // Núcleo IPCA
  '10844',  // IPCA Serviços
]);

/**
 * Series where the 12m accumulated should be computed from
 * monthly raw values (compounded product) instead of using yoy_value.
 */
export const COMPUTE_12M_ACCUMULATED: Set<string> = new Set([
  '11427',  // Núcleo IPCA — raw is monthly %, need to compound for 12m
  '10844',  // IPCA Serviços — raw is monthly %, need to compound for 12m
  '7478',   // IPCA-15 — raw is monthly %, need to compound for 12m
]);

/**
 * Anchor-based scoring: instead of z-score, score is based on distance
 * from a reference point. Used for series with economic targets/anchors.
 * 
 * For 'target' type: within band = green, outside = red
 * For 'anchor' type: below anchor = green (if polarity negative), above = red
 */
export interface AnchorConfig {
  type: 'target' | 'anchor';
  center: number;       // Reference point (e.g., 3.0% for inflation target)
  bandLow?: number;     // Lower band edge (target type)
  bandHigh?: number;    // Upper band edge (target type)
  scalePerUnit?: number; // Score units per % point beyond band (default 1.0)
}

export const ANCHOR_SCORING: Record<string, AnchorConfig> = {
  // IPCA 12m: meta 3.0% ± 1.5pp → banda 1.5% a 4.5%
  '13522': {
    type: 'target',
    center: 3.0,
    bandLow: 1.5,
    bandHigh: 4.5,
    scalePerUnit: 1.0,
  },
  // Dívida Bruta/PIB: 70% como neutro
  '13762': {
    type: 'anchor',
    center: 70,
    scalePerUnit: 0.2, // each 5pp = 1 score unit
  },
};

/**
 * Rename map for series that appear as a single row but with a custom label.
 */
export const RENAME_SERIES: Record<string, string> = {
  '13522': 'IPCA (12m)',
};

/**
 * Default display mode for series NOT in SPLIT_SERIES.
 */
export const DEFAULT_MODES: Record<string, DisplayMode> = {
  // BR Activity → M/M
  'IBGE_PMS': 'mom',
  'IBGE_PIM': 'mom',
  'IBGE_PMC': 'mom',
  // BR Inflation
  '13522': 'level',
  // BR Labor
  '24369': 'level',
  '24379': 'level',
  '24382': 'mom',
  // BR Financial
  '432': 'level',
  '20539': 'mom',
  '25351': 'level',
  '21082': 'level',
  // BR Fiscal
  '13762': 'level',
  '22707': 'level',
  '13621': 'level',
  // BR Confiança
  'FECOM_CONS': 'level',
  'FGV_CONS': 'level',
  'FGV_IND': 'level',
  // US Housing
  'MORTGAGE30US': 'level',
  'PERMIT': 'mom',
  'HOUST': 'mom',
  'HSN1F': 'mom',
  // US Activity
  'PCEC96': 'mom',
  'INDPRO': 'mom',
  'RSAFS': 'mom',
  'GDPC1': 'yoy',
  // US Labor
  'UNRATE': 'level',
  'PAYEMS': 'mom',
  'CIVPART': 'level',
  'CES0500000003': 'yoy',
  'DSPIC96': 'yoy',
  // US Policy/Markets
  'FEDFUNDS': 'level',
  'T10Y2Y': 'level',
  'STLFSI4': 'level',
};
