using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApi.Migrations.SqlServerMigrations
{
    public partial class SyncSystemActivityAndVoucherConfig : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ApplicableCategoryId",
                table: "Vouchers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudinaryApiKey",
                table: "SystemConfigs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudinaryApiSecret",
                table: "SystemConfigs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudinaryCloudName",
                table: "SystemConfigs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudinaryFolder",
                table: "SystemConfigs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SystemActivityLogs",
                columns: table => new
                {
                    ActivityLogId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ActorUserId = table.Column<int>(type: "int", nullable: true),
                    ActorDisplayName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    ActionType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    TargetAudience = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    MetadataJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemActivityLogs", x => x.ActivityLogId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Vouchers_ApplicableCategoryId",
                table: "Vouchers",
                column: "ApplicableCategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_Vouchers_Categories_ApplicableCategoryId",
                table: "Vouchers",
                column: "ApplicableCategoryId",
                principalTable: "Categories",
                principalColumn: "CategoryId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vouchers_Categories_ApplicableCategoryId",
                table: "Vouchers");

            migrationBuilder.DropTable(
                name: "SystemActivityLogs");

            migrationBuilder.DropIndex(
                name: "IX_Vouchers_ApplicableCategoryId",
                table: "Vouchers");

            migrationBuilder.DropColumn(
                name: "ApplicableCategoryId",
                table: "Vouchers");

            migrationBuilder.DropColumn(
                name: "CloudinaryApiKey",
                table: "SystemConfigs");

            migrationBuilder.DropColumn(
                name: "CloudinaryApiSecret",
                table: "SystemConfigs");

            migrationBuilder.DropColumn(
                name: "CloudinaryCloudName",
                table: "SystemConfigs");

            migrationBuilder.DropColumn(
                name: "CloudinaryFolder",
                table: "SystemConfigs");
        }
    }
}
