"use client";

import { useState } from "react";
import { api, fileUrl } from "@/lib/api";
import { Alert, FilePicker, toast } from "@/components/ui";

const DOC_ACCEPT = ".pdf,.doc,.docx,.txt";

/**
 * Cách nhập thứ 2 của các mục quản lý thông tin: tải file PDF / Word lên,
 * backend đọc nội dung và trả về bản nháp các trường -> mở form đã điền sẵn để kiểm tra rồi lưu.
 */
export function ImportButton({ path, onDraft, children = "Nhập từ file PDF / Word", variant = "secondary" }) {
  const [busy, setBusy] = useState(false);
  const onFiles = async (files) => {
    setBusy(true);
    try {
      const res = await api.upload(`${path}/import`, files[0]);
      toast.success(`Đã đọc file "${res.file?.name || files[0].name}". Kiểm tra lại các trường trước khi lưu.`);
      onDraft(res);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FilePicker accept={DOC_ACCEPT} onFiles={onFiles} loading={busy} variant={variant}>
      {children}
    </FilePicker>
  );
}

/** Thông báo hiển thị trên form khi dữ liệu được trích xuất từ file */
export function ImportNotice({ result, labels = {} }) {
  if (!result) return null;
  const missing = result.missingFields || [];
  return (
    <Alert tone={missing.length ? "warning" : "info"}>
      Dữ liệu được trích xuất tự động từ file{" "}
      {result.file?.url ? (
        <a className="ui-link" href={fileUrl(result.file.url)} target="_blank" rel="noreferrer">
          {result.file.name}
        </a>
      ) : (
        <strong>{result.file?.name}</strong>
      )}
      . Hãy kiểm tra lại trước khi lưu.
      {missing.length > 0 && (
        <>
          <br />
          Chưa đọc được: <strong>{missing.map((m) => labels[m] || m).join(", ")}</strong> — vui lòng nhập bổ sung.
        </>
      )}
    </Alert>
  );
}

/** Nút tải file đính kèm cho bản ghi đã có */
export function AttachButton({ path, onDone, children = "Đính kèm file", size = "sm" }) {
  const [busy, setBusy] = useState(false);
  return (
    <FilePicker
      accept={DOC_ACCEPT + ",.png,.jpg,.jpeg"}
      size={size}
      loading={busy}
      onFiles={async (files) => {
        setBusy(true);
        try {
          await api.upload(path, files[0]);
          toast.success("Đã đính kèm file");
          onDone?.();
        } catch (e) {
          toast.error(e);
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
    </FilePicker>
  );
}

export function FileLink({ path, name }) {
  if (!path) return <span className="ui-muted">—</span>;
  return (
    <a className="ui-link" href={fileUrl(path)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
      {name || "Mở file"}
    </a>
  );
}
