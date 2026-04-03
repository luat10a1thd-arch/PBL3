namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("[controller]")]
public class MenuController : ControllerBase
{
    private IMenuService _menuService;

    public MenuController(IMenuService menuService)
    {
        _menuService = menuService;
    }

    [HttpGet("categories")]
    public IActionResult GetCategories()
    {
        return Ok(_menuService.GetCategories());
    }

    [HttpGet("items")]
    public IActionResult GetAllItems()
    {
        return Ok(_menuService.GetAllItems());
    }

    [HttpGet("items/category/{categoryId}")]
    public IActionResult GetItemsByCategory(int categoryId)
    {
        return Ok(_menuService.GetItemsByCategory(categoryId));
    }
}
