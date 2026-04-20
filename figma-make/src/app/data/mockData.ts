export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ExceptionType = 'Trễ hạn' | 'Giao thất bại' | 'Kẹt' | 'Địa chỉ';
export type Carrier = 'GHN' | 'GHTK' | 'Viettel Post' | 'J&T';
export type Status = 'open' | 'notified' | 'in_progress' | 'resolved';

export interface Exception {
  id: string;
  severity: Severity;
  type: ExceptionType;
  trackingCode: string;
  carrier: Carrier;
  origin: string;
  destination: string;
  overduehours: number;
  status: Status;
  detectedAt: string;
  expectedDelivery: string;
  failedAttempts?: number;
  aiSuggestion?: string;
  aiConfidence?: number;
  aiAvailable: boolean;
  notes?: string;
  escalated?: boolean;
}

export const mockExceptions: Exception[] = [
  {
    id: 'EXC-001',
    severity: 'CRITICAL',
    type: 'Trễ hạn',
    trackingCode: 'TRK-GH2604001',
    carrier: 'GHN',
    origin: 'Hà Nội',
    destination: 'TP. Hồ Chí Minh',
    overduehours: 36,
    status: 'open',
    detectedAt: '2026-04-20T08:30:00',
    expectedDelivery: '2026-04-18T17:00:00',
    aiSuggestion: 'Đơn hàng bị kẹt tại hub Đà Nẵng do thời tiết xấu. Đề xuất: (1) Liên hệ hub Đà Nẵng xác nhận tình trạng lô hàng, (2) Thông báo khách hàng về tình trạng trễ hạn và thời gian giao dự kiến mới, (3) Xem xét đổi tuyến vận chuyển nếu có thể.',
    aiConfidence: 92,
    aiAvailable: true,
  },
  {
    id: 'EXC-002',
    severity: 'CRITICAL',
    type: 'Giao thất bại',
    trackingCode: 'TRK-VT2604002',
    carrier: 'Viettel Post',
    origin: 'Đà Nẵng',
    destination: 'Hải Phòng',
    overduehours: 48,
    status: 'notified',
    detectedAt: '2026-04-19T14:20:00',
    expectedDelivery: '2026-04-17T16:00:00',
    failedAttempts: 3,
    aiSuggestion: 'Giao thất bại 3 lần do khách hàng không nhận máy. Đề xuất: (1) Gọi điện xác nhận lại thời gian giao hàng phù hợp với khách, (2) Cân nhắc chuyển đến bưu cục gần nhất để khách tự đến lấy, (3) Kiểm tra lại số điện thoại liên hệ.',
    aiConfidence: 88,
    aiAvailable: true,
  },
  {
    id: 'EXC-003',
    severity: 'HIGH',
    type: 'Kẹt',
    trackingCode: 'TRK-JT2604003',
    carrier: 'J&T',
    origin: 'Cần Thơ',
    destination: 'Biên Hòa',
    overduehours: 24,
    status: 'in_progress',
    detectedAt: '2026-04-19T22:15:00',
    expectedDelivery: '2026-04-20T12:00:00',
    aiSuggestion: 'Không có cập nhật trạng thái trong 24 giờ qua. Đề xuất: Liên hệ trực tiếp với bưu tá phụ trách để xác nhận tình trạng đơn hàng.',
    aiConfidence: 85,
    aiAvailable: true,
  },
  {
    id: 'EXC-004',
    severity: 'HIGH',
    type: 'Địa chỉ',
    trackingCode: 'TRK-GH2604004',
    carrier: 'GHTK',
    origin: 'Nha Trang',
    destination: 'Vũng Tàu',
    overduehours: 18,
    status: 'open',
    detectedAt: '2026-04-20T06:00:00',
    expectedDelivery: '2026-04-21T10:00:00',
    aiAvailable: false,
    aiSuggestion: 'Theo quy tắc: Địa chỉ không đầy đủ - cần liên hệ người gửi để bổ sung thông tin.',
  },
  {
    id: 'EXC-005',
    severity: 'MEDIUM',
    type: 'Trễ hạn',
    trackingCode: 'TRK-VT2604005',
    carrier: 'Viettel Post',
    origin: 'Huế',
    destination: 'Quy Nhơn',
    overduehours: 12,
    status: 'open',
    detectedAt: '2026-04-20T09:45:00',
    expectedDelivery: '2026-04-19T21:00:00',
    aiSuggestion: 'Trễ hạn nhẹ do lượng đơn hàng cao vào cuối tuần. Đề xuất: Theo dõi thêm 6 giờ, nếu không có cập nhật thì leo thang.',
    aiConfidence: 78,
    aiAvailable: true,
  },
  {
    id: 'EXC-006',
    severity: 'MEDIUM',
    type: 'Giao thất bại',
    trackingCode: 'TRK-JT2604006',
    carrier: 'J&T',
    origin: 'Bắc Ninh',
    destination: 'Thái Nguyên',
    overduehours: 8,
    status: 'notified',
    detectedAt: '2026-04-20T11:20:00',
    expectedDelivery: '2026-04-20T08:00:00',
    failedAttempts: 1,
    aiSuggestion: 'Giao thất bại lần đầu do khách vắng nhà. Đề xuất: Lên lịch giao lại trong khung giờ chiều.',
    aiConfidence: 91,
    aiAvailable: true,
  },
  {
    id: 'EXC-007',
    severity: 'LOW',
    type: 'Kẹt',
    trackingCode: 'TRK-GH2604007',
    carrier: 'GHN',
    origin: 'Long An',
    destination: 'Tiền Giang',
    overduehours: 6,
    status: 'in_progress',
    detectedAt: '2026-04-20T12:00:00',
    expectedDelivery: '2026-04-20T18:00:00',
    aiSuggestion: 'Chậm cập nhật nhẹ, có thể do hệ thống. Tiếp tục theo dõi.',
    aiConfidence: 65,
    aiAvailable: true,
  },
  {
    id: 'EXC-008',
    severity: 'LOW',
    type: 'Trễ hạn',
    trackingCode: 'TRK-GH2604008',
    carrier: 'GHTK',
    origin: 'Hà Nội',
    destination: 'Hà Nam',
    overduehours: 4,
    status: 'open',
    detectedAt: '2026-04-20T13:15:00',
    expectedDelivery: '2026-04-20T09:00:00',
    aiSuggestion: 'Trễ hạn nhỏ trên tuyến ngắn. Đơn hàng đang trên đường giao.',
    aiConfidence: 72,
    aiAvailable: true,
  },
];

export interface TimelineEvent {
  timestamp: string;
  event: string;
  description: string;
}

export const getTimelineForException = (id: string): TimelineEvent[] => {
  const baseEvents: TimelineEvent[] = [
    {
      timestamp: '2026-04-20T08:30:00',
      event: 'Phát hiện ngoại lệ',
      description: 'Hệ thống tự động phát hiện đơn hàng quá hạn giao'
    },
    {
      timestamp: '2026-04-20T08:31:15',
      event: 'Phân loại tự động',
      description: 'AI đánh giá mức độ CRITICAL và đề xuất hành động'
    },
    {
      timestamp: '2026-04-20T08:32:00',
      event: 'Gửi cảnh báo',
      description: 'Thông báo đã được gửi đến đội vận hành qua email và Slack'
    },
  ];

  return baseEvents;
};
