namespace WebApi.Services;

using WebApi.Entities;
using WebApi.Helpers;

public interface ITableService
{
    IEnumerable<Table> GetAll();
    Table GetById(int id);
    void UpdateStatus(int id, string status);
}

public class TableService : ITableService
{
    private DataContext _context;

    public TableService(DataContext context)
    {
        _context = context;
    }

    public IEnumerable<Table> GetAll()
    {
        return _context.Tables;
    }

    public Table GetById(int id)
    {
        var table = _context.Tables.Find(id);
        if (table == null) throw new KeyNotFoundException("Table not found");
        return table;
    }

    public void UpdateStatus(int id, string status)
    {
        var table = GetById(id);
        table.Status = status;
        _context.Tables.Update(table);
        _context.SaveChanges();
    }
}
