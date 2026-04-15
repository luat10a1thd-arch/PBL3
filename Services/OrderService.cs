namespace WebApi.Services;

using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

public interface IOrderService
{
    // Tạo đơn hàng mới cho bàn
    Order CreateOrder(int tableId, int employeeId);
    
    // Lấy đơn hàng chưa thanh toán của một bàn
    Order GetActiveOrderForTable(int tableId);
    
    // Thêm món vào đơn hàng
    void AddItemToOrder(int orderId, int itemId, int quantity);
    
    // Thanh toán đơn hàng
    void Checkout(int orderId, string paymentMethod);
}

public class OrderService : IOrderService
{
    private DataContext _context;
    private ITableService _tableService;

    public OrderService(DataContext context, ITableService tableService)
    {
        _context = context;
        _tableService = tableService;
    }

    public Order CreateOrder(int tableId, int employeeId)
    {
        tableId = EnsureTableForOrder(tableId);

        // Kiểm tra xem bàn đã có đơn hàng chưa
        var existingOrder = GetActiveOrderForTable(tableId);
        if (existingOrder != null) 
            throw new AppException("Bàn này đã có đơn hàng đang hoạt động.");

        var order = new Order
        {
            TableId = tableId,
            EmployeeId = employeeId,
            Total = 0,
            CreatedAt = DateTime.UtcNow
        };

        _context.Orders.Add(order);
        
        // Cập nhật trạng thái bàn thành "Đang phục vụ"
        _tableService.UpdateStatus(tableId, "Occupied");

        _context.SaveChanges();
        return order;
    }

    private int EnsureTableForOrder(int requestedTableId)
    {
        var requested = _context.Tables.Find(requestedTableId);
        if (requested != null)
            return requested.TableId;

        var fallback = _context.Tables.OrderBy(t => t.TableId).FirstOrDefault();
        if (fallback != null)
            return fallback.TableId;

        var defaultTable = new Table
        {
            TableNumber = 1,
            Capacity = 4,
            Status = "Available"
        };

        _context.Tables.Add(defaultTable);
        _context.SaveChanges();
        return defaultTable.TableId;
    }

    public Order GetActiveOrderForTable(int tableId)
    {
        // Lấy order của bàn chưa có Payment (Chưa thanh toán)
        return _context.Orders
            .Include(o => o.OrderDetails) // Lấy kèm chi tiết món
            .ThenInclude(od => od.Item)   // Lấy kèm thông tin món
            .FirstOrDefault(o => o.TableId == tableId && !_context.Payments.Any(p => p.OrderId == o.OrderId));
    }

    public void AddItemToOrder(int orderId, int itemId, int quantity)
    {
        if (quantity <= 0) throw new AppException("Số lượng phải lớn hơn 0");

        var order = _context.Orders.Find(orderId);
        if (order == null) throw new KeyNotFoundException("Order không tồn tại");

        var item = _context.Items.Find(itemId);
        if (item == null) throw new KeyNotFoundException("Món không tồn tại");

        var orderDetail = _context.OrderDetails.FirstOrDefault(od => od.OrderId == orderId && od.ItemId == itemId);

        if (orderDetail != null)
        {
            // Nếu món đã có trong đơn, tăng số lượng
            orderDetail.Quantity += quantity;
            orderDetail.TotalPrice = orderDetail.Quantity * item.BasePrice;
            _context.OrderDetails.Update(orderDetail);
        }
        else
        {
            // Nếu là món mới
            orderDetail = new OrderDetail
            {
                OrderId = orderId,
                ItemId = itemId,
                Quantity = quantity,
                TotalPrice = quantity * item.BasePrice
            };
            _context.OrderDetails.Add(orderDetail);
        }

        // Cập nhật tổng tiền của đơn
        order.Total += (quantity * item.BasePrice);
        _context.Orders.Update(order);
        
        _context.SaveChanges();
    }

    public void Checkout(int orderId, string paymentMethod)
    {
        var order = _context.Orders.Find(orderId);
        if (order == null) throw new KeyNotFoundException("Order không tồn tại");

        // Tạo hóa đơn thanh toán
        var payment = new Payment
        {
            OrderId = orderId,
            Method = paymentMethod,
            Price = order.Total,
            PaidAt = DateTime.UtcNow
        };

        _context.Payments.Add(payment);

        // Trả bàn về trạng thái trống
        _tableService.UpdateStatus(order.TableId, "Available");

        _context.SaveChanges();
    }
}
