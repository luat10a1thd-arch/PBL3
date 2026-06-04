namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class SystemConfig
{
    [Key]
    public int Id { get; set; }

    public string StoreName { get; set; } = "CAFE 24/7";

    public string StoreAddress { get; set; } = string.Empty;

    public string StorePhone { get; set; } = string.Empty;

    public string StoreEmail { get; set; } = string.Empty;

    public string TimeZoneId { get; set; } = "Asia/Ho_Chi_Minh";

    [Column(TypeName = "decimal(5,2)")]
    public decimal VatRatePercent { get; set; } = 8m;

    public string OpenTime { get; set; } = "06:00";

    public string CloseTime { get; set; } = "23:00";

    public bool EnableRealtimeSync { get; set; } = true;

    public bool AllowManualShiftOpen { get; set; } = true;

    public int SessionTimeoutMinutes { get; set; } = 480;

    public int MinPasswordLength { get; set; } = 6;

    public string CloudinaryCloudName { get; set; } = string.Empty;

    public string CloudinaryApiKey { get; set; } = string.Empty;

    public string CloudinaryApiSecret { get; set; } = string.Empty;

    public string CloudinaryFolder { get; set; } = "qlcafe";

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
