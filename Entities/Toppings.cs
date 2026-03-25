namespace WebApi.Entities;

using system.componentmodel.DataAnnotations;
using system.ComponentModel.DataAnnotations.Schema;

public class Toppings
{
	[Key]
	public int ToppingId { get; set; }
	[Required]
	public string Name { get; set; }
	[Column(TypeName = "decimal(18,2)")]
	public decimal Price { get; set; }
}