namespace WebApi.Authorization;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using WebApi.Entities;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class AuthorizeAttribute : Attribute, IAuthorizationFilter
{
    private readonly IList<Role> _roles;
    public AuthorizeAttribute(params Role[] roles)
    {
        _roles = roles ?? new Role[] { };
    }
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        // skip authorization if action is decorated with [AllowAnonymous] attribute
        var allowAnonymous = context.ActionDescriptor.EndpointMetadata.OfType<AllowAnonymousAttribute>().Any();
        if (allowAnonymous)
            return;

        // authorization
        var user = (User)context.HttpContext.Items["User"];
        if (user == null || (_roles.Any() && !IsRoleAllowed(user.Role, _roles)))
        {
            context.Result = new JsonResult(new { message = "Unauthorized" }) { StatusCode = StatusCodes.Status401Unauthorized };
        }
    }

    private static bool IsRoleAllowed(Role actualRole, IList<Role> allowedRoles)
    {
        if (allowedRoles.Contains(actualRole)) return true;

        // Backward compatibility: legacy Owner maps to Admin
        if (actualRole == Role.Owner && allowedRoles.Contains(Role.Admin)) return true;

        // Admin can access all Manager endpoints
        if (actualRole == Role.Admin && allowedRoles.Contains(Role.Manager)) return true;

        return false;
    }
}
