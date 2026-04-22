namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Models.SystemConfig;
using WebApi.Services;

[Authorize(Role.Admin)]
[ApiController]
[Route("[controller]")]
public class SystemConfigController : ControllerBase
{
    private readonly ISystemConfigService _systemConfigService;
    private readonly ISystemActivityLogService _systemActivityLogService;

    public SystemConfigController(ISystemConfigService systemConfigService, ISystemActivityLogService systemActivityLogService)
    {
        _systemConfigService = systemConfigService;
        _systemActivityLogService = systemActivityLogService;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var data = await _systemConfigService.Get();
        return Ok(data);
    }

    [HttpPut]
    public async Task<IActionResult> Upsert([FromBody] UpsertSystemConfigRequest request)
    {
        var data = await _systemConfigService.Upsert(request);
        var user = (User?)HttpContext.Items["User"];
        if (user != null)
        {
            await _systemActivityLogService.Write(new SystemActivityLogWriteRequest
            {
                ActorUserId = user.Id,
                ActorDisplayName = $"{user.FirstName} {user.LastName}".Trim(),
                ActionType = "SYSTEM_CONFIG_UPDATED",
                Severity = "Info",
                Description = "Cập nhật cài đặt hệ thống",
                TargetAudience = "Owner"
            });
        }
        return Ok(data);
    }
}
