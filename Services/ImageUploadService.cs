namespace WebApi.Services;

using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using WebApi.Helpers;

public interface IImageUploadService
{
    Task<string> UploadImageAsync(IFormFile file);
}

public class CloudinaryImageUploadService : IImageUploadService
{
    private readonly Cloudinary _cloudinary;
    private readonly string _folder;
    private readonly bool _isConfigured;

    public CloudinaryImageUploadService(IConfiguration configuration)
    {
        _cloudinary = null;
        var cloudName = configuration["Cloudinary:CloudName"];
        var apiKey = configuration["Cloudinary:ApiKey"];
        var apiSecret = configuration["Cloudinary:ApiSecret"];
        _folder = configuration["Cloudinary:Folder"] ?? "qlcafe";

        _isConfigured = !string.IsNullOrWhiteSpace(cloudName)
            && !string.IsNullOrWhiteSpace(apiKey)
            && !string.IsNullOrWhiteSpace(apiSecret);

        if (_isConfigured)
        {
            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
        }
    }

    public async Task<string> UploadImageAsync(IFormFile file)
    {
        if (!_isConfigured || _cloudinary == null)
            throw new AppException("Cloudinary chưa được cấu hình đầy đủ");

        if (file == null || file.Length == 0)
            throw new AppException("Vui lòng chọn ảnh để tải lên");

        if (file.Length > 5 * 1024 * 1024)
            throw new AppException("Ảnh vượt quá giới hạn 5MB");

        if (string.IsNullOrWhiteSpace(file.ContentType) || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            throw new AppException("Chỉ chấp nhận tệp ảnh");

        await using var stream = file.OpenReadStream();
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Folder = _folder,
            UseFilename = true,
            UniqueFilename = true,
            Overwrite = false
        };

        var result = await _cloudinary.UploadAsync(uploadParams);
        if (result?.Error != null)
            throw new AppException(result.Error.Message);

        var imageUrl = result?.SecureUrl?.ToString();
        if (string.IsNullOrWhiteSpace(imageUrl))
            throw new AppException("Không thể tải ảnh lên Cloudinary");

        return imageUrl;
    }
}
