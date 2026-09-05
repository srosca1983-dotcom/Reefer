/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Anchor,
  FileSpreadsheet,
  FileText,
  Sliders,
  CheckCircle,
  HelpCircle,
  Database,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import FileLoader from './components/FileLoader';
import ManualOCR from './components/ManualOCR';
import ReconciliationDashboard from './components/ReconciliationDashboard';
import BlankLogBuilder from './components/BlankLogBuilder';

import {
  ManifestContainer,
  AssetContainer,
  BayHatchMap,
  PositionOverride,
  TempDiscrepancy,
  PositionDiscrepancy,
  AlarmReport
} from './types';

import {
  parseManifest,
  parseAssets,
  parseBayHatchMap,
  computeSetTempDiscrepancies,
  computePositionDiscrepancies,
  computeAlarmReport,
  extractBay,
  inferAboveBelow
} from './utils/excelParser';

export default function App() {
  const [voyageNo, setVoyageNo] = useState('064W');
  const [activeStep, setActiveStep] = useState<'import' | 'manual_logs' | 'dashboard' | 'blank_log_builder'>('import');

  // Ground data states
  const [manifest, setManifest] = useState<ManifestContainer[]>([]);
  const [latestAssets, setLatestAssets] = useState<AssetContainer[]>([]);
  const [allAssets, setAllAssets] = useState<AssetContainer[]>([]);
  const [baymapPairs, setBaymapPairs] = useState<BayHatchMap[]>([]);
  const [overrides, setOverrides] = useState<PositionOverride[]>([]);

  // Metadata/info labels
  const [manifestName, setManifestName] = useState('');
  const [baymapName, setBaymapName] = useState('');

  // Persist overrides cache to localStorage grouped by Voyage
  useEffect(() => {
    const key = `g2-reefer-overrides-${voyageNo}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        setOverrides(JSON.parse(cached));
      } catch (e) {
        console.error('Failed to parse cached overrides:', e);
      }
    } else {
      setOverrides([]);
    }
  }, [voyageNo]);

  const saveOverridesWithCache = (updatedList: PositionOverride[]) => {
    setOverrides(updatedList);
    const key = `g2-reefer-overrides-${voyageNo}`;
    localStorage.setItem(key, JSON.stringify(updatedList));
  };

  // Add or edit a position override
  const handleAddOverride = (reeferNo: string, correctedPosition: string, source: string) => {
    // Find matching manifest entry if exists to capture original location
    const match = manifest.find(m => m.reefer_no === reeferNo);
    const originalPosition = match ? match.position : 'External';

    const updated = [...overrides];
    const existingIdx = updated.findIndex(o => o.reefer_no === reeferNo);

    const nowStr = new Date().toLocaleString();

    if (existingIdx !== -1) {
      updated[existingIdx] = {
        reefer_no: reeferNo,
        original_position: originalPosition,
        corrected_position: correctedPosition,
        source_scan: source,
        change_recorded_at: nowStr
      };
    } else {
      updated.push({
        reefer_no: reeferNo,
        original_position: originalPosition,
        corrected_position: correctedPosition,
        source_scan: source,
        change_recorded_at: nowStr
      });
    }

    saveOverridesWithCache(updated);
  };

  // Delete a position override
  const handleRemoveOverride = (reeferNo: string) => {
    const updated = overrides.filter(o => o.reefer_no !== reeferNo);
    saveOverridesWithCache(updated);
  };

  // Force align target temperature of manifest container
  const handleAlignTemperature = (reeferNo: string, alignedTemp: number) => {
    setManifest(prev =>
      prev.map(m => {
        if (m.reefer_no === reeferNo) {
          return { ...m, manifest_set_temp: alignedTemp };
        }
        return m;
      })
    );
  };

  // Clear loaded files and reset state
  const handleClearAll = () => {
    setManifest([]);
    setLatestAssets([]);
    setAllAssets([]);
    setBaymapPairs([]);
    setOverrides([]);
    setManifestName('');
    setBaymapName('');
    setActiveStep('import');
    localStorage.removeItem(`g2-reefer-overrides-${voyageNo}`);
  };

  // Pre-load perfect, realistic George II demo voyage data package
  const handleLoadDemoData = () => {
    setVoyageNo('064W');
    setManifestName('Demo_Vessel_Manifest_064W.xlsx');
    setBaymapName('Demo_GeorgeII_Bay_to_Hatch.xlsx');

    // Mock Manifest
    const mockManifest: ManifestContainer[] = [
      { reefer_no: 'SUDU5134125', position: '010412', manifest_set_temp: 2.0, vent: 'Closed', bay: 1, deck_section: 'BELOW', hatch: 2, position_source: 'manifest' },
      { reefer_no: 'MAEU9928501', position: '010682', manifest_set_temp: -18.0, vent: 'Closed', bay: 1, deck_section: 'ABOVE', hatch: 2, position_source: 'manifest' },
      { reefer_no: 'KLINE7728912', position: '090284', manifest_set_temp: 4.5, vent: 'Open', bay: 9, deck_section: 'ABOVE', hatch: 4, position_source: 'manifest' },
      { reefer_no: 'MSC3389025', position: '050212', manifest_set_temp: 1.5, vent: 'Closed', bay: 5, deck_section: 'BELOW', hatch: 3, position_source: 'manifest' },
      { reefer_no: 'CMAU8892305', position: '100282', manifest_set_temp: 5.0, vent: 'Open', bay: 10, deck_section: 'ABOVE', hatch: 4, position_source: 'manifest' },
      { reefer_no: 'HPLU5540192', position: '010084', manifest_set_temp: -5.0, vent: 'Closed', bay: 1, deck_section: 'ABOVE', hatch: 2, position_source: 'manifest' },
      { reefer_no: 'ZIMU3348120', position: '010282', manifest_set_temp: 2.2, vent: 'Open', bay: 1, deck_section: 'ABOVE', hatch: 2, position_source: 'manifest' },
      { reefer_no: 'ONEU1129583', position: '010182', manifest_set_temp: 8.0, vent: 'Open', bay: 1, deck_section: 'ABOVE', hatch: 2, position_source: 'manifest' },
      { reefer_no: 'COSU9928151', position: '010382', manifest_set_temp: 1.0, vent: 'Closed', bay: 1, deck_section: 'ABOVE', hatch: 2, position_source: 'manifest' },
    ];

    // Mock Baymap pairs
    const mockBaymap: BayHatchMap[] = [
      { bay: 1, hatch: 2 },
      { bay: 2, hatch: 2 },
      { bay: 3, hatch: 2 },
      { bay: 5, hatch: 3 },
      { bay: 6, hatch: 3 },
      { bay: 7, hatch: 3 },
      { bay: 9, hatch: 4 },
      { bay: 10, hatch: 4 },
      { bay: 11, hatch: 4 },
    ];

    // 6 Days of Telemetry history
    const fileNames = ['Day_1_Telemetry.xlsx', 'Day_2_Telemetry.xlsx', 'Day_3_Telemetry.xlsx', 'Day_4_Telemetry.xlsx', 'Day_5_Telemetry.xlsx', 'Day_6_Telemetry.xlsx'];
    const mockAllAssets: AssetContainer[] = [];

    fileNames.forEach((filename, fileIdx) => {
      const dayLabel = `Day ${fileIdx + 1}`;
      
      // Perfect setpoint
      mockAllAssets.push({
        reefer_no: 'SUDU5134125',
        asset_position: '010412',
        asset_set_temp: 2.0,
        ccalerts: '',
        alarms: '',
        asset_bay: 1,
        asset_day_label: dayLabel,
        source_file: filename
      });

      // Mismatch on final day
      mockAllAssets.push({
        reefer_no: 'MAEU9928501',
        asset_position: '010682',
        asset_set_temp: fileIdx === 5 ? -18.5 : -18.0,
        ccalerts: '',
        alarms: '',
        asset_bay: 1,
        asset_day_label: dayLabel,
        source_file: filename
      });

      // Position discrepancy on day 6
      mockAllAssets.push({
        reefer_no: 'KLINE7728912',
        asset_position: fileIdx === 5 ? '090484' : '090284',
        asset_set_temp: 4.5,
        ccalerts: '',
        alarms: '',
        asset_bay: 9,
        asset_day_label: dayLabel,
        source_file: filename
      });

      // Active alarms
      mockAllAssets.push({
        reefer_no: 'MSC3389025',
        asset_position: '050212',
        asset_set_temp: 1.5,
        ccalerts: fileIdx >= 2 ? 'Return Air Temp Sensor Fault' : '',
        alarms: fileIdx >= 2 ? 'ALARM 54: SENSOR FAULT' : '',
        asset_bay: 5,
        asset_day_label: dayLabel,
        source_file: filename
      });

      mockAllAssets.push({ reefer_no: 'CMAU8892305', asset_position: '100282', asset_set_temp: 5.0, ccalerts: '', alarms: '', asset_bay: 10, asset_day_label: dayLabel, source_file: filename });
      mockAllAssets.push({ reefer_no: 'HPLU5540192', asset_position: '010084', asset_set_temp: -5.0, ccalerts: '', alarms: '', asset_bay: 1, asset_day_label: dayLabel, source_file: filename });
      mockAllAssets.push({ reefer_no: 'ZIMU3348120', asset_position: '010282', asset_set_temp: 2.2, ccalerts: '', alarms: '', asset_bay: 1, asset_day_label: dayLabel, source_file: filename });
      mockAllAssets.push({ reefer_no: 'ONEU1129583', asset_position: '010182', asset_set_temp: 8.0, ccalerts: '', alarms: '', asset_bay: 1, asset_day_label: dayLabel, source_file: filename });
      mockAllAssets.push({ reefer_no: 'COSU9928151', asset_position: '010382', asset_set_temp: 1.0, ccalerts: '', alarms: '', asset_bay: 1, asset_day_label: dayLabel, source_file: filename });
    });

    setManifest(mockManifest);
    setBaymapPairs(mockBaymap);
    setAllAssets(mockAllAssets);

    const drivers = mockAllAssets.filter(a => a.source_file === fileNames[5]);
    setLatestAssets(drivers);

    setActiveStep('dashboard');
  };

  // Callback when FileLoader successfully reads and parses files
  const handleFilesLoaded = (data: {
    manifestRows: any[][] | null;
    manifestName: string;
    baymapRows: any[][] | null;
    baymapName: string;
    assetsFiles: { name: string; rows: any[][] }[];
  }) => {
    try {
      if (!data.manifestRows) {
        alert('Validation error: Cargo Manifest could not be found or parsed.');
        return;
      }

      // 1. Ingest Baymap map coordinates if uploaded
      const parsedPairs = data.baymapRows ? parseBayHatchMap(data.baymapRows) : [];
      setBaymapPairs(parsedPairs);
      setBaymapName(data.baymapName || 'None Loaded (Skinned Coordinates)');

      // 2. Ingest Manifest listings
      const parsedManifest = parseManifest(data.manifestRows);
      setManifest(parsedManifest);
      setManifestName(data.manifestName);

      // 3. Ingest multi-assets telemetry history
      const allAssetsLoaded: AssetContainer[] = [];
      data.assetsFiles.forEach((file, index) => {
        const dayLabel = `Day ${index + 1}`;
        const parsed = parseAssets(file.rows, file.name, dayLabel);
        allAssetsLoaded.push(...parsed);
      });

      setAllAssets(allAssetsLoaded);

      // Latest uploaded assets file acts as driver for alerts & calculations
      if (data.assetsFiles.length > 0) {
        const lastFileIdx = data.assetsFiles.length - 1;
        const lastFileName = data.assetsFiles[lastFileIdx].name;
        const driverAssets = allAssetsLoaded.filter(a => a.source_file === lastFileName);
        setLatestAssets(driverAssets);
      }

      // Auto-route to Main Dashboard
      setActiveStep('dashboard');
    } catch (err: any) {
      alert(`Parsing failed: ${err.message || err}`);
    }
  };

  // Reactive derived states: Apply overrides database to manifest elements
  const appliedManifest = manifest.map(m => {
    const override = overrides.find(o => o.reefer_no === m.reefer_no);
    if (override) {
      const correctedPos = override.corrected_position;
      const bay = extractBay(correctedPos);
      const deckSection = inferAboveBelow(correctedPos);
      return {
        ...m,
        original_position: m.original_position || m.position,
        position: correctedPos,
        bay,
        deck_section: deckSection,
        position_source: 'override' as const
      };
    }
    return m;
  });

  // Derived mismatch metrics
  const tempDisc: TempDiscrepancy[] = computeSetTempDiscrepancies(appliedManifest, latestAssets);
  const posDisc: PositionDiscrepancy[] = computePositionDiscrepancies(appliedManifest, latestAssets);
  const alarms: AlarmReport[] = computeAlarmReport(latestAssets);

  const manifestLoaded = manifest.length > 0;

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between" id="app-viewport">
      {/* High-Contrast Maritime Navy Top Header */}
      <header className="bg-[#1E293B]/70 border-b border-slate-800 shadow-lg backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-white">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-500/15">
              <Anchor className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight font-sans">
                REEFER<span className="text-blue-400">CORE</span>
              </h1>
              <span className="text-[10px] text-blue-400 font-mono tracking-widest block leading-none">GEORGE II OVERVIEW</span>
            </div>
          </div>

          {/* Step indicator toolbar */}
          {manifestLoaded && (
            <nav className="flex items-center space-x-1 sm:space-x-2 text-xs font-semibold">
              <button
                onClick={() => setActiveStep('import')}
                className={`px-3 py-1.5 rounded transition ${
                  activeStep === 'import' 
                    ? 'bg-blue-600/25 border border-blue-550 dynamic-btn text-blue-400 font-bold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                1. Files Dock
              </button>
              <span className="text-slate-800 font-mono text-sm">/</span>
              <button
                onClick={() => setActiveStep('dashboard')}
                className={`px-3 py-1.5 rounded transition ${
                  activeStep === 'dashboard' 
                    ? 'bg-blue-600/25 border border-blue-550 text-blue-400 font-bold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                2. Vessel Dashboard
              </button>
            </nav>
          )}

          <div className="flex items-center space-x-2 bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-mono font-semibold text-slate-400">CORERUN TIME OUT: GII_LOGS</span>
          </div>
        </div>
      </header>

      {/* Main body viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {activeStep === 'blank_log_builder' ? (
          <BlankLogBuilder
            voyageNo={voyageNo}
            onBack={() => setActiveStep(manifestLoaded ? 'dashboard' : 'import')}
          />
        ) : !manifestLoaded ? (
          /* Landing Loader step */
          <FileLoader
            voyageNo={voyageNo}
            setVoyageNo={setVoyageNo}
            onFilesLoaded={handleFilesLoaded}
            onPrintBlankClick={() => setActiveStep('blank_log_builder')}
            onLoadDemoData={handleLoadDemoData}
          />
        ) : (
          <div className="space-y-6">
            {/* Step navigation flow info bar */}
            <div className="bg-[#1E293B]/40 border border-slate-750 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between text-slate-205 gap-4">
              <div className="flex items-center space-x-3 text-xs leading-relaxed font-sans">
                <Database className="h-5 w-5 text-blue-400 shrink-0" />
                <div className="text-slate-300">
                  <span className="font-bold text-white">Active database:</span> Manifest: <b className="font-mono text-blue-400">{manifestName}</b> | Hatch Conversion: <b className="font-mono text-emerald-400 font-bold">AUTOMATIC FORMULA</b> | Telemetry: <b className="font-mono text-blue-400 font-bold">{allAssets.length} events</b> compiled.
                </div>
              </div>

              {activeStep !== 'dashboard' && (
                <button
                  onClick={() => setActiveStep('dashboard')}
                  className="bg-blue-600 hover:bg-blue-550 text-white rounded text-xs font-bold px-4 py-2 border border-blue-500/30 transition-all shadow-md shadow-blue-500/10 flex items-center space-x-2 cursor-pointer"
                >
                  <span>Open Vessel Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Rendering matching tabs */}
            {activeStep === 'import' && (
              <FileLoader
                voyageNo={voyageNo}
                setVoyageNo={setVoyageNo}
                onFilesLoaded={handleFilesLoaded}
                onPrintBlankClick={() => setActiveStep('blank_log_builder')}
                onLoadDemoData={handleLoadDemoData}
              />
            )}

            {activeStep === 'manual_logs' && (
              <ManualOCR
                manifest={appliedManifest}
                overrides={overrides}
                onAddOverride={handleAddOverride}
                onRemoveOverride={handleRemoveOverride}
              />
            )}

            {activeStep === 'dashboard' && (
              <ReconciliationDashboard
                voyageNo={voyageNo}
                manifest={manifest}
                latestAssets={latestAssets}
                allAssets={allAssets}
                baymapPairs={baymapPairs}
                overrides={overrides}
                tempDisc={tempDisc}
                posDisc={posDisc}
                alarms={alarms}
                onAddOverride={handleAddOverride}
                onAlignTemperature={handleAlignTemperature}
                onClearAll={handleClearAll}
              />
            )}
          </div>
        )}
      </main>

      {/* Safety Bottom Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-slate-500 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 GEORGE II Cargo Logistics Reefer Reconciler</p>
          <div className="flex items-center space-x-4">
            <span>VESSEL DOCK SYSTEM V1.0.4 - SANDBOX STABLE</span>
            <span>UTC TIME: 2026-06-08</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

