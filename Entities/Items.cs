namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Items
{
	[Key]
	public int ItemId { get; set; }

	[Required]
	public int CategoryId { get; set; }

	public string Name { get; set; }

	[Column(TypeName = "decimal(18, 2)")]
	public decimal BasePrice { get; set; }


}