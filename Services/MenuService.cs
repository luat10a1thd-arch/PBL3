namespace WebApi.Services;

using Microsoft.EntityFrameworkCore;
using WebApi.Entities;
using WebApi.Helpers;

public interface IMenuService
{
    IEnumerable<Category> GetCategories();
    IEnumerable<Item> GetAllItems();
    IEnumerable<Item> GetItemsByCategory(int categoryId);
}

public class MenuService : IMenuService
{
    private DataContext _context;

    public MenuService(DataContext context)
    {
        _context = context;
    }

    public IEnumerable<Category> GetCategories()
    {
        return _context.Categories;
    }

    public IEnumerable<Item> GetAllItems()
    {
        return _context.Items.Include(i => i.Category); // Lấy kèm thông tin Category
    }

    public IEnumerable<Item> GetItemsByCategory(int categoryId)
    {
        return _context.Items.Where(i => i.CategoryId == categoryId);
    }
}
