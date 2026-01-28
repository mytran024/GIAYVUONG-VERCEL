
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vessel, Container, ContainerStatus, BusinessType, TransportVehicle, UnitType } from '../types';
import { ICONS } from '../constants';
import { displayDate, processImportData } from '../services/dataService';
import * as XLSX from 'xlsx';

export const StatusBadge: React.FC<{ status: ContainerStatus }> = ({ status }) => {
  const isCompleted = status === ContainerStatus.COMPLETED;
  const isIssue = status === ContainerStatus.ISSUE;
  const isMismatch = status === ContainerStatus.MISMATCH;

  if (isMismatch) {
    return (
      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-200 whitespace-nowrap">
        SAI LỆCH TK
      </span>
    );
  }

  if (isIssue) {
    return (
      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 border border-amber-100 whitespace-nowrap">
        CÓ VẤN ĐỀ
      </span>
    );
  }

  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${
      isCompleted 
        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
        : "bg-slate-50 text-slate-400 border-slate-100"
    }`}>
      {isCompleted ? "ĐÃ KHAI THÁC" : "CHƯA KHAI THÁC"}
    </span>
  );
};

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
}

const IMPORT_COLUMNS: ColumnConfig[] = [
  { id: 'stt', label: 'STT', width: 40 },
  { id: 'ngayKeHoach', label: 'KẾ HOẠCH', width: 85 },
  { id: 'containerNo', label: 'SỐ CONT', width: 100 },
  { id: 'sealNo', label: 'SỐ SEAL', width: 100 },
  { id: 'tkNhaVC', label: 'TK NHÀ VC', width: 110 },
  { id: 'ngayTkNhaVC', label: 'NGÀY TK VC', width: 85 },
  { id: 'tkDnlOla', label: 'TỜ KHAI DNL', width: 110 },
  { id: 'weight', label: 'TẤN (ĐL)', width: 60 },
  { id: 'status', label: 'TRẠNG THÁI', width: 130 },
];

const EXPORT_COLUMNS: ColumnConfig[] = [
  { id: 'stt', label: 'STT', width: 40 },
  { id: 'truckNo', label: 'SỐ XE', width: 100 },
  { id: 'truckReg', label: 'ĐĂNG KIỂM', width: 85 },
  { id: 'romocNo', label: 'SỐ MOOC', width: 100 },
  { id: 'romocReg', label: 'ĐĂNG KIỂM', width: 85 },
  { id: 'driverName', label: 'LÁI XE', width: 150 },
  { id: 'idCard', label: 'CCCD', width: 120 },
  { id: 'phone', label: 'SĐT', width: 100 },
  { id: 'notes', label: 'GHI CHÚ', width: 150 },
];

interface VesselImportProps {
  vessels: Vessel[];
  onUpdateVessels: (v: Vessel[]) => void;
  containers: Container[];
  onUpdateContainers: (c: Container[]) => void;
  transportVehicles: TransportVehicle[];
}

const VesselImport: React.FC<VesselImportProps> = ({ 
  vessels, 
  onUpdateVessels, 
  containers, 
  onUpdateContainers, 
  transportVehicles 
}) => {
  const [activeBusiness, setActiveBusiness] = useState<BusinessType>(BusinessType.IMPORT);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [showVesselModal, setShowVesselModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const DEFAULT_COMMODITY = "Bột giấy đã nén dạng tấm, hàng mới 100%";

  const [newVessel, setNewVessel] = useState<Partial<Vessel>>({
    vesselName: '', commodity: DEFAULT_COMMODITY, consignee: '', voyageNo: '', eta: '', etd: ''
  });

  const [modalSelections, setModalSelections] = useState({ vesselId: '' });
  const [exportPlanForm, setExportPlanForm] = useState({ arrivalTime: '', operationTime: '', plannedWeight: 0 });

  const isImport = activeBusiness === BusinessType.IMPORT;
  const currentColumns = isImport ? IMPORT_COLUMNS : EXPORT_COLUMNS;

  const availableVesselsForFilter = useMemo(() => {
    if (isImport) return vessels;
    return vessels.filter(v => v.exportPlanActive);
  }, [vessels, isImport]);

  const currentVessel = vessels.find(v => v.id === selectedVesselId);
  const vesselContainers = containers.filter(c => c.vesselId === selectedVesselId);
  const currentVehicles = transportVehicles.filter(tv => tv.vesselId === selectedVesselId);
  const vesselsForModal = useMemo(() => vessels.filter(v => !v.exportPlanActive), [vessels]);

  const mismatchedTKs = useMemo(() => {
    const ids = new Set<string>();
    vesselContainers.forEach(c => {
       const isWrong = (c.customsPkgs !== undefined && c.customsPkgs !== c.pkgs) || 
                       (c.customsWeight !== undefined && c.customsWeight !== c.weight);
       if (isWrong && c.tkNhaVC) ids.add(c.tkNhaVC);
    });
    return ids;
  }, [vesselContainers]);

  useEffect(() => {
    const v = vessels.find(v => v.id === modalSelections.vesselId);
    if (v) setExportPlanForm(prev => ({ ...prev, plannedWeight: v.totalWeight }));
  }, [modalSelections.vesselId, vessels]);

  const formatDateOnly = (dt: string | undefined) => {
    if (!dt) return '---';
    try {
      const date = new Date(dt);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch(e) { return dt; }
  };

  const handleCreateVessel = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `v_${Math.random().toString(36).substr(2, 5)}`;
    const vessel: Vessel = {
      ...newVessel,
      id,
      vesselName: (newVessel.vesselName || '').toUpperCase().trim(),
      voyageNo: (newVessel.voyageNo || '').toUpperCase().trim(),
      consignee: (newVessel.consignee || '').toUpperCase().trim(),
      totalContainers: 0,
      totalPkgs: 0,
      totalWeight: 0
    } as Vessel;
    onUpdateVessels([...vessels, vessel]);
    setShowVesselModal(false);
    setSelectedVesselId(id);
    setNewVessel({ vesselName: '', commodity: DEFAULT_COMMODITY, consignee: '', voyageNo: '', eta: '', etd: '' });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedVesselId) return alert("Vui lòng chọn tàu trước khi import!");
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const { containers: newContainers, summary } = processImportData(data, selectedVesselId, containers);
        
        const otherContainers = containers.filter(c => c.vesselId !== selectedVesselId);
        onUpdateContainers([...otherContainers, ...newContainers]);

        const updatedVessels = vessels.map(v => v.id === selectedVesselId ? {
          ...v,
          totalContainers: newContainers.length,
          totalPkgs: summary.totalPkgs,
          totalWeight: summary.totalWeight
        } : v);
        onUpdateVessels(updatedVessels);

        alert(`Đã import thành công ${newContainers.length} container!`);
      } catch (err) {
        alert("Lỗi định dạng file Excel!");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleNotifyExportPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSelections.vesselId) return;
    setIsProcessing(true);
    setTimeout(() => {
      const updated = vessels.map(v => v.id === modalSelections.vesselId ? {
        ...v,
        exportPlanActive: true,
        exportArrivalTime: exportPlanForm.arrivalTime,
        exportOperationTime: exportPlanForm.operationTime,
        exportPlannedWeight: exportPlanForm.plannedWeight,
      } : v);
      onUpdateVessels(updated);
      setIsProcessing(false);
      setShowExportModal(false);
      setSelectedVesselId(modalSelections.vesselId);
    }, 800);
  };

  return (
    <div className="space-y-4 animate-fadeIn relative text-left h-full flex flex-col">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => { setActiveBusiness(BusinessType.IMPORT); setSelectedVesselId(''); }} 
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all tracking-wider ${isImport ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
          >
            Nghiệp vụ Nhập
          </button>
          <button 
            onClick={() => { setActiveBusiness(BusinessType.EXPORT); setSelectedVesselId(''); }} 
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all tracking-wider ${!isImport ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
          >
            Nghiệp vụ Xuất
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isImport ? (
            <button onClick={() => setShowVesselModal(true)} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-50 hover:bg-blue-700 transition-all flex items-center gap-2">
               <ICONS.Ship className="w-4 h-4" /> THÊM TÀU MỚI
            </button>
          ) : (
            <button onClick={() => setShowExportModal(true)} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all flex items-center gap-2">
               <ICONS.AlertTriangle className="w-4 h-4" /> THÔNG BÁO TÀU XUẤT
            </button>
          )}
        </div>
      </div>

      {/* Filter Zone */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">CHỌN CHUYẾN TÀU (TÀU - CHỦ HÀNG - LỊCH)</label>
            <select className="w-full border border-slate-200 rounded-xl py-3 px-5 font-black text-slate-700 bg-slate-50 outline-none text-[12px] appearance-none focus:border-blue-500" value={selectedVesselId} onChange={(e) => setSelectedVesselId(e.target.value)}>
              <option value="">-- Chọn chuyến tàu --</option>
              {availableVesselsForFilter.map(v => (
                <option key={v.id} value={v.id}>{v.vesselName} - {v.consignee} - ({displayDate(v.eta)} - {displayDate(v.etd)})</option>
              ))}
            </select>
          </div>
          {isImport && selectedVesselId && (
            <div className="mt-4">
              <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx,.xls" />
              <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2">
                 <ICONS.FileText className="w-4 h-4" /> IMPORT EXCEL
              </button>
            </div>
          )}
          <button onClick={() => setSelectedVesselId('')} className="mt-4 px-6 py-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all font-black text-[10px] uppercase tracking-widest">LÀM MỚI</button>
        </div>
      </div>

      {currentVessel ? (
        <div className={`bg-white rounded-[2.5rem] shadow-xl border overflow-hidden flex-1 flex flex-col min-h-0 ${isImport ? 'border-blue-100' : 'border-emerald-100'}`}>
          <div className={`px-8 py-5 border-b flex justify-between items-center shrink-0 ${isImport ? 'bg-blue-50/20' : 'bg-emerald-50/20'}`}>
            <div className="flex items-center gap-4 text-left">
              <div className={`w-1.5 h-6 rounded-full ${isImport ? 'bg-blue-600' : 'bg-emerald-600'}`}></div>
              <div>
                 <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg">{isImport ? 'DANH SÁCH CONTAINER NHẬP' : 'DANH SÁCH XE TRUNG CHUYỂN'}</h3>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{currentVessel.vesselName} • {currentVessel.consignee}</p>
              </div>
            </div>
            <div className="flex gap-10 text-right">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">SẢN LƯỢNG {isImport ? 'NHẬP' : 'XUẤT'}</p>
                <p className={`text-xl font-black tracking-tighter ${isImport ? 'text-blue-700' : 'text-emerald-700'}`}>
                  {isImport ? currentVessel.totalWeight.toLocaleString() : (currentVessel.exportPlannedWeight || 0).toLocaleString()} TẤN
                </p>
              </div>
              {!isImport && (
                <div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">SỐ LƯỢNG XE</p>
                   <p className="text-xl font-black text-slate-800 tracking-tighter">{currentVehicles.length} XE</p>
                </div>
              )}
            </div>
          </div>

          {!isImport && (
            <div className="px-8 py-3 bg-slate-50/50 flex gap-12 border-b border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
               <div className="flex items-center gap-2"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LỊCH TÀU CẬP:</span><span className="text-[10px] font-black text-slate-700">{formatDateOnly(currentVessel.exportArrivalTime)}</span></div>
               <div className="flex items-center gap-2 border-l border-slate-200 pl-8"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LỊCH LÀM HÀNG:</span><span className="text-[10px] font-black text-slate-700">{formatDateOnly(currentVessel.exportOperationTime)}</span></div>
               <div className="flex items-center gap-2 border-l border-slate-200 pl-8"><span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">TRẠNG THÁI:</span><span className="text-[9px] font-black text-white bg-emerald-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">Đã gửi lệnh</span></div>
            </div>
          )}
          
          <div className="overflow-auto custom-scrollbar flex-1">
            <table className="min-w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-50 text-slate-400 border-b sticky top-0 z-10">
                <tr>
                  {currentColumns.map((col) => (
                    <th key={col.id} className="px-4 py-4 font-black uppercase text-[8px] tracking-widest text-center" style={{ width: col.width }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isImport ? (
                  vesselContainers.length > 0 ? vesselContainers.map((c, idx) => {
                    const isMismatch = mismatchedTKs.has(c.tkNhaVC || '');
                    return (
                      <tr key={c.id} className={`transition-colors ${isMismatch ? 'bg-red-50/30' : 'hover:bg-blue-50/20'}`}>
                        <td className="px-4 py-3 text-center font-bold text-slate-300">{idx + 1}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-500">{displayDate(c.ngayKeHoach)}</td>
                        <td className="px-4 py-3 font-black text-slate-900 uppercase tracking-tight">{c.containerNo}</td>
                        <td className="px-4 py-3 text-center text-slate-400 font-medium">{c.sealNo}</td>
                        <td className="px-4 py-3 text-center font-black text-slate-700 uppercase">{c.tkNhaVC || '-'}</td>
                        <td className="px-4 py-3 text-center text-slate-400 font-medium">{displayDate(c.ngayTkNhaVC)}</td>
                        <td className="px-4 py-3 text-center font-black text-emerald-700">{c.tkDnlOla || '-'}</td>
                        <td className="px-4 py-3 text-center font-black text-blue-600">{c.weight.toFixed(1)}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={isMismatch ? ContainerStatus.MISMATCH : c.status} />
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={IMPORT_COLUMNS.length} className="py-24 text-center opacity-30 font-black uppercase text-[10px] tracking-widest">Chưa có dữ liệu. Vui lòng Import file Excel.</td></tr>
                  )
                ) : (
                  currentVehicles.length > 0 ? currentVehicles.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="px-4 py-4 text-center font-bold text-slate-300">{idx + 1}</td>
                      <td className="px-4 py-4 text-center font-black text-slate-900 tracking-tight">{v.truckNo}</td>
                      <td className="px-4 py-4 text-center text-slate-400 italic">---</td>
                      <td className="px-4 py-4 text-center font-black text-slate-700 tracking-tight">{v.romocNo}</td>
                      <td className="px-4 py-4 text-center text-slate-400 italic">---</td>
                      <td className="px-4 py-4 font-black text-slate-800 uppercase">{v.driverName}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-600 tracking-wider">{v.idCard}</td>
                      <td className="px-4 py-4 text-center font-black text-blue-600">{v.phone}</td>
                      <td className="px-4 py-4 text-slate-400 font-medium italic">{v.notes || ''}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={EXPORT_COLUMNS.length} className="py-24 text-center opacity-30 font-black uppercase text-[10px] tracking-widest">Đang đợi vận tải cập nhật danh sách xe...</td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] py-32 opacity-30 text-center">
           <ICONS.Ship className="w-20 h-20 mb-4" />
           <p className="font-black text-[12px] uppercase tracking-[0.5em]">Vui lòng chọn tàu để bắt đầu khai thác</p>
        </div>
      )}

      {/* Modal Thêm Tàu Mới */}
      {showVesselModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp border border-slate-100">
             <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-widest">KHỞI TẠO TÀU NHẬP MỚI</h3>
                <button onClick={() => setShowVesselModal(false)} className="text-white hover:opacity-60 transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
             </div>
             <form onSubmit={handleCreateVessel} className="p-8 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">TÊN TÀU</label>
                    <input required type="text" value={newVessel.vesselName} onChange={e => setNewVessel({...newVessel, vesselName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500 uppercase" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SỐ CHUYẾN</label>
                    <input required type="text" value={newVessel.voyageNo} onChange={e => setNewVessel({...newVessel, voyageNo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500 uppercase" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">TÊN HÀNG</label>
                  <input required type="text" value={newVessel.commodity} onChange={e => setNewVessel({...newVessel, commodity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CHỦ HÀNG / KHÁCH HÀNG</label>
                  <input required type="text" value={newVessel.consignee} onChange={e => setNewVessel({...newVessel, consignee: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500 uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">LỊCH TÀU CẬP (ETA)</label>
                    <input required type="date" value={newVessel.eta} onChange={e => setNewVessel({...newVessel, eta: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">LỊCH TÀU RỜI (ETD)</label>
                    <input required type="date" value={newVessel.etd} onChange={e => setNewVessel({...newVessel, etd: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500" />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-blue-600 transition-all active:scale-95">XÁC NHẬN TẠO TÀU</button>
             </form>
          </div>
        </div>
      )}
      {/* (Phần Modal thông báo tàu xuất giữ nguyên vì không có nhập liệu text phức tạp) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default VesselImport;
