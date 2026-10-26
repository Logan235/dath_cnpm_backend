"use client";

import { useState } from "react";
import { CheckCircle2, FileDown, Wallet, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAction, useSession } from "@/lib/hooks";
import { options } from "@/lib/labels";
import { Button, Field, Modal, Select, TextArea, promptDialog, toast } from "@/components/ui";

/** Các thao tác trên một quyết định xử phạt: tải văn bản, phê duyệt / từ chối (lãnh đạo), cập nhật thi hành (chuyên viên) */
export function PenaltyActions({ p, onChanged, size = "sm" }) {
  const { can, session, role } = useSession();
  // Cán bộ tải qua /penalty-decisions; cơ sở KCB chỉ tải được quyết định đã ban hành cho chính cơ sở mình
  const docPath = can("violation.view")
    ? `/penalty-decisions/${p.id}/document`
    : role === "FACILITY" && p.status === "ISSUED"
      ? `/facility-portal/penalties/${p.id}/document`
      : null;
  const [exec, setExec] = useState(null);
  const [busy, run] = useAction();

  const doc = () =>
    run(async () => {
      try {
        await api.download(docPath, undefined, `quyet-dinh-${p.decisionNumber.replace(/[\\/:*?"<>|]+/g, "-")}.doc`);
      } catch (e) {
        toast.error(e);
      }
    });

  const approve = async () => {
    const note = await promptDialog({ title: `Phê duyệt quyết định ${p.decisionNumber}`, label: "Ý kiến phê duyệt (không bắt buộc)", confirmText: "Phê duyệt và ban hành" });
    if (note === null) return;
    try {
      await api.post(`/penalty-decisions/${p.id}/approve`, note ? { note } : {});
      toast.success("Đã phê duyệt, quyết định được ban hành");
      onChanged?.();
    } catch (e) {
      toast.error(e);
    }
  };

  const reject = async () => {
    const note = await promptDialog({ title: `Từ chối quyết định ${p.decisionNumber}`, label: "Lý do từ chối", required: true, danger: true, confirmText: "Từ chối" });
    if (!note) return;
    try {
      await api.post(`/penalty-decisions/${p.id}/reject`, { note });
      toast.success("Đã từ chối — hồ sơ quay lại chuyên viên xử lý");
      onChanged?.();
    } catch (e) {
      toast.error(e);
    }
  };

  const saveExec = () =>
    run(async () => {
      try {
        await api.post(`/penalty-decisions/${p.id}/execution`, { executionStatus: exec.status, note: exec.note || undefined });
        toast.success("Đã cập nhật tình hình thi hành");
        setExec(null);
        onChanged?.();
      } catch (e) {
        toast.error(e);
      }
    });

  const selfCreated = String(p.createdBy || "") === String(session?.user?.id || "");
  return (
    <div className="ui-row" style={{ flexWrap: "wrap", gap: 6 }} onClick={(e) => e.stopPropagation()}>
      {docPath && (
        <Button size={size} variant="secondary" icon={FileDown} loading={busy} onClick={doc}>
          Văn bản QĐ
        </Button>
      )}
      {p.status === "PENDING_APPROVAL" && can("penalty.approve") && !selfCreated && (
        <>
          <Button size={size} variant="success" icon={CheckCircle2} onClick={approve}>
            Phê duyệt
          </Button>
          <Button size={size} variant="danger" icon={XCircle} onClick={reject}>
            Từ chối
          </Button>
        </>
      )}
      {p.status === "ISSUED" && can("penalty.manage") && (
        <Button size={size} variant="secondary" icon={Wallet} onClick={() => setExec({ status: p.executionStatus === "NOT_ISSUED" ? "UNPAID" : p.executionStatus, note: "" })}>
          Cập nhật thi hành
        </Button>
      )}
      <Modal
        open={!!exec}
        width={520}
        title={`Thi hành quyết định ${p.decisionNumber}`}
        onClose={() => setExec(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setExec(null)}>
              Hủy
            </Button>
            <Button loading={busy} onClick={saveExec}>
              Lưu
            </Button>
          </>
        }
      >
        {exec && (
          <div className="ui-form ui-form-1">
            <Field label="Tình hình thi hành">
              <Select value={exec.status} onChange={(e) => setExec({ ...exec, status: e.target.value })} options={options("executionStatus", ["UNPAID", "PAID", "APPEALING", "OVERDUE", "COMPLIED"])} />
            </Field>
            <Field label="Ghi chú" hint="Đã chấp hành = đã nộp phạt và khắc phục hậu quả → hồ sơ vi phạm hoàn thành.">
              <TextArea rows={2} value={exec.note} onChange={(e) => setExec({ ...exec, note: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
