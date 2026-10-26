"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import Button from "./Button";

/**
 * Nút chọn file (hoặc kéo thả vào vùng `dropzone`).
 *   <FilePicker accept=".pdf,.doc,.docx" onFiles={(files) => ...}>Tải lên PDF / Word</FilePicker>
 */
export default function FilePicker({
  accept,
  multiple = false,
  onFiles,
  children = "Chọn file",
  variant = "secondary",
  size,
  loading,
  dropzone = false,
  hint,
  disabled,
}) {
  const ref = useRef(null);
  const [over, setOver] = useState(false);
  const pick = (list) => {
    const files = Array.from(list || []);
    if (files.length) onFiles?.(multiple ? files : files.slice(0, 1));
  };
  const input = (
    <input
      ref={ref}
      type="file"
      accept={accept}
      multiple={multiple}
      style={{ display: "none" }}
      onChange={(e) => {
        pick(e.target.files);
        e.target.value = "";
      }}
    />
  );
  if (!dropzone) {
    return (
      <>
        {input}
        <Button variant={variant} size={size} icon={Upload} loading={loading} disabled={disabled} onClick={() => ref.current?.click()}>
          {children}
        </Button>
      </>
    );
  }
  return (
    <div
      className={`ui-dropzone${over ? " is-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) pick(e.dataTransfer.files);
      }}
    >
      {input}
      <div style={{ marginBottom: 10 }}>{hint || "Kéo thả file vào đây, hoặc"}</div>
      <Button variant="primary" icon={Upload} loading={loading} disabled={disabled} onClick={() => ref.current?.click()}>
        {children}
      </Button>
    </div>
  );
}
