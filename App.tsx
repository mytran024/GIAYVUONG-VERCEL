
import React, { useState, useEffect } from 'react';
import { ICONS, MOCK_USER } from './constants';
import { UserRole, Vessel, Container, ContainerStatus, UnitType, BusinessType, ResourceMember, ResourceType, SystemUser, WorkOrder, ServicePrice, WorkOrderType, WorkOrderStatus, TransportVehicle } from './types';
import VesselImport from './components/VesselImport';
import Operations from './components/Operations';
import TallyReview from './components/TallyReview';
import Statistics from './components/Statistics';
import ReportsDashboard from './components/ReportsDashboard';
import DebitManagement from './components/DebitManagement';
import PricingConfigPage from './components/PricingConfig';
import UserManagement from './components/UserManagement';
import Login from './components/Login';

const INITIAL_PRICES: ServicePrice[] = [
  { id: 'weight-factor', name: 'Hệ số khối lượng (tấn/kiện)', unit: 'tấn/kiện', price: 1.8, category: 'UNIT', group: 'GENERAL' },
  { id: '1', name: 'Phí khai thác hàng nhập kho', unit: 'đồng/tấn', price: 9000, category: 'WEIGHT', group: 'GENERAL' },
  { id: '2', name: 'Phí khai thác hàng xuất kho', unit: 'đồng/tấn', price: 9000, category: 'WEIGHT', group: 'GENERAL' },
  { id: '3', name: 'Phí xếp lô hàng trong kho', unit: 'đồng/tấn', price: 9000, category: 'WEIGHT', group: 'GENERAL' },
  { id: '4', name: 'Phí trả container về bãi sau khai thác', unit: 'đồng/cont', price: 220000, category: 'UNIT', group: 'GENERAL' },
  { id: '5', name: 'Phí vận chuyển (từ kho Danalog- Cảng Tiên Sa)', unit: 'đồng/tấn', price: 25000, category: 'WEIGHT', group: 'GENERAL' },
  { id: '6', name: 'Phí thuê kho Tháng', unit: 'đồng/tấn thông qua', price: 10000, category: 'WEIGHT', group: 'GENERAL' },
  
  { id: 'im_mech_1', name: 'Cont -> Cửa kho', unit: 'đồng/tấn', price: 12000, category: 'WEIGHT', group: 'METHOD', subGroup: 'MECHANICAL', businessType: BusinessType.IMPORT },
  { id: 'im_mech_2', name: 'Cửa kho -> Xếp lô', unit: 'đồng/tấn', price: 12000, category: 'WEIGHT', group: 'METHOD', subGroup: 'MECHANICAL', businessType: BusinessType.IMPORT },
  { id: 'im_lab_1', name: 'Đóng mở cont, bấm seal', unit: 'đồng/cont', price: 250000, category: 'UNIT', group: 'METHOD', subGroup: 'LABOR', businessType: BusinessType.IMPORT },
  { id: 'ex_mech_1', name: 'Trong kho -> Cửa kho', unit: 'đồng/tấn', price: 12000, category: 'WEIGHT', group: 'METHOD', subGroup: 'MECHANICAL', businessType: BusinessType.EXPORT },
  { id: 'ex_lab_1', name: 'Bấm seal (Xe thớt)', unit: 'đồng/ca', price: 1500000, category: 'UNIT', group: 'METHOD', subGroup: 'LABOR', businessType: BusinessType.EXPORT },
];

const INITIAL_RESOURCES: ResourceMember[] = [
  { id: 'r1', name: 'Nguyễn Văn Nam', phone: '0905111222', department: 'KHO', type: ResourceType.LABOR },
  { id: 'r2', name: 'Trần Văn Hùng', phone: '0905333444', department: 'KHO', type: ResourceType.LABOR },
  { id: 'r6', name: 'Nguyễn Văn Tám', phone: '0905123123', department: 'KHO', type: ResourceType.MECHANICAL },
  { id: 'r9', name: 'Phạm Văn Tý', phone: '0905000111', department: 'KHO', type: ResourceType.MECHANICAL, isOutsourced: true, unitName: 'COTRACO' },
];

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1494412574743-019485676a3d?auto=format&fit=crop&q=80&w=800"
];

const INITIAL_USERS: SystemUser[] = [
  { id: '1', username: 'admin', name: 'Nguyễn Văn Kiểm', role: UserRole.INSPECTOR, isActive: true, employeeId: 'NV-831', phone: '0905.123.456', email: '1@danalog.com.vn', department: 'Phòng Khai Thác' },
  { id: '2', username: 'dieudo_dnl', name: 'Trần Thị Thảo', role: UserRole.CS, isActive: true, employeeId: 'NV-202', phone: '0905.999.888', email: 'thao.tt@danalog.com.vn', department: 'Phòng Điều Độ' },
  { id: '3', username: 'cs', name: 'NHÂN VIÊN CS', role: UserRole.CS, isActive: true, employeeId: 'NV-CS01', phone: '0905.000.111', email: 'cs@danalog.com.vn', department: 'Phòng CS' }
];

const INITIAL_TRANSPORT_VEHICLES: TransportVehicle[] = [
  { id: 't1', vesselId: 'v_golden', stt: 1, truckNo: '43C-055.62', romocNo: '43R03758', driverName: 'Trương Đình Nhân', idCard: '049086005433', phone: '0862105979' },
  { id: 't2', vesselId: 'v_golden', stt: 2, truckNo: '43H-105.37', romocNo: '43RM-000.66', driverName: 'Lương Trân', idCard: '191570315', phone: '0905261503' },
  { id: 't3', vesselId: 'v_golden', stt: 3, truckNo: '43H-051.25', romocNo: '43R-038.64', driverName: 'Trần Văn Tư', idCard: '048083006624', phone: '0905807217' },
  { id: 't4', vesselId: 'v_golden', stt: 4, truckNo: '43H-164.72', romocNo: '43R-027.20', driverName: 'Lô Việt Đức', idCard: '040089038555', phone: '0777748775' },
  { id: 't5', vesselId: 'v_golden', stt: 5, truckNo: '43H-179.72', romocNo: '43H-013.04', driverName: 'Đặng Công Thống', idCard: '048076004844', phone: '0905868455' },
  { id: 't6', vesselId: 'v_golden', stt: 6, truckNo: '43H-10009', romocNo: '43H-015.85', driverName: 'Nguyễn Văn Thanh', idCard: '048079004885', phone: '0935702172' },
  { id: 't7', vesselId: 'v_golden', stt: 7, truckNo: '43H-08120', romocNo: '43R-007.38', driverName: 'Đặng Thanh Bình', idCard: '049071001723', phone: '0915316519' },
  { id: 't8', vesselId: 'v_golden', stt: 8, truckNo: '43H-13567', romocNo: '43R-01959', driverName: 'Tăng Tân Trường Thảo', idCard: '048072008533', phone: '0905871477' },
  { id: 't9', vesselId: 'v_golden', stt: 9, truckNo: '43H-00993', romocNo: '43R-03141', driverName: 'Nguyễn Công Bình', idCard: '049082008032', phone: '0965163325' },
  { id: 't10', vesselId: 'v_golden', stt: 10, truckNo: '43H-08597', romocNo: '43R-00846', driverName: 'Đinh Hữu Huyến', idCard: '049082014655', phone: '0935909566' },
];

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>(BusinessType.IMPORT);
  const [activeTab, setActiveTab] = useState('vessels');
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>(INITIAL_PRICES);
  const [resourceMembers, setResourceMembers] = useState<ResourceMember[]>(INITIAL_RESOURCES);
  const [transportVehicles, setTransportVehicles] = useState<TransportVehicle[]>(INITIAL_TRANSPORT_VEHICLES);
  
  const [vessels, setVessels] = useState<Vessel[]>([
    { id: 'v_golden', vesselName: 'GOLDEN NOBLE', commodity: 'Giấy cuộn xuất khẩu', consignee: 'DNP TIÊN SA', totalContainers: 10, totalPkgs: 150, totalWeight: 270, eta: '2026-01-15', etd: '2026-01-20', voyageNo: 'E2026' },
    { id: 'v_s12_1', vesselName: 'WAN HAI 272 (S12)', commodity: 'Bột giấy nén tấm', consignee: 'SME LOGISTICS', totalContainers: 15, totalPkgs: 240, totalWeight: 432, eta: '2026-01-12', etd: '2026-01-16', voyageNo: 'S12' }
  ]);

  const [containers, setContainers] = useState<Container[]>([
    // --- HÀNG NHẬP (Tàu WAN HAI 272) ---
    { id: 'c1', vesselId: 'v_s12_1', unitType: UnitType.CONTAINER, containerNo: 'WHSU2024001', size: "40'HC", sealNo: 'W123456', carrier: 'WAN HAI', pkgs: 16, weight: 28.8, customsPkgs: 16, customsWeight: 28.8, billNo: 'BL-WH-01', vendor: 'SUPPLIER A', detExpiry: '2026-01-25', tkNhaVC: 'TK-VC-001', tkDnlOla: 'TK-DNL-001', status: ContainerStatus.COMPLETED, updatedAt: '2026-01-13T09:00:00Z', images: [MOCK_IMAGES[0], MOCK_IMAGES[1]] },
    { id: 'c2', vesselId: 'v_s12_1', unitType: UnitType.CONTAINER, containerNo: 'WHSU2024002', size: "40'HC", sealNo: 'W123457', carrier: 'WAN HAI', pkgs: 16, weight: 28.8, customsPkgs: 16, customsWeight: 28.8, billNo: 'BL-WH-01', vendor: 'SUPPLIER A', detExpiry: '2026-01-25', tkNhaVC: 'TK-VC-001', tkDnlOla: 'TK-DNL-001', status: ContainerStatus.COMPLETED, updatedAt: '2026-01-13T10:30:00Z', images: [MOCK_IMAGES[2]] },
    
    // NHÓM SAI LỆCH TK (TK-SAI-LECH-001): Cont c_sl1 bị sai trọng lượng (customsWeight: 25.0 vs weight: 28.8)
    // Theo yêu cầu: c_sl2 và c_sl3 mặc dù số liệu đúng nhưng chung tờ khai nên cũng phải bị cảnh báo
    { id: 'c_sl1', vesselId: 'v_s12_1', unitType: UnitType.CONTAINER, containerNo: 'TRLU8889991', size: "40'HC", sealNo: 'S111222', carrier: 'WAN HAI', pkgs: 16, weight: 28.8, customsPkgs: 16, customsWeight: 25.0, billNo: 'BL-SL-01', vendor: 'SUPPLIER SL', detExpiry: '2026-01-28', tkNhaVC: 'TK-SAI-LECH-001', tkDnlOla: 'TK-DNL-SL1', status: ContainerStatus.READY, updatedAt: '2026-01-14T08:00:00Z' },
    { id: 'c_sl2', vesselId: 'v_s12_1', unitType: UnitType.CONTAINER, containerNo: 'TRLU8889992', size: "40'HC", sealNo: 'S111223', carrier: 'WAN HAI', pkgs: 16, weight: 28.8, customsPkgs: 16, customsWeight: 28.8, billNo: 'BL-SL-01', vendor: 'SUPPLIER SL', detExpiry: '2026-01-28', tkNhaVC: 'TK-SAI-LECH-001', tkDnlOla: 'TK-DNL-SL1', status: ContainerStatus.READY, updatedAt: '2026-01-14T08:05:00Z' },
    { id: 'c_sl3', vesselId: 'v_s12_1', unitType: UnitType.CONTAINER, containerNo: 'TRLU8889993', size: "40'HC", sealNo: 'S111224', carrier: 'WAN HAI', pkgs: 16, weight: 28.8, customsPkgs: 16, customsWeight: 28.8, billNo: 'BL-SL-01', vendor: 'SUPPLIER SL', detExpiry: '2026-01-28', tkNhaVC: 'TK-SAI-LECH-001', tkDnlOla: 'TK-DNL-SL1', status: ContainerStatus.READY, updatedAt: '2026-01-14T08:10:00Z' },

    // NHÓM CHƯA CÓ TK DNL (Thiếu tkDnlOla)
    { id: 'c_thieu1', vesselId: 'v_s12_1', unitType: UnitType.CONTAINER, containerNo: 'WHNU5556661', size: "40'HC", sealNo: 'S999001', carrier: 'WAN HAI', pkgs: 16, weight: 28.8, billNo: 'BL-THIEU-01', vendor: 'SUPPLIER TH', detExpiry: '2026-01-20', tkNhaVC: 'TK-THIEU-DNL-999', status: ContainerStatus.PENDING, updatedAt: '2026-01-14T09:00:00Z' },
    { id: 'c_thieu2', vesselId: 'v_s12_1', unitType: UnitType.CONTAINER, containerNo: 'WHNU5556662', size: "40'HC", sealNo: 'S999002', carrier: 'WAN HAI', pkgs: 16, weight: 28.8, billNo: 'BL-THIEU-01', vendor: 'SUPPLIER TH', detExpiry: '2026-01-20', tkNhaVC: 'TK-THIEU-DNL-999', status: ContainerStatus.PENDING, updatedAt: '2026-01-14T09:05:00Z' },
    { id: 'c_thieu3', vesselId: 'v_s12_1', unitType: UnitType.CONTAINER, containerNo: 'WHNU5556663', size: "40'HC", sealNo: 'S999003', carrier: 'WAN HAI', pkgs: 16, weight: 28.8, billNo: 'BL-THIEU-01', vendor: 'SUPPLIER TH', detExpiry: '2026-01-20', tkNhaVC: 'TK-THIEU-DNL-999', status: ContainerStatus.PENDING, updatedAt: '2026-01-14T09:10:00Z' },

    // Các dữ liệu lịch sử hoàn tất khác
    { id: 'cgin_1', vesselId: 'v_golden', unitType: UnitType.CONTAINER, containerNo: 'GDNU2026001', size: "40'HC", sealNo: 'GDS-001', carrier: 'EVERGREEN', pkgs: 15, weight: 27.0, customsPkgs: 15, customsWeight: 27.0, billNo: 'BL-GOLD-01', vendor: 'DNP', detExpiry: '2026-01-20', tkNhaVC: 'TK-VC-G01', tkDnlOla: 'TK-DNL-G01', status: ContainerStatus.COMPLETED, updatedAt: '2026-01-15T08:00:00Z', images: [MOCK_IMAGES[0]] },
  ]);

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<SystemUser[]>(() => {
    const savedUsers = localStorage.getItem('danalog_users');
    return savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
  });

  useEffect(() => {
    localStorage.setItem('danalog_users', JSON.stringify(users));
  }, [users]);

  const handleLogin = (user: SystemUser) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) return <Login onLogin={handleLogin} users={users} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'vessels': return <VesselImport vessels={vessels} onUpdateVessels={setVessels} containers={containers} onUpdateContainers={setContainers} transportVehicles={transportVehicles} />;
      case 'operations': return <Operations containers={containers} onUpdateContainers={setContainers} detentionConfig={{urgentDays: 2, warningDays: 5}} vessels={vessels} businessType={businessType} onSwitchBusinessType={setBusinessType} />;
      case 'tally': return <TallyReview containers={containers} vessels={vessels} onUpdateContainers={setContainers} />;
      case 'stats': return <Statistics containers={containers} workOrders={workOrders} vessels={vessels} businessType={businessType} onUpdateWorkOrders={setWorkOrders} />;
      case 'reports': return <ReportsDashboard containers={containers} vessels={vessels} prices={servicePrices} />;
      case 'debit': return <DebitManagement vessels={vessels} containers={containers} workOrders={workOrders} prices={servicePrices} onGoToPricing={() => setActiveTab('pricing')} />;
      case 'pricing': return <PricingConfigPage prices={servicePrices} onUpdatePrices={setServicePrices} />;
      case 'users': return <UserManagement users={users} onUpdateUsers={setUsers} resources={resourceMembers} onUpdateResources={setResourceMembers} currentUserRole={currentUser?.role} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden text-slate-900 font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl no-print">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <ICONS.Ship className="w-5 h-5 text-white" />
             </div>
             <h1 className="text-xl font-black text-white tracking-tighter">DANALOG</h1>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {[
            { id: 'vessels', label: 'Quản lý Tàu', icon: ICONS.Ship },
            { id: 'operations', label: 'Lịch sử khai thác', icon: ICONS.Package },
            { id: 'tally', label: 'Lịch sử Tally', icon: ICONS.ClipboardList },
            { id: 'stats', label: 'Lịch sử PCT', icon: ICONS.TrendingUp },
            { id: 'reports', label: 'Thống kê báo cáo', icon: ICONS.Layout },
            { id: 'debit', label: 'Tính hoá đơn debit', icon: ICONS.FileText },
            { id: 'pricing', label: 'Cấu hình Đơn giá', icon: ICONS.Settings },
            { id: 'users', label: 'Quản lý nhân sự', icon: ICONS.User },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <item.icon className="w-4.5 h-4.5" />
              <span className="font-bold text-[13px]">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm z-20 no-print">
          <div className="flex items-center gap-4">
             <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
             <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Hệ thống Danalog Logistics</h2>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <ICONS.LogOut className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-8 bg-white/40">{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;
