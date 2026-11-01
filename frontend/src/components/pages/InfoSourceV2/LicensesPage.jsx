"use client";

import { useState } from "react";
import { Power, SearchCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useOptions } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDate, toDateInput } from "@/lib/format";
import { Alert, Badge, Button, Card, CrudPage, FilterSelect, StatusBadge, TextInput, cleanPayload, toast } from "@/components/ui";
import { AttachButton, FileLink, ImportButton, ImportNotice } from "./shared";

const FIELD_LABELS = { licenseNumber: "Số giấy phép", licenseType: "Loại", holderName: "Người được cấp", issuedDate: "Ngày cấp", facilityId: "Cơ sở" };

/** Tra cứu nhanh số giấy phép / CCHN có hợp lệ không (API công khai) */
export function VerifyLicenseBox() {
  const [num, setNum] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const check = async () => {
    if (!num.trim()) return;
    setBusy(true);
    try {
      setRes(await api.get("/licenses/verify", { number: num.trim() }));
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Tra cứu nhanh số giấy phép / chứng chỉ hành nghề">
      <div className="ui-searchbox" style={{ maxWidth: 560 }}>
        <TextInput value={num} onChange={(e) => setNum(e.target.value)} onKeyDown={(e) => e.key === "Enter" && check()} placeholder="VD 12345-ABC/2020/SYT hoặc 000123/HCM-CCHN" />
        <Button icon={SearchCheck} loading={busy} onClick={check}>
          Kiểm tra
        </Button>
      </div>
      {res && !res.found && (
        <Alert tone="danger" style={{ marginTop: 12, marginBottom: 0 }}>
          <strong>{res.number}</strong>: {res.message}
        </Alert>
      )}
      {res?.found &&
        res.licenses.map((l, i) => (
          <Alert key={i} tone={l.valid ? "success" : "danger"} style={{ marginTop: 12, marginBottom: 0 }}>
            <strong>{res.number}</strong> — {label("licenseType", l.licenseType)} cấp cho <strong>{l.holderName || l.facility?.name}</strong>
            {l.facility && l.holderName !== l.facility.name ? ` (${l.facility.name})` : ""}, ngày cấp {fmtDate(l.issuedDate)}
            {l.expiryDate ? `, hết hạn ${fmtDate(l.expiryDate)}` : ""}.{" "}
            {l.valid ? "Đang hợp lệ." : l.isExpired ? "Đã hết hạn." : l.status !== "ACTIVE" ? "Đã thu hồi / hết hiệu lực." : "Cơ sở không còn hoạt động."}
          </Alert>
        ))}
    </Card>
  );
}

export default function LicensesPage({ readOnly = false }) {
  const facilities = useOptions("/facilities", (f) => ({ value: f.id, label: f.name }));

  const fields = [
    { name: "licenseNumber", label: "Số giấy phép / chứng chỉ", required: true },
    { name: "licenseType", label: "Loại", type: "select", required: true, options: options("licenseType"), createOnly: true, placeholder: false },
    {
      name: "facilityId",
      label: "Đơn vị KCB",
      type: "select",
      numeric: true,
      options: facilities,
      placeholder: "— Không gắn cơ sở —",
      hint: "Bắt buộc với Giấy phép hoạt động và Giấy xác nhận nội dung quảng cáo",
    },
    { name: "holderName", label: "Người / tổ chức được cấp", hint: "Bắt buộc với CCHN: họ tên bác sĩ" },
    { name: "holderTitle", label: "Chức danh / chuyên khoa", placeholder: "VD Bác sĩ chuyên khoa Da liễu" },
    { name: "issuer", label: "Cơ quan cấp" },
    { name: "issuedDate", label: "Ngày cấp", type: "date", required: true },
    { name: "expiryDate", label: "Ngày hết hạn", type: "date", hint: "Bỏ trống nếu không thời hạn" },
    { name: "scope", label: "Phạm vi hành nghề / nội dung được cấp", type: "textarea", span: "all", rows: 2 },
    { name: "note", label: "Ghi chú", type: "textarea", span: "all", rows: 2 },
  ];

  const toggle = async (l, reload) => {
    try {
      await api.patch(`/licenses/${l.id}/status`, { status: l.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
      toast.success(l.status === "ACTIVE" ? "Đã thu hồi / hết hiệu lực" : "Đã kích hoạt lại");
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <CrudPage
      title="Giấy phép và chứng chỉ hành nghề"
      subtitle="Giấy phép hoạt động (GPHĐ), chứng chỉ hành nghề (CCHN) của bác sĩ, giấy xác nhận nội dung quảng cáo (XNQC). AI đối chiếu các số này khi phân tích quảng cáo."
      crumbs={["Quản lý nguồn thông tin"]}
      path="/licenses"
      columns={[
        { key: "n", title: "Số", render: (l) => <span className="ui-code">{l.licenseNumber}</span> },
        { key: "t", title: "Loại", render: (l) => label("licenseType", l.licenseType) },
        {
          key: "h",
          title: "Được cấp cho",
          render: (l) => (
            <>
              <div className="ui-cell-main">{l.holderName || l.facility?.name}</div>
              <div className="ui-cell-sub">{[l.holderTitle, l.facility && l.holderName !== l.facility.name ? l.facility.name : null].filter(Boolean).join(" · ")}</div>
            </>
          ),
        },
        { key: "d", title: "Ngày cấp", nowrap: true, render: (l) => fmtDate(l.issuedDate) },
        {
          key: "e",
          title: "Hết hạn",
          nowrap: true,
          render: (l) =>
            !l.expiryDate ? (
              <span className="ui-muted">Không thời hạn</span>
            ) : l.isExpired ? (
              <Badge tone="danger">{fmtDate(l.expiryDate)} · Đã hết hạn</Badge>
            ) : l.daysToExpiry !== null && l.daysToExpiry <= 60 ? (
              <Badge tone="warning">
                {fmtDate(l.expiryDate)} · còn {l.daysToExpiry} ngày
              </Badge>
            ) : (
              fmtDate(l.expiryDate)
            ),
        },
        { key: "f", title: "File", render: (l) => <FileLink path={l.attachmentPath} name="Xem" /> },
        { key: "s", title: "Trạng thái", render: (l) => <StatusBadge group="recordStatus" value={l.status} text={l.status === "ACTIVE" ? "Hiệu lực" : "Thu hồi"} /> },
      ]}
      fields={fields}
      canCreate={!readOnly}
      canEdit={!readOnly}
      canDelete={!readOnly}
      createLabel="Thêm bằng form"
      createTitle="Thêm giấy phép / chứng chỉ"
      editTitle="Cập nhật giấy phép"
      createDefaults={{ licenseType: "CCHN" }}
      modalWidth={820}
      searchPlaceholder="Số giấy phép, người được cấp, cơ sở"
      toForm={(l) => ({
        ...Object.fromEntries(fields.map((f) => [f.name, l[f.name] ?? ""])),
        issuedDate: toDateInput(l.issuedDate),
        expiryDate: toDateInput(l.expiryDate),
      })}
      toPayload={(v, mode) => {
        const fs = mode === "edit" ? fields.filter((x) => !x.createOnly) : fields;
        const body = cleanPayload(fs, v, { keepEmpty: mode === "edit" });
        if (mode === "create" && v.attachmentPath) {
          body.attachmentPath = v.attachmentPath;
          body.attachmentName = v.attachmentName;
        }
        return body;
      }}
      beforeTable={() => <VerifyLicenseBox />}
      headerActions={(ctx) =>
        !readOnly && (
          <ImportButton
            path="/licenses"
            onDraft={(res) => {
              const dr = res.draft || {};
              ctx.openCreate(
                {
                  ...Object.fromEntries(fields.map((f) => [f.name, dr[f.name] ?? ""])),
                  licenseType: dr.licenseType || "CCHN",
                  attachmentPath: dr.attachmentPath || res.file?.url,
                  attachmentName: dr.attachmentName || res.file?.name,
                },
                <ImportNotice result={res} labels={FIELD_LABELS} />,
              );
            }}
          />
        )
      }
      filters={(list) => (
        <>
          <FilterSelect list={list} name="licenseType" label="Loại" options={options("licenseType")} />
          <FilterSelect list={list} name="facilityId" label="Cơ sở" options={facilities} />
          <FilterSelect list={list} name="status" label="Trạng thái" options={[{ value: "ACTIVE", label: "Hiệu lực" }, { value: "INACTIVE", label: "Thu hồi" }]} />
          <FilterSelect
            list={list}
            name="expiringInDays"
            label="Sắp hết hạn"
            options={[
              { value: "30", label: "Trong 30 ngày" },
              { value: "90", label: "Trong 90 ngày" },
            ]}
          />
          <FilterSelect list={list} name="expired" label="Đã hết hạn" options={[{ value: "true", label: "Chỉ GP đã hết hạn" }]} />
        </>
      )}
      rowActions={
        readOnly
          ? undefined
          : (l, ctx) => (
              <>
                <AttachButton path={`/licenses/${l.id}/attachment`} onDone={ctx.reload}>
                  File
                </AttachButton>
                <Button size="sm" variant="secondary" icon={Power} onClick={() => toggle(l, ctx.reload)}>
                  {l.status === "ACTIVE" ? "Thu hồi" : "Kích hoạt"}
                </Button>
              </>
            )
      }
    />
  );
}
