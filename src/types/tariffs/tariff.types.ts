/**
 * UK Global Tariff Data Types
 *
 * Defines tariff lookup structures used by the refund and analysis engines.
 */

export interface MeasureCondition {
  condition_code: string;
  requirement: string;
  certificate_required?: string;
}

export interface TariffEntry {
  commodity_code: string;
  description: string;
  duty_type: 'ad_valorem' | 'specific' | 'mixed' | 'compound';
  duty_rate_ad_valorem?: number;
  duty_rate_specific?: number;
  unit?: string;
  measure_conditions?: MeasureCondition[];
  preferential_rates?: Record<string, number>;
  valid_from: string;
  valid_to?: string;
  footnotes?: string[];
}

export interface TariffLookupResult {
  found: boolean;
  tariff?: TariffEntry;
  alternatives?: TariffEntry[];
  error?: string;
}
