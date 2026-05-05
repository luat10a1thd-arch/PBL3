# 📐 Sơ Đồ UML - Hệ Thống Cafe 24/7

## 1. Use Case Diagram

```mermaid
graph TB
    subgraph System["☕ Hệ Thống Cafe 24/7"]

        UC1["Đăng nhập / Đăng xuất"]
        UC2["Quản lý thực đơn"]
        UC3["Tạo & thanh toán đơn hàng"]
        UC4["Mở / Chốt ca làm việc"]
        UC5["Quản lý kho nguyên liệu"]
        UC6["Nhập hàng từ NCC"]
        UC7["Quản lý nhân viên"]
        UC8["Quản lý nhà cung cấp"]
        UC9["Quản lý mã giảm giá"]
        UC10["Xem báo cáo doanh thu ca"]
        UC11["Xem báo cáo tháng"]
        UC12["Xuất kho nguyên liệu"]
        UC13["Cài đặt hệ thống"]
        UC14["Xem nhật ký hoạt động"]
    end

    Manager["👤 Manager"]
    Staff["👤 Staff"]

    Manager --> UC1
    Manager --> UC2
    Manager --> UC3
    Manager --> UC4
    Manager --> UC5
    Manager --> UC6
    Manager --> UC7
    Manager --> UC8
    Manager --> UC9
    Manager --> UC10
    Manager --> UC11
    Manager --> UC13
    Manager --> UC14

    Staff --> UC1
    Staff --> UC3
    Staff --> UC4
    Staff --> UC10
    Staff --> UC12

    style System fill:#1a0906,stroke:#c56517,color:#fff
    style Manager fill:#c56517,stroke:#fff,color:#fff
    style Staff fill:#3b82f6,stroke:#fff,color:#fff
```

---

## 2. Class Diagram (Entity Relationship)

```mermaid
classDiagram
    class User {
        +int Id
        +string FirstName
        +string LastName
        +string Username
        +Role Role
        +string PasswordHash
    }

    class Shift {
        +int ShiftId
        +int EmployeeId
        +decimal Opening
        +decimal Expected
        +DateTime? ClosedAt
    }

    class Order {
        +int OrderId
        +int TableId
        +int EmployeeId
        +decimal Total
        +DateTime CreatedAt
    }

    class OrderDetail {
        +int OrderDetailId
        +int OrderId
        +int ItemId
        +int Quantity
        +decimal TotalPrice
    }

    class OrderTopping {
        +int OrderToppingId
        +int OrderDetailId
        +int ToppingId
        +int Quantity
        +decimal Price
    }

    class Payment {
        +int PaymentId
        +int OrderId
        +string Method
        +decimal Price
        +DateTime PaidAt
    }

    class Category {
        +int CategoryId
        +string Name
        +string Description
        +string ImageUrl
    }

    class Item {
        +int ItemId
        +int CategoryId
        +string Name
        +decimal BasePrice
        +string ImageUrl
    }

    class Topping {
        +int ToppingId
        +string Name
        +decimal Price
    }

    class Ingredient {
        +int IngredientId
        +string Name
        +string UoM
        +decimal StockQty
    }

    class ItemIngredient {
        +int MappingId
        +int ItemId
        +int IngredientId
        +decimal Quantity
    }

    class Supplier {
        +int SupplierId
        +string Name
        +string ContactInfo
        +string Address
    }

    class Import {
        +int ImportId
        +int SupplierId
        +int? IngredientId
        +DateTime ImportDate
        +decimal Quantity
        +decimal UnitPrice
        +decimal TotalCost
    }

    class Voucher {
        +int VoucherId
        +string Code
        +decimal DiscountAmount
        +DateTime ExpiryDate
        +int? ApplicableCategoryId
    }

    class Table {
        +int TableId
        +string Name
        +string Status
    }

    User "1" --> "*" Shift : manages
    User "1" --> "*" Order : creates
    Order "1" --> "*" OrderDetail : contains
    OrderDetail "1" --> "*" OrderTopping : has
    Order "1" --> "0..1" Payment : paid by
    Category "1" --> "*" Item : groups
    Item "1" --> "*" ItemIngredient : uses
    Ingredient "1" --> "*" ItemIngredient : used in
    OrderDetail "*" --> "1" Item : references
    OrderTopping "*" --> "1" Topping : references
    Supplier "1" --> "*" Import : supplies
    Ingredient "1" --> "*" Import : stocked by
    Voucher "*" --> "0..1" Category : applies to
    Order "*" --> "1" Table : placed at
```

---

## 3. Sequence Diagram — Tạo Đơn & Thanh Toán

```mermaid
sequenceDiagram
    actor NV as 👤 Nhân viên
    participant UI as Frontend
    participant API as OrdersController
    participant SVC as OrderService
    participant DB as SQL Server

    NV->>UI: Chọn món + số lượng
    UI->>API: POST /Orders/create-and-checkout
    API->>SVC: CreateOrder(tableId, userId)
    SVC->>DB: INSERT INTO Orders
    DB-->>SVC: Order created

    loop Mỗi món trong đơn
        SVC->>DB: INSERT INTO OrderDetails
    end

    API->>SVC: Checkout(orderId, paymentMethod, finalAmount)
    SVC->>DB: INSERT INTO Payments
    SVC->>DB: UPDATE Ingredient.StockQty (trừ kho)
    DB-->>SVC: OK

    SVC-->>API: Success
    API-->>UI: 200 OK + orderId
    UI-->>NV: Hiển thị "Thanh toán thành công"
```

---

## 4. Sequence Diagram — Mở Ca & Chốt Ca

```mermaid
sequenceDiagram
    actor NV as 👤 Nhân viên
    participant UI as Frontend
    participant API as ShiftsController
    participant SVC as ShiftService
    participant DB as SQL Server
    participant HUB as SignalR Hub

    Note over NV,HUB: === MỞ CA ===

    NV->>UI: Bấm "Mở Ca" + nhập Opening
    UI->>API: POST /Shifts/open {openingAmount}
    API->>SVC: OpenShift(userId, openingAmount)
    SVC->>DB: INSERT INTO Shifts (Opening, EmployeeId)
    DB-->>SVC: Shift created
    SVC-->>API: ShiftId
    API->>HUB: Broadcast "ShiftUpdated"
    HUB-->>UI: Realtime update tất cả clients
    UI-->>NV: "Mở ca thành công"

    Note over NV,HUB: === CHỐT CA ===

    NV->>UI: Bấm "Chốt Ca" + nhập Expected
    UI->>API: POST /Shifts/close {shiftId, expectedAmount}
    API->>SVC: CloseShift(shiftId, expectedAmount)
    SVC->>DB: UPDATE Shifts SET Expected, ClosedAt
    DB-->>SVC: OK
    API->>HUB: Broadcast "ShiftUpdated"
    HUB-->>UI: Realtime update
    UI-->>NV: "Chốt ca thành công"
```

---

## 5. Sequence Diagram — Nhập Kho

```mermaid
sequenceDiagram
    actor MGR as 👤 Manager
    participant UI as Frontend
    participant API as ImportsController
    participant SVC as ImportService
    participant DB as SQL Server

    MGR->>UI: Chọn NL + NCC + SL + Đơn giá
    UI->>API: POST /Imports/stock-in
    API->>SVC: StockIn(request)
    SVC->>DB: INSERT INTO Imports
    SVC->>DB: UPDATE Ingredients SET StockQty += Quantity
    DB-->>SVC: OK
    SVC-->>API: Import record
    API-->>UI: 200 OK
    UI-->>MGR: "Nhập hàng thành công"
```

---

## 6. Component Diagram

```mermaid
graph TB
    subgraph Frontend["🖥️ Frontend - Vanilla JS"]
        LOGIN["LoginPage.html"]
        CASHIER["CashierInterface.html"]
        SHIFT["CashierShiftReport.html"]
        DASH["AdminDashboard.html"]
        MENU["AdminMenuManagement.html"]
        INV["Inventory.html"]
        STAFF["StaffManagement.html"]
        REPORT["MonthlyReport.html"]
        COMMON["Common.js<br/>(Auth, Toast, Utils)"]
    end

    subgraph Backend["⚙️ Backend - ASP.NET Core"]
        CTRL["Controllers<br/>(16 endpoints)"]
        AUTH_MW["JWT Middleware"]
        SERVICES["Services Layer<br/>(17 services)"]
        EF["Entity Framework Core"]
    end

    subgraph External["☁️ External Services"]
        CLOUD["Cloudinary<br/>(Image CDN)"]
        SIGNAL["SignalR Hub<br/>(WebSocket)"]
    end

    subgraph Data["💾 Data"]
        SQLDB["SQL Server<br/>(21 tables)"]
    end

    Frontend --> AUTH_MW
    AUTH_MW --> CTRL
    CTRL --> SERVICES
    SERVICES --> EF
    EF --> SQLDB
    CTRL --> CLOUD
    CTRL --> SIGNAL
    SIGNAL -.-> Frontend

    style Frontend fill:#1a0906,stroke:#c56517,color:#fff
    style Backend fill:#1a0906,stroke:#3b82f6,color:#fff
    style External fill:#1a0906,stroke:#22c55e,color:#fff
    style Data fill:#1a0906,stroke:#a855f7,color:#fff
```

---

## 7. Deployment Diagram

```mermaid
graph LR
    subgraph Client["🌐 Client"]
        BROWSER["Web Browser<br/>(Chrome/Firefox)"]
    end

    subgraph Server["🖥️ Server"]
        KESTREL["Kestrel Web Server<br/>(ASP.NET Core)"]
        STATIC["Static Files<br/>(/app/ → UI/)"]
        API_SVC["API Endpoints<br/>(REST JSON)"]
        WS["SignalR Hub<br/>(WebSocket)"]
    end

    subgraph DB["💾 Database"]
        SQL["SQL Server<br/>LocalDB / Azure"]
    end

    subgraph CDN["☁️ CDN"]
        IMG["Cloudinary<br/>Image Storage"]
    end

    BROWSER -->|"HTTPS"| KESTREL
    KESTREL --> STATIC
    KESTREL --> API_SVC
    KESTREL --> WS
    API_SVC --> SQL
    API_SVC --> IMG
    WS -.->|"WebSocket"| BROWSER

    style Client fill:#1a0906,stroke:#c56517,color:#fff
    style Server fill:#1a0906,stroke:#3b82f6,color:#fff
    style DB fill:#1a0906,stroke:#a855f7,color:#fff
    style CDN fill:#1a0906,stroke:#22c55e,color:#fff
```
