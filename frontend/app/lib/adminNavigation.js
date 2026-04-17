import { humanizeToken } from "@/app/lib/format";

export const adminNavItems = [
  {
    href: "/admin",
    key: "dashboard",
    label: "Tổng quan"
  },
  {
    href: "/admin/shipments",
    key: "shipments",
    label: "Vận đơn"
  },
  {
    href: "/admin/exceptions",
    key: "exceptions",
    label: "Ngoại lệ"
  },
  {
    href: "/admin/rules",
    key: "rules",
    label: "Quy tắc"
  },
  {
    href: "/admin/users",
    key: "users",
    label: "Người dùng"
  },
  {
    href: "/admin/analytics",
    key: "analytics",
    label: "Phân tích"
  }
];

const exactRouteMeta = {
  "/admin": {
    key: "dashboard",
    eyebrow: "Trung tâm quản trị",
    title: "Bảng điều hành hệ thống",
    subtitle: "Theo dõi nhanh số lượng vận đơn, ngoại lệ, quy tắc cảnh báo và người dùng từ một màn hình quản trị thống nhất."
  },
  "/admin/shipments": {
    key: "shipments",
    eyebrow: "Điều phối vận đơn",
    title: "Toàn bộ vận đơn",
    subtitle: "Xem danh sách vận đơn trên toàn hệ thống, đối chiếu người dùng sở hữu và trạng thái cập nhật mới nhất."
  },
  "/admin/exceptions": {
    key: "exceptions",
    eyebrow: "Điều hành ngoại lệ",
    title: "Hàng đợi xử lý ngoại lệ",
    subtitle: "Ưu tiên các trường hợp rủi ro, chuyển trạng thái nhanh và giữ luồng xử lý luôn rõ ràng cho đội vận hành."
  },
  "/admin/rules": {
    key: "rules",
    eyebrow: "Điều khiển phát hiện",
    title: "Kho quy tắc phát hiện",
    subtitle: "Tạo, bật tắt và rà soát các quy tắc đang tham gia phát hiện bất thường trong luồng vận đơn."
  },
  "/admin/users": {
    key: "users",
    eyebrow: "Quản trị tài khoản",
    title: "Người dùng và phân quyền",
    subtitle: "Theo dõi danh sách tài khoản, vai trò đang dùng và chuyển nhanh giữa nhóm khách hàng với quản trị viên."
  },
  "/admin/analytics": {
    key: "analytics",
    eyebrow: "Tín hiệu vận hành",
    title: "Phân tích nhanh",
    subtitle: "Đọc nhanh phân bố ngoại lệ theo loại và mức độ để quyết định ưu tiên xử lý trong ngày."
  }
};

const breadcrumbLabels = {
  admin: "Quản trị"
};

export function getAdminMeta(pathname) {
  if (exactRouteMeta[pathname]) return exactRouteMeta[pathname];

  const navMatch = adminNavItems.find((item) => pathname.startsWith(`${item.href}/`) && item.href !== "/admin");
  if (navMatch) return exactRouteMeta[navMatch.href];

  return exactRouteMeta["/admin"];
}

export function getAdminBreadcrumbs(pathname) {
  if (pathname === "/admin") {
    return [{ href: "/admin", label: "Quản trị" }];
  }

  const segments = pathname.split("/").filter(Boolean);
  let href = "";

  return segments.map((segment) => {
    href = `${href}/${segment}`;
    return {
      href,
      label: breadcrumbLabels[segment] || humanizeToken(segment)
    };
  });
}
