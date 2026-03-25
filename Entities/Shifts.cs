namespace WebApi.Entities;

using system.componentmodel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Shifts
{
    [Key]
    public int ShiftId { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Opening{get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Expected { get; set; }

    [ForeignKey("EmployeeID")]
    public User Employee { get; set; }

}