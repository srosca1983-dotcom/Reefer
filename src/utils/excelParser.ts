/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import {
  ManifestContainer,
  AssetContainer,
  BayHatchMap,
  PositionOverride,
  TempDiscrepancy,
  PositionDiscrepancy,
  AlarmReport
} from '../types';

export function normalizePosition(pos: any): string {
  if (pos === null || pos === undefined) return '';
  const str = String(pos).trim().toUpperCase().replace(/\s+/g, '');
  const digits = str.replace(/\D/g, '');
  if (digits) {
    return digits.replace(/^0+/, '');
  }
  return str;
}

export function extractBay(position: string): number | null {
  const norm = normalizePosition(position);
  if (!norm) return null;
  const digits = norm.replace(/\D/g, '');
  if (digits.length === 5) {
    return parseInt(digits.slice(0, 1), 10);
  } else if (digits.length >= 6) {
    return parseInt(digits.slice(0, 2), 10);
  }
  return null;
}

export function inferAboveBelow(position: string): 'ABOVE' | 'BELOW' | 'UNKNOWN' {
  const norm = normalizePosition(position);
  if (!norm) return 'UNKNOWN';
  const digits = norm.replace(/\D/g, '');
  if (digits.length < 4) {
    return 'UNKNOWN';
  }
  // Stowage codes: BB (bay) RR (row) TT (tier). Tiers on deck are 80, 82, 84, etc., hold are 02, 04, 06, etc.
  const tier = parseInt(digits.slice(-2), 10);
  if (isNaN(tier)) return 'UNKNOWN';
  return tier >= 80 ? 'ABOVE' : 'BELOW';
}

export function getGroupedPlugsForBaySection(bay: string, elevation: 'ABOVE' | 'BELOW') {
  const T_ABOVE = bay === '02' ? ['88', '86', '84', '82'] : ['84', '82'];
  const T_BELOW = bay === '02' ? ['08', '06', '04', '02'] : (bay === '18' ? ['10', '08', '06', '04', '02'] : []);
  const tiers = elevation === 'ABOVE' ? T_ABOVE : T_BELOW;

  return tiers.map(tier => {
    let rows: string[] = [];
    if (elevation === 'ABOVE') {
      if (bay === '02') {
        rows = ['10', '08', '06', '04', '02', '00', '01', '03', '05', '07', '09'];
      } else {
        rows = ['12', '10', '08', '06', '04', '02', '01', '03', '05', '07', '09', '11'];
      }
    } else {
      // BELOW
      if (bay === '02') {
        if (tier === '02') {
          rows = ['04', '02', '00', '01', '03'];
        } else {
          rows = ['06', '04', '02', '00', '01', '03', '05'];
        }
      } else if (bay === '18') {
        rows = ['06', '04', '02', '00', '01', '03', '05'];
      }
    }

    return {
      tier,
      plugs: rows.map(row => `${bay}-${row}-${tier}`)
    };
  });
}

export function getPlugsForBaySection(bay: string, elevation: 'ABOVE' | 'BELOW'): string[] {
  const grouped = getGroupedPlugsForBaySection(bay, elevation);
  const list: string[] = [];
  grouped.forEach(g => {
    list.push(...g.plugs);
  });
  return list;
}

export function getVentText(vent: any): string {
  if (vent === null || vent === undefined) return '';
  const s = String(vent).trim();
  if (s.toUpperCase() === 'C' || s.toUpperCase() === 'CLOSED') {
    return 'Closed';
  }
  if (s.toUpperCase() === 'O' || s.toUpperCase() === 'OPEN') {
    return 'Open';
  }
  return s;
}

export function normalizeTemp(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const num = parseFloat(v);
  if (isNaN(num)) return null;
  return Math.round(num * 10) / 10;
}

/**
 * Reads binary file and parses first sheet into row objects
 */
export function readSheetRows(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses Manifest file rows
 */
export function parseManifest(rawRows: any[][]): ManifestContainer[] {
  if (rawRows.length < 1) return [];

  // Find headers
  let headerIndex = 0;
  // Look for a row that has standard manifest terms
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i].map(c => String(c).toLowerCase().trim());
    if (row.includes('equipment') || row.some(c => c.includes('stowage') || c.includes('stow'))) {
      headerIndex = i;
      break;
    }
  }

  const headers = rawRows[headerIndex].map(h => String(h).trim().toLowerCase());
  const dataRows = rawRows.slice(headerIndex + 1);

  // Identify column indices
  const equipmentIdx = headers.findIndex(h => h === 'equipment');
  const stowageIdx = headers.findIndex(h => h.includes('stowage location') || h.includes('stowage') || h.includes('location') || h === 'stow');
  const minTempIdx = headers.findIndex(h => h.includes('min temp'));
  const maxTempIdx = headers.findIndex(h => h.includes('max temp') || h.includes('set temp'));
  const ventIdx = headers.findIndex(h => h.includes('vent setting') || h.includes('vent') || h.includes('ventilation'));

  if (equipmentIdx === -1 || stowageIdx === -1) {
    throw new Error('Manifest validation failed: Required columns ("Equipment" and "Stowage Location") could not be found.');
  }

  const list: ManifestContainer[] = [];
  const seenReefers = new Set<string>();

  dataRows.forEach(row => {
    const reeferNo = String(row[equipmentIdx] || '').trim().toUpperCase();
    if (!reeferNo || reeferNo === 'undefined' || reeferNo.length < 5) return;

    // Skip summary / labels
    if (
      reeferNo.includes('TOTAL') ||
      reeferNo.includes('SUM') ||
      reeferNo.includes('PAGE') ||
      reeferNo.includes('EQUCTION') ||
      reeferNo.includes('MANIFEST') ||
      reeferNo.includes('VESSEL')
    ) {
      return;
    }

    const rawPos = String(row[stowageIdx] || '').trim();
    const position = normalizePosition(rawPos);
    if (!position || position.length < 4) return; // Must be assigned to a real stowage spot

    // Standard container validation (must contain letters and digits)
    if (!/[A-Z]/.test(reeferNo) || !/\d/.test(reeferNo)) return;

    // Deduplicate - keep only the first valid record
    if (seenReefers.has(reeferNo)) return;
    seenReefers.add(reeferNo);

    // Default set temp prefers max temp column if exists, otherwise tries min temp or default
    const rawSetTemp = maxTempIdx !== -1 ? row[maxTempIdx] : (minTempIdx !== -1 ? row[minTempIdx] : null);
    const manifestSetTemp = normalizeTemp(rawSetTemp);
    if (manifestSetTemp === null) return; // Skip non-reefer (dry) containers that don't have a climate set temperature

    const vent = ventIdx !== -1 ? getVentText(row[ventIdx]) : '';
    const bay = extractBay(position);
    const deckSection = inferAboveBelow(position);
    const hatch = bay !== null ? Math.max(2, Math.floor((bay + 3) / 4) + 1) : null;

    list.push({
      reefer_no: reeferNo,
      position,
      manifest_set_temp: manifestSetTemp,
      vent,
      bay,
      deck_section: deckSection,
      hatch, // Calculated automatically based on physical ship layout
      position_source: 'manifest'
    });
  });

  return list;
}

/**
 * Parses Asset file rows
 */
export function parseAssets(rawRows: any[][], fileName: string, dayLabel: string): AssetContainer[] {
  if (rawRows.length < 1) return [];

  let headerIndex = 0;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i].map(c => String(c).toLowerCase().trim());
    if (row.includes('asset id') || row.includes('bay location') || row.some(s => s.includes('t set'))) {
      headerIndex = i;
      break;
    }
  }

  const headers = rawRows[headerIndex].map(h => String(h).trim().toLowerCase());
  const dataRows = rawRows.slice(headerIndex + 1);

  const assetIdIdx = headers.findIndex(h => h === 'asset id' || h.includes('asset') || h === 'equipment');
  const bayLocIdx = headers.findIndex(h => h === 'bay location' || h.includes('stowage') || h.includes('position') || h.includes('bay'));
  const setTempIdx = headers.findIndex(h => h === 't set (f)' || h.includes('set temp') || h.includes('t set'));
  const ccAlertsIdx = headers.findIndex(h => h === 'ccalerts' || h.includes('ccalert'));
  const alarmsIdx = headers.findIndex(h => h === 'alarms' || h === 'alarm');

  if (assetIdIdx === -1 || bayLocIdx === -1) {
    throw new Error('Assets file validation failed: Required columns ("Asset ID" and "Bay Location") could not be found.');
  }

  const list: AssetContainer[] = [];
  dataRows.forEach(row => {
    let reeferNo = String(row[assetIdIdx] || '').trim().toUpperCase();
    if (!reeferNo || reeferNo === 'undefined' || reeferNo.length < 4) return;

    // Ignore leading 0 or 00 in asset file to match the manifest reefer numbers
    if (reeferNo.startsWith('00')) {
      reeferNo = reeferNo.substring(2);
    } else if (reeferNo.startsWith('0')) {
      reeferNo = reeferNo.substring(1);
    }

    const rawPos = String(row[bayLocIdx] || '').trim();
    const assetPosition = normalizePosition(rawPos);

    const assetSetTemp = setTempIdx !== -1 ? normalizeTemp(row[setTempIdx]) : null;
    const ccalerts = ccAlertsIdx !== -1 ? String(row[ccAlertsIdx] || '').trim() : '';
    const alarms = alarmsIdx !== -1 ? String(row[alarmsIdx] || '').trim() : '';
    const assetBay = extractBay(assetPosition);

    list.push({
      reefer_no: reeferNo,
      asset_position: assetPosition,
      asset_set_temp: assetSetTemp,
      ccalerts,
      alarms,
      asset_bay: assetBay,
      asset_day_label: dayLabel,
      source_file: fileName
    });
  });

  return list;
}

/**
 * Parses Bay to Hatch conversion flat text using regex
 */
export function parseBayHatchMap(rawRows: any[][]): BayHatchMap[] {
  // Flattens sheet content to text
  let text = '';
  rawRows.forEach(row => {
    if (Array.isArray(row)) {
      row.forEach(val => {
        if (val !== undefined && val !== null && val !== '') {
          text += ' ' + String(val);
        }
      });
    }
  });

  const pairs: BayHatchMap[] = [];
  const regex = /(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s+HATCH\s+(\d+)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const a = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    const c = parseInt(match[3], 10);
    const hatch = parseInt(match[4], 10);

    pairs.push({ bay: a, hatch });
    pairs.push({ bay: b, hatch });
    pairs.push({ bay: c, hatch });
  }

  // Deduplicate
  const seen = new Set<string>();
  const uniqPairs: BayHatchMap[] = [];
  pairs.forEach(p => {
    const key = `${p.bay}-${p.hatch}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqPairs.push(p);
    }
  });

  return uniqPairs;
}

/**
 * Reconciles Set Temp Discrepancies
 */
export function computeSetTempDiscrepancies(
  manifest: ManifestContainer[],
  latestAssets: AssetContainer[]
): TempDiscrepancy[] {
  const assetMap = new Map<string, AssetContainer>();
  latestAssets.forEach(a => assetMap.set(a.reefer_no, a));

  const list: TempDiscrepancy[] = [];
  manifest.forEach(m => {
    const asset = assetMap.get(m.reefer_no);
    if (!asset) return;

    if (m.manifest_set_temp !== null && asset.asset_set_temp !== null) {
      if (Math.abs(m.manifest_set_temp - asset.asset_set_temp) > 0.05) {
        list.push({
          reefer_no: m.reefer_no,
          position: m.position,
          asset_position: asset.asset_position,
          manifest_set_temp: m.manifest_set_temp,
          asset_set_temp: asset.asset_set_temp,
          issue: 'SET TEMP MISMATCH'
        });
      }
    }
  });

  return list;
}

/**
 * Reconciles Position Discrepancies (ignores reefers corrected by scanned logs)
 */
export function computePositionDiscrepancies(
  manifest: ManifestContainer[],
  latestAssets: AssetContainer[]
): PositionDiscrepancy[] {
  const assetMap = new Map<string, AssetContainer>();
  latestAssets.forEach(a => assetMap.set(a.reefer_no, a));

  const list: PositionDiscrepancy[] = [];
  manifest.forEach(m => {
    const asset = assetMap.get(m.reefer_no);
    if (!asset) return;

    const normManPos = normalizePosition(m.position);
    const normAssetPos = normalizePosition(asset.asset_position);

    if (normManPos && normAssetPos && normManPos !== normAssetPos) {
      // If position source is already 'scanned_correction' / 'override', we don't treat it as a discrepancy in this specific report sheet
      if (m.position_source !== 'override') {
        list.push({
          reefer_no: m.reefer_no,
          position: m.position,
          asset_position: asset.asset_position,
          issue: 'POSITION DIFFERENCE',
          position_source: m.position_source
        });
      }
    }
  });

  return list;
}

/**
 * Builds Alarms report from latest assets telemetry
 */
export function computeAlarmReport(latestAssets: AssetContainer[]): AlarmReport[] {
  const list: AlarmReport[] = [];
  latestAssets.forEach(a => {
    const hasAlert = a.ccalerts && a.ccalerts !== '' && a.ccalerts !== 'nan' && a.ccalerts !== '-NA-';
    const hasAlarm = a.alarms && a.alarms !== '' && a.alarms !== 'nan' && a.alarms !== '-NA-';
    
    if (hasAlert || hasAlarm) {
      list.push({
        reefer_no: a.reefer_no,
        asset_position: a.asset_position,
        ccalerts: a.ccalerts,
        alarms: a.alarms,
        has_alarm: true
      });
    }
  });
  return list;
}

/**
 * Helper to truncate sheet names to standard 31 character limit
 */
function safeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/*?:\[\]]/g, '_');
  return cleaned.slice(0, 31);
}

/**
 * Export final 6-Day Workbook Package
 */
/**
 * Parses raw text input (OCR or hand-copied transcripts) to map container IDs and physical coordinates
 */
export function parseLogTextToPositions(text: string): { reefer_no: string; position: string }[] {
  const lines = text.split('\n');
  const results: { reefer_no: string; position: string }[] = [];
  const reeferRegex = /\b([a-zA-Z]{4}\d{7})\b/;
  const posRegex = /\b(\d{5,6})\b/;

  lines.forEach((line, index) => {
    const rMatch = line.match(reeferRegex);
    const pMatch = line.match(posRegex);
    if (rMatch && pMatch) {
      results.push({
        reefer_no: rMatch[1].toUpperCase(),
        position: pMatch[1]
      });
    } else if (rMatch) {
      const windowStr = lines.slice(index, index + 3).join(' ');
      const pWindowMatch = windowStr.match(posRegex);
      if (pWindowMatch) {
        results.push({
          reefer_no: rMatch[1].toUpperCase(),
          position: pWindowMatch[1]
        });
      }
    }
  });

  const unique: typeof results = [];
  const seenReefers = new Set<string>();
  for (const r of results) {
    if (!seenReefers.has(r.reefer_no)) {
      seenReefers.add(r.reefer_no);
      unique.push(r);
    }
  }
  return unique;
}

/**
 * Export final 6-Day Workbook Package
 */
export function exportLogsWorkbook(params: {
  voyageNo: string;
  manifest: ManifestContainer[];
  latestAssets: AssetContainer[];
  allAssets: AssetContainer[];
  bayHatchPairs: BayHatchMap[];
  tempDisc: TempDiscrepancy[];
  posDisc: PositionDiscrepancy[];
  alarms: AlarmReport[];
  overridesList: PositionOverride[];
}) {
  const {
    voyageNo,
    manifest,
    latestAssets,
    allAssets,
    bayHatchPairs,
    tempDisc,
    posDisc,
    alarms,
    overridesList
  } = params;

  // Map manifest entries to hatches mathematically or using manifest hatch assignments (ignoring manual/flawed baymap coordinates)
  const manifestWithHatch = manifest.map(m => {
    const bayNum = m.bay;
    let h = m.hatch;
    if (h === undefined || h === null) {
      if (bayNum !== null) {
        h = Math.max(2, Math.floor((bayNum + 3) / 4) + 1);
      }
    }
    return { ...m, hatch: h !== undefined && h !== null ? h : null };
  });

  // Assets Day Series grouping (up to max 6 files/days)
  const uniqueAssetFiles = Array.from(new Set(allAssets.map(a => a.source_file))).sort();
  const activeDaysCount = Math.min(uniqueAssetFiles.length, 6);
  const dayFileMapping = uniqueAssetFiles.slice(0, 6);

  const wb = XLSX.utils.book_new();

  // 1. Set Temp Discrepancies
  const tempRows: any[][] = [
    ['Set Temperature Discrepancies Report'],
    [`Voyage: ${voyageNo}`],
    [],
    ['Reefer Number', 'Manifest Position', 'Asset Position', 'Manifest Set Temp', 'Asset Set Temp', 'Issue']
  ];
  tempDisc.forEach(t => {
    tempRows.push([
      t.reefer_no,
      t.position,
      t.asset_position,
      t.manifest_set_temp !== null ? t.manifest_set_temp : '',
      t.asset_set_temp !== null ? t.asset_set_temp : '',
      t.issue
    ]);
  });
  const tempWs = XLSX.utils.aoa_to_sheet(tempRows);
  XLSX.utils.book_append_sheet(wb, tempWs, 'Set Temp Discrepancies');

  // 2. Position Discrepancies
  const posRows: any[][] = [
    ['Stowage Position Discrepancies Report'],
    [`Voyage: ${voyageNo}`],
    [],
    ['Reefer Number', 'Manifest Stowage', 'Asset Position', 'Correction Status']
  ];
  posDisc.forEach(p => {
    posRows.push([
      p.reefer_no,
      p.position,
      p.asset_position,
      p.position_source === 'override' ? 'Corrected by Log' : 'Mismatch'
    ]);
  });
  const posWs = XLSX.utils.aoa_to_sheet(posRows);
  XLSX.utils.book_append_sheet(wb, posWs, 'Position Discrepancies');

  // 3. Assets Alarms
  const alarmRows: any[][] = [
    ['Active Telemetry Alarm Alerts Report'],
    [`Voyage: ${voyageNo}`],
    [],
    ['Reefer Number', 'Position', 'CCAlerts', 'Alarms']
  ];
  alarms.forEach(a => {
    alarmRows.push([
      a.reefer_no,
      a.asset_position,
      a.ccalerts || '',
      a.alarms || ''
    ]);
  });
  const alarmWs = XLSX.utils.aoa_to_sheet(alarmRows);
  XLSX.utils.book_append_sheet(wb, alarmWs, 'Assets Alarms');

  // 4. Overrides list (Original Position Changes)
  const logRows: any[][] = [
    ['Original Position Changes (Manual scanned pdf log corrections)'],
    [`Voyage: ${voyageNo}`],
    [],
    ['Reefer Number', 'Original Position', 'Corrected Position', 'Source Log', 'Timestamp']
  ];
  overridesList.forEach(o => {
    logRows.push([
      o.reefer_no,
      o.original_position,
      o.corrected_position,
      o.source_scan,
      o.change_recorded_at
    ]);
  });
  const overrideWs = XLSX.utils.aoa_to_sheet(logRows);
  XLSX.utils.book_append_sheet(wb, overrideWs, 'Original Position Changes');

  // Collect distinct hatches
  const distinctHatches = Array.from(
    new Set(manifestWithHatch.map(m => m.hatch).filter((h): h is number => h !== null))
  ).sort((a, b) => a - b);

  // 5. Load Reefer Logs (By Hatch & ABOVE vs. BELOW)
  distinctHatches.forEach(hatch => {
    const hatchUnits = manifestWithHatch.filter(m => m.hatch === hatch);
    const aboveUnits = hatchUnits.filter(m => m.deck_section === 'ABOVE').sort((a, b) => a.position.localeCompare(b.position));
    const belowUnits = hatchUnits.filter(m => m.deck_section === 'BELOW').sort((a, b) => a.position.localeCompare(b.position));

    if (aboveUnits.length > 0) {
      const rows: any[][] = [
        [`Hatch ${hatch} Load Reefer Log - Above`],
        [`Voyage: ${voyageNo}`],
        ['ALL REEFERS FACE AFT'],
        [],
        ['Position', 'Reefer Number', 'Set Temp', 'Vent']
      ];
      aboveUnits.forEach(item => {
        rows.push([
          item.position,
          item.reefer_no,
          item.manifest_set_temp !== null ? item.manifest_set_temp : '',
          item.vent || ''
        ]);
      });
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, sheet, safeSheetName(`H${hatch} Load Above`));
    }

    if (belowUnits.length > 0) {
      const rows: any[][] = [
        [`Hatch ${hatch} Load Reefer Log - Below`],
        [`Voyage: ${voyageNo}`],
        ['ALL REEFERS FACE AFT'],
        [],
        ['Position', 'Reefer Number', 'Set Temp', 'Vent']
      ];
      belowUnits.forEach(item => {
        rows.push([
          item.position,
          item.reefer_no,
          item.manifest_set_temp !== null ? item.manifest_set_temp : '',
          item.vent || ''
        ]);
      });
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, sheet, safeSheetName(`H${hatch} Load Below`));
    }
  });

  // 6. Daily Reefer Logs (By Hatch & ABOVE vs. BELOW) WITH 6-DAY Telemetry Matrix
  distinctHatches.forEach(hatch => {
    const hatchUnits = manifestWithHatch.filter(m => m.hatch === hatch);
    const aboveUnits = hatchUnits.filter(m => m.deck_section === 'ABOVE').sort((a, b) => a.position.localeCompare(b.position));
    const belowUnits = hatchUnits.filter(m => m.deck_section === 'BELOW').sort((a, b) => a.position.localeCompare(b.position));

    // Dynamic telemetry matrix mapping function
    const mapToDailyRows = (units: typeof hatchUnits, title: string) => {
      const headerRow = ['Position', 'Reefer Number', 'Set Temp', 'Vent'];
      for (let day = 1; day <= 6; day++) {
        headerRow.push(`D${day} AM`, `D${day} PM`);
      }

      const rows: any[][] = [
        [title],
        [`Voyage: ${voyageNo}`],
        ['ALL REEFERS FACE AFT'],
        [],
        headerRow
      ];

      units.forEach(unit => {
        const rowData: any[] = [
          unit.position,
          unit.reefer_no,
          unit.manifest_set_temp !== null ? unit.manifest_set_temp : '',
          unit.vent || ''
        ];

        // For each of the 6 slots, look up the corresponding telemetry file
        for (let d = 0; d < 6; d++) {
          if (d < dayFileMapping.length) {
            const currentFileName = dayFileMapping[d];
            // Find asset unit for this file
            const assetRecord = allAssets.find(
              a => a.reefer_no === unit.reefer_no && a.source_file === currentFileName
            );
            const val = assetRecord?.asset_set_temp !== undefined && assetRecord?.asset_set_temp !== null
              ? assetRecord.asset_set_temp
              : '';
            
            // Populate AM and PM spaces with telemetry reading (as in original flask app)
            rowData.push(val, val);
          } else {
            // Unused slots are blank
            rowData.push('', '');
          }
        }
        rows.push(rowData);
      });

      return rows;
    };

    if (aboveUnits.length > 0) {
      const rows = mapToDailyRows(aboveUnits, `Hatch ${hatch} Daily Reefer Log - Above`);
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, sheet, safeSheetName(`H${hatch} Daily Above`));
    }

    if (belowUnits.length > 0) {
      const rows = mapToDailyRows(belowUnits, `Hatch ${hatch} Daily Reefer Log - Below`);
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, sheet, safeSheetName(`H${hatch} Daily Below`));
    }
  });

  // 7. Electrician Callout Sheet
  const calloutRows: any[][] = [
    ['Electrician Callout Sheet'],
    [`Voyage: ${voyageNo}`],
    [],
    [
      'Person Working',
      'Hatch',
      'Date',
      'Call Out Unplug',
      'Knock Off Unplug',
      'Call Out Plug In',
      'Knock Off Plug In',
      'Electrician Stand By Engineer',
      'Extra',
      'Notes'
    ],
    ['', '2', '', '', '', '', '', '', '', ''],
    ['', '3', '', '', '', '', '', '', '', ''],
    ['', '4', '', '', '', '', '', '', '', ''],
    ['', '5 Above', '', '', '', '', '', '', '', ''],
    ['', '5 Below', '', '', '', '', '', '', '', ''],
    ['', '6', '', '', '', '', '', '', '', ''],
    ['', '7', '', '', '', '', '', '', '', ''],
    ['', '8 Above', '', '', '', '', '', '', '', ''],
    ['', '8 Below', '', '', '', '', '', '', '', ''],
    ['', '9', '', '', '', '', '', '', '', ''],
    ['', '10', '', '', '', '', '', '', '', ''],
    ['', '11', '', '', '', '', '', '', '', ''],
    ['', '12 Above', '', '', '', '', '', '', '', ''],
    ['', '12 Below', '', '', '', '', '', '', '', ''],
    ['', '13', '', '', '', '', '', '', '', '']
  ];
  const calloutWs = XLSX.utils.aoa_to_sheet(calloutRows);
  XLSX.utils.book_append_sheet(wb, calloutWs, 'Electrician Callout');

  // Trigger browser file download
  XLSX.writeFile(wb, `GII_${voyageNo}_Reefer_Log_Package.xlsx`);
}
