
import React, { useState, useMemo } from 'react';
import { Container, ContainerStatus, Vessel } from '../types';
import { ICONS } from '../constants';
import { displayDate } from '../services/dataService';

interface TallyReportGroup {
  id: string;
  vesselId: string;
  vesselName: string;
  vesselCode: string;
  shift: string;
  day: string;
  month: string;
  year: string;
  dateStr: string; 
  reportNo: string;
  consignee: string;
  commodity: string;
  containers: Container[];
  type: 'IMPORT' | 'EXPORT';
}

const TallyReview: React.FC<{ containers: Container[], vessels: Vessel[], onUpdateContainers: (c: Container[]) => void }> = ({ containers, vessels }) => {
  const [activeFilter, setActiveFilter] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [selectedVesselId, setSelectedVesselId] = useState<string>('ALL');
  const [monthYearFilter, setMonthYearFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [currentWOPDF, setCurrentWOPDF] = useState<TallyReportGroup | null>(null);

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

  const reportGroups = useMemo(() => {
    const groups: TallyReportGroup[] = [];
    let filteredContainers = containers.filter(c => {
      if (activeFilter === 'EXPORT') return c.unitType === 'VEHICLE';
      return c.unitType === 'CONTAINER' && c.status === ContainerStatus.COMPLETED;
    });

    if (selectedVesselId !== 'ALL') filteredContainers = filteredContainers.filter(c => c.vesselId === selectedVesselId);

    if (monthYearFilter !== 'ALL') {
      const [m, y] = monthYearFilter.split('/');
      filteredContainers = filteredContainers.filter(c => {
        const d = new Date(c.updatedAt);
        return (d.getMonth() + 1).toString().padStart(2, '0') === m && d.getFullYear().toString() === y;
      });
    }

    if (startDate || endDate) {
      filteredContainers = filteredContainers.filter(c => {
        const dateStr = c.updatedAt.split('T')[0];
        if (startDate && dateStr < startDate) return false;
        if (endDate && dateStr > endDate) return false;
        return true;
      });
    }

    const targetVessels = selectedVesselId === 'ALL' ? vessels : vessels.filter(v => v.id === selectedVesselId);

    targetVessels.forEach(vessel => {
      const vesselData = filteredContainers.filter(c => c.vesselId === vessel.id);
      if (vesselData.length === 0) return;
      const vesselCode = vessel.vesselName.split(' ').pop() || vessel.vesselName;
      
      for (let i = 0; i < vesselData.length; i += 15) {
        const chunk = vesselData.slice(i, i + 15);
        const reportIndex = Math.floor(i / 15) + 34; 
        const dateObj = new Date(chunk[0].updatedAt);
        groups.push({
          id: `REP-${activeFilter}-${vessel.id}-${reportIndex}`,
          vesselId: vessel.id,
          vesselName: vessel.vesselName,
          vesselCode: vesselCode,
          shift: "2", 
          day: String(dateObj.getDate()).padStart(2, '0'),
          month: String(dateObj.getMonth() + 1).padStart(2, '0'),
          year: String(dateObj.getFullYear()),
          dateStr: dateObj.toISOString().split('T')[0],
          reportNo: `${reportIndex}`,
          consignee: vessel.consignee,
          commodity: vessel.commodity,
          containers: chunk,
          type: activeFilter
        });
      }
    });
    return groups.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [containers, vessels, activeFilter, selectedVesselId, monthYearFilter, startDate, endDate]);

  const handleExportPDF = (group: TallyReportGroup) => {
    setCurrentWOPDF(group);
    setIsExportingPDF(true);
    setTimeout(() => {
      const element = document.getElementById('tally-pdf-template');
      if (element) {
        const opt = {
          margin: 0,
          filename: `TallyReport_${group.vesselCode}_No${group.reportNo}.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: { scale: 3, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        // @ts-ignore
        html2pdf().set(opt).from(element).save().then(() => {
          setIsExportingPDF(false);
          setCurrentWOPDF(null);
        });
      }
    }, 600);
  };

  return (
    <div className="space-y-4 animate-fadeIn text-left p-2 h-full flex flex-col relative">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
             <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">LỊCH SỬ PHIẾU TALLY</h3>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => { setActiveFilter('IMPORT'); setSelectedVesselId('ALL'); }} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all tracking-wider ${activeFilter === 'IMPORT' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>Tally Nhập</button>
            <button onClick={() => { setActiveFilter('EXPORT'); setSelectedVesselId('ALL'); }} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all tracking-wider ${activeFilter === 'EXPORT' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-400'}`}>Tally Xuất</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-2 border-t border-slate-50">
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">CHỌN CHUYẾN TÀU (TÀU - CHỦ HÀNG - LỊCH TÀU)</label>
            <select value={selectedVesselId} onChange={(e) => setSelectedVesselId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 font-black text-slate-700 text-[11px] outline-none shadow-sm">
              <option value="ALL">TẤT CẢ CÁC CHUYẾN TÀU</option>
              {vessels.map(v => (
                <option key={v.id} value={v.id}>{v.vesselName} - {v.consignee} - ({displayDate(v.eta)} - {displayDate(v.etd)})</option>
              ))}
            </select>
          </div>
          
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">THÁNG / NĂM</label>
            <select value={monthYearFilter} onChange={(e) => setMonthYearFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 font-black text-slate-700 text-[11px] outline-none">
              {monthYearOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">KHOẢNG THỜI GIAN (TỪ - ĐẾN)</label>
            <div className="flex gap-2">
               <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-black text-slate-700 text-[10px] outline-none" />
               <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-black text-slate-700 text-[10px] outline-none" />
            </div>
          </div>

          <div className="md:col-span-1">
            <button onClick={() => { setSelectedVesselId('ALL'); setMonthYearFilter('ALL'); setStartDate(''); setEndDate(''); }} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[8px] tracking-widest hover:bg-slate-700 transition-all active:scale-95">RESET</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar no-print space-y-3">
        {reportGroups.length > 0 ? reportGroups.map((group) => (
          <div key={group.id} className={`bg-white rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all py-3 px-6 flex items-center gap-6 border-l-4 ${activeFilter === 'EXPORT' ? 'border-l-emerald-500' : 'border-l-blue-500'}`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${activeFilter === 'EXPORT' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
              <ICONS.ClipboardList className="w-5.5 h-5.5" />
            </div>
            <div className="flex-1 grid grid-cols-12 gap-2 items-center text-left">
              <div className="col-span-3">
                <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">SỐ PHIẾU: {group.reportNo}</span>
                <h4 className="text-[12px] font-black text-slate-900 uppercase truncate">{group.vesselName}</h4>
              </div>
              <div className="col-span-3 border-l border-slate-100 pl-5">
                <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">CHỦ HÀNG</span>
                <span className="text-[10px] font-bold text-slate-600 uppercase truncate block">{group.consignee}</span>
              </div>
              <div className="col-span-3 border-l border-slate-100 pl-5">
                <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">NGÀY / CA</span>
                <span className="text-[10px] font-black text-slate-800">{group.day}/{group.month}/{group.year} | CA {group.shift}</span>
              </div>
              <div className="col-span-3 border-l border-slate-100 pl-5">
                <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">SẢN LƯỢNG</span>
                <span className="text-[10px] font-black text-slate-900">{group.containers.length} {activeFilter === 'EXPORT' ? 'Lượt xe' : 'Cont'}</span>
              </div>
            </div>
            <button onClick={() => handleExportPDF(group)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center gap-2 hover:bg-rose-600 transition-all shrink-0">
               <ICONS.FileText className="w-3.5 h-3.5" /> XUẤT PDF
            </button>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center h-full py-32 opacity-20"><ICONS.ClipboardList className="w-16 h-16 mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Không tìm thấy phiếu nào</p></div>
        )}
      </div>

      {/* Template Tally PDF (Ẩn) */}
      <div className="absolute left-[-9999px] top-0 pointer-events-none">
        {currentWOPDF && (
          <div id="tally-pdf-template" className="bg-white p-[15mm] text-black w-[210mm] h-auto font-serif-paper text-left box-border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-xl font-black tracking-tighter">DANALOG</h1>
                <p className="text-[8px] font-bold uppercase">Danang Port Logistics</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-[9px] font-bold border-b border-black pb-0.5">Độc lập - Tự do - Hạnh phúc</p>
              </div>
            </div>
            <div className="text-center my-6">
              <h2 className="text-lg font-bold uppercase">PHIẾU KIỂM GIAO/NHẬN HÀNG</h2>
              <p className="text-sm font-bold tracking-widest">TALLY REPORT</p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-[11px] mb-4">
               <div className="space-y-1">
                  <p><span className="font-bold">Tàu:</span> {currentWOPDF.vesselName}</p>
                  <p><span className="font-bold">Ngày:</span> {currentWOPDF.day}/{currentWOPDF.month}/{currentWOPDF.year}</p>
                  <p><span className="font-bold">Số phiếu:</span> {currentWOPDF.reportNo}</p>
               </div>
               <div className="space-y-1 text-right">
                  <p><span className="font-bold">Chủ hàng:</span> {currentWOPDF.consignee}</p>
                  <p><span className="font-bold">Địa điểm:</span> KHO DANALOG</p>
               </div>
            </div>
            <table className="w-full border-collapse border border-black text-[11px]">
              <thead>
                <tr className="h-8 font-bold text-center bg-gray-50">
                  <th className="border border-black w-10">STT</th>
                  <th className="border border-black">Số Cont/Xe</th>
                  <th className="border border-black">Số Seal</th>
                  <th className="border border-black">Số kiện</th>
                  <th className="border border-black">Trọng lượng (T)</th>
                </tr>
              </thead>
              <tbody>
                {currentWOPDF.containers.map((c, i) => (
                  <tr key={i} className="h-8 text-center uppercase">
                    <td className="border border-black">{i + 1}</td>
                    <td className="border border-black font-bold">{c.containerNo}</td>
                    <td className="border border-black">{c.sealNo}</td>
                    <td className="border border-black font-bold">{c.pkgs}</td>
                    <td className="border border-black font-bold">{c.weight.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tinos:wght@400;700&display=swap');
        .font-serif-paper { font-family: 'Tinos', serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TallyReview;
