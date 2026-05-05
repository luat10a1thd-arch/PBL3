# ❓ Câu Hỏi Bảo Vệ PBL3 — Cafe 24/7

Tài liệu này tổng hợp các câu hỏi thường gặp khi bảo vệ đồ án, kèm gợi ý trả lời dựa trên source code thực tế.

---

## 🏗️ Phần 1: Kiến Trúc & Công Nghệ

### Q1: Tại sao chọn ASP.NET Core Web API thay vì MVC truyền thống?
> **Trả lời**: Sử dụng Web API (backend) + Vanilla JS (frontend) giúp tách biệt hoàn toàn presentation và business logic. Frontend gọi API qua HTTP, nhận JSON thuần túy — cho phép tái sử dụng API cho mobile app trong tương lai mà không cần viết lại backend. Kiến trúc này cũng phù hợp với mô hình SPA (Single Page Application), giúp trải nghiệm người dùng mượt mà hơn so với server-side rendering.

### Q2: Tại sao không dùng React/Angular/Vue mà dùng Vanilla JS?
> **Trả lời**: PBL3 yêu cầu hiểu sâu về JavaScript thuần. Vanilla JS giúp team nắm vững DOM manipulation, event handling, async/await mà không bị framework trừu tượng hóa. Ứng dụng cũng nhẹ hơn (không cần build step, bundle, node_modules). Frontend chỉ gồm HTML + CSS + JS thuần, được serve trực tiếp từ Kestrel.

### Q3: Giải thích kiến trúc N-Tier trong dự án?
> **Trả lời**:
> - **Presentation Layer**: `Controllers/` (nhận HTTP request) + `UI/` (giao diện)
> - **Business Logic Layer**: `Services/` (17 service classes xử lý nghiệp vụ)
> - **Data Access Layer**: `Helpers/DataContext.cs` + `Entities/` (21 entity classes ánh xạ bảng DB)
>
> Mỗi tầng chỉ giao tiếp với tầng kề dưới, không bao giờ Controller truy cập trực tiếp DbContext mà phải thông qua Service.

### Q4: Dependency Injection được áp dụng như thế nào?
> **Trả lời**: Tất cả Service đều có Interface (`IOrderService`, `ICategoryService`...) được đăng ký vào IoC Container trong `Program.cs` bằng `builder.Services.AddScoped<IService, ServiceImpl>()`. Controller nhận service qua constructor injection. Điều này cho phép mock service khi unit test và dễ dàng thay thế implementation.

---

## 🔐 Phần 2: Bảo Mật & Phân Quyền

### Q5: JWT Authentication hoạt động như thế nào trong hệ thống?
> **Trả lời**:
> 1. User gọi `POST /Users/authenticate` với username + password
> 2. Server verify password hash (BCrypt) → nếu đúng, `JwtUtils.GenerateToken()` tạo JWT chứa `userId` trong payload
> 3. Token trả về client, client lưu vào `localStorage`
> 4. Mỗi request tiếp theo, client gửi token trong header `Authorization: Bearer <token>`
> 5. `JwtMiddleware` parse token → gán `HttpContext.Items["User"]` → Controller truy cập được user hiện tại

### Q6: Phân quyền Role-based hoạt động ra sao?
> **Trả lời**: `AuthorizeAttribute` kiểm tra `User.Role` trước khi cho phép truy cập endpoint:
> - `[Authorize]` — yêu cầu đăng nhập (bất kỳ role)
> - `[Authorize(Role.Manager)]` — chỉ Manager được truy cập
> - `[Authorize(Role.Staff, Role.Manager)]` — Staff hoặc Manager
>
> Frontend cũng có guard: `ensureAuthByRole(["Staff", "Manager"])` kiểm tra token + role trước khi render trang.

### Q7: Password được lưu trữ như thế nào?
> **Trả lời**: Password không bao giờ lưu dạng plaintext. Sử dụng `BCrypt.Net` để hash:
> - Khi tạo user: `BCrypt.HashPassword(password)` → lưu hash vào DB
> - Khi đăng nhập: `BCrypt.Verify(inputPassword, storedHash)` → so sánh
>
> BCrypt tự động salt, chống rainbow table attack.

---

## 📦 Phần 3: Cơ Sở Dữ Liệu

### Q8: Tại sao chọn Code First thay vì Database First?
> **Trả lời**: Code First cho phép định nghĩa schema bằng C# class (Entity), EF Core tự tạo migration và cập nhật DB. Ưu điểm:
> - Version control schema cùng source code
> - Refactor dễ dàng (rename property → auto migration)
> - Team development: mỗi người tạo migration riêng, merge khi cần

### Q9: Giải thích quan hệ giữa Order, OrderDetail và Payment?
> **Trả lời**:
> - `Order` (1) → `OrderDetail` (nhiều): Một đơn hàng có nhiều dòng chi tiết, mỗi dòng là 1 món × số lượng
> - `Order` (1) → `Payment` (0..1): Đơn chưa thanh toán không có Payment, đã thanh toán có đúng 1 Payment
> - `OrderDetail` (1) → `OrderTopping` (nhiều): Mỗi dòng chi tiết có thể thêm nhiều topping

### Q10: Bảng ItemIngredient có vai trò gì?
> **Trả lời**: Đây là bảng trung gian (junction table) thực hiện quan hệ **Many-to-Many** giữa `Item` và `Ingredient`. Mỗi record lưu **định mức** (`Quantity`) — tức cần bao nhiêu gram/ml nguyên liệu X để pha 1 phần món Y. Khi thanh toán, hệ thống dùng bảng này để tự động trừ kho.

### Q11: Giải thích bảng SystemConfig dùng để làm gì?
> **Trả lời**: Bảng key-value lưu cấu hình runtime (timezone, tên quán, thông tin liên hệ...). Cho phép Manager thay đổi cài đặt mà không cần restart server hay sửa code. Service `SystemConfigService` cung cấp helper `GetNow()` để lấy thời gian theo timezone đã cấu hình.

---

## ⚡ Phần 4: Tính Năng Realtime (SignalR)

### Q12: SignalR được dùng ở đâu trong hệ thống?
> **Trả lời**: Dùng để đồng bộ trạng thái ca làm việc (Shift) giữa tất cả trạm cashier. Khi 1 nhân viên mở ca hoặc chốt ca:
> 1. Backend gọi `hub.Clients.All.SendAsync("ShiftUpdated")`
> 2. Tất cả trình duyệt đang mở `/cashier/shift` nhận event
> 3. Frontend tự động re-fetch dữ liệu và re-render bảng
>
> Điều này đảm bảo 2 nhân viên không vô tình mở ca trùng, và Manager luôn thấy trạng thái ca mới nhất.

### Q13: Nếu mất kết nối SignalR thì sao?
> **Trả lời**: `HubConnectionBuilder` được cấu hình `.withAutomaticReconnect()` — khi mất kết nối, client sẽ tự retry với backoff. Sau khi reconnect thành công, client gọi lại `loadInitialShiftData()` để đồng bộ lại toàn bộ data.

---

## 🧮 Phần 5: Thuật Toán & Nghiệp Vụ

### Q14: Thuật toán trừ kho tự động hoạt động thế nào?
> **Trả lời**:
> ```
> Khi Checkout(orderId):
>   1. Lấy tất cả OrderDetail của Order
>   2. Với mỗi OrderDetail (ItemId, Quantity):
>      a. Truy xuất ItemIngredient.Where(ItemId == detail.ItemId)
>      b. Với mỗi nguyên liệu:
>         deduct = detail.Quantity × itemIngredient.Quantity
>         ingredient.StockQty -= deduct
>   3. SaveChanges() → atomic update
> ```
> Toàn bộ xử lý trong 1 transaction — nếu bất kỳ bước nào lỗi, tất cả rollback.

### Q15: Làm sao tính doanh thu theo buổi?
> **Trả lời**: Frontend nhóm các ca đã chốt theo giờ mở ca (`shift.openedAt`):
> - **Buổi sáng**: 06:00 – 12:00
> - **Buổi chiều**: 12:00 – 17:00
> - **Buổi tối**: 17:00 – 23:00
>
> Doanh thu = tổng `shift.expected` của các ca đã chốt (`ClosedAt != null`). Tính toán hoàn toàn client-side, không cần API mới.

### Q16: VAT được tính như thế nào?
> **Trả lời**: `VAT = (Subtotal - DiscountAmount) × 8%`. Hệ số 8% được hard-code trong frontend (`CreateAndCheckout` request). `FinalAmount = Subtotal + VAT - Discount`. Backend nhận `FinalAmount` cuối cùng và lưu vào `Payment.Price`.

---

## 🎨 Phần 6: Giao Diện & UX

### Q17: Giao diện cashier và admin khác nhau thế nào?
> **Trả lời**:
> - **Cashier** (`/app/cashier`): Layout full-screen, tối ưu cho thao tác nhanh. Header top-bar cố định, không có sidebar. Tập trung vào bán hàng + chốt ca.
> - **Admin** (`/app/admin`): Dashboard với sidebar navigation, KPI cards, charts, data tables. Tập trung vào quản lý tổng quan.
>
> Hai layout hoàn toàn riêng biệt nhưng chia sẻ chung design system (CSS variables, dash-table, dash-card...).

### Q18: Responsive design được xử lý như thế nào?
> **Trả lời**: Sử dụng CSS Media Queries:
> - `> 1024px`: Full desktop layout
> - `768px – 1024px`: Sidebar thu gọn, KPI grid 2 cột
> - `< 768px`: Sidebar ẩn, KPI grid 1 cột, table scroll ngang
>
> Table dùng `table-layout: fixed` + `min-width` để đảm bảo cột không bị squish, card parent scroll horizontal.

---

## 🔄 Phần 7: Design Patterns

### Q19: Kể tên các Design Pattern áp dụng trong dự án?
> **Trả lời**:
> 1. **Dependency Injection**: IoC Container của .NET 8, giảm coupling
> 2. **Repository/Service Pattern**: Tách data access và business logic
> 3. **Observer Pattern**: SignalR — server broadcast event, clients subscribe
> 4. **Factory/Mapper Pattern**: Frontend functions `normalizeItemRecord()`, `resolveItemImage()` chuẩn hóa data từ nhiều API
> 5. **Middleware Pipeline**: JWT auth + error handler chain trong ASP.NET Core
> 6. **DTO Pattern**: Request/Response objects che giấu cấu trúc DB thực tế

### Q20: Middleware pipeline hoạt động thế nào?
> **Trả lời**:
> ```
> Request → ErrorHandlerMiddleware → JwtMiddleware → [Authorize] → Controller → Service → DB
>                                                                                        ↓
> Response ← ErrorHandlerMiddleware ← JSON Response ←──────────────────────────────────────
> ```
> - `ErrorHandlerMiddleware`: Bắt exception, trả về JSON lỗi chuẩn hóa
> - `JwtMiddleware`: Parse token, gán user vào HttpContext
> - `AuthorizeAttribute`: Kiểm tra role, trả 401/403 nếu không đủ quyền
