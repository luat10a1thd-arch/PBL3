namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _supplierService;

    public SuppliersController(ISupplierService supplierService)
    {
        _supplierService = supplierService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var suppliers = await _supplierService.GetAll();
        return Ok(suppliers);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var supplier = await _supplierService.GetById(id);
        if (supplier == null)
            return NotFound(new { message = "Không tìm thấy nhà cung cấp" });

        return Ok(supplier);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPost]
    public async Task<IActionResult> Create(Supplier supplier)
    {
        var created = await _supplierService.Create(supplier);
        return Ok(created);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Supplier supplier)
    {
        var updated = await _supplierService.Update(id, supplier);
        return Ok(updated);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _supplierService.Delete(id);
        return Ok(new { message = "Xóa nhà cung cấp thành công" });
    }
}
