"use client";

import { useState } from "react";
import Link from "next/link";
import { Link2, ScanSearch, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { label } from "@/lib/labels";
import { fmtPercent } from "@/lib/format";
import { Alert, Button, Card, DataTable, Field, FilePicker, InfoGrid, Page, PageHeader, StatusBadge, TextArea, TextInput, toast } from "@/components/ui";
import { ViolationTypeChips, useViolationTypes } from "./common";

/**
 * Kiểm tra nhanh QC: nhập URL / dán nội dung / tải ảnh-tài liệu -> trích xuất thông tin,
 * đối chiếu GPHĐ, CCHN trong CSDL, kết luận sơ bộ của AI -> đưa vào hàng xử lý nếu cần.
 */
export default function QCCheckPage() {
  const types = useViolationTypes();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [ingested, setIngested] = useState(null);
  const [busy, run] = useAction();

  const extract = (mode) =>
    run(async () => {
      setIngested(null);
      try {
        if (mode === "file") {
          const r = await api.upload("/ad-items/qc/extract-file", file);
          setRes(r);
          if (r.content) setText(r.content);
        } else {
          if (!url.trim() && !text.trim()) {
            toast.error("Nhập URL hoặc dán nội dung quảng cáo.");
            return;
          }
          const r = await api.post("/ad-items/qc/extract", mode === "url" && url.trim() ? { url: url.trim() } : { text: text.trim(), url: url.trim() || undefined });
          setRes(r);
          if (r.content && !text.trim()) setText(r.content);
        }
      } catch (e) {
        toast.error(e);
      }
    });

  const ingest = () =>
    run(async () => {
      const content = (text || res?.content || "").trim();
      if (!content) return toast.error("Chưa có nội dung để đưa vào xử lý.");
      try {
        const r = await api.post("/ad-items/ingest", {
          sourceType: "MANUAL",
          items: [
            {
              content,
              sourceUrl: url.trim() || undefined,
              title: content.slice(0, 80),
              dataFormat: file && /\.(png|jpe?g|gif|webp)$/i.test(file.name) ? "IMAGE" : "TEXT",
              media: res?.file?.url ? [{ type: "FILE", url: res.file.url, name: res.file.name }] : undefined,
            },
          ],
        });
        setIngested(r);
        toast.success(`Đã tạo mẫu tin ${(r.items || []).map((i) => i.code).join(", ")}.`);
      } catch (e) {
        toast.error(e);
      }
    });

  const pre = res?.preliminary;
  return (
    <Page>
      <PageHeader
        title="Kiểm tra nhanh thông tin quảng cáo"
        subtitle="Nhập đường dẫn bài quảng cáo, dán nội dung hoặc tải ảnh / tài liệu. Hệ thống trích xuất tên cơ sở, số giấy phép, tên bác sĩ, đối chiếu với CSDL và cho kết luận sơ bộ."
        crumbs={["Xử lý thông tin QC"]}
      />
      <Card title="Thông tin cần kiểm tra">
        <div className="ui-form ui-form-1">
          <Field label="Đường dẫn (URL) bài quảng cáo" hint="Máy chủ tải trang về để đọc nội dung. Trang cần đăng nhập (Facebook...) thì dán nội dung vào ô bên dưới.">
            <div className="ui-searchbox">
              <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              <Button variant="secondary" icon={Link2} loading={busy} onClick={() => extract("url")} disabled={!url.trim()}>
                Lấy nội dung
              </Button>
            </div>
          </Field>
          <Field label="Nội dung quảng cáo">
            <TextArea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder="Dán nội dung bài quảng cáo..." />
          </Field>
          <div className="ui-row">
            <FilePicker accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onFiles={(f) => setFile(f[0])}>
              {file ? `Đã chọn: ${file.name}` : "Chọn ảnh / tài liệu"}
            </FilePicker>
            {file && (
              <Button variant="secondary" loading={busy} onClick={() => extract("file")}>
                Đọc nội dung file
              </Button>
            )}
            <Button icon={ScanSearch} loading={busy} onClick={() => extract("text")} disabled={!text.trim()}>
              Kiểm tra nội dung
            </Button>
          </div>
          <div className="ui-hint">Ảnh chưa có OCR: với ảnh, hệ thống lưu file làm bằng chứng — hãy gõ lại nội dung chữ trên ảnh vào ô Nội dung.</div>
        </div>
      </Card>

      {res && (
        <>
          {res.fetched && !res.fetched.ok && <Alert tone="warning">Không tải được URL ({res.fetched.error || `HTTP ${res.fetched.status}`}). Hãy dán nội dung.</Alert>}
          <Card title="Bảng kiểm tra GPHĐ, CCHN cơ sở, bác sĩ">
            <DataTable
              minWidth={640}
              rows={res.checkTable || []}
              rowKey={(r, i) => i}
              empty="Không trích xuất được cơ sở / giấy phép / bác sĩ nào"
              columns={[
                { key: "t", title: "Loại", render: (r) => r.type },
                { key: "e", title: "Thông tin trích xuất", render: (r) => r.extracted || <span className="ui-muted">Không có</span> },
                {
                  key: "d",
                  title: "Thông tin tìm kiếm trong CSDL",
                  render: (r) => <span style={{ color: r.ok ? "#1f7a45" : "#b42318", fontWeight: 600 }}>{r.dbResult}</span>,
                },
              ]}
            />
          </Card>
          <Card
            title="Kết luận sơ bộ của AI"
            actions={
              <Button icon={Send} loading={busy} onClick={ingest} disabled={!!ingested}>
                Đưa vào hàng xử lý
              </Button>
            }
          >
            {ingested && (
              <Alert tone="success">
                Đã tạo mẫu tin <strong>{(ingested.items || []).map((i) => i.code).join(", ")}</strong> ở bước <Link className="ui-link" href="/specialist/collect-results">Kết quả thu thập tin</Link>. Chuyên viên kiểm tra nhanh rồi chuyển AI phân tích và đánh giá.
              </Alert>
            )}
            <InfoGrid
              cols={3}
              items={[
                { label: "Kết luận", value: <StatusBadge group="aiLabel" value={pre?.label} /> },
                { label: "Độ tin cậy", value: fmtPercent(pre?.confidence, 1) },
                { label: "Cơ sở khớp trong CSDL", value: res.extracted?.matchedFacility ? `${res.extracted.matchedFacility.name} (${label("facilityOperatingStatus", res.extracted.matchedFacility.operatingStatus)})` : "Không" },
                { label: "Loại vi phạm gợi ý", value: <ViolationTypeChips codes={pre?.violationTypes} types={types} />, wide: true },
                { label: "Cam kết / tuyên bố", value: (res.extracted?.claims || []).join(", ") },
                { label: "Kỹ thuật", value: (res.extracted?.techniques || []).join(", ") },
                { label: "Số điện thoại", value: (res.extracted?.phones || []).join(", ") },
              ]}
            />
            {pre?.explanation && (
              <div className="ui-note ui-mt" style={{ whiteSpace: "pre-wrap" }}>
                {pre.explanation}
              </div>
            )}
          </Card>
        </>
      )}
    </Page>
  );
}
