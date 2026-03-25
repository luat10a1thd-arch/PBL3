namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using system.ComponentModel.DataAnnotations.Schema;

public class Tables 
{
    [Key]
    public int TableId { get; set; }

    public int TableNumber { get; set; }

    public int Capacity { get; set; }

    public string Status { get; set; }
}