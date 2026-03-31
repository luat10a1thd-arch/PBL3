namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Table
{
    [Key]
    public int TableId { get; set; }

    public int TableNumber { get; set; }

    public int Capacity { get; set; }

    public string Status { get; set; } = string.Empty;  
}