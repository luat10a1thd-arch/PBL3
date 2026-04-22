using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Hubs;
using WebApi.Services;

namespace WebApi.Controllers;

[Authorize]
[ApiController]
[Route("[controller]")]
public class ShiftsController : ControllerBase
{
    private readonly IShiftService _shiftService;
    private readonly IHubContext<ShiftHub> _hubContext;
    private readonly ISystemActivityLogService _systemActivityLogService;

    public ShiftsController(IShiftService shiftService, IHubContext<ShiftHub> hubContext, ISystemActivityLogService systemActivityLogService)
    {
        _shiftService = shiftService;
        _hubContext = hubContext;
        _systemActivityLogService = systemActivityLogService;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var user = (User)HttpContext.Items["User"];
        var shifts = _shiftService.GetAllShifts();
        if (user.Role == Role.Staff)
            shifts = shifts.Where(x => x.EmployeeId == user.Id);
        return Ok(shifts);
    }

    [HttpGet("current")]
    public IActionResult GetCurrent()
    {
        var user = (User)HttpContext.Items["User"];
        
        var uiUserId = Request.Headers["X-UI-User-Id"].FirstOrDefault();
        if (!string.IsNullOrEmpty(uiUserId) && uiUserId != user.Id.ToString())
            return Unauthorized(new { message = "Tài khoản đang đăng nhập ở tab khác không khớp với giao diện hiện tại. Vui lòng F5." });

        var shift = _shiftService.GetCurrentShift(user.Id);
        if (shift == null) return NotFound(new { message = "Không có ca đang hoạt động" });
        return Ok(shift);
    }

    [HttpPost("open")]
    public async Task<IActionResult> Open([FromBody] OpenShiftRequest request)
    {
        var user = (User)HttpContext.Items["User"];
        
        var uiUserId = Request.Headers["X-UI-User-Id"].FirstOrDefault();
        if (!string.IsNullOrEmpty(uiUserId) && uiUserId != user.Id.ToString())
            return Unauthorized(new { message = "Tài khoản đang đăng nhập ở tab khác không khớp với giao diện hiện tại. Vui lòng F5." });

        var shift = _shiftService.OpenShift(user.Id, request.OpeningAmount);
        await _systemActivityLogService.Write(new SystemActivityLogWriteRequest
        {
            ActorUserId = user.Id,
            ActorDisplayName = $"{user.FirstName} {user.LastName}".Trim(),
            ActionType = "SHIFT_OPENED",
            Severity = "Info",
            Description = $"Mở ca #{shift.ShiftId} với tiền đầu ca {shift.Opening:N0} VND",
            TargetAudience = "Owner",
            MetadataJson = $"{{\"shiftId\":{shift.ShiftId},\"employeeId\":{user.Id}}}"
        });
        await _hubContext.Clients.All.SendAsync("ShiftUpdated", shift);
        return Ok(shift);
    }

    [HttpPost("close")]
    public async Task<IActionResult> Close([FromBody] CloseShiftRequest request)
    {
        var user = (User)HttpContext.Items["User"];

        var uiUserId = Request.Headers["X-UI-User-Id"].FirstOrDefault();
        if (!string.IsNullOrEmpty(uiUserId) && uiUserId != user.Id.ToString())
            return Unauthorized(new { message = "Tài khoản đang đăng nhập ở tab khác không khớp với giao diện hiện tại. Vui lòng F5." });

        var current = _shiftService.GetCurrentShift(user.Id);
        if (current == null)
            return NotFound(new { message = "Không có ca đang hoạt động để chốt" });

        var targetShiftId = request.ShiftId > 0 ? request.ShiftId : current.ShiftId;
        if (targetShiftId != current.ShiftId)
            return BadRequest(new { message = "Chỉ được chốt ca hiện tại của chính bạn" });

        var shift = _shiftService.CloseShift(targetShiftId, user.Id, request.ExpectedAmount);

        await _systemActivityLogService.Write(new SystemActivityLogWriteRequest
        {
            ActorUserId = user.Id,
            ActorDisplayName = $"{user.FirstName} {user.LastName}".Trim(),
            ActionType = "SHIFT_CLOSED",
            Severity = "Info",
            Description = $"Chốt ca #{shift.ShiftId} với tiền thực tế {shift.Expected:N0} VND",
            TargetAudience = "Owner",
            MetadataJson = $"{{\"shiftId\":{shift.ShiftId},\"closedByUserId\":{user.Id},\"openedByEmployeeId\":{current.EmployeeId}}}"
        });

        await _hubContext.Clients.All.SendAsync("ShiftUpdated", shift);
        return Ok(shift);
    }
}

public class OpenShiftRequest
{
    public decimal OpeningAmount { get; set; }
}

public class CloseShiftRequest
{
    public int ShiftId { get; set; }
    public decimal ExpectedAmount { get; set; }
}

