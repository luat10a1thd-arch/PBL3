namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class OrderTopping
{
    [Key]
    public int OrderToppingId { get; set; }

    [Required]
    public int OrderDetailId { get; set; }

    [Required]
    public int ToppingId { get; set; }

    public int Quantity { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal Price { get; set; }

    [ForeignKey("OrderDetailId")]
    public OrderDetail OrderDetail { get; set; }

    [ForeignKey("ToppingId")]
    public Toppings Topping { get; set; }
}
