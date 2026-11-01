"use client";

import { useState } from "react";
import { Ban, Eye, KeyRound, ShieldAlert } from "lucide-react";
import { api, externalUrl } from "@/lib/api";
import { useAction, useApi, useOptions } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDate, toDateInput } from "@/lib/format";
import {
  Alert,
  Badge,
  Button,
  CrudPage,
  DataTable,
  Field,
  FilterSelect,
  InfoGrid,
  Loading,
  Modal,
  Select,
  StatusBadge,
  TextArea,
  cleanPayload,
  confirmDialog,
  promptDialog,
  toast,
} from "@/components/ui";
import { FileLink, ImportButton, ImportNotice } from "./shared";

const FIELD_LABELS = {
  code: "Mã đơn vị",
  name: "Tên đơn vị",
  address: "Địa chỉ",
  organizationForm: "Hình thức tổ chức",
  professionalScope: "Phạm vi chuyên môn",
  workingHours: "Thời gian làm việc",
  licenseNumber: "Số giấy phép",
  licenseIssuedDate: "Ngày cấp giấy phép",
};

function FacilityDetail({ id, onClose, canManage, onChanged }) {
  const d = useApi(`/facilities/${id}`);
  const f = d.data;
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, run] = useAction();

  const resetPwd = async () => {
    if (!(await confirmDialog({ title: "Cấp lại mật khẩu", message: `Cấp lại mật khẩu tài khoản của "${f.name}"?` }))) return;
    try {
      setAccount(await api.post(`/facilities/${f.id}/reset-account-password`));
    } catch (e) {
      toast.error(e);
    }
  };

  const saveStatus = () =>
    run(async () => {
      try {
        await api.patch(`/facilities/${f.id}/operating-status`, { operatingStatus: status.value, note: status.note || undefined });
        toast.success("Đã cập nhật tình trạng hoạt động");
        setStatus(null);
        d.reload();
        onChanged?.();
      } catch (e) {
        toast.error(e);
      }
    });

  const blacklist = async () => {
    const on = !f.isBlacklisted;
    const note = await promptDialog({
      title: on ? "Đưa vào danh sách đen" : "Gỡ khỏi danh sách đen",
      label: "Lý do",
      required: on,
      danger: on,
      confirmText: on ? "Đưa vào danh sách đen" : "Gỡ",
    });
    if (note === null) return;
    try {
      await api.patch(`/facilities/${f.id}/blacklist`, { isBlacklisted: on, note: note || undefined });
      toast.success("Đã cập nhật");
      d.reload();
      onChanged?.();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal open title={f ? f.name : "Đơn vị KCB"} width={900} onClose={onClose}>
      {!f ? (
        <Loading />
      ) : (
        <>
          {account && (
            <Alert tone="success">
              Tài khoản <strong>{account.username}</strong> ({account.email}) — mật khẩu mới: <span className="ui-code">{account.temporaryPassword}</span>
            </Alert>
          )}
          {f.isBlacklisted && <Alert tone="danger">Cơ sở đang nằm trong danh sách đen.</Alert>}
          <InfoGrid
            items={[
              { label: "Mã đơn vị", value: <span className="ui-code">{f.code}</span> },
              { label: "Loại hình", value: f.type?.name },
              { label: "Hình thức tổ chức", value: f.organizationForm },
              { label: "Tình trạng hoạt động", value: <StatusBadge group="facilityOperatingStatus" value={f.operatingStatus} /> },
              { label: "Địa chỉ", value: f.address, wide: true },
              { label: "Quận / huyện", value: f.district },
              { label: "Điện thoại", value: f.phone },
              { label: "Email", value: f.email },
              { label: "Website", value: f.website ? <a className="ui-link" href={externalUrl(f.website)} target="_blank" rel="noreferrer">{f.website}</a> : null },
              { label: "Người đại diện", value: f.representative },
              { label: "Thời gian làm việc", value: f.workingHours },
              { label: "Số giấy phép hoạt động", value: f.licenseNumber },
              { label: "Ngày cấp", value: fmtDate(f.licenseIssuedDate) },
              { label: "Phạm vi chuyên môn", value: f.professionalScope, wide: true },
              {
                label: "Danh mục kỹ thuật được cấp phép",
                wide: true,
                value: f.licensedTechniques?.length ? (
                  <div className="ui-chips">
                    {f.licensedTechniques.map((t) => (
                      <span key={t} className="ui-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null,
              },
              { label: "Điểm rủi ro", value: `${Number(f.riskScore || 0).toFixed(0)} / 100` },
              { label: "Mức rủi ro", value: <StatusBadge group="riskLevel" value={f.riskLevel} /> },
              { label: "Số lần vi phạm", value: f.violationCount },
              { label: "Khắc phục", value: label("remediationStatus", f.remediationStatus) },
            ]}
          />
          <div className="ui-label ui-mt" style={{ marginBottom: 8 }}>
            Giấy phép / chứng chỉ hành nghề ({f.licenses?.length || 0})
          </div>
          <DataTable
            minWidth={640}
            rows={f.licenses || []}
            empty="Chưa có giấy phép"
            columns={[
              { key: "n", title: "Số", render: (l) => <span className="ui-code">{l.licenseNumber}</span> },
              { key: "t", title: "Loại", render: (l) => label("licenseType", l.licenseType) },
              { key: "h", title: "Người được cấp", render: (l) => [l.holderName, l.holderTitle].filter(Boolean).join(" — ") },
              { key: "d", title: "Ngày cấp", nowrap: true, render: (l) => fmtDate(l.issuedDate) },
              { key: "e", title: "Hết hạn", nowrap: true, render: (l) => fmtDate(l.expiryDate) || "Không thời hạn" },
              { key: "f", title: "File", render: (l) => <FileLink path={l.attachmentPath} name="Xem" /> },
              { key: "s", title: "Trạng thái", render: (l) => <StatusBadge group="recordStatus" value={l.status} /> },
            ]}
          />
          {canManage && (
            <div className="ui-row ui-mt">
              <Button variant="secondary" icon={ShieldAlert} onClick={() => setStatus({ value: f.operatingStatus, note: "" })}>
                Đổi tình trạng hoạt động
              </Button>
              <Button variant={f.isBlacklisted ? "secondary" : "danger"} icon={Ban} onClick={blacklist}>
                {f.isBlacklisted ? "Gỡ khỏi danh sách đen" : "Đưa vào danh sách đen"}
              </Button>
              <Button variant="secondary" icon={KeyRound} onClick={resetPwd}>
                Cấp lại mật khẩu tài khoản cơ sở
              </Button>
            </div>
          )}
          {status && (
            <div className="ui-card ui-mt" style={{ marginBottom: 0 }}>
              <div className="ui-form">
                <Field label="Tình trạng hoạt động">
                  <Select value={status.value} onChange={(e) => setStatus({ ...status, value: e.target.value })} options={options("facilityOperatingStatus")} />
                </Field>
                <Field label="Ghi chú / căn cứ quyết định" span="all">
                  <TextArea rows={2} value={status.note} onChange={(e) => setStatus({ ...status, note: e.target.value })} />
                </Field>
              </div>
              <div className="ui-row ui-mt">
                <Button loading={busy} onClick={saveStatus}>
                  Lưu
                </Button>
                <Button variant="secondary" onClick={() => setStatus(null)}>
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/** Đơn vị khám chữa bệnh. readOnly: chỉ tra cứu (an ninh mạng). */
export default function FacilitiesPage({ readOnly = false }) {
  const types = useOptions("/facility-types", (t) => ({ value: t.id, label: t.name }));
  const [viewId, setViewId] = useState(null);
  const [created, setCreated] = useState(null);

  const fields = [
    { name: "code", label: "Mã đơn vị", required: true, createOnly: true, hint: "Duy nhất; dùng làm tên đăng nhập của cơ sở" },
    { name: "name", label: "Tên đơn vị", required: true },
    { name: "typeId", label: "Loại hình", type: "select", numeric: true, options: types },
    { name: "organizationForm", label: "Hình thức tổ chức", required: true, placeholder: "VD Phòng khám chuyên khoa" },
    { name: "address", label: "Địa chỉ", required: true, span: "all" },
    { name: "ward", label: "Phường / xã" },
    { name: "district", label: "Quận / huyện" },
    { name: "phone", label: "Điện thoại" },
    { name: "email", label: "Email", type: "email" },
    { name: "website", label: "Website" },
    { name: "representative", label: "Người đại diện" },
    { name: "licenseNumber", label: "Số giấy phép hoạt động", required: true },
    { name: "licenseIssuedDate", label: "Ngày cấp giấy phép", type: "date", required: true },
    { name: "workingHours", label: "Thời gian làm việc", required: true, placeholder: "VD 07:00 - 20:00 hằng ngày" },
    { name: "professionalScope", label: "Phạm vi hoạt động chuyên môn", type: "textarea", required: true, span: "all", rows: 2 },
    {
      name: "licensedTechniques",
      label: "Danh mục kỹ thuật được cấp phép",
      type: "list",
      span: "all",
      hint: "Cách nhau dấu phẩy. AI dùng danh mục này để phát hiện quảng cáo vượt phạm vi chuyên môn.",
    },
    { name: "note", label: "Ghi chú", type: "textarea", span: "all", rows: 2 },
    {
      name: "createAccount",
      label: "Tài khoản cho cơ sở",
      type: "checkbox",
      checkboxLabel: "Tạo tài khoản đăng nhập cho cơ sở (mật khẩu tạm hiển thị 1 lần)",
      createOnly: true,
      span: "all",
    },
  ];

  return (
    <CrudPage
      title="Đơn vị khám chữa bệnh"
      subtitle={
        readOnly
          ? "Tra cứu hồ sơ cơ sở, giấy phép hoạt động, phạm vi chuyên môn và mức độ rủi ro."
          : "Nhập bằng form hoặc tải file PDF / Word (phiếu thông tin cơ sở) để tự trích xuất. Khi tạo, hệ thống tự tạo giấy phép hoạt động và tài khoản đăng nhập cho cơ sở."
      }
      crumbs={["Quản lý nguồn thông tin"]}
      path="/facilities"
      columns={[
        {
          key: "n",
          title: "Cơ sở",
          render: (f) => (
            <>
              <div className="ui-cell-main">{f.name}</div>
              <div className="ui-cell-sub">
                <span className="ui-code">{f.code}</span> · {f.type?.name}
              </div>
            </>
          ),
        },
        { key: "a", title: "Địa chỉ", render: (f) => f.address },
        { key: "l", title: "Giấy phép", render: (f) => <span className="ui-code">{f.licenseNumber}</span> },
        {
          key: "s",
          title: "Hoạt động",
          render: (f) => (
            <div className="ui-row" style={{ gap: 4 }}>
              <StatusBadge group="facilityOperatingStatus" value={f.operatingStatus} />
              {f.isBlacklisted && <Badge tone="danger">Danh sách đen</Badge>}
              {!f.isActive && <Badge>Ngừng theo dõi</Badge>}
            </div>
          ),
        },
        { key: "r", title: "Rủi ro", render: (f) => <StatusBadge group="riskLevel" value={f.riskLevel} text={`${label("riskLevel", f.riskLevel)} · ${Number(f.riskScore || 0).toFixed(0)}`} /> },
        { key: "v", title: "Vi phạm", num: true, render: (f) => f.violationCount },
      ]}
      fields={fields}
      canCreate={!readOnly}
      canEdit={!readOnly}
      canDelete={!readOnly}
      statusToggle={readOnly ? undefined : { field: "isActive" }}
      createLabel="Thêm bằng form"
      createTitle="Thêm đơn vị KCB"
      editTitle="Cập nhật đơn vị KCB"
      modalWidth={900}
      searchPlaceholder="Tên, mã, địa chỉ, số giấy phép"
      onRowClick={(f) => setViewId(f.id)}
      deleteMessage={(f) => `Xóa "${f.name}"? Cơ sở đã phát sinh vi phạm / kiểm tra thì chỉ có thể tắt theo dõi.`}
      toForm={(f) => ({
        ...Object.fromEntries(fields.map((x) => [x.name, f[x.name] ?? ""])),
        licenseIssuedDate: toDateInput(f.licenseIssuedDate),
        licensedTechniques: f.licensedTechniques || [],
      })}
      toPayload={(v, mode) => {
        const fs = mode === "edit" ? fields.filter((x) => !x.createOnly) : fields;
        const body = cleanPayload(fs, v, { keepEmpty: mode === "edit" });
        if (mode === "create") body.createAccount = v.createAccount !== false;
        return body;
      }}
      onSaved={(res, mode) => mode === "create" && setCreated(res)}
      createDefaults={{ createAccount: true }}
      beforeTable={() =>
        created && (
          <Alert tone="success">
            Đã thêm <strong>{created.facility?.name}</strong>.
            {created.account?.temporaryPassword ? (
              <>
                {" "}
                Tài khoản đăng nhập của cơ sở: <span className="ui-code">{created.account.email}</span> / mật khẩu tạm{" "}
                <span className="ui-code">{created.account.temporaryPassword}</span> (chỉ hiển thị 1 lần).
              </>
            ) : created.account?.reason ? (
              ` Chưa tạo tài khoản: ${created.account.reason}.`
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setCreated(null)} style={{ marginLeft: 8 }}>
              Đóng
            </Button>
          </Alert>
        )
      }
      headerActions={(ctx) =>
        !readOnly && (
          <ImportButton
            path="/facilities"
            onDraft={(res) => {
              const dr = res.draft || {};
              ctx.openCreate(
                { ...Object.fromEntries(fields.map((f) => [f.name, dr[f.name] ?? ""])), licensedTechniques: dr.licensedTechniques || [], createAccount: true },
                <ImportNotice result={res} labels={FIELD_LABELS} />,
              );
            }}
          />
        )
      }
      filters={(list) => (
        <>
          <FilterSelect list={list} name="typeId" label="Loại hình" options={types} />
          <FilterSelect list={list} name="operatingStatus" label="Tình trạng" options={options("facilityOperatingStatus")} />
          <FilterSelect list={list} name="riskLevel" label="Mức rủi ro" options={options("riskLevel")} />
          <FilterSelect list={list} name="isBlacklisted" label="Danh sách đen" options={[{ value: "true", label: "Có" }, { value: "false", label: "Không" }]} />
        </>
      )}
      rowActions={(f) => (
        <Button size="sm" variant="secondary" icon={Eye} onClick={() => setViewId(f.id)}>
          Xem
        </Button>
      )}
    >
      {(ctx) => viewId && <FacilityDetail id={viewId} canManage={!readOnly} onClose={() => setViewId(null)} onChanged={ctx.reload} />}
    </CrudPage>
  );
}
