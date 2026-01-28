
import React, { useState, useMemo, useEffect } from 'react';
import { Container, Vessel, UnitType, BusinessType, ContainerStatus, DetentionConfig } from '../types';
import { StatusBadge } from './VesselImport';
import { ICONS } from '../constants';
import { checkDetentionStatus, displayDate } from '../services/dataService';
import JSZip from 'jszip';

interface OperationsProps {
  containers: Container[];
  onUpdateContainers: (c: Container[]) => void;
  vessels: Vessel[];
  businessType: BusinessType;
  onSwitchBusinessType: (type: BusinessType) => void;
  detentionConfig?: DetentionConfig;
}

const Operations: React.FC<OperationsProps> = ({ 
  containers, 
  onUpdateContainers,
  vessels, 
  businessType, 
  onSwitchBusinessType,
  detentionConfig: initialDetentionConfig = { urgentDays: 2, warningDays: 5 }
}) => {
  const isExport = businessType === BusinessType.EXPORT;
  const [showWarningPanel, setShowWarningPanel] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [viewingContainer, setViewingContainer] = useState<Container | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [detConfig, setDetConfig] = useState<DetentionConfig>(initialDetentionConfig);

  // Trạng thái lọc gộp
  const [selVesselId, setSelVesselId] = useState<string>('ALL');
  const [selUnitType, setSelUnitType] = useState<string>('ALL');

  useEffect(() => {
    setSelVesselId('ALL'); setSelUnitType('ALL');
  }, [businessType]);

  const handleUrge = (id: string) => {
    if (isExport) return;
    const updated = containers.map(c => 
      c.id === id ? { ...c, lastUrgedAt: new Date().toISOString() } : c
    );
    onUpdateContainers(updated);
  };

  // LOGIC LAN TRUYỀN CẢNH BÁO THEO TỜ KHAI
  const mismatchedDeclarations = useMemo(() => {
    if (isExport) return new Set<string>();
    const dIds = new Set<string>();
    containers.forEach(c => {
      const isMismatch = (c.customsPkgs !== undefined && c.customsPkgs !== c.pkgs) || 
                         (c.customsWeight !== undefined && c.customsWeight !== c.weight);
      if (isMismatch && c.tkNhaVC) dIds.add(c.tkNhaVC);
    });
    return dIds;
  }, [containers, isExport]);

  const filtered = useMemo(() => {
    let data = containers.filter(c => {
      if (isExport) return c.unitType === UnitType.VEHICLE && c.status === ContainerStatus.COMPLETED;
      return vessels.some(v => v.id === c.vesselId);
    });

    if (selVesselId !== 'ALL') data = data.filter(c => c.vesselId === selVesselId);

    if (selUnitType !== 'ALL') {
      if (selUnitType === 'XE') data = data.filter(c => c.unitType === UnitType.VEHICLE || c.size.includes('XE'));
      else data = data.filter(c => c.size.includes(selUnitType));
    }

    return [...data].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [containers, isExport, selVesselId, selUnitType, vessels]);

  const warnings = useMemo(() => {
    const mismatches = filtered.filter(c => 
      !isExport && c.tkNhaVC && mismatchedDeclarations.has(c.tkNhaVC)
    );
    const pendingTk = filtered.filter(c => !isExport && !c.tkDnlOla && c.status !== ContainerStatus.COMPLETED);
    return { mismatches, pendingTk };
  }, [filtered, isExport, mismatchedDeclarations]);

  const handleOpenGallery = (c: Container) => {
    if (c.images && c.images.length > 0) {
      setViewingContainer(c);
      setActiveImageIdx(0);
    } else {
      alert("Chưa có ảnh báo cáo cho mục này!");
    }
  };

  const handleDownloadSingle = async () => {
    if (!viewingContainer || !viewingContainer.images) return;
    setIsDownloading(true);
    const url = viewingContainer.images[activeImageIdx];
    const filename = `${viewingContainer.containerNo}_HinhAnh_${activeImageIdx + 1}.jpg`;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert("Lỗi tải ảnh!");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!viewingContainer || !viewingContainer.images) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(viewingContainer.containerNo);
      for (let i = 0; i < viewingContainer.images.length; i++) {
        const response = await fetch(viewingContainer.images[i]);
        const blob = await response.blob();
        folder?.file(`${viewingContainer.containerNo}_${i+1}.jpg`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `HoSo_${viewingContainer.containerNo}.zip`;
      link.click();
    } catch (e) {
      alert("Lỗi nén ZIP!");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn text-left h-full flex flex-col relative">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 no-print shrink-0">
        <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm px-6">
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">DANH MỤC:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button onClick={() => onSwitchBusinessType(BusinessType.IMPORT)} className={`px-6 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all tracking-wider ${!isExport ? 'bg-white shadow-sm text-blue-600 border border-slate-100' : 'text-slate-400'}`}>Hàng Nhập</button>
                 <button onClick={() => onSwitchBusinessType(BusinessType.EXPORT)} className={`px-6 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all tracking-wider ${isExport ? 'bg-white shadow-sm text-emerald-600 border border-slate-100' : 'text-slate-400'}`}>Hàng Xuất</button>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              {!isExport && (
                <>
                  <button 
                    onClick={() => setShowConfigModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
                  >
                    <ICONS.Settings className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cấu hình DET</span>
                  </button>
                  <button 
                    onClick={() => setShowWarningPanel(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all shadow-sm"
                  >
                    <ICONS.AlertTriangle className="w-4 h-4 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">CẢNH BÁO ({warnings.mismatches.length + warnings.pendingTk.length})</span>
                  </button>
                </>
              )}
           </div>
        </div>

        {/* Bộ lọc đã gộp */}
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1.5 w-full">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">CHỌN CHUYẾN TÀU (TÀU - CHỦ HÀNG - LỊCH TÀU)</label>
            <select 
              value={selVesselId} 
              onChange={(e) => setSelVesselId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-black text-slate-700 text-[11px] outline-none appearance-none focus:border-blue-500 focus:bg-white shadow-sm transition-all"
            >
              <option value="ALL">TẤT CẢ CÁC CHUYẾN TÀU</option>
              {vessels.map(v => (
                <option key={v.id} value={v.id}>{v.vesselName} - {v.consignee} - ({displayDate(v.eta)} - {displayDate(v.etd)})</option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-64 space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">LOẠI XE</label>
            <select 
              value={selUnitType} 
              onChange={(e) => setSelUnitType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-black text-slate-700 text-[11px] outline-none appearance-none shadow-sm transition-all focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">TẤT CẢ LOẠI XE</option>
              <option value="40">CONT 40'</option>
              <option value="20">CONT 20'</option>
              <option value="XE">XE THỚT</option>
            </select>
          </div>

          <button 
            onClick={() => { setSelVesselId('ALL'); setSelUnitType('ALL'); }} 
            className="bg-slate-100 hover:bg-slate-200 text-slate-500 py-3 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm"
          >
            LÀM MỚI LỌC
          </button>
        </div>
      </div>

      {/* Danh sách Container */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="px-8 py-4 border-b bg-slate-50/30 flex justify-between items-center">
           <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{isExport ? 'NHẬT KÝ XE ĐÃ XUẤT' : 'CHI TIẾT TÁC NGHIỆP DỮ LIỆU TÀU NHẬP'}</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
          {filtered.map((c, index) => {
            const v = vessels.find(vis => vis.id === c.vesselId);
            const isCompleted = c.status === ContainerStatus.COMPLETED;
            const detStatus = (!isExport && c.detExpiry) ? checkDetentionStatus(c.detExpiry, detConfig) : 'safe';
            
            const isDataMismatch = !isExport && c.tkNhaVC && mismatchedDeclarations.has(c.tkNhaVC);
            
            let rowColorClass = 'bg-white border-slate-100';
            let borderClass = 'border-slate-100';
            if (!isExport) {
                if (isDataMismatch) { rowColorClass = 'bg-indigo-50/40 border-indigo-100 shadow-sm'; borderClass = 'border-l-4 border-l-indigo-500'; }
                else if (detStatus === 'urgent' && !isCompleted) { rowColorClass = 'bg-red-50/40 border-red-100 shadow-sm'; borderClass = 'border-l-4 border-l-red-500'; }
                else if (detStatus === 'warning' && !isCompleted) { rowColorClass = 'bg-amber-50/20 border-amber-100'; borderClass = 'border-l-4 border-l-amber-500'; }
                else if (!c.tkDnlOla && !isCompleted) { rowColorClass = 'bg-amber-50/40 border-amber-100 shadow-sm'; }
            }

            return (
              <div key={c.id} className={`grid grid-cols-12 items-center gap-4 px-6 py-4 rounded-2xl border transition-all hover:shadow-lg ${rowColorClass} ${borderClass}`}>
                <div className="col-span-1 text-[11px] font-black text-slate-300 text-center">{filtered.length - index}</div>
                <div className="col-span-3 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-slate-800 uppercase leading-none ${isExport ? 'text-[11px]' : 'text-sm'}`}>{c.containerNo}</span>
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{c.unitType === UnitType.VEHICLE ? 'XE THỚT' : c.size}</span>
                </div>
                <div className="col-span-3 flex flex-col border-l border-slate-100 pl-4">
                  <span className="text-[10px] font-black text-slate-700 uppercase truncate">{v?.vesselName || 'TÀU LẺ'}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] font-bold text-slate-400 uppercase truncate">{v?.consignee}</span>
                    {!isExport && c.detExpiry && <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${detStatus === 'urgent' && !isCompleted ? 'bg-red-100 text-red-600 animate-pulse' : (detStatus === 'warning' && !isCompleted ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500')}`}>DET: {displayDate(c.detExpiry)}</span>}
                  </div>
                </div>
                <div className="col-span-2 flex flex-col border-l border-slate-100 pl-4">
                  <span className={`font-black uppercase tracking-tight ${isExport ? 'text-[9px]' : 'text-[10px]'} ${isDataMismatch ? 'text-indigo-700' : (isCompleted ? (isExport ? 'text-blue-700' : 'text-emerald-700') : 'text-slate-600')}`}>
                    {isExport ? (c.sealNo || 'CHỜ SEAL') : (c.tkDnlOla || 'CHỜ TK')}
                  </span>
                  <span className="text-[8px] font-bold uppercase mt-1 text-slate-400">{isExport ? 'CẶP SEAL' : `UP: ${c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--:--'}`}</span>
                </div>
                <div className="col-span-1 text-center border-l border-slate-100">
                  <p className={`text-[11px] font-black leading-none ${isDataMismatch ? 'text-indigo-600 underline decoration-2' : 'text-slate-800'}`}>{c.pkgs}K</p>
                  <p className="text-[11px] font-black text-blue-600 mt-1.5">{c.weight.toFixed(1)}T</p>
                </div>
                <div className="col-span-2 flex justify-end gap-2 items-center">
                  {isCompleted ? (
                    <button onClick={() => handleOpenGallery(c)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      XEM ẢNH
                    </button>
                  ) : (
                    <div className="flex gap-2">
                       <StatusBadge status={isDataMismatch ? ContainerStatus.MISMATCH : c.status} />
                       {!isExport && (
                          <button 
                            onClick={() => handleUrge(c.id)} 
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${c.lastUrgedAt ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white'}`}
                          >
                            {c.lastUrgedAt ? <ICONS.CheckCircle className="w-3 h-3" /> : <ICONS.AlertTriangle className={`w-3 h-3 ${(detStatus === 'urgent' || !c.tkDnlOla) ? 'animate-pulse text-amber-500' : ''}`} />}
                            {c.lastUrgedAt ? 'ĐÃ NHẮC' : 'ĐÔN ĐỐC'}
                          </button>
                       )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL CẤU HÌNH DET */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-slideUp border border-slate-200">
              <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                 <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Cấu hình nhắc DET</h3>
                 <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-rose-500 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5 ml-1">Ngưỡng khẩn cấp (Ngày)</label>
                    <input 
                      type="number" 
                      value={detConfig.urgentDays} 
                      onChange={e => setDetConfig({...detConfig, urgentDays: parseInt(e.target.value) || 0})}
                      className="w-full bg-red-50 border-2 border-red-100 rounded-2xl p-4 font-black text-red-600 outline-none text-center"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5 ml-1">Ngưỡng cảnh báo (Ngày)</label>
                    <input 
                      type="number" 
                      value={detConfig.warningDays} 
                      onChange={e => setDetConfig({...detConfig, warningDays: parseInt(e.target.value) || 0})}
                      className="w-full bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 font-black text-amber-600 outline-none text-center"
                    />
                 </div>
                 <button 
                  onClick={() => setShowConfigModal(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all"
                 >
                   XÁC NHẬN CẬP NHẬT
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL XEM ẢNH KHAI THÁC */}
      {viewingContainer && viewingContainer.images && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-fadeIn">
           <button onClick={() => setViewingContainer(null)} className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-20">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
           </button>

           <div className="relative w-full max-w-5xl h-[85vh] flex flex-col items-center justify-center gap-6">
              <div className="relative w-full h-full bg-slate-800 rounded-[2rem] overflow-hidden shadow-2xl flex items-center justify-center">
                 <img src={viewingContainer.images[activeImageIdx]} className="max-w-full max-h-full object-contain" alt="Báo cáo khai thác" />
                 
                 {viewingContainer.images.length > 1 && (
                    <>
                       <button onClick={() => setActiveImageIdx(p => (p === 0 ? (viewingContainer.images?.length || 1) - 1 : p - 1))} className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg></button>
                       <button onClick={() => setActiveImageIdx(p => (p === (viewingContainer.images?.length || 1) - 1 ? 0 : p + 1))} className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg></button>
                    </>
                 )}

                 <div className="absolute top-6 left-6 flex gap-3">
                    <button 
                      onClick={handleDownloadSingle}
                      disabled={isDownloading}
                      className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all font-black text-[10px] uppercase tracking-widest border border-white/10 shadow-xl disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      )}
                      TẢI ẢNH NÀY
                    </button>
                    <button 
                      onClick={handleDownloadAll}
                      disabled={isDownloading}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600/80 hover:bg-blue-600 text-white rounded-2xl backdrop-blur-md transition-all font-black text-[10px] uppercase tracking-widest border border-blue-400/30 shadow-xl disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg>
                      )}
                      TẢI TOÀN BỘ HỒ SƠ (ZIP)
                    </button>
                 </div>
              </div>

              <div className="flex gap-3 overflow-x-auto p-2">
                 {viewingContainer.images.map((img, idx) => (
                   <button key={idx} onClick={() => setActiveImageIdx(idx)} className={`w-20 h-20 rounded-2xl overflow-hidden border-4 transition-all ${activeImageIdx === idx ? 'border-emerald-500 scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                     <img src={img} className="w-full h-full object-cover" />
                   </button>
                 ))}
              </div>

              <p className="text-white/60 font-black text-[10px] uppercase tracking-[0.3em]">Báo cáo hình ảnh khai thác - Ảnh {activeImageIdx + 1}/{viewingContainer.images.length}</p>
           </div>
        </div>
      )}

      {showWarningPanel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-slideUp border border-slate-200">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center"><ICONS.AlertTriangle className="w-6 h-6" /></div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cảnh báo dữ liệu hàng nhập</h2>
               </div>
               <button onClick={() => setShowWarningPanel(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            
            <div className="p-8 grid grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
               <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2"><h3 className="text-sm font-black text-indigo-700 uppercase tracking-widest">1. SAI LỆCH SỐ LIỆU TỜ KHAI ({warnings.mismatches.length})</h3></div>
                  {warnings.mismatches.map(c => (
                     <div key={c.id} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex justify-between items-center group hover:bg-indigo-100/50 transition-all">
                        <div><p className="font-black text-slate-800 text-sm uppercase">{c.containerNo}</p><p className="text-[9px] font-bold text-indigo-600 uppercase mt-1">Lô: {c.tkNhaVC}</p></div>
                        <div className="flex gap-2">
                           <StatusBadge status={ContainerStatus.MISMATCH} />
                           <button onClick={() => handleUrge(c.id)} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${c.lastUrgedAt ? 'bg-emerald-600 text-white' : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}>
                              {c.lastUrgedAt ? 'ĐÃ NHẮC' : 'ĐÔN ĐỐC'}
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
               <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2"><h3 className="text-sm font-black text-amber-700 uppercase tracking-widest">2. CHƯA CÓ TỜ KHAI DNL ({warnings.pendingTk.length})</h3></div>
                  {warnings.pendingTk.map(c => (
                     <div key={c.id} className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex justify-between items-center group hover:bg-amber-100/50 transition-all">
                        <div><p className="font-black text-slate-800 text-sm uppercase">{c.containerNo}</p><p className="text-[9px] font-bold text-amber-600 uppercase mt-1">Chủ hàng: {vessels.find(v => v.id === c.vesselId)?.consignee}</p></div>
                        <button onClick={() => handleUrge(c.id)} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${c.lastUrgedAt ? 'bg-emerald-600 text-white' : 'bg-white border border-amber-200 text-amber-600 hover:bg-amber-600 hover:text-white'}`}>
                           {c.lastUrgedAt ? 'ĐÃ NHẮC' : 'ĐÔN ĐỐC'}
                        </button>
                     </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default Operations;
