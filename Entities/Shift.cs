namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Shift
{
    [Key]
    public int ShiftId { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Opening { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Expected { get; set; }

    [ForeignKey("EmployeeId")]
    public User Employee { get; set; }

}