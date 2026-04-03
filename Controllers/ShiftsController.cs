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

    public ShiftsController(IShiftService shiftService, IHubContext<ShiftHub> hubContext)
    {
        _shiftService = shiftService;
        _hubContext = hubContext;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var shifts = _shiftService.GetAllShifts();
        return Ok(shifts);
    }

    [HttpGet("current")]
    public IActionResult GetCurrent()
    {
        var user = (User)HttpContext.Items["User"];
        var shift = _shiftService.GetCurrentShift(user.Id);
        if (shift == null) return NotFound(new { message = "Không có ca đang hoạt động" });
        return Ok(shift);
    }

    [HttpPost("open")]
    public async Task<IActionResult> Open([FromBody] OpenShiftRequest request)
    {
        var user = (User)HttpContext.Items["User"];
        var shift = _shiftService.OpenShift(user.Id, request.OpeningAmount);
        await _hubContext.Clients.All.SendAsync("ShiftUpdated", shift);
        return Ok(shift);
    }

    [HttpPost("close")]
    public async Task<IActionResult> Close([FromBody] CloseShiftRequest request)
    {
        var shift = _shiftService.CloseShift(request.ShiftId, request.ExpectedAmount);
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

