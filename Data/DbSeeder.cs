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
                    Name = "Raghav",
                    Email = superAdminEmail,
                    Password = "SuperAdmin@123", // In production, this should be hashed
                    Role = "SuperAdmin",
                    IsSuperAdmin = true
                };

                context.Users.Add(superAdmin);
                await context.SaveChangesAsync();
            }
            else
            {
                // Ensure the specific email always has correct values
                bool changed = false;
                if (existingUser.Name != "Raghav") { existingUser.Name = "Raghav"; changed = true; }
                if (existingUser.Role != "SuperAdmin") { existingUser.Role = "SuperAdmin"; changed = true; }
                if (!existingUser.IsSuperAdmin) { existingUser.IsSuperAdmin = true; changed = true; }
                
                if (changed)
                {
                    await context.SaveChangesAsync();
                }
            }

            // Ensure NO ONE ELSE is SuperAdmin (Requirement: Ensure ONLY ONE SuperAdmin exists)
            var otherSuperAdmins = await context.Users
                .Where(u => u.Email != superAdminEmail && (u.Role == "SuperAdmin" || u.IsSuperAdmin))
                .ToListAsync();

            if (otherSuperAdmins.Any())
            {
                foreach (var other in otherSuperAdmins)
                {
                    other.Role = "Admin"; // Demote others to Admin
                    other.IsSuperAdmin = false;
                }
                await context.SaveChangesAsync();
            }
        }
    }
}
