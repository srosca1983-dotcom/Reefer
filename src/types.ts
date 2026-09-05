/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ManifestContainer {
  reefer_no: string;
  position: string;
  manifest_set_temp: number | null;
  vent: string;
  bay: number | null;
  deck_section: 'ABOVE' | 'BELOW' | 'UNKNOWN';
  hatch: number | null;
  position_source: 'manifest' | 'override';
  original_position?: string; // Cache original if overridden
}

export interface AssetContainer {
  reefer_no: string;
  asset_position: string;
  asset_set_temp: number | null;
  ccalerts: string;
  alarms: string;
  asset_bay: number | null;
  asset_day_label: string;
  source_file: string;
}

export interface BayHatchMap {
  bay: number;
  hatch: number;
}

export interface PositionOverride {
  reefer_no: string;
  original_position: string;
  corrected_position: string;
  source_scan: string;
  change_recorded_at: string;
}

export interface TempDiscrepancy {
  reefer_no: string;
  position: string;
  asset_position: string;
  manifest_set_temp: number | null;
  asset_set_temp: number | null;
  issue: string;
}

export interface PositionDiscrepancy {
  reefer_no: string;
  position: string; // manifest position
  asset_position: string; // latest telemetry position
  issue: string;
  position_source: string;
}

export interface AlarmReport {
  reefer_no: string;
  asset_position: string;
  ccalerts: string;
  alarms: string;
  has_alarm: boolean;
}

export interface DailyTelemetryRecord {
  reefer_no: string;
  asset_set_temp: number | null;
  day_index: number; // 1 to 6
}
