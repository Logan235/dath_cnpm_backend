/* eslint-disable */
// =====================================================================
// KIỂM THỬ TỰ ĐỘNG TOÀN BỘ LUỒNG NGHIỆP VỤ
// Cách chạy: mở terminal 1 chạy backend (npm run start:dev), terminal 2 chạy:
//     npm run test:flows
// Có thể chạy lại nhiều lần (dữ liệu test có hậu tố riêng mỗi lần chạy).
// Đổi địa chỉ backend: set API_URL=http://localhost:3001 (Windows: $env:API_URL="...")
// =====================================================================
const fs = require('fs');
const path = require('path');

const BASE = process.env.API_URL || 'http://localhost:3001';
const PWD = 'Demo@123456';
const RUN = Date.now().toString(36);
const SAMPLES = path.join(__dirname, '..', 'samples');

let pass = 0;
let fail = 0;
const failures = [];

function section(t) {
  console.log(`\n\x1b[36m━━ ${t}\x1b[0m`);
}
function check(name, cond, detail) {
  if (cond) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  \x1b[31m✗ ${name}\x1b[0m${detail !== undefined ? `\n      → ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 400)}` : ''}`);
  }
  return cond;
}

async function api(method, url, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + url, { method, headers, body: payload });
  const ct = res.headers.get('content-type') || '';
  let data = null;
  if (ct.includes('application/json')) data = await res.json().catch(() => null);
  else data = { _raw: true, contentType: ct, size: (await res.arrayBuffer()).byteLength };
  return { status: res.status, data };
}
const get = (u, token) => api('GET', u, { token });
const post = (u, body, token) => api('POST', u, { body, token });
const patch = (u, body, token) => api('PATCH', u, { body, token });
const put = (u, body, token) => api('PUT', u, { body, token });
const del = (u, token) => api('DELETE', u, { token });

function fileForm(file, field = 'file', extra = {}) {
  const fd = new FormData();
  const buf = fs.readFileSync(path.join(SAMPLES, file));
  fd.append(field, new Blob([buf]), file);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  return fd;
}

async function login(email, role, password = PWD) {
  const r = await post('/auth/login', { email, password, ...(role ? { role } : {}) });
  return r;
}
async function token(email, role, password = PWD) {
  const r = await login(email, role, password);
  if (r.status !== 200) throw new Error(`Đăng nhập ${email}/${role} thất bại: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data.accessToken;
}

async function main() {
  console.log(`Kiểm thử backend tại ${BASE} — mã lần chạy: ${RUN}`);
  const health = await get('/');
  if (health.status !== 200 || health.data.status !== 'success') {
    console.log('Backend chưa chạy hoặc lỗi database. Hãy chạy "npm run db:setup" rồi "npm run start:dev".', health.data);
    process.exit(1);
  }
  check(`Backend + database OK (${health.data.database.tables} bảng)`, health.data.database.tables >= 38, health.data);

  // -------------------------------------------------------------------
  section('A. ĐĂNG NHẬP / ĐĂNG KÝ / PHÂN QUYỀN');
  const T = {
    admin: await token('admin@demo.com', 'ADMIN'),
    sp: await token('chuyenvien@demo.com', 'SPECIALIST'),
    sp2: await token('chuyenvien2@demo.com', 'SPECIALIST'),
    mgr: await token('lanhdao@demo.com', 'MANAGER'),
    police: await token('anninhmang@demo.com', 'CYBER_POLICE'),
    fac: await token('cosokcb@demo.com', 'FACILITY'),
    cit: await token('nguoidan@demo.com', 'CITIZEN'),
  };
  check('Đăng nhập đủ 7 tài khoản demo (6 vai trò)', Object.values(T).every(Boolean));

  let r = await login('admin@demo.com', 'SPECIALIST');
  check('Chọn sai vai trò → 403 ROLE_NOT_GRANTED', r.status === 403 && r.data.error === 'ROLE_NOT_GRANTED', r.data);
  r = await login('admin@demo.com', 'ADMIN', 'sai-mat-khau');
  check('Sai mật khẩu → 401', r.status === 401);
  r = await get('/violations');
  check('Không đăng nhập gọi API nội bộ → 401', r.status === 401);
  r = await get('/violations', T.cit);
  check('Người dân gọi API hồ sơ vi phạm → 403', r.status === 403);
  r = await post('/legal-documents', { code: 'X', documentNumber: '1/2026/QĐ-X', title: 'x', typeId: 1 }, T.fac);
  check('Cơ sở KCB thêm văn bản pháp lý → 403 (chỉ được xem)', r.status === 403);
  r = await get('/auth/me', T.sp);
  check('GET /auth/me trả vai trò + quyền', r.status === 200 && r.data.role === 'SPECIALIST' && r.data.permissions.includes('review.submit'), r.data);

  // Không đăng nhập vẫn dùng được chức năng người dân
  r = await get('/public/facilities?search=Nha khoa');
  check('Khách (không đăng nhập) tra cứu cơ sở KCB', r.status === 200 && r.data.total >= 1, r.data);
  r = await get('/legal-documents');
  check('Khách xem văn bản pháp lý (chỉ văn bản hiệu lực)', r.status === 200 && r.data.data.every((d) => d.status === 'ACTIVE'), r.data);

  // Đăng ký email thường -> người dân
  const citizenEmail = `nguoidan.${RUN}@gmail.com`;
  r = await post('/auth/register', { email: citizenEmail, password: 'Test@1234', fullName: 'Người dân test' });
  check('Đăng ký email thường → tài khoản NGƯỜI DÂN', r.status === 200 && r.data.accountType === 'CITIZEN' && r.data.user.roles.includes('CITIZEN'), r.data);
  r = await post('/auth/register', { email: citizenEmail, password: 'Test@1234' });
  check('Đăng ký trùng email → 409', r.status === 409);
  r = await post('/auth/register', { email: `yeu.${RUN}@gmail.com`, password: '123' });
  check('Mật khẩu yếu → 400', r.status === 400);
  const tCitNew = await token(citizenEmail, 'CITIZEN', 'Test@1234');

  // Đăng ký email cơ quan -> cán bộ chờ cấp quyền
  const officialEmail = `canbo.${RUN}@syt.com`;
  r = await post('/auth/register', { email: officialEmail, password: 'Test@1234', fullName: 'Cán bộ test' });
  check('Đăng ký email @syt.com → tài khoản CÁN BỘ, cần gửi form', r.status === 200 && r.data.accountType === 'OFFICIAL' && r.data.requiresRoleRequest === true && r.data.user.roles.length === 0, r.data);
  r = await login(officialEmail, 'SPECIALIST', 'Test@1234');
  check('Cán bộ chưa được cấp quyền đăng nhập vai trò chuyên viên → 403', r.status === 403 && r.data.accountType === 'OFFICIAL', r.data);
  r = await login(officialEmail, undefined, 'Test@1234');
  check('Cán bộ đăng nhập không chọn vai trò → được, needsRoleRequest = true', r.status === 200 && r.data.role === null && r.data.needsRoleRequest === true, r.data);
  const tOfficial = r.data.accessToken;
  r = await get('/organizations/options', tOfficial);
  check('Cán bộ lấy danh sách đơn vị cho form', r.status === 200 && r.data.length >= 1);
  r = await post('/role-requests', { requestedRoleCode: 'SPECIALIST', departmentId: 3, position: 'Chuyên viên', staffCode: `SYT-${RUN}`, reason: 'Được phân công rà soát quảng cáo' }, tOfficial);
  check('Gửi form xin cấp quyền', r.status === 201 && r.data.status === 'PENDING', r.data);
  const reqId = r.data.id;
  r = await post('/role-requests', { requestedRoleCode: 'SPECIALIST', reason: 'lần 2' }, tOfficial);
  check('Gửi form lần 2 khi đang chờ duyệt → 409', r.status === 409);
  r = await post('/role-requests', { requestedRoleCode: 'SPECIALIST', reason: 'x' }, tCitNew);
  check('Người dân (email thường) gửi form xin quyền cán bộ → 403', r.status === 403);
  r = await get('/role-requests?status=PENDING', T.mgr);
  check('Lãnh đạo thấy form trong hộp thư duyệt', r.status === 200 && r.data.data.some((x) => x.id === reqId), r.data);
  r = await post(`/role-requests/${reqId}/approve`, { roleCode: 'MANAGER' }, T.mgr);
  check('Lãnh đạo cấp vai trò MANAGER → 403 (chỉ ADMIN được cấp)', r.status === 403);
  r = await post(`/role-requests/${reqId}/approve`, { note: 'Đúng nhiệm vụ được giao' }, T.mgr);
  check('Lãnh đạo duyệt form → cấp vai trò SPECIALIST', r.status === 201 && r.data.user.roles.includes('SPECIALIST'), r.data);
  r = await login(officialEmail, 'SPECIALIST', 'Test@1234');
  check('Cán bộ đăng nhập lại với vai trò chuyên viên → OK', r.status === 200 && r.data.role === 'SPECIALIST');
  const tOfficialSp = r.data.accessToken;
  r = await get('/notifications?unreadOnly=true', tOfficialSp);
  check('Cán bộ nhận thông báo đã được duyệt', r.status === 200 && r.data.data.some((n) => /được duyệt/.test(n.title)), r.data);

  // Tham số đuôi email do admin cấu hình
  r = await patch('/parameters/OFFICIAL_EMAIL_DOMAINS', { paramValue: 'syt.com,syt.gov.vn,ca.gov.vn,test.gov' }, T.admin);
  check('Admin thêm đuôi email cơ quan "test.gov"', r.status === 200);
  r = await post('/auth/register', { email: `x.${RUN}@test.gov`, password: 'Test@1234' });
  check('Email @test.gov được nhận diện là cán bộ', r.status === 200 && r.data.accountType === 'OFFICIAL', r.data);
  await patch('/parameters/OFFICIAL_EMAIL_DOMAINS', { paramValue: 'syt.com,syt.gov.vn,ca.gov.vn' }, T.admin);

  // -------------------------------------------------------------------
  section('B. MODULE QUẢN TRỊ HỆ THỐNG');
  const orgCode = `ORG-${RUN}`.toUpperCase();
  r = await post('/organizations', { code: orgCode, name: 'Phòng thử nghiệm', orgType: 'PHONG_BAN', parentId: 1 }, T.admin);
  check('Thêm đơn vị (con của Sở Y tế)', r.status === 201, r.data);
  const orgId = r.data.id;
  r = await post('/organizations', { code: `${orgCode}-C`, name: 'Tổ thử nghiệm', parentId: orgId }, T.admin);
  const childId = r.data.id;
  check('Thêm đơn vị con', r.status === 201);
  r = await post('/organizations', { code: orgCode, name: 'Trùng' }, T.admin);
  check('Mã đơn vị trùng → 409', r.status === 409);
  r = await get('/organizations/tree', T.admin);
  check('Xem cây cơ cấu tổ chức', r.status === 200 && Array.isArray(r.data) && r.data.length >= 1);
  r = await patch(`/organizations/${orgId}/status`, { isActive: false }, T.admin);
  check('Vô hiệu hóa đơn vị → vô hiệu hóa cả đơn vị con', r.status === 200 && r.data.affected.length === 2, r.data);
  r = await del(`/organizations/${orgId}`, T.admin);
  check('Xóa đơn vị còn đơn vị con → 409', r.status === 409);
  r = await del(`/organizations/${childId}`, T.admin);
  const r2 = await del(`/organizations/${orgId}`, T.admin);
  check('Xóa đơn vị con rồi đơn vị cha', r.status === 200 && r2.status === 200);
  r = await get('/organizations', T.sp);
  check('Chuyên viên xem cơ cấu tổ chức (org.view)', r.status === 200);
  r = await post('/organizations', { code: 'Z', name: 'Z' }, T.sp);
  check('Chuyên viên thêm đơn vị → 403', r.status === 403);

  const roleCode = `INSPECTOR_${RUN}`.toUpperCase();
  r = await post('/roles', { roleCode, roleName: `Thanh tra viên ${RUN}`, permissionCodes: ['violation.view', 'statistics.view'] }, T.admin);
  check('Thêm vai trò mới kèm quyền', r.status === 201 && r.data.permissions.length === 2, r.data);
  const roleId = r.data.id;
  r = await post('/roles', { roleCode, roleName: 'khác' }, T.admin);
  check('Vai trò trùng mã → 409', r.status === 409);
  r = await put(`/roles/${roleId}/permissions`, { permissionCodes: ['violation.view', 'statistics.view', 'suspect.view'] }, T.admin);
  check('Phân quyền lại cho vai trò', r.status === 200 && r.data.permissions.length === 3);
  r = await del('/roles/1', T.admin);
  check('Xóa vai trò hệ thống → 403', r.status === 403);
  r = await get('/roles/permissions', T.admin);
  check('Danh mục quyền theo module', r.status === 200 && r.data.VIOLATION && r.data.SYSTEM);

  const staffEmail = `nhanvien.${RUN}@syt.gov.vn`;
  r = await post('/users', { email: staffEmail, fullName: 'Nhân viên test', departmentId: 3, roleCodes: [roleCode] }, T.admin);
  check('Tạo tài khoản cán bộ (sinh mật khẩu tạm)', r.status === 201 && !!r.data.temporaryPassword, r.data);
  const staffId = r.data.user?.id;
  const staffPwd = r.data.temporaryPassword;
  r = await login(staffEmail, roleCode, staffPwd);
  check('Đăng nhập bằng vai trò tự tạo', r.status === 200 && r.data.permissions.includes('suspect.view'), r.data);
  const tStaff = r.data.accessToken;
  r = await get('/suspects', tStaff);
  check('Vai trò tự tạo dùng được quyền đã gán (suspect.view)', r.status === 200);
  r = await get('/legal-documents/1', tStaff);
  r = await post('/violations', {}, tStaff);
  check('Vai trò tự tạo bị chặn quyền chưa gán (violation.manage) → 403', r.status === 403);
  r = await del(`/roles/${roleId}`, T.admin);
  check('Xóa vai trò đang gán cho người dùng → 409', r.status === 409);
  r = await post(`/users/${staffId}/lock`, {}, T.admin);
  const locked = await login(staffEmail, roleCode, staffPwd);
  check('Khóa tài khoản → không đăng nhập được', r.status === 201 && locked.status === 401, locked.data);
  r = await get('/suspects', tStaff);
  check('Token cũ của tài khoản bị khóa bị từ chối', r.status === 401);
  await post(`/users/${staffId}/unlock`, {}, T.admin);
  r = await post(`/users/${staffId}/reset-password`, {}, T.admin);
  check('Đặt lại mật khẩu', r.status === 201 && !!r.data.temporaryPassword);
  r = await get(`/users/${staffId}/login-history`, T.admin);
  check('Xem lịch sử đăng nhập', r.status === 200 && r.data.total >= 1);
  await put(`/users/${staffId}/roles`, { roleCodes: [] }, T.admin);
  r = await del(`/users/${staffId}`, T.admin);
  const r3 = await del(`/roles/${roleId}`, T.admin);
  check('Xóa tài khoản và vai trò test', r.status === 200 && r3.status === 200, [r.data, r3.data]);

  r = await get('/parameters', T.admin);
  check('Xem tham số hệ thống', r.status === 200 && r.data.some((p) => p.paramKey === 'AI_VIOLATION_THRESHOLD'));
  r = await patch('/parameters/AI_VIOLATION_THRESHOLD', { paramValue: 'abc' }, T.admin);
  check('Tham số kiểu số nhận giá trị chữ → 400', r.status === 400);
  r = await get('/audit-logs?action=LOGIN', T.admin);
  check('Nhật ký hoạt động ghi nhận đăng nhập', r.status === 200 && r.data.total > 0);
  r = await get('/audit-logs/export', T.admin);
  check('Xuất nhật ký ra Excel', r.status === 200 && /spreadsheet/.test(r.data.contentType || ''));

  // -------------------------------------------------------------------
  section('C. MODULE QUẢN LÝ NGUỒN THÔNG TIN');
  const docCode = `TEST-${RUN}`.toUpperCase();
  r = await post('/legal-documents', { code: docCode, documentNumber: 'sai-dinh-dang', title: 'x', typeId: 4 }, T.sp);
  check('Số văn bản sai định dạng → 400', r.status === 400);
  r = await post('/legal-documents', { code: docCode, documentNumber: '99/2026/QĐ-SYT', title: `Quyết định thử nghiệm ${RUN}`, typeId: 4, issuer: 'Sở Y tế', issuedDate: '2026-01-10', effectiveDate: '2026-02-01', field: 'Quảng cáo' }, T.sp);
  check('Cách 1 — thêm văn bản bằng form', r.status === 201, r.data);
  const docId = r.data.id;
  r = await post('/legal-documents', { code: docCode, documentNumber: '98/2026/QĐ-SYT', title: 'trùng', typeId: 4 }, T.sp);
  check('Mã văn bản trùng → 409', r.status === 409);
  r = await api('POST', '/legal-documents/import', { token: T.sp, form: fileForm('van-ban-phap-ly-mau.docx') });
  check('Cách 2 — upload Word → trích xuất đủ thông tin văn bản', r.status === 201 && r.data.draft.documentNumber === '25/2026/QĐ-UBND' && r.data.draft.typeCode === 'QUYET_DINH' && r.data.draft.issuedDate === '2026-03-15' && r.data.missingFields.length === 0, r.data.draft);
  const draft = r.data.draft;
  r = await post('/legal-documents', { ...draft, code: `${draft.code}-${RUN}`, typeCode: undefined, contentLength: undefined }, T.sp);
  check('Lưu văn bản từ bản nháp (kèm file đính kèm)', r.status === 201 && !!r.data.attachmentPath, r.data);
  const docId2 = r.data.id;
  r = await patch(`/legal-documents/${docId}/status`, { status: 'INACTIVE' }, T.sp);
  const pubList = await get(`/legal-documents?search=${docCode}`);
  check('Vô hiệu hóa văn bản → người dân không còn thấy', r.status === 200 && pubList.data.total === 0, pubList.data);
  r = await get(`/legal-documents?search=${docCode}`, T.sp);
  check('Chuyên viên vẫn thấy văn bản vô hiệu hóa', r.data.total === 1);
  r = await del('/legal-documents/3', T.sp);
  check('Xóa văn bản đang được AI dùng làm căn cứ → 409', r.status === 409);
  r = await del(`/legal-documents/${docId}`, T.sp);
  const rDel2 = await del(`/legal-documents/${docId2}`, T.sp);
  check('Xóa văn bản chưa được sử dụng', r.status === 200 && rDel2.status === 200);

  const facCode = `PK-${RUN}`.toUpperCase();
  r = await post('/facilities', { code: facCode, name: `Phòng khám thử nghiệm ${RUN}`, organizationForm: 'Phòng khám chuyên khoa', address: '1 Lê Duẩn, Quận 1', district: 'Quận 1', professionalScope: 'Khám nội', workingHours: '8h-17h', licenseNumber: `0${RUN}/HCM-GPHĐ`, licenseIssuedDate: '2025-01-01', licensedTechniques: ['khám nội', 'siêu âm'], typeId: 3 }, T.sp);
  check('Thêm đơn vị KCB → tự tạo GPHĐ + tài khoản cơ sở', r.status === 201 && r.data.account?.temporaryPassword, r.data);
  const newFacId = r.data.facility?.id;
  const facAcc = r.data.account;
  r = await login(facAcc.email, 'FACILITY', facAcc.temporaryPassword);
  check('Cơ sở mới đăng nhập bằng tài khoản được cấp', r.status === 200 && r.data.role === 'FACILITY', r.data);
  r = await post('/facilities', { code: facCode, name: 'x', organizationForm: 'x', address: 'x', professionalScope: 'x', workingHours: 'x', licenseNumber: 'Y1', licenseIssuedDate: '2025-01-01' }, T.sp);
  check('Mã đơn vị trùng → 409', r.status === 409);
  r = await post('/facilities', { code: 'THIEU', name: 'Thiếu trường' }, T.sp);
  check('Thiếu trường bắt buộc (địa chỉ, phạm vi, giấy phép...) → 400', r.status === 400);
  r = await api('POST', '/facilities/import', { token: T.sp, form: fileForm('co-so-kcb-mau.pdf') });
  check('Upload PDF → trích xuất thông tin cơ sở KCB', r.status === 201 && r.data.draft.licenseNumber === '04567/HCM-GPHĐ' && r.data.draft.licensedTechniques.length === 3 && r.data.missingFields.length === 0, r.data.draft);
  r = await get(`/facilities/${newFacId}`, T.sp);
  check('Hồ sơ cơ sở có GPHĐ + tài khoản', r.status === 200 && r.data.licenses.length === 1 && r.data.accounts.length === 1);
  r = await patch(`/facilities/${newFacId}/operating-status`, { operatingStatus: 'SUSPENDED', note: 'Thử đình chỉ' }, T.sp);
  check('Đổi trạng thái hoạt động: tạm đình chỉ', r.status === 200 && r.data.operatingStatus === 'SUSPENDED');
  r = await post('/licenses', { licenseType: 'CCHN', licenseNumber: `9${RUN}/HCM-CCHN`, holderName: 'Bác sĩ Thử Nghiệm', facilityId: newFacId, issuedDate: '2020-01-01' }, T.sp);
  check('Thêm chứng chỉ hành nghề', r.status === 201, r.data);
  r = await post('/licenses', { licenseType: 'GPHD', licenseNumber: `X${RUN}`, issuedDate: '2020-01-01' }, T.sp);
  check('GPHĐ không gắn cơ sở → 400', r.status === 400);
  r = await api('POST', '/licenses/import', { token: T.sp, form: fileForm('giay-phep-cchn-mau.docx') });
  check('Upload Word dạng bảng → trích xuất chứng chỉ hành nghề', r.status === 201 && r.data.draft.licenseType === 'CCHN' && r.data.draft.holderName === 'Võ Minh Anh' && r.data.draft.issuedDate === '2019-08-20', r.data.draft);
  r = await get('/licenses/verify?number=000789/HCM-CCHN');
  check('Tra cứu công khai CCHN hết hạn → valid = false', r.status === 200 && r.data.found && r.data.licenses[0].valid === false, r.data);
  r = await get('/licenses?expired=true', T.sp);
  check('Lọc giấy phép đã hết hạn', r.status === 200 && r.data.data.every((l) => l.isExpired));
  r = await del(`/facilities/${newFacId}`, T.sp);
  check('Xóa cơ sở chưa phát sinh dữ liệu (kèm tài khoản, giấy phép)', r.status === 200, r.data);

  const catCode = `CAT-${RUN}`.toUpperCase();
  r = await post('/source-categories', { code: catCode, name: 'Loại nguồn thử' }, T.sp);
  const catId = r.data.id;
  r = await post('/crawl-sources', { name: 'Nguồn thử', categoryId: catId, platform: 'WEBSITE', url: 'https://example.vn' }, T.sp);
  const srcId = r.data.id;
  r = await patch(`/source-categories/${catId}/status`, { isActive: false }, T.sp);
  const src = await get(`/crawl-sources?categoryId=${catId}`, T.sp);
  check('Vô hiệu hóa loại nguồn → nguồn thuộc loại đó bị vô hiệu hóa', r.status === 200 && src.data.data.every((s) => !s.isActive), src.data);
  r = await post('/topics/1/keywords', { keyword: 'abc@#$' }, T.sp);
  check('Từ khóa có ký tự đặc biệt → 400', r.status === 400);
  r = await post('/topics/1/keywords', { keyword: `từ khóa ${RUN}` }, T.sp);
  check('Thêm từ khóa cho chủ đề', r.status === 201);
  await del(`/keywords/${r.data.id}`, T.sp);
  const schCode = `LTT-${RUN}`.toUpperCase();
  r = await post('/crawl-schedules', { code: schCode, name: 'Lịch thử', sourceId: 1, topicId: 1, primaryKeywords: '' }, T.sp);
  check('Lịch thu thập thiếu từ khóa → 400', r.status === 400);
  r = await post('/crawl-schedules', { code: schCode, name: 'Lịch thử', sourceId: 1, topicId: 1, primaryKeywords: 'nâng mũi, hút mỡ', dataTypes: ['TEXT'], frequency: 'DAILY', sampleLimit: 10 }, T.sp);
  check('Thêm lịch thu thập (mặc định Dừng)', r.status === 201 && r.data.status === 'STOPPED', r.data);
  const schId = r.data.id;
  r = await post(`/crawl-schedules/${schId}/run`, { count: 2 }, T.sp);
  check('Chạy lịch chưa kích hoạt → 400', r.status === 400);
  await post(`/crawl-schedules/${schId}/start`, {}, T.sp);
  r = await post(`/crawl-schedules/${schId}/run`, { count: 3 }, T.sp);
  check('Kích hoạt + chạy phiên thu thập (crawler giả lập) → 3 mẫu tin', r.status === 201 && r.data.items.length === 3 && r.data.job.status === 'COMPLETED', r.data);
  await post(`/crawl-schedules/${schId}/stop`, {}, T.sp);
  r = await del(`/crawl-schedules/${schId}`, T.sp);
  check('Dừng và xóa lịch thu thập', r.status === 200);
  await del(`/crawl-sources/${srcId}`, T.sp);
  await del(`/source-categories/${catId}`, T.sp);

  // -------------------------------------------------------------------
  section('D. MODULE XỬ LÝ THÔNG TIN QUẢNG CÁO (thu thập → QC → lọc → AI → chuyên viên)');
  await post('/crawl-schedules/1/start', {}, T.sp);
  const tag = `[${RUN}]`;
  const phoneNew = `097${String(Date.now()).slice(-7)}`;
  const items = [
    { content: `${tag} Thẩm mỹ viện Bella - Nâng ngực không đau, cam kết hiệu quả 100%, bảo hành trọn đời. Liên hệ 0909111222.`, authorName: 'Thẩm mỹ viện Bella', authorAccount: 'tmvbella', platform: 'FACEBOOK', views: 20000, likes: 900, shares: 100 },
    { content: `${tag} Phòng khám Hồng Phúc chữa dứt điểm bệnh trĩ chỉ sau 1 lần, không đau. Hotline 0911222333.`, authorName: 'Phòng Khám Hồng Phúc', authorAccount: 'phongkhamhongphuc', platform: 'FACEBOOK', views: 5000 },
    { content: `${tag} Bệnh viện Đa khoa X thông báo lịch khám sức khỏe tổng quát định kỳ cho người cao tuổi tại khoa Nội.`, authorName: 'Bệnh viện Đa khoa X', platform: 'FACEBOOK' },
    { content: `${tag} Nha khoa Sài Gòn Smile ưu đãi niềng răng giảm 20%, bác sĩ Trần Thị Bình trực tiếp tư vấn.`, authorName: 'Nha khoa Sài Gòn Smile', platform: 'FACEBOOK' },
    { content: `${tag} Thẩm mỹ viện Bella - Nâng ngực không đau, cam kết hiệu quả 100%, bảo hành trọn đời. Liên hệ 0909111222.`, authorName: 'Reup', platform: 'FACEBOOK' },
    { content: `${tag} Bán áo khoác giá rẻ, freeship toàn quốc cho đơn từ 300k.`, authorName: 'Shop áo', platform: 'FACEBOOK' },
    { content: `${tag} Shop Giảm Cân Siêu Tốc: thuốc giảm cân cấp tốc, giảm 8kg trong 2 tuần, không tác dụng phụ, hàng xách tay. Zalo ${phoneNew}.`, authorName: `Shop Giảm Cân ${RUN}`, authorAccount: `shopgiamcan_${RUN}`, platform: 'FACEBOOK', views: 40000, shares: 800 },
  ];
  items.forEach((it, i) => (it.sourceUrl = `https://facebook.com/${it.authorAccount || 'page' + i}/posts/${RUN}${i}`));
  r = await post('/crawl-schedules/1/run', { items }, T.sp);
  check('Crawler gửi 7 mẫu tin vào hệ thống (COLLECTED)', r.status === 201 && r.data.items.length === 7, r.data);
  const ids = r.data.items.map((i) => String(i.id));
  const [iBella, iHongPhuc, iBvx, iSmile, iDup, iIrr, iDrug] = ids;
  r = await get(`/ad-items?status=COLLECTED&crawlJobId=${r.data.job.id}`, T.sp);
  check('Màn hình "Kết quả thu thập tin" thấy 7 mẫu tin', r.data.total === 7);

  r = await post('/ad-items/qc/extract', { text: items[3].content }, T.sp);
  check('Kiểm tra nhanh QC: bảng đối chiếu GPHĐ/CCHN', r.status === 201 && r.data.checkTable.some((x) => /Bác sĩ/.test(x.type) && x.ok) && r.data.checkTable.some((x) => /Cơ sở/.test(x.type) && x.ok), r.data.checkTable);
  r = await post('/ad-items/qc/extract', { text: 'Phòng khám Ma Quỷ cam kết khỏi hẳn, giấy phép 11111/HCM-GPHĐ' }, T.sp);
  check('QC: số giấy phép không có trong CSDL → "Không có dữ liệu"', r.data.checkTable.some((x) => x.dbResult === 'Không có dữ liệu'), r.data.checkTable);

  const ing = await post('/ad-items/ingest', { items: [{ content: `${tag} Tin rác quảng cáo vay tiền nhanh` }, { content: `${tag} Phòng khám Ánh Dương khám phụ khoa, cam kết khỏi hẳn sau 1 liệu trình` }], sourceType: 'PARTNER' }, T.sp);
  const [iSpam, iFwd] = ing.data.items.map((i) => String(i.id));
  r = await post('/ad-items/qc/decision', { ids: [iSpam], action: 'DISCARD', reason: 'SPAM', confirm: false }, T.sp);
  check('QC loại bỏ khi chưa xác nhận → 400 (không thể hoàn tác)', r.status === 400);
  r = await post('/ad-items/qc/decision', { ids: [iSpam], action: 'DISCARD', reason: 'SPAM', confirm: true }, T.sp);
  check('QC loại bỏ tin rác', r.status === 201 && r.data.processed[0]?.status === 'QC_REJECTED', r.data);
  r = await post('/ad-items/qc/decision', { ids: [iSpam], action: 'FORWARD', confirm: true }, T.sp);
  check('QC thao tác lại tin đã xử lý → bị bỏ qua', r.data.skipped.length === 1);
  r = await post('/ad-items/qc/decision', { ids: [iFwd], action: 'FORWARD', confirm: true }, T.sp);
  check('QC chuyển tiếp → AI phân tích ngay', r.status === 201 && r.data.autoAnalyzed?.analyzed === 1, r.data);

  r = await post('/ad-items/auto-filter', { ids }, T.sp);
  check('"Tự động lọc tất cả": 1 trùng lặp, 1 không liên quan, 5 đạt', r.status === 201 && r.data.summary.duplicate === 1 && r.data.summary.irrelevant === 1 && r.data.summary.passed === 5, r.data.summary);
  check('Mẫu tin đạt được AI phân tích tự động', r.data.autoAnalyzed?.analyzed === 5, r.data.autoAnalyzed);
  const aiRes = Object.fromEntries((r.data.autoAnalyzed?.results ?? []).map((x) => [String(x.id), x]));
  check('AI: Bella (đang đình chỉ, nâng ngực ngoài phạm vi) → VI PHẠM', aiRes[iBella]?.label === 'VIOLATION' && aiRes[iBella].violationTypes.includes('UNLICENSED_OPERATION') && aiRes[iBella].violationTypes.includes('OUT_OF_SCOPE'), aiRes[iBella]);
  check('AI: thuốc giảm cân → VI PHẠM (quảng cáo thuốc + sai sự thật)', aiRes[iDrug]?.label === 'VIOLATION' && aiRes[iDrug].violationTypes.includes('UNLICENSED_DRUG_AD'), aiRes[iDrug]);
  check('AI: Bệnh viện X thông báo khám sức khỏe → KHÔNG VI PHẠM', aiRes[iBvx]?.label === 'NO_VIOLATION', aiRes[iBvx]);
  check('AI: Sài Gòn Smile niềng răng → vượt phạm vi', aiRes[iSmile]?.violationTypes.includes('OUT_OF_SCOPE'), aiRes[iSmile]);
  r = await get(`/ad-items/${iBella}`, T.sp);
  check('Chi tiết mẫu tin có căn cứ AI + văn bản pháp lý', r.data.latestAnalysis?.legalRefs.length > 0 && /Căn cứ/.test(r.data.latestAnalysis.explanation), r.data.latestAnalysis);
  r = await get('/ad-items/classification/stats', T.sp);
  check('Thống kê phân loại tin', r.status === 200 && r.data.byField.length > 0);

  r = await get('/review-queue?pageSize=100', T.sp);
  check('Hàng đợi chuyên viên sắp xếp theo điểm ưu tiên', r.status === 200 && r.data.data.length >= 5 && r.data.data[0].priority >= r.data.data[r.data.data.length - 1].priority);
  r = await get(`/ad-items/${iBella}/decision-support`, T.sp);
  check('Màn hình hỗ trợ quyết định (cơ sở, giấy phép, văn bản pháp lý)', r.status === 200 && r.data.facility?.code === 'TMV-BELLA' && r.data.facilityLicenses.length > 0 && r.data.legalDocuments.length > 0, r.data);

  r = await post(`/ad-items/${iBella}/reviews`, { decision: 'VIOLATION', severity: 'HIGH', reason: 'Cơ sở đang bị đình chỉ, quảng cáo kỹ thuật ngoài phạm vi' }, T.sp);
  check('Chuyên viên xác nhận vi phạm → tự lập hồ sơ vi phạm', r.status === 201 && r.data.itemStatus === 'CONFIRMED_VIOLATION' && /^VP-/.test(r.data.violation?.code), r.data);
  const vBella = r.data.violation?.id;
  r = await post(`/ad-items/${iBella}/reviews`, { decision: 'VIOLATION', reason: 'lần 2' }, T.sp);
  check('Đánh giá mẫu tin đã chốt → 400', r.status === 400);
  r = await post(`/ad-items/${iBvx}/reviews`, { decision: 'NOT_VIOLATION', reason: 'Thông báo hoạt động bình thường' }, T.sp);
  check('Chuyên viên kết luận không vi phạm (đồng ý AI)', r.status === 201 && r.data.itemStatus === 'NOT_VIOLATION' && r.data.review.agreesWithAi === true, r.data);
  r = await post(`/ad-items/${iHongPhuc}/reviews`, { decision: 'VIOLATION', reason: 'Cơ sở không phép, cam kết chữa dứt điểm' }, T.sp);
  check('Vi phạm không rõ cơ sở → AI đối soát gộp vào đối tượng có sẵn DT-0001 (trùng SĐT)', r.status === 201 && r.data.violation?.suspectMatching?.action === 'MERGED' && r.data.violation.suspectMatching.suspect?.code === 'DT-0001', r.data.violation);
  const vHongPhuc = r.data.violation?.id;
  r = await post(`/ad-items/${iDrug}/reviews`, { decision: 'VIOLATION', correctedViolationTypes: ['UNLICENSED_DRUG_AD', 'FALSE_CLAIM', 'MISSING_ORIGIN'], reason: 'Quảng cáo thuốc giảm cân không phép' }, T.sp);
  const drugMatch = r.data.violation?.suspectMatching;
  check(
    'Đối tượng lạ → tạo hồ sơ mới (hoặc đưa vào hàng đợi đối soát nếu giống đối tượng cũ 0.7–0.9)',
    r.status === 201 && ['CREATED', 'CANDIDATES'].includes(drugMatch?.action),
    r.data.violation,
  );
  const vDrug = r.data.violation?.id;
  if (drugMatch?.action === 'CANDIDATES') {
    const cands = await get('/suspects/match-candidates', T.police);
    const mine = cands.data.data.find((c) => c.violationId === vDrug);
    r = await post(`/suspects/match-candidates/${mine?.id}/confirm`, {}, T.police);
    check('Cán bộ an ninh mạng xác nhận ứng viên đối soát → gắn đối tượng vào hồ sơ', r.status === 201 && r.data.timeline.some((t) => t.id === vDrug), r.data);
  }

  // Đánh giá chéo
  await patch('/parameters/REVIEW_REQUIRED_COUNT', { paramValue: '2' }, T.admin);
  try {
    r = await post(`/ad-items/${iSmile}/reviews`, { decision: 'VIOLATION', correctedViolationTypes: ['OUT_OF_SCOPE'], reason: 'Niềng răng không có trong danh mục kỹ thuật' }, T.sp);
    check('Đánh giá chéo (cần 2 chuyên viên): đánh giá 1/2', r.status === 201 && r.data.itemStatus === 'IN_REVIEW', r.data);
    r = await post(`/ad-items/${iSmile}/reviews`, { decision: 'VIOLATION', reason: 'lại' }, T.sp);
    check('Cùng chuyên viên đánh giá lần 2 → 409', r.status === 409);
    r = await get('/review-queue?pageSize=200', T.sp);
    check('Hàng đợi không hiện lại mẫu tin mình đã đánh giá', !r.data.data.some((x) => String(x.id) === iSmile));
    r = await post(`/ad-items/${iSmile}/reviews`, { decision: 'NOT_VIOLATION', reason: 'Cơ sở có thể đã đăng ký bổ sung kỹ thuật' }, T.sp2);
    check('Chuyên viên 2 kết luận khác → XUNG ĐỘT, chờ lãnh đạo', r.status === 201 && r.data.itemStatus === 'CONFLICT', r.data);
    r = await post(`/ad-items/${iSmile}/resolve-conflict`, { decision: 'VIOLATION', reason: 'x' }, T.sp);
    check('Chuyên viên giải quyết xung đột → 403', r.status === 403);
    r = await post(`/ad-items/${iSmile}/resolve-conflict`, { decision: 'VIOLATION', correctedViolationTypes: ['OUT_OF_SCOPE'], severity: 'LOW', reason: 'Giấy phép hiện hành không có kỹ thuật niềng răng' }, T.mgr);
    check('Lãnh đạo giải quyết xung đột → xác nhận vi phạm', r.status === 201 && r.data.itemStatus === 'CONFIRMED_VIOLATION' && !!r.data.violation, r.data);
  } finally {
    await patch('/parameters/REVIEW_REQUIRED_COUNT', { paramValue: '1' }, T.admin);
  }

  r = await post('/ai/analyze-text', { text: 'Thần dược chữa khỏi hẳn tiểu đường, an toàn tuyệt đối' }, T.sp);
  check('Thử AI trên văn bản bất kỳ', r.status === 201 && r.data.label === 'VIOLATION', r.data);
  r = await get('/ai/performance', T.mgr);
  check('Hiệu suất AI (precision/recall/F1) + đồng thuận chuyên viên', r.status === 200 && r.data.evaluatedItems > 0 && r.data.interRater.itemsWithMultipleReviews >= 1, r.data);
  r = await get('/ai/feedback?feedbackType=CONFIRMED', T.sp);
  check('Tập phản hồi tái huấn luyện được ghi nhận', r.status === 200 && r.data.total > 0);
  r = await get('/ai/feedback/export?format=jsonl', T.sp);
  check('Xuất dữ liệu tái huấn luyện (jsonl)', r.status === 200 && r.data.size > 0);

  // -------------------------------------------------------------------
  section('E. MODULE QUẢN LÝ THÔNG TIN VI PHẠM');
  r = await get(`/violations/${vBella}`, T.sp);
  check('Hồ sơ vi phạm: bằng chứng, kết quả AI, allowedActions', r.status === 200 && r.data.status === 'NEW' && r.data.evidence.length > 0 && r.data.aiAnalysis && r.data.allowedActions.includes('assess'), r.data);
  r = await post(`/violations/${vBella}/penalty-decisions`, { decisionNumber: `QD-${RUN}-0`, fineAmount: 1 }, T.sp);
  check('Lập QĐ xử phạt khi chưa kiểm tra thẩm quyền → 400', r.status === 400);
  r = await post(`/violations/${vBella}/assess`, { withinAuthority: true, hasEnoughInfo: true, note: 'Cơ sở trên địa bàn, đủ thông tin' }, T.sp);
  check('Kiểm tra thẩm quyền → Đang xử lý', r.status === 201 && r.data.violation.status === 'PROCESSING', r.data);
  r = await post(`/violations/${vBella}/penalty-decisions`, { decisionNumber: `QD-${RUN}-1`, fineAmount: 15000000, remedialMeasures: 'Gỡ bỏ quảng cáo' }, T.sp);
  check('Vi phạm nghiêm trọng → QĐ xử phạt phải chờ lãnh đạo phê duyệt', r.status === 201 && r.data.requiresApproval === true && r.data.decision.status === 'PENDING_APPROVAL', r.data);
  const pen1 = r.data.decision?.id;
  r = await post(`/penalty-decisions/${pen1}/approve`, {}, T.sp);
  check('Chuyên viên tự phê duyệt → 403', r.status === 403);
  r = await get('/penalty-decisions/pending-approval', T.mgr);
  check('Lãnh đạo thấy QĐ chờ duyệt', r.data.data.some((p) => p.id === pen1));
  r = await post(`/penalty-decisions/${pen1}/approve`, { note: 'Đồng ý' }, T.mgr);
  check('Lãnh đạo phê duyệt → ban hành, hồ sơ "Đã ra QĐ xử phạt"', r.status === 201 && r.data.status === 'ISSUED');
  r = await get(`/penalty-decisions/${pen1}/document`, T.sp);
  check('Xuất quyết định xử phạt ra file Word', r.status === 200 && /msword/.test(r.data.contentType || ''));
  r = await post(`/penalty-decisions/${pen1}/execution`, { executionStatus: 'COMPLIED', note: 'Đã nộp phạt, gỡ quảng cáo' }, T.sp);
  check('Chấp hành xong → hồ sơ Hoàn thành', r.status === 201 && r.data.violation.status === 'RESOLVED', r.data.violation?.status);
  r = await get('/facilities/3', T.sp);
  check('Điểm rủi ro của cơ sở được tính lại', r.data.riskScore > 0 && r.data.violationCount >= 1, { riskScore: r.data.riskScore, level: r.data.riskLevel });
  r = await get('/public/violating-facilities?search=Bella');
  check('Người dân tra cứu thấy đơn vị vi phạm đã xử lý', r.status === 200 && r.data.data.some((f) => f.name === 'Thẩm mỹ viện Bella'), r.data);

  // Import Excel + QĐ không cần phê duyệt
  r = await api('POST', '/violations/import', { token: T.sp, form: fileForm('vi-pham-import-mau.xlsx') });
  check('Import hồ sơ vi phạm từ Excel (2 dòng đúng, 1 dòng lỗi)', r.status === 201 && r.data.created.length === 2 && r.data.errors.length === 1, r.data);
  const vImp = (await get(`/violations?search=${encodeURIComponent(r.data.created[0]?.code)}`, T.sp)).data.data[0];
  await post(`/violations/${vImp.id}/assess`, { withinAuthority: true, hasEnoughInfo: true }, T.sp);
  r = await post(`/violations/${vImp.id}/penalty-decisions`, { decisionNumber: `QD-${RUN}-2`, fineAmount: 5000000 }, T.sp);
  check('Vi phạm mức trung bình, phạt < ngưỡng → ban hành ngay', r.status === 201 && r.data.requiresApproval === false && r.data.decision.status === 'ISSUED', r.data);
  r = await post(`/violations/${vImp.id}/penalty-decisions`, { decisionNumber: `QD-${RUN}-3`, fineAmount: 1 }, T.sp);
  check('Lập QĐ thứ 2 khi đã có QĐ hiệu lực → 400/409', r.status === 400 || r.status === 409);

  // Chuyển phối hợp Công an
  r = await post(`/violations/${vDrug}/assess`, { withinAuthority: false, hasEnoughInfo: false, transferTo: 'CYBER_POLICE', note: 'Bán thuốc qua mạng, cần xác minh chủ tài khoản' }, T.sp);
  check('Không thuộc thẩm quyền → chuyển Phòng An ninh mạng', r.status === 201 && r.data.violation.status === 'TRANSFERRED' && /^HS-/.test(r.data.case?.code), r.data);
  const caseId = r.data.case?.id;
  r = await get('/investigation-cases?status=TRANSFERRED', T.police);
  check('Cán bộ an ninh mạng thấy hồ sơ chuyển đến', r.status === 200 && r.data.data.some((c) => c.id === caseId));
  r = await post(`/investigation-cases/${caseId}/accept`, {}, T.sp);
  check('Chuyên viên Sở Y tế tiếp nhận hồ sơ của Công an → 403', r.status === 403);
  r = await post(`/investigation-cases/${caseId}/accept`, {}, T.police);
  check('Cán bộ an ninh mạng tiếp nhận hồ sơ', r.status === 201 && r.data.status === 'INVESTIGATING');
  await post(`/investigation-cases/${caseId}/updates`, { note: 'Đã gửi văn bản đề nghị nền tảng cung cấp thông tin chủ tài khoản' }, T.police);
  const vDrugDetail = (await get(`/violations/${vDrug}`, T.police)).data;
  r = await post(
    `/investigation-cases/${caseId}/identify`,
    vDrugDetail.suspectId
      ? { suspectId: vDrugDetail.suspectId, findings: 'Chủ tài khoản là hộ kinh doanh tại Quận 5' }
      : { newSuspect: { name: `Hộ kinh doanh ${RUN}`, phones: [phoneNew] }, findings: 'Chủ tài khoản là hộ kinh doanh tại Quận 5' },
    T.police,
  );
  check('Xác định được đối tượng', r.status === 201 && r.data.status === 'IDENTIFIED' && r.data.suspect?.status === 'VERIFIED', r.data);
  r = await post(`/investigation-cases/${caseId}/complete`, { outcome: 'HANDLED', resultSummary: 'Đã làm việc với đối tượng, yêu cầu gỡ bài', closeViolation: false }, T.police);
  const vAfter = (await get(`/violations/${vDrug}`, T.sp)).data;
  check('Cập nhật kết quả → hồ sơ vi phạm quay lại Sở Y tế xử lý', r.status === 201 && vAfter.status === 'PROCESSING', vAfter.status);
  r = await post(`/violations/${vDrug}/warn`, { note: 'Nhắc nhở, yêu cầu cam kết không tái phạm' }, T.sp);
  check('Xử lý bằng nhắc nhở → Hoàn thành', r.status === 201 && r.data.status === 'RESOLVED');
  r = await post(`/investigation-cases/${caseId}/close`, {}, T.police);
  check('Lưu trữ hồ sơ điều tra', r.status === 201 && r.data.status === 'CLOSED' && r.data.updates.length >= 4, r.data.updates?.length);

  // Chuyển Sở TT&TT (chuyên viên cập nhật kết quả)
  r = await post(`/violations/${vHongPhuc}/transfer`, { targetAgency: 'DEPT_INFO_COMM', reason: 'Đề nghị chặn fanpage vi phạm' }, T.sp);
  const case2 = r.data.case?.id;
  check('Chuyển Sở TT&TT', r.status === 201 && r.data.violation.status === 'TRANSFERRED');
  await post(`/investigation-cases/${case2}/accept`, {}, T.sp);
  r = await post(`/investigation-cases/${case2}/complete`, { outcome: 'HANDLED', resultSummary: 'Sở TT&TT đã yêu cầu gỡ fanpage', closeViolation: true }, T.sp);
  const vHp = (await get(`/violations/${vHongPhuc}`, T.sp)).data;
  check('Sở TT&TT xử lý triệt để → đóng hồ sơ vi phạm', r.status === 201 && vHp.status === 'RESOLVED', vHp.status);

  // Đối tượng
  r = await get('/suspects/1', T.police);
  check('Hồ sơ đối tượng DT-0001: timeline vi phạm + điểm rủi ro', r.status === 200 && r.data.timeline.length >= 1 && r.data.riskScore > 0, { timeline: r.data.timeline?.length, risk: r.data.riskScore });
  r = await get('/suspects/dashboard', T.police);
  check('Dashboard đối tượng (KPI, bản đồ theo quận)', r.status === 200 && r.data.kpi.totalEntities >= 2);
  const sA = await post('/suspects', { name: `Đối tượng A ${RUN}`, phones: [`0888${String(Date.now()).slice(-6)}`], accounts: [{ platform: 'TIKTOK', platformUid: `a_${RUN}` }] }, T.police);
  const sB = await post('/suspects', { name: `Đối tượng B ${RUN}` }, T.police);
  r = await post(`/suspects/${sA.data.id}/merge`, { targetSuspectId: sB.data.id }, T.police);
  check('Gộp hồ sơ đối tượng trùng (chống lẩn tránh)', r.status === 201 && r.data.accounts.length === 1 && r.data.phones.length === 1, r.data);
  r = await post('/suspects', { name: 'x' }, T.sp);
  check('Chuyên viên tạo đối tượng → 403 (quyền của an ninh mạng)', r.status === 403);

  // Phản hồi của cơ sở
  r = await post('/violations', { title: `Quảng cáo khám tổng quát ${RUN}`, content: 'Khám tổng quát tốt nhất thành phố', facilityId: 1, typeCodes: ['FALSE_CLAIM'], severity: 'LOW' }, T.sp);
  check('Chuyên viên nhập thủ công hồ sơ vi phạm', r.status === 201, r.data);
  const vFac = r.data.violation?.id;
  r = await get('/facility-portal/violations', T.fac);
  check('Cơ sở KCB xem hồ sơ vi phạm của mình', r.status === 200 && r.data.some((v) => v.id === vFac));
  r = await get('/notifications', T.fac);
  check('Cơ sở nhận thông báo có hồ sơ vi phạm mới', r.data.data.some((n) => n.entityType === 'violation' && n.entityId === String(vFac)));
  r = await post('/facility-feedbacks', { violationId: vBella, feedbackType: 'COMPLAINT', subject: 'x', content: 'x' }, T.fac);
  check('Cơ sở gửi phản hồi cho hồ sơ của cơ sở khác → 403', r.status === 403);
  r = await post('/facility-feedbacks', { violationId: vFac, feedbackType: 'COMPLAINT', subject: 'Khiếu nại nội dung', content: 'Bài viết là đánh giá của khách hàng, không phải quảng cáo của bệnh viện' }, T.fac);
  check('Cơ sở gửi khiếu nại', r.status === 201 && /^PH-/.test(r.data.code), r.data);
  const fbId = r.data.id;
  r = await api('POST', `/facility-feedbacks/${fbId}/attachments`, { token: T.fac, form: fileForm('quang-cao-du-kien-mau.txt', 'files') });
  check('Đính kèm tài liệu giải trình', r.status === 201 && r.data.attachments.length === 1, r.data);
  r = await get('/facility-feedbacks?status=RECEIVED', T.sp);
  check('Chuyên viên thấy phản hồi trong hộp thư', r.data.data.some((f) => f.id === fbId));
  await post(`/facility-feedbacks/${fbId}/process`, {}, T.sp);
  r = await post(`/facility-feedbacks/${fbId}/respond`, { decision: 'ACCEPTED', responseNote: 'Chấp nhận giải trình', dismissViolation: true }, T.sp);
  const vFacAfter = (await get(`/violations/${vFac}`, T.sp)).data;
  check('Chấp nhận khiếu nại → hồ sơ vi phạm bị bác bỏ', r.status === 201 && vFacAfter.status === 'DISMISSED', vFacAfter.status);

  // Cơ sở tải quyết định xử phạt đã ban hành cho chính mình
  r = await post('/violations', { title: `Quảng cáo vượt phạm vi ${RUN}`, content: 'Bệnh viện Đa khoa X nhận làm răng sứ thẩm mỹ', facilityId: 1, typeCodes: ['OUT_OF_SCOPE'], severity: 'LOW' }, T.sp);
  const vFac2 = r.data.violation?.id;
  await post(`/violations/${vFac2}/assess`, { withinAuthority: true, hasEnoughInfo: true }, T.sp);
  r = await post(`/violations/${vFac2}/penalty-decisions`, { decisionNumber: `QD-FAC-${RUN}`, fineAmount: 2000000 }, T.sp);
  const pFac = r.data.decision?.id;
  r = await get(`/facility-portal/penalties/${pFac}/document`, T.fac);
  check('Cơ sở tải quyết định xử phạt của mình (.doc)', r.status === 200 && /msword/.test(r.data.contentType || ''), r.data);
  r = await get(`/penalty-decisions/${pFac}/document`, T.fac);
  check('Cơ sở không gọi được API quyết định nội bộ → 403', r.status === 403);

  // Kiểm tra trước
  r = await post('/prechecks', { contentText: 'Thẩm mỹ viện Bella: nâng mũi cấu trúc, cam kết đẹp vĩnh viễn' });
  check('Khách kiểm tra trước (không đăng nhập) → KHÔNG ĐẠT, có lý do + khuyến nghị', r.status === 201 && r.data.result === 'FAIL' && r.data.status === 'AUTO_ASSESSED' && r.data.steps['4_ket_qua'].recommendations.length > 0, r.data);
  const pcCode = r.data.code;
  r = await get(`/prechecks/lookup/${pcCode}`);
  check('Tra cứu kết quả bằng mã phiếu', r.status === 200 && r.data.finalResult === 'FAIL');
  const txt = fs.readFileSync(path.join(SAMPLES, 'quang-cao-du-kien-mau.txt'), 'utf8');
  r = await post('/prechecks', { contentText: txt }, T.fac);
  check('Cơ sở KCB gửi kiểm tra trước → chờ chuyên viên xác minh', r.status === 201 && r.data.status === 'PENDING_REVIEW' && ['PASS', 'WARNING'].includes(r.data.result), r.data);
  const pcId = r.data.id;
  r = await post(`/prechecks/${pcId}/review`, { finalResult: 'PASS', reviewNote: 'Nội dung phù hợp, cơ sở có giấy xác nhận quảng cáo' }, T.sp);
  check('Chuyên viên xác minh kết quả cuối cùng', r.status === 201 && r.data.status === 'REVIEWED' && r.data.finalResult === 'PASS');
  r = await get('/prechecks/mine', T.fac);
  check('Cơ sở xem lịch sử kiểm tra trước', r.data.data.some((p) => p.id === pcId));

  // Người dân phản ánh
  r = await post('/public/reports', { content: `${tag} Trang bán thuốc tăng chiều cao thần tốc`, sourceUrl: 'https://facebook.com/xyz' }, T.cit);
  check('Người dân phản ánh quảng cáo → vào hàng đợi kiểm tra', r.status === 201 && /^MT-/.test(r.data.code));
  r = await get('/public/reports/mine', T.cit);
  check('Người dân theo dõi phản ánh của mình', r.status === 200 && r.data.length >= 1);
  r = await get('/public/facilities/1');
  check('Chi tiết cơ sở công khai: giấy phép, bác sĩ có CCHN', r.status === 200 && r.data.doctors.length >= 1 && r.data.licenses.length >= 1, r.data);

  // Thống kê, thông báo
  r = await get('/statistics/overview', T.mgr);
  check('Lãnh đạo xem thống kê tổng hợp', r.status === 200 && r.data.violations.totals.total > 0 && r.data.violations.byType.length > 0, r.data.violations?.totals);
  r = await get('/statistics/my-tasks', T.sp);
  check('Việc cần làm của chuyên viên', r.status === 200 && 'reviewQueue' in r.data);
  r = await get('/statistics/export', T.mgr);
  check('Xuất báo cáo thống kê Excel', r.status === 200 && /spreadsheet/.test(r.data.contentType || ''));
  r = await get('/violations/export', T.sp);
  check('Xuất danh sách vi phạm Excel', r.status === 200 && /spreadsheet/.test(r.data.contentType || ''));
  r = await get('/statistics/overview', T.cit);
  check('Người dân xem thống kê nội bộ → 403', r.status === 403);
  r = await get('/notifications/unread-count', T.mgr);
  const unread = r.data.unread;
  await post('/notifications/read-all', {}, T.mgr);
  r = await get('/notifications/unread-count', T.mgr);
  check('Thông báo cho lãnh đạo + đánh dấu đã đọc', unread > 0 && r.data.unread === 0, { unread });
  r = await get(`/audit-logs?entityType=violation&entityId=${vBella}`, T.admin);
  check('Nhật ký truy vết toàn bộ vòng đời hồ sơ vi phạm', r.status === 200 && r.data.total >= 5, r.data.total);

  // -------------------------------------------------------------------
  console.log(`\n\x1b[1mKết quả: ${pass} đạt, ${fail} lỗi\x1b[0m`);
  if (fail) {
    console.log('Các bước lỗi:\n - ' + failures.join('\n - '));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('\nLỗi khi chạy test:', e);
  process.exit(1);
});
