"use client";

/**
 * variant: primary | secondary | success | danger | danger-solid | ghost | link
 * size: sm | md | lg
 */
export default function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  loading = false,
  disabled,
  type = "button",
  className = "",
  children,
  ...rest
}) {
  const cls = ["ui-btn", `ui-btn-${variant}`, size !== "md" ? `ui-btn-${size}` : "", className].filter(Boolean).join(" ");
  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className="ui-spin" aria-hidden="true" /> : Icon ? <Icon size={size === "sm" ? 14 : 15} /> : null}
      {children}
    </button>
  );
}
