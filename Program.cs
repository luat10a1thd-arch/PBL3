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

    // serve static UI files at /UI/*
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(Path.Combine(builder.Environment.ContentRootPath, "UI")),
        RequestPath = "/UI"
    });

    // custom jwt auth middleware
    app.UseMiddleware<JwtMiddleware>();

    app.MapControllers();
    app.MapHub<ShiftHub>("/hubs/shifts");
}

app.Run("http://localhost:4000");
