export const settingsFieldsLeft = [
  { label: "Số lượng dòng trên mỗi trang", value: "10" },
  { label: "Regex số điện thoại", value: "^[0-9\\-\\+]{9,15}$" },
  { label: "Format hiển thị ô nhập liệu ngày giờ", value: "d/m/Y" },
  { label: "Regex cho diễn giải hoạch toán", value: "^[A-Za-z0-9.\\-,\\s]{1,}$" },
  { label: "Regex thuế", value: "^[0-9a-zA-Z-,( ),(,),-,.]{0,34}$" },
  { label: "Regex số xe", value: "^[a-zA-Z0-9\\s-.]{1,}$" },
];

export const settingsFieldsRight = [
  { label: "Danh sách số dòng trong bảng", value: "[5, 10, 25, 50, 100, 250, 500, 1000]" },
  { label: "Format datetime cho json", value: "YYYY-MM-DDTHH:mm:ss+07:00" },
  { label: "Regex Email", value: "^\\w+([-+.']\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*$" },
  { label: "Regex tên", value: "^[0-9a-zA-Z-,( ),(,),-,.]{0,34}$" },
  { label: "Regex mã", value: "" },
  { label: 'Giá trị tối đa ô "Số lượng"', value: "1000000" },
];
