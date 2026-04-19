using Xunit;
using GrievanceSystem.Models; // Models namespace
using GrievanceSystem.Controllers; // Controllers namespace

namespace grievancetesting
{
    public class GrievanceProjectTests
    {
        // 1. Model Logic Test: Check karna ki data sahi se store ho raha hai
        [Fact]
        public void User_Role_Assignment_Test()
        {
            // Arrange: Naya user banana
            var user = new User { Name = "ashish", Role = "User" };

            // Act: Role badalna
            user.Role = "Admin";

            // Assert: Kya Role "Admin" hua?
            Assert.Equal("Admin", user.Role);
        }

        // 2. Validation Test: Check karna ki Ticket Number empty nahi hai
        [Fact]
        public void Grievance_TicketNumber_Required_Test()
        {
            // Arrange: Naya grievance object
            var grievance = new Grievance { TicketNumber = "GRV123" };

            // Assert: Kya ticket number null toh nahi?
            Assert.NotNull(grievance.TicketNumber);
        }

        // 3. Security/Admin Test: SuperAdmin flag check karna
        [Fact]
        public void SuperAdmin_Flag_Test()
        {
            // Arrange: User with SuperAdmin status
            var user = new User { IsSuperAdmin = true };

            // Assert: Kya flag correctly 'true' set hua hai? 
            Assert.True(user.IsSuperAdmin);
        }
    }
}