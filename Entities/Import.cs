namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Import
{
	[Key]
	public int ImportId { get; set; }
	
	public int SupplierId { get; set; }
	
	public DateTime ImportDate { get; set; }
	
	[Column(TypeName = "decimal(18, 2)")]
	public decimal TotalCost { get; set; }
	
	[ForeignKey("SupplierId")]
	public Supplier Supplier { get; set; }
}