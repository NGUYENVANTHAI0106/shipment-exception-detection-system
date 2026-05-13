import type { ExceptionItem, ExceptionStatus, ExceptionType } from "../types";

export interface CasePlaybookStep {
  label: string;
  detail: string;
  done: boolean;
}

export interface CaseInsight {
  headline: string;
  summary: string;
  likelyCause: string;
  impact: string;
  nextAction: string;
  ownerLabel: string;
  priorityLabel: string;
  escalationLabel: string;
  shipmentStatusLabel: string;
  evidence: string[];
  playbook: CasePlaybookStep[];
  noteTemplates: string[];
}

const STATUS_LABELS: Record<ExceptionStatus, string> = {
  open: "Mới phát hiện",
  in_progress: "Đang xử lý",
  resolved: "Đã xử lý xong",
};

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  in_transit: "Đang trung chuyển",
  failed_delivery: "Giao thất bại",
  address_issue: "Sai/thiếu địa chỉ",
  stuck: "Kẹt tại hub",
  delivered: "Đã giao",
};

function formatHours(hours: number) {
  const h = Math.round(hours * 10) / 10;
  if (h === 0) return "0 giờ";
  if (h < 24) return `${h} giờ`;
  const days = Math.floor(h / 24);
  const remain = Math.round((h % 24) * 10) / 10;
  if (remain === 0) return `${days} ngày`;
  return `${days} ngày ${remain} giờ`;
}

export function formatExceptionType(type: ExceptionType) {
  if (type === "delay") return "Trễ hạn";
  if (type === "failed_delivery") return "Giao thất bại";
  if (type === "address_issue") return "Địa chỉ";
  return "Kẹt hàng";
}

/** Dịch reason do detector cũ sinh ra (tiếng Anh) sang tiếng Việt. */
export function formatReason(raw: string | null | undefined): string {
  if (!raw) return "Không rõ lý do";
  const text = raw.trim();
  let m: RegExpExecArray | null;

  m = /^Delivery failed after (\d+) attempt\(s\)$/i.exec(text);
  if (m) return `Đã giao thất bại ${m[1]} lần`;

  m = /^No status update for (\d+) hours$/i.exec(text);
  if (m) return `Không có cập nhật trạng thái trong ${m[1]} giờ`;

  m = /^Overdue by ([\d.]+) hours\s*[—-]\s*expected (.+)$/i.exec(text);
  if (m) return `Trễ giao ${m[1]} giờ — dự kiến giao ${m[2]}`;

  m = /^Carrier cannot verify delivery address for (.+)$/i.exec(text);
  if (m) return `Hãng vận chuyển không xác minh được địa chỉ tại ${m[1]}`;

  return text;
}

/** Nhãn + chữ hiển thị giờ cho cột “hạn / trễ” (tránh gọi mọi loại là “trễ giao”). */
export function getOverdueUiParts(item: ExceptionItem): { label: string; valueText: string } {
  const h = item.overdue_hours;
  const staleNote = h === 0 ? "— (bản ghi cũ, chưa có số giờ)" : formatHours(h);
  if (item.exception_type === "delay") {
    return { label: "Trễ so với dự kiến giao", valueText: formatHours(h) };
  }
  if (item.exception_type === "stuck") {
    return { label: "Không cập nhật trạng thái", valueText: staleNote };
  }
  if (item.exception_type === "failed_delivery") {
    if (h > 0) return { label: "Quá hạn dự kiến giao", valueText: formatHours(h) };
    return { label: "Giao thất bại (theo hãng)", valueText: "—" };
  }
  if (item.exception_type === "address_issue") {
    return { label: "Lâu không cập nhật vận đơn", valueText: staleNote };
  }
  return { label: "Trễ giao", valueText: formatHours(h) };
}

export function formatExceptionStatus(status: ExceptionStatus) {
  return STATUS_LABELS[status];
}

export function formatShipmentStatus(status?: string | null) {
  if (!status) return "Chưa rõ trạng thái";
  return SHIPMENT_STATUS_LABELS[status] || status;
}

export function formatSlaCountdown(item: ExceptionItem): string {
  if (!item.deadline_at) return "Chưa có hạn xử lý";
  const remainMs = new Date(item.deadline_at).getTime() - Date.now();
  const absHours = Math.floor(Math.abs(remainMs) / 3600000);
  const absMinutes = Math.floor((Math.abs(remainMs) % 3600000) / 60000);
  const display = absHours > 0 ? `${absHours} giờ ${absMinutes} phút` : `${absMinutes} phút`;
  return remainMs >= 0 ? `Còn ${display}` : `Trễ ${display}`;
}

export function getSlaLabel(item: ExceptionItem): { text: string; className: string } {
  if (item.status === "resolved") return { text: "Đã đóng", className: "status-sla-ok" };
  if (item.sla_breached) return { text: `Quá hạn xử lý • ${formatSlaCountdown(item)}`, className: "status-sla-breached" };
  if (!item.deadline_at) return { text: "Chưa có hạn xử lý", className: "status-sla-unknown" };
  const remainMs = new Date(item.deadline_at).getTime() - Date.now();
  if (remainMs <= 0) return { text: `Quá hạn xử lý • ${formatSlaCountdown(item)}`, className: "status-sla-breached" };
  if (remainMs <= 2 * 3600 * 1000) return { text: `Sắp quá hạn • ${formatSlaCountdown(item)}`, className: "status-sla-warning" };
  return { text: `Trong hạn • ${formatSlaCountdown(item)}`, className: "status-sla-ok" };
}

export function getUrgencyScore(item: ExceptionItem) {
  if (item.status === "resolved") return -1;
  const severityScore = { CRITICAL: 500, HIGH: 300, MEDIUM: 180, LOW: 80 }[item.severity];
  const overdueScore = Math.min(item.overdue_hours * 4, 220);
  const slaScore = item.sla_breached ? 180 : 0;
  const unassignedScore = item.assignee ? 0 : 60;
  return severityScore + overdueScore + slaScore + unassignedScore;
}

export function getCaseIssueLabel(item: ExceptionItem) {
  if (item.exception_type === "delay") {
    return `Đơn đang chậm giao ${formatHours(item.overdue_hours)}.`;
  }
  if (item.exception_type === "failed_delivery") {
    return `Đơn đã giao thất bại ${item.failed_attempts ?? 0} lần.`;
  }
  if (item.exception_type === "stuck") {
    return `Đơn không có di chuyển mới trong ${formatHours(item.overdue_hours)}.`;
  }
  return `Đơn đang thiếu hoặc sai thông tin địa chỉ giao — ${formatHours(item.overdue_hours)} không có cập nhật vận đơn mới.`;
}

export function getCaseSignalSummary(item: ExceptionItem) {
  if (item.exception_type === "delay") {
    return `Hiện đơn vẫn ở trạng thái ${formatShipmentStatus(item.shipment_status).toLowerCase()}.`;
  }
  if (item.exception_type === "failed_delivery") {
    return item.failed_attempts && item.failed_attempts > 0
      ? `Đã có ${item.failed_attempts} lần giao thất bại nên cần chốt lại phương án giao.`
      : "Đơn phát sinh lỗi ở chặng giao cuối.";
  }
  if (item.exception_type === "stuck") {
    return "Khả năng cao hàng đang bị kẹt tại hub hoặc chưa được đẩy chuyến tiếp theo.";
  }
  return "Carrier chưa thể giao tiếp vì dữ liệu địa chỉ chưa đủ rõ.";
}

export function getCaseOwnerSummary(item: ExceptionItem) {
  if (item.assignee) return `${item.assignee} đang xử lý case này.`;
  return "Case này chưa có người nhận xử lý.";
}

export function getCaseActionLabel(item: ExceptionItem) {
  if (item.exception_type === "delay") {
    return item.sla_breached ? "Gọi carrier để chốt ETA mới ngay." : "Kiểm tra ETA và quyết định bước tiếp theo.";
  }
  if (item.exception_type === "failed_delivery") {
    return "Liên hệ carrier và người nhận để chốt lịch giao lại.";
  }
  if (item.exception_type === "stuck") {
    return "Xác định hub giữ hàng và mở ticket xử lý.";
  }
  return "Xác minh lại địa chỉ rồi cập nhật cho carrier.";
}

function buildEvidence(item: ExceptionItem) {
  const evidence = [
    `${formatExceptionType(item.exception_type)} trên tuyến ${item.origin} -> ${item.destination}.`,
    `Đơn đã quá ngưỡng ${formatHours(item.overdue_hours)} kể từ thời điểm cần xử lý.`,
    `Đơn hiện ở trạng thái ${formatShipmentStatus(item.shipment_status)}.`,
  ];

  if (item.failed_attempts && item.failed_attempts > 0) {
    evidence.push(`Đã có ${item.failed_attempts} lần giao/tiếp cận thất bại trước đó.`);
  }

  if (item.shipment_last_updated) {
    evidence.push(`Vận đơn cập nhật gần nhất lúc ${new Date(item.shipment_last_updated).toLocaleString("vi-VN")}.`);
  }

  if (item.channels_sent && item.channels_sent.length > 0) {
    evidence.push(`Cảnh báo đã đi qua ${item.channels_sent.join(", ")}.`);
  } else {
    evidence.push("Case chưa phát sinh bất kỳ thông báo nào ra ngoài.");
  }

  return evidence;
}

function buildPlaybook(item: ExceptionItem, nextAction: string) {
  const alerted = Boolean(item.notified_at || item.channels_sent?.length);
  const claimed = Boolean(item.assignee);
  const inFlight = item.status === "in_progress";

  const typeSpecificDetail: Record<ExceptionType, [string, string, string]> = {
    delay: [
      "Kiểm tra lần quét mới nhất và kho đang giữ hàng.",
      "Gọi hãng vận chuyển để chốt thời gian giao mới hoặc chuyến xe kế tiếp.",
      "Cam kết lại thời gian giao với các bên liên quan.",
    ],
    failed_delivery: [
      "Xác minh lý do giao thất bại với người giao hoặc đội tại địa phương của hãng.",
      "Liên hệ người nhận để chốt khung giờ nhận hàng khả thi.",
      "Đặt lịch giao lại hoặc đổi phương thức giao phù hợp.",
    ],
    stuck: [
      "Xác định kho trung chuyển hoặc tuyến đang làm hàng bị kẹt.",
      "Mở yêu cầu nội bộ với phòng điều phối của hãng hoặc đội vận chuyển tuyến dài.",
      "Chốt phương án đổi tuyến hoặc đẩy chuyến khẩn.",
    ],
    address_issue: [
      "Đối chiếu địa chỉ hiện tại với dữ liệu đơn gốc.",
      "Gọi người gửi/người nhận để bổ sung thông tin thiếu.",
      "Cập nhật lại địa chỉ và cho phép hãng tiếp tục điều phối giao.",
    ],
  };

  const [step1, step2, step3] = typeSpecificDetail[item.exception_type];

  return [
    {
      label: "Xác minh tình trạng thực tế",
      detail: step1,
      done: inFlight || item.status === "resolved",
    },
    {
      label: "Nhận xử lý case",
      detail: claimed ? `Case hiện do ${item.assignee} xử lý.` : "Case hiện chưa có người nhận.",
      done: claimed,
    },
    {
      label: "Thực hiện can thiệp nghiệp vụ",
      detail: step2,
      done: alerted || item.status === "resolved",
    },
    {
      label: "Chốt bước tiếp theo",
      detail: `${step3} ${nextAction}`,
      done: item.status === "resolved",
    },
  ];
}

export function buildCaseInsight(item: ExceptionItem): CaseInsight {
  const shipmentStatusLabel = formatShipmentStatus(item.shipment_status);
  const ownerLabel = item.assignee ? item.assignee : "Chưa có người nhận case";

  let headline = "";
  let summary = "";
  let likelyCause = "";
  let impact = "";
  let nextAction = "";
  let escalationLabel = "Theo dõi nội bộ";
  let priorityLabel = "Theo dõi có kiểm soát";
  let noteTemplates: string[] = [];

  switch (item.exception_type) {
    case "delay":
      headline = `Đơn ${item.tracking_number} đang chậm giao trên tuyến ${item.origin} -> ${item.destination}.`;
      summary = `Hệ thống gắn cờ vì đơn đã quá dự kiến ${formatHours(item.overdue_hours)} nhưng vẫn ở trạng thái ${shipmentStatusLabel.toLowerCase()}.`;
      likelyCause = item.overdue_hours >= 48
        ? "Khả năng cao hàng đang chậm trung chuyển hoặc hãng chưa đẩy chuyến tiếp theo đúng hạn."
        : "Đây có thể là chậm cập nhật vị trí, chậm trung chuyển nhẹ hoặc tắc luồng giao cuối ngày.";
      impact = item.severity === "CRITICAL"
        ? "Nguy cơ vỡ cam kết giao hàng và phát sinh khiếu nại từ khách."
        : "Nếu không can thiệp sớm, case sẽ chuyển từ theo dõi sang vi phạm hạn xử lý thực tế.";
      nextAction = item.sla_breached
        ? "Cần gọi trực tiếp người phụ trách của hãng để chốt thời gian giao mới và cập nhật ngay vào ghi chú xử lý."
        : "Xác minh lần quét gần nhất, hỏi thời gian giao dự kiến của hãng và quyết định bước tiếp theo.";
      escalationLabel = item.sla_breached ? "Ưu tiên xử lý ngay" : "Theo dõi sát hạn xử lý";
      priorityLabel = item.severity === "CRITICAL" ? "Ưu tiên khóa đỏ" : "Ưu tiên cao trong ca";
      noteTemplates = [
        "Đã kiểm tra vận đơn và xác định đơn đang chậm trung chuyển tại kho.",
        "Đã gọi hãng vận chuyển để lấy thời gian giao mới, đang chờ phản hồi.",
        "Đã cập nhật khách hàng về thời gian giao mới dự kiến.",
      ];
      break;
    case "failed_delivery":
      headline = `Đơn ${item.tracking_number} đã giao thất bại ${item.failed_attempts ?? 0} lần.`;
      summary = "Case này cần xử lý như một vấn đề giao chặng cuối, không chỉ là một dòng trạng thái lỗi.";
      likelyCause = item.failed_attempts && item.failed_attempts >= 2
        ? "Khả năng cao người nhận không sẵn sàng, thông tin liên lạc chưa khớp hoặc đội tại địa phương của hãng thiếu phương án giao lại."
        : "Có thể do người nhận vắng mặt, không nghe máy hoặc khung giờ giao hiện tại không phù hợp.";
      impact = "Nếu không chốt lại lịch giao hoặc phương án thay thế, đơn dễ chuyển sang hoàn hàng hoặc khiếu nại khách hàng.";
      nextAction = "Liên hệ hãng vận chuyển và người nhận trong cùng một vòng xử lý để chốt ngay khung giờ giao lại hoặc phương án thay thế.";
      escalationLabel = item.failed_attempts && item.failed_attempts >= 3 ? "Cần xử lý ngay" : "Có thể xử lý ở tuyến đầu";
      priorityLabel = item.failed_attempts && item.failed_attempts >= 3 ? "Ưu tiên cao vì lặp lỗi" : "Ưu tiên xử lý trong ngày";
      noteTemplates = [
        "Đã xác minh lý do giao thất bại với đội tại địa phương của hãng.",
        "Đã liên hệ người nhận để xác nhận khung giờ giao lại.",
        "Đã yêu cầu hãng đặt lịch giao lại và theo dõi đến khi giao thành công.",
      ];
      break;
    case "stuck":
      headline = `Đơn ${item.tracking_number} có dấu hiệu kẹt hàng kéo dài.`;
      summary = `Hệ thống phát hiện đơn không có di chuyển thực chất trong ${formatHours(item.overdue_hours)}.`;
      likelyCause = "Hàng có thể đang mắc ở kho trung chuyển, đội vận chuyển tuyến dài chưa xuất bến hoặc bị treo do lỗi điều phối của hãng.";
      impact = "Đây là nhóm case dễ tạo tồn đọng dây chuyền nếu không xử lý dứt điểm.";
      nextAction = "Mở yêu cầu với phòng điều phối của hãng, xác định kho giữ hàng và chốt rõ: đổi tuyến, đẩy chuyến khẩn hay hoàn hàng.";
      escalationLabel = "Cần xử lý sớm";
      priorityLabel = "Ưu tiên khóa đỏ";
      noteTemplates = [
        "Đã xác định đơn bị kẹt tại kho và đang chờ hãng phản hồi.",
        "Đã mở yêu cầu khẩn với bộ phận điều phối tuyến dài/phòng điều phối của hãng.",
        "Đã yêu cầu phương án đổi tuyến hoặc đẩy chuyến ưu tiên.",
      ];
      break;
    case "address_issue":
      headline = `Đơn ${item.tracking_number} đang thiếu hoặc sai thông tin địa chỉ giao.`;
      summary = "Đây là case dữ liệu vận hành chưa đủ để giao tiếp, nên cần xác minh thông tin trước khi đẩy tiếp.";
      likelyCause = "Địa chỉ không đầy đủ, sai mã phường/xã hoặc thiếu điểm nhận chi tiết khiến hãng không thể điều phối giao.";
      impact = "Nếu xử lý muộn, đơn sẽ tiếp tục treo trong trạng thái chờ xác minh và gây chậm giao không cần thiết.";
      nextAction = "Xác minh địa chỉ với người gửi/người nhận, cập nhật bản chuẩn rồi mới bàn giao lại cho hãng vận chuyển.";
      escalationLabel = "Xác minh dữ liệu trước";
      priorityLabel = "Ưu tiên xác minh nhanh";
      noteTemplates = [
        "Đã gọi khách để xác minh lại địa chỉ nhận hàng.",
        "Đã đối chiếu địa chỉ với đơn gốc và phát hiện thông tin thiếu.",
        "Đã cập nhật địa chỉ chuẩn và sẵn sàng để hãng điều phối giao tiếp.",
      ];
      break;
  }

  return {
    headline,
    summary,
    likelyCause,
    impact,
    nextAction,
    ownerLabel,
    priorityLabel,
    escalationLabel,
    shipmentStatusLabel,
    evidence: buildEvidence(item),
    playbook: buildPlaybook(item, nextAction),
    noteTemplates,
  };
}
