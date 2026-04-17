import { humanizeToken } from "@/app/lib/format";

export const portalNavItems = [
  {
    href: "/",
    label: "Tổng quan",
    kicker: "Bàn điều phối",
    description: "Xem nhanh sức khỏe hệ thống, lối tắt thao tác và tín hiệu vận hành"
  },
  {
    href: "/shipments",
    label: "Vận đơn",
    kicker: "Sổ di chuyển",
    description: "Theo dõi tuyến đang chạy, thời gian giao dự kiến và cập nhật mới nhất từ hãng vận chuyển"
  },
  {
    href: "/exceptions",
    label: "Ngoại lệ",
    kicker: "Hàng đợi rủi ro",
    description: "Ưu tiên xử lý các ca chậm tiến độ, thất bại giao nhận và điều tra thủ công"
  },
  {
    href: "/upload",
    label: "Nhập liệu",
    kicker: "Bàn tiếp nhận",
    description: "Tạo nhanh vận đơn mẫu trong lúc luồng nhập CSV đang được mở rộng"
  }
];

const exactRouteMeta = {
  "/": {
    eyebrow: "Cổng khách hàng",
    title: "Bàn điều hành vận đơn",
    subtitle: "Một giao diện rõ ràng để theo dõi vận đơn, ngoại lệ và các thao tác nhập liệu hằng ngày."
  },
  "/shipments": {
    eyebrow: "Tầm nhìn vận đơn",
    title: "Sổ theo dõi vận đơn",
    subtitle: "Quan sát luồng di chuyển theo thời gian thực, phát hiện tuyến chậm và quét nhanh toàn bộ danh sách."
  },
  "/exceptions": {
    eyebrow: "Điều phối ngoại lệ",
    title: "Hàng đợi ngoại lệ đang mở",
    subtitle: "Ưu tiên rủi ro theo mức độ, theo dõi tiến trình xử lý và giữ phản hồi luôn minh bạch cho đội vận hành."
  },
  "/upload": {
    eyebrow: "Luồng tiếp nhận",
    title: "Khu vực nhập liệu thủ công",
    subtitle: "Tạo nhanh vận đơn kiểm thử hôm nay, đồng thời giữ chỗ cho luồng nhập CSV có hướng dẫn trong giai đoạn tiếp theo."
  },
  "/login": {
    eyebrow: "Kiểm soát truy cập",
    title: "Đăng nhập cổng vận đơn",
    subtitle: "Dùng tài khoản mẫu để xác thực nhanh, lưu token cục bộ và kiểm tra các màn hình bằng API thật."
  }
};

const breadcrumbLabels = {
  shipments: "Vận đơn",
  exceptions: "Ngoại lệ",
  upload: "Nhập liệu",
  login: "Đăng nhập",
  admin: "Quản trị"
};

export function getPortalMeta(pathname) {
  if (exactRouteMeta[pathname]) return exactRouteMeta[pathname];

  const navMatch = portalNavItems.find((item) => pathname.startsWith(`${item.href}/`) && item.href !== "/");
  if (navMatch) return exactRouteMeta[navMatch.href];

  return exactRouteMeta["/"];
}

export function getPortalBreadcrumbs(pathname) {
  if (pathname === "/") {
    return [{ href: "/", label: "Tổng quan" }];
  }

  const segments = pathname.split("/").filter(Boolean);
  let href = "";

  return [
    { href: "/", label: "Tổng quan" },
    ...segments.map((segment) => {
      href = `${href}/${segment}`;
      return {
        href,
        label: breadcrumbLabels[segment] || humanizeToken(segment)
      };
    })
  ];
}
