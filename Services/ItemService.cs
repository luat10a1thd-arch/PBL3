namespace WebApi.Services;

using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

public interface IItemService
{
    IEnumerable<Item> GetAll();
    Item GetById(int id);
    IEnumerable<Item> GetByCategory(int categoryId);
    void Create(Item item);
    void Update(int id, Item item);
    void Delete(int id);
}

public class ItemService : IItemService
{
    private DataContext _context;

    public ItemService(DataContext context)
    {
        _context = context;
    }

    public IEnumerable<Item> GetAll()
    {
        return _context.Items
            .Include(i => i.Category)
            .OrderBy(i => i.Name);
    }

    public Item GetById(int id)
    {
        var item = _context.Items
            .Include(i => i.Category)
            .FirstOrDefault(i => i.ItemId == id);
        
        if (item == null)
            throw new KeyNotFoundException("Item not found");
        
        return item;
    }

    public IEnumerable<Item> GetByCategory(int categoryId)
    {
        return _context.Items
            .Include(i => i.Category)
            .Where(i => i.CategoryId == categoryId)
            .OrderBy(i => i.Name);
    }

    public void Create(Item item)
    {
        if (string.IsNullOrWhiteSpace(item.Name))
            throw new AppException("Item name is required");

        if (item.BasePrice < 0)
            throw new AppException("Item price must be non-negative");

        var category = _context.Categories.Find(item.CategoryId);
        if (category == null)
            throw new AppException("Category does not exist");

        if (_context.Items.Any(i => i.Name == item.Name && i.CategoryId == item.CategoryId))
            throw new AppException($"Item '{item.Name}' already exists in this category");

        var normalizedImageUrl = NormalizeImageUrl(item.ImageUrl);
        item.ImageUrl = string.IsNullOrWhiteSpace(normalizedImageUrl) ? category.ImageUrl : normalizedImageUrl;
        _context.Items.Add(item);
        _context.SaveChanges();
    }

    public void Update(int id, Item item)
    {
        var existingItem = _context.Items.Find(id);
        if (existingItem == null)
            throw new KeyNotFoundException("Item not found");

        if (string.IsNullOrWhiteSpace(item.Name))
            throw new AppException("Item name is required");

        if (item.BasePrice < 0)
            throw new AppException("Item price must be non-negative");

        var category = _context.Categories.Find(item.CategoryId);
        if (category == null)
            throw new AppException("Category does not exist");

        if (_context.Items.Any(i => i.Name == item.Name && i.CategoryId == item.CategoryId && i.ItemId != id))
            throw new AppException($"Item '{item.Name}' already exists in this category");

        existingItem.Name = item.Name;
        existingItem.CategoryId = item.CategoryId;
        existingItem.BasePrice = item.BasePrice;
        var normalizedImageUrl = NormalizeImageUrl(item.ImageUrl);
        existingItem.ImageUrl = string.IsNullOrWhiteSpace(normalizedImageUrl) ? category.ImageUrl : normalizedImageUrl;

        _context.Items.Update(existingItem);
        _context.SaveChanges();
    }

    public void Delete(int id)
    {
        var item = _context.Items.Find(id);
        if (item == null)
            throw new KeyNotFoundException("Item not found");

        if (_context.OrderDetails.Any(od => od.ItemId == id))
            throw new AppException("Cannot delete item that has been ordered");

        _context.Items.Remove(item);
        _context.SaveChanges();
    }

    private static string NormalizeImageUrl(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        return value.Trim();
    }
}
