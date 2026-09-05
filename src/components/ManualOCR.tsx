/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  ListRestart
} from 'lucide-react';
import { ManifestContainer, PositionOverride } from '../types';
import { parseLogTextToPositions } from '../utils/excelParser';

interface ManualOCRProps {
  manifest: ManifestContainer[];
  overrides: PositionOverride[];
  onAddOverride: (reeferNo: string, correctedPosition: string, source: string) => void;
  onRemoveOverride: (reeferNo: string) => void;
}

export default function ManualOCR({
  manifest,
  overrides,
  onAddOverride,
  onRemoveOverride
}: ManualOCRProps) {
  const [pastedText, setPastedText] = useState('');
  const [sourceName, setSourceName] = useState('Scanned_Reefer_Log.pdf');
  const [parsedItems, setParsedItems] = useState<{ reefer_no: string; position: string; isDifferent: boolean; original: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Manual input form state
  const [manualReefer, setManualReefer] = useState('');
  const [manualPosition, setManualPosition] = useState('');

  const handleParseText = () => {
    if (!pastedText.trim()) return;

    const parsed = parseLogTextToPositions(pastedText);
    
    // Enrich with Manifest comparisons
    const enriched = parsed.map(item => {
      const match = manifest.find(m => m.reefer_no === item.reefer_no);
      const original = match ? match.position : 'Not in Manifest';
      const isDifferent = match ? match.position !== item.position : true;
      return {
        reefer_no: item.reefer_no,
        position: item.position,
        isDifferent,
        original
      };
    });

    setParsedItems(enriched);
  };

  const handleApplySingleParsed = (item: typeof parsedItems[0]) => {
    onAddOverride(item.reefer_no, item.position, sourceName);
    // Remove from parsed list
    setParsedItems(prev => prev.filter(p => p.reefer_no !== item.reefer_no));
  };

  const handleApplyAllParsed = () => {
    let count = 0;
    parsedItems.forEach(item => {
      if (item.isDifferent) {
        onAddOverride(item.reefer_no, item.position, sourceName);
        count++;
      }
    });
    setParsedItems([]);
    setPastedText('');
  };

  const handleAddManualSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReefer.trim() || !manualPosition.trim()) return;

    const rUpper = manualReefer.trim().toUpperCase();
    const pClean = manualPosition.trim().replace(/\s+/g, '');

    onAddOverride(rUpper, pClean, 'Manual Entry Override');
    setManualReefer('');
    setManualPosition('');
  };

  const filteredOverrides = overrides.filter(o => 
    o.reefer_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.corrected_position.includes(searchQuery) ||
    o.original_position.includes(searchQuery)
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="scanned-logs-container">
      {/* Header */}
      <div className="flex items-center space-x-3 text-slate-200">
        <FileText className="h-8 w-8 text-blue-400" />
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white uppercase font-sans">Manual & Scanned Log Overrides</h2>
          <p className="text-xs text-blue-400 font-mono tracking-wider">STEP 2: APPLY POSITION CHANGES & SCANNED CORRECTIONS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Paste OCR Text or Manual Addition */}
        <div className="space-y-6">
          {/* Card: Text Parser */}
          <div className="bg-[#1E293B]/40 border border-slate-805 rounded-xl p-5 shadow-lg space-y-4 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-1.5 font-sans">
              <span>Import Scanned Log PDF Content</span>
            </h3>
            <p className="text-xs text-slate-400">
              Paste the text content/OCR export transcripts below. Our regex module matches container codes and physical cell stowage numbers.
            </p>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">SOURCE LOG FILENAME</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g. Voyage_064W_Reefer_Log.pdf"
                className="mt-1.5 w-full text-xs font-mono bg-[#0F172A] border border-slate-800 text-slate-250 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">PASTE TEXT / MANUALLY EXPORTED STRINGS</label>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Example: &#10;SUDU5134125   location: 040812&#10;MAEU9928501   cell spot: 121082"
                className="mt-1.5 w-full text-xs font-mono bg-[#0F172A] border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/35"
              />
            </div>

            <button
              onClick={handleParseText}
              disabled={!pastedText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-550 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg px-4 py-2.5 flex items-center justify-center space-x-1.5 shadow transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
              <span>Parse Text For Stowages</span>
            </button>

            {/* Parsed Previews */}
            {parsedItems.length > 0 && (
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-900/60 w-full space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-blue-400">Parsed {parsedItems.length} Stowages</span>
                  <button onClick={handleApplyAllParsed} className="text-blue-400 hover:text-blue-300 text-[11px] font-black cursor-pointer">
                    Apply All Changes
                  </button>
                </div>
                <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                  {parsedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-[#1E293B] border border-slate-800 rounded-lg shadow-sm">
                      <div className="space-y-0.5">
                        <div className="font-bold text-white">{item.reefer_no}</div>
                        <div className="text-slate-450 text-[10px]">
                          Manifest: <span className="text-slate-400">{item.original}</span> → Corrected: <span className="text-blue-400 font-bold bg-blue-500/10 px-1 rounded">{item.position}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleApplySingleParsed(item)}
                        className="text-[10px] bg-blue-500/15 hover:bg-blue-550 hover:text-white text-blue-400 font-bold px-2.5 py-1 rounded border border-blue-550/20 transition cursor-pointer"
                      >
                        Record
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card: Manual Entry */}
          <form onSubmit={handleAddManualSingle} className="bg-[#1E293B]/40 border border-slate-805 rounded-xl p-5 shadow-lg space-y-4 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-1 font-sans">
              <Plus className="h-4 w-4 text-blue-450 font-bold" />
              <span>Quick Manual Override</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">REEFER NUMBER</label>
                <input
                  type="text"
                  required
                  value={manualReefer}
                  onChange={(e) => setManualReefer(e.target.value)}
                  placeholder="e.g. SUDU5134125"
                  className="mt-1.5 w-full text-xs font-mono bg-[#0F172A] border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/35"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">ACTUAL CORRECTED CELL</label>
                <input
                  type="text"
                  required
                  value={manualPosition}
                  onChange={(e) => setManualPosition(e.target.value)}
                  placeholder="e.g. 040812"
                  className="mt-1.5 w-full text-xs font-mono bg-[#0F172A] border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/35"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/15 text-blue-400 text-xs font-bold rounded-lg px-4 py-2 flex items-center justify-center space-x-1 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Position Correction</span>
            </button>
          </form>
        </div>

        {/* Right Side: Log of Overrides */}
        <div className="bg-[#1E293B]/40 border border-[#1E293B] rounded-xl p-5 shadow-lg flex flex-col justify-between backdrop-blur-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-1.5 font-sans">
                <ListRestart className="h-4.5 w-4.5 text-blue-450" />
                <span>Override Database Logs</span>
              </h3>
              <span className="text-xs bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-450 font-mono font-black shadow-inner">
                {overrides.length} Registered
              </span>
            </div>

            {/* Search/Filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search overrides by reefer..."
                className="w-full text-xs font-mono bg-[#0F172A] border border-slate-800 rounded-lg px-8 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 pl-8.5"
              />
            </div>

            {/* list */}
            {filteredOverrides.length > 0 ? (
              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {filteredOverrides.map((o, idx) => (
                  <div key={idx} className="border border-slate-802 bg-[#0F172A]/40 rounded-xl p-3 hover:bg-slate-800/40 transition flex items-center justify-between">
                    <div className="space-y-1 max-w-[240px]">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-white font-mono">{o.reefer_no}</span>
                        <span className="text-[10px] bg-amber-500/10 border border-amber-500/25 text-amber-400 font-semibold px-2 py-0.2 rounded font-mono truncate max-w-[120px]" title={o.source_scan}>
                          {o.source_scan}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Cell: <span className="line-through text-slate-500">{o.original_position}</span> → <span className="text-emerald-400 font-extrabold">{o.corrected_position}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveOverride(o.reefer_no)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-full hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete Override"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-slate-800 bg-slate-900/10 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-slate-650" />
                <p className="text-xs font-semibold text-slate-450 font-sans">No overrides recorded yet.</p>
                <p className="text-[10px] text-slate-500 max-w-[200px]" >
                  Parsed corrections or overrides will be saved here and automatically matched to physical hatches.
                </p>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-800/50 pt-3 mt-4 text-center">
            * Orignal changes are recorded and exported automatically inside the "Original Position Changes" workbook sheet.
          </div>
        </div>
      </div>
    </div>
  );
}
