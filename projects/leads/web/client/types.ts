/**
 * FL Sunbiz Leads - Client Types
 * Types matching the backend API schemas
 */

export interface DeliverySettings {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  recipient_email: string;
  recipient_name: string;
  format: 'csv_attachment' | 'inline';
  subject: string;
}

export interface ProfileSettings {
  name: string;
  email_lookup: boolean;
  date_range: 'daily' | 'weekly' | 'monthly';
  max_leads: number;
  filing_types: string[];
  keywords: string[];
  exclude_keywords: string[];
  target_counties: string[] | null;
  delivery: DeliverySettings;
  sender: string;
}

export interface Profile {
  id: string;
  name: string;
  active: boolean;
  paid: boolean;
  settings: ProfileSettings;
  created_at: string;
}

export interface ProfileCreateRequest {
  name: string;
  settings: ProfileSettings;
}

export interface ProfileUpdateRequest {
  name?: string;
  settings?: ProfileSettings;
  active?: boolean;
}

export interface CheckoutRequest {
  profile_id: string;
  price_id: string;
  success_url: string;
  cancel_url: string;
}

export interface CheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Florida counties for target selection
export const FL_COUNTIES = [
  'ALACHUA', 'BAKER', 'BAY', 'BRADFORD', 'BREVARD', 'BROWARD', 'CALHOUN',
  'CHARLOTTE', 'CITRUS', 'CLAY', 'COLLIER', 'COLUMBIA', 'DADE', 'DESOTO',
  'DIXIE', 'DUVAL', 'ESCAMBIA', 'FLAGLER', 'FRANKLIN', 'GADSDEN', 'GILCHRIST',
  'GLADES', 'GULF', 'HAMILTON', 'HARDEE', 'HENDRY', 'HERNANDO', 'HIGHLANDS',
  'HILLSBOROUGH', 'HOLMES', 'INDIAN RIVER', 'JACKSON', 'JEFFERSON', 'LAFAYETTE',
  'LAKE', 'LEE', 'LEON', 'LEVY', 'LIBERTY', 'MADISON', 'MANATEE', 'MARION',
  'MARTIN', 'MONROE', 'NASSAU', 'OKALOOSA', 'OKEECHOBEE', 'ORANGE', 'OSCEOLA',
  'PALM BEACH', 'PASCO', 'PINELLAS', 'POLK', 'PUTNAM', 'SANTA ROSA', 'SARASOTA',
  'SEMINOLE', 'ST JOHNS', 'ST LUCIE', 'SUMTER', 'SUWANNEE', 'TAYLOR', 'UNION',
  'VOLUSIA', 'WAKULLA', 'WALTON', 'WASHINGTON'
] as const;

// Filing types
export const FILING_TYPES = {
  // For-profit
  'FLAL': 'Florida Limited Liability Company',
  'DOMP': 'Domestic Profit Corporation',
  'FORP': 'Foreign Profit Corporation',
  'FORL': 'Foreign Limited Liability Company',
  'FLPL': 'Florida Limited Partnership',
  'FORLP': 'Foreign Limited Partnership',
  // Non-profit
  'DOMNP': 'Domestic Non-Profit Corporation',
  'FORNP': 'Foreign Non-Profit Corporation',
  'NPREG': 'Non-Profit Registration',
} as const;

// Default profile settings for new profiles
export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  name: '',
  email_lookup: true,
  date_range: 'daily',
  max_leads: 30,
  filing_types: ['FLAL', 'DOMP', 'FORP'],
  keywords: [],
  exclude_keywords: [],
  target_counties: null,
  delivery: {
    frequency: 'daily',
    day_of_week: 'monday',
    recipient_email: '',
    recipient_name: '',
    format: 'csv_attachment',
    subject: 'Lead Report - {date}',
  },
  sender: 'leads@ridgefield.llc',
};
