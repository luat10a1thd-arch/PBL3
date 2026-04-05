namespace WebApi.Services;

using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

public interface IEmployeeService
{
    Task<List<Employee>> GetAll(string role = null, string keyword = null);
    Task<Employee> GetById(int id);
    Task<Employee> Create(Employee employee);
    Task<Employee> Update(int id, Employee employee);
    Task Delete(int id);
}

public class EmployeeService : IEmployeeService
{
    private readonly DataContext _context;

    public EmployeeService(DataContext context)
    {
        _context = context;
    }

    public async Task<List<Employee>> GetAll(string role = null, string keyword = null)
    {
        var query = _context.Employees.AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
        {
            var roleFilter = role.Trim();
            query = query.Where(e => e.Role == roleFilter);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var search = keyword.Trim();
            query = query.Where(e => e.Name.Contains(search));
        }

        return await query
            .OrderBy(e => e.Name)
            .ThenBy(e => e.EmployeeId)
            .ToListAsync();
    }

    public async Task<Employee> GetById(int id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null)
            throw new KeyNotFoundException("Không tìm thấy nhân viên");

        return employee;
    }

    public async Task<Employee> Create(Employee employee)
    {
        ValidateEmployee(employee);

        var normalizedName = employee.Name.Trim();
        var normalizedRole = employee.Role.Trim();
        var normalizedSalary = NormalizeSalary(employee.BasicSalary);

        var duplicate = await _context.Employees.AnyAsync(e => e.Name == normalizedName && e.Role == normalizedRole);
        if (duplicate)
            throw new AppException("Nhân viên đã tồn tại");

        employee.Name = normalizedName;
        employee.Role = normalizedRole;
        employee.BasicSalary = normalizedSalary;

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();
        return employee;
    }

    public async Task<Employee> Update(int id, Employee employee)
    {
        ValidateEmployee(employee);

        var existing = await _context.Employees.FindAsync(id);
        if (existing == null)
            throw new KeyNotFoundException("Không tìm thấy nhân viên");

        var normalizedName = employee.Name.Trim();
        var normalizedRole = employee.Role.Trim();
        var normalizedSalary = NormalizeSalary(employee.BasicSalary);

        var duplicate = await _context.Employees.AnyAsync(e => e.EmployeeId != id && e.Name == normalizedName && e.Role == normalizedRole);
        if (duplicate)
            throw new AppException("Nhân viên đã tồn tại");

        existing.Name = normalizedName;
        existing.Role = normalizedRole;
        existing.BasicSalary = normalizedSalary;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task Delete(int id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null)
            throw new KeyNotFoundException("Không tìm thấy nhân viên");

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync();
    }

    private static void ValidateEmployee(Employee employee)
    {
        if (employee == null)
            throw new AppException("Dữ liệu nhân viên không hợp lệ");

        if (string.IsNullOrWhiteSpace(employee.Name))
            throw new AppException("Tên nhân viên không được để trống");

        if (string.IsNullOrWhiteSpace(employee.Role))
            throw new AppException("Chức vụ không được để trống");
    }

    private static string NormalizeSalary(string salary)
    {
        if (string.IsNullOrWhiteSpace(salary))
            return "0";

        var digitsAndSeparators = new string(salary.Trim().Where(ch => char.IsDigit(ch) || ch == ',' || ch == '.').ToArray());
        if (string.IsNullOrWhiteSpace(digitsAndSeparators))
            return "0";

        if (decimal.TryParse(digitsAndSeparators, out var parsed))
            return parsed.ToString("0.##");

        return "0";
    }
}
