using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace GrievanceSystem.Models
{
    public class Grievance
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        public string Email { get; set; }

        [Required]
        public string Subject { get; set; }

        [Required]
        public string Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        
        // Ticket number assigned to the grievance (generated server-side)
        public string? TicketNumber { get; set; }

        // Current status of the grievance (e.g., Open, In Progress, Closed)
        public string? Status { get; set; }
    }
}