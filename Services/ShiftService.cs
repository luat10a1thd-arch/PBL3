using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

namespace WebApi.Services;

public interface IShiftService
{
    ShiftSummaryDto OpenShift(int employeeId, decimal openingAmount);
    ShiftSummaryDto CloseShift(int shiftId, int employeeId, decimal expectedAmount);
    ShiftSummaryDto GetCurrentShift(int employeeId);
    IEnumerable<ShiftSummaryDto> GetAllShifts();
}

public class ShiftService : IShiftService
{
    private readonly DataContext _context;

    public ShiftService(DataContext context)
    {
        _context = context;
    }

    public ShiftSummaryDto OpenShift(int employeeId, decimal openingAmount)
    {
        var user = _context.Users.Find(employeeId);
        if (user == null) throw new KeyNotFoundException("Employee not found");

        var current = _context.Shifts.FirstOrDefault(x => x.EmployeeId == employeeId && x.ClosedAt == null);
        if (current != null) throw new AppException("Nhân viên đang có ca chưa chốt");

        var shift = new Shift
        {
            EmployeeId = employeeId,
            Opening = openingAmount,
            Expected = 0
        };

        _context.Shifts.Add(shift);
        _context.SaveChanges();

        return MapToSummary(shift, user.FirstName, user.LastName, false);
    }

    public ShiftSummaryDto CloseShift(int shiftId, int employeeId, decimal expectedAmount)
    {
        var shift = _context.Shifts.Include(x => x.Employee).FirstOrDefault(x => x.ShiftId == shiftId);
        if (shift == null) throw new KeyNotFoundException("Shift not found");
        if (shift.ClosedAt != null) throw new AppException("Ca đã được chốt");
        if (shift.EmployeeId != employeeId) throw new AppException("Bạn chỉ có thể chốt ca của chính mình");

        shift.Expected = expectedAmount;
        shift.ClosedAt = DateTime.UtcNow;
        _context.Shifts.Update(shift);
        _context.SaveChanges();

        return MapToSummary(shift, shift.Employee?.FirstName, shift.Employee?.LastName, true);
    }

    public ShiftSummaryDto GetCurrentShift(int employeeId)
    {
        var shift = _context.Shifts
            .Include(x => x.Employee)
            .Where(x => x.EmployeeId == employeeId && x.ClosedAt == null)
            .OrderByDescending(x => x.ShiftId)
            .FirstOrDefault();

        if (shift == null) return null;
        return MapToSummary(shift, shift.Employee?.FirstName, shift.Employee?.LastName, false);
    }

    public IEnumerable<ShiftSummaryDto> GetAllShifts()
    {
        return _context.Shifts
            .Include(x => x.Employee)
            .OrderByDescending(x => x.ShiftId)
            .Select(x => MapToSummary(x, x.Employee.FirstName, x.Employee.LastName, x.ClosedAt != null))
            .ToList();
    }

    private static ShiftSummaryDto MapToSummary(Shift shift, string firstName, string lastName, bool isClosed)
    {
        var safeFirstName = firstName ?? string.Empty;
        var safeLastName = lastName ?? string.Empty;
        var fullName = $"{safeFirstName} {safeLastName}".Trim();
        return new ShiftSummaryDto
        {
            ShiftId = shift.ShiftId,
            EmployeeId = shift.EmployeeId,
            EmployeeName = string.IsNullOrWhiteSpace(fullName) ? $"NV #{shift.EmployeeId}" : fullName,
            Opening = shift.Opening,
            Expected = shift.Expected,
            Status = isClosed ? "Closed" : "Open"
        };
    }
}

public class ShiftSummaryDto
{
    public int ShiftId { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public decimal Opening { get; set; }
    public decimal Expected { get; set; }
    public string Status { get; set; } = "Open";
}

