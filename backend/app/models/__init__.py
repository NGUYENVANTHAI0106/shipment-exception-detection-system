"""
Đảm bảo tất cả SQLAlchemy models được import để registry resolve `relationship("...")`.

Nếu không, một số script/worker import lẻ tẻ 1 model có thể gặp lỗi mapper
do không tìm thấy class name tham chiếu trong registry.
"""

from app.models.exception import ExceptionRecord
from app.models.rule import DetectionRule
from app.models.shipment import Shipment
from app.models.user import User

__all__ = ["User", "Shipment", "ExceptionRecord", "DetectionRule"]

