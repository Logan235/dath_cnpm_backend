"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { portalPath } from "@/lib/auth";
import { useAction, useOptions, usePaged, useSession } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtNumber } from "@/lib/format";
import { Button, Card, FilterBar, FilterSelect, Modal, PagedTable, Page, PageHeader, SchemaForm, StatusBadge, cleanPayload, toast, validateRequired } from "@/components/ui";

export function useSuspectFields() {
  const facilities = useOptions("/facilities", (f) => ({ value: f.id, label: f.name }));
  return [
    { name: "name", label: "Tên đối tượng (cá nhân / tổ chức / trang)", required: true, span: "all" },
    { name: "representative", label: "Người đại diện / chủ tài khoản" },
    { name: "taxCode", label: "Mã số thuế / CCCD" },
    { name: "address", label: "Địa chỉ", span: "all" },
    { name: "phones", label: "Số điện thoại", type: "list", hint: "Cách nhau dấu phẩy" },
    { name: "emails", label: "Email", type: "list" },
    { name: "websites", label: "Website / trang", type: "list", span: "all" },
    { name: "facilityId", label: "Là cơ sở KCB", type: "select", numeric: true, options: facilities, placeholder: "— Không —" },
    { name: "notes", label: "Ghi chú", type: "textarea", span: "all", rows: 2 },
  ];
}

/** Đối tượng vi phạm: khoanh vùng, điểm rủi ro theo Bảng 12.7 – 12.8 */
export default function SuspectsPage() {
  const router = useRouter();
  const { can } = useSession();
  const list = usePaged("/suspects", {});
  const fields = useSuspectFields();
  const [modal, setModal] = useState(null);
  const [busy, run] = useAction();

  const create = () =>
    run(async () => {
      const errors = validateRequired(fields, modal.values);
      if (Object.keys(errors).length) return setModal((m) => ({ ...m, errors }));
      try {
        const s = await api.post("/suspects", cleanPayload(fields, modal.values));
        toast.success(`Đã tạo đối tượng ${s.code}`);
        setModal(null);
        router.push(portalPath(`/suspects/detail?id=${s.id}`));
      } catch (e) {
        toast.error(e);
      }
    });

  return (
    <Page>
      <PageHeader
        title="Đối tượng vi phạm"
        subtitle="Cá nhân, tổ chức, tài khoản mạng xã hội quảng cáo vi phạm. Hệ thống đối soát trùng lặp (Levenshtein + Jaccard) và tính điểm rủi ro có suy giảm theo thời gian."
        crumbs={["Quản lý thông tin vi phạm"]}
        actions={
          can("suspect.manage") && (
            <Button icon={Plus} onClick={() => setModal({ values: {}, errors: {} })}>
              Thêm đối tượng
            </Button>
          )
        }
      />
      <Card title={`Danh sách đối tượng (${list.total})`}>
        <FilterBar list={list} searchPlaceholder="Tên, mã, số điện thoại, tài khoản">
          <FilterSelect list={list} name="status" label="Trạng thái" options={options("suspectStatus")} />
          <FilterSelect list={list} name="riskLevel" label="Mức rủi ro" options={options("riskLevel")} />
        </FilterBar>
        <PagedTable
          list={list}
          minWidth={980}
          onRowClick={(s) => router.push(portalPath(`/suspects/detail?id=${s.id}`))}
          columns={[
            {
              key: "n",
              title: "Đối tượng",
              render: (s) => (
                <>
                  <div className="ui-cell-main">{s.name}</div>
                  <div className="ui-cell-sub ui-code">{s.code}</div>
                </>
              ),
            },
            { key: "p", title: "Số điện thoại", render: (s) => (s.phones || []).join(", ") },
            { key: "a", title: "Tài khoản MXH", render: (s) => (s.accounts || []).map((a) => `${label("platform", a.platform)}: ${a.displayName || a.platformUid}`).join("; ") },
            { key: "v", title: "Số vi phạm", num: true, render: (s) => fmtNumber(s.violationCount) },
            { key: "r", title: "Điểm rủi ro", num: true, render: (s) => <strong>{Number(s.riskScore || 0).toFixed(0)}</strong> },
            { key: "l", title: "Mức", render: (s) => <StatusBadge group="riskLevel" value={s.riskLevel} /> },
            { key: "st", title: "Trạng thái", render: (s) => <StatusBadge group="suspectStatus" value={s.status} /> },
          ]}
        />
      </Card>
      <Modal
        open={!!modal}
        width={820}
        title="Thêm đối tượng vi phạm"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Hủy
            </Button>
            <Button loading={busy} onClick={create}>
              Thêm
            </Button>
          </>
        }
      >
        {modal && <SchemaForm fields={fields} values={modal.values} errors={modal.errors} onChange={(values) => setModal((m) => ({ ...m, values }))} />}
      </Modal>
    </Page>
  );
}
