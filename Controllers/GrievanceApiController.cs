using GrievanceSystem.Data;
using GrievanceSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GrievanceSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // 🔐 All APIs protected
    public class GrievanceApiController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GrievanceApiController(AppDbContext context)
        {
            _context = context;
        }

        // =======================
        // GET ALL COMPLAINTS (Admin Only)
        // =======================
        [HttpGet]
        [Authorize(Roles = "Admin")]
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

        // =======================
        // CREATE COMPLAINT (User)
        // =======================
        [HttpPost]
        [Authorize(Roles = "User")]
        public async Task<ActionResult<Grievance>> Create([FromBody] Grievance grievance)
        {
            grievance.TicketNumber = "GRV" + DateTime.Now.Ticks.ToString().Substring(10);
            grievance.Status = "Pending";
            grievance.CreatedAt = DateTime.Now;

            _context.Grievances.Add(grievance);
            await _context.SaveChangesAsync();

            return Ok(grievance);
        }

        // =======================
        // UPDATE STATUS (Admin Only)
        // =======================
        [HttpPut("update-status/{id}")]
        [Authorize(Roles = "Admin")]
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
        [Authorize(Roles = "Admin")]
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
        [Authorize(Roles = "Admin")]
        public IActionResult GetTotalCount()
        {
            var count = _context.Grievances.Count();
            return Ok(count);
        }
    }
}