"use client";

import { splitList } from "@/lib/format";

export function Field({ label, required, hint, error, children, className = "", span, htmlFor }) {
  const spanCls = span === "all" ? "ui-span-all" : span === 2 ? "ui-span-2" : "";
  return (
    <div className={`ui-field ${spanCls} ${className}`}>
      {label && (
        <label className="ui-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ui-req">*</span>}
        </label>
      )}
      {children}
      {error ? <span className="ui-error-text">{error}</span> : hint ? <span className="ui-hint">{hint}</span> : null}
    </div>
  );
}

export function TextInput({ invalid, className = "", ...props }) {
  return <input className={`ui-input ${invalid ? "is-invalid" : ""} ${className}`} {...props} />;
}

export function TextArea({ invalid, rows = 4, className = "", ...props }) {
  return <textarea rows={rows} className={`ui-textarea ${invalid ? "is-invalid" : ""} ${className}`} {...props} />;
}

/** options: [{value, label}] ; placeholder: dòng đầu (value "") */
export function Select({ options = [], placeholder, invalid, className = "", ...props }) {
  return (
    <select className={`ui-select ${invalid ? "is-invalid" : ""} ${className}`} {...props}>
      {placeholder !== undefined && placeholder !== false && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ label, checked, onChange, ...props }) {
  return (
    <label className="ui-check">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange?.(e.target.checked)} {...props} />
      {label}
    </label>
  );
}

/** Chọn nhiều bằng các chip bấm bật/tắt */
export function ChipSelect({ options = [], value = [], onChange }) {
  const set = new Set(value || []);
  return (
    <div className="ui-chips">
      {options.map((o) => {
        const on = set.has(o.value);
        return (
          <button
            type="button"
            key={o.value}
            className={`ui-chip ui-chip-btn${on ? " is-on" : ""}`}
            aria-pressed={on}
            onClick={() => {
              const next = new Set(set);
              on ? next.delete(o.value) : next.add(o.value);
              onChange?.([...next]);
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Form sinh từ cấu hình trường.
 * field: { name, label, type: text|email|password|number|date|textarea|select|chips|checkbox|list,
 *          options, required, placeholder, hint, span: 2|"all", rows, disabled, show:(values)=>bool }
 * type "list": ô nhập "a, b, c" <-> mảng ["a","b","c"]
 */
export function SchemaForm({ fields, values, onChange, errors = {}, cols = 2 }) {
  const set = (name, v) => onChange({ ...values, [name]: v });
  return (
    <div className={`ui-form ${cols === 1 ? "ui-form-1" : cols === 3 ? "ui-form-3" : ""}`}>
      {fields
        .filter((f) => !f.show || f.show(values))
        .map((f) => {
          const v = values?.[f.name];
          const common = {
            id: `f-${f.name}`,
            name: f.name,
            disabled: f.disabled,
            placeholder: f.placeholder,
            invalid: !!errors[f.name],
          };
          let input;
          switch (f.type) {
            case "textarea":
              input = <TextArea {...common} rows={f.rows || 4} value={v ?? ""} onChange={(e) => set(f.name, e.target.value)} />;
              break;
            case "select":
              input = (
                <Select
                  {...common}
                  options={f.options || []}
                  placeholder={f.placeholder ?? "-- Chọn --"}
                  value={v ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              );
              break;
            case "chips":
              input = <ChipSelect options={f.options || []} value={v || []} onChange={(x) => set(f.name, x)} />;
              break;
            case "checkbox":
              input = <Checkbox label={f.checkboxLabel || ""} checked={!!v} onChange={(x) => set(f.name, x)} disabled={f.disabled} />;
              break;
            case "list":
              input = (
                <TextInput
                  {...common}
                  value={Array.isArray(v) ? v.join(", ") : v ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  onBlur={(e) => set(f.name, splitList(e.target.value))}
                />
              );
              break;
            default:
              input = (
                <TextInput
                  {...common}
                  type={f.type || "text"}
                  value={v ?? ""}
                  step={f.step}
                  min={f.min}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              );
          }
          return (
            <Field
              key={f.name}
              htmlFor={["chips", "checkbox"].includes(f.type) ? undefined : common.id}
              label={f.label}
              required={f.required}
              hint={f.hint}
              error={errors[f.name]}
              span={f.span}
            >
              {input}
            </Field>
          );
        })}
    </div>
  );
}

/** Kiểm tra các trường bắt buộc của SchemaForm, trả về { name: "thông báo" } */
export function validateRequired(fields, values) {
  const errs = {};
  for (const f of fields) {
    if (!f.required || (f.show && !f.show(values))) continue;
    const v = values?.[f.name];
    const empty = v === undefined || v === null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);
    if (empty) errs[f.name] = "Bắt buộc nhập";
  }
  return errs;
}

/** Chuẩn hóa dữ liệu form trước khi gửi: bỏ chuỗi rỗng, đổi number, list */
export function cleanPayload(fields, values, { keepEmpty = false } = {}) {
  const out = {};
  for (const f of fields) {
    if (f.show && !f.show(values)) continue;
    if (f.readOnlyOnSave) continue;
    let v = values?.[f.name];
    if (f.type === "list") v = splitList(v);
    if (f.type === "number" || f.numeric) v = v === "" || v === null || v === undefined ? undefined : Number(v);
    if (typeof v === "string") v = v.trim();
    if (!keepEmpty && (v === "" || v === undefined)) continue;
    if (keepEmpty && v === "") v = null;
    out[f.name] = v;
  }
  return out;
}
