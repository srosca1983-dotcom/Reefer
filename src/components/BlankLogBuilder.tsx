/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Printer, ArrowLeft, FileText, Anchor, Layers, ListFilter } from 'lucide-react';
import { getGroupedPlugsForBaySection, getPlugsForBaySection } from '../utils/excelParser';

interface BlankLogBuilderProps {
  voyageNo: string;
  onBack: () => void;
}

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

interface PrintablePage {
  bay: string;
  elevation: 'ABOVE' | 'BELOW';
  hatch: number;
  title: string;
  totalPages: number;
  pageNumber: number;
  groupedTiers: {
    tier: string;
    plugs: string[];
  }[];
  isFirstPageOfBay: boolean;
  isLastPageOfBay: boolean;
}

export default function BlankLogBuilder({ voyageNo: initialVoyage, onBack }: BlankLogBuilderProps) {
  const [voyage, setVoyage] = useState(initialVoyage || '064W');
  const [layoutStyle, setLayoutStyle] = useState<'cards' | 'list'>('cards');
  const [rowCount, setRowCount] = useState(30);
  const [hatchFilter, setHatchFilter] = useState<string>('all');
  const [deckFilter, setDeckFilter] = useState<string>('all');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);

  const triggerPrint = () => {
    window.print();
  };

  const downloadPrintHtml = () => {
    const title = `Watch_Rounds_Worksheet_Voyage_${voyage}`;
    let bodyContent = '';

    if (layoutStyle === 'cards') {
      printablePages.forEach((page, bIdx) => {
        const isFirst = page.isFirstPageOfBay;
        const isLast = page.isLastPageOfBay;
        
        let TiersHtml = '';
        page.groupedTiers.forEach(({ tier, plugs }) => {
          let plugsHtml = '';
          plugs.forEach(pNo => {
            const rowNum = pNo.split('-')[1];
            plugsHtml += `
              <div class="plug-card">
                <div class="plug-header">🔌 Row ${rowNum}</div>
                <div class="plug-body">
                  <div>
                    <span class="label">CONTAINER ID</span>
                    <div class="border-line fill-id"></div>
                  </div>
                  <div>
                    <span class="label">SET / LOAD TEMP</span>
                    <div class="set-return-row">
                      <div class="dash-line"></div>
                      <span class="slash font-bold">/</span>
                      <div class="dash-line"></div>
                      <span class="unit-c font-bold">°C</span>
                    </div>
                  </div>
                  <div>
                    <span class="label">VENT FLAP</span>
                    <div class="vent-row font-bold">
                       <span class="checkbox"></span> <span class="chk-label">C</span>
                       <span class="checkbox" style="margin-left: 2px;"></span> <span class="chk-label">25</span>
                       <span class="checkbox" style="margin-left: 2px;"></span> <span class="chk-label">50</span>
                       <span class="checkbox" style="margin-left: 2px;"></span> <span class="chk-label">75</span>
                       <span class="checkbox" style="margin-left: 2px;"></span> <span class="chk-label">O</span>
                    </div>
                  </div>
                </div>
              </div>
            `;
          });

          TiersHtml += `
            <div class="tier-section">
              <div class="tier-header">
                <span>TIER LEVEL ${tier} (CASCADING HIGH TO LOW)</span>
                <span>PORT (LEFT) ──▶ STARBOARD (RIGHT)</span>
              </div>
              <div class="plug-flex">
                ${plugsHtml}
              </div>
            </div>
          `;
        });

        const watchkeeperBlock = isFirst ? `
          <div class="watchkeeper-flex font-mono">
            <div style="flex: 1.2; min-width: 0; border-right: 1px solid #000; padding-right: 8px;">
              <b class="text-xs">WATCHKEEPER:</b>
              <div class="watchkeeper-types">
                <span class="checkbox"></span> <span class="chk-label">ELEC</span>
                <span class="checkbox" style="margin-left: 4px;"></span> <span class="chk-label">DEU</span>
                <span class="checkbox" style="margin-left: 4px;"></span> <span class="chk-label">OTHER</span>
              </div>
            </div>
            <div style="flex: 1; min-width: 0; border-right: 1px solid #000; padding: 0 8px;">
              <b class="text-xs">TIME CALLED:</b>
              <div class="border-dash h-4"></div>
            </div>
            <div style="flex: 1; min-width: 0; padding-left: 8px;">
              <b class="text-xs">TIME KNOCKED OFF:</b>
              <div class="border-dash h-4"></div>
            </div>
          </div>
        ` : `
          <div class="page-continued border-blue">
            <span>CHECK-ON CALLOUT REGISTERED ON SHEET 1</span>
            <span>CONTINUED REEFER PLUG SLOTS</span>
          </div>
        `;

        const footerBlock = isLast ? `
          <div class="signature-section">
            <div style="flex: 1; min-width: 0;">
              <div>OOW (OFFICER ON WATCH) SIGN: _______________________</div>
              <div class="subtext">
                (Confirming all listed sockets are secure, plugged in and energized)
              </div>
            </div>
            <div style="flex: 1; min-width: 0; text-align: right;">
              <div>CHIEF MATE SIGN: ___________________________________</div>
              <div class="subtext">
                (Inspected safety logbook deck operability verification co-signature)
              </div>
            </div>
          </div>
        ` : `
          <div class="signature-section-continued">
            <span>Continued on next Page log...</span>
            <span>${page.title} (Page ${page.pageNumber} of ${page.totalPages})</span>
          </div>
        `;

        bodyContent += `
          <div class="page-break">
            <!-- Sheet Header -->
            <div class="header-table grid grid-header">
              <div>
                <h3 class="title">BLANK WATCH ROUNDS WORKSHEET <span class="subtitle">— VOYAGE ${voyage}</span></h3>
                <p class="meta">${page.title} • PHYSICAL PLUG SOCKET CARD FORMAT ${page.totalPages > 1 ? `• Sheet ${page.pageNumber} of ${page.totalPages}` : ''}</p>
              </div>
              <div class="text-right font-mono system-info text-xs">
                <div>DATE OF ROUNDS: <b>${dateStr}</b></div>
                <div>VESSEL SYSTEM: <b>C9 George II</b></div>
                <div>FACING STATUS: <b>READING LOOKING FORWARD</b></div>
              </div>
            </div>

            <!-- Directive Banner -->
            <div class="directive-banner font-mono">
              <span><b>DIRECTIVE:</b> Sign only after all reefers are confirmed physically plugged in and operating on this bay.</span>
              <span class="float-right bg-slate-300 font-bold" style="float: right;">Page ${bIdx + 1} of ${printablePages.length}</span>
            </div>

            ${watchkeeperBlock}

            <div class="tiers-container">
              ${TiersHtml}
            </div>

            ${footerBlock}
          </div>
        `;
      });
    } else {
      let listRows = '';
      for (let i = 1; i <= rowCount; i++) {
        listRows += `
          <tr class="h-8">
            <td class="border border-black p-1 text-center font-bold font-sans text-xs">${i}</td>
            <td class="border border-black p-1"></td>
            <td class="border border-black p-1"></td>
            <td class="border border-black p-1"></td>
            <td class="border border-black p-1"></td>
            <td class="border border-black p-1"></td>
            <td class="border border-black p-1"></td>
            <td class="border border-black p-1"></td>
            <td class="border border-black p-1"></td>
          </tr>
        `;
      }

      bodyContent = `
        <div class="page-break" style="padding: 15px;">
          <!-- Sheet Header -->
          <div class="header-table grid grid-header">
            <div>
              <h3 class="title">BLANK WATCH WATCHKEEPER ROUNDS <span class="subtitle">— VOYAGE ${voyage}</span></h3>
              <p class="meta">PHYSICAL HAND-WRITTEN PLUG OVERSIZE LOG LIST FORMAT</p>
            </div>
            <div class="text-right font-mono system-info text-xs">
              <div>DATE OF ROUNDS: <b>${dateStr}</b></div>
              <div>VESSEL SYSTEM: <b>C9 George II</b></div>
              <div>ROUND CHRONO: <b>________ LMT</b></div>
            </div>
          </div>

          <!-- Watchkeeper Check-off & Time Block -->
          <div class="grid grid-3 bg-gray-50 border-black p-2 mt-2 font-mono">
            <div>
              <b class="text-xs">WATCHKEEPER:</b>
              <div class="watchkeeper-types">
                <span class="checkbox"></span> <span class="chk-label">ELEC</span>
                <span class="checkbox" style="margin-left: 4px;"></span> <span class="chk-label">DEU</span>
                <span class="checkbox" style="margin-left: 4px;"></span> <span class="chk-label">OTHER</span>
              </div>
            </div>
            <div>
              <b class="text-xs">TIME CALLED:</b>
              <div class="border-dash h-4"></div>
            </div>
            <div>
              <b class="text-xs">TIME KNOCKED OFF:</b>
              <div class="border-dash h-4"></div>
            </div>
          </div>

          <table class="list-table font-mono w-full text-left font-black mt-4">
            <thead>
              <tr class="bg-gray-100 text-xs">
                <th class="border border-black p-1.5 w-10 text-center">NO</th>
                <th class="border border-black p-1.5 w-28 text-center">BAY-ROW-TIER</th>
                <th class="border border-black p-1.5 w-40">CONTAINER ID</th>
                <th class="border border-black p-1.5 w-24">TEMP (°C)</th>
                <th class="border border-black p-1.5 w-20">VENT FLAP</th>
                <th class="border border-black p-1.5 w-24">ALARM STATE</th>
                <th class="border border-black p-1.5 w-24">OOW SIGN</th>
                <th class="border border-black p-1.5">REMARKS / DEFECTS / DEU STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${listRows}
            </tbody>
          </table>

          <div class="signature-section grid grid-2 mt-6">
            <div>
              <div>OOW (OFFICER ON WATCH) SIGN: _______________________</div>
              <div class="subtext">
                (Confirming all listed sockets are secure, plugged in and energized)
              </div>
            </div>
            <div class="text-right">
              <div>CHIEF MATE SIGN: ___________________________________</div>
              <div class="subtext">
                (Inspected safety logbook deck operability verification co-signature)
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    /* Reset and Core Page Settings */
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    
    html, body {
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Print Document Pages */
    .page-break {
      page-break-after: always;
      break-after: page;
      margin-bottom: 20px;
      border: 1px solid #ddd;
      padding: 12px;
      background: #fff;
      box-sizing: border-box;
      max-width: 297mm;
      min-height: 190mm;
      margin-left: auto;
      margin-right: auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    @media print {
      .page-break {
        border: none;
        padding: 4px;
        margin: 0;
        max-width: none;
        min-height: 190mm;
        box-shadow: none;
      }
    }

    /* Layout Utility Grid */
    .grid {
      display: grid;
      gap: 10px;
    }
    .grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }
    .grid-2 {
      grid-template-columns: repeat(2, 1fr);
    }
    .grid-header {
      grid-template-columns: 1fr 200px;
    }
    
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .font-mono {
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
    }
    .font-sans {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .font-bold {
      font-weight: bold;
    }
    .font-black {
      font-weight: 900;
    }
    .text-xs {
      font-size: 10px;
    }
    .float-right {
      float: right;
    }

    /* Borders & Checkboxes */
    .border-black {
      border: 1px solid #000;
    }
    .border-dash {
      border-bottom: 1px dashed #000;
    }
    .p-2 {
      padding: 8px;
    }
    .mt-2 {
      margin-top: 8px;
    }
    .mt-4 {
      margin-top: 16px;
    }
    .mt-6 {
      margin-top: 24px;
    }
    .bg-gray-50 {
      background-color: #f9fafb;
    }
    .bg-gray-100 {
      background-color: #f3f4f6;
    }
    .h-4 {
      height: 16px;
    }
    .h-8 {
      height: 32px;
    }
    
    .watchkeeper-types {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      font-size: 10px;
    }

    .checkbox {
      border: 1.5px solid #000;
      border-radius: 2px;
      background: #fff;
      width: 11px;
      height: 11px;
      display: inline-block;
      vertical-align: middle;
    }

    .chk-label {
      font-size: 9px;
      font-weight: bold;
      vertical-align: middle;
    }

    .page-continued {
      padding: 4px 8px;
      border: 1.5px solid #3b82f6;
      background-color: #eff6ff;
      margin-top: 8px;
      font-size: 9px;
      font-family: monospace;
      border-radius: 4px;
      color: #1e3a8a;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
    }

    /* Header styling */
    .header-table {
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .title {
      font-size: 16px;
      margin: 0;
      font-weight: bold;
    }
    .subtitle {
      color: #666;
    }
    .meta {
      font-size: 10px;
      color: #444;
      margin: 4px 0 0 0;
      font-family: monospace;
      font-weight: bold;
      text-transform: uppercase;
    }
    .system-info {
      line-height: 1.3;
    }

    /* Directive */
    .directive-banner {
      border: 1.5px solid #000;
      background-color: #f9fafb;
      padding: 6px;
      font-size: 9.5px;
      margin-bottom: 12px;
    }

    /* Tiers & Grid */
    .tiers-container {
      margin-top: 12px;
    }
    .tier-section {
      border: 1px dashed #aaa;
      padding: 6px;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .tier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      font-weight: bold;
      background: #f3f4f6;
      padding: 3px 6px;
      margin-bottom: 6px;
      border: 1px solid #ccc;
      font-family: monospace;
      letter-spacing: 0.5px;
    }

    .plug-flex {
      display: flex;
      gap: 4px;
      width: 100%;
    }

    .watchkeeper-flex {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      background-color: #f9fafb;
      border: 2px solid #000;
      padding: 6px;
      margin-top: 8px;
      border-radius: 4px;
      font-size: 10px;
    }

    /* Plug Card Styles */
    .plug-card {
      border: 1.5px solid #000;
      padding: 3px;
      border-radius: 3px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fff;
      font-family: monospace;
      min-height: 115px;
      box-sizing: border-box;
      flex: 1 1 0px;
      min-width: 0;
    }
    .plug-header {
      background-color: #f3f4f6;
      padding: 1.5px;
      font-size: 8px;
      font-weight: 900;
      border-bottom: 1px solid #000;
      margin-bottom: 4px;
      line-height: 1;
    }
    .plug-body {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
    }
    .label {
      font-size: 5.5px;
      color: #444;
      display: block;
      line-height: 1;
      font-family: sans-serif;
      font-weight: bold;
    }
    .border-line {
      border-bottom: 1px solid #000;
      margin-top: 4px;
    }
    .fill-id {
      height: 22px;
    }
    .set-return-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      height: 14px;
      margin-top: 2px;
    }
    .dash-line {
      border-bottom: 1.5px dashed #aaa;
      height: 10px;
      width: 40%;
    }
    .slash {
      font-size: 9px;
      color: #666;
      margin: 0 1px;
    }
    .unit-c {
      font-size: 6px;
      font-family: sans-serif;
    }
    
    .vent-row {
      display: flex;
      align-items: center;
      margin-top: 4px;
    }

    /* Signature styling */
    .signature-section {
      border-top: 2px solid #000;
      padding-top: 8px;
      margin-top: 15px;
      font-size: 10px;
      font-family: monospace;
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }
    .subtext {
      font-size: 7.5px;
      color: #555;
      margin-top: 2px;
      font-style: italic;
      font-family: sans-serif;
    }
    .signature-section-continued {
      border-top: 1px dashed #ccc;
      padding-top: 8px;
      margin-top: 15px;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      font-family: monospace;
      font-weight: bold;
      color: #666;
      text-transform: uppercase;
    }

    /* List view table */
    .list-table {
      border-collapse: collapse;
      margin-top: 15px;
      width: 100%;
    }
    .list-table th, .list-table td {
      border: 1px solid #000;
    }
    .list-table th {
      padding: 6px;
    }

    /* Auto trigger print */
    @media print {
      body {
        margin: 0;
      }
    }
  </style>
</head>
<body>
  ${bodyContent}
  
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

  // Filter empty bays
  let filteredBays = requestedEmptyBays;
  if (hatchFilter !== 'all') {
    const targetH = parseInt(hatchFilter, 10);
    if (!isNaN(targetH)) {
      filteredBays = filteredBays.filter(b => b.hatch === targetH);
    }
  }
  if (deckFilter === 'above') {
    filteredBays = filteredBays.filter(b => b.elevation === 'ABOVE');
  } else if (deckFilter === 'below') {
    filteredBays = filteredBays.filter(b => b.elevation === 'BELOW');
  }

  // Segment each bay section into pages of maximum 2 tiers
  const printablePages: PrintablePage[] = [];
  
  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  filteredBays.forEach((baySec) => {
    const allTiers = getGroupedPlugsForBaySection(baySec.bay, baySec.elevation);
    const chunks = chunkArray(allTiers, 2);
    const totalPages = chunks.length;

    chunks.forEach((chunk, index) => {
      printablePages.push({
        bay: baySec.bay,
        elevation: baySec.elevation,
        hatch: baySec.hatch,
        title: baySec.title,
        totalPages: totalPages,
        pageNumber: index + 1,
        groupedTiers: chunk,
        isFirstPageOfBay: index === 0,
        isLastPageOfBay: index === totalPages - 1
      });
    });
  });

  return (
    <div className="space-y-6" id="blank-log-builder-component">
      {/* Interactive Controls (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print bg-[#1E293B]/40 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition flex items-center justify-center cursor-pointer"
            title="Go back to home screen"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Anchor className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Blank Mates Log Sheet Builder</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Prepare highly precise vessel-specific empty watch rounds sheets.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={downloadPrintHtml}
            className="bg-blue-600 hover:bg-blue-500 border border-blue-500/20 text-white rounded-lg text-xs font-bold px-4 py-2.5 transition-all shadow-md shadow-blue-500/10 flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap"
            title="Download highly compatible offline web document file for printing outside iframe"
          >
            <FileText className="h-4 w-4" />
            <span>Download Print File (HTML)</span>
          </button>
          <button
            onClick={triggerPrint}
            className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white rounded-lg text-xs font-bold px-4 py-2.5 transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="h-4 w-4" />
            <span>Print Sheet Booklet</span>
          </button>
        </div>
      </div>

      {/* Shipboard Print Notice Banner */}
      <div className="no-print bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs p-3.5 rounded-lg font-sans leading-relaxed flex items-start space-x-2.5">
        <span className="text-sm shrink-0">⚠️</span>
        <div>
          <span className="font-extrabold text-amber-300 uppercase tracking-wide block mb-0.5">Shipboard Print Warning & Instructions:</span>
          Since this application is rendered inside an interactive preview iframe, your web browser's direct <b className="text-white">Print</b> action may be sandboxed or restricted. 
          For a perfect print output, please <b className="text-[#a5f3fc]">Download Print File (HTML)</b> instead. Open that downloaded HTML file in your browser, then press <kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[10px] uppercase font-mono">Ctrl + P</kbd> (or <kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[10px] uppercase font-mono">Cmd + P</kbd>) to print perfectly to A4 or thermal log sheets!
        </div>
      </div>

      {/* Sheet Settings Sidebar & Preview Grid (Hidden on Print) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
        {/* Controls Column */}
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-5 h-fit">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono border-b border-slate-800 pb-2 flex items-center space-x-1">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>Sheet Parameters</span>
          </h4>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Layout Style Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLayoutStyle('cards')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center border ${
                  layoutStyle === 'cards'
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    : 'bg-[#0F172A] border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Layers className="h-4 w-4 mb-1" />
                <span>Spacious Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutStyle('list')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center border ${
                  layoutStyle === 'list'
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    : 'bg-[#0F172A] border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ListFilter className="h-4 w-4 mb-1" />
                <span>Classic List</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Voyage Reference</label>
            <input
              type="text"
              value={voyage}
              onChange={(e) => setVoyage(e.target.value.toUpperCase())}
              className="w-full bg-[#0F172A] border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Rounds Date</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-[#0F172A] border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50 font-mono"
            />
          </div>

          {layoutStyle === 'cards' ? (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Hatch Group Filter</label>
                <select
                  value={hatchFilter}
                  onChange={(e) => setHatchFilter(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 font-mono"
                >
                  <option value="all">All Hatches</option>
                  {Array.from({ length: 11 }).map((_, h) => (
                    <option key={h+1} value={String(h+1)}>Hatch {h+1}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Deck Section</label>
                <select
                  value={deckFilter}
                  onChange={(e) => setDeckFilter(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2"
                >
                  <option value="all">All sections</option>
                  <option value="above">Above Deck Only</option>
                  <option value="below">Below Hold Only</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1.5">Blank Rows count</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={rowCount}
                  onChange={(e) => setRowCount(Math.min(100, Math.max(5, parseInt(e.target.value) || 20)))}
                  className="w-24 bg-[#0F172A] border border-slate-800 text-slate-250 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50 font-mono text-center"
                />
                <span className="text-xs text-slate-500">grid lines</span>
              </div>
            </div>
          )}

          <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg space-y-2">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block font-mono">Watch Checklist:</span>
            <ul className="text-[10px] text-slate-400 space-y-1.5 list-disc list-inside leading-normal font-sans">
              <li>Record Container number inside designated areas.</li>
              <li>Hand-write required manifest Set temperature.</li>
              <li>Hand-write sensor operating Load temperature.</li>
              <li>Mark Vent position checking active flap rate %.</li>
              <li>OOW & Chief Mate co-sign only.</li>
            </ul>
          </div>
        </div>

        {/* Live Sheet Design Preview Sheet */}
        <div className="lg:col-span-3 border border-slate-800 rounded-xl overflow-hidden shadow-lg bg-[#1E293B]/20">
          <div className="bg-[#1E293B]/60 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-300 flex items-center space-x-1.5">
              <FileText className="h-4 w-4 text-emerald-400" />
              <span>Rounds sheet high-contrast outline preview</span>
            </span>
            <span className="text-xs bg-slate-900 border border-slate-800 text-emerald-400 font-bold px-2 py-0.5 rounded">
              {layoutStyle === 'cards' ? `Ready - ${printablePages.length} Booklet Pages` : `Ready - ${rowCount} Rows list`}
            </span>
          </div>

          <div className="p-6 bg-slate-700 max-h-[680px] overflow-y-auto font-sans">
            {layoutStyle === 'cards' ? (
              <div className="space-y-8 max-w-4xl mx-auto">
                {printablePages.map((page, bIdx) => {
                  return (
                    <div key={`prev-sheet-${bIdx}`} className="bg-white text-slate-900 p-6 rounded-lg shadow-md border border-slate-300 font-sans">
                      {/* Page Header */}
                      <div className="flex justify-between items-start border-b-2 border-slate-950 pb-3 mb-4">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-950 tracking-tight leading-none flex items-center space-x-1 font-sans">
                            <span>GEORGE II ACTIVE REEFER WATCH LOG</span>
                            <span className="text-slate-500 font-bold font-mono">— VOYAGE {voyage}</span>
                          </h4>
                          <p className="text-[9px] text-slate-500 font-mono mt-1 font-bold uppercase tracking-wider">
                            {page.title} • PHYSICAL PLUG SOCKET CARD FORMAT {page.totalPages > 1 ? `• Sheet ${page.pageNumber} of ${page.totalPages}` : ''}
                          </p>
                        </div>
                        <div className="text-right font-mono text-[8.5px] text-slate-600 leading-none space-y-0.5">
                          <div>DATE OF ROUNDS: <b>{dateStr}</b></div>
                          <div>VESSEL SYSTEM: <b>C9 George II</b></div>
                          <div>FACING STATUS: <b>READING LOOKING FORWARD</b></div>
                        </div>
                      </div>

                      {/* Directive banner */}
                      <div className="p-2 border border-slate-350 bg-slate-50 text-[8px] text-slate-600 mb-4 rounded leading-tight flex justify-between pr-2 font-mono">
                        <span><b>DIRECTIVE:</b> Sign only after all reefers are confirmed physically plugged in and operating on this bay.</span>
                        <span className="font-bold text-slate-400 font-mono">Page {bIdx+1} of {printablePages.length}</span>
                      </div>

                      {/* Watchkeeper Check-off & Time Block - Render once per Bay Section */}
                      {page.isFirstPageOfBay ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border border-slate-400 p-2 bg-slate-50 mb-4 text-[9px] font-mono rounded">
                          <div className="flex items-center space-x-2 border-b md:border-b-0 md:border-r border-slate-300 pb-1.5 md:pb-0 md:pr-2">
                            <span className="font-bold text-slate-950 text-[8px] uppercase tracking-wider">WATCHKEEPER:</span>
                            <div className="flex items-center space-x-3 text-[8px]">
                              <label className="flex items-center space-x-1 cursor-pointer font-bold">
                                <span className="border border-slate-950 rounded bg-white w-3 h-3 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                                <span>ELECTRICIAN</span>
                              </label>
                              <label className="flex items-center space-x-1 cursor-pointer font-bold">
                                <span className="border border-slate-950 rounded bg-white w-3 h-3 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                                <span>DEU</span>
                              </label>
                              <label className="flex items-center space-x-1 cursor-pointer font-bold">
                                <span className="border border-slate-950 rounded bg-white w-3 h-3 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                                <span>OTHER</span>
                              </label>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5 border-b md:border-b-0 md:border-r border-slate-300 pb-1.5 md:pb-0 md:px-2">
                            <span className="font-bold text-slate-950 text-[8px] uppercase shrink-0">TIME CALLED:</span>
                            <div className="border-b border-dashed border-slate-600 flex-grow h-3.5"></div>
                          </div>
                          <div className="flex items-center space-x-1.5 md:pl-2">
                            <span className="font-bold text-slate-950 text-[8px] uppercase shrink-0">TIME KNOCKED OFF:</span>
                            <div className="border-b border-dashed border-slate-600 flex-grow h-3.5"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-1 px-2 border border-blue-100 bg-blue-50/50 mb-4 text-[8px] font-mono rounded text-slate-500 font-medium tracking-wide flex justify-between">
                          <span>CHECK-ON CALLOUT REGISTERED ON SHEET 1</span>
                          <span>CONTINUED REEFER PLUG SLOTS</span>
                        </div>
                      )}

                      {/* Tiered cascading sections (highest tier first downwards) */}
                      <div className="space-y-3">
                        {page.groupedTiers.map(({ tier, plugs: tierPlugs }) => (
                          <div key={tier} className="border border-dashed border-slate-300 p-1.5 rounded">
                            <div className="flex justify-between items-center text-[8px] font-bold text-slate-705 bg-slate-50 px-2 py-0.5 mb-1.5 border border-slate-200 uppercase tracking-widest font-mono">
                              <span>TIER LEVEL {tier} (CASCADING HIGH TO LOW)</span>
                              <span>PORT (LEFT) ──▶ STARBOARD (RIGHT)</span>
                            </div>
                            
                            <div className="flex flex-row gap-1 w-full">
                              {tierPlugs.map((pNo) => {
                                const rowNum = pNo.split('-')[1];
                                return (
                                  <div key={pNo} className="border border-slate-950 p-1 rounded flex flex-col justify-between bg-white text-slate-900 font-mono flex-1 min-w-0" style={{ minHeight: '115px' }}>
                                    <div className="flex justify-between items-center bg-slate-150 px-0.5 py-0.5 text-[7px] font-black border-b border-slate-900 mb-1 leading-none text-slate-900">
                                      <span>🔌 Row {rowNum}</span>
                                    </div>
                                    <div className="flex flex-col justify-between h-full space-y-1 text-[6px] leading-tight">
                                      <div>
                                        <span className="text-[5px] text-slate-500 block font-sans font-bold leading-none">CONTAINER ID</span>
                                        <div className="border-b border-slate-400 mt-0.5 h-4.5"></div>
                                      </div>
                                      <div>
                                        <span className="text-[4.5px] text-slate-400 block font-sans font-bold leading-none">SET / LOAD TEMP</span>
                                        <div className="flex justify-between items-end h-2.5 mt-0.5">
                                          <div className="border-b border-dashed border-slate-350 w-5/12 h-2"></div>
                                          <span className="text-[4.5px] text-slate-400">/</span>
                                          <div className="border-b border-dashed border-slate-350 w-5/12 h-2"></div>
                                          <span className="text-[4.5px] font-sans font-bold">°C</span>
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-[4.5px] text-slate-400 block font-sans font-bold leading-none">VENT FLAP</span>
                                        <div className="flex items-center space-x-0.5 text-[4.5px] mt-0.5 font-sans font-bold">
                                          <span className="border border-slate-400 rounded-sm w-1.5 h-1.5 bg-white block shrink-0"></span>
                                          <span>C</span>
                                          <span className="border border-slate-400 rounded-sm w-1.5 h-1.5 bg-white block shrink-0 ml-0.5"></span>
                                          <span>O</span>
                                          <div className="border-b border-dashed border-slate-350 w-1.5 h-1.5 ml-0.5"></div>
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

                      {/* Signatures: OOW and Chief Mate only - Render once at the final sheet of the bay */}
                      {page.isLastPageOfBay ? (
                        <div className="flex flex-row justify-between gap-8 border-t border-slate-950 pt-2.5 mt-3 text-[9px] text-slate-800 font-mono w-full">
                          <div className="flex-1 min-w-0">
                            <div>OOW (OFFICER ON WATCH) SIGN: ____________________________________</div>
                            <div className="text-[7.5px] text-slate-500 italic font-sans mt-0.5">
                              (Confirming all listed sockets are secure, plugged in and energized)
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <div>CHIEF MATE SIGN: __________________________________________________</div>
                            <div className="text-[7.5px] text-slate-500 italic font-sans mt-0.5">
                              (Inspected and acknowledged for deck records safety logbook compliance)
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-dashed border-slate-300 pt-2 mt-3 flex justify-between items-center text-[7.5px] text-slate-400 uppercase font-mono font-bold">
                          <span>Continued on next Page log...</span>
                          <span>{page.title} (Page {page.pageNumber} of {page.totalPages})</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white text-slate-900 p-6 rounded-lg shadow-md border border-slate-300 font-sans max-w-4xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900 leading-tight">
                      GEORGE II ACTIVE REEFER WATCH LOG — VOYAGE {voyage}
                    </h4>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase tracking-wide">
                      REEFER PHYSICAL WATCH ROUNDS LOG SHEET • DECK OFFICERS COPIES
                    </p>
                  </div>
                  <div className="text-right font-mono text-[9px] text-slate-600 space-y-0.5">
                    <div>Date of Rounds: {dateStr || '__________________'}</div>
                    <div>Vessel system: GII C9 System</div>
                  </div>
                </div>

                {/* Watchkeeper Check-off & Time Block for List mode */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border border-slate-400 p-2 bg-slate-50 text-[9px] font-mono rounded">
                  <div className="flex items-center space-x-2 border-b md:border-b-0 md:border-r border-slate-300 pb-1.5 md:pb-0 md:pr-2">
                    <span className="font-bold text-slate-950 text-[8px] uppercase tracking-wider">WATCHKEEPER:</span>
                    <div className="flex items-center space-x-3 text-[8px]">
                      <label className="flex items-center space-x-1 cursor-pointer font-bold">
                        <span className="border border-slate-950 rounded bg-white w-3 h-3 inline-block shrink-0 flex items-center justify-center"></span>
                        <span>ELECTRICIAN</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer font-bold">
                        <span className="border border-slate-950 rounded bg-white w-3 h-3 inline-block shrink-0 flex items-center justify-center"></span>
                        <span>DEU</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer font-bold">
                        <span className="border border-slate-950 rounded bg-white w-3 h-3 inline-block shrink-0 flex items-center justify-center"></span>
                        <span>OTHER</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 border-b md:border-b-0 md:border-r border-slate-300 pb-1.5 md:pb-0 md:px-2">
                    <span className="font-bold text-slate-950 text-[8px] uppercase shrink-0">TIME CALLED:</span>
                    <div className="border-b border-dashed border-slate-600 flex-grow h-3.5"></div>
                  </div>
                  <div className="flex items-center space-x-1.5 md:pl-2">
                    <span className="font-bold text-slate-950 text-[8px] uppercase shrink-0">TIME KNOCKED OFF:</span>
                    <div className="border-b border-dashed border-slate-600 flex-grow h-3.5"></div>
                  </div>
                </div>

                {/* Classic List Tab */}
                <table className="w-full border-collapse text-left text-[10px] font-mono border border-slate-900">
                  <thead className="bg-[#f8fafc] text-slate-900 font-extrabold uppercase text-[8px] tracking-wider border-b border-slate-900">
                    <tr className="text-center">
                      <th className="px-2 py-1 border-r border-slate-900 w-10">Row</th>
                      <th className="px-2 py-1 border-r border-slate-900 w-24">Cell Bay</th>
                      <th className="px-2 py-1 border-r border-slate-900 font-bold uppercase w-36">Container Number</th>
                      <th className="px-2 py-1 border-r border-slate-900 w-24 font-bold">Set Temp (°C)</th>
                      <th className="px-2 py-1 border-r border-slate-900 w-28 bg-emerald-50 text-emerald-950 font-bold">Actual Temp (°C)</th>
                      <th className="px-2 py-1 border-r border-slate-900 w-24 bg-emerald-50 text-emerald-950 font-bold">Vent C/O</th>
                      <th className="px-2 py-1 border-r border-slate-900 w-20 bg-emerald-50 text-emerald-950 font-bold">Vent (%)</th>
                      <th className="px-2 py-1 text-slate-900 font-extrabold">Remarks / Active Warning Alarms</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {Array.from({ length: rowCount }).map((_, idx) => (
                      <tr key={idx} className="h-7 text-center">
                        <td className="px-2 py-0.5 border-r border-slate-300 text-slate-400 font-bold text-[9px] bg-slate-50/50">{idx + 1}</td>
                        <td className="px-2 py-0.5 border-r border-slate-300"></td>
                        <td className="px-2 py-0.5 border-r border-slate-300 font-bold text-slate-700"></td>
                        <td className="px-2 py-0.5 border-r border-slate-300"></td>
                        <td className="px-2 py-0.5 border-r border-slate-300 bg-emerald-50/10"></td>
                        <td className="px-2 py-0.5 border-r border-slate-300 bg-emerald-50/10"></td>
                        <td className="px-2 py-0.5 border-r border-slate-300 bg-emerald-50/10"></td>
                        <td className="px-2 py-0.5 text-left font-sans"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footers */}
                <div className="grid grid-cols-2 gap-8 border-t border-slate-900 pt-4 text-[9px] text-slate-800 font-mono">
                  <div>
                    <div>OOW (OFFICER ON WATCH) SIGN: ____________________________________</div>
                    <div className="text-[7px] text-slate-500 italic mt-0.5 font-sans">(Signature only after all reefers are confirmed plugged in and operating)</div>
                  </div>
                  <div className="text-right">
                    <div>CHIEF MATE SIGN: __________________________________________________</div>
                    <div className="text-[7px] text-slate-500 italic mt-0.5 font-sans">(Archival logging clearance co-signature)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PHYSICAL PAPER WRITING STYLES ON PRINT TRIGGER */}
      <div className="print-document hidden bg-white text-black font-sans w-full text-[10pt] leading-normal">
        {layoutStyle === 'cards' ? (
          <div>
            {printablePages.map((page, bIdx) => {
              return (
                <div 
                  key={`print-sheet-cards-${bIdx}`} 
                  className="page-break bg-white text-black p-4 flex flex-col justify-between"
                  style={{ breakAfter: 'page', pageBreakAfter: 'always', minHeight: '190mm', boxSizing: 'border-box' }}
                >
                  <div className="w-full">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
                      <div>
                        <h2 className="text-sm font-black uppercase text-black tracking-tight leading-none flex items-center space-x-1 font-sans">
                          <span>GEORGE II ACTIVE REEFER WATCH LOG</span>
                          <span className="font-mono">— VOYAGE {voyage}</span>
                        </h2>
                        <b className="text-[9px] text-black font-mono mt-1 font-extrabold uppercase tracking-wider block">
                          {page.title} • PHYSICAL PLUG SOCKET CARD FORMAT {page.totalPages > 1 ? `• Sheet ${page.pageNumber} of ${page.totalPages}` : ''}
                        </b>
                      </div>
                      <div className="text-right font-mono text-[8px] text-black space-y-0.5 leading-none">
                        <div>DATE OF ROUNDS: <b className="font-black text-black">{dateStr}</b></div>
                        <div>VESSEL SYSTEM: <b>C9 George II</b></div>
                        <div>FACING STATUS: <b>READING LOOKING FORWARD</b></div>
                      </div>
                    </div>

                    {/* Directive */}
                    <div className="p-1.5 border border-black bg-slate-50 text-[8px] text-black mb-2 leading-tight flex justify-between pr-2 font-mono">
                      <span><b>STOWAGE MONITORING DIRECTIVE:</b> Verify physical socket state matches above hand-written rounds list. Record readings on active reefers.</span>
                      <span className="font-mono text-black font-bold text-[8px]">Page {bIdx+1} of {printablePages.length}</span>
                    </div>

                    {/* Watchkeeper Check-off & Time Block - Render once per Bay Section */}
                    {page.isFirstPageOfBay ? (
                      <div className="flex flex-row justify-between gap-3 border-2 border-black p-1.5 bg-slate-100 mb-3 text-[9px] font-mono rounded text-black w-full">
                        <div className="flex-1 min-w-0 flex items-center space-x-2 border-r border-black pr-2">
                          <span className="font-black text-[8px] uppercase tracking-wider">WATCHKEEPER:</span>
                          <div className="flex items-center space-x-2 text-[8px]">
                            <label className="flex items-center space-x-1 cursor-pointer font-black">
                              <span className="border-2 border-black rounded bg-white w-3 h-3 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                              <span>ELEC</span>
                            </label>
                            <label className="flex items-center space-x-1 cursor-pointer font-black">
                              <span className="border-2 border-black rounded bg-white w-3 h-3 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                              <span>DEU</span>
                            </label>
                            <label className="flex items-center space-x-1 cursor-pointer font-black">
                              <span className="border-2 border-black rounded bg-white w-3 h-3 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                              <span>OTHER</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex items-center space-x-1.5 border-r border-black px-2">
                          <span className="font-black text-[8px] uppercase shrink-0">TIME CALLED:</span>
                          <div className="border-b-2 border-dashed border-slate-700 flex-grow h-4"></div>
                        </div>
                        <div className="flex-1 min-w-0 flex items-center space-x-1.5 pl-2">
                          <span className="font-black text-[8px] uppercase shrink-0">TIME KNOCKED OFF:</span>
                          <div className="border-b-2 border-dashed border-slate-700 flex-grow h-4"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-1 px-2 border-2 border-blue-500 bg-blue-50 mb-3 text-[8px] font-mono rounded text-blue-900 font-bold tracking-wide flex justify-between">
                        <span>CHECK-ON CALLOUT REGISTERED ON SHEET 1</span>
                        <span>CONTINUED REEFER PLUG SLOTS</span>
                      </div>
                    )}

                    {/* Tiered cascading sections (highest tier first downwards, rows left-to-right) */}
                    <div className="space-y-3">
                      {page.groupedTiers.map(({ tier, plugs: tierPlugs }) => (
                        <div key={tier} className="border border-dashed border-black p-1.5 rounded">
                          <div className="flex justify-between items-center text-[8px] font-black text-black bg-slate-100 px-2 py-0.5 mb-1.5 border border-black uppercase tracking-widest font-mono">
                            <span>TIER LEVEL {tier} (CASCADING HIGH TO LOW)</span>
                            <span>PORT (LEFT) ──▶ STARBOARD (RIGHT)</span>
                          </div>
                          
                          <div className="flex flex-row gap-1 w-full">
                            {tierPlugs.map((pNo) => {
                              const rowNum = pNo.split('-')[1];
                              return (
                                <div key={pNo} className="border border-black p-1 rounded flex flex-col justify-between bg-white text-black font-mono flex-1 min-w-0" style={{ minHeight: '115px' }}>
                                  <div className="flex justify-between items-center bg-slate-100 px-0.5 py-0.5 text-[7px] font-black border-b border-black mb-1 leading-none text-black">
                                    <span>🔌 Row {rowNum}</span>
                                  </div>
                                  <div className="flex flex-col justify-between h-full space-y-1 text-[6px] leading-tight text-black">
                                    <div>
                                      <span className="text-[5px] text-black block font-sans font-black leading-none">CONTAINER ID</span>
                                      <div className="border-b border-black mt-0.5 h-4.5"></div>
                                    </div>
                                    <div>
                                      <span className="text-[4.5px] text-black block font-sans font-black leading-none">SET / LOAD TEMP</span>
                                      <div className="flex justify-between items-end h-2.5 mt-0.5">
                                        <div className="border-b border-dashed border-slate-700 w-5/12 h-2"></div>
                                        <span className="text-[4.5px] text-black font-bold">/</span>
                                        <div className="border-b border-dashed border-slate-700 w-5/12 h-2"></div>
                                        <span className="text-[4.5px] font-sans font-black">°C</span>
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-[4.5px] text-black block font-sans font-black leading-none">VENT FLAP</span>
                                      <div className="flex items-center space-x-0.5 text-[4.5px] mt-0.5 font-sans font-black">
                                        <span className="border border-black rounded-sm w-1.5 h-1.5 bg-white block shrink-0"></span>
                                        <span>C</span>
                                        <span className="border border-black rounded-sm w-1.5 h-1.5 bg-white block shrink-0 ml-0.5"></span>
                                        <span>O</span>
                                        <div className="border-b border-dashed border-slate-700 w-1.5 h-1.5 ml-0.5"></div>
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
                  </div>

                  {/* Footer - No duty engineer! */}
                  {page.isLastPageOfBay ? (
                    <div className="flex flex-row justify-between gap-8 border-t-2 border-black pt-3 mt-4 text-[9px] text-black font-mono w-full">
                      <div className="flex-grow flex-shrink-0 w-1/2">
                        <div>OOW (OFFICER ON WATCH) SIGN: ____________________________________</div>
                        <div className="text-[7.5px] text-slate-500 mt-1 italic font-sans leading-none">
                          (Verify physical socket state matches above hand-written rounds list. Sign ONLY after all reefers are plugged in and operating)
                        </div>
                      </div>
                      <div className="flex-grow flex-shrink-0 w-1/2 text-right flex flex-col justify-between items-end">
                        <div>CHIEF MATE SIGN: __________________________________________________</div>
                        <div className="text-[7.5px] text-slate-500 mt-1 italic font-sans leading-none">
                          (Inspected safety logbook deck operability verification co-signature)
                        </div>
                        <div className="mt-2 text-slate-500 uppercase tracking-widest text-[7px] font-mono leading-none">
                          George II Deck Operations Archive Module (Sheet Page {bIdx+1} of {printablePages.length})
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t-2 border-dashed border-slate-350 pt-2 mt-4 flex justify-between items-center text-[8px] text-slate-500 uppercase font-mono font-bold w-full">
                      <span>Continued on next Page log...</span>
                      <span>George II Deck Operations (Page {page.pageNumber} of {page.totalPages})</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div>
                <h2 className="text-lg font-black uppercase font-sans text-black tracking-tight leading-none">
                  GEORGE II ACTIVE REEFER MONITORING LOG
                </h2>
                <p className="text-[10px] font-mono uppercase text-black font-extrabold tracking-wider mt-1">
                  REEFER DAILY WATCH rounds log • DECK OFFICERS HAND-WRITTEN ARCHIVE
                </p>
              </div>
              <div className="text-right font-mono text-xs text-black border-2 border-black px-3 py-1 font-bold uppercase rounded">
                VOYAGE: {voyage}
              </div>
            </div>

            <div className="p-3 border border-black text-[10px] font-bold text-black bg-slate-50">
              INSTRUCTIONS FOR WATCHSTANDERS: Log physical Container Numbers, required set temperatures, actual load temperatures, Vent position state (Closed or Open), and ventilation rate percentage. Check the Watchkeeper type, record Called/Knocked Off times, and sign below.
            </div>

            {/* Watchkeeper Check-off & Time Block for print list */}
            <div className="grid grid-cols-3 gap-2 border-2 border-black p-2 bg-slate-100 text-[10px] font-mono rounded text-black leading-none my-4">
              <div className="flex items-center space-x-2 border-r border-black pr-2">
                <span className="font-black text-[9px] uppercase tracking-wider">WATCHKEEPER:</span>
                <div className="flex items-center space-x-2 text-[8.5px]">
                  <label className="flex items-center space-x-1 cursor-pointer font-black">
                    <span className="border-2 border-black rounded bg-white w-3.5 h-3.5 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                    <span>ELEC</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer font-black">
                    <span className="border-2 border-black rounded bg-white w-3.5 h-3.5 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                    <span>DEU</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer font-black">
                    <span className="border-2 border-black rounded bg-white w-3.5 h-3.5 inline-block shrink-0 flex items-center justify-center font-bold"></span>
                    <span>OTHER</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 border-r border-black px-2">
                <span className="font-black text-[9px] uppercase shrink-0">TIME CALLED:</span>
                <div className="border-b-2 border-dashed border-slate-700 flex-grow h-4"></div>
              </div>
              <div className="flex items-center space-x-1.5 pl-2">
                <span className="font-black text-[9px] uppercase shrink-0">TIME KNOCKED OFF:</span>
                <div className="border-b-2 border-dashed border-slate-700 flex-grow h-4"></div>
              </div>
            </div>

            <table className="w-full border-collapse border border-black text-[11px] font-mono leading-none mt-4">
              <thead>
                <tr className="bg-slate-100 text-black border-b-2 border-black uppercase font-black text-center text-[10px] h-10">
                  <th className="px-2 py-1 border-r border-black w-10">Row</th>
                  <th className="px-2 py-1 border-r border-black w-24">Cell Bay</th>
                  <th className="px-2 py-1 border-r border-black w-36">Container Number</th>
                  <th className="px-2 py-1 border-r border-black w-24">Set Temp (°C)</th>
                  <th className="px-2 py-1 border-r border-black w-28 bg-slate-50 font-sans">Actual Temp (°C)</th>
                  <th className="px-2 py-1 border-r border-black w-28 bg-slate-50 font-sans">Vent (C / O)</th>
                  <th className="px-2 py-1 border-r border-black w-20 bg-slate-50 font-sans">Vent %</th>
                  <th className="px-2 py-1 font-sans">Remarks / Active Warning Alarms</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rowCount }).map((_, idx) => (
                  <tr key={idx} className="h-10 border-b border-black">
                    <td className="px-2 py-1 border-r border-black text-center text-black font-bold font-mono bg-slate-50">{idx + 1}</td>
                    <td className="px-2 py-1 border-r border-black bg-white"></td>
                    <td className="px-2 py-1 border-r border-black bg-white"></td>
                    <td className="px-2 py-1 border-r border-black bg-white"></td>
                    <td className="px-2 py-1 border-r border-black bg-white"></td>
                    <td className="px-2 py-1 border-r border-black bg-white"></td>
                    <td className="px-2 py-1 border-r border-black bg-white"></td>
                    <td className="px-2 py-1 bg-white"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer co-signing for generic lists */}
            <div className="grid grid-cols-2 gap-8 border-t-2 border-black pt-6 mt-8 font-mono text-[11px] text-black">
              <div>
                <div>OOW (OFFICER ON WATCH) SIGN: ____________________________________</div>
                <div className="text-[9px] text-slate-500 mt-1 italic font-sans leading-none">(Sign ONLY after all reefers are confirmed plugged in and operating)</div>
              </div>
              <div className="text-right">
                <div>CHIEF MATE SIGN: __________________________________________________</div>
                <div className="text-[9px] text-slate-500 mt-1 italic font-sans leading-none">(Archival logging clearance co-signature)</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
