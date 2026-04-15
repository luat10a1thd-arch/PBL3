namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApi.Authorization;
using WebApi.Services;
using WebApi.Entities; // Needed to access Current User via HttpContext if necessary
using WebApi.Helpers;

[Authorize]
[ApiController]
[Route("[controller]")]
public class OrdersController : ControllerBase
{
    private IOrderService _orderService;
    private readonly DataContext _context;

    public OrdersController(IOrderService orderService, DataContext context)
    {
        _orderService = orderService;
        _context = context;
    }

    [HttpPost("create")]
    public IActionResult CreateOrder([FromBody] CreateOrderRequest request)
    {
        var user = (User)HttpContext.Items["User"]; // Lấy EmployeeID từ người đăng nhập
        var order = _orderService.CreateOrder(request.TableId, user.Id);
        return Ok(order);
    }

    [HttpGet("table/{tableId}")]
    public IActionResult GetActiveOrderForTable(int tableId)
    {
        var order = _orderService.GetActiveOrderForTable(tableId);
        if (order == null) return NotFound(new { message = "Không có đơn hàng nào cho bàn này." });
        return Ok(order);
    }

    [HttpPost("add-item")]
    public IActionResult AddItemToOrder([FromBody] AddToOrderRequest request)
    {
        _orderService.AddItemToOrder(request.OrderId, request.ItemId, request.Quantity);
        return Ok(new { message = "Thêm món thành công" });
    }

    [HttpPost("checkout/{orderId}")]
    public IActionResult Checkout(int orderId, [FromBody] CheckoutRequest request)
    {
        _orderService.Checkout(orderId, request.PaymentMethod);
        return Ok(new { message = "Thanh toán thành công" });
    }

    [HttpPost("create-and-checkout")]
    public IActionResult CreateAndCheckout([FromBody] CreateAndCheckoutRequest request)
    {
        if (request == null || request.Items == null || request.Items.Count == 0)
            throw new AppException("Đơn hàng phải có ít nhất một món");

        var user = (User)HttpContext.Items["User"];
        
        // Create order
        var order = _orderService.CreateOrder(request.TableId, user.Id);
        
        // Add items
        foreach (var item in request.Items)
        {
            _orderService.AddItemToOrder(order.OrderId, item.ItemId, item.Quantity);
        }
        
        // Checkout
        _orderService.Checkout(order.OrderId, request.PaymentMethod);
        
        return Ok(new { 
            message = "Đơn hàng đã được tạo và thanh toán thành công",
            orderId = order.OrderId
        });
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpGet("admin-overview")]
    public IActionResult GetAdminOverview()
    {
        var payments = _context.Payments.AsNoTracking().ToList();
        var totalRevenue = payments.Sum(p => p.Price);
        var totalOrders = _context.Orders.Count();
        var activeOrders = _context.Orders.Count(o => !_context.Payments.Any(p => p.OrderId == o.OrderId));

        var totalImportCost = _context.Imports.Sum(i => (decimal?)i.TotalCost) ?? 0;
        var totalExpense = _context.Expenses.Sum(e => (decimal?)e.Amount) ?? 0;
        var netProfit = totalRevenue - totalImportCost - totalExpense;

        var paymentByOrder = payments
            .GroupBy(p => p.OrderId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.PaymentId).First());

        var tables = _context.Tables.AsNoTracking().ToDictionary(t => t.TableId, t => t.TableNumber);

        var recentOrders = _context.Orders
            .AsNoTracking()
            .Include(o => o.OrderDetails)
            .ThenInclude(od => od.Item)
            .OrderByDescending(o => o.OrderId)
            .Take(6)
            .ToList()
            .Select(o =>
            {
                var items = o.OrderDetails?
                    .OrderByDescending(od => od.Quantity)
                    .Select(od => od.Item?.Name)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Take(2)
                    .ToList() ?? new List<string>();

                return new AdminRecentOrderDto
                {
                    OrderId = o.OrderId,
                    Total = paymentByOrder.TryGetValue(o.OrderId, out var payment) ? payment.Price : o.Total,
                    PaymentMethod = paymentByOrder.TryGetValue(o.OrderId, out var p) ? p.Method : "unknown",
                    TableLabel = tables.TryGetValue(o.TableId, out var tableNumber) ? $"Bàn {tableNumber}" : $"Bàn #{o.TableId}",
                    ItemSummary = items.Count > 0 ? string.Join(", ", items) : "Không có món"
                };
            })
            .ToList();

        var lowStock = _context.Ingredients
            .AsNoTracking()
            .OrderBy(i => i.StockQty)
            .Take(5)
            .Select(i => new AdminLowStockDto
            {
                IngredientId = i.IngredientId,
                Name = i.Name,
                StockQty = i.StockQty
            })
            .ToList();

        var openShiftStaff = _context.Shifts
            .AsNoTracking()
            .Include(s => s.Employee)
            .Where(s => s.Expected == 0)
            .OrderByDescending(s => s.ShiftId)
            .Take(5)
            .Select(s => new AdminOpenShiftDto
            {
                ShiftId = s.ShiftId,
                EmployeeId = s.EmployeeId,
                EmployeeName = $"{s.Employee.FirstName} {s.Employee.LastName}".Trim(),
                Opening = s.Opening
            })
            .ToList();

        var localToday = DateTime.Now.Date;
        var trendStart = localToday.AddDays(-6);
        var paymentsInTrend = payments
            .Where(p => p.PaidAt != default)
            .Select(p => new
            {
                LocalDate = p.PaidAt.ToLocalTime().Date,
                p.Price
            })
            .Where(x => x.LocalDate >= trendStart && x.LocalDate <= localToday)
            .GroupBy(x => x.LocalDate)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Price));

        var trendPayments = new List<decimal>();
        var trendLabels = new List<string>();
        for (var date = trendStart; date <= localToday; date = date.AddDays(1))
        {
            trendPayments.Add(paymentsInTrend.TryGetValue(date, out var value) ? value : 0);
            trendLabels.Add(date.ToString("dd/MM"));
        }

        return Ok(new AdminOverviewDto
        {
            TotalRevenue = totalRevenue,
            TotalOrders = totalOrders,
            ActiveOrders = activeOrders,
            TotalImportCost = totalImportCost,
            NetProfit = netProfit,
            RecentOrders = recentOrders,
            LowStockIngredients = lowStock,
            OpenShiftStaff = openShiftStaff,
            RevenueTrend = trendPayments,
            RevenueTrendLabels = trendLabels
        });
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpGet("admin-list")]
    public IActionResult GetAdminOrderList()
    {
        var now = DateTime.Now.Date;

        var orders = _context.Orders
            .AsNoTracking()
            .Include(o => o.Table)
            .Include(o => o.OrderDetails)
            .ThenInclude(od => od.Item)
            .OrderByDescending(o => o.CreatedAt)
            .ThenByDescending(o => o.OrderId)
            .ToList();

        var paymentMap = _context.Payments
            .AsNoTracking()
            .ToList()
            .GroupBy(p => p.OrderId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(p => p.PaymentId).First());

        var rows = orders.Select(o =>
        {
            var hasPayment = paymentMap.TryGetValue(o.OrderId, out var payment);
            var when = hasPayment && payment!.PaidAt != default ? payment.PaidAt : o.CreatedAt;
            var items = o.OrderDetails?
                .OrderByDescending(od => od.Quantity)
                .Select(od => od.Item?.Name)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Take(3)
                .ToList() ?? new List<string>();

            return new AdminOrderListRowDto
            {
                OrderId = o.OrderId,
                CreatedAt = o.CreatedAt,
                PaidAt = hasPayment ? payment!.PaidAt : null,
                DateTime = when == default ? DateTime.Now : when,
                TableLabel = o.Table != null ? $"Bàn {o.Table.TableNumber}" : $"Bàn #{o.TableId}",
                ItemSummary = items.Count > 0 ? string.Join(", ", items) : "Không có món",
                Total = hasPayment ? payment!.Price : o.Total,
                PaymentMethod = hasPayment ? payment!.Method : "pending",
                Status = hasPayment ? "Completed" : "Open"
            };
        }).ToList();

        var todayOrders = rows.Count(x => x.DateTime.ToLocalTime().Date == now);
        var openOrders = rows.Count(x => x.Status == "Open");
        var completedOrders = rows.Count(x => x.Status == "Completed");

        return Ok(new AdminOrderListDto
        {
            TotalOrders = rows.Count,
            TodayOrders = todayOrders,
            OpenOrders = openOrders,
            CompletedOrders = completedOrders,
            Rows = rows
        });
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpGet("monthly-report")]
    public IActionResult GetMonthlyReport([FromQuery] int? month, [FromQuery] int? year)
    {
        var now = DateTime.Now;
        var selectedMonth = month.GetValueOrDefault(now.Month);
        var selectedYear = year.GetValueOrDefault(now.Year);
        if (selectedMonth < 1 || selectedMonth > 12)
            throw new AppException("Tháng không hợp lệ");
        if (selectedYear < 2000 || selectedYear > 2100)
            throw new AppException("Năm không hợp lệ");

        var periodStart = new DateTime(selectedYear, selectedMonth, 1);
        var periodEnd = periodStart.AddMonths(1);
        var dayCount = DateTime.DaysInMonth(selectedYear, selectedMonth);

        var payments = _context.Payments
            .AsNoTracking()
            .Where(p => p.PaidAt >= periodStart && p.PaidAt < periodEnd)
            .ToList();

        var imports = _context.Imports
            .AsNoTracking()
            .Include(i => i.Supplier)
            .Where(i => i.ImportDate >= periodStart && i.ImportDate < periodEnd)
            .ToList();

        var expenses = _context.Expenses
            .AsNoTracking()
            .Where(e => e.Date >= periodStart && e.Date < periodEnd)
            .ToList();

        var totalRevenue = payments.Sum(x => x.Price);
        var totalImportCost = imports.Sum(x => x.TotalCost);
        var totalExpense = expenses.Sum(x => x.Amount);
        var netProfit = totalRevenue - totalImportCost - totalExpense;

        var supplierSummary = imports
            .GroupBy(i => i.Supplier?.Name ?? $"NCC-{i.SupplierId}")
            .Select(g => new MonthlySupplierSummaryDto
            {
                SupplierName = g.Key,
                ImportCount = g.Count(),
                TotalCost = g.Sum(x => x.TotalCost)
            })
            .OrderByDescending(x => x.TotalCost)
            .ToList();

        var paymentMethodSummary = payments
            .GroupBy(p => p.Method ?? "unknown")
            .Select(g => new MonthlyPaymentMethodSummaryDto
            {
                Method = g.Key,
                Count = g.Count(),
                Total = g.Sum(x => x.Price)
            })
            .OrderByDescending(x => x.Total)
            .ToList();

        var revenueByDay = payments
            .Where(p => p.PaidAt != default)
            .GroupBy(p => p.PaidAt.ToLocalTime().Date.Day)
            .ToDictionary(g => g.Key, g => new
            {
                Revenue = g.Sum(x => x.Price),
                Count = g.Count()
            });

        var importByDay = imports
            .GroupBy(i => i.ImportDate.ToLocalTime().Date.Day)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.TotalCost));

        var expenseByDay = expenses
            .GroupBy(e => e.Date.ToLocalTime().Date.Day)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

        var daily = new List<MonthlyDailySummaryDto>();
        for (var day = 1; day <= dayCount; day++)
        {
            var revenueData = revenueByDay.TryGetValue(day, out var revenueValue) ? revenueValue : null;
            daily.Add(new MonthlyDailySummaryDto
            {
                Day = day,
                Revenue = revenueData?.Revenue ?? 0,
                OrderCount = revenueData?.Count ?? 0,
                ImportCost = importByDay.TryGetValue(day, out var importCost) ? importCost : 0,
                ExpenseCost = expenseByDay.TryGetValue(day, out var expenseCost) ? expenseCost : 0
            });
        }

        return Ok(new MonthlyReportDto
        {
            Month = selectedMonth,
            Year = selectedYear,
            TotalRevenue = totalRevenue,
            TotalImportCost = totalImportCost,
            TotalExpense = totalExpense,
            NetProfit = netProfit,
            SupplierCount = imports.Select(x => x.SupplierId).Distinct().Count(),
            PaymentCount = payments.Count,
            Daily = daily,
            SupplierSummary = supplierSummary,
            PaymentMethodSummary = paymentMethodSummary
        });
    }
}

// Request Models (Có thể tách ra file riêng nếu muốn)
public class CreateOrderRequest { public int TableId { get; set; } }
public class AddToOrderRequest { public int OrderId { get; set; } public int ItemId { get; set; } public int Quantity { get; set; } }
public class CheckoutRequest { public string PaymentMethod { get; set; } }
public class CreateAndCheckoutRequest 
{ 
    public int TableId { get; set; }
    public string PaymentMethod { get; set; }
    public List<OrderItemRequest> Items { get; set; }
}
public class OrderItemRequest
{
    public int ItemId { get; set; }
    public int Quantity { get; set; }
}

public class AdminOverviewDto
{
    public decimal TotalRevenue { get; set; }
    public int TotalOrders { get; set; }
    public int ActiveOrders { get; set; }
    public decimal TotalImportCost { get; set; }
    public decimal NetProfit { get; set; }
    public List<AdminRecentOrderDto> RecentOrders { get; set; } = new();
    public List<AdminLowStockDto> LowStockIngredients { get; set; } = new();
    public List<AdminOpenShiftDto> OpenShiftStaff { get; set; } = new();
    public List<decimal> RevenueTrend { get; set; } = new();
    public List<string> RevenueTrendLabels { get; set; } = new();
}

public class AdminRecentOrderDto
{
    public int OrderId { get; set; }
    public string TableLabel { get; set; } = string.Empty;
    public string ItemSummary { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
}

public class AdminLowStockDto
{
    public int IngredientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal StockQty { get; set; }
}

public class AdminOpenShiftDto
{
    public int ShiftId { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public decimal Opening { get; set; }
}

public class AdminOrderListDto
{
    public int TotalOrders { get; set; }
    public int TodayOrders { get; set; }
    public int OpenOrders { get; set; }
    public int CompletedOrders { get; set; }
    public List<AdminOrderListRowDto> Rows { get; set; } = new();
}

public class AdminOrderListRowDto
{
    public int OrderId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime DateTime { get; set; }
    public string TableLabel { get; set; } = string.Empty;
    public string ItemSummary { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string Status { get; set; } = "Open";
}

public class MonthlyReportDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalImportCost { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal NetProfit { get; set; }
    public int SupplierCount { get; set; }
    public int PaymentCount { get; set; }
    public List<MonthlyDailySummaryDto> Daily { get; set; } = new();
    public List<MonthlySupplierSummaryDto> SupplierSummary { get; set; } = new();
    public List<MonthlyPaymentMethodSummaryDto> PaymentMethodSummary { get; set; } = new();
}

public class MonthlyDailySummaryDto
{
    public int Day { get; set; }
    public int OrderCount { get; set; }
    public decimal Revenue { get; set; }
    public decimal ImportCost { get; set; }
    public decimal ExpenseCost { get; set; }
}

public class MonthlySupplierSummaryDto
{
    public string SupplierName { get; set; } = string.Empty;
    public int ImportCount { get; set; }
    public decimal TotalCost { get; set; }
}

public class MonthlyPaymentMethodSummaryDto
{
    public string Method { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Total { get; set; }
}
