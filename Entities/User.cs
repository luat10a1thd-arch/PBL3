namespace WebApi.Entities;

using System.Text.Json.Serialization;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

public enum Role
{
    Manager = 0,
    Admin = 1,
    Owner = Admin, // backward compatibility for legacy data
    Staff = 2,

}

public class User
{
    public int Id { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Username { get; set; }
    
    public Role Role { get; set; }

    [JsonIgnore]
    public string PasswordHash { get; set; }

    [NotMapped]
    public int? LastSeenActivityLogId { get; set; }

    public List<Shift> Shift { get; set; }
}
