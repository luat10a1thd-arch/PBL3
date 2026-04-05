namespace WebApi.Services;

using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

public interface IIngredientService
{
    Task<List<Ingredient>> GetAll();
    Task<Ingredient?> GetById(int id);
    Task<Ingredient> Create(Ingredient ingredient);
    Task<Ingredient> Update(int id, Ingredient ingredient);
    Task Delete(int id);
    Task<Ingredient> UpdateStock(int id, decimal quantity);
    Task<List<Ingredient>> GetLowStock(decimal threshold = 10);
}

public class IngredientService : IIngredientService
{
    private readonly DataContext _context;

    public IngredientService(DataContext context)
    {
        _context = context;
    }

    public async Task<List<Ingredient>> GetAll()
    {
        return await _context.Ingredients
            .OrderBy(i => i.Name)
            .ToListAsync();
    }

    public async Task<Ingredient?> GetById(int id)
    {
        return await _context.Ingredients.FindAsync(id);
    }

    public async Task<Ingredient> Create(Ingredient ingredient)
    {
        // Validate
        if (string.IsNullOrWhiteSpace(ingredient.Name))
            throw new AppException("Tên nguyên liệu không được để trống");

        if (string.IsNullOrWhiteSpace(ingredient.UoM))
            throw new AppException("Đơn vị tính không được để trống");

        // Check duplicate name
        if (await _context.Ingredients.AnyAsync(i => i.Name == ingredient.Name))
            throw new AppException($"Nguyên liệu '{ingredient.Name}' đã tồn tại");

        _context.Ingredients.Add(ingredient);
        await _context.SaveChangesAsync();
        return ingredient;
    }

    public async Task<Ingredient> Update(int id, Ingredient ingredient)
    {
        var existingIngredient = await _context.Ingredients.FindAsync(id);
        if (existingIngredient == null)
            throw new KeyNotFoundException("Không tìm thấy nguyên liệu");

        // Validate
        if (string.IsNullOrWhiteSpace(ingredient.Name))
            throw new AppException("Tên nguyên liệu không được để trống");

        if (string.IsNullOrWhiteSpace(ingredient.UoM))
            throw new AppException("Đơn vị tính không được để trống");

        // Check duplicate name (excluding current ingredient)
        if (await _context.Ingredients.AnyAsync(i => i.Name == ingredient.Name && i.IngredientId != id))
            throw new AppException($"Nguyên liệu '{ingredient.Name}' đã tồn tại");

        // Update properties
        existingIngredient.Name = ingredient.Name;
        existingIngredient.UoM = ingredient.UoM;
        existingIngredient.StockQty = ingredient.StockQty;

        await _context.SaveChangesAsync();
        return existingIngredient;
    }

    public async Task Delete(int id)
    {
        var ingredient = await _context.Ingredients.FindAsync(id);
        if (ingredient == null)
            throw new KeyNotFoundException("Không tìm thấy nguyên liệu");

        _context.Ingredients.Remove(ingredient);
        await _context.SaveChangesAsync();
    }

    public async Task<Ingredient> UpdateStock(int id, decimal quantity)
    {
        var ingredient = await _context.Ingredients.FindAsync(id);
        if (ingredient == null)
            throw new KeyNotFoundException("Không tìm thấy nguyên liệu");

        ingredient.StockQty += quantity;
        
        if (ingredient.StockQty < 0)
            throw new AppException("Số lượng tồn kho không thể âm");

        await _context.SaveChangesAsync();
        return ingredient;
    }

    public async Task<List<Ingredient>> GetLowStock(decimal threshold = 10)
    {
        return await _context.Ingredients
            .Where(i => i.StockQty <= threshold)
            .OrderBy(i => i.StockQty)
            .ToListAsync();
    }
}
