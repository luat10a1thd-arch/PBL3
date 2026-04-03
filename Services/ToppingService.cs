namespace WebApi.Services;

using WebApi.Entities;
using WebApi.Helpers;

public interface IToppingService
{
    IEnumerable<Toppings> GetAll();
    Toppings GetById(int id);
    void Create(Toppings topping);
    void Update(int id, Toppings topping);
    void Delete(int id);
}

public class ToppingService : IToppingService
{
    private DataContext _context;

    public ToppingService(DataContext context)
    {
        _context = context;
    }

    public IEnumerable<Toppings> GetAll()
    {
        return _context.Toppings.OrderBy(t => t.Name);
    }

    public Toppings GetById(int id)
    {
        var topping = _context.Toppings.Find(id);
        if (topping == null)
            throw new KeyNotFoundException("Topping not found");
        return topping;
    }

    public void Create(Toppings topping)
    {
        if (string.IsNullOrWhiteSpace(topping.Name))
            throw new AppException("Topping name is required");

        if (topping.Price < 0)
            throw new AppException("Topping price must be non-negative");

        if (_context.Toppings.Any(t => t.Name == topping.Name))
            throw new AppException($"Topping '{topping.Name}' already exists");

        _context.Toppings.Add(topping);
        _context.SaveChanges();
    }

    public void Update(int id, Toppings topping)
    {
        var existingTopping = GetById(id);

        if (string.IsNullOrWhiteSpace(topping.Name))
            throw new AppException("Topping name is required");

        if (topping.Price < 0)
            throw new AppException("Topping price must be non-negative");

        if (_context.Toppings.Any(t => t.Name == topping.Name && t.ToppingId != id))
            throw new AppException($"Topping '{topping.Name}' already exists");

        existingTopping.Name = topping.Name;
        existingTopping.Price = topping.Price;

        _context.Toppings.Update(existingTopping);
        _context.SaveChanges();
    }

    public void Delete(int id)
    {
        var topping = GetById(id);

        if (_context.OrderToppings.Any(ot => ot.ToppingId == id))
            throw new AppException("Cannot delete topping that has been ordered");

        _context.Toppings.Remove(topping);
        _context.SaveChanges();
    }
}
