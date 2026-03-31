namespace WebApi.Entities;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class CustomerVoucher
{
    [Key]
    public int CVId { get; set; }

    public int VoucherId { get; set; }

    public int CustomerId { get; set; }

    public bool IsUsed { get; set; }

    [ForeignKey("VoucherId")]
    public Voucher Voucher { get; set; }

    [ForeignKey("CustomerId")]
    public Customer Customer { get; set; }


}