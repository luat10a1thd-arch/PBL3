namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class OrderDetail
{
    [Key]
    public int OrderDetailId { get; set; }
    [Required]
    public int OrderId { get; set; }
    [Required]
    public int ItemId { get; set; }
    public int Quantity { get; set; }
    [Column(TypeName = "decimal(18, 2)")]
    public decimal TotalPrice { get; set; }
    [ForeignKey("OrderId")]
    public Order Order { get; set; }
    [ForeignKey("ItemId")]
    public Item Item { get; set; }
    public ICollection<OrderTopping> OrderToppings { get; set; }
}
