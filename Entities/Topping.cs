namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Toppings
{
	[Key]
	public int ToppingId { get; set; }
	[Required]
	public string Name { get; set; }
	[Column(TypeName = "decimal(18,2)")]
	public decimal Price { get; set; }
}