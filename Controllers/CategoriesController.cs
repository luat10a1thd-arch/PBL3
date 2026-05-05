namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("[controller]")]
public class CategoriesController : ControllerBase
{
    private ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var categories = _categoryService.GetAll();
        return Ok(categories);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var category = _categoryService.GetById(id);
        return Ok(category);
    }

    [Authorize(Role.Manager)]
    [HttpPost]
    public IActionResult Create([FromBody] CategoryUpsertRequest model)
    {
        _categoryService.Create(new Category
        {
            Name = model.Name,
            Description = model.Description,
            ImageUrl = model.ImageUrl
        });
        return Ok(new { message = "Category created successfully" });
    }

    [Authorize(Role.Manager)]
    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] CategoryUpsertRequest model)
    {
        _categoryService.Update(id, new Category
        {
            Name = model.Name,
            Description = model.Description,
            ImageUrl = model.ImageUrl
        });
        return Ok(new { message = "Category updated successfully" });
    }

    [Authorize(Role.Manager)]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        _categoryService.Delete(id);
        return Ok(new { message = "Category deleted successfully" });
    }
}

public sealed class CategoryUpsertRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("imageUrl")]
    public string ImageUrl { get; set; } = string.Empty;
}
