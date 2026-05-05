namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;
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
    public IActionResult Create([FromBody] ItemUpsertRequest model)
    {
        _itemService.Create(new Item
        {
            Name = model.Name,
            CategoryId = model.CategoryId,
            BasePrice = model.BasePrice,
            ImageUrl = model.ImageUrl
        });
        return Ok(new { message = "Item created successfully" });
    }

    [Authorize(Role.Manager)]
    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] ItemUpsertRequest model)
    {
        _itemService.Update(id, new Item
        {
            Name = model.Name,
            CategoryId = model.CategoryId,
            BasePrice = model.BasePrice,
            ImageUrl = model.ImageUrl
        });
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

public sealed class ItemUpsertRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("categoryId")]
    public int CategoryId { get; set; }

    [JsonPropertyName("basePrice")]
    public decimal BasePrice { get; set; }

    [JsonPropertyName("imageUrl")]
    public string ImageUrl { get; set; } = string.Empty;
}
