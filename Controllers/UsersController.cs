namespace WebApi.Controllers;

using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Helpers;
using WebApi.Models.Users;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("[controller]")]
public class UsersController : ControllerBase
{
    private IUserService _userService;
    private IMapper _mapper;
    private readonly AppSettings _appSettings;
    private readonly ISystemActivityLogService _systemActivityLogService;

    public UsersController(
        IUserService userService,
        IMapper mapper,
        ISystemActivityLogService systemActivityLogService,
        IOptions<AppSettings> appSettings)
    {
        _userService = userService;
        _mapper = mapper;
        _systemActivityLogService = systemActivityLogService;
        _appSettings = appSettings.Value;
    }

    [AllowAnonymous]
    [HttpPost("authenticate")]
    public async Task<IActionResult> Authenticate(AuthenticateRequest model)
    {
        var response = _userService.Authenticate(model);
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(7),
            MaxAge = TimeSpan.FromDays(7),
            IsEssential = true,
            Path = "/"
        };

        Response.Cookies.Append("token", response.Token, cookieOptions);
        await _systemActivityLogService.Write(new SystemActivityLogWriteRequest
        {
            ActorUserId = response.Id,
            ActorDisplayName = $"{response.FirstName} {response.LastName}".Trim(),
            ActionType = "USER_LOGIN",
            Severity = "Info",
            Description = $"Đăng nhập hệ thống ({response.Username})",
            TargetAudience = "Owner"
        });
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var user = (User?)HttpContext.Items["User"];
        Response.Cookies.Delete("token", new CookieOptions
        {
            Path = "/",
            SameSite = SameSiteMode.Lax,
            Secure = false
        });
        if (user != null)
        {
            await _systemActivityLogService.Write(new SystemActivityLogWriteRequest
            {
                ActorUserId = user.Id,
                ActorDisplayName = $"{user.FirstName} {user.LastName}".Trim(),
                ActionType = "USER_LOGOUT",
                Severity = "Info",
                Description = $"Đăng xuất hệ thống ({user.Username})",
                TargetAudience = "Owner"
            });
        }
        return Ok(new { message = "Logged out successfully" });
    }

    [Authorize(Role.Admin, Role.Manager)]
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest model)
    {
        var currentUser = (User?)HttpContext.Items["User"];
        if (currentUser == null) return Unauthorized();

        if (IsManagerRole(model.Role) && currentUser.Role != Role.Admin)
            return Forbid();

        var hasAdmin = _userService.GetAll().Any(u => u.Role == Role.Admin || u.Role == Role.Owner);
        if (currentUser != null && currentUser.Role != Role.Admin && IsAdminRole(model.Role) && hasAdmin)
            return Forbid();

        _userService.Register(model);
        await _systemActivityLogService.Write(new SystemActivityLogWriteRequest
        {
            ActorUserId = currentUser.Id,
            ActorDisplayName = $"{currentUser.FirstName} {currentUser.LastName}".Trim(),
            ActionType = "USER_REGISTER",
            Severity = "Info",
            Description = $"Tạo tài khoản mới với vai trò {model.Role}",
            TargetAudience = "Owner"
        });
        return Ok(new { message = "Registration successful" });
    }

    [Authorize(Role.Admin)]
    [HttpGet]
    public IActionResult GetAll()
    {
        var users = _userService.GetAll();
        return Ok(users);
    }

    [Authorize(Role.Admin)]
    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var user = _userService.GetById(id);
        return Ok(user);
    }

    [Authorize(Role.Admin)]
    [HttpPut("{id}")]
    public IActionResult Update(int id, UpdateRequest model)
    {
        _userService.Update(id, model);
        return Ok(new { message = "User updated successfully" });
    }

    [Authorize(Role.Admin)]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        _userService.Delete(id);
        return Ok(new { message = "User deleted successfully" });
    }

    private static bool IsAdminRole(string roleText)
    {
        var text = (roleText ?? string.Empty).Trim().ToLowerInvariant();
        if (text is "admin" or "owner") return true;
        if (int.TryParse(text, out var roleValue) && roleValue == (int)Role.Admin) return true;
        return false;
    }

    private static bool IsManagerRole(string roleText)
    {
        var text = (roleText ?? string.Empty).Trim().ToLowerInvariant();
        if (text is "manager" or "quản lí" or "quan li" or "quản lý" or "quan ly" or "chủ quán" or "chu quan")
            return true;
        if (int.TryParse(text, out var roleValue) && roleValue == (int)Role.Manager) return true;
        return false;
    }
}
