-- =====================================================================
-- SCHEMA ĐẦY ĐỦ — Hệ thống AI phát hiện vi phạm quảng cáo y tế
-- Chạy được nhiều lần (idempotent):
--   * Database MỚI: tạo toàn bộ bảng.
--   * Database ĐÃ chạy init.sql cũ: giữ nguyên dữ liệu, chỉ bổ sung cột/bảng mới.
-- Cách chạy: `npm run db:setup` (tự chạy schema.sql + seed.sql), hoặc
-- pgAdmin > Query Tool > mở file này > F5, sau đó chạy seed.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. CÁC BẢNG GỐC (giống init.sql cũ)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facilities (
  id INT PRIMARY KEY,
  license_number VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  representative VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  last_login_at TIMESTAMP,
  created_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  department_id INT,
  facility_id INT,
  refresh_token VARCHAR(500),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (facility_id) REFERENCES facilities(id)
);

CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY,
  role_code VARCHAR(50) NOT NULL UNIQUE,
  role_name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INT PRIMARY KEY,
  permission_code VARCHAR(100) NOT NULL UNIQUE,
  permission_name VARCHAR(255) NOT NULL,
  module VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL,
  role_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- Id tự tăng cho các bảng gốc (trước đây phải tự nhập id)
CREATE SEQUENCE IF NOT EXISTS departments_id_seq OWNED BY departments.id;
ALTER TABLE departments ALTER COLUMN id SET DEFAULT nextval('departments_id_seq');
CREATE SEQUENCE IF NOT EXISTS facilities_id_seq OWNED BY facilities.id;
ALTER TABLE facilities ALTER COLUMN id SET DEFAULT nextval('facilities_id_seq');
CREATE SEQUENCE IF NOT EXISTS users_id_seq OWNED BY users.id;
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
CREATE SEQUENCE IF NOT EXISTS roles_id_seq OWNED BY roles.id;
ALTER TABLE roles ALTER COLUMN id SET DEFAULT nextval('roles_id_seq');
CREATE SEQUENCE IF NOT EXISTS permissions_id_seq OWNED BY permissions.id;
ALTER TABLE permissions ALTER COLUMN id SET DEFAULT nextval('permissions_id_seq');

-- ---------------------------------------------------------------------
-- B. MODULE QUẢN TRỊ HỆ THỐNG — bổ sung cột cho bảng gốc + bảng mới
-- ---------------------------------------------------------------------
ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES departments(id);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS org_type VARCHAR(50) NOT NULL DEFAULT 'PHONG_BAN';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS address VARCHAR(500);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'CITIZEN';
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(255);

CREATE TABLE IF NOT EXISTS role_requests (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  requested_role_code VARCHAR(50) NOT NULL,
  department_id INT REFERENCES departments(id),
  position VARCHAR(255),
  staff_code VARCHAR(100),
  phone VARCHAR(20),
  reason TEXT,
  attachment_path VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  reviewed_by BIGINT,
  review_note TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  user_email VARCHAR(255),
  role VARCHAR(50),
  action VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  description TEXT,
  ip_address VARCHAR(100),
  user_agent VARCHAR(500),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

CREATE TABLE IF NOT EXISTS system_parameters (
  id SERIAL PRIMARY KEY,
  param_key VARCHAR(100) NOT NULL UNIQUE,
  param_value TEXT,
  value_type VARCHAR(20) NOT NULL DEFAULT 'STRING',
  param_group VARCHAR(50),
  description VARCHAR(500),
  is_editable BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'INFO',
  link VARCHAR(500),
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ---------------------------------------------------------------------
-- C. MODULE QUẢN LÝ NGUỒN THÔNG TIN
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legal_document_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legal_documents (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  document_number VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  type_id INT NOT NULL REFERENCES legal_document_types(id),
  issuer VARCHAR(255),
  issued_date DATE,
  effective_date DATE,
  expiry_date DATE,
  field VARCHAR(255),
  summary TEXT,
  content TEXT,
  attachment_path VARCHAR(500),
  attachment_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_by BIGINT,
  updated_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facility_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE facilities ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS type_id INT REFERENCES facility_types(id);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS organization_form VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS ward VARCHAR(100);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS professional_scope TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS working_hours VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS license_issued_date DATE;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS licensed_techniques JSONB NOT NULL DEFAULT '[]';
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS operating_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS risk_score INT NOT NULL DEFAULT 0;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS risk_level VARCHAR(10) NOT NULL DEFAULT 'LOW';
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS violation_count INT NOT NULL DEFAULT 0;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS remediation_status VARCHAR(30) NOT NULL DEFAULT 'NONE';
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS created_by BIGINT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  license_number VARCHAR(100) NOT NULL,
  license_type VARCHAR(20) NOT NULL,
  facility_id INT REFERENCES facilities(id),
  holder_name VARCHAR(255),
  holder_title VARCHAR(255),
  issued_date DATE,
  expiry_date DATE,
  issuer VARCHAR(255),
  scope TEXT,
  attachment_path VARCHAR(500),
  attachment_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  note TEXT,
  created_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (license_type, license_number)
);

CREATE TABLE IF NOT EXISTS source_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crawl_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INT NOT NULL REFERENCES source_categories(id),
  platform VARCHAR(30) NOT NULL,
  url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS keywords (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL,
  topic_id INT REFERENCES topics(id) ON DELETE CASCADE,
  keyword_type VARCHAR(20) NOT NULL DEFAULT 'PRIMARY',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (topic_id, keyword)
);

CREATE TABLE IF NOT EXISTS crawl_schedules (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  source_id INT NOT NULL REFERENCES crawl_sources(id),
  topic_id INT REFERENCES topics(id),
  primary_keywords TEXT NOT NULL,
  secondary_keywords TEXT,
  data_types JSONB NOT NULL DEFAULT '["TEXT"]',
  frequency VARCHAR(50) NOT NULL DEFAULT 'DAILY',
  sample_limit INT NOT NULL DEFAULT 100,
  status VARCHAR(20) NOT NULL DEFAULT 'STOPPED',
  last_run_at TIMESTAMP,
  created_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id SERIAL PRIMARY KEY,
  schedule_id INT REFERENCES crawl_schedules(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP,
  items_collected INT NOT NULL DEFAULT 0,
  triggered_by BIGINT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- D. MODULE QUẢN LÝ XỬ LÝ THÔNG TIN QUẢNG CÁO
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_items (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  source_type VARCHAR(30) NOT NULL DEFAULT 'CRAWLER',
  crawl_job_id INT REFERENCES crawl_jobs(id) ON DELETE SET NULL,
  schedule_id INT REFERENCES crawl_schedules(id) ON DELETE SET NULL,
  crawl_source_id INT REFERENCES crawl_sources(id) ON DELETE SET NULL,
  topic_id INT REFERENCES topics(id) ON DELETE SET NULL,
  platform VARCHAR(30),
  source_url VARCHAR(1000),
  author_name VARCHAR(255),
  author_account VARCHAR(255),
  title VARCHAR(500),
  content TEXT NOT NULL,
  content_hash VARCHAR(64),
  media JSONB NOT NULL DEFAULT '[]',
  data_format VARCHAR(20) NOT NULL DEFAULT 'TEXT',
  published_at TIMESTAMP,
  collected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  likes INT NOT NULL DEFAULT 0,
  shares INT NOT NULL DEFAULT 0,
  views INT NOT NULL DEFAULT 0,
  comments INT NOT NULL DEFAULT 0,
  field VARCHAR(100),
  ad_subject VARCHAR(100),
  suspicion_level VARCHAR(10),
  status VARCHAR(30) NOT NULL DEFAULT 'COLLECTED',
  reject_reason VARCHAR(50),
  reject_note TEXT,
  qc_by BIGINT,
  qc_at TIMESTAMP,
  priority INT NOT NULL DEFAULT 0,
  assigned_to BIGINT REFERENCES users(id),
  facility_id INT REFERENCES facilities(id),
  reported_by BIGINT,
  reporter_name VARCHAR(255),
  reporter_contact VARCHAR(255),
  final_label VARCHAR(30),
  decided_by BIGINT,
  decided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ad_items_status ON ad_items(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_ad_items_hash ON ad_items(content_hash);

CREATE TABLE IF NOT EXISTS whitelist_entries (
  id SERIAL PRIMARY KEY,
  entry_type VARCHAR(20) NOT NULL,
  value VARCHAR(500) NOT NULL,
  facility_id INT REFERENCES facilities(id),
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (entry_type, value)
);

CREATE TABLE IF NOT EXISTS ai_models (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'BUILTIN_RULES',
  endpoint VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metrics JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_analyses (
  id BIGSERIAL PRIMARY KEY,
  ad_item_id BIGINT NOT NULL REFERENCES ad_items(id) ON DELETE CASCADE,
  model_id INT REFERENCES ai_models(id),
  label VARCHAR(30) NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  violation_types JSONB NOT NULL DEFAULT '[]',
  matched_rules JSONB NOT NULL DEFAULT '[]',
  extracted_entities JSONB NOT NULL DEFAULT '{}',
  legal_refs JSONB NOT NULL DEFAULT '[]',
  explanation TEXT,
  priority_score INT NOT NULL DEFAULT 0,
  is_latest BOOLEAN NOT NULL DEFAULT TRUE,
  processing_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_item ON ai_analyses(ad_item_id, is_latest);

CREATE TABLE IF NOT EXISTS ad_reviews (
  id BIGSERIAL PRIMARY KEY,
  ad_item_id BIGINT NOT NULL REFERENCES ad_items(id) ON DELETE CASCADE,
  analysis_id BIGINT REFERENCES ai_analyses(id) ON DELETE SET NULL,
  reviewer_id BIGINT NOT NULL REFERENCES users(id),
  decision VARCHAR(30) NOT NULL,
  agrees_with_ai BOOLEAN,
  corrected_violation_types JSONB NOT NULL DEFAULT '[]',
  severity VARCHAR(10),
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  is_reclassified BOOLEAN NOT NULL DEFAULT FALSE,
  license_status VARCHAR(30),
  compliant_status VARCHAR(30),
  reason TEXT,
  wrong_parts TEXT,
  duration_seconds INT,
  is_resolution BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_training_feedback (
  id BIGSERIAL PRIMARY KEY,
  ad_item_id BIGINT NOT NULL REFERENCES ad_items(id) ON DELETE CASCADE,
  analysis_id BIGINT,
  review_id BIGINT,
  model_id INT,
  ai_label VARCHAR(30),
  ai_violation_types JSONB NOT NULL DEFAULT '[]',
  human_label VARCHAR(30) NOT NULL,
  human_violation_types JSONB NOT NULL DEFAULT '[]',
  feedback_type VARCHAR(30) NOT NULL,
  note TEXT,
  content_snapshot TEXT NOT NULL,
  dataset_version VARCHAR(50),
  exported_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- E. MODULE QUẢN LÝ THÔNG TIN VI PHẠM
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS violation_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  weight INT NOT NULL DEFAULT 10,
  severity VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
  description TEXT,
  legal_document_id INT REFERENCES legal_documents(id),
  legal_basis VARCHAR(500),
  fine_min BIGINT NOT NULL DEFAULT 0,
  fine_max BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Entity (đối tượng vi phạm) — Bảng 12.9
CREATE TABLE IF NOT EXISTS suspects (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255),
  tax_code VARCHAR(20) UNIQUE,
  address VARCHAR(500),
  representative VARCHAR(255),
  phones JSONB NOT NULL DEFAULT '[]',
  emails JSONB NOT NULL DEFAULT '[]',
  websites JSONB NOT NULL DEFAULT '[]',
  facility_id INT REFERENCES facilities(id),
  risk_score INT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_level VARCHAR(10) NOT NULL DEFAULT 'LOW',
  status VARCHAR(30) NOT NULL DEFAULT 'MONITORING',
  violation_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_suspects_norm ON suspects(normalized_name);

-- Bảng PlatformAccount — Bảng 12.11
CREATE TABLE IF NOT EXISTS platform_accounts (
  id SERIAL PRIMARY KEY,
  suspect_id INT NOT NULL REFERENCES suspects(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  platform_uid VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  url VARCHAR(500),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by BIGINT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (platform, platform_uid)
);

-- Bảng Violation — Bảng 12.10 (mở rộng)
CREATE TABLE IF NOT EXISTS violations (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  title VARCHAR(500) NOT NULL,
  ad_item_id BIGINT REFERENCES ad_items(id) ON DELETE SET NULL,
  facility_id INT REFERENCES facilities(id),
  suspect_id INT REFERENCES suspects(id) ON DELETE SET NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
  content_snapshot TEXT,
  content_url VARCHAR(1000),
  evidence JSONB NOT NULL DEFAULT '[]',
  severity VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
  priority INT NOT NULL DEFAULT 0,
  reach INT NOT NULL DEFAULT 0,
  ai_confidence DOUBLE PRECISION,
  ai_model_code VARCHAR(50),
  specialist_conclusion TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'NEW',
  within_authority BOOLEAN,
  handling_result VARCHAR(30),
  handling_note TEXT,
  remediation_status VARCHAR(30) NOT NULL DEFAULT 'NONE',
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_to BIGINT REFERENCES users(id),
  created_by BIGINT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_violations_facility_status ON violations(facility_id, status);
CREATE INDEX IF NOT EXISTS idx_violations_suspect_status ON violations(suspect_id, status);

CREATE TABLE IF NOT EXISTS violation_type_links (
  violation_id INT NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  violation_type_id INT NOT NULL REFERENCES violation_types(id),
  PRIMARY KEY (violation_id, violation_type_id)
);

CREATE TABLE IF NOT EXISTS penalty_decisions (
  id SERIAL PRIMARY KEY,
  decision_number VARCHAR(100) NOT NULL UNIQUE,
  violation_id INT NOT NULL REFERENCES violations(id),
  facility_id INT REFERENCES facilities(id),
  suspect_id INT REFERENCES suspects(id),
  offender_name VARCHAR(255) NOT NULL,
  violation_behavior TEXT NOT NULL,
  legal_basis TEXT,
  fine_amount BIGINT NOT NULL DEFAULT 0,
  additional_penalty TEXT,
  remedial_measures TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by BIGINT,
  approval_note TEXT,
  approved_at TIMESTAMP,
  issued_at TIMESTAMP,
  due_date DATE,
  execution_status VARCHAR(30) NOT NULL DEFAULT 'NOT_ISSUED',
  paid_at TIMESTAMP,
  created_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS precheck_requests (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  submitter_id BIGINT,
  submitter_type VARCHAR(20) NOT NULL,
  submitter_name VARCHAR(255),
  submitter_contact VARCHAR(255),
  facility_id INT REFERENCES facilities(id),
  facility_name_input VARCHAR(255),
  license_number_input VARCHAR(100),
  representative_input VARCHAR(255),
  content_text TEXT NOT NULL,
  content_url VARCHAR(1000),
  attachments JSONB NOT NULL DEFAULT '[]',
  extracted JSONB NOT NULL DEFAULT '{}',
  checks JSONB NOT NULL DEFAULT '[]',
  matching_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  risk_score INT NOT NULL DEFAULT 0,
  ai_result VARCHAR(20) NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL,
  final_result VARCHAR(20),
  reviewer_id BIGINT,
  review_note TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facility_feedbacks (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  facility_id INT NOT NULL REFERENCES facilities(id),
  violation_id INT REFERENCES violations(id) ON DELETE SET NULL,
  precheck_id INT REFERENCES precheck_requests(id) ON DELETE SET NULL,
  submitted_by BIGINT,
  feedback_type VARCHAR(30) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
  handled_by BIGINT,
  response_note TEXT,
  handled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suspect_match_candidates (
  id SERIAL PRIMARY KEY,
  violation_id INT REFERENCES violations(id) ON DELETE CASCADE,
  suspect_id INT NOT NULL REFERENCES suspects(id) ON DELETE CASCADE,
  extracted_name VARCHAR(255),
  extracted_identifiers JSONB NOT NULL DEFAULT '{}',
  score DOUBLE PRECISION NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  reviewed_by BIGINT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investigation_cases (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  violation_id INT NOT NULL REFERENCES violations(id),
  target_agency VARCHAR(30) NOT NULL,
  reason TEXT,
  request_content TEXT,
  severity VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
  status VARCHAR(30) NOT NULL DEFAULT 'TRANSFERRED',
  requested_by BIGINT,
  assigned_officer_id BIGINT REFERENCES users(id),
  suspect_id INT REFERENCES suspects(id) ON DELETE SET NULL,
  findings TEXT,
  result_summary TEXT,
  handling_measures TEXT,
  outcome VARCHAR(30),
  transferred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_updates (
  id SERIAL PRIMARY KEY,
  case_id INT NOT NULL REFERENCES investigation_cases(id) ON DELETE CASCADE,
  author_id BIGINT,
  author_role VARCHAR(50),
  action VARCHAR(50) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
