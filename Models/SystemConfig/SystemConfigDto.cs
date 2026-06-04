namespace WebApi.Models.SystemConfig;

public class SystemConfigDto
{
    public string StoreName { get; set; }
    public string StoreAddress { get; set; }
    public string StorePhone { get; set; }
    public string StoreEmail { get; set; }
    public string TimeZoneId { get; set; }
    public decimal VatRatePercent { get; set; }
    public string OpenTime { get; set; }
    public string CloseTime { get; set; }
    public bool EnableRealtimeSync { get; set; }
    public bool AllowManualShiftOpen { get; set; }
    public int SessionTimeoutMinutes { get; set; }
    public int MinPasswordLength { get; set; }
    public string CloudinaryCloudName { get; set; } = string.Empty;
    public string CloudinaryApiKey { get; set; } = string.Empty;
    public string CloudinaryApiSecret { get; set; } = string.Empty;
    public string CloudinaryFolder { get; set; } = "qlcafe";
    public DateTime UpdatedAtUtc { get; set; }
}
