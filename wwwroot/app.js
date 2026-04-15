document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const currentPage = window.location.pathname;

    if (currentPage.includes("admin.html")) {
        console.log("Admin page - skipping global redirect");
    } else {
        const isPublicPage = currentPage.includes("index.html") || currentPage.includes("register.html") || currentPage === "/" || currentPage === "";

        if (!isPublicPage && !token) {
            window.location.href = "index.html";
            return;
        }
    }

    // Basic form validation for any form with class 'needs-validation'
    const forms = document.querySelectorAll('.needs-validation');

    // Auto-fill ticket input using localStorage if available
    const ticketIdInput = document.getElementById('ticketId');
    if (ticketIdInput && window.location.pathname.includes('search.html')) {
        const latestTicket = localStorage.getItem('latestTicket');
        if (latestTicket) {
            ticketIdInput.value = latestTicket;
        }
    }

    forms.forEach(form => {
        form.addEventListener('submit', event => {
            let isValid = true;

            // Check all inputs marked as required
            const requiredFields = form.querySelectorAll('[required]');
            requiredFields.forEach(field => {
                const errorMessage = field.parentElement.querySelector('.error-message');
                if (!field.value.trim()) {
                    field.classList.add('is-invalid');
                    if (errorMessage) {
                        errorMessage.style.display = 'block';
                        errorMessage.textContent = 'This field is required';
                    }
                    isValid = false;
                } else {
                    field.classList.remove('is-invalid');
                    if (errorMessage) errorMessage.style.display = 'none';
                }

                // specific type validation
                if (field.type === 'email' && field.value.trim()) {
                    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailPattern.test(field.value.trim())) {
                        field.classList.add('is-invalid');
                        if (errorMessage) {
                            errorMessage.style.display = 'block';
                            errorMessage.textContent = 'Please enter a valid email address';
                        }
                        isValid = false;
                    }
                }
            });

            if (!isValid) {
                event.preventDefault();
                event.stopPropagation();
            } else {
                // If this is the login form, hit the backend API
                if (form.id === 'loginForm') {
                    event.preventDefault();

                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    const submitBtn = form.querySelector('button[type="submit"]');
                    const loginAlert = document.getElementById('loginAlert');

                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing In...';
                    }
                    if (loginAlert) loginAlert.classList.add('d-none');

                    fetch('https://localhost:44392/api/Auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email: email, password: password })
                    })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Invalid email or password');
                            }
                            return response.json();
                        })
                        .then(data => {
                            // Save token and role
                            localStorage.setItem('token', data.token);
                            localStorage.setItem('role', data.role);

                            // Redirect based on role
                            if (data.role === 'Admin') {
                                window.location.href = 'admin.html';
                            } else {
                                window.location.href = 'submit.html';
                            }
                        })
                        .catch(error => {
                            if (loginAlert) {
                                loginAlert.textContent = error.message;
                                loginAlert.classList.remove('d-none');
                            } else {
                                alert(error.message);
                            }
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerText = 'Sign In';
                            }
                        });
                }

                // If submit complaint
                if (form.id === 'complaintForm') {
                    event.preventDefault();

                    const nameField = document.getElementById('name');
                    const emailField = document.getElementById('email');
                    const subjectField = document.getElementById('subject');
                    const descField = document.getElementById('description');
                    const submitBtn = form.querySelector('button[type="submit"]');
                    const submitAlert = document.getElementById('submitAlert');

                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
                    }
                    if (submitAlert) {
                        submitAlert.classList.add('d-none');
                        submitAlert.classList.remove('alert-success', 'alert-danger');
                    }

                    const token = localStorage.getItem('token');
                    if (!token) {
                        window.location.href = 'index.html';
                        return;
                    }

                    fetch('https://localhost:44392/api/GrievanceApi', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            name: nameField.value,
                            email: emailField.value,
                            subject: subjectField.value,
                            description: descField.value
                        })
                    })
                        .then(response => {
                            if (response.status === 401) {
                                localStorage.removeItem('token');
                                window.location.href = 'index.html';
                                throw new Error('Unauthorized');
                            }
                            if (!response.ok) {
                                return response.text().then(text => {
                                    let errorMsg = text;
                                    try {
                                        const jsonErr = JSON.parse(text);
                                        errorMsg = jsonErr.message || jsonErr.title || text;
                                    } catch (e) { }
                                    throw new Error(errorMsg || 'Failed to submit grievance');
                                });
                            }
                            return response.json();
                        })
                        .then(data => {
                            const ticketNum = data.ticketNumber || data.id || 'GEN-TKT-001';
                            localStorage.setItem('latestTicket', ticketNum);

                            if (submitAlert) {
                                submitAlert.classList.add('alert-success');
                                submitAlert.innerHTML = `
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <i class="fas fa-check-circle me-2"></i>
                                        Grievance submitted successfully! Your Ticket Number is: <strong class="ms-1 fs-5">${ticketNum}</strong>
                                    </div>
                                    <button type="button" class="btn btn-sm btn-success fw-bold px-3 shadow-sm" onclick="navigator.clipboard.writeText('${ticketNum}'); this.innerHTML='<i class=\\'fas fa-check\\'></i> Copied!'; setTimeout(()=>this.innerHTML='<i class=\\'fas fa-copy\\'></i> Copy Ticket', 2500);">
                                        <i class="fas fa-copy"></i> Copy Ticket
                                    </button>
                                </div>
                            `;
                                submitAlert.classList.remove('d-none');
                            }
                            form.reset();

                            const inputs = form.querySelectorAll('input, select, textarea');
                            inputs.forEach(i => i.classList.remove('is-invalid'));

                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Submit Grievance';
                            }
                        })
                        .catch(error => {
                            if (error.message === 'Unauthorized') return; // Handled

                            if (submitAlert) {
                                submitAlert.classList.add('alert-danger');
                                submitAlert.textContent = error.message;
                                submitAlert.classList.remove('d-none');
                            } else {
                                alert(error.message);
                            }
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Submit Grievance';
                            }
                        });
                }

                if (form.id === 'registerForm') {
                    event.preventDefault();

                    const name = document.getElementById('fullName').value;
                    const email = document.getElementById('email').value;
                    const pwd = document.getElementById('password').value;
                    const confirmPwd = document.getElementById('confirmPassword').value;
                    const roleSelect = document.getElementById('role');
                    let userRole = roleSelect ? roleSelect.value : 'User';

                    // Explicitly format to backend requirements
                    if (userRole === 'Administrator' || userRole === 'Admin') {
                        userRole = 'Admin';
                    } else {
                        userRole = 'User';
                    }

                    const submitBtn = form.querySelector('button[type="submit"]');
                    const registerAlert = document.getElementById('registerAlert');

                    if (pwd !== confirmPwd) {
                        document.getElementById('confirmPassword').classList.add('is-invalid');
                        const error = document.getElementById('confirmPassword').parentElement.querySelector('.error-message');
                        if (error) {
                            error.style.display = 'block';
                            error.textContent = 'Passwords do not match';
                        }
                        return;
                    }

                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
                    }
                    if (registerAlert) {
                        registerAlert.classList.add('d-none');
                        registerAlert.classList.remove('alert-success', 'alert-danger');
                    }

                    fetch('https://localhost:44392/api/Auth/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name: name, email: email, password: pwd, role: userRole })
                    })
                        .then(response => {
                            if (!response.ok) {
                                return response.text().then(text => {
                                    // Basic parsing if it returns json error or plain text
                                    let errorMsg = text;
                                    try {
                                        const jsonErr = JSON.parse(text);
                                        errorMsg = jsonErr.message || jsonErr.title || text;
                                    } catch (e) { }
                                    throw new Error(errorMsg || 'User already exists or invalid data');
                                });
                            }
                            return response;
                        })
                        .then(() => {
                            if (registerAlert) {
                                registerAlert.classList.add('alert-success');
                                registerAlert.textContent = 'Registration successful! Redirecting to login...';
                                registerAlert.classList.remove('d-none');
                            }
                            setTimeout(() => {
                                window.location.href = 'index.html';
                            }, 2000);
                        })
                        .catch(error => {
                            if (registerAlert) {
                                registerAlert.classList.add('alert-danger');
                                registerAlert.textContent = error.message;
                                registerAlert.classList.remove('d-none');
                            } else {
                                alert(error.message);
                            }
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerText = 'Create Account';
                            }
                        });
                }

                if (form.id === 'searchForm') {
                    event.preventDefault();
                    const ticketInput = document.getElementById('ticketId');
                    const ticketId = ticketInput.value.trim();
                    const resultContainer = document.getElementById('searchResult');
                    const submitBtn = form.querySelector('button[type="submit"]');

                    if (!ticketId) return;

                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Searching...';

                    resultContainer.style.display = 'block';
                    resultContainer.innerHTML = ''; // Clear previous

                    const token = localStorage.getItem('token');
                    const headers = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    fetch(`https://localhost:44392/api/GrievanceApi/search/${encodeURIComponent(ticketId)}`, {
                        method: 'GET',
                        headers: headers
                    })
                        .then(response => {
                            if (response.status === 401) {
                                localStorage.removeItem('token');
                                localStorage.removeItem('role');
                                window.location.href = 'index.html';
                                throw new Error('Unauthorized');
                            }
                            if (response.status === 404) {
                                throw new Error('Ticket not found. Please verify the Ticket ID.');
                            }
                            if (!response.ok) {
                                throw new Error('An error occurred while fetching the ticket details.');
                            }
                            return response.json();
                        })
                        .then(data => {
                            let statusBadge = '<span class="badge bg-secondary rounded-pill px-3 py-2">Unknown</span>';
                            const statusLower = (data.status || 'Pending').toLowerCase();
                            if (statusLower === 'pending') statusBadge = '<span class="badge bg-warning text-dark rounded-pill px-3 py-2">Pending</span>';
                            else if (statusLower === 'in progress') statusBadge = '<span class="badge bg-primary rounded-pill px-3 py-2">In Progress</span>';
                            else if (statusLower === 'resolved') statusBadge = '<span class="badge bg-success rounded-pill px-3 py-2">Resolved</span>';
                            else if (statusLower === 'rejected') statusBadge = '<span class="badge bg-danger rounded-pill px-3 py-2">Rejected</span>';

                            const dateStr = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A';

                            resultContainer.innerHTML = `
                            <div class="alert alert-info mt-4 shadow-sm" role="alert" style="animation: slideUp 0.4s ease-out;">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h4 class="alert-heading fw-bold m-0"><i class="fas fa-ticket-alt me-2"></i>#${data.ticketNumber || ticketId}</h4>
                                    ${statusBadge}
                                </div>
                                <hr>
                                <h5 class="fw-bold mb-2">${data.subject || 'No Subject Provided'}</h5>
                                <p class="mb-3" style="white-space: pre-wrap;">${data.description || 'No detailed description.'}</p>
                                <hr>
                                <div class="row small">
                                    <div class="col-sm-6 mb-2 mb-sm-0">
                                        <strong class="d-block">Submitted By</strong>
                                        ${data.name || 'N/A'} <br>
                                        <a href="mailto:${data.email}" class="alert-link">${data.email || 'N/A'}</a>
                                    </div>
                                    <div class="col-sm-6 mb-2 mb-sm-0">
                                        <strong class="d-block">Date Created</strong>
                                        ${dateStr}
                                    </div>
                                </div>
                            </div>
                        `;
                        })
                        .catch(error => {
                            resultContainer.innerHTML = `
                            <div class="alert alert-danger mt-4 d-flex align-items-center shadow-sm" role="alert" style="animation: slideUp 0.3s ease-out;">
                                <i class="fas fa-exclamation-triangle me-3 fa-2x"></i>
                                <div>
                                    <h5 class="alert-heading fw-bold mb-1">Search Failed</h5>
                                    <p class="mb-0">${error.message}</p>
                                </div>
                            </div>
                        `;
                        })
                        .finally(() => {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<i class="fas fa-search me-1"></i> Search';
                        });
                }
            }
        });
    });

    // Admin Dashboard Logic
    if (window.location.pathname.includes('admin.html')) {
        const token = localStorage.getItem('token');
        const tableBody = document.getElementById('adminTableBody');
        const adminAlert = document.getElementById('adminAlert');

        function loadGrievances() {
            fetch('https://localhost:44392/api/GrievanceApi', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => {
                    if (res.status === 401) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('role');
                        window.location.href = 'index.html';
                        throw new Error('Unauthorized');
                    }
                    if (res.status === 403) {
                        throw new Error('Access Denied: You do not have Admin privileges. Please login as an Admin.');
                    }
                    if (!res.ok) throw new Error('Failed to load grievances from the server.');
                    return res.json();
                })
                .then(data => {
                    if (!tableBody) return;
                    tableBody.innerHTML = '';

                    if (data.length === 0) {
                        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No grievances found.</td></tr>';
                        return;
                    }

                    let pendingCount = 0;
                    let resolvedCount = 0;
                    let rejectedCount = 0;

                    data.forEach(item => {
                        let statusBadge = '<span class="badge bg-secondary rounded-pill px-3 py-2">Unknown</span>';
                        const statusLower = (item.status || 'Pending').toLowerCase();
                        if (statusLower === 'pending') statusBadge = '<span class="badge bg-warning text-dark rounded-pill px-3 py-2">Pending</span>';
                        else if (statusLower === 'in progress') statusBadge = '<span class="badge bg-primary rounded-pill px-3 py-2">In Progress</span>';
                        else if (statusLower === 'resolved') statusBadge = '<span class="badge bg-success rounded-pill px-3 py-2">Resolved</span>';
                        else if (statusLower === 'rejected') statusBadge = '<span class="badge bg-danger rounded-pill px-3 py-2">Rejected</span>';

                        const initials = (item.name || 'U').substring(0, 2).toUpperCase();

                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                        <td class="ps-4 font-monospace fw-bold text-dark">#${item.ticketNumber || item.id}</td>
                        <td class="fw-medium">
                            <div class="d-flex align-items-center">
                                <div class="bg-secondary bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 30px; height: 30px; font-size: 0.75rem; font-weight: bold;">${initials}</div> 
                                ${item.name || 'N/A'}
                            </div>
                        </td>
                        <td><a href="mailto:${item.email}" class="text-decoration-none text-muted">${item.email || 'N/A'}</a></td>
                        <td class="text-truncate" style="max-width: 250px;" title="${item.subject || ''}">${item.subject || 'No Subject'}</td>
                        <td class="text-center">${statusBadge}</td>
                        <td class="pe-4 text-center">
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle shadow-sm" type="button" data-bs-toggle="dropdown">
                                    Action
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-1">
                                    <li><a class="dropdown-item fw-semibold py-2" href="#" onclick="updateTicketStatus('${item.id}', 'Pending'); return false;"><i class="fas fa-clock text-warning me-2"></i> Set Pending</a></li>
                                    <li><a class="dropdown-item fw-semibold py-2" href="#" onclick="updateTicketStatus('${item.id}', 'In Progress'); return false;"><i class="fas fa-spinner text-primary me-2"></i> Set In Progress</a></li>
                                    <li><a class="dropdown-item fw-semibold py-2" href="#" onclick="updateTicketStatus('${item.id}', 'Resolved'); return false;"><i class="fas fa-check-circle text-success me-2"></i> Set Resolved</a></li>
                                </ul>
                            </div>
                        </td>
                    `;
                        tableBody.appendChild(tr);

                        if (statusLower === 'pending' || statusLower === 'in progress') pendingCount++;
                        else if (statusLower === 'resolved') resolvedCount++;
                        else if (statusLower === 'rejected') rejectedCount++;
                    });

                    const pendEl = document.getElementById('pendingCount');
                    if (pendEl) pendEl.textContent = pendingCount;
                    const resEl = document.getElementById('resolvedCount');
                    if (resEl) resEl.textContent = resolvedCount;
                    const rejEl = document.getElementById('rejectedCount');
                    if (rejEl) rejEl.textContent = rejectedCount;
                })
                .catch(err => {
                    if (adminAlert) {
                        adminAlert.className = 'alert alert-danger mb-4';
                        adminAlert.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i> ${err.message}`;
                    }
                });
        }

        function loadStats() {
            fetch('https://localhost:44392/api/GrievanceApi/count', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => {
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    window.location.href = 'index.html';
                    throw new Error('Unauthorized');
                }
                if (res.status === 403) {
                    throw new Error('Access Denied: Admin required for stats.');
                }
                return res.json();
            })
            .then(count => {
                const totalEl = document.getElementById('totalCount');
                if (totalEl) totalEl.textContent = count;
            })
            .catch(console.error);
        }

        loadStats();
        loadGrievances();

        window.updateTicketStatus = function (id, newStatus) {
            fetch(`https://localhost:44392/api/GrievanceApi/update-status/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newStatus)
            })
                .then(res => {
                    if (res.status === 401) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('role');
                        window.location.href = 'index.html';
                        throw new Error('Unauthorized');
                    }
                    if (res.status === 403) {
                        throw new Error('Access Denied: Only Admins can modify statuses.');
                    }
                    if (!res.ok) throw new Error('Failed to update status on the server.');
                    if (adminAlert) {
                        adminAlert.className = 'alert alert-success mb-4 shadow-sm';
                        adminAlert.style.animation = 'slideUp 0.3s ease-out';
                        adminAlert.innerHTML = `<i class="fas fa-check-circle me-2 text-success"></i> Successfully updated ticket status to <strong>${newStatus}</strong>!`;

                        setTimeout(() => {
                            adminAlert.classList.add('d-none');
                        }, 4000);
                    }
                    loadGrievances(); // Refresh table
                })
                .catch(err => {
                    if (adminAlert) {
                        adminAlert.className = 'alert alert-danger mb-4 shadow-sm';
                        adminAlert.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i> ${err.message}`;
                        setTimeout(() => adminAlert.classList.add('d-none'), 5000);
                    }
                });
        };
    }

    // Clear validation errors on input
    const formElements = document.querySelectorAll('form');
    formElements.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                input.classList.remove('is-invalid');
                const errorMessage = input.parentElement.querySelector('.error-message');
                if (errorMessage) errorMessage.style.display = 'none';
            });
        });
    });
});

window.logout = function() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "index.html";
};
