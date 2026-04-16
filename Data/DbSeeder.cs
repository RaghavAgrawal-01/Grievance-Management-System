using GrievanceSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace GrievanceSystem.Data
{
    public static class DbSeeder
    {
        public static async Task SeedSuperAdmin(AppDbContext context)
        {
            var superAdminEmail = "raghavagrawal2673@gmail.com";
            
            // Check if SuperAdmin already exists
            var existingUser = await context.Users.FirstOrDefaultAsync(u => u.Email == superAdminEmail);
            
            if (existingUser == null)
            {
                var superAdmin = new User
                {
                    Name = "Super Admin",
                    Email = superAdminEmail,
                    Password = "SuperAdmin@123", // In production, this should be hashed
                    Role = "SuperAdmin",
                    IsSuperAdmin = true
                };

                context.Users.Add(superAdmin);
                await context.SaveChangesAsync();
            }
            else if (!existingUser.IsSuperAdmin)
            {
                // Ensure the specific email always has IsSuperAdmin flag
                existingUser.IsSuperAdmin = true;
                existingUser.Role = "SuperAdmin";
                await context.SaveChangesAsync();
            }
        }
    }
}
