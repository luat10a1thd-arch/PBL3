namespace WebApi.Services;

using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

public interface ISupplierService
{
    Task<List<Supplier>> GetAll();
    Task<Supplier?> GetById(int id);
    Task<Supplier> Create(Supplier supplier);
    Task<Supplier> Update(int id, Supplier supplier);
    Task Delete(int id);
}

public class SupplierService : ISupplierService
{
    private readonly DataContext _context;

    public SupplierService(DataContext context)
    {
        _context = context;
    }

    public async Task<List<Supplier>> GetAll()
    {
        return await _context.Suppliers
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task<Supplier?> GetById(int id)
    {
        return await _context.Suppliers.FindAsync(id);
    }

    public async Task<Supplier> Create(Supplier supplier)
    {
        // Validate
        if (string.IsNullOrWhiteSpace(supplier.Name))
            throw new AppException("Tên nhà cung cấp không được để trống");

        // Check duplicate name
        if (await _context.Suppliers.AnyAsync(s => s.Name == supplier.Name))
            throw new AppException($"Nhà cung cấp '{supplier.Name}' đã tồn tại");

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();
        return supplier;
    }

    public async Task<Supplier> Update(int id, Supplier supplier)
    {
        var existingSupplier = await _context.Suppliers.FindAsync(id);
        if (existingSupplier == null)
            throw new KeyNotFoundException("Không tìm thấy nhà cung cấp");

        // Validate
        if (string.IsNullOrWhiteSpace(supplier.Name))
            throw new AppException("Tên nhà cung cấp không được để trống");

        // Check duplicate name (excluding current supplier)
        if (await _context.Suppliers.AnyAsync(s => s.Name == supplier.Name && s.SupplierId != id))
            throw new AppException($"Nhà cung cấp '{supplier.Name}' đã tồn tại");

        // Update properties
        existingSupplier.Name = supplier.Name;
        existingSupplier.ContactInfo = supplier.ContactInfo;
        existingSupplier.Address = supplier.Address;

        await _context.SaveChangesAsync();
        return existingSupplier;
    }

    public async Task Delete(int id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null)
            throw new KeyNotFoundException("Không tìm thấy nhà cung cấp");

        // Check if supplier has any imports
        var hasImports = await _context.Imports.AnyAsync(i => i.SupplierId == id);
        if (hasImports)
            throw new AppException("Không thể xóa nhà cung cấp đã có lịch sử nhập hàng");

        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync();
    }
}
