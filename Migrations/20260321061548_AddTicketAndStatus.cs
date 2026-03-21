using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GrievanceSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketAndStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Grievances",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TicketNumber",
                table: "Grievances",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "Grievances");

            migrationBuilder.DropColumn(
                name: "TicketNumber",
                table: "Grievances");
        }
    }
}
