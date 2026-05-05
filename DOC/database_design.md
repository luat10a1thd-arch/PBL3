# 🗄️ Thiết Kế Cơ Sở Dữ Liệu — Cafe 24/7

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    Users {
        int Id PK
        string FirstName
        string LastName
        string Username UK
        int Role "0=Manager 1=Admin 2=Staff"
        string PasswordHash
    }

    Shifts {
        int ShiftId PK
        int EmployeeId FK
        decimal Opening
        decimal Expected
        datetime ClosedAt "NULL = đang mở"
    }

    Tables {
        int TableId PK
        string Name
        string Status
    }

    Orders {
        int OrderId PK
        int TableId FK
        int EmployeeId FK
        decimal Total
        datetime CreatedAt
    }

    OrderDetails {
        int OrderDetailId PK
        int OrderId FK
        int ItemId FK
        int Quantity
        decimal TotalPrice
    }

    OrderToppings {
        int OrderToppingId PK
        int OrderDetailId FK
        int ToppingId FK
        int Quantity
        decimal Price
    }

    Payments {
        int PaymentId PK
        int OrderId FK
        string Method "cash / transfer / qr"
        decimal Price
        datetime PaidAt
    }

    Categories {
        int CategoryId PK
        string Name
        string Description
        string ImageUrl
    }

    Items {
        int ItemId PK
        int CategoryId FK
        string Name
        decimal BasePrice
        string ImageUrl
    }

    Toppings {
        int ToppingId PK
        string Name
        decimal Price
    }

    Ingredients {
        int IngredientId PK
        string Name
        string UoM "Kg, Lít, Lon, Hộp..."
        decimal StockQty
    }

    ItemIngredients {
        int MappingId PK
        int ItemId FK
        int IngredientId FK
        decimal Quantity "Định mức / 1 phần"
    }

    Suppliers {
        int SupplierId PK
        string Name
        string ContactInfo
        string Address
    }

    Imports {
        int ImportId PK
        int SupplierId FK
        int IngredientId FK
        datetime ImportDate
        decimal Quantity
        decimal UnitPrice
        decimal TotalCost
    }

    Vouchers {
        int VoucherId PK
        string Code UK
        decimal DiscountAmount
        datetime ExpiryDate
        int ApplicableCategoryId FK "NULL = toàn bộ"
    }

    Expenses {
        int ExpenseId PK
        string Description
        decimal Amount
        datetime Date
    }

    SystemConfigs {
        int Id PK
        string Key UK
        string Value
        string Description
    }

    SystemActivityLogs {
        int Id PK
        int ActorUserId FK
        string ActorDisplayName
        string ActionType
        string Severity
        string Description
        string TargetAudience
        string MetadataJson
        datetime CreatedAt
    }

    Customers {
        int CustomerId PK
        string Name
        string Phone
    }

    CustomerVouchers {
        int Id PK
        int CustomerId FK
        int VoucherId FK
        bool IsUsed
    }

    Users ||--o{ Shifts : "quản lý"
    Users ||--o{ Orders : "tạo đơn"
    Tables ||--o{ Orders : "thuộc bàn"
    Orders ||--o{ OrderDetails : "chứa món"
    Orders ||--o| Payments : "thanh toán bởi"
    OrderDetails ||--o{ OrderToppings : "có topping"
    Items ||--o{ OrderDetails : "được gọi"
    Toppings ||--o{ OrderToppings : "được thêm"
    Categories ||--o{ Items : "gồm các món"
    Items ||--o{ ItemIngredients : "cần nguyên liệu"
    Ingredients ||--o{ ItemIngredients : "dùng trong"
    Suppliers ||--o{ Imports : "cung cấp"
    Ingredients ||--o{ Imports : "được nhập"
    Vouchers }o--o| Categories : "áp dụng cho"
    Customers ||--o{ CustomerVouchers : "sở hữu"
    Vouchers ||--o{ CustomerVouchers : "phát cho"
    Users ||--o{ SystemActivityLogs : "thực hiện"
```

---

## 2. Danh Sách Bảng Dữ Liệu

| # | Bảng | Mô tả | Số cột |
|---|------|-------|--------|
| 1 | `Users` | Tài khoản người dùng (Manager, Staff) | 6 |
| 2 | `Shifts` | Ca làm việc | 5 |
| 3 | `Tables` | Bàn trong quán | 3 |
| 4 | `Orders` | Đơn hàng | 5 |
| 5 | `OrderDetails` | Chi tiết đơn (dòng món) | 5 |
| 6 | `OrderToppings` | Topping theo dòng đơn | 5 |
| 7 | `Payments` | Thanh toán | 5 |
| 8 | `Categories` | Danh mục thực đơn | 4 |
| 9 | `Items` | Món ăn / đồ uống | 5 |
| 10 | `Toppings` | Topping | 3 |
| 11 | `Ingredients` | Nguyên liệu kho | 4 |
| 12 | `ItemIngredients` | Định mức nguyên liệu/món | 4 |
| 13 | `Suppliers` | Nhà cung cấp | 4 |
| 14 | `Imports` | Phiếu nhập kho | 7 |
| 15 | `Vouchers` | Mã giảm giá | 5 |
| 16 | `Customers` | Khách hàng | 3 |
| 17 | `CustomerVouchers` | Voucher phát cho khách | 4 |
| 18 | `Expenses` | Chi phí vận hành | 4 |
| 19 | `SystemConfigs` | Cấu hình hệ thống | 4 |
| 20 | `SystemActivityLogs` | Nhật ký hoạt động | 9 |
| 21 | `Employees` | Nhân viên (mở rộng) | — |

**Tổng: 21 bảng**

---

## 3. Mô Tả Chi Tiết Các Quan Hệ

### 3.1. Quan hệ One-to-Many (1:N)

| Bảng cha | Bảng con | Mô tả |
|----------|----------|-------|
| `Users` | `Shifts` | 1 nhân viên có nhiều ca |
| `Users` | `Orders` | 1 nhân viên tạo nhiều đơn |
| `Tables` | `Orders` | 1 bàn có nhiều đơn (theo thời gian) |
| `Orders` | `OrderDetails` | 1 đơn có nhiều dòng chi tiết |
| `OrderDetails` | `OrderToppings` | 1 dòng có nhiều topping |
| `Categories` | `Items` | 1 danh mục có nhiều món |
| `Suppliers` | `Imports` | 1 NCC cung cấp nhiều lần |
| `Ingredients` | `Imports` | 1 nguyên liệu được nhập nhiều lần |

### 3.2. Quan hệ Many-to-Many (M:N)

| Bảng A | Bảng trung gian | Bảng B | Mô tả |
|--------|-----------------|--------|-------|
| `Items` | `ItemIngredients` | `Ingredients` | Định mức nguyên liệu |
| `Customers` | `CustomerVouchers` | `Vouchers` | Voucher đã phát |

### 3.3. Quan hệ One-to-One (1:1)

| Bảng A | Bảng B | Mô tả |
|--------|--------|-------|
| `Orders` | `Payments` | 1 đơn → tối đa 1 lần thanh toán |

---

## 4. Kiểu Dữ Liệu Đặc Biệt

| Kiểu | Sử dụng | Lý do |
|------|---------|-------|
| `decimal(18,2)` | Tất cả cột tiền tệ (`Price`, `Total`, `Opening`, `Expected`, `StockQty`) | Tránh lỗi floating-point với tiền VND |
| `DateTime?` (nullable) | `Shift.ClosedAt` | `NULL` = ca đang mở, có giá trị = đã chốt |
| `int?` (nullable) | `Voucher.ApplicableCategoryId` | `NULL` = áp dụng toàn bộ menu |
| `nvarchar` | Tất cả chuỗi | Hỗ trợ Unicode tiếng Việt |
