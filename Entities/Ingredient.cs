namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Ingredient
{
    [Key]
    public int IngredientId { get; set; }
       
    public string Name { get; set; }
    
    public string UoM { get; set; }
    
     [Column(TypeName = "decimal(18, 2)")]
     public decimal StockQty { get; set; }
}