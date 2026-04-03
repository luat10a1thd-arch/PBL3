namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Services;
using WebApi.Entities; // Needed to access Current User via HttpContext if necessary

[Authorize]
[ApiController]
[Route("[controller]")]
public class OrdersController : ControllerBase
{
    private IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
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
