namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Import
{
	[Key]
	public int ImportId { get; set; }
	
	public int SupplierId { get; set; }

	public int? IngredientId { get; set; }
	
	public DateTime ImportDate { get; set; }

	[Column(TypeName = "decimal(18, 2)")]
	public decimal Quantity { get; set; }

	[Column(TypeName = "decimal(18, 2)")]
	public decimal UnitPrice { get; set; }
	
	[Column(TypeName = "decimal(18, 2)")]
	public decimal TotalCost { get; set; }
	
	[ForeignKey("SupplierId")]
	public Supplier Supplier { get; set; }

	[ForeignKey("IngredientId")]
	public Ingredient Ingredient { get; set; }
}
