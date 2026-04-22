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
    private readonly ISystemActivityLogService _systemActivityLogService;

    public IngredientsController(IIngredientService ingredientService, ISystemActivityLogService systemActivityLogService)
    {
        _ingredientService = ingredientService;
        _systemActivityLogService = systemActivityLogService;
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

    [Authorize(Role.Manager)]
    [HttpPost]
    public async Task<IActionResult> Create(Ingredient ingredient)
    {
        var created = await _ingredientService.Create(ingredient);
        return Ok(created);
    }

    [Authorize(Role.Manager)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Ingredient ingredient)
    {
        var updated = await _ingredientService.Update(id, ingredient);
        return Ok(updated);
    }

    [Authorize(Role.Manager)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _ingredientService.Delete(id);
        return Ok(new { message = "Xóa nguyên liệu thành công" });
    }

    [Authorize(Role.Manager)]
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

    [Authorize(Role.Staff, Role.Manager)]
    [HttpPost("{id}/consume")]
    public async Task<IActionResult> Consume(int id, [FromBody] ConsumeIngredientRequest request)
    {
        var user = (User)HttpContext.Items["User"];
        var quantity = request?.Quantity ?? 0;
        var updated = await _ingredientService.ConsumeStock(id, quantity);

        await _systemActivityLogService.Write(new SystemActivityLogWriteRequest
        {
            ActorUserId = user.Id,
            ActorDisplayName = $"{user.FirstName} {user.LastName}".Trim(),
            ActionType = "INGREDIENT_CONSUMED",
            Severity = "Warning",
            Description = $"Xuất kho nguyên liệu #{id} số lượng {quantity:N2}",
            TargetAudience = "Owner",
            MetadataJson = $"{{\"ingredientId\":{id},\"quantity\":{quantity},\"note\":\"{(request?.Note ?? string.Empty).Replace("\"", "\\\"")}\"}}"
        });

        return Ok(updated);
    }
}

public class UpdateStockRequest
{
    public decimal Quantity { get; set; }
}

public class ConsumeIngredientRequest
{
    public decimal Quantity { get; set; }
    public string? Note { get; set; }
}
