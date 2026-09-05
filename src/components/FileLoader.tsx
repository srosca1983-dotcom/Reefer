/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  X,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Anchor,
  Printer,
  Sparkles
} from 'lucide-react';

interface FileLoaderProps {
  voyageNo: string;
  setVoyageNo: (v: string) => void;
  onFilesLoaded: (data: {
    manifestRows: any[][] | null;
    manifestName: string;
    baymapRows: any[][] | null;
    baymapName: string;
    assetsFiles: { name: string; rows: any[][] }[];
  }) => void;
  onPrintBlankClick?: () => void;
  onLoadDemoData?: () => void;
}

export default function FileLoader({
  voyageNo,
  setVoyageNo,
  onFilesLoaded,
  onPrintBlankClick,
  onLoadDemoData
}: FileLoaderProps) {
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [baymapFile, setBaymapFile] = useState<File | null>(null);
  const [assetsFilesList, setAssetsFilesList] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const manifestRef = useRef<HTMLInputElement>(null);
  const baymapRef = useRef<HTMLInputElement>(null);
  const assetsRef = useRef<HTMLInputElement>(null);

  const handleManifestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (!f.name.toLowerCase().includes('manifest')) {
        setErrorMsg('Warning: Manifest filename does not contain "manifest". Are you sure this is the right file?');
      } else {
        setErrorMsg(null);
      }
      setManifestFile(f);
    }
  };

  const handleBaymapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBaymapFile(e.target.files[0]);
    }
  };

  const handleAssetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files) as File[];
      const invalid = selected.filter(f => !f.name.toLowerCase().includes('assets'));
      if (invalid.length > 0) {
        setErrorMsg('Note: One or more daily files do not contain "assets" in their name, but we will append them in order.');
      } else {
        setErrorMsg(null);
      }
      setAssetsFilesList((prev) => [...prev, ...selected]);
    }
  };

  const removeAssetsFile = (idx: number) => {
    setAssetsFilesList((prev) => prev.filter((_, i) => i !== idx));
  };

  const triggerProcess = async () => {
    if (!voyageNo.trim()) {
      setErrorMsg('Please enter a Voyage Number (e.g. 064W).');
      return;
    }
    if (!manifestFile) {
      setErrorMsg('Please select a Cargo Manifest file.');
      return;
    }
    if (assetsFilesList.length === 0) {
      setErrorMsg('Please upload at least one Daily Assets file.');
      return;
    }

    // Dynamic XLSX import
    const { readSheetRows } = await import('../utils/excelParser');

    try {
      setErrorMsg(null);
      const mRows = await readSheetRows(manifestFile);
      let bRows = null;
      if (baymapFile) {
        bRows = await readSheetRows(baymapFile);
      }

      // Read assets in series
      const loadedAssets: { name: string; rows: any[][] }[] = [];
      for (const aFile of assetsFilesList) {
        const rows = await readSheetRows(aFile);
        loadedAssets.push({ name: aFile.name, rows });
      }

      onFilesLoaded({
        manifestRows: mRows,
        manifestName: manifestFile.name,
        baymapRows: bRows,
        baymapName: baymapFile ? baymapFile.name : '',
        assetsFiles: loadedAssets
      });
    } catch (err: any) {
      setErrorMsg(`Failed to parse Excel files: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="file-loader-container">
      {/* Title block */}
      <div className="flex items-center space-x-3 text-slate-200">
        <Anchor className="h-8 w-8 text-blue-400 animate-pulse" />
        <div>
          <h2 className="text-xl font-extrabold tracking-tight font-sans text-white uppercase">Import Voyage Worksheets</h2>
          <p className="text-xs text-blue-400 font-mono tracking-wider">STEP 1: RECONCILE MANIFEST & DAILY TELEMETRY FILES</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm p-4 rounded-xl flex items-start space-x-2">
          <span className="font-bold text-rose-450">Error:</span>
          <div>{errorMsg}</div>
        </div>
      )}

      {onPrintBlankClick && (
        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shadow-md shadow-emerald-500/5">
          <div className="flex items-start space-x-3">
            <Printer className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="text-xs font-black text-emerald-350 uppercase tracking-wider font-sans">Mates Hand-written Rounds Log Sheet</h4>
              <p className="text-xs text-slate-400 mt-0.5">Need a blank reefer watch rounds sheet for deck officers on watch to manually record temperatures and vents?</p>
            </div>
          </div>
          <button
            onClick={onPrintBlankClick}
            className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white rounded-lg text-xs font-bold px-4.5 py-2.5 transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap self-start sm:self-center"
          >
            <Printer className="h-4 w-4" />
            <span>Print Blank Watch Log</span>
          </button>
        </div>
      )}

      {onLoadDemoData && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shadow-md shadow-blue-500/5">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="text-xs font-black text-blue-350 uppercase tracking-wider font-sans">No spreadsheets or baymaps handy?</h4>
              <p className="text-xs text-slate-400 mt-0.5">Get started immediately! Load our pre-configured GII standard mock cargo manifest & multi-day telemetry package.</p>
            </div>
          </div>
          <button
            onClick={onLoadDemoData}
            className="bg-blue-650 hover:bg-blue-600 border border-blue-500/30 text-white rounded-lg text-xs font-bold px-4.5 py-2.5 transition-all shadow-md shadow-blue-500/10 flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap self-start sm:self-center"
          >
            <Sparkles className="h-4 w-4" />
            <span>Load Demo Voyage Data</span>
          </button>
        </div>
      )}

      <div className="bg-[#1E293B]/40 border border-slate-800 rounded-xl shadow-xl p-6 space-y-6 backdrop-blur-sm">
        {/* Voyage No Box */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 font-sans animate-fade-in">Voyage Number</label>
          <div className="mt-1.5 max-w-xs">
            <input
              type="text"
              id="voyage-no-input"
              value={voyageNo}
              onChange={(e) => setVoyageNo(e.target.value)}
              placeholder="e.g. 064W"
              className="w-full bg-[#0F172A] border border-slate-800 text-slate-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 font-mono transition-colors"
            />
          </div>
          <p className="text-slate-500 text-xs mt-1">Voyage code used for the final workbook sheets and headers.</p>
        </div>

        {/* 2 Columns for Files */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Manifest */}
          <div className="border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 hover:shadow-lg transition bg-[#0F172A]/80 shadow-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-400 font-mono font-sans">MANIFEST</span>
                {manifestFile && <CheckCircle className="h-5 w-5 text-emerald-400 animate-pulse" />}
              </div>
              <h3 className="text-sm font-bold text-slate-202">Cargo Manifest</h3>
              <p className="text-xs text-slate-455 mt-1">Contains initial container stowages, target temperatures, and vents.</p>
              
              {manifestFile ? (
                <div className="mt-4 p-2 bg-emerald-500/10 border border-emerald-500/25 rounded text-xs flex items-center justify-between">
                  <span className="font-mono text-emerald-350 truncate max-w-[200px]" title={manifestFile.name}>
                    {manifestFile.name}
                  </span>
                  <button onClick={() => setManifestFile(null)} className="text-slate-400 hover:text-rose-450 transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <button
                    onClick={() => manifestRef.current?.click()}
                    className="w-full flex items-center justify-center space-x-2 border border-dashed border-slate-755 hover:bg-slate-800/20 hover:border-blue-500/50 rounded-lg py-4 text-xs text-slate-300 font-medium transition cursor-pointer"
                  >
                    <Upload className="h-4 w-4 text-slate-455 font-bold" />
                    <span>Upload Manifest</span>
                  </button>
                  <input
                    ref={manifestRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleManifestChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
            
            <div className="mt-4 text-[10px] text-slate-500 flex items-center space-x-1 font-mono">
              <HelpCircle className="h-3 w-3 text-slate-400" />
              <span>Must contain 'manifest' in name</span>
            </div>
          </div>

          {/* Card 2: Assets Telemetry */}
          <div className="border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 hover:shadow-lg transition bg-[#0F172A]/80 shadow-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-400 font-mono">TELEMETRY</span>
                {assetsFilesList.length > 0 && (
                  <span className="text-xs bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-black">
                    {assetsFilesList.length} Days Mapped
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-202">Daily Assets (Telemetry)</h3>
              <p className="text-xs text-slate-455 mt-1">Daily telemetry data containing temperatures, stowage locations & alarms.</p>
              
              <div className="mt-4">
                <button
                  onClick={() => assetsRef.current?.click()}
                  className="w-full flex items-center justify-center space-x-2 border border-dashed border-slate-755 hover:bg-slate-800/10 hover:border-blue-505/50 rounded-lg py-3 text-xs text-slate-300 font-medium transition cursor-pointer"
                >
                  <Upload className="h-4 w-4 text-slate-450" />
                  <span>Add Daily Assets Spreadsheet</span>
                </button>
                <input
                  ref={assetsRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls"
                  onChange={handleAssetsChange}
                  className="hidden"
                />
              </div>

              {assetsFilesList.length > 0 && (
                <div className="mt-3 max-h-[140px] overflow-y-auto space-y-1.5 border-t border-slate-800/60 pt-2 pr-1">
                  {assetsFilesList.map((f, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-850 p-2 rounded flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span className="truncate text-slate-400 max-w-[200px] flex items-center space-x-1">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">Day {i + 1}: {f.name}</span>
                      </span>
                      <button onClick={() => removeAssetsFile(i)} className="text-slate-500 hover:text-rose-450 font-bold transition scroll-none">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-4 text-[10px] text-slate-500 flex items-center space-x-1 font-mono">
              <HelpCircle className="h-3 w-3 text-slate-400" />
              <span>Provide up to 6 files sequentially</span>
            </div>
          </div>
        </div>

        {/* Start build button */}
        <div className="pt-4 border-t border-slate-800/50 flex justify-end">
          <button
            id="build-reefer-workbook-btn"
            onClick={triggerProcess}
            className="bg-blue-600 hover:bg-blue-550 border border-blue-500/20 text-white text-sm font-semibold rounded-lg px-6 py-2.5 shadow-lg shadow-blue-500/10 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center space-x-2 cursor-pointer"
          >
            <span>Analyze Vessel Logs</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
