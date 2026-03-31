namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class ItemIngredient
{
	[Key]
	public int MappingId { get; set; }
	
	[Required]
	public int ItemId { get; set; }
	
	[Required]
	public int IngredientId { get; set; }
	
	[Column(TypeName = "decimal(18, 2)")]
	public decimal Quantity { get; set; }
	
	[ForeignKey("ItemId")]
	public Item Item { get; set; }
	
	[ForeignKey("IngredientId")]
	public Ingredient Ingredient { get; set; }
}