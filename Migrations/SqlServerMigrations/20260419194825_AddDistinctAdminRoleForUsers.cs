using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApi.Migrations.SqlServerMigrations
{
    public partial class AddDistinctAdminRoleForUsers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Legacy UI treated role value 1 as Manager. Normalize those rows before introducing Admin=1.
            migrationBuilder.Sql(@"
                UPDATE [Users]
                SET [Role] = 0
                WHERE [Role] = 1;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally no-op: cannot reliably infer original rows that were role=1 before normalization.
        }
    }
}
