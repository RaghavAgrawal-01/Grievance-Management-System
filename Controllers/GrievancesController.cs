using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GrievanceSystem.Data;
using GrievanceSystem.Models;

namespace GrievanceSystem.Controllers
{
    public class GrievancesController : Controller
    {
        private readonly AppDbContext _context;

        public GrievancesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: Grievances
        public async Task<IActionResult> Index()
        {
            return View(await _context.Grievances.ToListAsync());
        }

        // GET: Grievances/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var grievance = await _context.Grievances
                .FirstOrDefaultAsync(m => m.Id == id);

            if (grievance == null)
            {
                return NotFound();
            }

            return View(grievance);
        }

        // GET: Grievances/Create
        public IActionResult Create()
        {
            return View();
        }

        // POST: Grievances/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("Id,Name,Email,Subject,Description")] Grievance grievance)
        {
            // Auto-generate server-side fields before validation
            grievance.CreatedAt = DateTime.Now;
            grievance.TicketNumber = "GRV" + DateTime.UtcNow.Ticks;
            grievance.Status = "Pending";

            if (ModelState.IsValid)
            {
                _context.Add(grievance);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }

            // Temporary debug output for validation errors
            if (!ModelState.IsValid)
            {
                foreach (var error in ModelState.Values.SelectMany(v => v.Errors))
                {
                    Console.WriteLine(error.ErrorMessage);
                }
            }

            return View(grievance);
        }

        // GET: Grievances/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var grievance = await _context.Grievances.FindAsync(id);
            if (grievance == null)
            {
                return NotFound();
            }
            return View(grievance);
        }

        // POST: Grievances/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [Bind("Id,Name,Email,Subject,Description")] Grievance formModel)
        {
            if (id != formModel.Id)
            {
                return NotFound();
            }

            if (!ModelState.IsValid)
            {
                return View(formModel);
            }

            var grievanceToUpdate = await _context.Grievances.FindAsync(id);
            if (grievanceToUpdate == null)
            {
                return NotFound();
            }

            // Update only allowed fields — do not allow client to modify TicketNumber or Status
            grievanceToUpdate.Name = formModel.Name;
            grievanceToUpdate.Email = formModel.Email;
            grievanceToUpdate.Subject = formModel.Subject;
            grievanceToUpdate.Description = formModel.Description;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!GrievanceExists(formModel.Id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return RedirectToAction(nameof(Index));
        }

        // GET: Grievances/Delete/5
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var grievance = await _context.Grievances
                .FirstOrDefaultAsync(m => m.Id == id);

            if (grievance == null)
            {
                return NotFound();
            }

            return View(grievance);
        }

        // POST: Grievances/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var grievance = await _context.Grievances.FindAsync(id);

            if (grievance != null)
            {
                _context.Grievances.Remove(grievance);
            }

            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }

        private bool GrievanceExists(int id)
        {
            return _context.Grievances.Any(e => e.Id == id);
        }

        // GET: Track Complaint Page
        public IActionResult Track()
        {
            return View();
        }

        // POST: Track Complaint
        [HttpPost]
        public async Task<IActionResult> Track(string ticketNumber)
        {
            var grievance = await _context.Grievances
                .FirstOrDefaultAsync(g => g.TicketNumber == ticketNumber);

            if (grievance == null)
            {
                ViewBag.Message = "Invalid Ticket Number";
                return View();
            }

            return View("TrackResult", grievance);
        }
    }
}