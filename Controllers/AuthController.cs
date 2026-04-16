using GrievanceSystem.Data;
using GrievanceSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace GrievanceSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // REGISTER
        [HttpPost("register")]
        public async Task<IActionResult> Register(User user)
        {
            if (_context.Users.Any(u => u.Email == user.Email))
                return BadRequest("User already exists");

            // Forcibly set role to User and IsSuperAdmin to false for security
            user.Role = "User";
            user.IsSuperAdmin = false;

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User Registered successfully" });
        }

        // LOGIN
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginModel login)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == login.Email && u.Password == login.Password);

            if (user == null)
                return Unauthorized("Invalid credentials");

            var token = GenerateToken(user);

            return Ok(new { 
                token, 
                role = user.Role, 
                isSuperAdmin = user.IsSuperAdmin 
            });
        }

        private string GenerateToken(User user)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("IsSuperAdmin", user.IsSuperAdmin.ToString().ToLower())
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"])
            );

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        // GET ALL USERS (Admin and SuperAdmin)
        [HttpGet("users")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new { u.Id, u.Name, u.Email, u.Role, u.IsSuperAdmin })
                .ToListAsync();
            return Ok(users);
        }

        // CHANGE ROLE
        [HttpPut("change-role/{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> ChangeRole(int id, [FromBody] string newRole)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isSuperAdmin = User.HasClaim("IsSuperAdmin", "true");

            if (newRole != "User" && newRole != "Admin" && newRole != "SuperAdmin")
                return BadRequest("Invalid role");

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found");

            // Safety Check: Cannot modify own role
            if (currentUserId == user.Id.ToString())
                return BadRequest("You cannot change your own role.");

            // Security Rule: Admin cannot change another Admin's role
            if (user.Role == "Admin")
                return BadRequest("Admin role cannot be changed by another user");

            // Security Rule: SuperAdmin role protection
            if (user.IsSuperAdmin || user.Role == "SuperAdmin")
                return BadRequest("SuperAdmin role cannot be changed");

            // Only Users can be promoted to Admin
            if (newRole == "Admin" && user.Role != "User")
                return BadRequest("Only Users can be promoted to Admin.");

            // Only SuperAdmin can promote others to SuperAdmin
            if (newRole == "SuperAdmin" && !isSuperAdmin)
                return StatusCode(403, "Only SuperAdmin can promote users to SuperAdmin role.");

            user.Role = newRole;
            user.IsSuperAdmin = (newRole == "SuperAdmin");
            
            await _context.SaveChangesAsync();
            return Ok(new { message = $"Role updated to {newRole}", id = user.Id, role = user.Role });
        }

        // DELETE USER
        [HttpDelete("delete/{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var isSuperAdmin = User.HasClaim("IsSuperAdmin", "true");
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found");

            // Security Rule: Admin and SuperAdmin users cannot be deleted
            if (user.IsSuperAdmin || user.Role == "SuperAdmin")
                return BadRequest("SuperAdmin cannot be deleted.");

            if (user.Role == "Admin")
                return BadRequest("Admin cannot be deleted");

            // Safety Check: Cannot delete yourself
            if (currentUserId == user.Id.ToString())
                return BadRequest("You cannot delete yourself.");

            // Only allow deleting normal users
            if (user.Role != "User")
                return BadRequest("Only normal users can be deleted.");

            // Optional: You might still want to restrict DELETION power to SuperAdmins only
            // If so, keep the following check. If Admins should be able to delete Users, remove it.
            if (!isSuperAdmin)
                return StatusCode(403, "You are not authorized to perform this action (SuperAdmin required)");

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return Ok(new { message = "User deleted successfully" });
        }

        // CHANGE PASSWORD (any authenticated user)
        [HttpPut("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var email = User.FindFirstValue(ClaimTypes.Email);
            var user  = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return NotFound("User not found");

            if (user.Password != dto.CurrentPassword)
                return BadRequest("Current password is incorrect");

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return BadRequest("New password must be at least 6 characters");

            user.Password = dto.NewPassword;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Password changed successfully" });
        }

        // UPDATE PROFILE (any authenticated user)
        [HttpPut("update-profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var email = User.FindFirstValue(ClaimTypes.Email);
            var user  = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return NotFound("User not found");

            // Email uniqueness check (only if email is changing)
            if (!string.IsNullOrWhiteSpace(dto.Email) && dto.Email != user.Email)
            {
                if (_context.Users.Any(u => u.Email == dto.Email))
                    return BadRequest("Email is already in use by another account");
                user.Email = dto.Email;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                user.Name = dto.Name;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Profile updated successfully", name = user.Name, email = user.Email });
        }
    }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────
public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = "";
    public string NewPassword     { get; set; } = "";
}

public class UpdateProfileDto
{
    public string? Name  { get; set; }
    public string? Email { get; set; }
}
