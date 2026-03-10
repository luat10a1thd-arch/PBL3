TRANG WEB QUẢN LÝ TÀI CHÍNH QUÁN COFFE 24/7

\*Danh sách sinh viên:

+Lê Văn Luật 102240203

+Trương Hữu Long 102240202

+Phạm Quang Khiêm 102240033

\*Các yêu cầu:

1.Yêu cầu chức năng

1.1.Phân quyền và đăng nhập hệ thống

-Hệ thống hỗ trợ 2 vai trò người dùng:

Quản lý (Admin)

Thu ngân (Cashier)

-Yêu cầu

+Người dùng phải đăng nhập bằng tài khoản và mật khẩu.

+Mỗi tài khoản chỉ được gán một vai trò

+Hệ thống kiểm soát quyền truy cập theo vai trò

+Người dùng không được truy cập các chức năng không thuộc quyền của mình

1.2.Chức năng của Quản lý (Admin)

Quản lý có toàn quyền sử dụng hệ thống bao gồm:

Quản lý đơn hàng

-Tạo hoá đơn (bán hàng)

-Huỷ hoá đơn trong trường hợp nhập sai hoặc khách huỷ

-Xem danh sách đơn hàng theo: ngày và ca

-Xem chi tiết từng hoá đơn

Quản lý menu

-Thêm, sửa, xoá món trong menu

-Cập nhật:Tên món, Giá bán, Chi phí

Quản lý kho

-Kiểm kho nguyên liệu

-Nhập hàng vào kho

-Xem lịch sử nhập hàng

Báo cáo

-Xem báo cáo ngày

+Doanh thu theo ca

+Tổng doanh thu

+Số đơn hàng

-Xem báo cáo tháng

+Doanh thu theo ngày

+Tổng doanh thu tháng

+Nhập hàng theo từng ngày

+Tổng chi phí và lương của nhân viên

+Lợi nhuận

1.3.Chức năng của Thu ngân (Cashier)

Thu ngân chỉ được thực hiện các nghiệp vụ bán hàng và xem báo cáo ca/ngày

Đơn hàng (Bán hàng)

-Tạo đơn hàng mới

-Thêm món từ menu vào đơn hàng

-In hoá đơn

Báo cáo

-Xem báo cáo ngày hiện tại

-Xem doanh thu theo ca làm việc của mình

1.4.Quy trình bán hàng và ca làm việc

-Hệ thống chia mỗi ngày làm 4 ca làm việc:

+Ca 1: từ 6h đến 12h

+Ca 2: từ 12h đến 17h

+Ca 3: từ 17h đến 22h

+Ca 4: từ 22h đến 6h ngày hôm sau

-Yêu cầu:

+Khi Thu ngân đăng nhập, hệ thống tự động xác nhận ca làm việc hiện tại

+Sau khi kết thúc ca 4, hệ thống tự động chuyển sang ca 1 của ngày tiếp theo

+Mỗi đơn hàng phải gắn với ngày và ca làm việc

1.5.Thanh toán và kết ca

-Khi thanh toán đơn hàng:

+Hệ thống cho phép chọn hình thức thanh toán: Chuyển khoản/Tiền mặt

+Hệ thống ghi nhận số tiền theo từng hình thức thanh toán

-Kết ca:

+Cuối mỗi ca, Thu ngân thực hiện kết ca

+Hệ thống hiển thị:Tổng tiền mặt, Tổng chuyển khoản và Tổng doanh thu theo ca

-Quản lý có thể xem báo cáo kết ca

2.Yêu cầu phi chức năng

2.1.Tính dễ sử dụng

-Hệ thống phải dễ học và dễ thao tác đối với thu ngân.

-Các chức năng bán hàng được thiết kế trực quan, không cần đào tạo chuyên sâu.

-Thao tác bán hàng (chọn món → thanh toán → hoàn tất) không vượt quá 3–4 bước.

2.2.Tính ổn định

-Hệ thống phải hoạt động liên tục trong giờ cao điểm của quán

-Không được xảy ra lỗi mất dữ liệu khi đang bán hàng hoặc kết ca.

-Khi có lỗi hệ thống, phải hiển thị thông báo rõ ràng cho người dùng.

2.3.Tính chính xác

-Doanh thu, số tiền thanh toán và báo cáo phải được tính chính xác tuyệt đối

-Dữ liệu sau khi lưu không được tự ý thay đổi nếu không có quyền.

3.Yêu cầu hệ thống

3.1.Loại hệ thống

-Hệ thống quản lý tài chính và bán hàng quán Café được xây dựng dưới dạng ứng dụng Web.
-Người dùng truy cập hệ thống thông qua trình duyệt web trên máy tính mà không cần cài đặt phần mềm.

3.2.Kiến trúc hệ thống

-Hệ thống được thiết kế theo mô hình 3-Layer (hoặc MVC), bao gồm:

+Lớp giao diện (Presentation Layer):Hiển thị giao diện web cho Quản lý và Thu ngân, hỗ trợ thao tác bán hàng, quản lý và xem báo cáo.

+Lớp xử lý nghiệp vụ (Business Logic Layer): Xử lý các nghiệp vụ chính như:

.Bán hàng

.Quản lý ca làm việc

.Thanh toán tiền mặt và chuyển khoản

.Kết ca và tổng hợp doanh thu

+Lớp dữ liệu (Data Access Layer):Quản lý việc truy xuất và lưu trữ dữ liệu trong cơ sở dữ liệu.

=>Việc phân tầng giúp hệ thống dễ bảo trì, dễ mở rộng và phù hợp yêu cầu PBL3.

3.3.Môi trường triển khai

-Hệ thống hoạt động trên trình duyệt web như Chrome, Edge.

-Có thể triển khai trên:

+Máy chủ nội bộ của quán

+Hoặc máy chủ Internet

+Máy trạm tại quầy thu ngân chỉ cần có:

.Máy tính

.Trình duyệt web

3.4.Người dùng hệ thống

Hệ thống hỗ trợ hai loại người dùng:

-Quản lý (Admin)

+Có toàn quyền sử dụng các chức năng của hệ thống.

+Quản lý đơn hàng, menu, kho và báo cáo.

-Thu ngân (Cashier)

+Thực hiện bán hàng.

+Xem báo cáo ngày và kết ca.

+Không được truy cập các chức năng quản trị hệ thống.

3.5.Quản lý ca làm việc

-Mỗi ngày được chia thành 4 ca làm việc.

-Mỗi đơn hàng bắt buộc phải gắn với:

+Ngày bán

+Ca làm việc

-Khi kết thúc ca 4, hệ thống tự động chuyển sang ca 1 của ngày tiếp theo

-Dữ liệu ca làm việc được sử dụng để tổng hợp doanh thu và báo cáo.

3.6.Quản lý thanh toán

-Hệ thống hỗ trợ hai hình thức thanh toán:

+Tiền mặt

+Chuyển khoản

-Khi thanh toán, thu ngân phải chọn hình thức thanh toán tương ứng.

-Dữ liệu thanh toán được lưu để phục vụ:

+Kết ca

+Đối soát doanh thu

3.7.Khả năng hoạt động đồng thời

-Hệ thống cho phép nhiều người dùng đăng nhập và thao tác cùng lúc.

-Dữ liệu được cập nhật ngay khi phát sinh giao dịch.

-Đảm bảo không xảy ra xung đột dữ liệu khi nhiều thu ngân bán hàng.

C.8. Yêu cầu về bảo mật

-Người dùng phải đăng nhập để sử dụng hệ thống.

-Mật khẩu được mã hóa khi lưu trữ trong cơ sở dữ liệu.

-Phân quyền truy cập được kiểm soát ở phía máy chủ

-Thu ngân không thể truy cập các chức năng dành cho Quản lý.

3.9.Cơ sở dữ liệu

-Hệ thống sử dụng cơ sở dữ liệu quan hệ (MySQL hoặc SQL Server).

-Dữ liệu được lưu trữ tập trung, bao gồm:

+Người dùng

+Đơn hàng

+Menu

+Kho

+Ca làm việc

+Thanh toán và báo cáo

3.10.Khả năng mở rộng

-Hệ thống có khả năng mở rộng trong tương lai:

+Quản lý nhiều chi nhánh

+Tích hợp máy in hóa đơn

+Phát triển thêm ứng dụng mobile cho Quản lý

4.Yêu cầu dữ liệu

4.1.Dữ liệu người dùng

-Lưu trữ thông tin:

+Tên đăng nhập

+Mật khẩu (đã mã hóa)

+Vai trò (Quản lý / Thu ngân)

4.2.Dữ liệu bán hàng

-Mỗi đơn hàng phải lưu:

+Ngày bán

+Ca làm việc

+Danh sách món

+Tổng tiền

+Hình thức thanh toán (Tiền mặt/Chuyển khoản)

4.3.Dữ liệu kho

-Lưu lịch sử nhập kho.

4.4.Dữ liệu báo cáo

-Dữ liệu báo cáo được tổng hợp từ dữ liệu gốc.

-Không cho phép chỉnh sửa trực tiếp dữ liệu báo cáo.

5.Yêu cầu giao diện người dùng

5.1.Giao diện đăng nhập

-Đơn giản, rõ ràng.

-Hiển thị thông báo lỗi khi nhập sai thông tin.

5.2.Giao diện bán hàng

-Hiển thị menu theo dạng nút hoặc danh sách.

-Có khu vực:

+Danh sách món

+Tổng tiền

+Nút thanh toán rõ ràng, dễ thao tác.

5.3.Giao diện báo cáo

-Hiển thị:

+Tổng doanh thu

+Doanh thu theo ca

+Có bảng số liệu và biểu đồ.

6.Yêu cầu bảo mật

6.1.Bảo mật tài khoản

-Mật khẩu phải được mã hóa khi lưu trữ

-Không hiển thị mật khẩu dưới dạng văn bản rõ.

6.2.Phân quyền truy cập

-Thu ngân không được truy cập:

+Quản lý kho

+Báo cáo tháng

-Quản lý có toàn quyền hệ thống.

6.3.Nhật ký hệ thống

-Ghi lại:

+Thao tác bán hàng

+Hủy hóa đơn

+Kết ca

+Phục vụ kiểm tra và đối soát khi cần

7.Yêu cầu hiệu suất

7.1.Hiệu suất

-Thời gian load trang: < 3 giây

-Thời gian xử lý Ajax: < 1 giây

-Hỗ trợ 5-10 người dùng đồng thời

7.2.Tương thích

-Browser: Chrome 100+, Edge 100+, Firefox 90+

-Screen: Desktop 1366×768 trở lên

Responsive: Tablet (optional cho PBL3)

7.3.Bảo mật

-Hash password

-Phân quyền rõ ràng

-Validate input đầy đủ HTTPS (khi deploy production)

7.4.Khả năng sử dụng

-Giao diện đơn giản, trực quan

-Thao tác không quá 3 click

-Thông báo lỗi rõ ràng

7.5.Khả năng bảo trì

-Code tuân thủ MVC chuẩn

-Comment đầy đủ

-Đặt tên biến/hàm có nghĩa

8.Yêu cầu khả năng mở rộng

-Hệ thống có thể mở rộng thêm:

+Quản lý nhiều chi nhánh

+Quản lý nhân viên chi tiết hơn

+Có thể tích hợp:

+Máy in hóa đơn

+Hệ thống POS

-Có thể phát triển thêm:

+Ứng dụng mobile cho quản lý

+Thanh toán điện tử nâng cao
