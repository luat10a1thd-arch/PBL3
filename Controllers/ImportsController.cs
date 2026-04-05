namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("[controller]")]
public class ImportsController : ControllerBase
{
    private readonly IImportService _importService;

    public ImportsController(IImportService importService)
    {
        _importService = importService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? supplierId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var imports = await _importService.GetAll(supplierId, fromDate, toDate);
        return Ok(imports);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var import = await _importService.GetById(id);
        return Ok(import);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPost]
    public async Task<IActionResult> Create(Import import)
    {
        var created = await _importService.Create(import);
        return Ok(created);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Import import)
    {
        var updated = await _importService.Update(id, import);
        return Ok(updated);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _importService.Delete(id);
        return Ok(new { message = "Xóa phiếu nhập thành công" });
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPost("stock-in")]
    public async Task<IActionResult> StockIn([FromBody] StockInRequest request)
    {
        var result = await _importService.StockIn(request);
        return Ok(result);
    }
}
