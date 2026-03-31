namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Employee
{
	[Key]
	public int EmployeeId { get; set; }
	
	public string Name { get; set; }
	
	public string Role { get; set; }
	
	public string BasicSalary { get; set; }
}