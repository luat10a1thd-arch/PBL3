namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("[controller]")]
public class IngredientsController : ControllerBase
{
    private readonly IIngredientService _ingredientService;

    public IngredientsController(IIngredientService ingredientService)
    {
        _ingredientService = ingredientService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var ingredients = await _ingredientService.GetAll();
        return Ok(ingredients);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var ingredient = await _ingredientService.GetById(id);
        if (ingredient == null)
            return NotFound(new { message = "Không tìm thấy nguyên liệu" });

        return Ok(ingredient);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPost]
    public async Task<IActionResult> Create(Ingredient ingredient)
    {
        var created = await _ingredientService.Create(ingredient);
        return Ok(created);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Ingredient ingredient)
    {
        var updated = await _ingredientService.Update(id, ingredient);
        return Ok(updated);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _ingredientService.Delete(id);
        return Ok(new { message = "Xóa nguyên liệu thành công" });
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPatch("{id}/stock")]
    public async Task<IActionResult> UpdateStock(int id, [FromBody] UpdateStockRequest request)
    {
        var updated = await _ingredientService.UpdateStock(id, request.Quantity);
        return Ok(updated);
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStock([FromQuery] decimal? threshold)
    {
        var ingredients = await _ingredientService.GetLowStock(threshold ?? 10);
        return Ok(ingredients);
    }
}

public class UpdateStockRequest
{
    public decimal Quantity { get; set; }
}
