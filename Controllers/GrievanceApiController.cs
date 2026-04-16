using GrievanceSystem.Data;
using GrievanceSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;
using System.Security.Claims;
using System.Text;

namespace GrievanceSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // 🔐 All APIs protected
    public class GrievanceApiController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public GrievanceApiController(AppDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        // =======================
        // GET ALL COMPLAINTS (Admin Only)
        // =======================
        [HttpGet]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<IEnumerable<Grievance>>> GetAll()
        {
            return await _context.Grievances.ToListAsync();
        }

        // =======================
        // GET BY ID
        // =======================
        [HttpGet("{id}")]
        public async Task<ActionResult<Grievance>> GetById(int id)
        {
            var grievance = await _context.Grievances.FindAsync(id);

            if (grievance == null)
                return NotFound();

            return Ok(grievance);
        }

        // CREATE COMPLAINT (User)
        // =======================
        [HttpPost]
        [Authorize(Roles = "User")]
        public async Task<ActionResult<Grievance>> Create([FromForm] Grievance grievance, IFormFile? file)
        {
            grievance.TicketNumber = "GRV" + DateTime.Now.Ticks.ToString().Substring(10);
            grievance.Status = "Pending";
            grievance.CreatedAt = DateTime.Now;

            if (file != null && file.Length > 0)
            {
                var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                grievance.FilePath = "/uploads/" + fileName;
            }

            _context.Grievances.Add(grievance);
            await _context.SaveChangesAsync();

            return Ok(grievance);
        }

        // =======================
        // UPDATE STATUS (Admin Only)
        // =======================
        [HttpPut("update-status/{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
        {
            var grievance = await _context.Grievances.FindAsync(id);

            if (grievance == null)
                return NotFound();

            grievance.Status = status;
            await _context.SaveChangesAsync();

            return Ok(grievance);
        }

        // =======================
        // DELETE (Admin Only)
        // =======================
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Delete(int id)
        {
            var grievance = await _context.Grievances.FindAsync(id);

            if (grievance == null)
                return NotFound();

            _context.Grievances.Remove(grievance);
            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }

        // =======================
        // SEARCH BY TICKET
        // =======================
        [HttpGet("search/{ticket}")]
        public async Task<IActionResult> GetByTicket(string ticket)
        {
            var grievance = await _context.Grievances
                .FirstOrDefaultAsync(g => g.TicketNumber == ticket);

            if (grievance == null)
                return NotFound();

            return Ok(grievance);
        }

        // =======================
        // COUNT (Dashboard)
        // =======================
        [HttpGet("count")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public IActionResult GetTotalCount()
        {
            var count = _context.Grievances.Count();
            return Ok(count);
        }

        // =======================
        // STATS (Reports page)
        // =======================
        [HttpGet("stats")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetStats()
        {
            var all = await _context.Grievances.ToListAsync();

            var total      = all.Count;
            var pending    = all.Count(g => (g.Status ?? "").ToLower() == "pending");
            var inProgress = all.Count(g => (g.Status ?? "").ToLower() == "in progress");
            var resolved   = all.Count(g => (g.Status ?? "").ToLower() == "resolved");

            // Monthly breakdown for the current year (12 months)
            int year = DateTime.Now.Year;
            var monthlyData = Enumerable.Range(1, 12)
                .Select(m => all.Count(g => g.CreatedAt.Year == year && g.CreatedAt.Month == m))
                .ToList();

            return Ok(new
            {
                total,
                pending,
                inProgress,
                resolved,
                monthlyData
            });
        }

        // =======================
        // GET MY GRIEVANCES (User)
        // =======================
        [HttpGet("my")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<Grievance>>> GetMyGrievances()
        {
            var email = User.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(email)) return Unauthorized();

            var grievances = await _context.Grievances
                .Where(g => g.Email.ToLower() == email.ToLower())
                .OrderByDescending(g => g.CreatedAt)
                .ToListAsync();

            return Ok(grievances);
        }

        // =======================
        // EXPORT (Admin Only) - returns CSV file
        // =======================
        [HttpGet("export")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Export()
        {
            var all = await _context.Grievances.OrderBy(g => g.Id).ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("Id,Name,Email,Subject,Description,TicketNumber,Status,FilePath,CreatedAt");

            string Escape(string? value)
            {
                if (string.IsNullOrEmpty(value)) return string.Empty;
                // double up quotes and wrap in quotes
                return '"' + value.Replace("\"", "\"\"") + '"';
            }

            foreach (var g in all)
            {
                sb.Append(g.Id);
                sb.Append(',');
                sb.Append(Escape(g.Name)); sb.Append(',');
                sb.Append(Escape(g.Email)); sb.Append(',');
                sb.Append(Escape(g.Subject)); sb.Append(',');
                sb.Append(Escape(g.Description)); sb.Append(',');
                sb.Append(Escape(g.TicketNumber)); sb.Append(',');
                sb.Append(Escape(g.Status)); sb.Append(',');
                sb.Append(Escape(g.FilePath)); sb.Append(',');
                sb.AppendLine(g.CreatedAt.ToString("o"));
            }

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return File(bytes, "text/csv", "grievances.csv");
        }
    }
}