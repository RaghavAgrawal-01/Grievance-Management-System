🚀 Grievance Management System

A full-stack web application built using ASP.NET Core Web API + Bootstrap UI that allows users to submit, track, and manage grievances efficiently** with secure role-based access.


📌 Features

👤 User Features

* 📝 Submit complaints with category & priority
* 🔍 Track complaint status using Ticket ID
* 📂 Upload attachments (images/PDF)
* 📋 View "My Complaints" dashboard
* 🔐 Secure login & registration

---

🧑‍💼 Admin Features

* 📊 View all grievances in dashboard
* 🔄 Update complaint status:

   Pending → In Progress → Resolved
* 👥 Manage users
* 📁 View uploaded attachments
* 📤 Export grievance data (CSV)

👑 Super Admin Features

* 🛠️ Promote User → Admin
* 🔽 Demote Admin → User
* ❌ Delete users/admins
* 🔐 Full system control


🔐 Security Features

* JWT Authentication
* Role-Based Access Control (RBAC)
* Protected APIs using `[Authorize]`
* SuperAdmin-only critical operations
* Prevention of:

  Unauthorized admin creation
  Admin deletion by other admins
  Self role modification


🏗️ Tech Stack

💻 Frontend

* HTML5, CSS3
* Bootstrap 5
* JavaScript (Fetch API)

⚙️ Backend

* ASP.NET Core Web API
* Entity Framework Core
* SQL Server (LocalDB)


📂 Project Structure

GrievanceSystem/
│
├── Controllers/
│   ├── AuthController.cs
│   └── GrievanceApiController.cs
│
├── Models/
│   ├── User.cs
│   └── Grievance.cs
│
├── wwwroot/
│   ├── index.html (Landing Page)
│   ├── login.html
│   ├── register.html
│   ├── submit.html
│   ├── search.html
│   ├── admin.html
│   ├── manage-users.html
│   ├── my.html
│   ├── reports.html
│   ├── settings.html
│   ├── app.js
│   └── uploads/
│
└── appsettings.json

---

⚙️ Setup Instructions

1️⃣ Clone Repository

git clone https://github.com/RaghavAgrawal-01/Grievance-Management-System.git

cd Grievance-Management-System
2️⃣ Run Backend

* Open project in Visual Studio
* Press F5 or run:

```
dotnet run
```

---

3️⃣ Access Application

https://localhost:44392/
---

🧪 Test Credentials

👑 Super Admin

* Email: [example@gmail.com](mailto:example@gmail.com)
* Role: SuperAdmin

---

📸 Screenshots (Add later)

* Landing Page
* Login Page
* User Dashboard
* Admin Dashboard
* Reports Page

---

📊 API Endpoints

🔐 Auth APIs

* `POST /api/Auth/register`
* `POST /api/Auth/login`
* `GET /api/Auth/users`
* `PUT /api/Auth/change-role/{id}`
* `DELETE /api/Auth/delete/{id}`

---

📌 Grievance APIs

* `POST /api/GrievanceApi`
* `GET /api/GrievanceApi`
* `GET /api/GrievanceApi/{ticketId}`
* `PUT /api/GrievanceApi/update-status/{id}`
* `GET /api/GrievanceApi/export`

- 🚀 Future Improvements

* 📧 Email notifications
* ☁️ Cloud deployment (Azure/AWS)
* 📱 Mobile responsiveness improvements
* 📊 Advanced analytics dashboard
* 🔔 Real-time updates (SignalR)
