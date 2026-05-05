# Tài liệu Thiết kế UI/UX - Hệ thống Quản lý Quán Cafe 24/7

## 1. Tổng quan dự án

- **Tên dự án:** Cafe 24/7 — Hệ thống Quản lý Quán Cafe
- **Công nghệ:** ASP.NET Core Web API + Vanilla JS (HTML/CSS/JS thuần)
- **Mục tiêu:** Cung cấp giao diện trực quan, chia theo vai trò rõ ràng, giúp Thu ngân order nhanh và Quản lý/Admin theo dõi vận hành hiệu quả.
- **Đối tượng sử dụng:**
  | Vai trò | Màn hình chính | Quyền hạn |
  |---|---|---|
  | **Admin** | Dashboard, Settings, tất cả trang | Toàn quyền, cấu hình hệ thống |
  | **Manager** | Dashboard, Menu, Kho, Nhân viên, Báo cáo | Quản lý vận hành, không cấu hình hệ thống |
  | **Staff (Thu ngân)** | Cashier Interface, Báo cáo Ca | Bán hàng, xem lịch sử ca |

---

## 2. Phong cách thiết kế (Design Guidelines)

### 2.1. Màu sắc chủ đạo
| Token | Mã màu | Ý nghĩa |
|---|---|---|
| `--primary-color` | `#c56517` | Cam nâu — màu cà phê đặc trưng, dùng cho nút CTA, active state |
| `--primary-hover` | `#a85f17` | Trạng thái hover của nút |
| Nền sidebar | `rgba(26,9,6,0.95)` → `rgba(137,86,86,0.95)` | Gradient nâu sẫm — sang trọng, ấm cúng |
| Nền trang | `#120604` + ảnh blur | Cafe background, glassmorphism overlay |
| Text muted | `#b6a8a2` | Text phụ, icon sidebar |
| Success | `#22c55e` | Trạng thái thành công, còn hạn |
| Danger | `#ef4444` | Lỗi, hết hạn, xóa |
| Warning | `#eab308` | Cảnh báo, sắắp hết hàng |

### 2.2. Typography
- **Font chính:** `Inter` (Google Fonts) — tối ưu cho màn hình POS & máy tính bảng
- **Scale:** h1 logo `1.2rem` → page title `1.4rem` → section title `1.1rem` → body `0.9rem`
- **Font weight:** 500 (nav), 600 (label, active), 700 (KPI value, title)

### 2.3. Component System
- **Border-radius:** 8px (nav item, input), 12px (card, modal), 16px (KPI card)
- **Glassmorphism:** `backdrop-filter: blur(10-15px)` + `rgba` backgrounds
- **Shadow:** `0 10px 30px rgba(0,0,0,0.2)` cho card, `4px 0 15px rgba(0,0,0,0.2)` cho sidebar
- **Transition:** `all 0.3s ease` áp dụng nhất quán

### 2.4. Icons
- **Thư viện:** FontAwesome 6.4 (`fa-solid`)
- **Mapping danh mục:** ☕ `fa-coffee`, 🍵 `fa-mug-hot`, 🥐 `fa-bread-slice`, 🥤 `fa-blender`, 🍦 `fa-ice-cream`
- **Mapping chức năng:** `fa-chart-line` (Dashboard), `fa-utensils` (Menu), `fa-box` (Kho), `fa-ticket` (Voucher)

---

## 3. Cấu trúc màn hình (Core Screens)

### 3.1. Màn hình Đăng nhập (`/app/login`)

**Layout:** Centered card với background ảnh cafe blur

**Thành phần:**
- Logo icon + tên thương hiệu "CAFE 24/7"
- Input: Username, Password (có icon prefix)
- Nút "Đăng nhập" full-width gradient
- Link "Quên mật khẩu"

**UX Notes:**
- Sau đăng nhập, redirect tự động theo role (Admin/Manager → `/app/dashboard`, Staff → `/app/cashier`)
- Hiển thị toast lỗi nếu sai thông tin, không reload trang

---

### 3.2. Dashboard Tổng Quan (`/app/dashboard`) — *Admin & Manager*

**Layout:** Sidebar (250px) + Main content (flex-1)

**KPI Cards (4 thẻ):**
| Thẻ | Icon | Màu | Dữ liệu |
|---|---|---|---|
| Doanh thu hôm nay | `fa-money-bill-wave` | Cam `#c56517` | Tổng tiền từ đơn Completed hôm nay |
| Số đơn hôm nay | `fa-shopping-cart` | Xanh `#3b82f6` | Đếm Order trong ngày |
| Nhân viên active | `fa-users` | Tím `#a855f7` | Nhân viên đang có ca mở |
| Lợi nhuận ước tính | `fa-chart-line` | Xanh lá | Revenue - Cost |

**Biểu đồ doanh thu theo giờ:** Bar chart dọc, highlight giờ hiện tại

**Bảng đơn hàng gần đây:**
- Cột: Mã đơn, Thời gian, Thu ngân, Tổng tiền, Trạng thái
- Trạng thái: badge màu (Completed=xanh, Pending=vàng, Cancelled=đỏ)

**Sidebar Navigation (thứ tự từ trên xuống):**
1. 📊 Tổng Quan `/app/dashboard` ← active khi ở đây
2. 🛍️ Đơn Hàng `/app/orders`
3. 🍽️ Thực Đơn `/app/menu`
4. 📦 Kho Hàng `/app/inventory`
5. 🚚 Lịch Sử Nhập `/app/imports`
6. 👥 Nhân Viên `/app/staff`
7. 🏭 Nhà Cung Cấp `/app/suppliers`
8. 🎫 Mã Giảm Giá `/app/vouchers`
9. 📈 Báo Cáo Tháng `/app/reports`
---
10. 📋 Chốt Ca `/app/shift-report`
11. ⚙️ Cài Đặt `/app/settings` (chỉ Admin)

> **Lỗi đã fix:** Active state sidebar tab được tự động highlight dựa trên `window.location.pathname` thông qua hàm `highlightActiveNavItem()` trong `Common.js`.

---

### 3.3. Giao diện Thu ngân - POS (`/app/cashier`) — *Staff & Manager*

**Layout:** Topbar (60px) + Body chia đôi [Thực đơn 60% | Đơn hàng 40%]

**Khu vực thực đơn (trái):**
- **Category tabs** dạng nút ngang: Tất Cả | Cà Phê | Trà | Bánh | ...
- **Menu grid:** Lưới 3-4 cột, mỗi card gồm:
  - Ảnh món (từ Cloudinary URL hoặc fallback ảnh danh mục)
  - Tên món
  - Giá bán (định dạng `xx.xxx đ`)
  - Overlay "+" khi hover
- Click vào card → thêm vào đơn hàng

**Khu vực đơn hàng (phải):**
- Header: Mã đơn ngẫu nhiên + "Tại quầy"
- Danh sách món đã chọn:
  - Tên món + Đơn giá/cái
  - Nút `[-]` / số lượng / `[+]`
  - Tổng tiền dòng (right-aligned)
- Section tổng tiền:
  - Tạm tính | VAT 8% | Giảm giá
  - **Tổng cộng** (font lớn, màu cam nổi bật)
- Voucher: Input + nút "Áp dụng"
- Payment method: Tiền mặt | Chuyển khoản | QR Code
- Nút hành động: `[🗑️ Xóa]` `[🖨️ In]` `[💳 Thanh Toán]`

**In hóa đơn (Popup 400x600):**
- Header: Logo + tên cửa hàng + thời gian
- **Table HTML** (thay thế plain text ASCII):
  - Cột: Tên Món | SL | Đơn Giá | T.Tiền
  - Tổng bảng riêng: Tạm tính → VAT → Giảm giá → Tổng cộng
- Footer: Phương thức thanh toán + "Cảm ơn quý khách"
- Tự động in và đóng popup

---

### 3.4. Quản lý Thực Đơn (`/app/menu`) — *Manager & Admin*

**Tabs nội dung:** [🍽️ Món] [📋 Danh Mục] [🧀 Topping]

**Bảng dữ liệu (Table View):**
- Cột Món: Thumbnail ảnh (40x40, bo tròn) + Tên + ID
- Cột Danh mục: Badge màu
- Cột Giá: Right-aligned, format VND
- Cột Thao tác: [✏️ Sửa] [🗑️ Xóa]

**Modal Thêm/Sửa Món:**
- Field: Tên, Danh mục (dropdown), Giá bán
- Upload ảnh:
  - `<input type="file">` → gọi `POST /upload/image` → Cloudinary
  - **Nút Submit bị DISABLE** trong lúc upload (spinner "Đang tải ảnh...")
  - Preview ảnh sau khi upload thành công
  - Fallback: dùng ảnh của danh mục nếu không có ảnh riêng
- Nút: [Hủy] [Thêm Mới / Cập Nhật]

> **Lỗi đã fix:** Race condition upload ảnh → Cloudinary URL không được lưu vào DB khi user bấm Submit quá nhanh. Đã vô hiệu hóa nút Submit trong suốt quá trình upload.

---

### 3.5. Quản lý Mã Giảm Giá (`/app/vouchers`) — *Manager & Admin*

**KPI Cards (4 thẻ):** Tổng Mã | Còn Hạn | Hết Hạn | Giảm Giá TB

**Bộ lọc:** Dropdown trạng thái (Tất cả / Còn hạn / Hết hạn)

**Bảng dữ liệu:**
| Cột | Mô tả |
|---|---|
| Mã code | Uppercase, dạng `CAFE2024` |
| Giá trị giảm | Format VND (right-aligned) |
| Hạn sử dụng | Định dạng `dd/MM/yyyy HH:mm` |
| Danh mục áp dụng | Tên danh mục hoặc "Tất cả" |
| Trạng thái | Badge: 🟢 Còn hạn / 🔴 Hết hạn |
| Thao tác | [✏️ Sửa] [🗑️ Xóa] |

**Modal Thêm/Sửa Voucher:**
- Mã code (tự sinh hoặc nhập tay, tự động UPPERCASE)
- Số tiền giảm (VND)
- Ngày hết hạn (datetime-local picker)
- Danh mục áp dụng (dropdown, trống = tất cả)

> **Sidebar fix:** Đã thêm link `/app/vouchers` trực tiếp vào HTML sidebar của `VoucherManagement.html`, không phụ thuộc hoàn toàn vào JS injection.

---

### 3.6. Quản lý Kho Hàng (`/app/inventory`) — *Manager & Admin*

**KPI:** Tổng nguyên liệu | Sắp hết (≤ ngưỡng) | Hết hàng | Giá trị kho

**Bảng nguyên liệu:**
- Tên nguyên liệu | Đơn vị | Tồn kho | Ngưỡng cảnh báo | Trạng thái
- Trạng thái: 🟢 Đủ hàng / 🟡 Sắp hết / 🔴 Hết hàng

**Tính năng:**
- Thêm/sửa/xóa nguyên liệu
- Đặt ngưỡng cảnh báo tồn kho

---

### 3.7. Báo Cáo Tháng (`/app/reports`) — *Manager & Admin*

**Bộ lọc:** Chọn tháng/năm

**Nội dung:**
- Biểu đồ doanh thu theo ngày (line chart)
- Tổng doanh thu | Chi phí nhập hàng | Lợi nhuận ước tính
- Top 5 món bán chạy
- Bảng chi tiết đơn hàng trong tháng

**Xuất báo cáo:** Nút "Xuất CSV" → download file với BOM UTF-8 (hỗ trợ Excel tiếng Việt)

---

### 3.8. Cài Đặt Hệ Thống (`/app/settings`) — *Admin only*

**Các nhóm cài đặt:**

1. **Thông tin cửa hàng:** Tên, địa chỉ, SĐT, email
2. **Giờ hoạt động:** Giờ mở/đóng cửa, múi giờ
3. **Tài chính:** VAT (%), session timeout, độ dài mật khẩu tối thiểu
4. **Cloudinary (Image hosting):**
   - Cloud Name, API Key, API Secret, Folder
   - ⚠️ Phải nhập đủ 3 trường mới cho phép lưu
5. **Nhật ký hoạt động:** Bảng log hệ thống với filter theo loại action và keyword

---

## 4. Trải nghiệm người dùng (UX Principles)

### 4.1. Quy tắc 3-4 thao tác cho 1 giao dịch (POS)
1. Chọn món từ menu grid → tự vào giỏ
2. Điều chỉnh số lượng trực tiếp trong giỏ
3. Chọn phương thức thanh toán → bấm "Thanh Toán"
4. Confirm in hóa đơn (tùy chọn)

### 4.2. Feedback tức thì
- **Toast notification** (góc phải, slide-in): Success (xanh), Warning (vàng), Error (đỏ), Info (xanh dương)
- **Loading state:** Spinner trên nút, overlay toàn trang khi cần
- **Confirm modal:** Popup xác nhận trước khi xóa hoặc hành động không thể hoàn tác

### 4.3. Dark Mode by default
- Toàn bộ giao diện dark mode (nền tối, text sáng)
- Phù hợp với ánh sáng mờ trong không gian quán cafe buổi tối
- Giảm mỏi mắt cho nhân viên ca đêm

### 4.4. Active State Navigation
- Tab sidebar tự động sáng (`.dash-nav-item.active`) dựa trên `window.location.pathname`
- Background: `rgba(197, 101, 23, 0.8)` — màu cam cafe
- Font-weight: 600 khi active

### 4.5. Responsive
- Sidebar thu gọn thành hamburger menu trên mobile (< 768px)
- Menu grid cashier tự điều chỉnh số cột
- Bảng dữ liệu scroll ngang trên màn hình nhỏ
- Font-size tự scale (`clamp()`) theo viewport

---

## 5. Luồng người dùng (User Flows)

### Flow 1: Thu ngân xử lý đơn hàng
```
Đăng nhập (Staff) 
  → Trang Cashier (/app/cashier)
  → Chọn món từ grid
  → Nhập mã voucher (nếu có)
  → Chọn phương thức thanh toán
  → Bấm "Thanh Toán" → API POST /orders/create-and-checkout
  → Confirm in bill → Print popup
  → Reset đơn hàng mới
```

### Flow 2: Manager thêm món mới
```
Đăng nhập (Manager/Admin)
  → Menu Management (/app/menu)
  → Bấm "Thêm Món Mới"
  → Điền tên, chọn danh mục, nhập giá
  → Upload ảnh → (Submit bị block cho đến khi Cloudinary xác nhận)
  → Bấm "Thêm Mới" → API POST /items
  → Refresh bảng
```

### Flow 3: Nhân viên nhập kho
```
Đăng nhập (Staff/Manager)
  → Kho Hàng (/app/inventory) [nếu có quyền]
  → Xem danh sách nguyên liệu
  → Thêm phiếu nhập → Chọn nhà cung cấp + nguyên liệu + số lượng + giá
  → API POST /imports → Tự động cộng tồn kho
```

---

## 6. Trạng thái và màu sắc (Status Colors)

| Trạng thái | Badge CSS | Màu chữ | Màu nền |
|---|---|---|---|
| Còn hàng / Còn hạn / Hoạt động | `.in-stock` | `#22c55e` | `rgba(34,197,94,0.1)` |
| Hết hàng / Hết hạn | `.out-of-stock` | `#ef4444` | `rgba(239,68,68,0.1)` |
| Sắp hết | `.low-stock` | `#eab308` | `rgba(234,179,8,0.1)` |
| Đã thanh toán (Completed) | - | `#22c55e` | - |
| Đang chờ (Pending) | - | `#eab308` | - |
| Đã hủy (Cancelled) | - | `#ef4444` | - |

---

## 7. Công nghệ & Thư viện UI

| Công nghệ | Vai trò |
|---|---|
| Vanilla JS (ES2020+) | Logic frontend, DOM manipulation |
| CSS Custom Properties | Design token system |
| FontAwesome 6.4 | Icon library |
| Google Fonts — Inter | Typography |
| SignalR (JS client) | Realtime shift sync |
| Chart.js | Biểu đồ doanh thu (nếu tích hợp) |
| Cloudinary CDN | Image delivery & optimization |
