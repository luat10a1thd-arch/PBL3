using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApi.Migrations.SqlServerMigrations
{
    public partial class AddImportUnitPriceAndIngredient : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "IngredientId",
                table: "Imports",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "Imports",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "Imports",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.Sql(@"
                UPDATE Imports
                SET Quantity = 1,
                    UnitPrice = TotalCost
                WHERE Quantity = 0
                  AND UnitPrice = 0
                  AND TotalCost > 0;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Imports_IngredientId",
                table: "Imports",
                column: "IngredientId");

            migrationBuilder.AddForeignKey(
                name: "FK_Imports_Ingredients_IngredientId",
                table: "Imports",
                column: "IngredientId",
                principalTable: "Ingredients",
                principalColumn: "IngredientId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Imports_Ingredients_IngredientId",
                table: "Imports");

            migrationBuilder.DropIndex(
                name: "IX_Imports_IngredientId",
                table: "Imports");

            migrationBuilder.DropColumn(
                name: "IngredientId",
                table: "Imports");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "Imports");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "Imports");
        }
    }
}
