# Kiến Trúc & Tài Liệu Kỹ Thuật — QLCafe

> Tài liệu này dành cho buổi **demo / bảo vệ dự án**. Mô tả đủ để trình bày kiến trúc, database, và các thuật toán / logic quan trọng.

---

## 1. Tổng Quan Hệ Thống

QLCafe là hệ thống quản lý quán cà phê tích hợp, gồm hai giao diện chính:

| Giao diện | Đối tượng | URL điển hình |
|-----------|-----------|---------------|
| **Admin Dashboard** | Chủ quán, Quản lý | `/UI/AdminDashboard.html` |
| **Cashier Interface** | Thu ngân, Nhân viên | `/UI/CashierInterface.html` |

---

## 2. Kiến Trúc Dự Án

```
PBL3/
├── Controllers/          # REST API Controllers (.NET 8)
├── Services/             # Business Logic (Interface + Implementation)
├── Entities/             # EF Core Models (21 bảng)
├── Models/               # DTOs / Request-Response shapes
├── Helpers/              # DataContext, AppSettings, ErrorHandler
├── Authorization/        # Custom JWT Middleware & Authorize attribute
├── Hubs/                 # SignalR Hub (realtime ca làm)
├── Migrations/           # EF Core migrations (SQL Server)
└── UI/                   # Frontend thuần HTML + JS + CSS
    ├── Common.js         # Auth guard, toast, shared modals
    ├── style.css         # Design system toàn bộ ứng dụng
    └── *.html / *.js     # Từng màn hình
```

### Luồng Request

```
Trình duyệt (HTML/JS)
       │  HTTP fetch (with credentials)
       ▼
ASP.NET Core Pipeline
  ├─ JwtMiddleware  → đọc cookie "token", gán HttpContext.Items["User"]
  ├─ ErrorHandlerMiddleware  → bắt exception → trả JSON lỗi
  └─ Controller  →  Service  →  DataContext (EF Core)  →  SQL Server
                                                ↕
                                           SignalR Hub
                                      (ShiftHub /hubs/shifts)
```

### Phân lớp

| Lớp | Công nghệ | Ghi chú |
|-----|-----------|---------|
| Frontend | Vanilla HTML/CSS/JS | Không dùng framework; giao tiếp qua `fetch` |
| Backend | ASP.NET Core 8 Web API | Chạy port 4000 |
| ORM | Entity Framework Core 6 | Code-first, tự migrate khi khởi động |
| Database | SQL Server (2019+) | Chạy local hoặc Docker |
| Realtime | SignalR | Cập nhật UI khi ca làm thay đổi |
| Ảnh | Cloudinary SDK | Tải ảnh menu lên cloud |
| Auth | JWT (cookie HttpOnly) | Không lộ token ra JS |

---

## 3. Phân Quyền (Authorization)

Hệ thống có 3 vai trò:

| Role | Giá trị enum | Quyền |
|------|-------------|-------|
| `Admin` | 1 | Tạo mọi tài khoản, xem System Logs, cấu hình hệ thống |
| `Manager` | 0 | Quản lý nhân viên, menu, kho, báo cáo |
| `Staff` | 2 | Bán hàng, mở/chốt ca, xuất kho |

**Custom `[Authorize]` attribute** đọc `HttpContext.Items["User"]` (được gán bởi `JwtMiddleware`) thay vì dùng ASP.NET Identity — đơn giản, kiểm soát hoàn toàn.

---

## 4. Database — Sơ Đồ Thực Thể

### 4.1 Nhóm Nhân Sự

```
Users (1) ─── (n) Shifts
              Shifts.EmployeeId → Employees.EmployeeId
Employees (1) ─── (n) Shifts
           └── (n) Expenses
```

| Bảng | Trường chính | Mô tả |
|------|-------------|-------|
| `Users` | UserId, Username, PasswordHash, Role | Tài khoản đăng nhập |
| `Employees` | EmployeeId, Name, Role, BasicSalary | Hồ sơ nhân viên |
| `Shifts` | ShiftId, EmployeeId, Opening, Expected, Status | Ca làm việc |

### 4.2 Nhóm Thực Đơn

```
Categories (1) ─── (n) Items (1) ─── (n) ItemIngredients ─── (n) Ingredients
                        └─── (n) OrderDetails
```

| Bảng | Trường chính | Mô tả |
|------|-------------|-------|
| `Categories` | CategoryId, Name | Nhóm đồ uống |
| `Items` | ItemId, Name, BasePrice, ImageUrl, CategoryId | Món bán |
| `Toppings` | ToppingId, Name, Price | Topping nâng cấp |

### 4.3 Nhóm Đơn Hàng & Thanh Toán

```
Orders (1) ─── (n) OrderDetails (1) ─── (n) OrderToppings
Orders (1) ─── (1) Payments
```

| Bảng | Trường chính | Mô tả |
|------|-------------|-------|
| `Orders` | OrderId, TableId, EmployeeId, Total, CreatedAt | Đơn hàng |
| `OrderDetails` | OrderDetailId, OrderId, ItemId, Quantity, TotalPrice | Món trong đơn |
| `OrderToppings` | Id, OrderDetailId, ToppingId | Topping chọn |
| `Payments` | PaymentId, OrderId, Method, Price, PaidAt | Thanh toán |

### 4.4 Nhóm Kho & Nhà Cung Cấp

```
Suppliers (1) ─── (n) Imports ─── (n) Ingredients
Ingredients (1) ─── (n) ItemIngredients
```

### 4.5 Nhóm Khuyến Mãi

```
Vouchers ─── ApplicableCategoryId → Categories (nullable)
Customers (n) ─── (m) Vouchers  [qua CustomerVouchers]
```

`Voucher.ApplicableCategoryId = NULL` → áp dụng toàn bộ đơn hàng.  
`Voucher.ApplicableCategoryId = X` → chỉ giảm trên các món thuộc Category X.

### 4.6 Nhóm Audit & Cấu Hình

| Bảng | Mô tả |
|------|-------|
| `SystemActivityLogs` | Ghi lại hành động (ORDER_CREATED, USER_REGISTER, INGREDIENT_USED…) |
| `SystemConfigs` | Key-value store cho cấu hình (Cloudinary, v.v.) |

---

## 5. Các Luồng Nghiệp Vụ Quan Trọng

### 5.1 Luồng Bán Hàng (Cashier)

```
1. Nhân viên đăng nhập → JWT cookie được set HttpOnly
2. Nhân viên mở ca → POST /shifts/open { openingAmount }
3. Khách chọn món → giỏ hàng local (JS state)
4. Áp mã giảm giá (tuỳ chọn):
   - GET /vouchers?code=XXX
   - Kiểm tra ExpiryDate > Now, ApplicableCategoryId
   - Tính discount = min(DiscountAmount, subtotal_của_category)
5. Thanh toán → POST /orders/create-and-checkout
   - Tạo Order → thêm OrderDetails → ghi Payment
   - Ghi SystemActivityLog("ORDER_CREATED")
   - SignalR broadcast → Dashboard cập nhật realtime
6. Cuối ca → POST /shifts/close { shiftId, expectedAmount }
```

### 5.2 Tính Giảm Giá Theo Danh Mục

```
Nếu voucher.ApplicableCategoryId != null:
    subtotal_áp_dụng = tổng TotalPrice của OrderDetails
                       mà Item.CategoryId == voucher.ApplicableCategoryId
    discount = min(voucher.DiscountAmount, subtotal_áp_dụng)
Nếu null:
    discount = min(voucher.DiscountAmount, tổng đơn hàng)

finalAmount = subtotal + VAT(8%) - discount
```

### 5.3 Quản Lý Ca (Shift)

```
Trạng thái ca: Open → Closed
- Shift.Status = "Open"  | Opening > 0
- Shift.Status = "Closed"| Expected được điền

Khi chốt:
  chênh lệch = Expected - Opening
  → ghi Log, SignalR ShiftHub.Clients.All.SendAsync("ShiftUpdated")
```

### 5.4 Theo Dõi Nguyên Liệu

```
Khi nhân viên xuất kho:
  POST /ingredients/{id}/reduce { amount, unit, note }
  → Ingredient.Quantity -= amount
  → Ghi SystemActivityLog("INGREDIENT_USED")

Khi nhập kho:
  POST /imports
  → Import record
  → Ingredient.Quantity += quantity nhập
```

### 5.5 Thông Báo Realtime (SignalR)

```
Server: ShiftHub → /hubs/shifts
Client kết nối khi load CashierShiftReport.html
Sự kiện: "ShiftUpdated"  → UI reload bảng ca, KPI
```

---

## 6. Bảo Mật

| Cơ chế | Chi tiết |
|--------|---------|
| **JWT HttpOnly Cookie** | Token không bị đọc bởi JS, tránh XSS |
| **BCrypt** | Hash mật khẩu với salt cost factor 11 |
| **Custom Authorize** | Kiểm tra Role tại controller, trả 403 nếu sai quyền |
| **CORS** | Chỉ cho phép origin `http://localhost:4000` |
| **sessionStorage** | Chỉ cache profile user cho session, tự xóa khi đóng tab |

---

## 7. API Nổi Bật (để demo)

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/users/authenticate` | POST | Đăng nhập, set cookie JWT |
| `/orders/create-and-checkout` | POST | Tạo + thanh toán 1 bước |
| `/orders/cashier-summary` | GET | Doanh thu ca hiện tại |
| `/orders/admin-overview` | GET | Tổng quan cho Dashboard |
| `/shifts/open` | POST | Mở ca |
| `/shifts/close` | POST | Chốt ca |
| `/vouchers` | GET/POST/PUT/DELETE | CRUD mã giảm giá |
| `/ingredients/{id}/reduce` | POST | Xuất kho nguyên liệu |
| `/systemactivitylogs` | GET | Xem log hệ thống (Admin) |
| `/systemconfigs` | GET/PUT | Cấu hình hệ thống (Admin) |

---

## 8. Cấu Trúc Frontend (UI/)

| File | Vai trò |
|------|---------|
| `Common.js` | Auth guard, toast notifications, confirm/prompt modal, normalizeRole |
| `RealtimeShiftSync.js` | Kết nối SignalR, render bảng ca, mở/chốt ca |
| `CashierInterface.js` | Giao diện bán hàng: menu, giỏ hàng, voucher, thanh toán |
| `AdminMenuManagement.js` | CRUD thực đơn + bulk delete |
| `StaffManagement.js` | CRUD nhân viên, phân quyền theo role |
| `SupplierManagement.js` | CRUD nhà cung cấp + bulk delete |
| `Inventory.js` | Quản lý nguyên liệu, nhập kho |
| `SystemLogs.js` | Xem log hệ thống với bộ lọc |
| `VoucherManagement.js` | CRUD mã giảm giá theo danh mục |
