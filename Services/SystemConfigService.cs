namespace WebApi.Services;

using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;
using WebApi.Models.SystemConfig;

public interface ISystemConfigService
{
    Task<SystemConfigDto> Get();
    Task<SystemConfigDto> Upsert(UpsertSystemConfigRequest request);
}

public class SystemConfigService : ISystemConfigService
{
    private readonly DataContext _context;

    public SystemConfigService(DataContext context)
    {
        _context = context;
    }

    public async Task<SystemConfigDto> Get()
    {
        var entity = await GetOrCreateConfigEntity();
        return ToDto(entity);
    }

    public async Task<SystemConfigDto> Upsert(UpsertSystemConfigRequest request)
    {
        ValidateRequest(request);

        var entity = await GetOrCreateConfigEntity();
        entity.StoreName = request.StoreName.Trim();
        entity.StoreAddress = (request.StoreAddress ?? string.Empty).Trim();
        entity.StorePhone = (request.StorePhone ?? string.Empty).Trim();
        entity.StoreEmail = (request.StoreEmail ?? string.Empty).Trim();
        entity.TimeZoneId = request.TimeZoneId.Trim();
        entity.VatRatePercent = request.VatRatePercent;
        entity.OpenTime = request.OpenTime.Trim();
        entity.CloseTime = request.CloseTime.Trim();
        entity.EnableRealtimeSync = request.EnableRealtimeSync;
        entity.AllowManualShiftOpen = request.AllowManualShiftOpen;
        entity.SessionTimeoutMinutes = request.SessionTimeoutMinutes;
        entity.MinPasswordLength = request.MinPasswordLength;
        entity.CloudinaryCloudName = (request.CloudinaryCloudName ?? string.Empty).Trim();
        entity.CloudinaryApiKey = (request.CloudinaryApiKey ?? string.Empty).Trim();
        entity.CloudinaryApiSecret = (request.CloudinaryApiSecret ?? string.Empty).Trim();
        entity.CloudinaryFolder = string.IsNullOrWhiteSpace(request.CloudinaryFolder) ? "qlcafe" : request.CloudinaryFolder.Trim();
        entity.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return ToDto(entity);
    }

    private async Task<SystemConfig> GetOrCreateConfigEntity()
    {
        var entity = await _context.SystemConfigs.OrderBy(x => x.Id).FirstOrDefaultAsync();
        if (entity != null) return entity;

        entity = new SystemConfig();
        _context.SystemConfigs.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    private static void ValidateRequest(UpsertSystemConfigRequest request)
    {
        if (request == null) throw new AppException("Dữ liệu cài đặt không hợp lệ");
        if (string.IsNullOrWhiteSpace(request.StoreName))
            throw new AppException("Tên cửa hàng không được để trống");
        if (string.IsNullOrWhiteSpace(request.TimeZoneId))
            throw new AppException("Múi giờ không được để trống");
        if (!TryParseHourMinute(request.OpenTime))
            throw new AppException("Giờ mở cửa không hợp lệ (HH:mm)");
        if (!TryParseHourMinute(request.CloseTime))
            throw new AppException("Giờ đóng cửa không hợp lệ (HH:mm)");
        if (request.VatRatePercent < 0 || request.VatRatePercent > 100)
            throw new AppException("Thuế VAT phải từ 0 đến 100");
        if (request.SessionTimeoutMinutes < 15 || request.SessionTimeoutMinutes > 1440)
            throw new AppException("Timeout phiên phải từ 15 đến 1440 phút");
        if (request.MinPasswordLength < 6 || request.MinPasswordLength > 64)
            throw new AppException("Độ dài mật khẩu tối thiểu phải từ 6 đến 64");
        var cloudName = (request.CloudinaryCloudName ?? string.Empty).Trim();
        var apiKey = (request.CloudinaryApiKey ?? string.Empty).Trim();
        var apiSecret = (request.CloudinaryApiSecret ?? string.Empty).Trim();
        var anyCloudinaryValue = !string.IsNullOrWhiteSpace(cloudName)
            || !string.IsNullOrWhiteSpace(apiKey)
            || !string.IsNullOrWhiteSpace(apiSecret);
        if (anyCloudinaryValue && (string.IsNullOrWhiteSpace(cloudName) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret)))
            throw new AppException("Cloudinary yêu cầu nhập đủ CloudName, ApiKey và ApiSecret");
    }

    private static bool TryParseHourMinute(string value)
    {
        return TimeOnly.TryParseExact((value ?? string.Empty).Trim(), "HH:mm", out _);
    }

    private static SystemConfigDto ToDto(SystemConfig entity)
    {
        return new SystemConfigDto
        {
            StoreName = entity.StoreName,
            StoreAddress = entity.StoreAddress,
            StorePhone = entity.StorePhone,
            StoreEmail = entity.StoreEmail,
            TimeZoneId = entity.TimeZoneId,
            VatRatePercent = entity.VatRatePercent,
            OpenTime = entity.OpenTime,
            CloseTime = entity.CloseTime,
            EnableRealtimeSync = entity.EnableRealtimeSync,
            AllowManualShiftOpen = entity.AllowManualShiftOpen,
            SessionTimeoutMinutes = entity.SessionTimeoutMinutes,
            MinPasswordLength = entity.MinPasswordLength,
            CloudinaryCloudName = entity.CloudinaryCloudName,
            CloudinaryApiKey = entity.CloudinaryApiKey,
            CloudinaryApiSecret = entity.CloudinaryApiSecret,
            CloudinaryFolder = string.IsNullOrWhiteSpace(entity.CloudinaryFolder) ? "qlcafe" : entity.CloudinaryFolder,
            UpdatedAtUtc = entity.UpdatedAtUtc
        };
    }
}
