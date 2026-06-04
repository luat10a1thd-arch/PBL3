namespace WebApi.Controllers;

using Microsoft.AspNetCore.Mvc;
using WebApi.Authorization;
using WebApi.Entities;
using WebApi.Services;

[Authorize]
[ApiController]
[Route("upload")]
public class UploadController : ControllerBase
{
    private readonly IImageUploadService _imageUploadService;

    public UploadController(IImageUploadService imageUploadService)
    {
        _imageUploadService = imageUploadService;
    }

    [Authorize(Role.Manager)]
    [HttpPost("image")]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
    {
        var imageUrl = await _imageUploadService.UploadImageAsync(file);
        return Ok(new { imageUrl });
    }
}
