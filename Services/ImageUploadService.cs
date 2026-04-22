namespace WebApi.Services;

using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

public interface IImageUploadService
{
    Task<string> UploadImageAsync(IFormFile file);
}

public class CloudinaryImageUploadService : IImageUploadService
{
    private readonly IConfiguration _configuration;
    private readonly DataContext _context;

    public CloudinaryImageUploadService(IConfiguration configuration, DataContext context)
    {
        _configuration = configuration;
        _context = context;
    }

    public async Task<string> UploadImageAsync(IFormFile file)
    {
        if (file == null || file.Length == 0)
            throw new AppException("Vui lòng chọn ảnh để tải lên");

        if (file.Length > 5 * 1024 * 1024)
            throw new AppException("Ảnh vượt quá giới hạn 5MB");

        if (string.IsNullOrWhiteSpace(file.ContentType) || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            throw new AppException("Chỉ chấp nhận tệp ảnh");

        var credentials = await ResolveCredentials();
        if (!credentials.IsConfigured)
            throw new AppException("Cloudinary chưa được cấu hình đầy đủ");

        var cloudinary = new Cloudinary(new Account(credentials.CloudName, credentials.ApiKey, credentials.ApiSecret));

        await using var stream = file.OpenReadStream();
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Folder = credentials.Folder,
            UseFilename = true,
            UniqueFilename = true,
            Overwrite = false
        };

        var result = await cloudinary.UploadAsync(uploadParams);
        if (result?.Error != null)
            throw new AppException(result.Error.Message);

        var imageUrl = result?.SecureUrl?.ToString();
        if (string.IsNullOrWhiteSpace(imageUrl))
            throw new AppException("Không thể tải ảnh lên Cloudinary");

        return imageUrl;
    }

    private async Task<CloudinaryCredentials> ResolveCredentials()
    {
        var config = await _context.SystemConfigs.AsNoTracking().OrderBy(x => x.Id).FirstOrDefaultAsync();

        var cloudName = FirstNotEmpty(config?.CloudinaryCloudName, _configuration["Cloudinary:CloudName"]);
        var apiKey = FirstNotEmpty(config?.CloudinaryApiKey, _configuration["Cloudinary:ApiKey"]);
        var apiSecret = FirstNotEmpty(config?.CloudinaryApiSecret, _configuration["Cloudinary:ApiSecret"]);
        var folder = FirstNotEmpty(config?.CloudinaryFolder, _configuration["Cloudinary:Folder"], "qlcafe");

        return new CloudinaryCredentials
        {
            CloudName = cloudName,
            ApiKey = apiKey,
            ApiSecret = apiSecret,
            Folder = folder,
            IsConfigured = !string.IsNullOrWhiteSpace(cloudName)
                && !string.IsNullOrWhiteSpace(apiKey)
                && !string.IsNullOrWhiteSpace(apiSecret)
        };
    }

    private static string FirstNotEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value)) return value.Trim();
        }
        return string.Empty;
    }

    private sealed class CloudinaryCredentials
    {
        public string CloudName { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string ApiSecret { get; set; } = string.Empty;
        public string Folder { get; set; } = "qlcafe";
        public bool IsConfigured { get; set; }
    }
}
