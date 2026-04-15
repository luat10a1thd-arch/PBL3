namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Order
{
    [Key]
    public int OrderId { get; set; }

    [Required]
    public int TableId { get; set; }

    [Required]
    public int EmployeeId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Total { get; set; }

    public DateTime CreatedAt { get; set; }

    [ForeignKey("TableId")]
    public Table Table { get; set; }

    [ForeignKey("EmployeeId")]
    public User Employee { get; set; }

    public ICollection<OrderDetail> OrderDetails { get; set; }
}
