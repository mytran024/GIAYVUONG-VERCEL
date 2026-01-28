
import React, { useState, useMemo } from 'react';
import { Container, WorkOrder, WorkOrderType, Vessel, BusinessType } from '../types';
import { ICONS } from '../constants';
import { displayDate } from '../services/dataService';
import * as XLSX from 'https://esm.sh/xlsx';

interface StatItem {
  id: string;
  originalWO: WorkOrder;
  name: string;
  cargoType: string;
  date: string;
  shift: string;
  method: string;
  value: number;
  typeLabel: 'CA HC' | 'CA CUỐI TUẦN' | 'CA LỄ';
  isMechanical: boolean;
  isOutsourced?: boolean;
  businessType: BusinessType;
}

const Statistics: React.FC<{ containers: Container[]; workOrders: WorkOrder[]; vessels: Vessel[]; businessType: BusinessType; onUpdateWorkOrders: (wo: WorkOrder[]) => void; }> = ({ containers, workOrders, vessels, businessType, onUpdateWorkOrders }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'SUMMARY'>('LIST');
  const [reportType, setReportType] = useState<'WORKER' | 'INTERNAL_MECH' | 'EXTERNAL_MECH'>('WORKER');
  const [vesselFilter, setVesselFilter] = useState('ALL'); 
  const [monthYearFilter, setMonthYearFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const monthYearOptions = useMemo(() => {
    const options = [{ value: 'ALL', label: 'TẤT CẢ CÁC THÁNG' }];
    const years = ['2026', '2025'];
    for (const y of years) {
      for (let m = 1; m <= 12; m++) {
        const mm = m.toString().padStart(2, '0');
        options.push({ value: `${mm}/${y}`, label: `Tháng ${mm}/${y}` });
      }
    }
    return options;
  }, []);

  const processedData = useMemo(() => {
    return workOrders.flatMap(wo => {
      if (reportType === 'WORKER' && wo.type !== WorkOrderType.LABOR) return [];
      if (reportType === 'INTERNAL_MECH' && (wo.type !== WorkOrderType.MECHANICAL || wo.isOutsourced)) return [];
      if (reportType === 'EXTERNAL_MECH' && (wo.type !== WorkOrderType.MECHANICAL || !wo.isOutsourced)) return [];
      if (vesselFilter !== 'ALL' && wo.vesselId !== vesselFilter) return [];
      
      const [d, m, y] = wo.date.split('/');
      const isoDate = `${y}-${m}-${d}`;
      if (monthYearFilter !== 'ALL' && `${m}/${y}` !== monthYearFilter) return [];
      if (viewMode === 'LIST' && dateRange.start && isoDate < dateRange.start) return [];
      if (viewMode === 'LIST' && dateRange.end && isoDate > dateRange.end) return [];

      return wo.workerNames.map((name, idx) => ({
        id: `${wo.id}-${idx}`,
        originalWO: wo,
        name: name.toUpperCase(),
        cargoType: wo.items[0]?.cargoType || 'Bột giấy nén tấm',
        date: wo.date,
        shift: wo.shift,
        method: wo.items[0]?.method || 'N/A',
        value: wo.type === WorkOrderType.LABOR ? 1 : (wo.items.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0) / wo.workerNames.length),
        typeLabel: wo.isHoliday ? 'CA LỄ' : (wo.isWeekend ? 'CA CUỐI TUẦN' : 'CA HC'),
        isMechanical: wo.type === WorkOrderType.MECHANICAL,
        isOutsourced: wo.isOutsourced,
        businessType: wo.businessType
      } as StatItem));
    });
  }, [workOrders, reportType, vesselFilter, monthYearFilter, dateRange, viewMode]);

  return (
    <div className="space-y-4 animate-fadeIn text-left h-full flex flex-col">
      <div className="flex items-center justify-between no-print">
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-sm scale-95 origin-left">
          <button onClick={() => setViewMode('LIST')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'LIST' ? 'bg-white shadow-lg text-blue-600 border' : 'text-slate-400'}`}>Danh sách chi tiết</button>
          <button onClick={() => setViewMode('SUMMARY')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'SUMMARY' ? 'bg-white shadow-lg text-blue-600 border' : 'text-slate-400'}`}>Tổng hợp sản lượng tàu</button>
        </div>
        <button className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl flex items-center gap-3">
          <ICONS.FileText className="w-4 h-4" /> XUẤT BÁO CÁO (EXCEL)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm items-end no-print shrink-0">
        <div className={`${viewMode === 'LIST' ? 'md:col-span-4' : 'md:col-span-7'} space-y-1.5`}>
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">CHỌN CHUYẾN TÀU (TÀU - CHỦ HÀNG - LỊCH TÀU)</label>
          <select value={vesselFilter} onChange={(e) => setVesselFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 font-black text-slate-700 text-[11px] outline-none shadow-sm">
            <option value="ALL">TẤT CẢ CÁC CHUYẾN TÀU</option>
            {vessels.map(v => <option key={v.id} value={v.id}>{v.vesselName} - {v.consignee} - ({displayDate(v.eta)} - {displayDate(v.etd)})</option>)}
          </select>
        </div>
        <div className={`${viewMode === 'LIST' ? 'md:col-span-3' : 'md:col-span-4'} space-y-1.5`}>
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">THÁNG / NĂM</label>
          <select value={monthYearFilter} onChange={(e) => setMonthYearFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 font-black text-slate-700 text-[11px] outline-none shadow-sm">
            {monthYearOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        {viewMode === 'LIST' && (
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">KHOẢNG THỜI GIAN (TỪ - ĐẾN)</label>
            <div className="flex gap-2">
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 font-black text-slate-700 text-[10px] outline-none" />
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 font-black text-slate-700 text-[10px] outline-none" />
            </div>
          </div>
        )}
        <div className="md:col-span-1"><button onClick={() => { setVesselFilter('ALL'); setMonthYearFilter('ALL'); setDateRange({start:'', end:''}); }} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[8px] tracking-widest active:scale-95 shadow-sm">RESET</button></div>
      </div>

      <div className="bg-white rounded-[2rem] border shadow-xl flex-1 flex flex-col overflow-hidden">
        {viewMode === 'LIST' ? (
           <div className="h-full flex flex-col">
              <div className="px-6 py-4 bg-slate-50 border-b flex gap-2">
                {['WORKER', 'INTERNAL_MECH', 'EXTERNAL_MECH'].map(t => (
                  <button key={t} onClick={() => setReportType(t as any)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase ${reportType === t ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                    {t === 'WORKER' ? 'Công nhân' : t === 'INTERNAL_MECH' ? 'Cơ giới DNL' : 'Cơ giới ngoài'}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50 z-10 border-b">
                    <tr className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
                      <th className="px-8 py-4 w-[30%]">{reportType === 'WORKER' ? 'TÊN NHÂN VIÊN' : 'TÊN CƠ GIỚI'}</th>
                      <th className="px-4 py-4 text-center">NGÀY / CA</th>
                      <th className="px-4 py-4 text-center">PHƯƠNG ÁN</th>
                      <th className="px-4 py-4 text-center">SẢN LƯỢNG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {processedData.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-4"><span className="font-black text-[12px] text-slate-800 uppercase block">{item.name}</span><span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.cargoType}</span></td>
                        <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-500">{item.date} | Ca {item.shift}</td>
                        <td className="px-4 py-4 text-center text-[10px] font-medium text-slate-400 italic">{item.method}</td>
                        <td className="px-4 py-4 text-center"><span className="font-black text-sm text-slate-900">{item.value.toFixed(1)} <span className="text-[8px] opacity-40 uppercase">{item.isMechanical ? 'TẤN' : 'CA'}</span></span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        ) : (
           <div className="p-10 flex flex-col items-center justify-center h-full opacity-20"><ICONS.FileText className="w-20 h-20 mb-4" /><p className="font-black uppercase tracking-[0.4em]">Chọn tàu để xem tổng hợp</p></div>
        )}
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  );
};
export default Statistics;
