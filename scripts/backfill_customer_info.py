"""Backfill thông tin khách hàng cho các shipment đã có (recipient_name IS NULL).

Dùng cùng dataset như services/mock-data để giữ phong cách dữ liệu nhất quán.

Cách chạy:
    docker exec -i shipment-exception-detection-system-api-1 \
        python /tmp/backfill_customer_info.py
"""

from __future__ import annotations

import os
import random
import sys

import psycopg

DSN = os.getenv("WEBAPI_DB_DSN", "postgresql://shipment:shipment@postgres:5432/shipment")

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
]
PHONE_PREFIXES = [
    "090", "091", "093", "094", "096", "097", "098",
    "032", "033", "034", "035", "036", "037", "038", "039",
    "070", "076", "077", "078", "079",
    "081", "082", "083", "084", "085", "088",
]
CITY_AREAS = {
    "Hà Nội": ["Cầu Giấy", "Đống Đa", "Hoàn Kiếm", "Hà Đông", "Long Biên", "Thanh Xuân"],
    "TP. Hồ Chí Minh": ["Quận 1", "Quận 3", "Quận 7", "Thủ Đức", "Bình Thạnh", "Tân Bình"],
    "Đà Nẵng": ["Hải Châu", "Sơn Trà", "Thanh Khê", "Liên Chiểu"],
    "Cần Thơ": ["Ninh Kiều", "Cái Răng", "Bình Thủy"],
    "Hải Phòng": ["Lê Chân", "Ngô Quyền", "Hồng Bàng", "Kiến An"],
    "Nha Trang": ["Vĩnh Hải", "Phước Hải", "Lộc Thọ"],
    "Biên Hòa": ["Tân Phong", "Trảng Dài", "Long Bình"],
}
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
SCAN_NOTES = {
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
    ],
    "address_issue": [
        ("Bưu cục dịch vụ", "Địa chỉ thiếu số nhà, cần xác minh"),
        ("Khu vực giao hàng cuối", "Khách ở khu chung cư thiếu số phòng"),
        ("Trung tâm chăm sóc khách hàng", "Số điện thoại không liên lạc được"),
    ],
}


def _phone() -> str:
    return f"{random.choice(PHONE_PREFIXES)}{random.randint(1000000, 9999999)}"


def _name() -> str:
    return f"{random.choice(FIRST_NAMES_VN)} {random.choice(LAST_NAMES_VN)}"


def _address(city: str) -> str:
    areas = CITY_AREAS.get(city)
    if not areas:
        # fallback: dùng tên 1 khu chung cho thành phố không nằm trong map
        areas = ["Trung tâm"]
    return f"{random.randint(10, 250)} {random.choice(STREETS_VN)}, {random.choice(areas)}, {city}"


def _scan(status: str) -> tuple[str, str]:
    return random.choice(SCAN_NOTES.get(status, SCAN_NOTES["in_transit"]))


def main() -> int:
    with psycopg.connect(DSN, autocommit=True, row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, destination, status
                FROM shipments
                WHERE recipient_name IS NULL OR recipient_phone IS NULL OR recipient_address IS NULL
                """
            )
            rows = cur.fetchall()
            print(f"Tìm thấy {len(rows)} shipment thiếu thông tin khách. Đang backfill...")
            for row in rows:
                product, value, weight, packages = random.choice(PRODUCT_BUNDLES)
                cod_amount = value if random.random() < 0.55 else 0
                scan_loc, scan_note = _scan(row["status"] or "in_transit")
                cur.execute(
                    """
                    UPDATE shipments SET
                      recipient_name = %s,
                      recipient_phone = %s,
                      recipient_address = %s,
                      cod_amount = %s,
                      weight_kg = %s,
                      package_count = %s,
                      product_summary = %s,
                      last_scan_location = %s,
                      last_scan_note = %s
                    WHERE id = %s
                    """,
                    (
                        _name(),
                        _phone(),
                        _address(row["destination"]),
                        cod_amount,
                        weight,
                        packages,
                        product,
                        scan_loc,
                        scan_note,
                        row["id"],
                    ),
                )
            print("Backfill xong.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
