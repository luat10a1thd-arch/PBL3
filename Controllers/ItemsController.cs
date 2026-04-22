namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("[controller]")]
public class ItemsController : ControllerBase
{
    private IItemService _itemService;

    public ItemsController(IItemService itemService)
    {
        _itemService = itemService;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var items = _itemService.GetAll();
        return Ok(items);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var item = _itemService.GetById(id);
        return Ok(item);
    }

    [HttpGet("category/{categoryId}")]
    public IActionResult GetByCategory(int categoryId)
    {
        var items = _itemService.GetByCategory(categoryId);
        return Ok(items);
    }

    [Authorize(Role.Manager)]
    [HttpPost]
    public IActionResult Create(Item model)
    {
        _itemService.Create(model);
        return Ok(new { message = "Item created successfully" });
    }

    [Authorize(Role.Manager)]
    [HttpPut("{id}")]
    public IActionResult Update(int id, Item model)
    {
        _itemService.Update(id, model);
        return Ok(new { message = "Item updated successfully" });
    }

    [Authorize(Role.Manager)]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        _itemService.Delete(id);
        return Ok(new { message = "Item deleted successfully" });
    }
}
