namespace WebApi.Services;

using WebApi.Entities;
using WebApi.Helpers;

public interface ICategoryService
{
    IEnumerable<Category> GetAll();
    Category GetById(int id);
    void Create(Category category);
    void Update(int id, Category category);
    void Delete(int id);
}

public class CategoryService : ICategoryService
{
    private DataContext _context;

    public CategoryService(DataContext context)
    {
        _context = context;
    }

    public IEnumerable<Category> GetAll()
    {
        return _context.Categories.OrderBy(c => c.Name);
    }

    public Category GetById(int id)
    {
        var category = _context.Categories.Find(id);
        if (category == null)
            throw new KeyNotFoundException("Category not found");
        return category;
    }

    public void Create(Category category)
    {
        if (string.IsNullOrWhiteSpace(category.Name))
            throw new AppException("Category name is required");

        if (_context.Categories.Any(c => c.Name == category.Name))
            throw new AppException($"Category '{category.Name}' already exists");

        _context.Categories.Add(category);
        _context.SaveChanges();
    }

    public void Update(int id, Category category)
    {
        var existingCategory = GetById(id);

        if (string.IsNullOrWhiteSpace(category.Name))
            throw new AppException("Category name is required");

        if (_context.Categories.Any(c => c.Name == category.Name && c.CategoryId != id))
            throw new AppException($"Category '{category.Name}' already exists");

        existingCategory.Name = category.Name;
        existingCategory.Description = category.Description;

        _context.Categories.Update(existingCategory);
        _context.SaveChanges();
    }

    public void Delete(int id)
    {
        var category = GetById(id);

        if (_context.Items.Any(i => i.CategoryId == id))
            throw new AppException("Cannot delete category that has items");

        _context.Categories.Remove(category);
        _context.SaveChanges();
    }
}
