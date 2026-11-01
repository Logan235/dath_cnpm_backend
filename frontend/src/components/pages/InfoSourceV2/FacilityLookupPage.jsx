"use client";

import { useState } from "react";
import Tabs from "@/components/Tabs";
import FacilitiesPage from "./FacilitiesPage";
import LicensesPage from "./LicensesPage";

/** Tra cứu đơn vị KCB và giấy phép (chỉ xem) — dùng cho cán bộ An ninh mạng */
export default function FacilityLookupPage() {
  const [tab, setTab] = useState("facilities");
  return (
    <>
      <div style={{ marginTop: 16 }}>
        <Tabs
          tabs={[
            { key: "facilities", label: "Đơn vị khám chữa bệnh" },
            { key: "licenses", label: "Giấy phép / chứng chỉ hành nghề" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      {tab === "facilities" ? <FacilitiesPage readOnly /> : <LicensesPage readOnly />}
    </>
  );
}
