import React, { useState } from "react";
import { COLORS } from "@/constants/colors";
import PageTitleBar from "@/components/PageTitleBar";
import Panel from "@/components/Panel";
import Tabs from "@/components/Tabs";
import { RotateCw, Download } from 'lucide-react';

const cacheItems = [
  "AbpZeroMultiTenantLocalizationDictionaryCache",
  "AbpZeroUserPermissions",
  "AspNet.Identity.SecurityStamp",
  "token_validity_key",
  "TempFileCacheName",
  "AbpZeroLanguages",
  "AbpTenantSettingsCache",
  "AbpZeroRolePermissions",
  "AbpUserSettingsCache",
  "AbpApplicationSettingsCache",
];

const logEntries = [
  "2026-08-16 21:18:52,921 [56 ] c.Infrastructure.ControllerActionInvoker - Executed action Common.gAMSPro.Web.Core.Controllers.CollectedNewsController.CM_COLLECTED_NEWS_S",
  "2026-08-16 21:18:52,921 [56 ] ft.AspNetCore.Routing.EndpointMiddleware - Executed endpoint &#39;Common.gAMSPro.Web.Core.Controllers.CollectedNewsController.CM_COLLECT",
  "2026-08-16 21:18:52,921 [56 ] Microsoft.AspNetCore.Hosting.Diagnostics - Request finished HTTP/1.1 POST http://medical-syt.gamspro.vn/API/api/CollectedNews/CM_COLLECTED_N",
  "2026-08-16 21:19:00,419 [55 ] Microsoft.AspNetCore.Hosting.Diagnostics - Request starting HTTP/1.1 POST http://medical-syt.gamspro.vn/API/api/ViolationType/CM_VIOLATION_TYPE",
  "2026-08-16 21:19:00,420 [55 ] pNetCore.Cors.Infrastructure.CorsService - CORS policy execution failed.",
  "2026-08-16 21:19:00,420 [55 ] pNetCore.Cors.Infrastructure.CorsService - Request origin https://medical-syt.gamspro.vn does not have permission to access the resource.",
  "2026-08-16 21:19:00,424 [55 ] ft.AspNetCore.Routing.EndpointMiddleware - Executing endpoint &#39;Common.gAMSPro.Web.Controllers.ViolationTypeController.CM_VIOLATION_TYP",
  "2026-08-16 21:19:00,428 [55 ] c.Infrastructure.ControllerActionInvoker - Route matched with {action = &quot;CM_VIOLATION_TYPE_Search&quot;,, controller = &quot;ViolationType&qu",
  "2026-08-16 21:19:00,779 [59 ] .Mvc.Infrastructure.ObjectResultExecutor - Executing ObjectResult, writing value of type &#39;Abp.Web.Models.AjaxResponse&#39;.",
  "2026-08-16 21:19:00,781 [59 ] c.Infrastructure.ControllerActionInvoker - Executed action Common.gAMSPro.Web.Controllers.ViolationTypeController.CM_VIOLATION_TYPE_Search (C",
  "2026-08-16 21:19:00,781 [59 ] ft.AspNetCore.Routing.EndpointMiddleware - Executed endpoint &#39;Common.gAMSPro.Web.Controllers.ViolationTypeController.CM_VIOLATION_TYP",
  "2026-08-16 21:19:00,781 [59 ] Microsoft.AspNetCore.Hosting.Diagnostics - Request finished HTTP/1.1 POST http://medical-syt.gamspro.vn/API/api/ViolationType/CM_VIOLATION_TYP",
  "2026-08-16 21:19:04,062 [55 ] Microsoft.AspNetCore.Hosting.Diagnostics - Request starting HTTP/1.1 POST http://medical-syt.gamspro.vn/API/signalr?enc_auth_token=DpjBBn3k3X77",
  "2026-08-16 21:19:04,062 [55 ] pNetCore.Cors.Infrastructure.CorsService - CORS policy execution failed.",
  "2026-08-16 21:19:04,062 [55 ] pNetCore.Cors.Infrastructure.CorsService - Request origin https://medical-syt.gamspro.vn does not have permission to access the resource.",
  "2026-08-16 21:19:04,067 [55 ] ft.AspNetCore.Routing.EndpointMiddleware - Executing endpoint &#39;signalr&#39;;",
  "2026-08-16 21:19:04,067 [55 ] ft.AspNetCore.Routing.EndpointMiddleware - Executed endpoint &#39;signalr&#39;;",
  "2026-08-16 21:19:04,068 [55 ] Microsoft.AspNetCore.Hosting.Diagnostics - Request finished HTTP/1.1 POST http://medical-syt.gamspro.vn/API/signalr?enc_auth_token=DpjBBn3k3X77",
  "2026-08-16 21:19:07,313 [55 ] Microsoft.AspNetCore.Hosting.Diagnostics - Request starting HTTP/1.1 POST http://medical-syt.gamspro.vn/API/api/WHITELIST/CM_WHITELIST_Searc",
  "2026-08-16 21:19:07,313 [55 ] pNetCore.Cors.Infrastructure.CorsService - CORS policy execution failed.",
];

function MaintenancePage() {
  const [tab, setTab] = useState("cache");

  const smallBtn = (bg, color, border) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 34,
    padding: "0 16px",
    background: bg,
    color: color,
    border: border || "none",
    borderRadius: 4,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  });

  return (
    <div>
      <PageTitleBar title="BẢO TRÌ" />
      <Panel>
        <Tabs
          tabs={[
            { key: "cache", label: "Bộ nhớ cache" },
            { key: "log", label: "Thông tin log websites" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === "cache" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#071437" }}>Nội dung cache</div>
              <button style={smallBtn(COLORS.headerTextBlue, "#fff")}>
                <RotateCw size={13} /> Xóa tất cả
              </button>
            </div>
            <div>
              {cacheItems.map((name, i) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 0",
                    borderBottom: i === cacheItems.length - 1 ? "none" : "1px solid #eceef1",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#071437" }}>{name}</span>
                  <button style={smallBtn(COLORS.headerTextBlue, "#fff")}>Xóa</button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#071437" }}>Thông tin log websites</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={smallBtn(COLORS.pillGray, "#666", "1px solid " + COLORS.pillBorder)}>
                  <Download size={13} /> Tải xuống tất cả
                </button>
                <button style={smallBtn(COLORS.headerTextBlue, "#fff")}>
                  <RotateCw size={13} /> Tìm kiếm
                </button>
              </div>
            </div>
            <div>
              {logEntries.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 0",
                    borderBottom: "1px solid #eceef1",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      background: "#8b5cf6",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 3,
                    }}
                  >
                    INFO
                  </span>
                  <span style={{ fontSize: 12, color: "#071437", overflow: "hidden", textOverflow: "clip" }}>
                    {entry}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default MaintenancePage;