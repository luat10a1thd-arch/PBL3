namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Supplier
{
	[Key]
	public int SupplierId { get; set; }
	
	public string Name { get; set; }
	
	public string ContactInfo { get; set; }
	
	public string Address { get; set; }
}