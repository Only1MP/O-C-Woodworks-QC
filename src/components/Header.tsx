import React from 'react';
import { Calendar, ClipboardList, User, Layers } from 'lucide-react';

interface HeaderProps {
  date: string;
  setDate: (date: string) => void;
  sku: string;
  setSku: (sku: string) => void;
  shiftReportedBy: string;
  setShiftReportedBy: (name: string) => void;
}

const COMMON_SKUS = [
  'OC-BOX-AMORE',
  'OC-TRAY-RUSTIC',
  'OC-CRATE-GOURMET',
  'OC-BOARD-CHARCUTERIE',
  'OC- planter-SUCCULENT',
  'OC-FRAME-RECLAIMED'
];

export default function Header({
  date,
  setDate,
  sku,
  setSku,
  shiftReportedBy,
  setShiftReportedBy
}: HeaderProps) {
  return (
    <div className="bg-white border border-brand-beige-200 rounded-xl p-6 shadow-xs relative overflow-hidden">
      {/* Visual Woodgrain Accent Panel */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-beige-800 via-brand-beige-300 to-brand-forest-600"></div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">
          Daily QC Defect Log
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Date Selector */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="qc-date" className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-beige-800" />
            Date of Log
          </label>
          <div className="relative">
            <input
              id="qc-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-brand-beige-50 hover:bg-white text-gray-800 text-sm font-medium border border-brand-beige-200 rounded-lg px-3 py-2.5 outline-hidden focus:border-brand-forest-500 focus:ring-1 focus:ring-brand-forest-500/20 transition-all font-mono"
            />
          </div>
        </div>

        {/* SKU Selector */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="qc-sku" className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-brand-beige-800" />
            Product SKU
          </label>
          <div className="relative">
            <input
              id="qc-sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="e.g. OC-BOX-AMORE"
              className="w-full bg-brand-beige-50 hover:bg-white text-gray-800 text-sm font-medium border border-brand-beige-200 rounded-lg px-3 py-2.5 outline-hidden focus:border-brand-forest-500 focus:ring-1 focus:ring-brand-forest-500/20 transition-all font-mono placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Reported By */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="qc-reported-by" className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-brand-beige-800" />
            Reported By
          </label>
          <div className="relative">
            <input
              id="qc-reported-by"
              type="text"
              value={shiftReportedBy}
              onChange={(e) => setShiftReportedBy(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-brand-beige-50 hover:bg-white text-gray-800 text-sm font-medium border border-brand-beige-200 rounded-lg px-3 py-2.5 outline-hidden focus:border-brand-forest-500 focus:ring-1 focus:ring-brand-forest-500/20 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
