namespace WebApi.Services;

using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

public interface IVoucherService
{
    Task<IEnumerable<Voucher>> GetAll();
    Task<Voucher?> GetById(int id);
    Task<Voucher> Create(Voucher voucher);
    Task<Voucher> Update(int id, Voucher voucher);
    Task Delete(int id);
}

public class VoucherService : IVoucherService
{
    private readonly DataContext _context;

    public VoucherService(DataContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Voucher>> GetAll()
    {
        return await _context.Vouchers
            .Include(v => v.ApplicableCategory)
            .OrderByDescending(v => v.ExpiryDate)
            .ThenBy(v => v.Code)
            .ToListAsync();
    }

    public async Task<Voucher?> GetById(int id)
    {
        return await _context.Vouchers
            .Include(v => v.ApplicableCategory)
            .FirstOrDefaultAsync(v => v.VoucherId == id);
    }

    public async Task<Voucher> Create(Voucher voucher)
    {
        if (voucher == null) throw new AppException("Dữ liệu mã giảm giá không hợp lệ");

        var normalizedCode = NormalizeCode(voucher.Code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
            throw new AppException("Mã giảm giá không được để trống");

        if (voucher.DiscountAmount <= 0)
            throw new AppException("Giá trị giảm phải lớn hơn 0");

        if (voucher.ExpiryDate == default || voucher.ExpiryDate <= DateTime.UtcNow)
            throw new AppException("Hạn sử dụng phải lớn hơn thời điểm hiện tại");
        if (voucher.ApplicableCategoryId.HasValue && voucher.ApplicableCategoryId.Value > 0)
        {
            var categoryExists = await _context.Categories.AnyAsync(c => c.CategoryId == voucher.ApplicableCategoryId.Value);
            if (!categoryExists) throw new AppException("Danh mục áp dụng không tồn tại");
        }

        var exists = await _context.Vouchers.AnyAsync(v => v.Code == normalizedCode);
        if (exists) throw new AppException($"Mã giảm giá '{normalizedCode}' đã tồn tại");

        voucher.Code = normalizedCode;
        if (voucher.ApplicableCategoryId <= 0) voucher.ApplicableCategoryId = null;
        _context.Vouchers.Add(voucher);
        await _context.SaveChangesAsync();
        return await GetById(voucher.VoucherId) ?? voucher;
    }

    public async Task<Voucher> Update(int id, Voucher voucher)
    {
        if (voucher == null) throw new AppException("Dữ liệu mã giảm giá không hợp lệ");
        var existing = await _context.Vouchers.FirstOrDefaultAsync(v => v.VoucherId == id);
        if (existing == null) throw new KeyNotFoundException("Không tìm thấy mã giảm giá");

        var normalizedCode = NormalizeCode(voucher.Code);
        if (string.IsNullOrWhiteSpace(normalizedCode))
            throw new AppException("Mã giảm giá không được để trống");
        if (voucher.DiscountAmount <= 0)
            throw new AppException("Giá trị giảm phải lớn hơn 0");
        if (voucher.ExpiryDate == default || voucher.ExpiryDate <= DateTime.UtcNow)
            throw new AppException("Hạn sử dụng phải lớn hơn thời điểm hiện tại");
        if (voucher.ApplicableCategoryId.HasValue && voucher.ApplicableCategoryId.Value > 0)
        {
            var categoryExists = await _context.Categories.AnyAsync(c => c.CategoryId == voucher.ApplicableCategoryId.Value);
            if (!categoryExists) throw new AppException("Danh mục áp dụng không tồn tại");
        }

        var duplicate = await _context.Vouchers.AnyAsync(v => v.VoucherId != id && v.Code == normalizedCode);
        if (duplicate) throw new AppException($"Mã giảm giá '{normalizedCode}' đã tồn tại");

        existing.Code = normalizedCode;
        existing.DiscountAmount = voucher.DiscountAmount;
        existing.ExpiryDate = voucher.ExpiryDate;
        existing.ApplicableCategoryId = voucher.ApplicableCategoryId > 0 ? voucher.ApplicableCategoryId : null;

        _context.Vouchers.Update(existing);
        await _context.SaveChangesAsync();
        return await GetById(existing.VoucherId) ?? existing;
    }

    public async Task Delete(int id)
    {
        var existing = await _context.Vouchers.FirstOrDefaultAsync(v => v.VoucherId == id);
        if (existing == null) throw new KeyNotFoundException("Không tìm thấy mã giảm giá");

        var isUsed = await _context.CustomerVouchers.AnyAsync(cv => cv.VoucherId == id && cv.IsUsed);
        if (isUsed)
            throw new AppException("Không thể xóa mã giảm giá đã được sử dụng");

        _context.Vouchers.Remove(existing);
        await _context.SaveChangesAsync();
    }

    private static string NormalizeCode(string value)
    {
        return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToUpperInvariant();
    }
}
