Employees
Ý nghĩa: Lưu thông tin nhân viên của quán.
Chức năng/Vai trò: Quản lý nhân sự, tạo đơn hàng, ghi nhận chi phí.
Mối quan hệ: 1-n Shifts, 1-n Orders, 1-n Expenses
Shifts
Ý nghĩa: Lưu ca làm việc của nhân viên.
Chức năng/Vai trò: Theo dõi chấm công và ca làm.
Mối quan hệ: n-1 Employees, 1-n Orders
Customers
Ý nghĩa: Thông tin khách hàng.
Chức năng/Vai trò: Quản lý khách hàng thân thiết, tích điểm.
Mối quan hệ: 1-n Orders, 1-n CustomerVouchers
Vouchers
Ý nghĩa: Mã giảm giá của quán.
Chức năng/Vai trò: Áp dụng giảm giá cho đơn hàng.
Mối quan hệ: n-n Customers thông qua CustomerVouchers, 1-n Orders
CustomerVouchers
Ý nghĩa: Bảng liên kết khách hàng và voucher.
Chức năng/Vai trò: Xác định khách hàng sở hữu voucher nào.
Mối quan hệ: n-1 Customers, n-1 Vouchers
Tables
Ý nghĩa: Danh sách bàn trong quán.
Chức năng/Vai trò: Quản lý trạng thái bàn và đơn hàng theo bàn.
Mối quan hệ: 1-n Orders
Categories
Ý nghĩa: Danh mục đồ uống.
Chức năng/Vai trò: Phân loại menu.
Mối quan hệ: 1-n Items
Items
Ý nghĩa: Danh sách món bán.
Chức năng/Vai trò: Cho phép khách đặt món.
Mối quan hệ: n-1 Categories, 1-n OrderDetails, 1-n ItemIngredients
Toppings
Ý nghĩa: Danh sách topping.
Chức năng/Vai trò: Thêm topping vào đồ uống.
Mối quan hệ: 1-n OrderToppings
Orders
Ý nghĩa: Thông tin đơn hàng.
Chức năng/Vai trò: Quản lý order của khách.
Mối quan hệ: n-1 Customers, Employees, Tables, Shifts; 1-n OrderDetails; 1-1 Payments
OrderDetails
Ý nghĩa: Chi tiết món trong đơn.
Chức năng/Vai trò: Lưu số lượng, size và giá.
Mối quan hệ: n-1 Orders, n-1 Items, 1-n OrderToppings
OrderToppings
Ý nghĩa: Topping của từng món.
Chức năng/Vai trò: Lưu topping được chọn.
Mối quan hệ: n-1 OrderDetails, n-1 Toppings
Payments
Ý nghĩa: Thông tin thanh toán.
Chức năng/Vai trò: Ghi nhận tiền khách trả.
Mối quan hệ: 1-1 Orders
Ingredients
Ý nghĩa: Danh sách nguyên liệu.
Chức năng/Vai trò: Quản lý tồn kho và hạn dùng.
Mối quan hệ: 1-n Imports, 1-n ItemIngredients
ItemIngredients
Ý nghĩa: Công thức pha chế.
Chức năng/Vai trò: Xác định mỗi món cần bao nhiêu nguyên liệu.
Mối quan hệ: n-1 Items, n-1 Ingredients
Suppliers
Ý nghĩa: Nhà cung cấp nguyên liệu.
Chức năng/Vai trò: Quản lý nguồn nhập kho.
Mối quan hệ: 1-n Imports
Imports
Ý nghĩa: Phiếu nhập kho.
Chức năng/Vai trò: Theo dõi chi phí mua nguyên liệu.
Mối quan hệ: n-1 Suppliers, n-1 Ingredients
Expenses
Ý nghĩa: Chi phí vận hành.
Chức năng/Vai trò: Theo dõi chi phí điện, nước, marketing…
Mối quan hệ: n-1 Employees
