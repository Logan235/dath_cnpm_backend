import React from "react";
import PageTitleBar from "@/components/PageTitleBar";
import Panel from "@/components/Panel";

function ThemePlaceholderPage() {
  return (
    <div>
      <PageTitleBar title="CÀI ĐẶT GIAO DIỆN" />
      <Panel>
        <div style={{ padding: "50px 20px", textAlign: "center", color: "#9aa0ac", fontSize: 13 }}>
          Chưa có ảnh chụp màn hình gốc cho trang này — vui lòng cung cấp để tái tạo chính xác.
        </div>
      </Panel>
    </div>
  );
}

export default ThemePlaceholderPage;