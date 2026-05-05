using Microsoft.EntityFrameworkCore;

namespace WebApi.Helpers;

public static class BusinessTimeHelper
{
    public static DateTime GetNow(DataContext context)
    {
        var timeZone = ResolveTimeZone(context);
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
    }

    public static TimeZoneInfo ResolveTimeZone(DataContext context)
    {
        var configured = context.SystemConfigs
            .AsNoTracking()
            .OrderBy(x => x.Id)
            .Select(x => x.TimeZoneId)
            .FirstOrDefault();

        var candidates = new[]
        {
            configured,
            "Asia/Ho_Chi_Minh",
            "SE Asia Standard Time"
        };

        foreach (var value in candidates)
        {
            if (string.IsNullOrWhiteSpace(value)) continue;
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(value.Trim());
            }
            catch
            {
                // continue fallback list
            }
        }

        return TimeZoneInfo.Local;
    }
}
