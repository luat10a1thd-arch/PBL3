namespace WebApi.Services;

using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

public interface ICashierService
{
    Task<decimal> CalculateTotalAsync(int orderId);
    Task ProcessPaymentAsync(int orderId, decimal amountPaid);
    Task<string> GenerateReceiptAsync(int orderId);
}

public class CashierService : ICashierService
{
    private readonly DataContext _context;

    public CashierService(DataContext context)
    {
        _context = context;
    }

    public async Task<decimal> CalculateTotalAsync(int orderId)
    {
        var order = await _context.Orders
            .Include(o => o.OrderDetails)
            .ThenInclude(od => od.OrderToppings)
            .FirstOrDefaultAsync(o => o.OrderId == orderId);

        if (order == null)
            throw new KeyNotFoundException("Order not found");

        decimal total = 0;

        foreach (var detail in order.OrderDetails)
        {
            total += detail.TotalPrice;
            
            if (detail.OrderToppings != null)
            {
                foreach (var topping in detail.OrderToppings)
                {
                    total += topping.Price;
                }
            }
        }

        return total;
    }

    public async Task ProcessPaymentAsync(int orderId, decimal amountPaid)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order == null)
            throw new KeyNotFoundException("Order not found");

        var total = await CalculateTotalAsync(orderId);
        
        if (amountPaid < total)
            throw new AppException("Insufficient payment amount");

        order.Total = total;
        _context.Orders.Update(order);
        await _context.SaveChangesAsync();
    }

    public async Task<string> GenerateReceiptAsync(int orderId)
    {
        var order = await _context.Orders
            .Include(o => o.OrderDetails)
            .ThenInclude(od => od.Item)
            .Include(o => o.OrderDetails)
            .ThenInclude(od => od.OrderToppings)
            .ThenInclude(ot => ot.Topping)
            .Include(o => o.Table)
            .Include(o => o.Employee)
            .FirstOrDefaultAsync(o => o.OrderId == orderId);

        if (order == null)
            throw new KeyNotFoundException("Order not found");

        var receipt = $@"
=================================
       CAFE 24/7 - HÓA ĐƠN
=================================
Đơn hàng: #{order.OrderId}
Bàn: {order.Table?.TableNumber.ToString() ?? "N/A"}
Thu ngân: {(order.Employee != null ? $"{order.Employee.FirstName} {order.Employee.LastName}" : "N/A")}
Thời gian: {DateTime.Now:dd/MM/yyyy HH:mm}
---------------------------------
";

        foreach (var detail in order.OrderDetails)
        {
            receipt += $"{detail.Item.Name} x{detail.Quantity}\n";
            receipt += $"  {detail.TotalPrice:N0} VND\n";

            if (detail.OrderToppings != null)
            {
                foreach (var topping in detail.OrderToppings)
                {
                    receipt += $"  + {topping.Topping.Name} x{topping.Quantity}\n";
                    receipt += $"    {topping.Price:N0} VND\n";
                }
            }
        }

        receipt += "---------------------------------\n";
        receipt += $"TỔNG CỘNG: {order.Total:N0} VND\n";
        receipt += "=================================\n";
        receipt += "   CẢM ƠN QUÝ KHÁCH!\n";
        receipt += "=================================\n";

        return receipt;
    }
}
