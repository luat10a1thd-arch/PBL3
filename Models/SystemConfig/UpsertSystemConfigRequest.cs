namespace WebApi.Models.SystemConfig;

using System.ComponentModel.DataAnnotations;

public class UpsertSystemConfigRequest
{
    [Required]
    public string StoreName { get; set; }

    public string StoreAddress { get; set; }
    public string StorePhone { get; set; }
    public string StoreEmail { get; set; }

    [Required]
    public string TimeZoneId { get; set; }

    [Range(0, 100)]
    public decimal VatRatePercent { get; set; }

    [Required]
    public string OpenTime { get; set; }

    [Required]
    public string CloseTime { get; set; }

    public bool EnableRealtimeSync { get; set; }
    public bool AllowManualShiftOpen { get; set; }

    [Range(15, 1440)]
    public int SessionTimeoutMinutes { get; set; }

    [Range(6, 64)]
    public int MinPasswordLength { get; set; }

    public string? CloudinaryCloudName { get; set; }
    public string? CloudinaryApiKey { get; set; }
    public string? CloudinaryApiSecret { get; set; }
    public string? CloudinaryFolder { get; set; }
}
