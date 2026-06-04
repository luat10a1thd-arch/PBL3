using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using WebApi.Authorization;
using WebApi.Helpers;
using WebApi.Hubs;
using WebApi.Services;

var builder = WebApplication.CreateBuilder(args);

// add services to DI container
{
    var services = builder.Services;
    var env = builder.Environment;
 
    // use sql server db
    services.AddDbContext<DataContext>();

    services.AddCors(options =>
    {
        options.AddPolicy("CorsPolicy", policy =>
            policy
                .WithOrigins("http://localhost:4000")
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials());
    });
    services.AddControllers();
    services.AddSignalR();

    // configure swagger
    services.AddEndpointsApiExplorer();
    services.AddSwaggerGen();

    // configure automapper with all automapper profiles from this assembly
    services.AddAutoMapper(typeof(Program));

    // configure strongly typed settings object
    services.Configure<AppSettings>(builder.Configuration.GetSection("AppSettings"));

    // configure DI for application services
    services.AddScoped<IJwtUtils, JwtUtils>();
    services.AddScoped<IUserService, UserService>();
    services.AddScoped<ITableService, TableService>();
    services.AddScoped<IMenuService, MenuService>();
    services.AddScoped<IOrderService, OrderService>();
    services.AddScoped<ICategoryService, CategoryService>();
    services.AddScoped<IItemService, ItemService>();
    services.AddScoped<IToppingService, ToppingService>();
    services.AddScoped<ICashierService, CashierService>();
    services.AddScoped<IShiftService, ShiftService>();
    services.AddScoped<IIngredientService, IngredientService>();
    services.AddScoped<ISupplierService, SupplierService>();
    services.AddScoped<IImportService, ImportService>();
    services.AddScoped<IEmployeeService, EmployeeService>();
    services.AddScoped<IVoucherService, VoucherService>();
    services.AddScoped<IImageUploadService, CloudinaryImageUploadService>();
    services.AddScoped<ISystemConfigService, SystemConfigService>();
    services.AddScoped<ISystemActivityLogService, SystemActivityLogService>();
}

var app = builder.Build();

// migrate any database changes on startup (includes initial db creation)
using (var scope = app.Services.CreateScope())
{
    var dataContext = scope.ServiceProvider.GetRequiredService<DataContext>();    
    dataContext.Database.Migrate();
}

// configure HTTP request pipeline
{
    // configure swagger
    app.UseSwagger();
    app.UseSwaggerUI(x => x.SwaggerEndpoint("/swagger/v1/swagger.json", "WebApi v1"));

    // global cors policy
    app.UseCors("CorsPolicy");

    // global error handler
    app.UseMiddleware<ErrorHandlerMiddleware>();

    // serve static UI files at /UI/*  (backward compat)
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(Path.Combine(builder.Environment.ContentRootPath, "UI")),
        RequestPath = "/UI"
    });

    // serve assets at "/" (for pages served directly at root)
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(Path.Combine(builder.Environment.ContentRootPath, "UI")),
        RequestPath = ""
    });

    // serve assets at "/app" so pages under /app/* can load style.css, Common.js via relative path
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(Path.Combine(builder.Environment.ContentRootPath, "UI")),
        RequestPath = "/app"
    });

    // custom jwt auth middleware
    app.UseMiddleware<JwtMiddleware>();

    app.MapControllers();
    app.MapHub<ShiftHub>("/hubs/shifts");

    // ── Clean URL routes ──────────────────────────────────────────────────
    var uiRoot = Path.Combine(app.Environment.ContentRootPath, "UI");
    IResult ServeUi(string file) =>
        Results.File(Path.Combine(uiRoot, file), "text/html");

    // ── Page routes under /app/* (no conflict with /Orders, /Shifts API routes) ─
    app.MapGet("/",                      () => Results.Redirect("/app/login"));
    app.MapGet("/app/login",             () => ServeUi("LoginPage.html"));
    app.MapGet("/app/dashboard",         () => ServeUi("AdminDashboard.html"));
    app.MapGet("/app/menu",              () => ServeUi("AdminMenuManagement.html"));
    app.MapGet("/app/settings",          () => ServeUi("AdminSettings.html"));
    app.MapGet("/app/orders",            () => ServeUi("Orders.html"));
    app.MapGet("/app/inventory",         () => ServeUi("Inventory.html"));
    app.MapGet("/app/imports",           () => ServeUi("ImportHistory.html"));
    app.MapGet("/app/staff",             () => ServeUi("StaffManagement.html"));
    app.MapGet("/app/suppliers",         () => ServeUi("SupplierManagement.html"));
    app.MapGet("/app/vouchers",          () => ServeUi("VoucherManagement.html"));
    app.MapGet("/app/reports",           () => ServeUi("MonthlyReport.html"));
    app.MapGet("/app/shift-report",      () => ServeUi("ShiftClosingReport.html"));
    app.MapGet("/app/logs",              () => ServeUi("SystemLogs.html"));
    app.MapGet("/app/cashier",           () => ServeUi("CashierInterface.html"));
    app.MapGet("/app/cashier/shift",     () => ServeUi("CashierShiftReport.html"));
    app.MapGet("/app/cashier/inventory", () => ServeUi("StaffInventoryUsage.html"));
}

app.Run("http://localhost:4000");
