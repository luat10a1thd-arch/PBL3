# 📋 Phân Tích Nghiệp Vụ - Hệ Thống Quản Lý Quán Cafe 24/7

## 1. Giới thiệu dự án

### 1.1. Bối cảnh & Vấn đề
Quán cafe truyền thống gặp nhiều khó khăn trong vận hành: ghi đơn thủ công dễ sai sót, theo dõi tồn kho không chính xác, báo cáo doanh thu cuối ngày mất thời gian, quản lý ca làm việc nhân viên thiếu minh bạch. Hệ thống **Cafe 24/7** được xây dựng nhằm số hóa toàn bộ quy trình vận hành quán cafe.

### 1.2. Phạm vi hệ thống
| Phạm vi | Mô tả |
|---------|-------|
| **Trong phạm vi** | Quản lý đơn hàng, thực đơn, kho nguyên liệu, nhân viên, ca làm việc, nhà cung cấp, mã giảm giá, báo cáo doanh thu |
| **Ngoài phạm vi** | Đặt hàng online, tích hợp giao hàng, CRM khách hàng nâng cao, kế toán thuế |

### 1.3. Đối tượng sử dụng (Actors)

```mermaid
graph LR
    A["👤 Manager<br/>(Quản lý)"] --- SYS["☕ Cafe 24/7<br/>System"]
    B["👤 Staff<br/>(Nhân viên)"] --- SYS
    
    style SYS fill:#c56517,stroke:#fff,color:#fff
    style A fill:#1a0906,stroke:#c56517,color:#fff
    style B fill:#1a0906,stroke:#c56517,color:#fff
```

| Actor | Vai trò | Quyền hạn chính |
|-------|---------|-----------------|
| **Manager** | Quản lý quán | Toàn quyền: CRUD thực đơn, kho hàng, nhân viên, nhà cung cấp, voucher, xem báo cáo tháng, cài đặt hệ thống |
| **Staff** | Nhân viên thu ngân | Bán hàng, mở/chốt ca, xuất kho nguyên liệu, xem báo cáo ca cá nhân |

---

## 2. Các Module Nghiệp Vụ Chính

### 2.1. Module Quản Lý Đơn Hàng (Order Management)

**Mô tả**: Cho phép nhân viên tạo đơn, thêm món, áp dụng mã giảm giá và thanh toán.

**Quy trình nghiệp vụ**:

```mermaid
flowchart TD
    A["Nhân viên chọn bàn"] --> B["Tạo đơn hàng mới"]
    B --> C["Chọn món từ thực đơn"]
    C --> D{"Thêm topping?"}
    D -- Có --> E["Chọn topping & số lượng"]
    D -- Không --> F["Xác nhận giỏ hàng"]
    E --> F
    F --> G{"Áp dụng voucher?"}
    G -- Có --> H["Nhập mã voucher"]
    H --> I{"Voucher hợp lệ?"}
    I -- Không --> H
    I -- Có --> J["Tính tổng tiền"]
    G -- Không --> J
    J --> K["Chọn PTTT<br/>(Tiền mặt / Chuyển khoản)"]
    K --> L["Xác nhận thanh toán"]
    L --> M["Trừ kho nguyên liệu tự động"]
    M --> N["Ghi nhận Payment"]

    style A fill:#1a0906,stroke:#c56517,color:#fff
    style N fill:#1a0906,stroke:#22c55e,color:#fff
```

**Công thức tính tiền**:
- `Subtotal = Σ(Item.BasePrice × Quantity) + Σ(Topping.Price × Quantity)`
- `Discount = Voucher.DiscountAmount` (nếu có)
- `VAT = (Subtotal - Discount) × 8%`
- `GrandTotal = Subtotal - Discount + VAT`

### 2.2. Module Quản Lý Ca Làm Việc (Shift Management)

**Mô tả**: Hệ thống ca làm việc cho phép nhân viên mở ca đầu ngày và chốt ca cuối ca, đảm bảo minh bạch doanh thu.

```mermaid
stateDiagram-v2
    [*] --> ChuaMoCa: Nhân viên đăng nhập
    ChuaMoCa --> DangMo: Mở Ca + nhập tiền mở ca
    DangMo --> DangMo: Bán hàng / Tạo đơn
    DangMo --> DaChot: Chốt Ca + nhập tiền thực tế
    DaChot --> [*]: Ca kết thúc
```

**Luồng xử lý**:
1. Nhân viên bấm **Mở Ca** → nhập số tiền quỹ mở ca (`Opening`)
2. Trong ca: nhân viên thực hiện bán hàng bình thường
3. Cuối ca: bấm **Chốt Ca** → nhập số tiền thực tế thu được (`Expected`)
4. Hệ thống so sánh: `Thực tế - Lý thuyết = Chênh lệch`
5. SignalR broadcast sự kiện → tất cả trạm cashier đều cập nhật

### 2.3. Module Quản Lý Kho Hàng (Inventory Management)

**Mô tả**: Quản lý nguyên liệu, nhập hàng từ nhà cung cấp, tự động trừ kho khi bán.

```mermaid
flowchart LR
    subgraph NHAP["📦 Nhập Kho"]
        A["Chọn nguyên liệu"] --> B["Chọn NCC"]
        B --> C["Nhập SL + Đơn giá"]
        C --> D["Tạo phiếu nhập"]
        D --> E["Cộng tồn kho"]
    end

    subgraph XUAT["📤 Xuất Kho tự động"]
        F["Đơn thanh toán"] --> G["Tra định mức<br/>ItemIngredient"]
        G --> H["Trừ kho theo công thức"]
    end

    E -.-> H

    style NHAP fill:#1a0906,stroke:#3b82f6,color:#fff
    style XUAT fill:#1a0906,stroke:#ef4444,color:#fff
```

**Công thức trừ kho**:
```
Với mỗi OrderDetail:
  Ingredients = ItemIngredient.Where(ItemId == detail.ItemId)
  Foreach ingredient:
    DeductQty = detail.Quantity × ingredient.Quantity
    ingredient.StockQty -= DeductQty
```

### 2.4. Module Quản Lý Thực Đơn (Menu Management)

| Chức năng | Mô tả |
|-----------|-------|
| CRUD Danh mục | Tạo/sửa/xóa danh mục (Cà phê, Trà, Bánh...) |
| CRUD Món | Tạo/sửa/xóa món với tên, giá, ảnh, danh mục |
| Quản lý Topping | Thêm topping (trân châu, thạch, kem...) |
| Upload ảnh | Async upload → Cloudinary → lưu URL |

### 2.5. Module Báo Cáo (Reporting)

| Loại báo cáo | Dữ liệu | Người xem |
|--------------|----------|-----------|
| Doanh thu ca | Tiền mặt, chuyển khoản, đơn hủy, tổng | Staff, Manager |
| Doanh thu theo buổi | Sáng/Chiều/Tối phân theo giờ mở ca | Staff, Manager |
| Doanh thu theo NV | Xếp hạng nhân viên theo doanh thu chốt ca | Staff, Manager |
| Báo cáo tháng | Doanh thu, chi phí nhập, lợi nhuận, trend | Manager |

### 2.6. Module Phân Quyền (Authorization)

```mermaid
flowchart TD
    L["Đăng nhập"] --> AUTH["JWT Authentication"]
    AUTH --> CHECK{"Kiểm tra Role?"}
    CHECK -- Manager --> MGR["Dashboard Admin + Toàn quyền"]
    CHECK -- Staff --> STF["Giao diện Cashier + Quyền hạn chế"]
    CHECK -- Sai --> ERR["Từ chối truy cập"]

    style AUTH fill:#c56517,stroke:#fff,color:#fff
    style MGR fill:#22c55e,stroke:#fff,color:#fff
    style STF fill:#3b82f6,stroke:#fff,color:#fff
    style ERR fill:#ef4444,stroke:#fff,color:#fff
```

### 2.7. Module Mã Giảm Giá (Voucher)

**Quy tắc nghiệp vụ**:
- Mỗi voucher có `Code`, `DiscountAmount`, `ExpiryDate`
- Có thể giới hạn theo danh mục (`ApplicableCategoryId`)
- Voucher hết hạn → không áp dụng được
- Mỗi đơn chỉ áp dụng 1 voucher

---

## 3. Ma Trận CRUD Theo Actor

| Thực thể | Manager | Staff |
|----------|---------|-------|
| User | CRUD | R (bản thân) |
| Category | CRUD | R |
| Item | CRUD | R |
| Topping | CRUD | R |
| Order | R (tất cả) | CR (của mình) |
| Payment | R | C |
| Shift | R (tất cả) | CR (của mình) |
| Ingredient | CRUD | R |
| Import | CRUD | — |
| Supplier | CRUD | — |
| Voucher | CRUD | R |
| SystemConfig | RU | — |
| SystemActivityLog | R | — |
| Expense | CRUD | — |

---

## 4. Yêu Cầu Phi Chức Năng

| Yêu cầu | Giải pháp |
|----------|-----------|
| **Bảo mật** | JWT authentication, password hash BCrypt, role-based authorization |
| **Hiệu năng** | Lazy loading EF Core, client-side caching, pagination |
| **Thời gian thực** | SignalR WebSocket cho đồng bộ ca làm việc |
| **Responsive** | CSS responsive design, hỗ trợ mobile/tablet |
| **Dữ liệu** | SQL Server, Code First migrations, decimal(18,2) cho tiền tệ |
