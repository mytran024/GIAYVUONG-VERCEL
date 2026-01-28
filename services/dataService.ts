
import { Container, Vessel, ContainerStatus, DetentionConfig, UnitType } from '../types';

/**
 * Hàm chuẩn hóa ngày tháng về định dạng chuẩn quốc tế YYYY-MM-DD
 */
export const normalizeDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${y}-${m}-${d}`;
    }
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const displayDate = (isoDate: string | undefined): string => {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

/**
 * Logic: Xử lý xóa trùng lặp và Sum dữ liệu khi Import
 * QUY TẮC: Chỉ khi có ĐỦ tkNhaVC và tkDnlOla mới được coi là READY/COMPLETED
 */
export const processImportData = (
  rawRows: any[], 
  currentVesselId: string, 
  existingContainers: Container[]
): { containers: Container[]; summary: { totalPkgs: number; totalWeight: number } } => {
  
  const containerMap = new Map<string, Container>();

  existingContainers.forEach(c => {
    if (c.vesselId === currentVesselId) {
      containerMap.set(c.containerNo, c);
    }
  });

  const detectUnitType = (id: string): UnitType => {
    const cleanId = id.toString().trim().toUpperCase();
    if (cleanId.includes('/')) return UnitType.VEHICLE;
    const containerPattern = new RegExp('^[A-Z]{4}\\d{7}$');
    const cleanNo = cleanId.replace(new RegExp('[\\s\\.-]', 'g'), '');
    if (containerPattern.test(cleanNo)) return UnitType.CONTAINER;
    return UnitType.VEHICLE;
  };

  rawRows.forEach(row => {
    const containerNo = row.containerNo?.toString().trim();
    if (!containerNo) return;

    const existing = containerMap.get(containerNo);
    
    // Lấy thông tin tờ khai từ file hoặc dữ liệu cũ
    const vcDeclaration = row.tkNhaVC || row.toKhai || existing?.tkNhaVC || '';
    const dnlDeclaration = row.tkDnlOla || existing?.tkDnlOla || '';
    
    // QUY TẮC: Phải có CẢ HAI mới được tính là Sẵn sàng
    const isFullyDocumented = !!(vcDeclaration && dnlDeclaration);
    
    const unitType = row.unitType || detectUnitType(containerNo);
    const size = row.size || existing?.size || (unitType === UnitType.VEHICLE ? "Xe thớt" : "40'HC");

    const newContainer: Container = {
      id: existing?.id || Math.random().toString(36).substr(2, 9),
      vesselId: currentVesselId,
      unitType: unitType,
      containerNo: containerNo,
      size: size,
      sealNo: row.sealNo || existing?.sealNo || '',
      carrier: row.carrier || 'N/A',
      pkgs: Number(row.pkgs) || existing?.pkgs || 16,
      weight: Number(row.weight) || existing?.weight || 28.8,
      customsPkgs: row.customsPkgs !== undefined ? Number(row.customsPkgs) : existing?.customsPkgs,
      customsWeight: row.customsWeight !== undefined ? Number(row.customsWeight) : existing?.customsWeight,
      billNo: row.billNo || '',
      vendor: row.vendor || '',
      detExpiry: normalizeDate(row.detExpiry || existing?.detExpiry || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
      tkNhaVC: vcDeclaration,
      ngayTkNhaVC: normalizeDate(row.ngayTkNhaVC || existing?.ngayTkNhaVC || ''),
      tkDnlOla: dnlDeclaration,
      ngayTkDnl: normalizeDate(row.ngayTkDnl || existing?.ngayTkDnl || ''),
      ngayKeHoach: normalizeDate(row.ngayKeHoach || row.dayOfLoading || existing?.ngayKeHoach || new Date().toISOString()),
      noiHaRong: row.noiHaRong || existing?.noiHaRong || 'TIEN SA',
      
      // Nếu đã COMPLETED từ trước thì giữ nguyên, nếu không thì dựa vào hồ sơ để set READY
      status: existing?.status === ContainerStatus.COMPLETED 
        ? ContainerStatus.COMPLETED 
        : (isFullyDocumented ? ContainerStatus.READY : ContainerStatus.PENDING),
        
      updatedAt: new Date().toISOString(),
      remarks: row.remarks || existing?.remarks || ''
    };

    containerMap.set(containerNo, newContainer);
  });

  const finalContainers = Array.from(containerMap.values());
  const totalPkgs = finalContainers.reduce((sum, c) => sum + c.pkgs, 0);
  const totalWeight = finalContainers.reduce((sum, c) => sum + c.weight, 0);

  return { containers: finalContainers, summary: { totalPkgs, totalWeight } };
};

export const checkDetentionStatus = (
  expiryDate: string, 
  config: DetentionConfig = { urgentDays: 2, warningDays: 5 }
): 'urgent' | 'warning' | 'safe' => {
  const expiry = new Date(expiryDate).getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= config.urgentDays) return 'urgent';
  if (diffDays <= config.warningDays) return 'warning';
  return 'safe';
};
