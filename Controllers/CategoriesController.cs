namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
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

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPost]
    public IActionResult Create(Category model)
    {
        _categoryService.Create(model);
        return Ok(new { message = "Category created successfully" });
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPut("{id}")]
    public IActionResult Update(int id, Category model)
    {
        _categoryService.Update(id, model);
        return Ok(new { message = "Category updated successfully" });
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        _categoryService.Delete(id);
        return Ok(new { message = "Category deleted successfully" });
    }
}
