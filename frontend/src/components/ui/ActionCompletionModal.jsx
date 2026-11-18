import { CheckCircle2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

/**
 * Modal thông báo hoàn tất thao tác trọng tâm, cung cấp 2 lựa chọn:
 * 1. Ở lại trang hiện tại (Stay on current page / close modal)
 * 2. Tiến tới trang kết quả / đích chính xác (Navigate to target route)
 */
export function ActionCompletionModal({
  open,
  title = "Thao tác thành công",
  message = "Hệ thống đã ghi nhận và xử lý thành công yêu cầu của bạn.",
  stayText = "Ở lại trang hiện tại",
  proceedText = "Tiến tới trang kết quả",
  onStay,
  onProceed,
}) {
  return (
    <Modal open={open} title={null} onClose={onStay} width={480}>
      <div style={{ textAlign: "center", padding: "12px 8px 4px 8px" }}>
        <div style={{ display: "inline-flex", color: "#16a34a", marginBottom: 12 }}>
          <CheckCircle2 size={52} strokeWidth={2} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ui-ink, #0f172a)", marginBottom: 8 }}>
          {title}
        </h3>
        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.5, marginBottom: 24 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Button variant="secondary" onClick={onStay} style={{ flex: 1 }}>
            {stayText}
          </Button>
          <Button variant="primary" onClick={onProceed} style={{ flex: 1 }}>
            {proceedText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
