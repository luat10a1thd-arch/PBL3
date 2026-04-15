namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Category
{
	[Key]
	public int CategoryId { get; set; }
	
	[Required]
	public string Name { get; set; }
	
	public string Description { get; set; }

	public string ImageUrl { get; set; }
	
}
