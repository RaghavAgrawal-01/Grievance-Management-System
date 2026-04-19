using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GrievanceSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketNumberStatus : Migration
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "Grievances");
        }
    }
}
