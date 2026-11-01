-- =====================================================================
-- RESET — XÓA TOÀN BỘ bảng của hệ thống (mất hết dữ liệu!) để cài lại từ đầu.
-- Dùng khi muốn làm sạch database: npm run db:reset  (= reset.sql + schema.sql + seed.sql)
-- =====================================================================
DROP TABLE IF EXISTS
  case_updates, investigation_cases, suspect_match_candidates, facility_feedbacks,
  precheck_requests, penalty_decisions, violation_type_links, violations,
  platform_accounts, suspects, violation_types,
  ai_training_feedback, ad_reviews, ai_analyses, ai_models, whitelist_entries, ad_items,
  crawl_jobs, crawl_schedules, keywords, topics, crawl_sources, source_categories,
  licenses, legal_documents, legal_document_types,
  notifications, system_parameters, audit_logs, role_requests,
  role_permissions, user_roles, permissions, users, roles, facilities, facility_types, departments
CASCADE;
