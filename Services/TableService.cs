namespace WebApi.Services;

using WebApi.Entities;
using WebApi.Helpers;

public interface ITableService
{
    IEnumerable<Table> GetAll();
    Table GetById(int id);
    Table Create(Table table);
    Table Update(int id, Table table);
    void Delete(int id);
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

    public Table Create(Table table)
    {
        if (table == null) throw new AppException("Dữ liệu bàn không hợp lệ");
        if (table.TableNumber <= 0) throw new AppException("Số bàn phải lớn hơn 0");
        if (table.Capacity <= 0) throw new AppException("Sức chứa phải lớn hơn 0");
        if (_context.Tables.Any(t => t.TableNumber == table.TableNumber))
            throw new AppException($"Bàn số {table.TableNumber} đã tồn tại");

        table.Status = string.IsNullOrWhiteSpace(table.Status) ? "Available" : table.Status.Trim();
        _context.Tables.Add(table);
        _context.SaveChanges();
        return table;
    }

    public Table Update(int id, Table table)
    {
        if (table == null) throw new AppException("Dữ liệu bàn không hợp lệ");
        if (table.TableNumber <= 0) throw new AppException("Số bàn phải lớn hơn 0");
        if (table.Capacity <= 0) throw new AppException("Sức chứa phải lớn hơn 0");

        var existing = GetById(id);
        if (_context.Tables.Any(t => t.TableId != id && t.TableNumber == table.TableNumber))
            throw new AppException($"Bàn số {table.TableNumber} đã tồn tại");

        existing.TableNumber = table.TableNumber;
        existing.Capacity = table.Capacity;
        existing.Status = string.IsNullOrWhiteSpace(table.Status) ? existing.Status : table.Status.Trim();
        _context.Tables.Update(existing);
        _context.SaveChanges();
        return existing;
    }

    public void Delete(int id)
    {
        var table = GetById(id);
        var hasActiveOrder = _context.Orders.Any(o => o.TableId == id && !_context.Payments.Any(p => p.OrderId == o.OrderId));
        if (hasActiveOrder) throw new AppException("Không thể xóa bàn đang có đơn hàng chưa thanh toán");

        _context.Tables.Remove(table);
        _context.SaveChanges();
    }

    public void UpdateStatus(int id, string status)
    {
        if (string.IsNullOrWhiteSpace(status)) throw new AppException("Trạng thái bàn không hợp lệ");
        var table = GetById(id);
        table.Status = status.Trim();
        _context.Tables.Update(table);
        _context.SaveChanges();
    }
}
