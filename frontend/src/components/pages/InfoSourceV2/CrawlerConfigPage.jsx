"use client";

import { useState } from "react";
import { Pause, Play, Plus, Square, Trash2, Zap } from "lucide-react";
import Tabs from "@/components/Tabs";
import { api, externalUrl } from "@/lib/api";
import { useApi, useOptions, usePaged } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  CrudPage,
  DataTable,
  Field,
  FilterSelect,
  PagedTable,
  Page,
  PageHeader,
  Select,
  StatusBadge,
  TextInput,
  confirmDialog,
  promptDialog,
  toast,
} from "@/components/ui";
import { CatalogTab } from "./CatalogsPage";

const DATA_TYPES = options("dataFormat", ["TEXT", "IMAGE", "VIDEO", "AUDIO"]);

function SchedulesTab() {
  const sources = useOptions("/crawl-sources", (s) => ({ value: s.id, label: `${s.name} (${label("platform", s.platform)})` }));
  const topics = useOptions("/topics", (t) => ({ value: t.id, label: t.name }));

  const fields = [
    { name: "code", label: "Mã lịch", required: true, createOnly: true, hint: "Duy nhất, VD LTT-004" },
    { name: "name", label: "Tên lịch thu thập", required: true },
    { name: "sourceId", label: "Nguồn thu thập", type: "select", numeric: true, required: true, options: sources },
    { name: "topicId", label: "Chủ đề", type: "select", numeric: true, options: topics, placeholder: "— Không —" },
    { name: "primaryKeywords", label: "Từ khóa chính", required: true, span: "all", hint: "Cách nhau dấu phẩy, không ký tự đặc biệt. VD nâng mũi, hút mỡ" },
    { name: "secondaryKeywords", label: "Từ khóa phụ", span: "all" },
    { name: "dataTypes", label: "Loại dữ liệu", type: "chips", options: DATA_TYPES, span: "all" },
    { name: "frequency", label: "Tần suất", type: "select", options: options("frequency"), placeholder: false },
    { name: "sampleLimit", label: "Số mẫu tối đa", type: "number", min: 1 },
  ];

  const act = async (s, action, reload) => {
    try {
      await api.post(`/crawl-schedules/${s.id}/${action}`);
      toast.success({ start: "Đã kích hoạt lịch", pause: "Đã tạm dừng", stop: "Đã dừng lịch" }[action]);
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const run = async (s, reload) => {
    const n = await promptDialog({
      title: `Chạy ngay: ${s.name}`,
      message: "Crawler đang ở chế độ giả lập: hệ thống sinh mẫu tin quảng cáo theo từ khóa của lịch và đưa vào bước kiểm tra nhanh.",
      label: "Số mẫu tin muốn thu về (1 – 50)",
      defaultValue: "5",
      rows: 1,
      required: true,
      confirmText: "Chạy",
    });
    if (!n) return;
    try {
      const r = await api.post(`/crawl-schedules/${s.id}/run`, { count: Math.min(50, Math.max(1, Number(n) || 5)) });
      toast.success(`Đã thu thập ${r.job?.itemsCollected ?? r.items?.length ?? 0} mẫu tin — xem ở "Kết quả thu thập tin".`);
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <CrudPage
      embedded
      title="Lịch thu thập tin"
      cardTitle="Lịch thu thập tin"
      subtitle="Lịch phải ở trạng thái Đang chạy mới chạy được. Mẫu tin thu về đi vào bước Kiểm tra nhanh QC."
      path="/crawl-schedules"
      columns={[
        {
          key: "n",
          title: "Lịch",
          render: (s) => (
            <>
              <div className="ui-cell-main">{s.name}</div>
              <div className="ui-cell-sub ui-code">{s.code}</div>
            </>
          ),
        },
        { key: "src", title: "Nguồn / chủ đề", render: (s) => [s.source?.name, s.topic?.name].filter(Boolean).join(" · ") },
        { key: "kw", title: "Từ khóa chính", render: (s) => s.primaryKeywords },
        { key: "f", title: "Tần suất", nowrap: true, render: (s) => label("frequency", s.frequency) },
        { key: "last", title: "Chạy gần nhất", nowrap: true, render: (s) => fmtDateTime(s.lastRunAt) || <span className="ui-muted">Chưa chạy</span> },
        { key: "st", title: "Trạng thái", render: (s) => <StatusBadge group="crawlStatus" value={s.status} /> },
      ]}
      fields={fields}
      createDefaults={{ frequency: "DAILY", dataTypes: ["TEXT"], sampleLimit: 500 }}
      toForm={(s) => ({ ...Object.fromEntries(fields.map((f) => [f.name, s[f.name] ?? ""])), dataTypes: s.dataTypes || [] })}
      modalWidth={760}
      filters={(list) => (
        <>
          <FilterSelect list={list} name="status" label="Trạng thái" options={options("crawlStatus")} />
          <FilterSelect list={list} name="sourceId" label="Nguồn" options={sources} />
          <FilterSelect list={list} name="topicId" label="Chủ đề" options={topics} />
        </>
      )}
      rowActions={(s, ctx) => (
        <>
          {s.status === "RUNNING" ? (
            <>
              <Button size="sm" variant="success" icon={Zap} onClick={() => run(s, ctx.reload)}>
                Chạy ngay
              </Button>
              <Button size="sm" variant="secondary" icon={Pause} onClick={() => act(s, "pause", ctx.reload)} aria-label="Tạm dừng" title="Tạm dừng" />
            </>
          ) : (
            <Button size="sm" variant="secondary" icon={Play} onClick={() => act(s, "start", ctx.reload)}>
              Kích hoạt
            </Button>
          )}
          {s.status !== "STOPPED" && <Button size="sm" variant="secondary" icon={Square} onClick={() => act(s, "stop", ctx.reload)} aria-label="Dừng" title="Dừng" />}
        </>
      )}
      deleteMessage={(s) => `Xóa lịch "${s.name}"?`}
    />
  );
}

function SourcesTab() {
  const cats = useOptions("/source-categories", (c) => ({ value: c.id, label: c.name }));
  const fields = [
    { name: "name", label: "Tên nguồn", required: true },
    { name: "categoryId", label: "Phân loại nguồn", type: "select", numeric: true, required: true, options: cats },
    { name: "platform", label: "Nền tảng", type: "select", required: true, options: options("platform").filter((o) => o.value !== "CHUA_PHAN_LOAI") },
    { name: "url", label: "Đường dẫn" },
    { name: "note", label: "Ghi chú", type: "textarea", span: "all", rows: 2 },
  ];
  return (
    <CrudPage
      embedded
      title="Nguồn thu thập"
      cardTitle="Nguồn thu thập"
      subtitle="Trang / nền tảng mà crawler theo dõi."
      path="/crawl-sources"
      showSearch={false}
      columns={[
        { key: "n", title: "Tên nguồn", render: (s) => <span className="ui-cell-main">{s.name}</span> },
        { key: "c", title: "Phân loại", render: (s) => s.category?.name },
        { key: "p", title: "Nền tảng", render: (s) => label("platform", s.platform) },
        { key: "u", title: "Đường dẫn", render: (s) => (s.url ? <a className="ui-link" href={externalUrl(s.url)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{s.url}</a> : null) },
        { key: "st", title: "Trạng thái", render: (s) => <StatusBadge group="active" value={String(s.isActive)} /> },
      ]}
      fields={fields}
      statusToggle={{ field: "isActive" }}
      filters={(list) => <FilterSelect list={list} name="categoryId" label="Phân loại" options={cats} />}
      deleteMessage={(s) => `Xóa nguồn "${s.name}"? Nguồn đang có lịch thu thập thì chỉ có thể tắt.`}
    />
  );
}

function KeywordsPanel({ topicId }) {
  const t = useApi(topicId ? `/topics/${topicId}` : null);
  const [kw, setKw] = useState("");
  const [type, setType] = useState("PRIMARY");
  if (!topicId) return null;
  const add = async () => {
    if (!kw.trim()) return;
    try {
      await api.post(`/topics/${topicId}/keywords`, { keyword: kw.trim(), keywordType: type });
      setKw("");
      t.reload();
    } catch (e) {
      toast.error(e);
    }
  };
  const update = async (k, body) => {
    try {
      await api.patch(`/keywords/${k.id}`, body);
      t.reload();
    } catch (e) {
      toast.error(e);
    }
  };
  const remove = async (k) => {
    if (!(await confirmDialog({ title: "Xóa từ khóa", message: `Xóa từ khóa "${k.keyword}"?`, danger: true, confirmText: "Xóa" }))) return;
    try {
      await api.del(`/keywords/${k.id}`);
      t.reload();
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Card title={`Từ khóa của chủ đề: ${t.data?.name || ""}`}>
      <div className="ui-filters">
        <Field label="Từ khóa mới">
          <TextInput value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="VD tiêm filler" />
        </Field>
        <Field label="Loại">
          <Select value={type} onChange={(e) => setType(e.target.value)} options={options("keywordType")} />
        </Field>
        <Button icon={Plus} onClick={add}>
          Thêm
        </Button>
      </div>
      <DataTable
        minWidth={520}
        rows={t.data?.keywords || []}
        loading={t.loading}
        empty="Chưa có từ khóa"
        columns={[
          { key: "k", title: "Từ khóa", render: (k) => <span className="ui-cell-main">{k.keyword}</span> },
          {
            key: "t",
            title: "Loại",
            render: (k) => (
              <Select value={k.keywordType} onChange={(e) => update(k, { keywordType: e.target.value })} options={options("keywordType")} aria-label="Loại từ khóa" />
            ),
          },
          {
            key: "a",
            title: "Đang dùng",
            render: (k) => (
              <Button size="sm" variant="secondary" onClick={() => update(k, { isActive: !k.isActive })}>
                {k.isActive ? "Đang dùng" : "Đã tắt"}
              </Button>
            ),
          },
          { key: "x", title: "", render: (k) => <Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(k)} aria-label="Xóa" title="Xóa" /> },
        ]}
      />
    </Card>
  );
}

function TopicsTab() {
  const [topicId, setTopicId] = useState(null);
  return (
    <>
      <CatalogTab
        path="/topics"
        title="Chủ đề thu thập"
        subtitle="Bấm vào một chủ đề để quản lý từ khóa. Từ khóa dùng để lọc mẫu tin liên quan và gợi ý lĩnh vực."
        onRowClick={(t) => setTopicId(t.id)}
        activeKey={topicId}
      />
      <KeywordsPanel key={topicId} topicId={topicId} />
    </>
  );
}

function JobsTab() {
  const schedules = useOptions("/crawl-schedules", (s) => ({ value: s.id, label: s.name }));
  const list = usePaged("/crawl-jobs", {});
  return (
    <Card title="Phiên thu thập">
      <div className="ui-filters">
        <FilterSelect list={list} name="scheduleId" label="Lịch thu thập" options={schedules} />
      </div>
      <PagedTable
        list={list}
        minWidth={760}
        columns={[
          { key: "id", title: "Phiên", render: (j) => <span className="ui-code">#{j.id}</span> },
          { key: "s", title: "Lịch", render: (j) => j.schedule?.name || <span className="ui-muted">Nhập trực tiếp (API)</span> },
          { key: "b", title: "Bắt đầu", nowrap: true, render: (j) => fmtDateTime(j.startedAt) },
          { key: "e", title: "Kết thúc", nowrap: true, render: (j) => fmtDateTime(j.finishedAt) },
          { key: "n", title: "Số mẫu tin", num: true, render: (j) => j.itemsCollected },
          { key: "st", title: "Trạng thái", render: (j) => <StatusBadge group="crawlJobStatus" value={j.status} /> },
          { key: "note", title: "Ghi chú", render: (j) => j.note },
        ]}
      />
    </Card>
  );
}

const TABS = [
  { key: "schedules", label: "Lịch thu thập" },
  { key: "sources", label: "Nguồn thu thập" },
  { key: "topics", label: "Chủ đề & từ khóa" },
  { key: "jobs", label: "Phiên thu thập" },
];

export default function CrawlerConfigPage() {
  const [tab, setTab] = useState("schedules");
  return (
    <Page>
      <PageHeader
        title="Quản lý thu thập tin"
        subtitle="Cấu hình nguồn, chủ đề, từ khóa và lịch cho crawler. Bản demo dùng crawler giả lập; crawler thật gửi dữ liệu vào POST /ad-items/ingest."
        crumbs={["Quản lý nguồn thông tin"]}
        actions={<Badge tone="info">Crawler: chế độ giả lập</Badge>}
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "schedules" && <SchedulesTab />}
      {tab === "sources" && <SourcesTab />}
      {tab === "topics" && <TopicsTab />}
      {tab === "jobs" && <JobsTab />}
    </Page>
  );
}
