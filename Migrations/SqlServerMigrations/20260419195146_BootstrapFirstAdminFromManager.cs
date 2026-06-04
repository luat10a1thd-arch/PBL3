using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApi.Migrations.SqlServerMigrations
{
    public partial class BootstrapFirstAdminFromManager : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ensure there is at least one Admin account for system settings access.
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [Role] = 1)
                BEGIN
                    ;WITH firstManager AS (
                        SELECT TOP (1) [Id]
                        FROM [Users]
                        WHERE [Role] = 0
                        ORDER BY [Id]
                    )
                    UPDATE u
                    SET [Role] = 1
                    FROM [Users] u
                    INNER JOIN firstManager fm ON fm.[Id] = u.[Id];
                END
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Do not demote the seeded Admin on rollback to avoid accidental lockout.
        }
    }
}
