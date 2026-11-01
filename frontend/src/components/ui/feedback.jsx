"use client";

/**
 * Thông báo nổi (toast) và hộp thoại xác nhận dùng chung, thay cho alert()/confirm() của trình duyệt.
 *   toast.success("Đã lưu");  toast.error(err)
 *   const ok = await confirmDialog({ title: "Xóa?", message: "...", danger: true });
 *   const note = await promptDialog({ title: "Lý do từ chối", label: "Lý do", required: true });
 * <FeedbackHost /> được gắn một lần ở layout gốc.
 */

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { Field, TextArea } from "./Form";

let toastListener = null;
let dialogListener = null;
let seq = 1;

function push(kind, msg) {
  const text = msg instanceof Error ? msg.message : typeof msg === "string" ? msg : String(msg ?? "");
  if (!text) return;
  toastListener?.({ id: seq++, kind, text });
}

export const toast = {
  success: (m) => push("success", m),
  error: (m) => push("error", m),
  info: (m) => push("info", m),
};

export function confirmDialog(opts) {
  return new Promise((resolve) => {
    if (!dialogListener) return resolve(false);
    dialogListener({ ...opts, kind: "confirm", resolve });
  });
}

/** Trả về chuỗi người dùng nhập, hoặc null nếu hủy */
export function promptDialog(opts) {
  return new Promise((resolve) => {
    if (!dialogListener) return resolve(null);
    dialogListener({ ...opts, kind: "prompt", resolve });
  });
}

export function FeedbackHost() {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const timers = useRef({});

  useEffect(() => {
    toastListener = (t) => {
      setToasts((list) => [...list.slice(-3), t]);
      timers.current[t.id] = setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), t.kind === "error" ? 6000 : 3500);
    };
    dialogListener = (d) => {
      setText(d.defaultValue || "");
      setErr("");
      setDialog(d);
    };
    return () => {
      toastListener = null;
      dialogListener = null;
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const close = (value) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  const submit = () => {
    if (dialog.kind === "prompt") {
      if (dialog.required && !text.trim()) {
        setErr("Vui lòng nhập nội dung.");
        return;
      }
      close(text.trim());
    } else close(true);
  };

  return (
    <>
      <div className="ui-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ui-toast ui-toast-${t.kind}`} role={t.kind === "error" ? "alert" : "status"}>
            <span>{t.text}</span>
            <button type="button" aria-label="Đóng" onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <Modal
        open={!!dialog}
        title={dialog?.title || "Xác nhận"}
        width={dialog?.kind === "prompt" ? 520 : 440}
        onClose={() => close(dialog?.kind === "prompt" ? null : false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => close(dialog?.kind === "prompt" ? null : false)}>
              {dialog?.cancelText || "Hủy"}
            </Button>
            <Button variant={dialog?.danger ? "danger-solid" : "primary"} onClick={submit} autoFocus>
              {dialog?.confirmText || "Đồng ý"}
            </Button>
          </>
        }
      >
        {dialog?.message && <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{dialog.message}</div>}
        {dialog?.kind === "prompt" && (
          <div style={{ marginTop: dialog?.message ? 14 : 0 }}>
            <Field label={dialog.label || "Nội dung"} required={dialog.required} error={err}>
              <TextArea rows={dialog.rows || 3} value={text} onChange={(e) => setText(e.target.value)} placeholder={dialog.placeholder} autoFocus />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
