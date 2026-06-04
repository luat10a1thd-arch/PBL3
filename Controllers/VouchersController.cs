namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("[controller]")]
public class VouchersController : ControllerBase
{
    private readonly IVoucherService _voucherService;

    public VouchersController(IVoucherService voucherService)
    {
        _voucherService = voucherService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var vouchers = await _voucherService.GetAll();
        return Ok(vouchers);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var voucher = await _voucherService.GetById(id);
        if (voucher == null)
            return NotFound(new { message = "Không tìm thấy mã giảm giá" });
        return Ok(voucher);
    }

    [Authorize(Role.Manager)]
    [HttpPost]
    public async Task<IActionResult> Create(Voucher voucher)
    {
        var created = await _voucherService.Create(voucher);
        return Ok(created);
    }

    [Authorize(Role.Manager)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Voucher voucher)
    {
        var updated = await _voucherService.Update(id, voucher);
        return Ok(updated);
    }

    [Authorize(Role.Manager)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _voucherService.Delete(id);
        return Ok(new { message = "Xóa mã giảm giá thành công" });
    }
}
