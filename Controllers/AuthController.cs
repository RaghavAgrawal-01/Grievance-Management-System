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

            // ALWAYS assign role = "User" and ignore any role sent from frontend for security
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
                isSuperAdmin = user.IsSuperAdmin,
                name = user.Name
            });
        }

        private string GenerateToken(User user)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Email), // This ensures User.Identity.Name is the email
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
            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == User.Identity.Name);
            if (currentUser == null) return Unauthorized();

            if (newRole != "User" && newRole != "Admin" && newRole != "SuperAdmin")
                return BadRequest("Invalid role");

            var targetUser = await _context.Users.FindAsync(id);
            if (targetUser == null) return NotFound("User not found");

            // SELF PROTECTION: Cannot modify own role
            if (currentUser.Id == targetUser.Id)
                return BadRequest("You cannot modify your own account");

            // PROTECTION: SuperAdmin target NEVER allowed
            if (targetUser.Role == "SuperAdmin" || targetUser.IsSuperAdmin)
                return BadRequest("SuperAdmin cannot be modified");

            // PROTECTION: Admin target ONLY if currentUser is SuperAdmin
            if (targetUser.Role == "Admin")
            {
                if (currentUser.Role != "SuperAdmin")
                    return BadRequest("Only SuperAdmin can modify Admin");
            }

            // TARGET IS USER: Allow Admin and SuperAdmin
            // (Implicitly handled since only Admin/SuperAdmin can call this)

            targetUser.Role = newRole;
            targetUser.IsSuperAdmin = (newRole == "SuperAdmin");
            
            await _context.SaveChangesAsync();
            return Ok(new { message = $"Role updated to {newRole}", id = targetUser.Id, role = targetUser.Role });
        }

        // DELETE USER
        [HttpDelete("delete/{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == User.Identity.Name);
            if (currentUser == null) return Unauthorized();

            var targetUser = await _context.Users.FindAsync(id);
            if (targetUser == null) return NotFound("User not found");

            // SELF PROTECTION: Cannot delete yourself
            if (currentUser.Id == targetUser.Id)
                return BadRequest("You cannot modify your own account");

            // PROTECTION: SuperAdmin target NEVER allowed
            if (targetUser.Role == "SuperAdmin" || targetUser.IsSuperAdmin)
                return BadRequest("SuperAdmin cannot be deleted");

            // PROTECTION: Admin target ONLY if currentUser is SuperAdmin
            if (targetUser.Role == "Admin")
            {
                if (currentUser.Role != "SuperAdmin")
                    return BadRequest("Only SuperAdmin can modify Admin"); // Or separate message if preferred, but requirement 9 says "Only SuperAdmin can modify Admin" for role and deletion tasks often share logic
            }

            // TARGET IS USER: Allow Admin and SuperAdmin
            // (Implicitly allowed for any Admin/SuperAdmin caller)

            _context.Users.Remove(targetUser);
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

        // FORGOT PASSWORD
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null) return NotFound("User not found");

            // Generate a reset token (JWT for simplicity)
            var token = GenerateResetToken(user);
            
            // Return token as requested
            return Ok(new { token });
        }

        // RESET PASSWORD
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var email = ValidateResetToken(dto.Token);
            if (email == null) return BadRequest("Invalid or expired token");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return NotFound("User not found");

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return BadRequest("New password must be at least 6 characters");

            user.Password = dto.NewPassword;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Password reset successfully" });
        }

        private string GenerateResetToken(User user)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.Email, user.Email),
                new Claim("purpose", "password_reset")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddMinutes(15),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private string? ValidateResetToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"]);
                
                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _config["Jwt:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = _config["Jwt:Audience"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                var purpose = principal.FindFirst("purpose")?.Value;
                if (purpose != "password_reset") return null;

                return principal.FindFirst(ClaimTypes.Email)?.Value;
            }
            catch
            {
                return null;
            }
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

public class ForgotPasswordDto
{
    public string Email { get; set; }
}

public class ResetPasswordDto
{
    public string Token { get; set; }
    public string NewPassword { get; set; }
}
