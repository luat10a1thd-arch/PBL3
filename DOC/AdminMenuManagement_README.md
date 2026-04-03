# Admin Menu Management - Hướng Dẫn Sử Dụng

## 🎯 Tổng Quan

Module quản lý thực đơn cho phép Admin/Owner quản lý toàn bộ menu của quán cafe bao gồm:
- **Danh mục món** (Categories): Cà phê, Trà, Bánh ngọt, v.v.
- **Món ăn/đồ uống** (Items): Các món có trong menu
- **Topping**: Các loại topping thêm cho món

## 📁 Files Đã Tạo

### Controllers
- `Controllers/CategoriesController.cs` - CRUD API cho categories
- `Controllers/ItemsController.cs` - CRUD API cho items
- `Controllers/ToppingsController.cs` - CRUD API cho toppings

### Services
- `Services/CategoryService.cs` - Business logic cho categories
- `Services/ItemService.cs` - Business logic cho items  
- `Services/ToppingService.cs` - Business logic cho toppings
- `Services/CashierService.cs` - Đã sửa lại cho đúng với entities hiện có

### Frontend
- `Back/AdminMenuManagement.js` - JavaScript xử lý UI và events
- `Back/AdminMenuManagement.css` - CSS cho modal và components
- `UI/AdminMenuManagement.html` - Đã cập nhật link JS/CSS

## 🔌 API Endpoints

### Categories API
```
GET    /categories         - Lấy tất cả danh mục
GET    /categories/{id}    - Lấy chi tiết 1 danh mục
POST   /categories         - Tạo danh mục mới (Admin/Owner)
PUT    /categories/{id}    - Cập nhật danh mục (Admin/Owner)
DELETE /categories/{id}    - Xóa danh mục (Admin/Owner)
```

### Items API
```
GET    /items                    - Lấy tất cả món
GET    /items/{id}               - Lấy chi tiết 1 món
GET    /items/category/{catId}   - Lấy món theo danh mục
POST   /items                    - Tạo món mới (Admin/Owner)
PUT    /items/{id}               - Cập nhật món (Admin/Owner)
DELETE /items/{id}               - Xóa món (Admin/Owner)
```

### Toppings API
```
GET    /toppings         - Lấy tất cả topping
GET    /toppings/{id}    - Lấy chi tiết 1 topping
POST   /toppings         - Tạo topping mới (Admin/Owner)
PUT    /toppings/{id}    - Cập nhật topping (Admin/Owner)
DELETE /toppings/{id}    - Xóa topping (Admin/Owner)
```

## 🎨 Tính Năng UI

### 1. Tab Switching
- **Món Ăn**: Xem và quản lý các món trong menu
- **Danh Mục**: Quản lý categories
- **Topping**: Quản lý các loại topping

### 2. Filter & Search
- Lọc món theo danh mục (dropdown)
- Tìm kiếm theo tên (search box)
- Real-time filtering

### 3. CRUD Operations
- **Thêm mới**: Click nút "Thêm Món Mới" → Form modal
- **Chỉnh sửa**: Click icon bút → Form modal với data
- **Xóa**: Click icon thùng rác → Confirm dialog

### 4. Validation
- Tên món/danh mục/topping bắt buộc
- Giá phải >= 0
- Không duplicate tên trong cùng danh mục
- Không xóa được category có món
- Không xóa được item/topping đã có trong order

## 🚀 Cách Sử Dụng

### 1. Khởi động server
```bash
dotnet run
```
Server sẽ chạy tại: `http://localhost:4000`

### 2. Đăng nhập
- Mở `UI/LoginPage.html`
- Đăng nhập với tài khoản Admin hoặc Owner

### 3. Truy cập Menu Management
- Từ Admin Dashboard → Click "Thực Đơn" trên sidebar
- Hoặc truy cập trực tiếp: `UI/AdminMenuManagement.html`

### 4. Quản lý Danh Mục
- Click tab "Danh Mục"
- Click "Thêm Món Mới" → Nhập tên và mô tả
- Sửa/xóa bằng icons bên phải mỗi row

### 5. Quản lý Món
- Click tab "Món Ăn"
- Click "Thêm Món Mới" → Nhập:
  - Tên món
  - Chọn danh mục
  - Giá bán
- Sửa/xóa bằng icons

### 6. Quản lý Topping
- Click tab "Topping"
- Click "Thêm Món Mới" → Nhập tên và giá
- Sửa/xóa bằng icons

## 🔐 Authorization

- **Xem dữ liệu**: Tất cả user đã đăng nhập
- **Thêm/Sửa/Xóa**: Chỉ Admin và Owner
- Token JWT tự động gửi kèm mọi request
- Auto redirect về login nếu token hết hạn

## 🎯 Business Rules

### Categories
- Tên danh mục không được trùng
- Không xóa được category đang có món

### Items
- Tên món không được trùng trong cùng danh mục
- Phải chọn danh mục hợp lệ
- Giá phải >= 0
- Không xóa được món đã có trong OrderDetail

### Toppings
- Tên topping không được trùng
- Giá phải >= 0
- Không xóa được topping đã có trong OrderTopping

## 📊 Data Flow

```
User Action → JavaScript Event Handler → 
API Request (with JWT) → Controller → 
Service (Business Logic + Validation) → 
DataContext (EF Core) → SQL Server → 
Response → Update UI
```

## 🐛 Troubleshooting

### Lỗi 401 Unauthorized
- Kiểm tra đã đăng nhập chưa
- Token có thể đã hết hạn → Đăng nhập lại

### Không thể xóa category/item/topping
- Kiểm tra có đang được sử dụng không
- Error message sẽ hiển thị lý do cụ thể

### Data không load
- Mở Console (F12) kiểm tra lỗi
- Kiểm tra server có đang chạy không
- Verify API URL đúng (localhost:4000)

## ✅ Đã Hoàn Thành

- ✅ 3 Controllers với full CRUD
- ✅ 3 Services với validation logic
- ✅ JavaScript xử lý UI events
- ✅ Modal forms cho Add/Edit
- ✅ Real-time search & filter
- ✅ Tab switching giữa 3 views
- ✅ Role-based authorization
- ✅ Error handling
- ✅ Responsive UI
- ✅ Vietnamese localization

## 🔜 Có Thể Mở Rộng

- Upload hình ảnh cho món
- Drag & drop để sắp xếp
- Bulk operations (xóa nhiều)
- Export/Import menu từ Excel
- Real-time updates với SignalR
- Rich text editor cho mô tả
- Stock management integration
- Recipe/ingredient mapping
