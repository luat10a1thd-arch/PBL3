namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Services;

[Authorize(Entities.Role.Admin)]
[ApiController]
[Route("[controller]")]
public class SystemActivityLogsController : ControllerBase
{
    private readonly ISystemActivityLogService _systemActivityLogService;

    public SystemActivityLogsController(ISystemActivityLogService systemActivityLogService)
    {
        _systemActivityLogService = systemActivityLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetRecent(
        [FromQuery] int limit = 100, 
        [FromQuery] string? actionType = null, 
        [FromQuery] string? keyword = null,
        [FromQuery] string? severity = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var logs = await _systemActivityLogService.GetRecent(limit, actionType, keyword, severity, fromDate, toDate);
        return Ok(logs);
    }
}
