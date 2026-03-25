namespace WebApi.Entities;

using System.Text.Json.Serialization;
using System.Collections.Generic;

public enum Role
{
    Admin,
    Staff,
    Warehouse_manager,
    Owner

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

    public List<Shifts> Shifts { get; set; }
}