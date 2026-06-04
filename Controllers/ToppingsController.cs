namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("[controller]")]
public class ToppingsController : ControllerBase
{
    private IToppingService _toppingService;

    public ToppingsController(IToppingService toppingService)
    {
        _toppingService = toppingService;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var toppings = _toppingService.GetAll();
        return Ok(toppings);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var topping = _toppingService.GetById(id);
        return Ok(topping);
    }

    [Authorize(Role.Manager)]
    [HttpPost]
    public IActionResult Create(Toppings model)
    {
        _toppingService.Create(model);
        return Ok(new { message = "Topping created successfully" });
    }

    [Authorize(Role.Manager)]
    [HttpPut("{id}")]
    public IActionResult Update(int id, Toppings model)
    {
        _toppingService.Update(id, model);
        return Ok(new { message = "Topping updated successfully" });
    }

    [Authorize(Role.Manager)]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        _toppingService.Delete(id);
        return Ok(new { message = "Topping deleted successfully" });
    }
}
