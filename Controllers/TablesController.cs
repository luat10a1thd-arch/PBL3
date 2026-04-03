namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
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
}
