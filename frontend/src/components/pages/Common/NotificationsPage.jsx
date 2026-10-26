"use client";

import { useRouter } from "next/navigation";
import { CheckCheck, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { usePaged, useSession } from "@/lib/hooks";
import { entityHref } from "@/lib/routes";
import { label } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { Badge, Button, Card, Checkbox, Page, PageHeader, Pager, toast } from "@/components/ui";

const TYPE_TONE = { TASK: "info", WARNING: "warning", ALERT: "danger", INFO: "neutral" };

export default function NotificationsPage() {
  const router = useRouter();
  const { role } = useSession();
  const list = usePaged("/notifications", {});

  const bump = () => window.dispatchEvent(new Event("admonitor-notifications"));

  const open = async (n) => {
    if (!n.isRead) {
      try {
        await api.post(`/notifications/${n.id}/read`);
        bump();
      } catch {
        /* vẫn mở được */
      }
    }
    const href = n.link || entityHref(role, n.entityType, n.entityId);
    if (href) router.push(href);
    else list.reload();
  };

  const readAll = async () => {
    try {
      await api.post("/notifications/read-all");
      toast.success("Đã đánh dấu đọc tất cả");
      bump();
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Thông báo"
        subtitle="Công việc mới được giao, kết quả duyệt, cảnh báo rủi ro..."
        actions={
          <Button variant="secondary" icon={CheckCheck} onClick={readAll}>
            Đánh dấu đã đọc tất cả
          </Button>
        }
      />
      <Card
        title={`Danh sách thông báo (${list.total})`}
        actions={<Checkbox label="Chỉ hiện chưa đọc" checked={list.filters.unreadOnly === "true"} onChange={(on) => list.setFilter("unreadOnly", on ? "true" : "")} />}
      >
        {list.error && <div className="ui-alert ui-alert-danger">{list.error.message}</div>}
        {!list.rows.length && !list.loading ? (
          <div className="ui-muted" style={{ padding: "24px 0", textAlign: "center" }}>
            Không có thông báo
          </div>
        ) : (
          <div className="ui-inbox-list">
            {list.rows.map((n) => {
              const href = n.link || entityHref(role, n.entityType, n.entityId);
              return (
                <button key={n.id} type="button" className="ui-inbox-item" onClick={() => open(n)} style={{ background: n.isRead ? "#fff" : "#f3f7fe" }}>
                  <div className="ui-inbox-item-top">
                    <span className="ui-inbox-item-title" style={{ fontWeight: n.isRead ? 500 : 700 }}>
                      {!n.isRead && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: "#3577DB", marginRight: 8 }} />}
                      {n.title}
                    </span>
                    <Badge tone={TYPE_TONE[n.type] || "neutral"}>{label("notificationType", n.type) || n.type}</Badge>
                  </div>
                  <div style={{ fontSize: 13, color: "#3b4459", lineHeight: 1.5 }}>{n.message}</div>
                  <div className="ui-inbox-item-meta" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {fmtDateTime(n.createdAt)}
                    {href && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#3577DB" }}>
                        <ExternalLink size={12} /> Mở
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <Pager total={list.total} page={list.page} pageSize={list.pageSize} onPage={list.setPage} />
      </Card>
    </Page>
  );
}
