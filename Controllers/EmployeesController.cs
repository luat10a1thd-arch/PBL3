namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeesController(IEmployeeService employeeService)
    {
        _employeeService = employeeService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string role, [FromQuery] string keyword)
    {
        var employees = await _employeeService.GetAll(role, keyword);
        return Ok(employees);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var employee = await _employeeService.GetById(id);
        return Ok(employee);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPost]
    public async Task<IActionResult> Create(Employee employee)
    {
        var created = await _employeeService.Create(employee);
        return Ok(created);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Employee employee)
    {
        var updated = await _employeeService.Update(id, employee);
        return Ok(updated);
    }

    [Authorize(Role.Admin, Role.Owner)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _employeeService.Delete(id);
        return Ok(new { message = "Xóa nhân viên thành công" });
    }
}
