using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApi.Migrations.SqlServerMigrations
{
    public partial class AddShiftClosedAtAndBackfill : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ClosedAt",
                table: "Shifts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.Sql(@"
                ;WITH ranked AS (
                    SELECT
                        ShiftId,
                        EmployeeId,
                        ROW_NUMBER() OVER (PARTITION BY EmployeeId ORDER BY ShiftId DESC) AS rn
                    FROM Shifts
                )
                UPDATE s
                SET ClosedAt = SYSUTCDATETIME()
                FROM Shifts s
                INNER JOIN ranked r ON r.ShiftId = s.ShiftId
                WHERE s.ClosedAt IS NULL
                  AND r.rn > 1;

                UPDATE Shifts
                SET ClosedAt = SYSUTCDATETIME()
                WHERE ClosedAt IS NULL
                  AND Expected > 0;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClosedAt",
                table: "Shifts");
        }
    }
}
