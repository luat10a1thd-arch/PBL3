namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Voucher
{
    [Key]
    public int VoucherId { get; set; }
    
    public string Code { get; set; }
    
    [Column(TypeName = "decimal(18, 2)")]
    public decimal DiscountAmount { get; set; }
    
    public DateTime ExpiryDate { get; set; }
}