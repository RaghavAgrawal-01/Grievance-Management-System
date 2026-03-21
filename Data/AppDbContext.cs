using Microsoft.EntityFrameworkCore;
using GrievanceSystem.Models;

namespace GrievanceSystem.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {

        }

        //public DbSet<User> Users { get; set; }

        public DbSet<Grievance> Grievances { get; set; }
    }
}
