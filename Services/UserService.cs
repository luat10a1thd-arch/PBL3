namespace WebApi.Services;

using AutoMapper;
using BCrypt.Net;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Helpers;
using WebApi.Models.Users;

public interface IUserService
{
    AuthenticateResponse Authenticate(AuthenticateRequest model);
    IEnumerable<User> GetAll();
    User GetById(int id);
    void Register(RegisterRequest model);
    void Update(int id, UpdateRequest model);
    void Delete(int id);
}

public class UserService : IUserService
{
    private DataContext _context;
    private IJwtUtils _jwtUtils;
    private readonly IMapper _mapper;

    public UserService(
        DataContext context,
        IJwtUtils jwtUtils,
        IMapper mapper)
    {
        _context = context;
        _jwtUtils = jwtUtils;
        _mapper = mapper;
    }

    public AuthenticateResponse Authenticate(AuthenticateRequest model)
    {
        var user = _context.Users.SingleOrDefault(x => x.Username == model.Username);

        // validate
        if (user == null || !BCrypt.Verify(model.Password, user.PasswordHash))
            throw new AppException("Username or password is incorrect");

        // authentication successful
        var response = _mapper.Map<AuthenticateResponse>(user);
        response.Token = _jwtUtils.GenerateToken(user);
        return response;
    }

    public IEnumerable<User> GetAll()
    {
        return _context.Users;
    }

    public User GetById(int id)
    {
        return getUser(id);
    }

    public void Register(RegisterRequest model)
    {
        if (string.IsNullOrWhiteSpace(model.Username))
            throw new AppException("Username không được để trống");

        if (string.IsNullOrWhiteSpace(model.Password))
            throw new AppException("Mật khẩu không được để trống");

        var normalizedUsername = model.Username.Trim();

        // validate
        if (_context.Users.Any(x => x.Username == normalizedUsername))
            throw new AppException("Username '" + normalizedUsername + "' is already taken");

        // map model to new user object
        var user = _mapper.Map<User>(model);
        user.Username = normalizedUsername;
        user.Role = NormalizeAccountRole(model.Role);

        // hash password
        user.PasswordHash = BCrypt.HashPassword(model.Password);


        // save user
        _context.Users.Add(user);
        _context.SaveChanges();
    }

    public void Update(int id, UpdateRequest model)
    {
        var user = getUser(id);

        if (!string.IsNullOrWhiteSpace(model.Role))
            model.Role = NormalizeAccountRole(model.Role).ToString();

        if (!string.IsNullOrWhiteSpace(model.Username))
            model.Username = model.Username.Trim();

        // validate
        if (model.Username != user.Username && _context.Users.Any(x => x.Username == model.Username))
            throw new AppException("Username '" + model.Username + "' is already taken");

        // hash password if it was entered
        if (!string.IsNullOrEmpty(model.Password))
            user.PasswordHash = BCrypt.HashPassword(model.Password);

        // copy model to user and save
        _mapper.Map(model, user);
        _context.Users.Update(user);
        _context.SaveChanges();
    }

    public void Delete(int id)
    {
        var user = getUser(id);
        _context.Users.Remove(user);
        _context.SaveChanges();
    }

    // helper methods

    private User getUser(int id)
    {
        var user = _context.Users.Find(id);
        if (user == null) throw new KeyNotFoundException("User not found");
        return user;
    }

    private static Role NormalizeAccountRole(string roleText)
    {
        var text = (roleText ?? string.Empty).Trim().ToLowerInvariant();

        if (text is "admin" or "owner")
            return Role.Admin;

        if (text is "manager" or "quản lí" or "quan li" or "quản lý" or "quan ly" or "chủ quán" or "chu quan")
            return Role.Manager;

        if (text is "staff" or "nhân viên" or "nhan vien")
            return Role.Staff;

        throw new AppException("Chức vụ chỉ hỗ trợ: Admin, Quản lí hoặc Nhân viên");
    }
}
