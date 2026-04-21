import type { ExceptionItem, TimelineEvent } from "../types";

export const mockExceptions: ExceptionItem[] = [
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    shipment_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    tracking_number: "TRK-TEST-S4",
    carrier: "GHN",
    origin: "Ha Noi",
    destination: "Da Nang",
    exception_type: "delay",
    severity: "HIGH",
    reason: "Overdue for testing WF3 phase2",
    overdue_hours: 60,
    ai_suggestion: "Contact carrier now",
    confidence: 0.8,
    status: "open",
    detected_at: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
    channels_sent: [],
    is_escalated: false,
    resolution_note: "",
  },
  {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    shipment_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    tracking_number: "TRK-GH2604001",
    carrier: "GHTK",
    origin: "Hai Phong",
    destination: "Ho Chi Minh",
    exception_type: "failed_delivery",
    severity: "CRITICAL",
    reason: "Delivery failed after 3 attempt(s)",
    overdue_hours: 84,
    ai_suggestion: "Call recipient and confirm availability in next 2 hours.",
    confidence: 0.92,
    status: "in_progress",
    detected_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    channels_sent: ["telegram_ops", "telegram_manager", "email"],
    is_escalated: true,
    resolution_note: "Ops contacted carrier central hub.",
  },
];

export function getTimelineForException(exception: ExceptionItem): TimelineEvent[] {
  const base = [
    {
      timestamp: exception.detected_at,
      event: "Detected",
      description: "System detected shipment exception from rule engine.",
    },
    {
      timestamp: new Date(new Date(exception.detected_at).getTime() + 60 * 1000).toISOString(),
      event: "Classified",
      description: "Classifier enriched severity and suggested action.",
    },
  ];

  if (exception.notified_at) {
    base.push({
      timestamp: exception.notified_at,
      event: "Notified",
      description: `Notification sent via ${(exception.channels_sent || []).join(", ") || "unknown channel"}.`,
    });
  }

  if (exception.resolution_note) {
    base.push({
      timestamp: new Date().toISOString(),
      event: "Ops Note",
      description: exception.resolution_note,
    });
  }

  return base;
}
