/**
 * Đường dẫn tới trang chi tiết của một đối tượng nghiệp vụ theo vai trò đang đăng nhập.
 * Dùng cho thông báo, liên kết chéo giữa các trang (mẫu tin -> hồ sơ vi phạm -> đối tượng...).
 */
const MAP = {
  ADMIN: {
    role_request: () => "/admin/system-administration/role-requests",
    user: () => "/admin/system-administration/users",
  },
  SPECIALIST: {
    ad_item: (id) => `/specialist/review?id=${id}`,
    violation: (id) => `/specialist/violations/detail?id=${id}`,
    penalty_decision: () => "/specialist/handling",
    facility_feedback: (id) => `/specialist/facility-feedback?id=${id}`,
    precheck: (id) => `/specialist/prechecks?id=${id}`,
    suspect: (id) => `/specialist/suspects/detail?id=${id}`,
    facility: () => "/specialist/medical-facilities",
    license: () => "/specialist/licenses",
    legal_document: () => "/specialist/legal-documents",
    crawl_schedule: () => "/specialist/crawler-config",
  },
  MANAGER: {
    ad_item: (id) => `/manager/review?id=${id}`,
    violation: (id) => `/manager/violations/detail?id=${id}`,
    penalty_decision: () => "/manager/handling",
    role_request: () => "/manager/role-requests",
    precheck: (id) => `/manager/prechecks?id=${id}`,
    investigation_case: (id) => `/manager/cases?id=${id}`,
    suspect: (id) => `/manager/suspects/detail?id=${id}`,
  },
  CYBER_POLICE: {
    investigation_case: (id) => `/cyber-security/cases?id=${id}`,
    suspect: (id) => `/cyber-security/suspects/detail?id=${id}`,
    violation: (id) => `/cyber-security/violations/detail?id=${id}`,
  },
  FACILITY: {
    violation: (id) => `/facility/violations?id=${id}`,
    facility_feedback: (id) => `/facility/feedbacks?id=${id}`,
    precheck: () => "/facility/pre-check",
    penalty_decision: () => "/facility/violations",
    facility: () => "/facility/profile",
  },
  CITIZEN: {
    ad_item: () => "/citizen/mine",
    precheck: () => "/citizen/mine",
  },
};

export function entityHref(role, type, id) {
  const fn = MAP[role]?.[type];
  return fn ? fn(id) : null;
}
