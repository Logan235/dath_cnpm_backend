-- =====================================================================
-- SEED — dữ liệu mẫu để chạy thử toàn bộ luồng nghiệp vụ
-- Chạy SAU schema.sql. Chạy lại nhiều lần vẫn an toàn.
-- Mật khẩu của TẤT CẢ tài khoản demo:  Demo@123456
-- Văn bản pháp lý, cơ sở, giấy phép dưới đây là DỮ LIỆU MẪU phục vụ kiểm thử.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Vai trò (6 vai trò hệ thống)
-- ---------------------------------------------------------------------
INSERT INTO roles (id, role_code, role_name, description, is_system, is_active) VALUES
  (1, 'ADMIN',        'Quản trị hệ thống',          'Quản lý cơ cấu tổ chức, vai trò, người dùng, tài khoản, nhật ký, tham số hệ thống', TRUE, TRUE),
  (2, 'SPECIALIST',   'Chuyên viên Sở Y tế',        'Quản lý nguồn thông tin, xác thực cảnh báo AI (Human-in-the-loop), xử lý vi phạm', TRUE, TRUE),
  (3, 'FACILITY',     'Cơ sở khám chữa bệnh',       'Gửi kiểm tra trước nội dung quảng cáo, gửi giải trình/phản hồi vi phạm', TRUE, TRUE),
  (4, 'CYBER_POLICE', 'Cán bộ Phòng An ninh mạng',  'Tiếp nhận hồ sơ chuyển giao, khoanh vùng & xác minh đối tượng vi phạm', TRUE, TRUE),
  (5, 'CITIZEN',      'Người dân',                  'Tra cứu cơ sở uy tín, kiểm tra trước quảng cáo, phản ánh quảng cáo', TRUE, TRUE),
  (6, 'MANAGER',      'Cán bộ quản lý / Lãnh đạo',  'Xem báo cáo tổng hợp, phê duyệt quyết định xử lý cấp cao, giải quyết xung đột đánh giá', TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  description = EXCLUDED.description,
  is_system = TRUE;

-- ---------------------------------------------------------------------
-- 2. Quyền (permission) và phân quyền mặc định
-- ---------------------------------------------------------------------
INSERT INTO permissions (id, permission_code, permission_name, module) VALUES
  (1,  'org.view',              'Xem cơ cấu tổ chức',                                  'SYSTEM'),
  (2,  'org.manage',            'Quản lý cơ cấu tổ chức',                              'SYSTEM'),
  (3,  'role.view',             'Xem vai trò và quyền',                                'SYSTEM'),
  (4,  'role.manage',           'Quản lý vai trò và phân quyền',                       'SYSTEM'),
  (5,  'user.view',             'Xem người dùng',                                      'SYSTEM'),
  (6,  'user.manage',           'Quản lý người dùng và tài khoản',                     'SYSTEM'),
  (7,  'audit.view',            'Xem nhật ký hoạt động',                               'SYSTEM'),
  (8,  'param.manage',          'Quản lý tham số hệ thống',                            'SYSTEM'),
  (9,  'role_request.review',   'Duyệt form xin cấp quyền cán bộ',                     'SYSTEM'),
  (20, 'legal_doc.manage',      'Quản lý văn bản pháp lý',                             'INFO_SOURCE'),
  (21, 'facility.view',         'Xem hồ sơ nội bộ đơn vị KCB',                         'INFO_SOURCE'),
  (22, 'facility.manage',       'Quản lý đơn vị khám chữa bệnh',                       'INFO_SOURCE'),
  (23, 'license.view',          'Xem giấy phép',                                       'INFO_SOURCE'),
  (24, 'license.manage',        'Quản lý giấy phép',                                   'INFO_SOURCE'),
  (25, 'crawl.view',            'Xem cấu hình thu thập tin',                           'INFO_SOURCE'),
  (26, 'crawl.manage',          'Quản lý thu thập tin, phân loại nguồn, chủ đề, từ khóa', 'INFO_SOURCE'),
  (40, 'ad_item.view',          'Xem mẫu tin / kết quả thu thập',                      'AD_PROCESSING'),
  (41, 'ad_item.qc',            'Kiểm tra nhanh QC, lọc và phân loại mẫu tin',         'AD_PROCESSING'),
  (42, 'ai.run',                'Gửi mẫu tin cho AI phân tích',                        'AD_PROCESSING'),
  (43, 'review.submit',         'Đánh giá kết quả AI (Human-in-the-loop)',             'AD_PROCESSING'),
  (44, 'review.resolve',        'Giải quyết xung đột đánh giá giữa chuyên viên',       'AD_PROCESSING'),
  (45, 'whitelist.manage',      'Quản lý whitelist',                                   'AD_PROCESSING'),
  (46, 'ai_feedback.export',    'Xuất dữ liệu phản hồi tái huấn luyện AI',             'AD_PROCESSING'),
  (60, 'violation.view',        'Xem hồ sơ vi phạm',                                   'VIOLATION'),
  (61, 'violation.manage',      'Lập, xác minh thẩm quyền, chuyển phối hợp hồ sơ vi phạm', 'VIOLATION'),
  (62, 'violation_type.manage', 'Quản lý danh mục phân loại vi phạm',                  'VIOLATION'),
  (63, 'penalty.manage',        'Lập quyết định xử phạt hành chính',                   'VIOLATION'),
  (64, 'penalty.approve',       'Phê duyệt quyết định xử phạt',                        'VIOLATION'),
  (65, 'feedback.handle',       'Xử lý phản hồi từ đơn vị vi phạm',                    'VIOLATION'),
  (66, 'feedback.submit',       'Gửi giải trình / phản hồi (cơ sở KCB)',               'VIOLATION'),
  (67, 'precheck.review',       'Xác minh kết quả kiểm tra trước quảng cáo',           'VIOLATION'),
  (68, 'suspect.view',          'Xem hồ sơ đối tượng vi phạm',                         'VIOLATION'),
  (69, 'suspect.manage',        'Khoanh vùng, xác minh, cập nhật đối tượng vi phạm',   'VIOLATION'),
  (70, 'case.view',             'Xem hồ sơ phối hợp điều tra',                         'VIOLATION'),
  (71, 'case.handle',           'Tiếp nhận và xử lý hồ sơ phối hợp điều tra',          'VIOLATION'),
  (72, 'statistics.view',       'Xem bảng điều khiển, thống kê',                       'VIOLATION'),
  (73, 'statistics.export',     'Xuất báo cáo thống kê',                               'VIOLATION')
ON CONFLICT (id) DO UPDATE SET permission_name = EXCLUDED.permission_name, module = EXCLUDED.module;

-- ADMIN: toàn quyền
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions ON CONFLICT DO NOTHING;

-- SPECIALIST
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE permission_code IN (
  'org.view',
  'legal_doc.manage','facility.view','facility.manage','license.view','license.manage','crawl.view','crawl.manage',
  'ad_item.view','ad_item.qc','ai.run','review.submit','whitelist.manage','ai_feedback.export',
  'violation.view','violation.manage','violation_type.manage','penalty.manage','feedback.handle','precheck.review',
  'suspect.view','case.view','statistics.view','statistics.export'
) ON CONFLICT DO NOTHING;

-- MANAGER (lãnh đạo)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE permission_code IN (
  'org.view','user.view','audit.view','role_request.review',
  'facility.view','license.view','crawl.view',
  'ad_item.view','review.submit','review.resolve',
  'violation.view','penalty.approve','precheck.review','suspect.view','case.view','statistics.view','statistics.export'
) ON CONFLICT DO NOTHING;

-- CYBER_POLICE
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE permission_code IN (
  'facility.view','license.view','violation.view','suspect.view','suspect.manage','case.view','case.handle','statistics.view'
) ON CONFLICT DO NOTHING;

-- FACILITY
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE permission_code IN ('feedback.submit') ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Cơ cấu tổ chức
-- ---------------------------------------------------------------------
INSERT INTO departments (id, code, name, org_type, parent_id, phone, address) VALUES
  (1, 'SYT',      'Sở Y tế TP. Hồ Chí Minh',                                         'SO_Y_TE',          NULL, '028 3930 9912', '59 Nguyễn Thị Minh Khai, Quận 1, TP.HCM'),
  (2, 'PA05',     'Phòng An ninh mạng và phòng chống tội phạm sử dụng công nghệ cao', 'CO_QUAN_PHOI_HOP', NULL, NULL, NULL),
  (3, 'SYT-NVY',  'Phòng Nghiệp vụ Y',                                               'PHONG_BAN',        1,    NULL, NULL),
  (4, 'SYT-TTRA', 'Thanh tra Sở Y tế',                                               'PHONG_BAN',        1,    NULL, NULL),
  (5, 'STTTT',    'Sở Thông tin và Truyền thông',                                    'CO_QUAN_PHOI_HOP', NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, org_type = EXCLUDED.org_type, parent_id = EXCLUDED.parent_id;

-- ---------------------------------------------------------------------
-- 4. Danh mục nguồn thông tin
-- ---------------------------------------------------------------------
INSERT INTO facility_types (id, code, name) VALUES
  (1, 'BENH_VIEN',     'Bệnh viện'),
  (2, 'PHONG_KHAM_DK', 'Phòng khám đa khoa'),
  (3, 'PHONG_KHAM_CK', 'Phòng khám chuyên khoa'),
  (4, 'NHA_KHOA',      'Nha khoa'),
  (5, 'THAM_MY',       'Thẩm mỹ viện / cơ sở dịch vụ thẩm mỹ'),
  (6, 'NHA_THUOC',     'Nhà thuốc')
ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_document_types (id, code, name) VALUES
  (1, 'LUAT',       'Luật'),
  (2, 'NGHI_DINH',  'Nghị định'),
  (3, 'THONG_TU',   'Thông tư'),
  (4, 'QUYET_DINH', 'Quyết định'),
  (5, 'CONG_VAN',   'Công văn')
ON CONFLICT (id) DO NOTHING;

INSERT INTO legal_documents (id, code, document_number, title, type_id, issuer, issued_date, effective_date, field, summary, status) VALUES
  (1, 'LQC-2012',    '16/2012/QH13',    'Luật Quảng cáo',                                                            1, 'Quốc hội',  '2012-06-21', '2013-01-01', 'Quảng cáo',      'Quy định về hoạt động quảng cáo, quyền và nghĩa vụ của các bên tham gia quảng cáo.', 'ACTIVE'),
  (2, 'ND181-2013',  '181/2013/NĐ-CP',  'Nghị định quy định chi tiết thi hành một số điều của Luật Quảng cáo',      2, 'Chính phủ', '2013-11-14', '2014-01-01', 'Quảng cáo',      'Hướng dẫn chi tiết Luật Quảng cáo.', 'ACTIVE'),
  (3, 'ND117-2020',  '117/2020/NĐ-CP',  'Nghị định quy định xử phạt vi phạm hành chính trong lĩnh vực y tế',        2, 'Chính phủ', '2020-09-28', '2020-11-15', 'Y tế',           'Căn cứ xử phạt các hành vi vi phạm hành chính trong lĩnh vực y tế, bao gồm quảng cáo.', 'ACTIVE'),
  (4, 'LKCB-2023',   '15/2023/QH15',    'Luật Khám bệnh, chữa bệnh',                                                 1, 'Quốc hội',  '2023-01-09', '2024-01-01', 'Khám chữa bệnh', 'Quy định về giấy phép hành nghề, giấy phép hoạt động, phạm vi hoạt động chuyên môn.', 'ACTIVE'),
  (5, 'TT09-2015',   '09/2015/TT-BYT',  'Thông tư quy định về xác nhận nội dung quảng cáo đối với sản phẩm, hàng hóa, dịch vụ đặc biệt thuộc lĩnh vực quản lý của Bộ Y tế', 3, 'Bộ Y tế', '2015-05-25', '2015-07-01', 'Quảng cáo y tế', 'Thủ tục xác nhận nội dung quảng cáo dịch vụ khám chữa bệnh, mỹ phẩm, thực phẩm...', 'ACTIVE'),
  (6, 'ND176-2013',  '176/2013/NĐ-CP',  'Nghị định quy định xử phạt vi phạm hành chính trong lĩnh vực y tế (đã được thay thế)', 2, 'Chính phủ', '2013-11-14', '2014-01-01', 'Y tế', 'Văn bản cũ — để minh họa trạng thái Vô hiệu hóa (AI không sử dụng).', 'INACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Đơn vị KCB (cập nhật bản ghi id=1 có sẵn từ seed cũ)
INSERT INTO facilities (id, code, name, type_id, organization_form, address, ward, district, province, phone, email, website,
                        representative, professional_scope, working_hours, license_number, license_issued_date, licensed_techniques, operating_status) VALUES
  (1, 'BV-DKX', 'Bệnh viện Đa khoa X', 1, 'Bệnh viện đa khoa',
      '123 Nguyễn Văn Linh, Phường Tân Phú, Quận 7, TP.HCM', 'Tân Phú', 'Quận 7', 'TP. Hồ Chí Minh', '028 3775 1234', 'lienhe@benhvienx.vn', 'benhvienx.vn',
      'BS. Nguyễn Văn A', 'Khám bệnh, chữa bệnh đa khoa nội, ngoại, sản, nhi', '07:00 - 20:00 hằng ngày', '12345-ABC/2020/SYT', '2020-03-15',
      '["khám nội tổng quát","khám sức khỏe tổng quát","siêu âm","nội soi tiêu hóa","xét nghiệm","phẫu thuật nội soi"]', 'ACTIVE'),
  (2, 'NK-SGS', 'Nha khoa Sài Gòn Smile', 4, 'Phòng khám chuyên khoa răng hàm mặt',
      '45 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM', 'Bến Nghé', 'Quận 1', 'TP. Hồ Chí Minh', '028 3822 4567', 'cskh@saigonsmile.vn', 'saigonsmile.vn',
      'BS. Trần Thị Bình', 'Khám, điều trị răng hàm mặt cơ bản', '08:00 - 19:00 (thứ 2 - thứ 7)', '00234/HCM-GPHĐ', '2021-07-01',
      '["nhổ răng","trám răng","cạo vôi răng","bọc răng sứ","tẩy trắng răng"]', 'ACTIVE'),
  (3, 'TMV-BELLA', 'Thẩm mỹ viện Bella', 5, 'Cơ sở dịch vụ thẩm mỹ',
      '210 Võ Văn Tần, Phường 5, Quận 3, TP.HCM', 'Phường 5', 'Quận 3', 'TP. Hồ Chí Minh', '0909 111 222', NULL, NULL,
      'Lê Thị Hoa', 'Dịch vụ chăm sóc da, phun xăm thẩm mỹ (không xâm lấn)', '09:00 - 21:00', '00567/HCM-GPHĐ', '2022-01-10',
      '["chăm sóc da","phun xăm thẩm mỹ","gội đầu dưỡng sinh"]', 'SUSPENDED'),
  (4, 'PK-ANPHUC', 'Phòng khám Đa khoa An Phúc', 2, 'Phòng khám đa khoa',
      '88 Xô Viết Nghệ Tĩnh, Phường 21, Quận Bình Thạnh, TP.HCM', 'Phường 21', 'Quận Bình Thạnh', 'TP. Hồ Chí Minh', '028 3512 8888', 'anphuc@clinic.vn', NULL,
      'BS. Lê Minh Cường', 'Khám nội, ngoại, sản phụ khoa, xét nghiệm', '07:30 - 19:30', '01234/HCM-GPHĐ', '2019-11-20',
      '["khám nội","khám ngoại","sản phụ khoa","xét nghiệm","siêu âm"]', 'ACTIVE'),
  (5, 'NT-MINHCHAU', 'Nhà thuốc Minh Châu', 6, 'Nhà thuốc',
      '12 Ba Tháng Hai, Phường 12, Quận 10, TP.HCM', 'Phường 12', 'Quận 10', 'TP. Hồ Chí Minh', '0938 555 666', NULL, NULL,
      'DS. Phạm Minh Châu', 'Bán lẻ thuốc', '06:00 - 22:00', '0789/ĐKKDD-HCM', '2023-04-05',
      '["bán lẻ thuốc"]', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code, name = EXCLUDED.name, type_id = EXCLUDED.type_id, organization_form = EXCLUDED.organization_form,
  address = EXCLUDED.address, ward = EXCLUDED.ward, district = EXCLUDED.district, province = EXCLUDED.province,
  phone = EXCLUDED.phone, email = EXCLUDED.email, website = EXCLUDED.website, representative = EXCLUDED.representative,
  professional_scope = EXCLUDED.professional_scope, working_hours = EXCLUDED.working_hours,
  license_issued_date = EXCLUDED.license_issued_date, licensed_techniques = EXCLUDED.licensed_techniques,
  operating_status = EXCLUDED.operating_status;

INSERT INTO licenses (id, license_number, license_type, facility_id, holder_name, holder_title, issued_date, expiry_date, issuer, scope, status) VALUES
  (1, '12345-ABC/2020/SYT', 'GPHD', 1, 'Bệnh viện Đa khoa X',        NULL, '2020-03-15', NULL,         'Sở Y tế TP.HCM', 'Khám bệnh, chữa bệnh đa khoa', 'ACTIVE'),
  (2, '00234/HCM-GPHĐ',     'GPHD', 2, 'Nha khoa Sài Gòn Smile',     NULL, '2021-07-01', NULL,         'Sở Y tế TP.HCM', 'Răng hàm mặt cơ bản (không gồm cấy ghép implant)', 'ACTIVE'),
  (3, '00567/HCM-GPHĐ',     'GPHD', 3, 'Thẩm mỹ viện Bella',         NULL, '2022-01-10', NULL,         'Sở Y tế TP.HCM', 'Dịch vụ thẩm mỹ không xâm lấn', 'ACTIVE'),
  (4, '01234/HCM-GPHĐ',     'GPHD', 4, 'Phòng khám Đa khoa An Phúc', NULL, '2019-11-20', NULL,         'Sở Y tế TP.HCM', 'Khám nội, ngoại, sản phụ khoa', 'ACTIVE'),
  (5, '0789/ĐKKDD-HCM',     'GPHD', 5, 'Nhà thuốc Minh Châu',        NULL, '2023-04-05', NULL,         'Sở Y tế TP.HCM', 'Bán lẻ thuốc', 'ACTIVE'),
  (6, '000123/HCM-CCHN',    'CCHN', 1, 'Nguyễn Văn An',  'Bác sĩ chuyên khoa Nội',      '2015-05-20', NULL,         'Sở Y tế TP.HCM', 'Khám bệnh, chữa bệnh chuyên khoa Nội', 'ACTIVE'),
  (7, '000456/HCM-CCHN',    'CCHN', 2, 'Trần Thị Bình',  'Bác sĩ Răng Hàm Mặt',         '2016-09-12', NULL,         'Sở Y tế TP.HCM', 'Khám bệnh, chữa bệnh chuyên khoa Răng Hàm Mặt', 'ACTIVE'),
  (8, '000789/HCM-CCHN',    'CCHN', 4, 'Lê Minh Cường',  'Bác sĩ đa khoa',              '2014-03-01', '2024-12-31', 'Sở Y tế TP.HCM', 'Khám bệnh, chữa bệnh đa khoa', 'ACTIVE'),
  (9, '01/2026/XNQC-SYT',   'XNQC', 1, 'Bệnh viện Đa khoa X',        NULL, '2026-01-05', '2027-01-05', 'Sở Y tế TP.HCM', 'Quảng cáo dịch vụ khám sức khỏe tổng quát', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Danh mục phân loại vi phạm — trọng số theo Bảng 12.7 của báo cáo
INSERT INTO violation_types (id, code, name, weight, severity, legal_document_id, legal_basis, description) VALUES
  (1, 'UNLICENSED_OPERATION',  'Hoạt động không có giấy phép',                         30, 'HIGH',   4, 'Luật KBCB 2023',            'Cơ sở không có / không khớp giấy phép hoạt động, hoặc đang bị đình chỉ'),
  (2, 'UNLICENSED_DRUG_AD',    'Quảng cáo thuốc chưa được cấp phép',                   25, 'HIGH',   3, 'Nghị định 117/2020/NĐ-CP', 'Quảng cáo thuốc kê đơn / thuốc chưa được xác nhận nội dung'),
  (3, 'FALSE_CLAIM',           'Quảng cáo sai sự thật, thổi phồng công dụng',          20, 'HIGH',   1, 'Luật Quảng cáo 2012',       'Cam kết khỏi bệnh, hiệu quả tuyệt đối, "tốt nhất", "không tác dụng phụ"...'),
  (4, 'UNAUTHORIZED_DOCTOR',   'Sử dụng hình ảnh/danh nghĩa bác sĩ chưa được đồng ý',  15, 'MEDIUM', 3, 'Nghị định 117/2020/NĐ-CP', 'Nêu tên bác sĩ không có chứng chỉ hành nghề hợp lệ tại cơ sở'),
  (5, 'MISSING_ORIGIN',        'Không ghi rõ nguồn gốc xuất xứ sản phẩm',              10, 'LOW',    1, 'Luật Quảng cáo 2012',       'Hàng xách tay, không rõ nguồn gốc'),
  (6, 'OUT_OF_SCOPE',          'Quảng cáo vượt quá phạm vi chuyên môn được cấp phép',  25, 'HIGH',   4, 'Luật KBCB 2023',            'Quảng cáo kỹ thuật không có trong danh mục kỹ thuật được cấp phép'),
  (7, 'FAKE_LICENSE',          'Sử dụng thông tin giấy phép không hợp lệ / giả mạo',   30, 'HIGH',   3, 'Nghị định 117/2020/NĐ-CP', 'Số giấy phép nêu trong quảng cáo không tồn tại hoặc hết hiệu lực'),
  (8, 'NO_AD_CONFIRMATION',    'Quảng cáo dịch vụ y tế chưa có xác nhận nội dung',     15, 'MEDIUM', 5, 'Thông tư 09/2015/TT-BYT',  'Không có giấy xác nhận nội dung quảng cáo còn hiệu lực')
ON CONFLICT (id) DO NOTHING;

-- Thu thập tin
INSERT INTO source_categories (id, code, name, description) VALUES
  (1, 'SOCIAL_MEDIA',  'Mạng xã hội',        'Facebook, TikTok, YouTube, Zalo...'),
  (2, 'SEARCH_ENGINE', 'Công cụ tìm kiếm',   'Google, Cốc Cốc'),
  (3, 'FIXED_WEB',     'Website cố định',    'Website, blog, diễn đàn'),
  (4, 'ECOMMERCE',     'Sàn thương mại điện tử', 'Shopee, Lazada, Tiki'),
  (5, 'TRADITIONAL',   'Phát thanh, truyền hình, ngoài trời', 'Radio, TV, biển quảng cáo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO crawl_sources (id, name, category_id, platform, url) VALUES
  (1, 'Facebook Pages & Groups', 1, 'FACEBOOK', 'https://facebook.com'),
  (2, 'TikTok',                  1, 'TIKTOK',   'https://tiktok.com'),
  (3, 'YouTube',                 1, 'YOUTUBE',  'https://youtube.com'),
  (4, 'Google Search',           2, 'GOOGLE',   'https://google.com'),
  (5, 'Website y tế tổng hợp',   3, 'WEBSITE',  NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO topics (id, code, name, description) VALUES
  (1, 'THAM_MY',  'Dịch vụ thẩm mỹ',        'Nâng mũi, nâng ngực, hút mỡ, tiêm filler...'),
  (2, 'THUOC',    'Quảng cáo thuốc',        'Thuốc kê đơn, thuốc giảm cân, thuốc tăng cân...'),
  (3, 'NHA_KHOA', 'Nha khoa',               'Implant, niềng răng, bọc sứ...'),
  (4, 'KCB',      'Khám chữa bệnh',         'Phòng khám, bệnh viện, chữa bệnh'),
  (5, 'TPCN',     'Thực phẩm chức năng',    'Thực phẩm bảo vệ sức khỏe')
ON CONFLICT (id) DO NOTHING;

INSERT INTO keywords (keyword, topic_id, keyword_type) VALUES
  ('nâng mũi', 1, 'PRIMARY'), ('nâng ngực', 1, 'PRIMARY'), ('hút mỡ', 1, 'PRIMARY'), ('tiêm filler', 1, 'PRIMARY'), ('botox', 1, 'SECONDARY'), ('trẻ hóa da', 1, 'SECONDARY'),
  ('thuốc giảm cân', 2, 'PRIMARY'), ('thuốc kê đơn', 2, 'PRIMARY'), ('kháng sinh', 2, 'PRIMARY'), ('thuốc tăng cân', 2, 'SECONDARY'),
  ('implant', 3, 'PRIMARY'), ('niềng răng', 3, 'PRIMARY'), ('bọc răng sứ', 3, 'SECONDARY'),
  ('phòng khám', 4, 'PRIMARY'), ('chữa bệnh', 4, 'PRIMARY'), ('bác sĩ', 4, 'SECONDARY'), ('khám bệnh', 4, 'SECONDARY'),
  ('thực phẩm chức năng', 5, 'PRIMARY'), ('viên uống', 5, 'SECONDARY')
ON CONFLICT DO NOTHING;

INSERT INTO crawl_schedules (id, code, name, source_id, topic_id, primary_keywords, secondary_keywords, data_types, frequency, sample_limit, status) VALUES
  (1, 'LTT-001', 'Facebook — dịch vụ thẩm mỹ', 1, 1, 'nâng mũi, nâng ngực, hút mỡ', 'botox, trẻ hóa da', '["TEXT","IMAGE"]', '24/7', 1500, 'RUNNING'),
  (2, 'LTT-002', 'TikTok — quảng cáo thuốc',   2, 2, 'thuốc giảm cân, thuốc kê đơn', 'thuốc tăng cân', '["TEXT","VIDEO"]', 'EVERY_2H', 900, 'PAUSED'),
  (3, 'LTT-003', 'Google — nha khoa',          4, 3, 'implant, niềng răng', 'bọc răng sứ', '["TEXT"]', 'EVERY_6H', 700, 'STOPPED')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. Xử lý thông tin quảng cáo
-- ---------------------------------------------------------------------
INSERT INTO ai_models (id, code, name, version, model_type, provider, metrics) VALUES
  (1, 'AI-VD-RULES',  'Mô hình phát hiện quảng cáo vi phạm (rule-based, thay được bằng API AI thật)', '1.0.0', 'VIOLATION_DETECTOR', 'BUILTIN_RULES', '{"note":"Bộ luật từ khóa + đối chiếu CSDL giấy phép"}'),
  (2, 'AI-NER-RULES', 'Trích xuất thực thể (tên cơ sở, SĐT, giấy phép, bác sĩ)',                     '1.0.0', 'NER',                'BUILTIN_RULES', NULL),
  (3, 'AI-MATCH',     'Đối soát đối tượng (Levenshtein + Jaccard, β = 0.6)',                           '1.0.0', 'ENTITY_MATCHING',    'BUILTIN_RULES', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO whitelist_entries (entry_type, value, facility_id, note) VALUES
  ('DOMAIN',  'benhvienx.vn',                        1, 'Website chính thức của Bệnh viện Đa khoa X'),
  ('ACCOUNT', 'facebook.com/benhviendakhoax',        1, 'Fanpage chính thức')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. Tham số hệ thống (quản trị viên chỉnh tại /admin/parameters)
-- ---------------------------------------------------------------------
INSERT INTO system_parameters (param_key, param_value, value_type, param_group, description) VALUES
  ('OFFICIAL_EMAIL_DOMAINS',     'syt.com,syt.gov.vn,ca.gov.vn', 'STRING',  'AUTH',     'Đuôi email cơ quan: đăng ký bằng các đuôi này sẽ là tài khoản CÁN BỘ, phải gửi form xin cấp quyền'),
  ('AI_VIOLATION_THRESHOLD',     '0.7',     'NUMBER',  'AI',       'Độ tin cậy >= ngưỡng này: AI gán nhãn VI PHẠM'),
  ('AI_SUSPECT_THRESHOLD',       '0.4',     'NUMBER',  'AI',       'Độ tin cậy >= ngưỡng này: AI gán nhãn NGHI VẤN'),
  ('PIPELINE_AUTO_AI',           'true',    'BOOLEAN', 'AI',       'Tự động gửi AI phân tích ngay khi mẫu tin qua bước lọc'),
  ('REVIEW_REQUIRED_COUNT',      '1',       'NUMBER',  'REVIEW',   'Số chuyên viên phải đánh giá một mẫu tin (>=2 để bật đánh giá chéo)'),
  ('PENALTY_APPROVAL_THRESHOLD', '20000000','NUMBER',  'VIOLATION','Mức phạt (VNĐ) từ ngưỡng này trở lên, hoặc vi phạm nghiêm trọng, phải được lãnh đạo phê duyệt'),
  ('RISK_DECAY_ALPHA',           '0.9',     'NUMBER',  'RISK',     'Hệ số suy giảm điểm rủi ro theo tháng (0 < α < 1)'),
  ('RECIDIVISM_PENALTY',         '10',      'NUMBER',  'RISK',     'Điểm cộng thêm cho mỗi lần tái phạm cùng loại trong 12 tháng'),
  ('RISK_ALERT_THRESHOLD',       '71',      'NUMBER',  'RISK',     'Điểm rủi ro từ ngưỡng này: gửi cảnh báo cho chuyên viên/lãnh đạo'),
  ('MATCH_AUTO_MERGE',           '0.9',     'NUMBER',  'MATCHING', 'Độ tương đồng > ngưỡng: tự động gộp vào đối tượng có sẵn'),
  ('MATCH_REVIEW_MIN',           '0.7',     'NUMBER',  'MATCHING', 'Độ tương đồng từ ngưỡng này đến MATCH_AUTO_MERGE: đưa vào hàng đợi cán bộ kiểm tra'),
  ('MATCH_BETA',                 '0.6',     'NUMBER',  'MATCHING', 'Trọng số β giữa Levenshtein và Jaccard'),
  ('PRECHECK_WARNING_MIN_RISK',  '31',      'NUMBER',  'PRECHECK', 'Điểm rủi ro từ ngưỡng này: kết quả CẢNH BÁO'),
  ('PRECHECK_FAIL_MIN_RISK',     '71',      'NUMBER',  'PRECHECK', 'Điểm rủi ro từ ngưỡng này: kết quả KHÔNG ĐẠT'),
  ('SITE_NAME',                  'Hệ thống AI phát hiện vi phạm quảng cáo y tế', 'STRING', 'UI', 'Tên hệ thống hiển thị')
ON CONFLICT (param_key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7. Tài khoản demo (mật khẩu: Demo@123456)
-- ---------------------------------------------------------------------
INSERT INTO users (id, username, password_hash, email, full_name, status, account_type, position, department_id, facility_id) VALUES
  (1001, 'admin',       '$2b$10$rAcdLt3PbXE9JfxxGiTGwOnKkVmhQdm60MT9s6OWlkmhd2Cu6I09S', 'admin@demo.com',       'Quản trị viên hệ thống',    'ACTIVE', 'STAFF',    'Quản trị viên',        1,    NULL),
  (1002, 'chuyenvien',  '$2b$10$rAcdLt3PbXE9JfxxGiTGwOnKkVmhQdm60MT9s6OWlkmhd2Cu6I09S', 'chuyenvien@demo.com',  'Nguyễn Thị Chuyên Viên',    'ACTIVE', 'STAFF',    'Chuyên viên',          3,    NULL),
  (1003, 'cosokcb',     '$2b$10$rAcdLt3PbXE9JfxxGiTGwOnKkVmhQdm60MT9s6OWlkmhd2Cu6I09S', 'cosokcb@demo.com',     'Bệnh viện Đa khoa X',       'ACTIVE', 'FACILITY', NULL,                   NULL, 1),
  (1004, 'anninhmang',  '$2b$10$rAcdLt3PbXE9JfxxGiTGwOnKkVmhQdm60MT9s6OWlkmhd2Cu6I09S', 'anninhmang@demo.com',  'Trần Văn An Ninh',          'ACTIVE', 'STAFF',    'Cán bộ điều tra',      2,    NULL),
  (1005, 'nguoidan',    '$2b$10$rAcdLt3PbXE9JfxxGiTGwOnKkVmhQdm60MT9s6OWlkmhd2Cu6I09S', 'nguoidan@demo.com',    'Lê Văn Dân',                'ACTIVE', 'CITIZEN',  NULL,                   NULL, NULL),
  (1006, 'lanhdao',     '$2b$10$rAcdLt3PbXE9JfxxGiTGwOnKkVmhQdm60MT9s6OWlkmhd2Cu6I09S', 'lanhdao@demo.com',     'Phạm Văn Lãnh Đạo',         'ACTIVE', 'STAFF',    'Trưởng phòng Nghiệp vụ Y', 3, NULL),
  (1007, 'chuyenvien2', '$2b$10$rAcdLt3PbXE9JfxxGiTGwOnKkVmhQdm60MT9s6OWlkmhd2Cu6I09S', 'chuyenvien2@demo.com', 'Hoàng Văn Chuyên Viên 2',   'ACTIVE', 'STAFF',    'Chuyên viên',          3,    NULL),
  (1008, 'canbo.moi',   '$2b$10$rAcdLt3PbXE9JfxxGiTGwOnKkVmhQdm60MT9s6OWlkmhd2Cu6I09S', 'canbo.moi@syt.com',    'Đỗ Thị Cán Bộ Mới',         'ACTIVE', 'OFFICIAL', NULL,                   NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  account_type = EXCLUDED.account_type, position = EXCLUDED.position, full_name = EXCLUDED.full_name,
  department_id = EXCLUDED.department_id, facility_id = EXCLUDED.facility_id;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON (u.email, r.role_code) IN (VALUES
  ('admin@demo.com',       'ADMIN'),
  ('chuyenvien@demo.com',  'SPECIALIST'),
  ('cosokcb@demo.com',     'FACILITY'),
  ('anninhmang@demo.com',  'CYBER_POLICE'),
  ('nguoidan@demo.com',    'CITIZEN'),
  ('lanhdao@demo.com',     'MANAGER'),
  ('chuyenvien2@demo.com', 'SPECIALIST')
)
ON CONFLICT DO NOTHING;
-- canbo.moi@syt.com: email cơ quan, CHƯA có vai trò -> dùng để thử luồng gửi form xin cấp quyền

INSERT INTO role_requests (id, user_id, requested_role_code, department_id, position, staff_code, phone, reason, status) VALUES
  (1, 1008, 'SPECIALIST', 3, 'Chuyên viên', 'SYT-0456', '0901234567', 'Được phân công rà soát quảng cáo dịch vụ thẩm mỹ', 'PENDING')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 8. Đối tượng vi phạm có sẵn (để thử đối soát Levenshtein/Jaccard)
-- ---------------------------------------------------------------------
INSERT INTO suspects (id, code, name, normalized_name, address, phones, status, notes) VALUES
  (1, 'DT-0001', 'Phòng khám Hồng Phúc', 'phong kham hong phuc', 'Quận 5, TP.HCM (chưa xác minh)', '["0911222333"]', 'MONITORING', 'Nhiều lần quảng cáo chữa bệnh trĩ trên mạng xã hội, không có trong CSDL cơ sở được cấp phép')
ON CONFLICT (id) DO NOTHING;
INSERT INTO platform_accounts (suspect_id, platform, platform_uid, display_name, url) VALUES
  (1, 'FACEBOOK', 'phongkhamhongphuc', 'Phòng Khám Hồng Phúc', 'https://facebook.com/phongkhamhongphuc')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 9. Mẫu tin vừa thu thập (trạng thái COLLECTED) để thử QC -> lọc -> AI -> chuyên viên
-- ---------------------------------------------------------------------
INSERT INTO ad_items (id, code, source_type, schedule_id, crawl_source_id, topic_id, platform, source_url, author_name, author_account, title, content, content_hash, data_format, likes, shares, views, status) VALUES
  (1, 'MT-000001', 'CRAWLER', 1, 1, 1, 'FACEBOOK', 'https://facebook.com/tmvbella/posts/1001', 'Thẩm mỹ viện Bella', 'tmvbella',
      'Nâng mũi cấu trúc không đau',
      'Thẩm mỹ viện Bella - Nâng mũi cấu trúc không đau, cam kết đẹp vĩnh viễn, bảo hành trọn đời. Giảm 50% trong tháng này. Liên hệ 0909111222.',
      NULL, 'TEXT', 1250, 340, 15000, 'COLLECTED'),
  (2, 'MT-000002', 'CRAWLER', 2, 2, 2, 'TIKTOK', 'https://tiktok.com/@giamcancaptoc/video/2002', 'Giảm Cân Cấp Tốc 24h', 'giamcancaptoc',
      'Thuốc giảm cân cấp tốc',
      'Thuốc giảm cân cấp tốc, giảm 10kg trong 1 tháng, cam kết hiệu quả 100%, không tác dụng phụ, hàng xách tay Mỹ. Ship toàn quốc, Zalo 0987654321.',
      NULL, 'VIDEO', 5400, 2100, 98000, 'COLLECTED'),
  (3, 'MT-000003', 'CRAWLER', 3, 4, 3, 'GOOGLE', 'https://saigonsmile.vn/khuyen-mai-implant', 'Nha khoa Sài Gòn Smile', 'saigonsmile.vn',
      'Ưu đãi cấy ghép implant',
      'Nha khoa Sài Gòn Smile ưu đãi cấy ghép implant giảm 30%, bác sĩ Trần Thị Bình trực tiếp thực hiện, giấy phép 00234/HCM-GPHĐ.',
      NULL, 'TEXT', 80, 12, 2300, 'COLLECTED'),
  (4, 'MT-000004', 'CRAWLER', NULL, 5, 4, 'WEBSITE', 'https://benhvienx.vn/tin-tuc/kham-suc-khoe', 'Bệnh viện Đa khoa X', 'benhvienx.vn',
      'Khám sức khỏe tổng quát',
      'Bệnh viện Đa khoa X tổ chức chương trình khám sức khỏe tổng quát định kỳ cho người cao tuổi. Đăng ký tại benhvienx.vn.',
      NULL, 'TEXT', 30, 5, 900, 'COLLECTED'),
  (5, 'MT-000005', 'CRAWLER', 1, 1, NULL, 'FACEBOOK', 'https://facebook.com/shopaothun/posts/5', 'Shop Áo Thun', 'shopaothun',
      'Khuyến mãi áo thun',
      'Mua 1 tặng 1 áo thun cotton giá rẻ, freeship đơn từ 200k.',
      NULL, 'TEXT', 3, 0, 120, 'COLLECTED'),
  (6, 'MT-000006', 'CRAWLER', 2, 2, 2, 'TIKTOK', 'https://tiktok.com/@giamcan_reup/video/6006', 'Reup Giảm Cân', 'giamcan_reup',
      'Thuốc giảm cân cấp tốc (đăng lại)',
      'Thuốc giảm cân cấp tốc, giảm 10kg trong 1 tháng, cam kết hiệu quả 100%, không tác dụng phụ, hàng xách tay Mỹ. Ship toàn quốc, Zalo 0987654321.',
      NULL, 'VIDEO', 10, 1, 400, 'COLLECTED'),
  (7, 'MT-000007', 'CRAWLER', 1, 1, 4, 'FACEBOOK', 'https://facebook.com/phongkhamhongphuc/posts/7007', 'Phòng Khám Hồng Phúc', 'phongkhamhongphuc',
      'Chữa dứt điểm bệnh trĩ',
      'Phòng khám Hồng Phúc chữa dứt điểm bệnh trĩ chỉ sau 1 lần điều trị, không đau, BS. Phạm Văn Đức 30 năm kinh nghiệm. Hotline 0911222333.',
      NULL, 'TEXT', 640, 88, 12000, 'COLLECTED')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 10. Đồng bộ bộ đếm id tự tăng sau khi chèn id thủ công
-- ---------------------------------------------------------------------
SELECT setval('departments_id_seq',          GREATEST((SELECT COALESCE(MAX(id), 0) FROM departments), 1));
SELECT setval('facilities_id_seq',           GREATEST((SELECT COALESCE(MAX(id), 0) FROM facilities), 1));
SELECT setval('users_id_seq',                GREATEST((SELECT COALESCE(MAX(id), 0) FROM users), 2000));
SELECT setval('roles_id_seq',                GREATEST((SELECT COALESCE(MAX(id), 0) FROM roles), 1));
SELECT setval('permissions_id_seq',          GREATEST((SELECT COALESCE(MAX(id), 0) FROM permissions), 1));
SELECT setval('role_requests_id_seq',        GREATEST((SELECT COALESCE(MAX(id), 0) FROM role_requests), 1));
SELECT setval('facility_types_id_seq',       GREATEST((SELECT COALESCE(MAX(id), 0) FROM facility_types), 1));
SELECT setval('legal_document_types_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM legal_document_types), 1));
SELECT setval('legal_documents_id_seq',      GREATEST((SELECT COALESCE(MAX(id), 0) FROM legal_documents), 1));
SELECT setval('licenses_id_seq',             GREATEST((SELECT COALESCE(MAX(id), 0) FROM licenses), 1));
SELECT setval('violation_types_id_seq',      GREATEST((SELECT COALESCE(MAX(id), 0) FROM violation_types), 1));
SELECT setval('source_categories_id_seq',    GREATEST((SELECT COALESCE(MAX(id), 0) FROM source_categories), 1));
SELECT setval('crawl_sources_id_seq',        GREATEST((SELECT COALESCE(MAX(id), 0) FROM crawl_sources), 1));
SELECT setval('topics_id_seq',               GREATEST((SELECT COALESCE(MAX(id), 0) FROM topics), 1));
SELECT setval('crawl_schedules_id_seq',      GREATEST((SELECT COALESCE(MAX(id), 0) FROM crawl_schedules), 1));
SELECT setval('ai_models_id_seq',            GREATEST((SELECT COALESCE(MAX(id), 0) FROM ai_models), 1));
SELECT setval('suspects_id_seq',             GREATEST((SELECT COALESCE(MAX(id), 0) FROM suspects), 1));
SELECT setval('ad_items_id_seq',             GREATEST((SELECT COALESCE(MAX(id), 0) FROM ad_items), 1));
