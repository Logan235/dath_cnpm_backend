"use client";

import { useState } from "react";
import { Download, Pencil } from "lucide-react";
import Tabs from "@/components/Tabs";
import { api } from "@/lib/api";
import { useAction, useApi, usePaged, useSession } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDateTime, fmtPercent, truncate } from "@/lib/format";
import {
  Alert,
  BarList,
  Button,
  Card,
  Checkbox,
  DataTable,
  Field,
  FilterSelect,
  InfoGrid,
  Modal,
  PagedTable,
  Page,
  PageHeader,
  SchemaForm,
  Select,
  StatCard,
  StatusBadge,
  TextInput,
  toast,
} from "@/components/ui";
import { ViolationTypeChips, useViolationTypes } from "./common";

function Performance() {
  const p = useApi("/ai/performance");
  const d = p.data;
  if (!d) return null;
  const cm = d.confusionMatrix || {};
  return (
    <>
      <div className="ui-grid ui-grid-4 ui-mb">
        <StatCard label="Mẫu tin đã có kết luận của chuyên viên" value={d.evaluatedItems} />
        <StatCard label="Độ chính xác (Accuracy)" value={fmtPercent(d.accuracy, 1)} />
        <StatCard label="Precision / Recall" value={`${fmtPercent(d.precision)} / ${fmtPercent(d.recall)}`} />
        <StatCard label="F1-score" value={fmtPercent(d.f1, 1)} tone={d.f1 >= 0.8 ? "success" : "warning"} />
      </div>
      <div className="ui-grid ui-grid-2">
        <Card title="Ma trận nhầm lẫn (AI so với chuyên viên)">
          <table className="ui-table" style={{ border: "1px solid #e2e5eb" }}>
            <thead>
              <tr>
                <th></th>
                <th>Chuyên viên: Vi phạm</th>
                <th>Chuyên viên: Không vi phạm</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th style={{ background: "#f4f6fb" }}>AI: Vi phạm / nghi vấn</th>
                <td style={{ color: "#1f7a45", fontWeight: 700 }}>{cm.truePositive} (đúng)</td>
                <td style={{ color: "#b42318", fontWeight: 700 }}>{cm.falsePositive} (báo nhầm)</td>
              </tr>
              <tr>
                <th style={{ background: "#f4f6fb" }}>AI: Không vi phạm</th>
                <td style={{ color: "#b42318", fontWeight: 700 }}>{cm.falseNegative} (bỏ sót)</td>
                <td style={{ color: "#1f7a45", fontWeight: 700 }}>{cm.trueNegative} (đúng)</td>
              </tr>
            </tbody>
          </table>
          <div className="ui-hint ui-mt">
            Tỷ lệ chuyên viên đồng ý với AI: <strong>{fmtPercent(d.expertAgreementWithAi, 1)}</strong>. Đánh giá chéo: {d.interRater?.itemsWithMultipleReviews || 0} mẫu tin có
            nhiều người đánh giá, tỷ lệ thống nhất {fmtPercent(d.interRater?.agreementRate)}.
          </div>
        </Card>
        <Card title="Dữ liệu phản hồi theo loại">
          <BarList items={(d.feedbackByType || []).map((x) => ({ label: label("aiFeedbackType", x.type), value: x.count }))} />
        </Card>
      </div>
    </>
  );
}

function FeedbackData() {
  const types = useViolationTypes();
  const { can } = useSession();
  const list = usePaged("/ai/feedback", {});
  const [exp, setExp] = useState({ format: "jsonl", onlyNew: true, markExported: false, datasetVersion: "" });
  const [busy, run] = useAction();
  const [view, setView] = useState(null);

  const doExport = () =>
    run(async () => {
      try {
        await api.download(
          "/ai/feedback/export",
          { format: exp.format, onlyNew: String(exp.onlyNew), markExported: String(exp.markExported), datasetVersion: exp.datasetVersion || undefined },
          `ai-feedback.${exp.format}`,
        );
        toast.success("Đã xuất dữ liệu");
        if (exp.markExported) list.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  return (
    <>
      {can("ai_feedback.export") && (
        <Card title="Xuất dữ liệu tái huấn luyện">
          <div className="ui-filters" style={{ marginBottom: 0 }}>
            <Field label="Định dạng">
              <Select value={exp.format} onChange={(e) => setExp({ ...exp, format: e.target.value })} options={[{ value: "jsonl", label: "JSONL" }, { value: "csv", label: "CSV" }]} />
            </Field>
            <Field label="Phiên bản bộ dữ liệu">
              <TextInput value={exp.datasetVersion} onChange={(e) => setExp({ ...exp, datasetVersion: e.target.value })} placeholder="VD v2026.10" />
            </Field>
            <Checkbox label="Chỉ dữ liệu chưa xuất" checked={exp.onlyNew} onChange={(x) => setExp({ ...exp, onlyNew: x })} />
            <Checkbox label="Đánh dấu đã xuất" checked={exp.markExported} onChange={(x) => setExp({ ...exp, markExported: x })} />
            <Button icon={Download} loading={busy} onClick={doExport}>
              Xuất file
            </Button>
          </div>
        </Card>
      )}
      <Card title={`Dữ liệu đánh giá của chuyên viên (${list.total})`}>
        <p className="ui-card-sub">Mỗi lần chuyên viên kết luận một mẫu tin, hệ thống lưu cặp (kết quả AI, kết luận của người) để tái huấn luyện mô hình.</p>
        <div className="ui-filters">
          <FilterSelect list={list} name="feedbackType" label="Loại phản hồi" options={options("aiFeedbackType", ["CONFIRMED", "RELABEL", "FALSE_POSITIVE", "FALSE_NEGATIVE"])} />
          <FilterSelect list={list} name="exported" label="Đã xuất" options={[{ value: "true", label: "Đã xuất" }, { value: "false", label: "Chưa xuất" }]} />
        </div>
        <PagedTable
          list={list}
          minWidth={980}
          onRowClick={setView}
          columns={[
            { key: "t", title: "Thời gian", nowrap: true, render: (f) => fmtDateTime(f.createdAt) },
            { key: "c", title: "Nội dung", render: (f) => truncate(f.contentSnapshot, 110) },
            {
              key: "ai",
              title: "AI",
              render: (f) => (
                <>
                  <StatusBadge group="aiLabel" value={f.aiLabel} />
                  <div style={{ marginTop: 4 }}>
                    <ViolationTypeChips codes={f.aiViolationTypes} types={types} />
                  </div>
                </>
              ),
            },
            {
              key: "h",
              title: "Chuyên viên",
              render: (f) => (
                <>
                  <StatusBadge group="aiLabel" value={f.humanLabel} />
                  <div style={{ marginTop: 4 }}>
                    <ViolationTypeChips codes={f.humanViolationTypes} types={types} />
                  </div>
                </>
              ),
            },
            { key: "ft", title: "Loại", render: (f) => <StatusBadge group="aiFeedbackType" value={f.feedbackType} text={label("aiFeedbackType", f.feedbackType)} /> },
            { key: "e", title: "Đã xuất", render: (f) => (f.exportedAt ? `${f.datasetVersion || ""} ${fmtDateTime(f.exportedAt)}` : <span className="ui-muted">Chưa</span>) },
          ]}
        />
      </Card>
      <Modal open={!!view} title="Chi tiết dữ liệu phản hồi" onClose={() => setView(null)}>
        {view && (
          <InfoGrid
            items={[
              { label: "Nội dung", value: view.contentSnapshot, wide: true },
              { label: "AI kết luận", value: label("aiLabel", view.aiLabel) },
              { label: "Chuyên viên kết luận", value: label("aiLabel", view.humanLabel) },
              { label: "Loại vi phạm theo AI", value: <ViolationTypeChips codes={view.aiViolationTypes} types={types} />, wide: true },
              { label: "Loại vi phạm theo chuyên viên", value: <ViolationTypeChips codes={view.humanViolationTypes} types={types} />, wide: true },
              { label: "Ghi chú", value: view.note, wide: true },
            ]}
          />
        )}
      </Modal>
    </>
  );
}

function Models() {
  const m = useApi("/ai/models");
  const [edit, setEdit] = useState(null);
  const [busy, run] = useAction();
  const fields = [
    { name: "name", label: "Tên mô hình", span: "all" },
    { name: "version", label: "Phiên bản" },
    { name: "endpoint", label: "Địa chỉ API của mô hình", hint: "Để trống: dùng bộ luật có sẵn. Hoặc đặt AI_SERVICE_URL trong backend/.env", span: "all" },
    { name: "isActive", label: "Trạng thái", type: "checkbox", checkboxLabel: "Đang sử dụng" },
  ];
  const save = () =>
    run(async () => {
      try {
        await api.patch(`/ai/models/${edit.id}`, { name: edit.values.name, version: edit.values.version, endpoint: edit.values.endpoint || undefined, isActive: !!edit.values.isActive });
        toast.success("Đã cập nhật mô hình");
        setEdit(null);
        m.reload();
      } catch (e) {
        toast.error(e);
      }
    });
  return (
    <Card title="Mô hình AI">
      <Alert tone="info">Hiện dùng bộ luật (rule-based): từ khóa vi phạm + đối chiếu CSDL cơ sở, giấy phép, CCHN, phạm vi kỹ thuật. Khi có mô hình thật, khai báo địa chỉ API ở đây hoặc AI_SERVICE_URL.</Alert>
      <DataTable
        minWidth={720}
        rows={Array.isArray(m.data) ? m.data : []}
        loading={m.loading}
        columns={[
          {
            key: "n",
            title: "Mô hình",
            render: (x) => (
              <>
                <div className="ui-cell-main">{x.name}</div>
                <div className="ui-cell-sub ui-code">{x.code}</div>
              </>
            ),
          },
          { key: "v", title: "Phiên bản", render: (x) => x.version },
          { key: "p", title: "Loại", render: (x) => x.provider },
          { key: "e", title: "Endpoint", render: (x) => x.endpoint || <span className="ui-muted">Bộ luật có sẵn</span> },
          { key: "s", title: "Trạng thái", render: (x) => <StatusBadge group="active" value={String(x.isActive)} /> },
          {
            key: "x",
            title: "",
            render: (x) => (
              <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEdit({ id: x.id, values: { name: x.name, version: x.version, endpoint: x.endpoint || "", isActive: x.isActive } })}>
                Sửa
              </Button>
            ),
          },
        ]}
      />
      <Modal
        open={!!edit}
        title="Cập nhật mô hình AI"
        onClose={() => setEdit(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdit(null)}>
              Hủy
            </Button>
            <Button loading={busy} onClick={save}>
              Lưu
            </Button>
          </>
        }
      >
        {edit && <SchemaForm fields={fields} values={edit.values} onChange={(values) => setEdit({ ...edit, values })} />}
      </Modal>
    </Card>
  );
}

/** Thu thập đánh giá chuyên viên: hiệu suất AI, dữ liệu phản hồi (Human-in-the-loop), mô hình */
export default function ExpertFeedbackPage() {
  const [tab, setTab] = useState("perf");
  return (
    <Page>
      <PageHeader
        title="Dữ liệu đánh giá chuyên viên"
        subtitle="Đo hiệu suất AI so với kết luận của chuyên viên và xuất dữ liệu phản hồi để tái huấn luyện mô hình."
        crumbs={["Xử lý thông tin QC"]}
      />
      <Tabs
        tabs={[
          { key: "perf", label: "Hiệu suất AI" },
          { key: "data", label: "Dữ liệu phản hồi" },
          { key: "models", label: "Mô hình AI" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "perf" && <Performance />}
      {tab === "data" && <FeedbackData />}
      {tab === "models" && <Models />}
    </Page>
  );
}
