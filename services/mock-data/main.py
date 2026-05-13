from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from uuid import uuid4

try:
    from fastapi import FastAPI, Query
except ModuleNotFoundError:  # pragma: no cover
    class FastAPI:  # type: ignore[override]
        def __init__(self, *args, **kwargs) -> None:
            pass

        def get(self, *_args, **_kwargs):
            def decorator(func):
                return func

            return decorator

    def Query(default=None, **_kwargs):  # type: ignore[misc]
        return default

app = FastAPI(title="mock-data-service", version="0.3.0")

CARRIERS = ["GHN", "GHTK", "ViettelPost", "J&T Express"]

CITY_AREAS: dict[str, list[str]] = {
    "Hà Nội": ["Cầu Giấy", "Đống Đa", "Hoàn Kiếm", "Hà Đông", "Long Biên", "Thanh Xuân", "Hai Bà Trưng"],
    "TP. Hồ Chí Minh": ["Quận 1", "Quận 3", "Quận 7", "Thủ Đức", "Bình Thạnh", "Tân Bình", "Gò Vấp", "Phú Nhuận"],
    "Đà Nẵng": ["Hải Châu", "Sơn Trà", "Thanh Khê", "Liên Chiểu", "Ngũ Hành Sơn"],
    "Cần Thơ": ["Ninh Kiều", "Cái Răng", "Bình Thủy", "Ô Môn"],
    "Hải Phòng": ["Lê Chân", "Ngô Quyền", "Hồng Bàng", "Kiến An", "Dương Kinh"],
    "Nha Trang": ["Vĩnh Hải", "Phước Hải", "Lộc Thọ", "Vĩnh Phước"],
    "Biên Hòa": ["Tân Phong", "Trảng Dài", "Long Bình", "Bửu Long"],
}

FIRST_NAMES_VN = [
    "Nguyễn Văn", "Nguyễn Thị", "Trần Văn", "Trần Thị", "Lê Văn", "Lê Thị",
    "Phạm Văn", "Phạm Thị", "Hoàng Văn", "Hoàng Thị", "Huỳnh Văn", "Huỳnh Thị",
    "Phan Văn", "Phan Thị", "Vũ Văn", "Vũ Thị", "Võ Văn", "Võ Thị",
    "Đặng Văn", "Đặng Thị", "Bùi Văn", "Bùi Thị", "Đỗ Văn", "Đỗ Thị",
    "Ngô Văn", "Ngô Thị", "Dương Văn", "Dương Thị", "Lý Thị", "Trương Văn",
]

LAST_NAMES_VN = [
    "An", "Anh", "Bảo", "Bình", "Cường", "Dũng", "Duy", "Đạt", "Đức", "Hà",
    "Hải", "Hạnh", "Hậu", "Hiền", "Hiếu", "Hoà", "Hoàng", "Huy", "Hùng",
    "Khánh", "Khoa", "Lan", "Linh", "Long", "Mai", "Minh", "My", "Nam",
    "Nga", "Ngân", "Ngọc", "Nhung", "Oanh", "Phong", "Phương", "Quân",
    "Quang", "Quỳnh", "Sơn", "Thảo", "Thắng", "Thành", "Thiện", "Thư",
    "Thuỳ", "Tiến", "Trang", "Trinh", "Trung", "Tuấn", "Tú", "Tùng",
    "Vân", "Vinh", "Việt", "Yến",
]

STREETS_VN = [
    "Nguyễn Trãi", "Lê Lợi", "Trần Hưng Đạo", "Hai Bà Trưng",
    "Lý Thường Kiệt", "Phạm Ngũ Lão", "Cách Mạng Tháng 8",
    "Nguyễn Huệ", "Võ Văn Tần", "Phan Đình Phùng", "Nguyễn Văn Cừ",
    "Điện Biên Phủ", "Pasteur", "Nguyễn Thị Minh Khai", "Bà Triệu",
    "Lê Duẩn", "Quang Trung", "Tô Hiến Thành", "Đinh Tiên Hoàng",
    "Nguyễn Công Trứ", "Trần Phú", "Nguyễn Đình Chiểu",
]

PHONE_PREFIXES = [
    "090", "091", "093", "094", "096", "097", "098",
    "032", "033", "034", "035", "036", "037", "038", "039",
    "070", "076", "077", "078", "079",
    "081", "082", "083", "084", "085", "088",
    "056", "058", "059",
]

PRODUCT_BUNDLES = [
    ("1 hộp mỹ phẩm Innisfree + 1 son MAC", 850_000, 0.4, 1),
    ("Combo 3 áo thun Uniqlo size M", 1_200_000, 0.6, 1),
    ("Tai nghe Sony WH-1000XM4 màu đen", 6_500_000, 0.6, 1),
    ("Đơn tiêu dùng gia đình 4kg (sữa, bỉm, bột giặt)", 480_000, 4.2, 2),
    ("Giày thể thao Nike Air Force 1 size 42", 2_300_000, 0.9, 1),
    ("Sách giáo trình đại học (4 cuốn)", 320_000, 1.8, 1),
    ("Phụ kiện điện thoại (cáp + ốp lưng + kính cường lực)", 280_000, 0.2, 1),
    ("Hộp bánh trung thu Kinh Đô 8 cái", 690_000, 1.5, 1),
    ("Máy sấy tóc Dyson Supersonic", 9_900_000, 1.3, 1),
    ("Quần tây nam 2 chiếc", 780_000, 0.7, 1),
    ("Ấm siêu tốc Lock&Lock 1.7L", 350_000, 1.2, 1),
    ("Nồi cơm điện Sharp 1.8L", 1_180_000, 3.5, 1),
    ("Đồ chơi trẻ em LEGO Classic", 1_450_000, 1.1, 1),
    ("Bộ chăn ga gối Sông Hồng size 1m6", 1_650_000, 2.4, 1),
    ("Vitamin tổng hợp Centrum 100 viên", 520_000, 0.5, 1),
]

SCAN_NOTES: dict[str, list[tuple[str, str]]] = {
    "in_transit": [
        ("Kho trung chuyển Tân Phú - HCM", "Đã nhập kho, đang chờ chuyển tuyến"),
        ("Hub miền Trung Đà Nẵng", "Chờ kết nối chuyến kế tiếp"),
        ("Bưu cục khu vực Hà Đông", "Đang phân tuyến giao cuối"),
        ("Trạm trung chuyển Long Biên", "Đã xuất kho nhưng chưa cập nhật chặng tiếp"),
    ],
    "stuck": [
        ("Hub miền Bắc - Gia Lâm", "Chờ xe sang chặng tiếp theo (đã quá 60 giờ)"),
        ("Kho phân loại Bắc Từ Liêm", "Không có cập nhật mới trong 70 giờ"),
        ("Trung tâm chia chọn Bình Dương", "Đơn không xuất khỏi kho qua 3 ngày"),
    ],
    "failed": [
        ("Khu vực giao hàng cuối", "Khách không nghe máy sau 3 lần gọi"),
        ("Khu vực giao hàng cuối", "Sai địa chỉ - shipper không tìm được nhà"),
        ("Khu vực giao hàng cuối", "Khách nhờ giao lại sang ngày khác"),
        ("Khu vực giao hàng cuối", "Khách từ chối nhận - hàng móp hộp"),
    ],
    "address_issue": [
        ("Bưu cục dịch vụ", "Địa chỉ thiếu số nhà, cần xác minh"),
        ("Khu vực giao hàng cuối", "Khách ở khu chung cư thiếu số phòng"),
        ("Trung tâm chăm sóc khách hàng", "Số điện thoại không liên lạc được"),
    ],
}

ACTIVE_STATUSES = ["in_transit", "failed", "stuck", "address_issue"]


def generate_tracking_number() -> str:
    return f"TRK-{random.choice(['GH', 'VT', 'JT', 'GK'])}{random.randint(1000, 9999)}{random.choice(['AB', 'CD', 'EF'])}"


def _make_phone() -> str:
    return f"{random.choice(PHONE_PREFIXES)}{random.randint(1000000, 9999999)}"


def _make_name() -> str:
    return f"{random.choice(FIRST_NAMES_VN)} {random.choice(LAST_NAMES_VN)}"


def _make_address(city: str) -> str:
    area = random.choice(CITY_AREAS.get(city, ["Trung tâm"]))
    return f"{random.randint(10, 250)} {random.choice(STREETS_VN)}, {area}, {city}"


def _make_last_scan(status: str) -> tuple[str, str]:
    return random.choice(SCAN_NOTES.get(status, SCAN_NOTES["in_transit"]))


def generate_shipment(force_exception: bool) -> dict:
    now = datetime.now(timezone.utc)
    created_at = now - timedelta(days=random.randint(1, 7))
    base_status = random.choice(ACTIVE_STATUSES if force_exception else ["in_transit"])
    failed_attempts = random.randint(0, 4) if base_status == "failed" else random.randint(0, 1)

    if base_status == "in_transit":
        overdue_hours = random.choice([6, 12, 20, 30, 54, 80]) if force_exception else random.choice([2, 4, 8, 16])
        expected_delivery = now - timedelta(hours=overdue_hours)
        last_updated = now - timedelta(hours=random.choice([1, 6, 12, 24]))
    elif base_status == "stuck":
        expected_delivery = now - timedelta(hours=random.choice([26, 40, 72]))
        last_updated = now - timedelta(hours=random.choice([52, 70, 110]))
    else:
        expected_delivery = now + timedelta(hours=random.randint(4, 48))
        last_updated = now - timedelta(hours=random.choice([2, 8, 20]))

    origin, destination = random.sample(list(CITY_AREAS.keys()), 2)

    product, base_value, weight, packages = random.choice(PRODUCT_BUNDLES)
    cod_amount = base_value if random.random() < 0.55 else 0
    scan_location, scan_note = _make_last_scan(base_status)

    return {
        "id": str(uuid4()),
        "tracking_number": generate_tracking_number(),
        "carrier": random.choice(CARRIERS),
        "origin": origin,
        "destination": destination,
        "expected_delivery": expected_delivery.isoformat(),
        "actual_delivery": None,
        "status": base_status,
        "failed_attempts": failed_attempts,
        "last_updated": last_updated.isoformat(),
        "created_at": created_at.isoformat(),
        "recipient_name": _make_name(),
        "recipient_phone": _make_phone(),
        "recipient_address": _make_address(destination),
        "cod_amount": cod_amount,
        "weight_kg": weight,
        "package_count": packages,
        "product_summary": product,
        "last_scan_location": scan_location,
        "last_scan_note": scan_note,
    }


@app.get("/shipments")
def get_shipments(
    count: int = Query(default=30, ge=1, le=200),
    exception_ratio: float = Query(default=0.4, ge=0, le=1),
) -> dict:
    results: list[dict] = []
    for _ in range(count):
        force_exception = random.random() <= exception_ratio
        results.append(generate_shipment(force_exception=force_exception))
    return {"count": count, "items": results}
