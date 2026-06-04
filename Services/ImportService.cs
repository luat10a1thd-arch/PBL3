namespace WebApi.Services;

using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

public interface IImportService
{
    Task<List<Import>> GetAll(int? supplierId = null, DateTime? fromDate = null, DateTime? toDate = null);
    Task<Import> GetById(int id);
    Task<Import> Create(Import import);
    Task<Import> Update(int id, Import import);
    Task<StockInResult> StockIn(StockInRequest request);
    Task Delete(int id);
}

public class ImportService : IImportService
{
    private readonly DataContext _context;

    public ImportService(DataContext context)
    {
        _context = context;
    }

    public async Task<List<Import>> GetAll(int? supplierId = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.Imports
            .Include(i => i.Supplier)
            .Include(i => i.Ingredient)
            .AsQueryable();

        if (supplierId.HasValue)
            query = query.Where(i => i.SupplierId == supplierId.Value);

        if (fromDate.HasValue)
            query = query.Where(i => i.ImportDate >= fromDate.Value.Date);

        if (toDate.HasValue)
        {
            var toExclusive = toDate.Value.Date.AddDays(1);
            query = query.Where(i => i.ImportDate < toExclusive);
        }

        return await query
            .OrderByDescending(i => i.ImportDate)
            .ThenByDescending(i => i.ImportId)
            .ToListAsync();
    }

    public async Task<Import> GetById(int id)
    {
        var import = await _context.Imports
            .Include(i => i.Supplier)
            .FirstOrDefaultAsync(i => i.ImportId == id);

        if (import == null)
            throw new KeyNotFoundException("Không tìm thấy phiếu nhập");

        return import;
    }

    public async Task<Import> Create(Import import)
    {
        await ValidateImportInput(import);

        if (import.ImportDate == default)
            import.ImportDate = BusinessTimeHelper.GetNow(_context);

        if (import.Quantity > 0 && import.UnitPrice >= 0)
            import.TotalCost = import.Quantity * import.UnitPrice;

        _context.Imports.Add(import);
        await _context.SaveChangesAsync();

        return await GetById(import.ImportId);
    }

    public async Task<Import> Update(int id, Import import)
    {
        var existingImport = await _context.Imports.FindAsync(id);
        if (existingImport == null)
            throw new KeyNotFoundException("Không tìm thấy phiếu nhập");

        await ValidateImportInput(import);

        existingImport.SupplierId = import.SupplierId;
        existingImport.IngredientId = import.IngredientId;
        existingImport.Quantity = import.Quantity;
        existingImport.UnitPrice = import.UnitPrice;
        existingImport.TotalCost = import.Quantity > 0 && import.UnitPrice >= 0
            ? import.Quantity * import.UnitPrice
            : import.TotalCost;
        existingImport.ImportDate = import.ImportDate == default
            ? existingImport.ImportDate
            : import.ImportDate;

        await _context.SaveChangesAsync();
        return await GetById(id);
    }

    public async Task<StockInResult> StockIn(StockInRequest request)
    {
        if (request == null)
            throw new AppException("Dữ liệu nhập hàng không hợp lệ");

        if (request.SupplierId <= 0)
            throw new AppException("SupplierId không hợp lệ");

        if (request.IngredientId <= 0)
            throw new AppException("IngredientId không hợp lệ");

        if (request.Quantity <= 0)
            throw new AppException("Số lượng nhập phải lớn hơn 0");

        if (request.UnitPrice < 0)
            throw new AppException("Đơn giá không thể âm");

        if (request.TotalCost < 0)
            throw new AppException("Tổng chi phí không thể âm");

        var supplierExists = await _context.Suppliers.AnyAsync(s => s.SupplierId == request.SupplierId);
        if (!supplierExists)
            throw new AppException("Nhà cung cấp không tồn tại");

        var ingredient = await _context.Ingredients.FindAsync(request.IngredientId);
        if (ingredient == null)
            throw new AppException("Nguyên liệu không tồn tại");

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            ingredient.StockQty += request.Quantity;

            var import = new Import
            {
                SupplierId = request.SupplierId,
                IngredientId = request.IngredientId,
                Quantity = request.Quantity,
                UnitPrice = request.UnitPrice,
                TotalCost = request.Quantity * request.UnitPrice,
                ImportDate = request.ImportDate ?? BusinessTimeHelper.GetNow(_context)
            };

            _context.Imports.Add(import);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var savedImport = await GetById(import.ImportId);
            return new StockInResult
            {
                Import = savedImport,
                Ingredient = ingredient
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task Delete(int id)
    {
        var import = await _context.Imports.FindAsync(id);
        if (import == null)
            throw new KeyNotFoundException("Không tìm thấy phiếu nhập");

        _context.Imports.Remove(import);
        await _context.SaveChangesAsync();
    }

    private async Task ValidateImportInput(Import import)
    {
        if (import.SupplierId <= 0)
            throw new AppException("SupplierId không hợp lệ");

        if (!await _context.Suppliers.AnyAsync(s => s.SupplierId == import.SupplierId))
            throw new AppException("Nhà cung cấp không tồn tại");

        if (import.IngredientId.HasValue && import.IngredientId.Value > 0)
        {
            if (!await _context.Ingredients.AnyAsync(i => i.IngredientId == import.IngredientId.Value))
                throw new AppException("Nguyên liệu không tồn tại");
        }

        if (import.TotalCost < 0)
            throw new AppException("Tổng chi phí không thể âm");

        if (import.Quantity < 0)
            throw new AppException("Số lượng không thể âm");

        if (import.UnitPrice < 0)
            throw new AppException("Đơn giá không thể âm");
    }
}

public class StockInRequest
{
    public int SupplierId { get; set; }
    public int IngredientId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalCost { get; set; }
    public DateTime? ImportDate { get; set; }
}

public class StockInResult
{
    public Import Import { get; set; }
    public Ingredient Ingredient { get; set; }
}
