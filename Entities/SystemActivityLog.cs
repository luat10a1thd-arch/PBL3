namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class SystemActivityLog
{
    [Key]
    public int ActivityLogId { get; set; }

    public int? ActorUserId { get; set; }

    [MaxLength(128)]
    public string ActorDisplayName { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string ActionType { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string Severity { get; set; } = "Info";

    [Required]
    [MaxLength(512)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(64)]
    public string TargetAudience { get; set; } = "Owner";

    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
