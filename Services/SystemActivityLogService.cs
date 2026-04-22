namespace WebApi.Services;

using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

public interface ISystemActivityLogService
{
    Task<SystemActivityLog> Write(SystemActivityLogWriteRequest request);
    Task<IReadOnlyList<SystemActivityLog>> GetRecent(int limit = 100, string? actionType = null, string? keyword = null, string? severity = null, DateTime? fromDate = null, DateTime? toDate = null);
}

public class SystemActivityLogService : ISystemActivityLogService
{
    private readonly DataContext _context;

    public SystemActivityLogService(DataContext context)
    {
        _context = context;
    }

    public async Task<SystemActivityLog> Write(SystemActivityLogWriteRequest request)
    {
        if (request == null) throw new AppException("Dữ liệu log không hợp lệ");
        if (string.IsNullOrWhiteSpace(request.ActionType)) throw new AppException("ActionType không được để trống");
        if (string.IsNullOrWhiteSpace(request.Description)) throw new AppException("Description không được để trống");

        var entry = new SystemActivityLog
        {
            ActorUserId = request.ActorUserId,
            ActorDisplayName = (request.ActorDisplayName ?? string.Empty).Trim(),
            ActionType = request.ActionType.Trim(),
            Severity = string.IsNullOrWhiteSpace(request.Severity) ? "Info" : request.Severity.Trim(),
            Description = request.Description.Trim(),
            TargetAudience = string.IsNullOrWhiteSpace(request.TargetAudience) ? "Owner" : request.TargetAudience.Trim(),
            MetadataJson = (request.MetadataJson ?? string.Empty).Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.SystemActivityLogs.Add(entry);
        await _context.SaveChangesAsync();
        return entry;
    }

    public async Task<IReadOnlyList<SystemActivityLog>> GetRecent(int limit = 100, string? actionType = null, string? keyword = null, string? severity = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var safeLimit = Math.Clamp(limit, 1, 500);
        var query = _context.SystemActivityLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(actionType))
        {
            var normalizedActionType = actionType.Trim();
            query = query.Where(x => x.ActionType == normalizedActionType);
        }

        if (!string.IsNullOrWhiteSpace(severity))
        {
            var normalizedSeverity = severity.Trim();
            query = query.Where(x => x.Severity == normalizedSeverity);
        }

        if (fromDate.HasValue)
        {
            var fromUtc = fromDate.Value.ToUniversalTime();
            query = query.Where(x => x.CreatedAtUtc >= fromUtc);
        }

        if (toDate.HasValue)
        {
            var toUtc = toDate.Value.ToUniversalTime();
            query = query.Where(x => x.CreatedAtUtc <= toUtc);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var normalizedKeyword = keyword.Trim();
            query = query.Where(x =>
                x.Description.Contains(normalizedKeyword) ||
                x.ActorDisplayName.Contains(normalizedKeyword) ||
                x.ActionType.Contains(normalizedKeyword));
        }

        return await query
            .OrderByDescending(x => x.ActivityLogId)
            .Take(safeLimit)
            .ToListAsync();
    }
}

public class SystemActivityLogWriteRequest
{
    public int? ActorUserId { get; set; }
    public string? ActorDisplayName { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string Severity { get; set; } = "Info";
    public string Description { get; set; } = string.Empty;
    public string TargetAudience { get; set; } = "Owner";
    public string? MetadataJson { get; set; }
}
