namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("[controller]")]
public class TablesController : ControllerBase
{
    private ITableService _tableService;

    public TablesController(ITableService tableService)
    {
        _tableService = tableService;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var tables = _tableService.GetAll();
        return Ok(tables);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var table = _tableService.GetById(id);
        return Ok(table);
    }

    [Authorize(Role.Manager)]
    [HttpPost]
    public IActionResult Create([FromBody] Table table)
    {
        var created = _tableService.Create(table);
        return Ok(created);
    }

    [Authorize(Role.Manager)]
    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] Table table)
    {
        var updated = _tableService.Update(id, table);
        return Ok(updated);
    }

    [Authorize(Role.Manager)]
    [HttpPatch("{id}/status")]
    public IActionResult UpdateStatus(int id, [FromBody] UpdateTableStatusRequest request)
    {
        _tableService.UpdateStatus(id, request.Status);
        return Ok(new { message = "Cập nhật trạng thái bàn thành công" });
    }

    [Authorize(Role.Manager)]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        _tableService.Delete(id);
        return Ok(new { message = "Xóa bàn thành công" });
    }
}

public class UpdateTableStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
