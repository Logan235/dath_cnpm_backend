"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, MapPin, Phone, Search, Send, ShieldAlert } from "lucide-react";
import { api, externalUrl } from "@/lib/api";
import { useAction, useApi, useOptions, usePaged, useSession } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDate, fmtDateTime, truncate } from "@/lib/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  FilterBar,
  FilterSelect,
  InfoGrid,
  Loading,
  Modal,
  PagedTable,
  Page,
  PageHeader,
  Pager,
  Select,
  StatusBadge,
  TextArea,
  TextInput,
  toast,
} from "@/components/ui";
import { PrecheckForm, PrecheckResult } from "../Violation/precheck";
import { MyPrechecks } from "../Facility/FacilityPages";

const TRUST_TONE = { UY_TIN: "success", CAN_LUU_Y: "warning", CANH_BAO: "danger", KHONG_HOAT_DONG: "danger" };

/* ------------------------------------------------------------------ */
/* Kiểm tra quảng cáo                                                   */
/* ------------------------------------------------------------------ */
function LookupBox() {
  const [code, setCode] = useState("");
  const [res, setRes] = useState(null);
  const [busy, run] = useAction();
  const go = () =>
    run(async () => {
      if (!code.trim()) return;
      try {
        setRes(await api.get(`/prechecks/lookup/${encodeURIComponent(code.trim())}`));
      } catch (e) {
        setRes(null);
        toast.error(e);
      }
    });
  return (
    <Card title="Tra cứu kết quả theo mã">
      <div className="ui-searchbox" style={{ maxWidth: 480 }}>
        <TextInput value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="VD KT-2026-0003" />
        <Button variant="secondary" icon={Search} loading={busy} onClick={go}>
          Tra cứu
        </Button>
      </div>
      {res && (
        <div className="ui-mt">
          <PrecheckResult data={{ ...res, result: res.finalResult }} showSteps={false} />
        </div>
      )}
    </Card>
  );
}

export function CitizenPrecheckPage() {
  const [res, setRes] = useState(null);
  return (
    <Page>
      <PageHeader
        title="Kiểm tra thông tin quảng cáo y tế"
        subtitle="Gặp một quảng cáo khám chữa bệnh, thẩm mỹ, thuốc...? Dán nội dung vào đây để kiểm tra cơ sở có được cấp phép, kỹ thuật có đúng phạm vi và nội dung có vi phạm quy định quảng cáo không. Không cần đăng nhập."
      />
      <div className="ui-split">
        <div style={{ minWidth: 0 }}>
          <PrecheckForm onResult={setRes} />
          {res && (
            <Card title="Kết quả kiểm tra">
              <PrecheckResult data={res} />
              {res.result !== "PASS" && (
                <Alert tone="info" style={{ marginTop: 14, marginBottom: 0 }}>
                  Nghi ngờ quảng cáo vi phạm? <Link className="ui-link" href="/citizen/report">Gửi phản ánh cho Sở Y tế →</Link>
                </Alert>
              )}
            </Card>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <LookupBox />
          <Card title="Hướng dẫn">
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
              <li>Dán nội dung quảng cáo (hoặc tải ảnh / tài liệu).</li>
              <li>Nhập tên cơ sở, số giấy phép nếu quảng cáo có ghi.</li>
              <li>Bấm Kiểm tra: hệ thống trích xuất thông tin và đối chiếu với cơ sở dữ liệu của Sở Y tế.</li>
              <li>Lưu lại mã tra cứu để xem lại kết quả.</li>
            </ol>
            <div className="ui-hint ui-mt">Kết quả là đánh giá sơ bộ tự động, không thay thế kết luận của cơ quan chức năng.</div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Tra cứu cơ sở KCB                                                    */
/* ------------------------------------------------------------------ */
function PublicFacilityModal({ id, onClose }) {
  const d = useApi(`/public/facilities/${id}`);
  const f = d.data;
  return (
    <Modal open width={860} title={f?.name || "Cơ sở khám chữa bệnh"} onClose={onClose}>
      {!f ? (
        <Loading />
      ) : (
        <>
          <Alert tone={TRUST_TONE[f.trustLevel] || "info"}>
            <strong>{label("trustLevel", f.trustLevel)}</strong> — {f.trustLabel}
          </Alert>
          <InfoGrid
            items={[
              { label: "Loại hình", value: f.type },
              { label: "Tình trạng", value: <StatusBadge group="facilityOperatingStatus" value={f.operatingStatus} /> },
              { label: "Địa chỉ", value: f.address, wide: true },
              { label: "Điện thoại", value: f.phone },
              { label: "Website", value: f.website ? <a className="ui-link" href={externalUrl(f.website)} target="_blank" rel="noreferrer">{f.website}</a> : null },
              { label: "Người đại diện", value: f.representative },
              { label: "Thời gian làm việc", value: f.workingHours },
              { label: "Số giấy phép hoạt động", value: f.licenseNumber },
              { label: "Phạm vi chuyên môn", value: f.professionalScope, wide: true },
              {
                label: "Kỹ thuật được cấp phép",
                wide: true,
                value: (
                  <div className="ui-chips">
                    {(f.licensedTechniques || []).map((t) => (
                      <span key={t} className="ui-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                ),
              },
            ]}
          />
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Giấy phép
          </div>
          <DataTable
            minWidth={520}
            showIndex={false}
            rows={f.licenses || []}
            rowKey={(r, i) => i}
            empty="Không có"
            columns={[
              { key: "t", title: "Loại", render: (l) => l.type },
              { key: "n", title: "Số", render: (l) => <span className="ui-code">{l.number}</span> },
              { key: "i", title: "Ngày cấp", render: (l) => fmtDate(l.issuedDate) },
              { key: "e", title: "Hết hạn", render: (l) => fmtDate(l.expiryDate) || "Không thời hạn" },
              { key: "v", title: "Hiệu lực", render: (l) => <Badge tone={l.valid ? "success" : "danger"}>{l.valid ? "Còn hiệu lực" : "Hết hiệu lực"}</Badge> },
            ]}
          />
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Bác sĩ có chứng chỉ hành nghề tại cơ sở
          </div>
          <DataTable
            minWidth={520}
            showIndex={false}
            rows={f.doctors || []}
            rowKey={(r, i) => i}
            empty="Chưa có dữ liệu"
            columns={[
              { key: "n", title: "Họ tên", render: (x) => <span className="ui-cell-main">{x.name}</span> },
              { key: "t", title: "Chức danh", render: (x) => x.title },
              { key: "c", title: "Số CCHN", render: (x) => <span className="ui-code">{x.certificate}</span> },
              { key: "v", title: "Hiệu lực", render: (x) => <Badge tone={x.valid ? "success" : "danger"}>{x.valid ? "Hợp lệ" : "Không hợp lệ"}</Badge> },
            ]}
          />
          {(f.confirmedViolations || []).length > 0 && (
            <>
              <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
                Vi phạm đã xác nhận
              </div>
              <DataTable
                minWidth={520}
                showIndex={false}
                rows={f.confirmedViolations}
                rowKey={(r, i) => i}
                columns={[
                  { key: "c", title: "Hồ sơ", render: (x) => <span className="ui-code">{x.code}</span> },
                  { key: "d", title: "Ngày", render: (x) => fmtDate(x.detectedAt) },
                  { key: "t", title: "Hành vi", render: (x) => (x.types || []).join(", ") },
                  { key: "s", title: "Tình trạng xử lý", render: (x) => x.status },
                ]}
              />
            </>
          )}
        </>
      )}
    </Modal>
  );
}

export function PublicFacilitiesPage() {
  const list = usePaged("/public/facilities", {}, { pageSize: 12 });
  const types = useOptions("/facility-types", (t) => ({ value: t.code, label: t.name }));
  const [viewId, setViewId] = useState(null);
  const [tech, setTech] = useState("");
  return (
    <Page>
      <PageHeader title="Tra cứu cơ sở khám chữa bệnh" subtitle="Kiểm tra cơ sở có được Sở Y tế cấp phép, được phép thực hiện kỹ thuật nào, có vi phạm hay không trước khi sử dụng dịch vụ." />
      <Card>
        <FilterBar list={list} searchPlaceholder="Tên cơ sở, địa chỉ, số giấy phép">
          <FilterSelect list={list} name="typeCode" label="Loại hình" options={types} />
          <Field label="Kỹ thuật / dịch vụ">
            <div className="ui-searchbox">
              <TextInput value={tech} onChange={(e) => setTech(e.target.value)} onKeyDown={(e) => e.key === "Enter" && list.setFilter("technique", tech.trim())} placeholder="VD nâng mũi, niềng răng" />
            </div>
          </Field>
        </FilterBar>
        {list.error && <Alert tone="danger">{list.error.message}</Alert>}
        <div className="ui-grid ui-grid-3">
          {list.rows.map((f) => (
            <button key={f.id} type="button" className="ui-stat" style={{ textAlign: "left" }} onClick={() => setViewId(f.id)}>
              <div className="ui-between" style={{ alignItems: "flex-start" }}>
                <div className="ui-cell-main" style={{ fontSize: 14 }}>
                  {f.name}
                </div>
                <Badge tone={TRUST_TONE[f.trustLevel] || "info"}>{label("trustLevel", f.trustLevel)}</Badge>
              </div>
              <div className="ui-cell-sub" style={{ marginTop: 4 }}>
                {f.type} · GP {f.licenseNumber}
              </div>
              <div style={{ fontSize: 12.5, color: "#3b4459", marginTop: 8, display: "flex", gap: 6 }}>
                <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {f.address}
              </div>
              {f.phone && (
                <div style={{ fontSize: 12.5, color: "#3b4459", marginTop: 4, display: "flex", gap: 6 }}>
                  <Phone size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {f.phone}
                </div>
              )}
              <div style={{ fontSize: 12, color: "#6b7385", marginTop: 8 }}>{truncate((f.licensedTechniques || []).join(", "), 110)}</div>
            </button>
          ))}
        </div>
        {!list.loading && !list.rows.length && <div className="ui-skeleton">Không tìm thấy cơ sở phù hợp.</div>}
        <Pager total={list.total} page={list.page} pageSize={list.pageSize} onPage={list.setPage} />
      </Card>
      {viewId && <PublicFacilityModal id={viewId} onClose={() => setViewId(null)} />}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Đơn vị vi phạm                                                       */
/* ------------------------------------------------------------------ */
export function ViolatingFacilitiesPage() {
  const list = usePaged("/public/violating-facilities", {});
  const [viewId, setViewId] = useState(null);
  return (
    <Page>
      <PageHeader title="Đơn vị khám chữa bệnh vi phạm" subtitle="Danh sách cơ sở có vi phạm quảng cáo đã được Sở Y tế xác nhận, công khai để người dân lưu ý." />
      <Card>
        <FilterBar list={list} searchPlaceholder="Tên cơ sở, số giấy phép">
          <Field label="Từ ngày">
            <TextInput type="date" value={list.filters.from || ""} onChange={(e) => list.setFilter("from", e.target.value)} />
          </Field>
          <Field label="Đến ngày">
            <TextInput type="date" value={list.filters.to || ""} onChange={(e) => list.setFilter("to", e.target.value)} />
          </Field>
        </FilterBar>
        <PagedTable
          list={list}
          minWidth={860}
          onRowClick={(f) => setViewId(f.id)}
          empty="Chưa có cơ sở vi phạm"
          columns={[
            {
              key: "n",
              title: "Cơ sở",
              render: (f) => (
                <>
                  <div className="ui-cell-main">{f.name}</div>
                  <div className="ui-cell-sub">{f.address}</div>
                </>
              ),
            },
            { key: "l", title: "Số giấy phép", render: (f) => <span className="ui-code">{f.licenseNumber}</span> },
            { key: "t", title: "Hành vi vi phạm", render: (f) => (f.violationTypes || []).join("; ") },
            { key: "c", title: "Số lần", num: true, render: (f) => f.violationCount },
            { key: "d", title: "Gần nhất", nowrap: true, render: (f) => fmtDate(f.lastViolationAt) },
            { key: "s", title: "Tình trạng", render: (f) => <StatusBadge group="facilityOperatingStatus" value={f.operatingStatus} /> },
            {
              key: "x",
              title: "",
              render: (f) => (
                <Button size="sm" variant="secondary" icon={Eye} onClick={(e) => (e.stopPropagation(), setViewId(f.id))}>
                  Xem
                </Button>
              ),
            },
          ]}
        />
      </Card>
      {viewId && <PublicFacilityModal id={viewId} onClose={() => setViewId(null)} />}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Phản ánh quảng cáo                                                   */
/* ------------------------------------------------------------------ */
export function ReportPage() {
  const { session } = useSession();
  const [v, setV] = useState({ content: "", sourceUrl: "", platform: "", reporterName: "", reporterContact: "" });
  const [res, setRes] = useState(null);
  const [busy, run] = useAction();
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const submit = () =>
    run(async () => {
      if (!v.content.trim()) return toast.error("Nhập nội dung quảng cáo cần phản ánh.");
      const body = Object.fromEntries(Object.entries(v).filter(([, x]) => x && x.trim()).map(([k, x]) => [k, x.trim()]));
      try {
        setRes(await api.post("/public/reports", body));
        setV({ content: "", sourceUrl: "", platform: "", reporterName: "", reporterContact: "" });
      } catch (e) {
        toast.error(e);
      }
    });
  return (
    <Page>
      <PageHeader
        title="Phản ánh quảng cáo y tế"
        subtitle="Gửi cho Sở Y tế quảng cáo bạn nghi ngờ vi phạm (cam kết khỏi bệnh, cơ sở không phép, bán thuốc kê đơn...). Phản ánh đi vào hàng xử lý của chuyên viên."
      />
      {res && (
        <Alert tone="success">
          {res.message} Mã phản ánh: <span className="ui-code">{res.code}</span>.{" "}
          {session?.accessToken ? (
            <Link className="ui-link" href="/citizen/mine">
              Theo dõi kết quả →
            </Link>
          ) : (
            <>
              <Link className="ui-link" href="/login?next=/citizen/mine">
                Đăng nhập
              </Link>{" "}
              để nhận thông báo kết quả cho các lần phản ánh sau.
            </>
          )}
        </Alert>
      )}
      <Card title="Nội dung phản ánh">
        <div className="ui-form">
          <Field label="Nội dung quảng cáo" required span="all">
            <TextArea rows={5} value={v.content} onChange={set("content")} placeholder="Chép lại nội dung quảng cáo, tên trang / cơ sở, số điện thoại..." />
          </Field>
          <Field label="Đường dẫn bài quảng cáo">
            <TextInput value={v.sourceUrl} onChange={set("sourceUrl")} placeholder="https://..." />
          </Field>
          <Field label="Nền tảng">
            <Select value={v.platform} onChange={set("platform")} options={options("platform").filter((o) => o.value !== "CHUA_PHAN_LOAI")} placeholder="— Chọn —" />
          </Field>
          {!session?.accessToken && (
            <>
              <Field label="Họ tên (không bắt buộc)">
                <TextInput value={v.reporterName} onChange={set("reporterName")} />
              </Field>
              <Field label="Email / SĐT liên hệ (không bắt buộc)">
                <TextInput value={v.reporterContact} onChange={set("reporterContact")} />
              </Field>
            </>
          )}
        </div>
        <div className="ui-row ui-mt">
          <Button icon={Send} loading={busy} onClick={submit} size="lg">
            Gửi phản ánh
          </Button>
          {session?.accessToken && <span className="ui-hint">Gửi với tài khoản {session.user?.email}</span>}
        </div>
      </Card>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Của tôi (người dân đã đăng nhập)                                     */
/* ------------------------------------------------------------------ */
export function CitizenMinePage() {
  const { session, ready } = useSession();
  const reports = useApi(session?.accessToken ? "/public/reports/mine" : null);
  if (!ready) return null;
  if (!session?.accessToken) {
    return (
      <Page>
        <PageHeader title="Của tôi" />
        <Alert tone="info">
          <Link className="ui-link" href="/login?next=/citizen/mine">
            Đăng nhập
          </Link>{" "}
          để xem các phản ánh và lần kiểm tra quảng cáo của bạn.
        </Alert>
      </Page>
    );
  }
  return (
    <Page>
      <PageHeader title="Của tôi" subtitle="Phản ánh đã gửi và lịch sử kiểm tra quảng cáo của bạn." />
      <Card title="Phản ánh đã gửi">
        <DataTable
          minWidth={640}
          loading={reports.loading}
          rows={Array.isArray(reports.data) ? reports.data : []}
          empty="Bạn chưa gửi phản ánh nào"
          columns={[
            { key: "c", title: "Mã", nowrap: true, render: (r) => <span className="ui-code">{r.code}</span> },
            { key: "t", title: "Nội dung", render: (r) => truncate(r.content, 120) },
            { key: "d", title: "Ngày gửi", nowrap: true, render: (r) => fmtDateTime(r.createdAt) },
            {
              key: "s",
              title: "Kết quả",
              render: (r) =>
                r.status === "CONFIRMED_VIOLATION" ? (
                  <Badge tone="danger">
                    <ShieldAlert size={12} /> Đã xác nhận vi phạm
                  </Badge>
                ) : r.status === "NOT_VIOLATION" ? (
                  <Badge tone="success">Không phát hiện vi phạm</Badge>
                ) : ["QC_REJECTED", "FILTER_REJECTED"].includes(r.status) ? (
                  <Badge>Không đủ căn cứ xử lý</Badge>
                ) : (
                  <Badge tone="info">Đang xử lý</Badge>
                ),
            },
          ]}
        />
      </Card>
      <MyPrechecks title="Lịch sử kiểm tra quảng cáo" />
    </Page>
  );
}
