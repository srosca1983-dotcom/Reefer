/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Thermometer,
  Compass,
  BellRing,
  Download,
  Search,
  Eye,
  Sliders,
  Award,
  Settings,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layout,
  TableProperties,
  Printer,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import {
  ManifestContainer,
  AssetContainer,
  PositionOverride,
  TempDiscrepancy,
  PositionDiscrepancy,
  AlarmReport,
  BayHatchMap
} from '../types';
import { exportLogsWorkbook, getGroupedPlugsForBaySection, getPlugsForBaySection } from '../utils/excelParser';

interface ReconciliationDashboardProps {
  voyageNo: string;
  manifest: ManifestContainer[];
  latestAssets: AssetContainer[];
  allAssets: AssetContainer[];
  baymapPairs: BayHatchMap[];
  overrides: PositionOverride[];
  tempDisc: TempDiscrepancy[];
  posDisc: PositionDiscrepancy[];
  alarms: AlarmReport[];
  onAddOverride: (reeferNo: string, correctedPosition: string, source: string) => void;
  onAlignTemperature: (reeferNo: string, alignedTemp: number) => void;
  onClearAll: () => void;
}

export default function ReconciliationDashboard({
  voyageNo,
  manifest,
  latestAssets,
  allAssets,
  baymapPairs,
  overrides,
  tempDisc,
  posDisc,
  alarms,
  onAddOverride,
  onAlignTemperature,
  onClearAll
}: ReconciliationDashboardProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'temp_disc' | 'pos_disc' | 'alarms' | 'hatch_logs' | 'mates_log'>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHatchFilter, setSelectedHatchFilter] = useState<string>('all');
  const [selectedDeckFilter, setSelectedDeckFilter] = useState<string>('all');
  const [hatchLogsExpanded, setHatchLogsExpanded] = useState<Record<string, boolean>>({});

  // Mates customizable paper log states
  const [matesLogType, setMatesLogType] = useState<'load_log' | 'daily_log' | 'watch_rounds_builder' | 'blank_form'>('load_log');
  const [matesLogHatchFilter, setMatesLogHatchFilter] = useState<string>('all');
  const [matesLogDeckFilter, setMatesLogDeckFilter] = useState<string>('all');
  const [extraRowsCount, setExtraRowsCount] = useState<number>(10);
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);

  const downloadLogbookHtml = () => {
    const printEl = document.querySelector('.print-document');
    if (!printEl) {
      alert("No printable elements compiled yet. Please check your log parameters.");
      return;
    }
    const htmlContent = printEl.innerHTML;
    const title = `Mates_Official_Logbook_Voyage_${voyageNo}_Type_${matesLogType}`;
    
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    /* High contrast black-and-white layout strictly optimized for shipboard printing */
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    
    html, body {
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Print Document Pages */
    .page-break {
      page-break-after: always;
      break-after: page;
      margin-bottom: 25px;
      border: 1px solid #ddd;
      padding: 15px;
      background: #fff;
      box-sizing: border-box;
      max-width: 297mm;
      min-height: 194mm;
      margin-left: auto;
      margin-right: auto;
    }

    @media print {
      .page-break {
        border: none;
        padding: 0;
        margin: 0;
        max-width: none;
        min-height: 0;
        box-shadow: none;
      }
    }

    /* Utility Grids & Tailwind-like flexbox resets for HTML rendering */
    .grid { display: grid; gap: 8px; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
    .grid-cols-6 { grid-template-columns: repeat(6, 1fr); }
    .grid-cols-7 { grid-template-columns: repeat(7, 1fr); }
    .grid-cols-9 { grid-template-columns: repeat(9, 1fr); }
    .grid-cols-11 { grid-template-columns: repeat(11, minmax(0, 1fr)); }
    .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
    .grid-cols-13 { grid-template-columns: repeat(13, minmax(0, 1fr)); }
    
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }
    .items-end { align-items: flex-end; }
    .space-x-1 > * + * { margin-left: 4px; }
    .space-x-2 > * + * { margin-left: 8px; }
    .space-y-4 > * + * { margin-top: 16px; }
    .space-y-1 > * + * { margin-top: 4px; }
    
    .w-full { width: 100%; }
    .h-full { height: 100%; }
    .h-4 { height: 16px; }
    .h-5 { height: 20px; }
    .h-10 { height: 40px; }
    
    .font-mono { font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; }
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .font-bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .font-extrabold { font-weight: 800; }
    
    .text-xs { font-size: 10px; }
    .text-sm { font-size: 14px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .uppercase { text-transform: uppercase; }
    .tracking-wider { letter-spacing: 0.05em; }
    .tracking-widest { letter-spacing: 0.1em; }
    
    .p-1 { padding: 4px; }
    .p-2 { padding: 8px; }
    .p-8 { padding: 32px; }
    .px-2 { padding-left: 8px; padding-right: 8px; }
    .py-1 { padding-top: 4px; padding-bottom: 4px; }
    .mt-1 { margin-top: 4px; }
    .mt-4 { margin-top: 16px; }
    .mt-6 { margin-top: 24px; }
    .mt-8 { margin-top: 32px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-2 { margin-bottom: 8px; }
    .mb-4 { margin-bottom: 16px; }
    
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-slate-100 { background-color: #f1f5f9; }
    .bg-slate-200 { background-color: #e2e8f0; }
    .bg-white { background-color: #ffffff; }
    .bg-blue-50 { background-color: #eff6ff; }
    
    .border { border: 1px solid #000000; }
    .border-2 { border: 2px solid #000000; }
    .border-b { border-bottom: 1px solid #000000; }
    .border-b-2 { border-bottom: 2px solid #000000; }
    .border-t-2 { border-top: 2px solid #000000; }
    .border-r { border-right: 1px solid #000000; }
    .border-dashed { border-style: dashed; }
    
    .rounded { border-radius: 4px; }
    .rounded-sm { border-radius: 2px; }
    .text-blue-900 { color: #1e3a8a; }
    .text-slate-500 { color: #64748b; }
    .text-slate-600 { color: #475569; }
    .text-slate-800 { color: #1e293b; }
    .text-slate-900 { color: #0f172a; }
    .text-black { color: #000000; }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #000000; padding: 6px; }
    th { background-color: #f1f5f9; font-weight: bold; }
    
    /* Specific overrides for C9 sockets layout */
    .plug-card {
      border: 1px solid #000000;
      padding: 4px;
      border-radius: 3px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
      font-family: monospace;
      min-height: 135px;
      box-sizing: border-box;
    }
    
    .checkbox {
      border: 1.5px solid #000000;
      border-radius: 2px;
      background: #ffffff;
      width: 11px;
      height: 11px;
      display: inline-block;
      vertical-align: middle;
    }
    
    .chk-label {
      font-size: 8px;
      font-weight: bold;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div style="width: 100%;">
    ${htmlContent}
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Compile unique loaded assets files names for info
  const assetsFileNames = Array.from(new Set(allAssets.map(a => a.source_file)));

  // Combine Manifest with parsed Hatch codes for local display (ignoring manual baymap coordinates spreadsheet)
  const manifestWithHatch = manifest.map(m => {
    const bayNum = m.bay;
    let hatch = m.hatch;
    if (hatch === undefined || hatch === null) {
      if (bayNum !== null) {
        // Grouping into hatches where Hatch 2 is the first one (Bay 1, 2, 3 -> Hatch 2; Bay 5, 6, 7 -> Hatch 3, etc.)
        hatch = Math.max(2, Math.floor((bayNum + 3) / 4) + 1);
      }
    }
    return { ...m, hatch: hatch !== undefined && hatch !== null ? hatch : null };
  });

  const distinctHatches = Array.from(
    new Set(manifestWithHatch.map(m => m.hatch).filter((h): h is number => h !== null))
  ).sort((a, b) => a - b);

  const handleDownloadExcel = () => {
    exportLogsWorkbook({
      voyageNo,
      manifest: manifestWithHatch,
      latestAssets,
      allAssets,
      bayHatchPairs: baymapPairs,
      tempDisc,
      posDisc,
      alarms,
      overridesList: overrides
    });
  };

  const handleResolvePositionDiscrepancy = (item: PositionDiscrepancy) => {
    // Correct manifest coordinates to telemetry position
    onAddOverride(item.reefer_no, item.asset_position, 'Telemetry Alignment Fix');
  };

  const handleResolveTempDiscrepancy = (item: TempDiscrepancy) => {
    // Aligns the manifest target temperature to the telemetry recorded set temp
    if (item.asset_set_temp !== null) {
      onAlignTemperature(item.reefer_no, item.asset_set_temp);
    }
  };

  // Toggle hatch block display collapsed states
  const toggleHatchExp = (key: string) => {
    setHatchLogsExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="reconciliation-dashboard">
      {/* Upper Title Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs bg-blue-600/20 border border-blue-500/25 text-blue-400 font-bold px-2.5 py-1 rounded-md font-mono uppercase tracking-wider">
            Active Workspace - Voyage {voyageNo}
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-white mt-1.5 font-sans uppercase">
            George II Reefer Log Control Panel
          </h2>
          <p className="text-xs text-blue-405 mt-1 font-mono tracking-wide">
            RECONCILING {manifest.length} MANIFEST ENTRIES WITH {assetsFileNames.length} DAILY LOG EVENTS
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onClearAll}
            className="border border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-300 hover:text-white text-xs font-semibold rounded-lg px-3.5 py-2 transition cursor-pointer"
          >
            Reset Operations
          </button>
          
          <button
            onClick={() => {
              setActiveTab('mates_log');
              setTimeout(() => {
                window.print();
              }, 250);
            }}
            className="bg-emerald-600 hover:bg-emerald-555 text-white text-xs font-bold rounded-lg px-4 py-2.5 shadow-lg shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99] transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="h-4 w-4" />
            <span>Print Reefer Watch Log</span>
          </button>

          <button
            id="export-excel-workbook-btn"
            onClick={handleDownloadExcel}
            className="bg-blue-600 hover:bg-blue-550 text-white text-xs font-bold rounded-lg px-4.5 py-2.5 shadow-lg shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.99] transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>Export 6-Day Workbook Package</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards (Bento Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Reefers inside Manifest */}
        <div className="bg-[#1E293B]/40 border border-slate-800 rounded-xl p-4.5 shadow-lg flex items-center justify-between backdrop-blur-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold font-mono uppercase tracking-wider">MANIFEST UNITS</span>
            <div className="text-2xl font-black text-white font-mono">{manifest.length}</div>
            <p className="text-[10px] text-slate-400">Successfully mapped to hatches</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2.5 text-slate-400 rounded-lg">
            <Compass className="h-5 w-5 text-blue-400" />
          </div>
        </div>

        {/* Card 2: Set Temp Discrepancies */}
        <button
          onClick={() => setActiveTab('temp_disc')}
          className={`bg-[#1E293B]/40 border text-left rounded-xl p-4.5 shadow-lg flex items-center justify-between transition gap-2 cursor-pointer backdrop-blur-sm ${
            activeTab === 'temp_disc' 
              ? 'border-amber-550 bg-amber-500/10 ring-2 ring-amber-500/30' 
              : 'border-slate-800 hover:border-amber-500/40 hover:bg-slate-800/10'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold font-mono uppercase tracking-wider">TEMP MISMATCHES</span>
            <div className="text-2xl font-black text-amber-400 font-mono">{tempDisc.length}</div>
            <p className="text-[10px] text-amber-450 font-semibold">Click to inspect differences</p>
          </div>
          <div className={`p-2 rounded-lg ${activeTab === 'temp_disc' ? 'bg-amber-500/25 text-amber-400' : 'bg-slate-900 border border-slate-800 text-slate-450'}`}>
            <Thermometer className="h-5 w-5" />
          </div>
        </button>

        {/* Card 3: Position Discrepancies */}
        <button
          onClick={() => setActiveTab('pos_disc')}
          className={`bg-[#1E293B]/40 border text-left rounded-xl p-4.5 shadow-lg flex items-center justify-between transition gap-2 cursor-pointer backdrop-blur-sm ${
            activeTab === 'pos_disc' 
              ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30' 
              : 'border-slate-800 hover:border-blue-500/40 hover:bg-slate-800/10'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold font-mono uppercase tracking-wider">CELL MISMATCHES</span>
            <div className="text-2xl font-black text-blue-400 font-mono">{posDisc.length}</div>
            <p className="text-[10px] text-blue-450 font-semibold">Unresolved vessel placements</p>
          </div>
          <div className={`p-2 rounded-lg ${activeTab === 'pos_disc' ? 'bg-blue-500/25 text-blue-400' : 'bg-slate-900 border border-slate-800 text-slate-450'}`}>
            <Sliders className="h-5 w-5" />
          </div>
        </button>

        {/* Card 4: Hardware Alarms */}
        <button
          onClick={() => setActiveTab('alarms')}
          className={`bg-[#1E293B]/40 border text-left rounded-xl p-4.5 shadow-lg flex items-center justify-between transition gap-2 cursor-pointer backdrop-blur-sm ${
            activeTab === 'alarms' 
              ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' 
              : 'border-slate-800 hover:border-rose-500/40 hover:bg-slate-800/10'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold font-mono uppercase tracking-wider">ACTIVE ALARMS</span>
            <div className="text-2xl font-black text-rose-450 font-mono">{alarms.length}</div>
            <p className="text-[10px] text-rose-400 font-semibold">Telemetry fault signals onboard</p>
          </div>
          <div className={`p-2 rounded-lg ${activeTab === 'alarms' ? 'bg-rose-500/25 text-rose-400 animate-pulse' : 'bg-slate-900 border border-slate-800 text-slate-450'}`}>
            <BellRing className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-800">
        <ul className="flex flex-wrap -mb-px text-xs font-bold text-center text-slate-400">
          <li className="me-1 sm:me-2">
            <button
              onClick={() => setActiveTab('summary')}
              className={`inline-block p-4 border-b-2 transition cursor-pointer ${
                activeTab === 'summary' 
                  ? 'text-blue-400 border-blue-500 font-black font-sans' 
                  : 'border-transparent hover:text-slate-200 hover:border-slate-750'
              }`}
            >
              Voyage Overview
            </button>
          </li>
          <li className="me-1 sm:me-2">
            <button
              onClick={() => setActiveTab('temp_disc')}
              className={`inline-block p-4 border-b-2 transition cursor-pointer ${
                activeTab === 'temp_disc' 
                  ? 'text-blue-400 border-blue-500 font-black font-sans' 
                  : 'border-transparent hover:text-slate-200 hover:border-slate-750'
              }`}
            >
              Set Temp Discrepancies ({tempDisc.length})
            </button>
          </li>
          <li className="me-1 sm:me-2">
            <button
              onClick={() => setActiveTab('pos_disc')}
              className={`inline-block p-4 border-b-2 transition cursor-pointer ${
                activeTab === 'pos_disc' 
                  ? 'text-blue-400 border-blue-500 font-black font-sans' 
                  : 'border-transparent hover:text-slate-200 hover:border-slate-750'
              }`}
            >
              Cell Placements ({posDisc.length})
            </button>
          </li>
          <li className="me-1 sm:me-2">
            <button
              onClick={() => setActiveTab('alarms')}
              className={`inline-block p-4 border-b-2 transition cursor-pointer ${
                activeTab === 'alarms' 
                  ? 'text-blue-400 border-blue-500 font-black' 
                  : 'border-transparent hover:text-slate-200 hover:border-slate-750'
              }`}
            >
              Alarms Log ({alarms.length})
            </button>
          </li>
          <li className="me-1 sm:me-2">
            <button
              onClick={() => setActiveTab('hatch_logs')}
              className={`inline-block p-4 border-b-2 transition cursor-pointer ${
                activeTab === 'hatch_logs' 
                  ? 'text-blue-400 border-blue-505 font-bold font-sans' 
                  : 'border-transparent hover:text-slate-200 hover:border-slate-755'
              }`}
            >
              Hatch Load Logs Preview
            </button>
          </li>
          <li className="me-1 sm:me-2">
            <button
              onClick={() => setActiveTab('mates_log')}
              className={`inline-block p-4 border-b-2 transition cursor-pointer ${
                activeTab === 'mates_log' 
                  ? 'text-blue-400 border-blue-500 font-extrabold font-sans' 
                  : 'border-transparent hover:text-slate-200 hover:border-slate-750'
              }`}
            >
              <span className="flex items-center space-x-1">
                <Printer className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span>Mates Watch Log (Printable)</span>
              </span>
            </button>
          </li>
        </ul>
      </div>

      {/* Tab Render Switchboard */}
      <div className="bg-[#1E293B]/40 border border-slate-805 rounded-xl p-6 shadow-xl min-h-[300px] backdrop-blur-sm">
        
        {/* TAB 1: SUMMARY OVERVIEW */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-base font-black text-white font-sans uppercase">Voyage Data Reconciled</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The manifest contains container IDs, temperatures, and ventilator positions for the vessel voyage. Telemetry and manual readings have been loaded of all hatches. Correct any outstanding anomalies before exporting the official ship safety log workbook.
                </p>

                <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-3 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase">Voyage reference</span>
                    <span className="text-slate-200 font-bold">{voyageNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase">Reefer Entries</span>
                    <span className="text-slate-200 font-bold">{manifest.length} reefers</span>
                  </div>
                  <div className="flex justify-between font-sans">
                    <span className="text-slate-500 font-bold uppercase">Bay-to-Hatch Processing</span>
                    <span className="text-emerald-400 font-semibold font-mono">AUTOMATIC FORMULA ENABLED</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase">Daily Series Recorded</span>
                    <span className="text-slate-200 font-bold">{assetsFileNames.length} days (Max 6)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase">Applied Manual Logs overrides</span>
                    <span className="text-blue-400 font-bold">{overrides.length} overrides active</span>
                  </div>
                </div>
              </div>

              {/* Ready Checklist */}
              <div className="border border-slate-800 rounded-xl p-5 bg-[#0F172A]/85 shadow-lg space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                  <Award className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span>Reconciliation Checklist</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2.5">
                    {tempDisc.length === 0 ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 leading-none">Temperature Settings Mismatch</h4>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {tempDisc.length === 0 ? 'All climate set temperatures align perfectly.' : `${tempDisc.length} reefers have conflicting climate configurations.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    {posDisc.length === 0 ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-blue-400 shrink-0" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 leading-none">Physical Stowage Discrepancy</h4>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {posDisc.length === 0 ? 'All vessel cell positions reconciled.' : `${posDisc.length} reefers show positioning differences.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    {alarms.length === 0 ? (
                      <CheckCircle className="h-5 w-5 text-slate-650 shrink-0" />
                    ) : (
                      <BellRing className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 leading-none">Active Hardware Fault Alerting</h4>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {alarms.length === 0 ? 'No active alarms detected.' : `${alarms.length} active notifications require electrician review.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                  <div className="text-[10px] text-slate-500 font-sans">
                    Output: <b>7 unified workbook sheets</b>
                  </div>
                  <button
                    onClick={handleDownloadExcel}
                    className="bg-blue-600 hover:bg-blue-550 border border-blue-500/20 text-white text-xs font-bold rounded-lg px-4.5 py-2 shadow-lg shadow-blue-500/10 transition cursor-pointer"
                  >
                    Download Compiled XLSX
                  </button>
                </div>
              </div>
            </div>

            {/* List of files parsed */}
            <div className="pt-4 border-t border-slate-800/60 font-sans">
              <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Ingested Log Files</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono">
                {assetsFileNames.map((name, i) => (
                  <div key={i} className="p-2.5 border border-slate-800 rounded-xl bg-slate-900/40 flex items-center justify-between text-slate-300">
                    <span className="truncate text-slate-300 font-medium" title={name}>Day {i+1}: {name}</span>
                    <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded shrink-0 font-bold tracking-wider">READY</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEMPERATURE DISCREPANCIES */}
        {activeTab === 'temp_disc' && (
          <div className="space-y-4 font-sans animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Set Temperature Conflicted Items</h3>
                <p className="text-xs text-slate-400 mt-1">Manifest set points mismatching active assets readings.</p>
              </div>
              <span className="text-xs text-amber-400 bg-amber-500/15 border border-amber-500/20 px-2.5 py-1 rounded font-bold font-mono">{tempDisc.length} Items</span>
            </div>

            {tempDisc.length > 0 ? (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-[#0F172A] text-slate-400 text-[10px] font-mono border-b border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Reefer Number</th>
                      <th className="px-4 py-3">Manifest Position</th>
                      <th className="px-4 py-3">Asset Position</th>
                      <th className="px-4 py-3">Manifest Set point</th>
                      <th className="px-4 py-3">Telemetry Set point</th>
                      <th className="px-4 py-3 text-right font-sans">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {tempDisc.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-900/40 transition">
                        <td className="px-4 py-3 font-semibold text-white">{t.reefer_no}</td>
                        <td className="px-4 py-3 text-slate-400">{t.position}</td>
                        <td className="px-4 py-3 text-slate-400">{t.asset_position}</td>
                        <td className="px-4 py-3 font-bold text-rose-400">{t.manifest_set_temp !== null ? `${t.manifest_set_temp}°C` : 'N/A'}</td>
                        <td className="px-4 py-3 font-bold text-amber-400">{t.asset_set_temp !== null ? `${t.asset_set_temp}°C` : 'N/A'}</td>
                        <td className="px-4 py-3 text-right font-sans">
                          <button
                            onClick={() => handleResolveTempDiscrepancy(t)}
                            className="bg-amber-500/10 hover:bg-amber-505/20 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded border border-amber-500/20 cursor-pointer uppercase transition tracking-wider"
                          >
                            Align with Telemetry
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center space-y-2 bg-[#0F172A]/40">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
                <p className="text-xs font-bold text-slate-200">Perfect Manifest Balance!</p>
                <p className="text-[10px] text-slate-450">All container climate metrics are successfully reconciled.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: POSITION DISCREPANCIES */}
        {activeTab === 'pos_disc' && (
          <div className="space-y-4 font-sans animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Physical Stowage Discrepancy Items</h3>
                <p className="text-xs text-slate-400 mt-1">Containers whose active location does not align with the Manifest rows.</p>
              </div>
              <span className="text-xs text-blue-400 bg-blue-500/15 border border-blue-500/20 px-2.5 py-1 rounded font-bold font-mono">{posDisc.length} Items</span>
            </div>

            {posDisc.length > 0 ? (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-[#0F172A] text-slate-400 text-[10px] font-mono border-b border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Reefer Number</th>
                      <th className="px-4 py-3">Manifest Cell Stowage</th>
                      <th className="px-4 py-3">Asset Active Position</th>
                      <th className="px-4 py-3 text-right font-sans">Reconciliation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {posDisc.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-900/40 transition">
                        <td className="px-4 py-3 font-semibold text-white">{p.reefer_no}</td>
                        <td className="px-4 py-3 text-slate-500">{p.position}</td>
                        <td className="px-4 py-3 font-bold text-blue-400">{p.asset_position}</td>
                        <td className="px-4 py-3 text-right font-sans">
                          <button
                            onClick={() => handleResolvePositionDiscrepancy(p)}
                            className="bg-blue-500/10 hover:bg-blue-505/20 text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded border border-blue-500/20 cursor-pointer uppercase transition tracking-wider"
                          >
                            Update Position Override
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center space-y-2 bg-[#0F172A]/40">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
                <p className="text-xs font-bold text-slate-200">All Coordinates Reconciled</p>
                <p className="text-[10px] text-slate-450">All physical ship container stows correspond perfectly.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ACTIVE TELEMETRY ALARMS */}
        {activeTab === 'alarms' && (
          <div className="space-y-4 font-sans animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Critical Active Hardware Alarms</h3>
                <p className="text-xs text-slate-400 mt-1">Fault flags received directly from the active log monitors.</p>
              </div>
              <span className="text-xs bg-rose-500/15 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded font-bold font-mono text-[10px]">
                {alarms.length} Alarms
              </span>
            </div>

            {alarms.length > 0 ? (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-[#0F172A] text-slate-400 text-[10px] font-mono border-b border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Reefer Number</th>
                      <th className="px-4 py-3">Stow Cell Location</th>
                      <th className="px-4 py-3">CCAlerts</th>
                      <th className="px-4 py-3">Active Alarms</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {alarms.map((a, i) => (
                      <tr key={i} className="hover:bg-rose-955/10 transition">
                        <td className="px-4 py-3 font-semibold text-rose-450">{a.reefer_no}</td>
                        <td className="px-4 py-3 text-slate-300 font-semibold">{a.asset_position}</td>
                        <td className="px-4 py-3 text-slate-450 max-w-[200px] truncate" title={a.ccalerts}>{a.ccalerts || '-'}</td>
                        <td className="px-4 py-3 text-rose-405 font-bold font-sans">
                          <span className="bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded inline-block text-[10px]">
                            {a.alarms || 'Telemetry Alert'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-slate-800 bg-[#0F172A]/40 rounded-xl flex flex-col items-center justify-center space-y-2">
                <CheckCircle className="h-8 w-8 text-slate-500" />
                <p className="text-xs font-bold text-slate-400">Telemetry Hardware Quiet</p>
                <p className="text-[10px] text-slate-500">0 active container hardware alarms flagged.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: HATCH LOGS INTEGRATED DISCOVERY */}
        {activeTab === 'hatch_logs' && (
          <div className="space-y-6 font-sans animate-fade-in">
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Physical Hatches Log Sheets Preview</h3>
              <p className="text-xs text-slate-400 mt-1">Group-inspected reefer log sheet setups separated Above and Below deck (Tiers at 80+ are Above deck).</p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-400 font-mono">Hatch:</span>
                <select
                  value={selectedHatchFilter}
                  onChange={(e) => setSelectedHatchFilter(e.target.value)}
                  className="bg-[#0F172A] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 font-mono cursor-pointer outline-none focus:border-blue-500/50"
                >
                  <option value="all">All Hatches</option>
                  {distinctHatches.map(h => (
                    <option key={h} value={String(h)}>Hatch {h}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-400 font-mono">Deck:</span>
                <select
                  value={selectedDeckFilter}
                  onChange={(e) => setSelectedDeckFilter(e.target.value)}
                  className="bg-[#0F172A] border border-slate-805 text-slate-300 text-xs rounded-lg px-3 py-1.5 cursor-pointer outline-none focus:border-blue-500/50"
                >
                  <option value="all">All Heights (Above & Below)</option>
                  <option value="above">Above Deck (Tiers 80+)</option>
                  <option value="below">Below Hold</option>
                </select>
              </div>

              <div className="relative shrink-0 ml-auto w-full sm:w-auto">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by Reefer Number..."
                  className="w-full sm:w-48 text-xs border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500/50 bg-[#0F172A] text-slate-200 placeholder-slate-500"
                />
              </div>
            </div>            {/* Render Collapsible Hatches */}
            <div className="space-y-4">
              {distinctHatches.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-800 bg-[#0F172A]/45 rounded-xl p-8 max-w-lg mx-auto flex flex-col items-center justify-center space-y-3">
                  <Compass className="h-10 w-10 text-slate-500 animate-spin-slow" />
                  <h4 className="text-sm font-bold text-slate-205">Bay Map Coordinates Not Found</h4>
                  <p className="text-xs text-slate-450 leading-relaxed">
                    A Bay-to-Hatch spreadsheet coordinate mapping description is required to bundle containers into physical hatches. You can skip this file and load it later when a scanned PDF picture is ready!
                  </p>
                  <p className="text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg font-mono">
                    You can still fully check temperatures and print logs from the other tabs!
                  </p>
                </div>
              ) : (
                distinctHatches
                  .filter(h => selectedHatchFilter === 'all' || selectedHatchFilter === String(h))
                  .map(hatch => {
                    const hatchUnits = manifestWithHatch.filter(m => m.hatch === hatch);
                    const aboveUnits = hatchUnits.filter(m => m.deck_section === 'ABOVE').filter(m => !searchTerm || m.reefer_no.toLowerCase().includes(searchTerm.toLowerCase()));
                    const belowUnits = hatchUnits.filter(m => m.deck_section === 'BELOW').filter(m => !searchTerm || m.reefer_no.toLowerCase().includes(searchTerm.toLowerCase()));

                    const aboveKey = `H${hatch}_ABOVE`;
                    const belowKey = `H${hatch}_BELOW`;

                    const showAbove = selectedDeckFilter === 'all' || selectedDeckFilter === 'above';
                    const showBelow = selectedDeckFilter === 'all' || selectedDeckFilter === 'below';

                    return (
                      <div key={hatch} className="space-y-3 border-l-2 border-slate-800 pl-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-900/60 border border-slate-800 px-3 py-1 rounded inline-block font-mono">
                          SHIPS HATCH {hatch} CELL COLLECTION
                        </h4>

                        {/* ABOVE SECTION */}
                        {showAbove && aboveUnits.length > 0 && (
                          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                            <button
                              onClick={() => toggleHatchExp(aboveKey)}
                              className="w-full bg-slate-900/80 p-3 hover:bg-slate-850/80 transition flex items-center justify-between text-xs font-semibold text-slate-300 cursor-pointer"
                            >
                              <span className="flex items-center space-x-2">
                                <span className="bg-blue-600/20 text-blue-400 border border-blue-500/20 font-bold px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider">ABOVE</span>
                                <span className="font-bold text-slate-200">Hatch {hatch} Load Sheets (Above Deck)</span>
                                <span className="text-slate-500">({aboveUnits.length} Containers)</span>
                              </span>
                              {hatchLogsExpanded[aboveKey] ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </button>
                            
                            {hatchLogsExpanded[aboveKey] && (
                              <div className="p-3 bg-[#0F172A]/20">
                                <table className="w-full text-[11px] text-left text-slate-300 font-mono">
                                  <thead className="bg-[#0F172A] border-b border-slate-850 text-slate-405 font-bold uppercase tracking-wider">
                                    <tr>
                                      <th className="px-3 py-2">Position (Cell)</th>
                                      <th className="px-3 py-2">Reefer Number</th>
                                      <th className="px-3 py-2">Set Temp (°C)</th>
                                      <th className="px-3 py-2">Vent setting</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-850/40">
                                    {aboveUnits.map((u, ui) => (
                                      <tr key={ui} className="hover:bg-slate-900/30 transition">
                                        <td className="px-3 py-2.5 font-bold text-white">{u.position}</td>
                                        <td className="px-3 py-2.5 font-semibold text-slate-300">{u.reefer_no}</td>
                                        <td className="px-3 py-2.5 text-slate-400">{u.manifest_set_temp !== null ? `${u.manifest_set_temp}°C` : '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-400">{u.vent || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {/* BELOW SECTION */}
                        {showBelow && belowUnits.length > 0 && (
                          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                            <button
                              onClick={() => toggleHatchExp(belowKey)}
                              className="w-full bg-slate-900/80 p-3 hover:bg-slate-850/80 transition flex items-center justify-between text-xs font-semibold text-slate-300 cursor-pointer"
                            >
                              <span className="flex items-center space-x-2">
                                <span className="bg-slate-800 text-slate-300 border border-slate-700 font-bold px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider">BELOW</span>
                                <span className="font-bold text-slate-205">Hatch {hatch} Load Sheets (In Hold Below)</span>
                                <span className="text-slate-500">({belowUnits.length} Containers)</span>
                              </span>
                              {hatchLogsExpanded[belowKey] ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </button>
                            
                            {hatchLogsExpanded[belowKey] && (
                              <div className="p-3 bg-[#0F172A]/20">
                                <table className="w-full text-[11px] text-left text-slate-300 font-mono">
                                  <thead className="bg-[#0F172A] border-b border-slate-850 text-slate-405 font-bold uppercase tracking-wider">
                                    <tr>
                                      <th className="px-3 py-2">Position (Cell)</th>
                                      <th className="px-3 py-2">Reefer Number</th>
                                      <th className="px-3 py-2">Set Temp (°C)</th>
                                      <th className="px-3 py-2">Vent setting</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-850/40">
                                    {belowUnits.map((u, ui) => (
                                      <tr key={ui} className="hover:bg-slate-900/30 transition">
                                        <td className="px-3 py-2.5 font-bold text-white">{u.position}</td>
                                        <td className="px-3 py-2.5 font-semibold text-slate-300">{u.reefer_no}</td>
                                        <td className="px-3 py-2.5 text-slate-400">{u.manifest_set_temp !== null ? `${u.manifest_set_temp}°C` : '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-400">{u.vent || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PRINTABLE MATES REEFER WATCH ROUNDS LOG SHEET */}
        {activeTab === 'mates_log' && (
          <div className="space-y-6 font-sans animate-fade-in no-print bg-[#1E293B]/20 border border-slate-800 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Printer className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>Interactive Vessel Logbook Sheets & Print Builder</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Configure and stand-by official shipboard logs, separated in 2 sections (Above / Below) per page, strictly following the C9 securing manual layout.</p>
              </div>
              <div className="flex items-center space-x-2 shrink-0 self-start">
                <button
                  onClick={downloadLogbookHtml}
                  className="bg-blue-600 hover:bg-blue-500 border border-blue-500/20 text-white rounded-lg text-xs font-bold px-4 py-2.5 transition-all shadow-md shadow-blue-500/10 flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap"
                  title="Download highly compatible offline web document file for printing outside iframe"
                >
                  <FileText className="h-4 w-4" />
                  <span>Download Print File (HTML)</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white rounded-lg text-xs font-bold px-4 py-2.5 transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Official Logbook</span>
                </button>
              </div>
            </div>

            {/* Shipboard Print Notice Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs p-3.5 rounded-lg font-sans leading-relaxed flex items-start space-x-2.5">
              <span className="text-sm shrink-0">⚠️</span>
              <div>
                <span className="font-extrabold text-amber-300 uppercase tracking-wide block mb-0.5">Shipboard Print Warning & Instructions:</span>
                Since this application is rendered inside an interactive preview iframe, your web browser's direct <b className="text-white">Print</b> action may be sandboxed or restricted. 
                For a perfect print output, please <b className="text-[#a5f3fc]">Download Print File (HTML)</b> instead. Open that downloaded HTML file in your browser, then press <kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[10px] uppercase font-mono">Ctrl + P</kbd> (or <kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[10px] uppercase font-mono">Cmd + P</kbd>) to print perfectly to A4 or thermal log sheets!
              </div>
            </div>

            {/* Customizer Selection Widget */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Logbook Mode / Template Layout</label>
                <select
                  value={matesLogType}
                  onChange={(e) => setMatesLogType(e.target.value as any)}
                  className="w-full bg-[#0F172A] border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 cursor-pointer outline-none focus:border-blue-500/50 font-sans"
                >
                  <option value="load_log">1. Load Reefer Log (Positions, Nos, Set Temp, Temp at Loading)</option>
                  <option value="daily_log">2. Daily Reefer Log (6-Day Voyage Telemetry AM/PM Matrix)</option>
                  <option value="watch_rounds_builder">3. Active Watch Rounds (Prepopulated list + blank lines)</option>
                  <option value="blank_form">4. Empty Reefer Watch Log (Full-Page Spacious Bay Layouts with Plugs)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Hatch Group Filter</label>
                <select
                  value={matesLogHatchFilter}
                  onChange={(e) => setMatesLogHatchFilter(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 font-mono cursor-pointer outline-none focus:border-blue-500/50"
                >
                  <option value="all">All Vessel Hatches (Booklet)</option>
                  {distinctHatches.map(h => (
                    <option key={h} value={String(h)}>Hatch {h}</option>
                  ))}
                  {manifestWithHatch.some(m => m.hatch === null) && (
                    <option value="null">Unmapped Location Reefers</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Deck Section</label>
                <select
                  value={matesLogDeckFilter}
                  onChange={(e) => setMatesLogDeckFilter(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-300 text-slate-300 text-xs rounded-lg px-3 py-2 cursor-pointer outline-none focus:border-blue-500/50"
                >
                  <option value="all">All Sections (Above & Below Separated)</option>
                  <option value="above">Above Deck Only (Tiers 80+)</option>
                  <option value="below">Below Hold Only (Tiers &lt;80)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Logbook Rounds Date</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-850 text-slate-200 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500/50 font-mono"
                />
              </div>
            </div>

            {/* Extra Rows Config */}
            {(matesLogType === 'watch_rounds_builder' || matesLogType === 'blank_form') && (
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex items-center space-x-3 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px]">Vacant Line Space Config:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={extraRowsCount}
                  onChange={(e) => setExtraRowsCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 bg-[#0F172A] border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500/50 text-center font-mono font-bold"
                />
                <span className="text-slate-500">Provide {extraRowsCount} empty rows for hand-written overflow on the printed layout</span>
              </div>
            )}

            {/* Print Layout Preview container */}
            <div className="border border-slate-850 rounded-xl overflow-hidden shadow-2xl bg-[#0F172A]/40">
              <div className="bg-[#1E293B]/60 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  <span>Interactive Shipboard Log Booklet Preview</span>
                </span>
                <span className="text-xs bg-slate-900 border border-slate-800 text-blue-400 font-bold px-2 py-0.5 rounded">
                  {matesLogType === 'load_log' && 'LOAD REEFER LOG'}
                  {matesLogType === 'daily_log' && '6-DAY VOYAGE TEMPERATURE LOG'}
                  {matesLogType === 'watch_rounds_builder' && 'ACTIVE WATCH ROUNDS'}
                  {matesLogType === 'blank_form' && 'BLANK FORM'}
                </span>
              </div>

              {/* simulated scroll preview */}
              <div className="p-6 bg-slate-100 max-h-[600px] overflow-y-auto text-xs font-sans space-y-8 select-none">
                {renderPrintBookletContent(false)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PHYSICAL HIGH-CONTRAST PAPER PRINTABLE BLOCKS (AUTOMATICALLY CAPTURED BY MEDIA PRINT CLASS) */}
      <div className="print-document hidden p-4 bg-white text-black font-sans w-full text-[10pt] leading-normal">
        {renderPrintBookletContent(true)}
      </div>
    </div>
  );

  // Dynamic log sheet content generator shared between preview and actual print pages represent
  function renderPrintBookletContent(isPrintMedia: boolean) {
    const uniqueAssetFiles = Array.from(new Set(allAssets.map(a => a.source_file))).sort();
    const dayFileMapping = uniqueAssetFiles.slice(0, 6);
    const activeDaysCount = Math.min(uniqueAssetFiles.length, 6);

    const getDayTempString = (reeferNo: string, dayIndex: number) => {
      if (dayIndex - 1 >= dayFileMapping.length) return '';
      const targetFile = dayFileMapping[dayIndex - 1];
      const asset = allAssets.find(a => a.reefer_no === reeferNo && a.source_file === targetFile);
      return asset && asset.asset_set_temp !== null ? `${asset.asset_set_temp}°C` : '';
    };

    const findContainerAt = (rowStr: string, tierStr: string, targetSheetUnits: typeof manifestWithHatch) => {
      return targetSheetUnits.find(u => {
        const pos = String(u.position).trim().toUpperCase().replace(/\D/g, '');
        if (pos.length === 5) {
          const uRow = pos.substring(1, 3);
          const uTier = pos.substring(3, 5);
          return parseInt(uRow, 10) === parseInt(rowStr, 10) && parseInt(uTier, 10) === parseInt(tierStr, 10);
        } else if (pos.length >= 6) {
          const uRow = pos.substring(2, 4);
          const uTier = pos.substring(4, 6);
          return parseInt(uRow, 10) === parseInt(rowStr, 10) && parseInt(uTier, 10) === parseInt(tierStr, 10);
        }
        return false;
      });
    };

    const renderVisualStowageGrid = (sheet: { hatch: number | string; deck_section: 'ABOVE' | 'BELOW' | 'UNKNOWN'; units: typeof manifestWithHatch }) => {
      const isAbove = sheet.deck_section === 'ABOVE';
      
      const sheetBay = (sheet as any).bay || (
        sheet.hatch && !isNaN(parseInt(String(sheet.hatch), 10)) 
          ? String(parseInt(String(sheet.hatch), 10) * 4 - 2).padStart(2, '0') 
          : '02'
      );

      let columns: string[] = [];
      if (isAbove) {
        if (sheetBay === '02') {
          columns = ['10', '08', '06', '04', '02', '00', '01', '03', '05', '07', '09'];
        } else {
          columns = ['12', '10', '08', '06', '04', '02', '01', '03', '05', '07', '09', '11'];
        }
      } else {
        columns = ['06', '04', '02', '00', '01', '03', '05'];
      }
      
      let tiers: string[] = [];
      if (isAbove) {
        if (String(sheet.hatch) === '2') {
          tiers = ['88', '86', '84', '82'];
        } else {
          tiers = ['84', '82'];
        }
      } else {
        if (String(sheet.hatch) === '2') {
          tiers = ['08', '06', '04', '02'];
        } else if (String(sheet.hatch) === '6') {
          tiers = ['10', '08', '06', '04', '02'];
        } else {
          tiers = [];
        }
      }

      return (
        <div className="my-5 border border-slate-300 p-3 bg-slate-50/50 rounded-lg no-print-bg">
          <div className="text-center font-bold text-[9px] text-slate-800 uppercase tracking-widest mb-3 font-mono">
            Bay {sheetBay} (Hatch {sheet.hatch}) {isAbove ? 'Above Deck' : 'Below Hold'} Stowage Grid • Row / Tier Layout
          </div>
          <div className="overflow-x-auto">
            <table className="mx-auto border-2 border-slate-950 border-collapse text-center font-mono w-full max-w-4xl text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-slate-900 border-b border-slate-950">
                  <th className="border border-slate-400 p-1 text-[8px] font-black bg-slate-205 w-16">TIER</th>
                  {columns.map(col => (
                    <th key={col} className="border border-slate-400 p-1 text-[8px] font-black">
                      Row {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tiers.map(tier => (
                  <tr key={tier} className="h-10">
                    <td className="border border-slate-400 p-1 bg-slate-100 text-[8px] font-black text-slate-800">
                      Tier {tier}
                    </td>
                    {columns.map(col => {
                      const allGrouped = getGroupedPlugsForBaySection(sheetBay, sheet.deck_section as 'ABOVE' | 'BELOW');
                      const tierGroup = allGrouped.find(g => g.tier === tier);
                      const isValidPlug = tierGroup ? tierGroup.plugs.some(p => p.split('-')[1] === col) : false;

                      if (!isValidPlug) {
                        return (
                          <td key={col} className="border border-slate-200 bg-slate-100 text-slate-350 text-center select-none min-w-[55px] p-1 font-mono text-[8px] italic">
                            N/A
                          </td>
                        );
                      }

                      const item = findContainerAt(col, tier, sheet.units);
                      if (item) {
                        return (
                          <td key={col} className="border border-slate-400 p-1 bg-emerald-100 text-emerald-950 font-bold text-center relative min-w-[55px]">
                            <div className="text-[9px] font-extrabold uppercase leading-none tracking-tight">
                              {item.reefer_no}
                            </div>
                            <div className="text-[7px] text-emerald-800 mt-1 leading-none font-bold">
                              {item.manifest_set_temp !== null ? `${item.manifest_set_temp}°C` : ''} | {item.vent || 'Cls'}
                            </div>
                          </td>
                        );
                      } else {
                        return (
                          <td key={col} className="border border-slate-350 p-1 bg-white text-slate-300 text-center min-w-[55px]">
                            <div className="text-[7px] leading-none text-slate-300">
                              {sheetBay}-{col}-{tier}
                            </div>
                            <div className="text-[6px] uppercase tracking-tighter text-slate-200 mt-0.5 select-none font-mono">
                              [empty]
                            </div>
                          </td>
                        );
                      }
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    // 1. Compile sheets
    const sheets: {
      hatch: number | string;
      deck_section: 'ABOVE' | 'BELOW' | 'UNKNOWN';
      title: string;
      units: typeof manifestWithHatch;
      bay?: string;
      totalPages?: number;
      pageNumber?: number;
      groupedTiers?: {
        tier: string;
        plugs: string[];
      }[];
      isFirstPageOfBay?: boolean;
      isLastPageOfBay?: boolean;
    }[] = [];

    if (matesLogType === 'blank_form') {
      const requestedEmptyBays = [
        { bay: '02', elevation: 'ABOVE' as const, hatch: 2, title: 'Bay 02 - Hatch 02 Above Deck' },
        { bay: '02', elevation: 'BELOW' as const, hatch: 2, title: 'Bay 02 - Hatch 02 Below Hold' },
        { bay: '06', elevation: 'ABOVE' as const, hatch: 3, title: 'Bay 06 - Hatch 03 Above Deck' },
        { bay: '10', elevation: 'ABOVE' as const, hatch: 4, title: 'Bay 10 - Hatch 04 Above Deck' },
        { bay: '14', elevation: 'ABOVE' as const, hatch: 5, title: 'Bay 14 - Hatch 05 Above Deck' },
        { bay: '18', elevation: 'ABOVE' as const, hatch: 6, title: 'Bay 18 - Hatch 06 Above Deck' },
        { bay: '18', elevation: 'BELOW' as const, hatch: 6, title: 'Bay 18 - Hatch 06 Below Hold' },
        { bay: '22', elevation: 'ABOVE' as const, hatch: 7, title: 'Bay 22 - Hatch 07 Above Deck' },
        { bay: '26', elevation: 'ABOVE' as const, hatch: 8, title: 'Bay 26 - Hatch 08 Above Deck' },
        { bay: '30', elevation: 'ABOVE' as const, hatch: 9, title: 'Bay 30 - Hatch 09 Above Deck' },
        { bay: '34', elevation: 'ABOVE' as const, hatch: 10, title: 'Bay 34 - Hatch 10 Above Deck' },
        { bay: '38', elevation: 'ABOVE' as const, hatch: 11, title: 'Bay 38 - Hatch 11 Above Deck' },
        { bay: '42', elevation: 'ABOVE' as const, hatch: 12, title: 'Bay 42 - Hatch 12 Above Deck' }
      ];

      let filteredEmpty = requestedEmptyBays;
      if (matesLogHatchFilter !== 'all') {
        const targetHatchNum = parseInt(matesLogHatchFilter, 10);
        if (!isNaN(targetHatchNum)) {
          filteredEmpty = filteredEmpty.filter(b => b.hatch === targetHatchNum);
        } else if (matesLogHatchFilter === 'null') {
          filteredEmpty = [];
        }
      }

      if (matesLogDeckFilter === 'above') {
        filteredEmpty = filteredEmpty.filter(b => b.elevation === 'ABOVE');
      } else if (matesLogDeckFilter === 'below') {
        filteredEmpty = filteredEmpty.filter(b => b.elevation === 'BELOW');
      }

      filteredEmpty.forEach(eb => {
        const allGrouped = getGroupedPlugsForBaySection(eb.bay, eb.elevation);
        
        const chunkArray = <T,>(array: T[], size: number): T[][] => {
          const chunks: T[][] = [];
          for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
          }
          return chunks;
        };
        const chunks = chunkArray(allGrouped, 2);
        const totalPages = chunks.length;

        chunks.forEach((chunk, index) => {
          sheets.push({
            hatch: eb.hatch,
            deck_section: eb.elevation,
            title: `Blank Watch Rounds Worksheet — ${eb.title}`,
            units: [],
            bay: eb.bay,
            totalPages: totalPages,
            pageNumber: index + 1,
            groupedTiers: chunk,
            isFirstPageOfBay: index === 0,
            isLastPageOfBay: index === totalPages - 1
          });
        });
      });
    } else {
      // Mapped elements
      const targetHatches = matesLogHatchFilter === 'all' 
        ? distinctHatches 
        : (matesLogHatchFilter === 'null' ? ['null'] : [parseInt(matesLogHatchFilter, 10)]);

      targetHatches.forEach(h => {
        const hatchUnits = manifestWithHatch.filter(m => h === 'null' ? m.hatch === null : m.hatch === h);
        const aboveUnits = hatchUnits.filter(m => m.deck_section === 'ABOVE');
        const belowUnits = hatchUnits.filter(m => m.deck_section === 'BELOW');

        const filterDeckOption = matesLogDeckFilter;

        if (filterDeckOption !== 'below' && aboveUnits.length > 0) {
          sheets.push({
            hatch: h === 'null' ? 'Unmapped' : h,
            deck_section: 'ABOVE',
            title: `Hatch ${h === 'null' ? 'Unmapped' : h} Reefer Log - Above Deck`,
            units: aboveUnits.sort((a,b) => a.position.localeCompare(b.position) || a.reefer_no.localeCompare(b.reefer_no))
          });
        }

        if (filterDeckOption !== 'above' && belowUnits.length > 0) {
          sheets.push({
            hatch: h === 'null' ? 'Unmapped' : h,
            deck_section: 'BELOW',
            title: `Hatch ${h === 'null' ? 'Unmapped' : h} Reefer Log - Below Hold (separated holds)`,
            units: belowUnits.sort((a,b) => a.position.localeCompare(b.position) || a.reefer_no.localeCompare(b.reefer_no))
          });
        }
      });
    }

    if (sheets.length === 0) {
      return (
        <div className="bg-white border border-slate-350 p-6 text-center text-slate-800 font-mono rounded">
          No matching reefer records parsed for the currently specified Hatch / Deck filters.
        </div>
      );
    }

    return (
      <div className="space-y-12">
        {sheets.map((sheet, sIdx) => {
          const isLoadLog = matesLogType === 'load_log';
          const isDailyLog = matesLogType === 'daily_log';
          const isRoundsLog = matesLogType === 'watch_rounds_builder';
          const isBlankForm = matesLogType === 'blank_form';

          const sheetBay = (sheet as any).bay || (
            sheet.hatch && !isNaN(parseInt(String(sheet.hatch), 10)) 
              ? String(parseInt(String(sheet.hatch), 10) * 4 - 2).padStart(2, '0') 
              : '02'
          );

          if (isBlankForm) {
            const bayString = sheetBay;
            const groupedTiers = sheet.groupedTiers || [];

            return (
              <div 
                key={`print-sheet-${sIdx}`} 
                className={`page-break p-8 bg-white border border-slate-300 text-slate-900 rounded-lg shadow-sm ${
                  isPrintMedia ? 'page-break border-0 p-0 shadow-none text-black bg-white font-sans' : ''
                }`}
                style={{ breakAfter: 'page', pageBreakAfter: 'always', minHeight: isPrintMedia ? '194mm' : 'auto' }}
              >
                {/* Sheet Header block */}
                <div className="flex justify-between items-start border-b-2 border-slate-950 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-950 tracking-tight leading-none flex items-center space-x-1 font-sans">
                      <span>GEORGE II ACTIVE REEFER WATCH LOG</span>
                      <span className="text-slate-500 font-bold font-mono">— VOYAGE {voyageNo}</span>
                    </h3>
                    <p className="text-[10px] text-slate-600 font-mono mt-1 font-bold uppercase tracking-wider">
                      {sheet.title} • PHYSICAL PLUG SOCKET CARD FORMAT {sheet.totalPages && sheet.totalPages > 1 ? `• Sheet ${sheet.pageNumber} of ${sheet.totalPages}` : ''}
                    </p>
                  </div>
                  <div className="text-right font-mono text-[9px] text-slate-800 space-y-0.5 leading-none">
                    <div>DATE OF ROUNDS: <b className="font-extrabold text-slate-950">{dateStr}</b></div>
                    <div>VESSEL SYSTEM: <b className="font-bold text-slate-900">C9 George II</b></div>
                    <div>BAY SECTION: <b className="font-bold text-slate-950">BAY {sheetBay}</b></div>
                    <div>FACING STATUS: <b className="font-bold">ALL REEFERS FACE AFT</b></div>
                  </div>
                </div>

                {/* Stowage guide caption */}
                <div className="p-2 border border-slate-400 bg-slate-50 text-[9px] text-slate-700 leading-normal flex justify-between items-center mb-4 font-mono">
                  <div>
                    <span className="font-extrabold text-slate-950 uppercase">STOWAGE MONITORING DIRECTIVE:</span>
                    <span className="ml-1">Verify temperature readings physically on reefer controller screens. Ensure vent flap position is identical to target manifest % vent. Mark warnings as required.</span>
                  </div>
                  <div className="font-mono text-slate-400 font-bold uppercase text-[8px]">Page {sIdx + 1} of {sheets.length}</div>
                </div>

                {/* Watchkeeper Check-off & Time Block - Render once per Bay Section */}
                {sheet.isFirstPageOfBay ? (
                  <div className="grid grid-cols-3 gap-2 border-2 border-slate-950 p-2 bg-slate-100 mb-4 text-[10px] font-mono rounded">
                    <div className="flex items-center space-x-2 border-r border-slate-350 pr-2">
                      <span className="font-black text-[9px] uppercase tracking-wider text-slate-950">WATCHKEEPER:</span>
                      <div className="flex items-center space-x-2 text-[8.5px]">
                        <label className="flex items-center space-x-1 cursor-pointer font-black">
                          <span className="border-2 border-slate-950 rounded bg-white w-3.5 h-3.5 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                          <span>ELEC</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer font-black">
                          <span className="border-2 border-slate-950 rounded bg-white w-3.5 h-3.5 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                          <span>DEU</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer font-black">
                          <span className="border-2 border-slate-950 rounded bg-white w-3.5 h-3.5 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                          <span>OTHER</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 border-r border-slate-350 px-2">
                      <span className="font-black text-[9px] uppercase shrink-0 text-slate-950">TIME CALLED:</span>
                      <div className="border-b-2 border-dashed border-slate-700 flex-grow h-4"></div>
                    </div>
                    <div className="flex items-center space-x-1.5 pl-2">
                      <span className="font-black text-[9px] uppercase shrink-0 text-slate-950">TIME KNOCKED OFF:</span>
                      <div className="border-b-2 border-dashed border-slate-700 flex-grow h-4"></div>
                    </div>
                  </div>
                ) : (
                  <div className="p-1 px-2 border-2 border-blue-500 bg-blue-50 mb-4 text-[9px] font-mono rounded text-blue-900 font-bold tracking-wide flex justify-between">
                    <span>CHECK-ON CALLOUT REGISTERED ON SHEET 1</span>
                    <span>CONTINUED REEFER PLUG SLOTS</span>
                  </div>
                )}

                {/* Tiered cascading sections (highest tier first, rows sorted left-to-right Port to Starboard) */}
                <div className="space-y-4">
                  {groupedTiers.map(({ tier, plugs: tierPlugs }) => (
                    <div key={tier} className="border-2 border-dashed border-slate-950 p-2 rounded">
                      <div className="flex justify-between items-center text-[9px] font-black text-slate-900 bg-slate-100 px-2 py-1 mb-2 border border-slate-400 uppercase tracking-widest font-mono">
                        <span>TIER LEVEL {tier} (CASCADING HIGH TO LOW)</span>
                        <span>STARBOARD (LEFT) ──▶ PORT (RIGHT)</span>
                      </div>
                      
                      <div className="grid gap-1 w-full" style={{ gridTemplateColumns: `repeat(${tierPlugs.length}, minmax(0, 1fr))` }}>
                        {tierPlugs.map((pNo) => {
                          const rowNum = pNo.split('-')[1];
                          return (
                            <div key={pNo} className="border border-slate-950 p-1 rounded flex flex-col justify-between bg-white text-slate-900 font-mono" style={{ minHeight: '135px' }}>
                              <div className="flex justify-between items-center bg-slate-100 px-0.5 py-0.5 text-[7px] font-black border-b border-slate-950 mb-1 leading-none text-slate-900">
                                <span>🔌 Row {rowNum}</span>
                              </div>
                              <div className="flex flex-col justify-between h-full space-y-1.5 text-[6.5px] leading-tight text-slate-900">
                                <div>
                                  <span className="text-[5.5px] text-slate-500 block font-sans font-black leading-none">CONTAINER ID</span>
                                  <div className="border-b border-slate-950 mt-1 h-5.5"></div>
                                </div>
                                <div>
                                  <span className="text-[5px] text-slate-500 block font-sans font-black leading-none">SET / LOAD TEMP</span>
                                  <div className="flex justify-between items-end h-3 mt-0.5">
                                    <div className="border-b border-dashed border-slate-705 w-5/12 h-2.5"></div>
                                    <span className="text-[5px] text-slate-900 font-bold">/</span>
                                    <div className="border-b border-dashed border-slate-705 w-5/12 h-2.5"></div>
                                    <span className="text-[5px] font-sans font-black">°C</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[5px] text-slate-500 block font-sans font-black leading-none">VENT FLAP</span>
                                  <div className="flex items-center space-x-0.5 text-[5px] mt-0.5 font-sans font-black">
                                    <span className="border border-slate-950 rounded-sm w-1.5 h-1.5 bg-white block shrink-0"></span>
                                    <span>C</span>
                                    <span className="border border-slate-950 rounded-sm w-1.5 h-1.5 bg-white block shrink-0 ml-0.5"></span>
                                    <span>O</span>
                                    <div className="border-b border-dashed border-slate-705 w-1.5 h-2 ml-0.5"></div>
                                    <span>%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Signature - OOW and Chief Mate only (No duty engineer) */}
                {sheet.isLastPageOfBay ? (
                  <div className="grid grid-cols-2 gap-8 border-t-2 border-slate-950 pt-4 mt-6 text-[10px] text-slate-900 font-mono">
                    <div>
                      <div>OOW (OFFICER ON WATCH) SIGN: ____________________________________</div>
                      <div className="text-[8px] text-slate-500 mt-1 italic font-sans leading-none">
                        (Verify physical socket state matches above hand-written rounds list. Sign ONLY after all reefers are plugged in and operating)
                      </div>
                    </div>
                    <div className="text-right">
                      <div>CHIEF MATE SIGN: __________________________________________________</div>
                      <div className="text-[8px] text-slate-500 mt-1 italic font-sans leading-none">
                        (Inspected safety logbook deck operability verification co-signature)
                      </div>
                      <div className="mt-3 text-slate-500 uppercase tracking-widest text-[8px] font-mono leading-none">
                        George II Deck Operations Archive Module (Sheet Page {sIdx+1} of {sheets.length})
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t-2 border-dashed border-slate-300 pt-4 mt-6 flex justify-between items-center text-[9px] text-slate-500 uppercase font-mono font-bold w-full">
                    <span>Continued on next Page log...</span>
                    <span>George II Deck Operations (Page {sheet.pageNumber} of {sheet.totalPages})</span>
                  </div>
                )}
              </div>
            );
          }

          const renderedRowsCount = isBlankForm ? extraRowsCount : (sheet.units.length + (isRoundsLog ? extraRowsCount : 0));

          return (
            <div 
              key={`print-sheet-${sIdx}`} 
              className={`page-break p-8 bg-white border border-slate-300 text-slate-900 rounded-lg shadow-sm ${
                isPrintMedia ? 'page-break border-0 p-0 shadow-none' : ''
              }`}
            >
              {/* Sheet Header block */}
              <div className="flex justify-between items-start border-b-2 border-slate-950 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-950 tracking-tight leading-none flex items-center space-x-1">
                    <span className="text-slate-900">GEORGE II ACTIVE REEFER WATCH LOG</span>
                    <span className="text-slate-500 font-bold">— VOYAGE {voyageNo}</span>
                  </h3>
                  <p className="text-[10px] text-slate-600 font-mono mt-1 font-bold uppercase tracking-wider">
                    {sheet.title} • {isLoadLog && 'REEFER LOAD LOG (CARGO PLAN POSITION SEPARATIONS)'}
                    {isDailyLog && `DAILY TEMPS ARCHIVE MATRIX — ${dayFileMapping.length} RECORDED FILES`}
                    {isRoundsLog && 'OOW WATCH COPIES DESK ROUNDS CHECK SHEET'}
                    {isBlankForm && 'BLANK WRITING FORM'}
                  </p>
                </div>
                <div className="text-right font-mono text-[9px] text-slate-800 space-y-0.5 leading-none">
                  <div>DATE OF RECORD: <b className="font-extrabold text-slate-950">{dateStr}</b></div>
                  <div>VESSEL SYSTEM: <b className="font-bold text-slate-900">C9 George II</b></div>
                  <div>BAY SECTION: <b className="font-bold text-slate-950">BAY {sheetBay}</b></div>
                  <div>FACING STATUS: <b className="font-bold">ALL REEFERS FACE AFT</b></div>
                </div>
              </div>

              {/* Stowage guide caption from Securing manual */}
              <div className="p-2 border border-slate-400 bg-slate-50 text-[9px] text-slate-705 leading-normal flex justify-between items-center mb-4">
                <div>
                  <span className="font-extrabold text-slate-900 uppercase">STOWAGE SEGREGATION DIRECTIVE:</span>
                  <span className="ml-1 text-slate-700">Positions mapped dynamically to Hatch Cover layouts. Only Hatch 1 and Hatch 10 support more than 2 tiers above deck; holds with active plugs shown separate.</span>
                </div>
                <div className="font-mono text-slate-400 font-bold uppercase text-[8px]">Page {sIdx + 1} of {sheets.length}</div>
              </div>

              {/* Visual Shipyard Cell Layout Grid */}
              {renderVisualStowageGrid(sheet)}

              {/* Data Table */}
              <table className="w-full border-collapse text-[10px] font-mono border border-slate-900 mt-4">
                <thead>
                  <tr className="bg-slate-100 text-slate-950 border-b border-slate-900 uppercase text-[9px] h-8 text-center">
                    <th className="px-1 border-r border-slate-900 w-8">No.</th>
                    <th className="px-1 border-r border-slate-900 w-16">Row Cell</th>
                    <th className="px-1 border-r border-slate-900 w-28">Container ID</th>
                    <th className="px-1 border-r border-slate-900 w-16">Set Temp (°C)</th>
                    <th className="px-1 border-r border-slate-900 w-16">Vent open</th>

                    {/* LOAD LOG EXTRA COLUMN */}
                    {isLoadLog && (
                      <th className="px-1 border-r border-slate-900 w-28 bg-emerald-50 text-emerald-950 font-bold">Temp at Loading (°C)</th>
                    )}

                    {/* ROUNDS LOG EXTRA COLUMNS */}
                    {(isRoundsLog || isBlankForm) && (
                      <>
                        <th className="px-1 border-r border-slate-900 w-28 bg-blue-50 text-blue-900 font-bold">Actual temp (°C)</th>
                        <th className="px-1 border-r border-slate-900 w-20 bg-blue-50 text-blue-900 font-bold">Vent (C/O)</th>
                        <th className="px-1 border-r border-slate-900 w-20 bg-blue-50 text-blue-900 font-bold">Vent % Flow</th>
                      </>
                    )}

                    {/* DAILY MATRIX LOGS EXTRA COLUMNS */}
                    {isDailyLog && Array.from({ length: 6 }).map((_, d) => {
                      const hasDayFile = d < dayFileMapping.length;
                      return (
                        <React.Fragment key={`day-hdr-${d}`}>
                          <th className={`px-0.5 border-r border-slate-900 w-12 font-bold ${hasDayFile ? 'bg-slate-200/50' : 'bg-slate-100/10 text-slate-300'}`}>D{d+1} AM</th>
                          <th className={`px-0.5 border-r border-slate-900 w-12 font-bold ${hasDayFile ? 'bg-slate-200/50' : 'bg-slate-100/10 text-slate-300'}`}>D{d+1} PM</th>
                        </React.Fragment>
                      );
                    })}

                    <th className="px-1">Watch Check / Remarks / Active Alarms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-400 leading-none">
                  {/* Prepopulated or Blank records rendering loop */}
                  {Array.from({ length: renderedRowsCount }).map((_, rIdx) => {
                    const isOverLineIndex = !isBlankForm && rIdx >= sheet.units.length;
                    const item = isOverLineIndex || isBlankForm ? null : sheet.units[rIdx];
                    const numCol = rIdx + 1;

                    return (
                      <tr key={`log-row-${rIdx}`} className="h-8">
                        <td className="px-1 border-r border-slate-400 text-center font-bold text-slate-500">{numCol}</td>
                        
                        {/* Position (Cell) */}
                        <td className="px-1 border-r border-slate-400 font-black text-slate-950 text-center">
                          {item ? item.position : ''}
                        </td>

                        {/* Container ID */}
                        <td className="px-1 border-r border-slate-400 font-black text-slate-900 text-center uppercase">
                          {item ? item.reefer_no : ''}
                        </td>

                        {/* Manifest Set Temp */}
                        <td className="px-1 border-r border-slate-400 text-center font-bold text-slate-800">
                          {item && item.manifest_set_temp !== null ? `${item.manifest_set_temp}°C` : ''}
                        </td>

                        {/* Vent closed/open percentage */}
                        <td className="px-1 border-r border-slate-400 text-center font-semibold text-slate-650">
                          {item ? (item.vent || 'Closed') : ''}
                        </td>

                        {/* Load Log Temp at Loading */}
                        {isLoadLog && (
                          <td className="px-1 border-r border-slate-400 bg-emerald-50/20 text-center font-black text-emerald-800">
                            {item ? getDayTempString(item.reefer_no, 1) : ''}
                          </td>
                        )}

                        {/* Watch rounds checker */}
                        {(isRoundsLog || isBlankForm) && (
                          <>
                            <td className="px-1 border-r border-slate-400 bg-blue-50/15"></td>
                            <td className="px-1 border-r border-slate-400 bg-blue-50/15"></td>
                            <td className="px-1 border-r border-slate-400 bg-blue-50/15"></td>
                          </>
                        )}

                        {/* Daily Matrix AM/PM telemetry logger Columns */}
                        {isDailyLog && Array.from({ length: 6 }).map((_, dIdx) => {
                          const tempVal = item ? getDayTempString(item.reefer_no, dIdx + 1) : '';
                          return (
                            <React.Fragment key={`cell-day-${rIdx}-${dIdx}`}>
                              <td className="px-0.5 border-r border-slate-400 text-center text-slate-900 font-black font-mono select-all bg-white">{tempVal}</td>
                              <td className="px-0.5 border-r border-slate-400 text-center text-slate-900 font-black font-mono select-all bg-white">{tempVal}</td>
                            </React.Fragment>
                          );
                        })}

                        {/* Alarms and Sign off space */}
                        <td className="px-1 select-text text-[9px] text-red-700 italic">
                          {item && alarms.some(a => a.reefer_no === item.reefer_no) && (
                            <span className="font-bold uppercase tracking-wider text-red-650 flex items-center space-x-1">
                              ⚠️ TELEMETRY WARN ALARM
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Official Sign Off Row */}
              <div className="grid grid-cols-2 gap-8 border-t-2 border-slate-950 pt-4 mt-6 text-[10px] text-slate-900 font-mono">
                <div>
                  <div>OOW (OFFICER ON WATCH) SIGN: ____________________________________</div>
                  <div className="text-[8px] text-slate-500 mt-1 italic font-sans">
                    (Sign ONLY after all reefers on Hatch {sheet.hatch} {sheet.deck_section === 'ABOVE' ? 'Above' : 'Below'} are confirmed plugged in and operating)
                  </div>
                  <div className="mt-3">DUTY REEFER ENGINEER CO-SIGN: ____________________________</div>
                </div>
                <div className="text-right">
                  <div>CHIEF MATE SIGN: __________________________________________________</div>
                  <div className="text-[8px] text-slate-500 mt-1 italic font-sans">
                    (Sign ONLY after all reefers are confirmed plugged in, and status matches manifest constraints)
                  </div>
                  <div className="mt-3 text-slate-500 uppercase tracking-widest text-[8px] font-mono">
                    C9 George II Cargo Securing Manual Verification Log (Page {sIdx+1} of {sheets.length})
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}
