namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Payment
{
    [Key]
    public int PaymentId { get; set; }

    public int OrderId { get; set; }

    public string Method { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal Price { get; set; }

    public DateTime PaidAt { get; set; }

    [ForeignKey("OrderId")]
    public Order Order { get; set; }
}
