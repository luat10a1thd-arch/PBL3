namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Customer
{
	[Key]
	public int CustomerId { get; set; }

	public string Name { get; set; }

	public int phone { get; set; }

	public int point { get; set; }
}