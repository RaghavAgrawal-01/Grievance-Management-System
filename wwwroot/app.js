document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const currentPage = window.location.pathname;

    if (currentPage.includes("admin.html")) {
        console.log("Admin page - skipping global redirect");
    } else {
        const isPublicPage = currentPage.includes("index.html") || currentPage.includes("login.html") || currentPage.includes("register.html") || currentPage === "/" || currentPage === "";

        if (!isPublicPage && !token) {
            window.location.href = "login.html";
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
                            // Save token, role and email
                            localStorage.setItem('token', data.token);
                            localStorage.setItem('role', data.role);
                            localStorage.setItem('email', email);
                            localStorage.setItem('isSuperAdmin', data.isSuperAdmin);

                            // Redirect based on role
                            if (data.role === 'Admin' || data.role === 'SuperAdmin') {
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
                        window.location.href = 'login.html';
                        return;
                    }

                    const formData = new FormData();
                    formData.append('name', nameField.value);
                    formData.append('email', emailField.value);
                    formData.append('subject', subjectField.value);
                    formData.append('description', descField.value);

                    const fileInput = document.getElementById('grievanceFile');
                    if (fileInput && fileInput.files[0]) {
                        formData.append('file', fileInput.files[0]);
                    }

                    fetch('https://localhost:44392/api/GrievanceApi', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    })
                        .then(response => {
                            if (response.status === 401) {
                                localStorage.removeItem('token');
                                window.location.href = 'login.html';
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
                    const roleInput = document.getElementById('role');
                    const userRole = roleInput ? roleInput.value : 'User';

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
                                window.location.href = 'login.html';
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
                                window.location.href = 'login.html';
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

        // Cache all loaded rows for client-side filtering
        let allAdminRows = [];

        function getStatusBadge(statusLower) {
            if (statusLower === 'pending')     return '<span class="badge bg-warning text-dark rounded-pill px-3 py-2">Pending</span>';
            if (statusLower === 'in progress') return '<span class="badge bg-primary rounded-pill px-3 py-2">In Progress</span>';
            if (statusLower === 'resolved')    return '<span class="badge bg-success rounded-pill px-3 py-2">Resolved</span>';
            if (statusLower === 'rejected')    return '<span class="badge bg-danger rounded-pill px-3 py-2">Rejected</span>';
            return '<span class="badge bg-secondary rounded-pill px-3 py-2">Unknown</span>';
        }

        function applyFilters() {
            const searchVal = (document.getElementById('adminSearch')?.value || '').toLowerCase().trim();
            const statusVal = (document.getElementById('adminStatusFilter')?.value || '').toLowerCase();

            let visible = 0;
            allAdminRows.forEach(({ tr, searchKey, statusLower }) => {
                const matchSearch = !searchVal || searchKey.includes(searchVal);
                const matchStatus = !statusVal || statusLower === statusVal;
                const show = matchSearch && matchStatus;
                tr.style.display = show ? '' : 'none';
                if (show) visible++;
            });

            const entryEl = document.getElementById('adminEntryCount');
            if (entryEl) {
                entryEl.textContent = visible === allAdminRows.length
                    ? `Showing all ${allAdminRows.length} entr${allAdminRows.length === 1 ? 'y' : 'ies'}`
                    : `Showing ${visible} of ${allAdminRows.length} entr${allAdminRows.length === 1 ? 'y' : 'ies'}`;
            }

            // Empty-state row when nothing matches
            const noMatchId = 'adminNoMatch';
            const existing = document.getElementById(noMatchId);
            if (visible === 0 && allAdminRows.length > 0) {
                if (!existing) {
                    const tr = document.createElement('tr');
                    tr.id = noMatchId;
                    tr.innerHTML = '<td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-search me-2"></i>No results match your filter.</td>';
                    tableBody.appendChild(tr);
                }
            } else if (existing) {
                existing.remove();
            }
        }

        function loadGrievances() {
            const refreshBtn = document.getElementById('adminRefreshBtn');
            if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...'; }

            // Show skeleton loader
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status" style="width:2rem;height:2rem;"><span class="visually-hidden">Loading...</span></div>
                    <div class="text-muted mt-2 small">Fetching grievances...</div>
                </td></tr>`;
            }

            fetch('https://localhost:44392/api/GrievanceApi', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => {
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    window.location.href = 'login.html';
                    throw new Error('Unauthorized');
                }
                if (res.status === 403) throw new Error('Access Denied: You do not have Admin privileges.');
                if (!res.ok) throw new Error('Failed to load grievances from the server.');
                return res.json();
            })
            .then(data => {
                if (!tableBody) return;
                tableBody.innerHTML = '';
                allAdminRows = [];

                // ── Calculate stats ──────────────────────────────────────
                let total = data.length;
                let pending = 0, inProgress = 0, resolved = 0, rejected = 0;

                if (total === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted"><i class="fas fa-inbox fa-2x mb-2 d-block"></i>No grievances found.</td></tr>';
                    updateAdminStats(0, 0, 0, 0, 0);
                    return;
                }

                data.forEach(item => {
                    const statusLower = (item.status || 'pending').toLowerCase();
                    if      (statusLower === 'pending')     pending++;
                    else if (statusLower === 'in progress') inProgress++;
                    else if (statusLower === 'resolved')    resolved++;
                    else if (statusLower === 'rejected')    rejected++;

                    const initials = (item.name || 'U').substring(0, 2).toUpperCase();
                    const dateStr  = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                    const ticketDisplay = item.ticketNumber || item.id || '?';

                    const tr = document.createElement('tr');
                    tr.style.transition = 'background 0.15s';
                    tr.innerHTML = `
                        <td class="ps-4 font-monospace fw-bold text-dark">#${ticketDisplay}</td>
                        <td class="fw-medium">
                            <div class="d-flex align-items-center">
                                <div class="bg-secondary bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center me-2"
                                    style="width:30px;height:30px;font-size:0.75rem;font-weight:bold;flex-shrink:0">${initials}</div>
                                ${item.name || 'N/A'}
                            </div>
                        </td>
                        <td><a href="mailto:${item.email}" class="text-decoration-none text-muted">${item.email || 'N/A'}</a></td>
                        <td class="text-truncate" style="max-width:250px;" title="${item.subject || ''}">${item.subject || 'No Subject'}</td>
                        <td class="text-center">${getStatusBadge(statusLower)}</td>
                        <td class="text-center">
                            ${item.filePath ? `<a href="${item.filePath}" target="_blank" class="btn btn-sm btn-light border shadow-sm fw-semibold"><i class="fas fa-paperclip me-1"></i>View</a>` : '<span class="text-muted small">—</span>'}
                        </td>
                        <td class="pe-4 text-center">
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle shadow-sm" type="button" data-bs-toggle="dropdown">Action</button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-1">
                                    <li><a class="dropdown-item fw-semibold py-2" href="#" onclick="updateTicketStatus('${item.id}','Pending');return false;"><i class="fas fa-hourglass-half text-warning me-2"></i>Set Pending</a></li>
                                    <li><a class="dropdown-item fw-semibold py-2" href="#" onclick="updateTicketStatus('${item.id}','In Progress');return false;"><i class="fas fa-spinner text-primary me-2"></i>Set In Progress</a></li>
                                    <li><a class="dropdown-item fw-semibold py-2" href="#" onclick="updateTicketStatus('${item.id}','Resolved');return false;"><i class="fas fa-check-circle text-success me-2"></i>Set Resolved</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item fw-semibold py-2 text-danger" href="#" onclick="updateTicketStatus('${item.id}','Rejected');return false;"><i class="fas fa-times-circle text-danger me-2"></i>Set Rejected</a></li>
                                </ul>
                            </div>
                        </td>`;
                    tableBody.appendChild(tr);

                    // Store metadata for client-side filtering
                    allAdminRows.push({
                        tr,
                        statusLower,
                        searchKey: `${ticketDisplay} ${item.name || ''} ${item.email || ''} ${item.subject || ''}`.toLowerCase()
                    });
                });

                updateAdminStats(total, pending, inProgress, resolved, rejected);
                applyFilters(); // apply any active filter after reload
            })
            .catch(err => {
                if (err.message === 'Unauthorized') return;
                if (tableBody) {
                    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-5">
                        <div class="alert alert-danger d-inline-block shadow-sm">
                            <i class="fas fa-exclamation-triangle me-2"></i>${err.message}
                        </div></td></tr>`;
                }
                if (adminAlert) {
                    adminAlert.className = 'alert alert-danger mb-4';
                    adminAlert.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i> ${err.message}`;
                    adminAlert.classList.remove('d-none');
                }
            })
            .finally(() => {
                if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh'; }
            });
        }

        function updateAdminStats(total, pending, inProgress, resolved, rejected) {
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            set('totalCount',      total);
            set('pendingCount',    pending);
            set('inProgressCount', inProgress);
            set('resolvedCount',   resolved);
            set('rejectedCount',   rejected);

            const entryEl = document.getElementById('adminEntryCount');
            if (entryEl) entryEl.textContent = `Showing all ${total} entr${total === 1 ? 'y' : 'ies'}`;
        }

        // Wire up search & filter inputs
        const searchInput  = document.getElementById('adminSearch');
        const statusSelect = document.getElementById('adminStatusFilter');
        if (searchInput)  searchInput.addEventListener('input',  applyFilters);
        if (statusSelect) statusSelect.addEventListener('change', applyFilters);

        // Expose for Refresh button and status-update reload
        window.reloadAdminGrievances = loadGrievances;

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
                    window.location.href = 'login.html';
                    throw new Error('Unauthorized');
                }
                if (res.status === 403) throw new Error('Access Denied: Only Admins can modify statuses.');
                if (!res.ok) throw new Error('Failed to update status on the server.');

                if (adminAlert) {
                    adminAlert.className = 'alert alert-success mb-4 shadow-sm';
                    adminAlert.style.animation = 'slideUp 0.3s ease-out';
                    adminAlert.innerHTML = `<i class="fas fa-check-circle me-2 text-success"></i> Status updated to <strong>${newStatus}</strong> successfully!`;
                    adminAlert.classList.remove('d-none');
                    setTimeout(() => adminAlert.classList.add('d-none'), 4000);
                }
                loadGrievances();
            })
            .catch(err => {
                if (err.message === 'Unauthorized') return;
                if (adminAlert) {
                    adminAlert.className = 'alert alert-danger mb-4 shadow-sm';
                    adminAlert.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i> ${err.message}`;
                    adminAlert.classList.remove('d-none');
                    setTimeout(() => adminAlert.classList.add('d-none'), 5000);
                }
            });
        };
    }

    // My Grievances Page Logic
    if (window.location.pathname.includes('my.html')) {
        const myToken = localStorage.getItem('token');
        const myEmail = localStorage.getItem('email') || '';

        // Show user avatar / email in navbar
        const avatar = document.getElementById('userAvatar');
        const emailDisplay = document.getElementById('userEmailDisplay');
        if (myEmail) {
            const initials = myEmail.substring(0, 2).toUpperCase();
            if (avatar) avatar.textContent = initials;
            if (emailDisplay) {
                emailDisplay.textContent = myEmail;
                emailDisplay.classList.remove('d-none');
            }
        }

        window.loadMyGrievances = function () {
            const tableBody = document.getElementById('myGrievancesTableBody');
            const alertEl = document.getElementById('myGrievancesAlert');
            const refreshBtn = document.getElementById('refreshBtn');

            // Show loading spinner
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr id="loadingRow">
                        <td colspan="4" class="text-center" style="padding: 48px 0;">
                            <div class="spinner-border text-primary" role="status" style="width:2rem;height:2rem;"><span class="visually-hidden">Loading...</span></div>
                            <div class="text-muted mt-2 small">Fetching your grievances...</div>
                        </td>
                    </tr>`;
            }
            if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing...'; }
            if (alertEl) alertEl.classList.add('d-none');

            fetch('https://localhost:44392/api/GrievanceApi/my', {
                headers: { 'Authorization': `Bearer ${myToken}` }
            })
            .then(res => {
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    window.location.href = 'login.html';
                    throw new Error('Unauthorized');
                }
                if (!res.ok) throw new Error('Failed to load your grievances. Please try again.');
                return res.json();
            })
            .then(myData => {

                if (!tableBody) return;
                tableBody.innerHTML = '';

                if (myData.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="4">
                                <div class="text-center empty-state">
                                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                                    <h5 class="fw-semibold text-muted">No grievances found</h5>
                                    <p class="text-muted small mb-3">You haven't submitted any complaints yet.</p>
                                    <a href="submit.html" class="btn btn-primary btn-sm px-4">
                                        <i class="fas fa-plus me-1"></i> Submit Your First Grievance
                                    </a>
                                </div>
                            </td>
                        </tr>`;
                    updateMyStats(0, 0, 0, 0);
                    return;
                }

                let pending = 0, inProgress = 0, resolved = 0;

                myData.forEach(item => {
                    const statusLower = (item.status || 'pending').toLowerCase();
                    let statusBadge = '<span class="badge bg-secondary rounded-pill px-3 py-2 status-pill">Unknown</span>';
                    if (statusLower === 'pending') {
                        statusBadge = '<span class="badge bg-warning text-dark rounded-pill px-3 py-2 status-pill">Pending</span>';
                        pending++;
                    } else if (statusLower === 'in progress') {
                        statusBadge = '<span class="badge bg-primary rounded-pill px-3 py-2 status-pill">In Progress</span>';
                        inProgress++;
                    } else if (statusLower === 'resolved') {
                        statusBadge = '<span class="badge bg-success rounded-pill px-3 py-2 status-pill">Resolved</span>';
                        resolved++;
                    } else if (statusLower === 'rejected') {
                        statusBadge = '<span class="badge bg-danger rounded-pill px-3 py-2 status-pill">Rejected</span>';
                    }

                    const dateStr = item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'N/A';

                    const ticketDisplay = item.ticketNumber || ('#' + (item.id || '?'));

                    const tr = document.createElement('tr');
                    tr.className = 'ticket-row fade-in';
                    tr.innerHTML = `
                        <td class="ps-4 font-monospace fw-bold text-dark">${ticketDisplay}</td>
                        <td class="fw-medium text-truncate" style="max-width: 320px;" title="${item.subject || ''}">${item.subject || 'No Subject'}</td>
                        <td>${statusBadge}</td>
                        <td class="text-muted">${dateStr}</td>
                    `;
                    tableBody.appendChild(tr);
                });

                updateMyStats(myData.length, pending, inProgress, resolved);
            })
            .catch(err => {
                if (err.message === 'Unauthorized') return;
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr><td colspan="4" class="text-center py-5">
                            <div class="alert alert-danger d-inline-block shadow-sm">
                                <i class="fas fa-exclamation-triangle me-2"></i>${err.message}
                            </div>
                        </td></tr>`;
                }
                if (alertEl) {
                    alertEl.className = 'alert alert-danger mb-4';
                    alertEl.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>${err.message}`;
                    alertEl.classList.remove('d-none');
                }
            })
            .finally(() => {
                if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh'; }
            });
        };

        function updateMyStats(total, pending, inProgress, resolved) {
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            set('myTotal', total);
            set('myPending', pending);
            set('myInProgress', inProgress);
            set('myResolved', resolved);
        }

        loadMyGrievances();
    }

    // ── Manage Users Page Logic ─────────────────────────────────────────────
    if (window.location.pathname.includes('manage-users.html')) {
        const token = localStorage.getItem('token');
        const role  = localStorage.getItem('role');

        // Admin/SuperAdmin guard
        if (!token || (role !== 'Admin' && role !== 'SuperAdmin')) {
            window.location.href = 'login.html';
        }

        const isSuperAdminUI = localStorage.getItem('isSuperAdmin') === 'true';

        const tableBody   = document.getElementById('usersTableBody');
        const alertEl     = document.getElementById('userAlert');
        const refreshBtn  = document.getElementById('refreshUsersBtn');
        const searchInput = document.getElementById('userSearch');

        let allUserRows = []; // cache for client-side search
        let pendingDeleteId = null; // for confirm modal

        // Bootstrap modal instance
        const confirmModalEl  = document.getElementById('confirmModal');
        const confirmModal    = confirmModalEl ? new bootstrap.Modal(confirmModalEl) : null;
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

        function showAlert(msg, type = 'danger') {
            if (!alertEl) return;
            alertEl.className = `alert alert-${type} mb-4 shadow-sm`;
            alertEl.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>${msg}`;
            alertEl.classList.remove('d-none');
            setTimeout(() => alertEl.classList.add('d-none'), 5000);
        }

        function getRoleBadge(role) {
            if (role === 'SuperAdmin') return '<span class="role-badge role-badge-admin" style="background:#6610f2;color:#fff">Super Admin</span>';
            return role === 'Admin'
                ? '<span class="role-badge role-badge-admin">Admin</span>'
                : '<span class="role-badge role-badge-user">User</span>';
        }

        function applyUserSearch() {
            const q = (searchInput?.value || '').toLowerCase().trim();
            let visible = 0;
            allUserRows.forEach(({ tr, searchKey }) => {
                const show = !q || searchKey.includes(q);
                tr.style.display = show ? '' : 'none';
                if (show) visible++;
            });
            const countEl = document.getElementById('userEntryCount');
            if (countEl) {
                countEl.textContent = visible === allUserRows.length
                    ? `Showing all ${allUserRows.length} user${allUserRows.length !== 1 ? 's' : ''}`
                    : `Showing ${visible} of ${allUserRows.length} user${allUserRows.length !== 1 ? 's' : ''}`;
            }
            const noMatch = document.getElementById('userNoMatch');
            if (visible === 0 && allUserRows.length > 0) {
                if (!noMatch) {
                    const tr = document.createElement('tr');
                    tr.id = 'userNoMatch';
                    tr.innerHTML = '<td colspan="5" class="text-center py-4 text-muted"><i class="fas fa-search me-2"></i>No users match your search.</td>';
                    tableBody.appendChild(tr);
                }
            } else if (noMatch) {
                noMatch.remove();
            }
        }

        window.loadUsers = function () {
            if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...'; }
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status" style="width:2rem;height:2rem;"><span class="visually-hidden">Loading...</span></div>
                    <div class="text-muted mt-2 small">Fetching users...</div>
                </td></tr>`;
            }

            fetch('https://localhost:44392/api/Auth/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => {
                if (res.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('role'); window.location.href = 'login.html'; throw new Error('Unauthorized'); }
                if (res.status === 403) throw new Error('Access Denied: Admin privileges required.');
                if (!res.ok) throw new Error('Failed to load users from the server.');
                return res.json();
            })
            .then(data => {
                if (!tableBody) return;
                tableBody.innerHTML = '';
                allUserRows = [];

                // Stat counts
                const totalAdmins = data.filter(u => u.role === 'Admin' || u.role === 'SuperAdmin').length;
                const totalUsers  = data.filter(u => u.role === 'User').length;
                const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
                set('statTotal',  data.length);
                set('statAdmins', totalAdmins);
                set('statUsers',  totalUsers);

                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted"><i class="fas fa-users fa-2x d-block mb-2"></i>No registered users found.</td></tr>';
                    const countEl = document.getElementById('userEntryCount');
                    if (countEl) countEl.textContent = 'No users found';
                    return;
                }

                data.forEach((user, index) => {
                    const initials = (user.name || 'U').substring(0, 2).toUpperCase();
                    const avatarColor = user.role === 'Admin' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-secondary bg-opacity-25 text-secondary';
                    const oppositeRole = user.role === 'Admin' ? 'User' : 'Admin';
                    const changeRoleIcon = user.role === 'Admin' ? 'fa-user-minus' : 'fa-user-shield';
                    const changeRoleLabel = user.role === 'Admin' ? 'Set as User' : 'Set as Admin';
                    const changeRoleBtnClass = user.role === 'Admin' ? 'btn-outline-secondary' : 'btn-outline-primary';

                    const tr = document.createElement('tr');
                    tr.className = 'user-row fade-in';
                    
                    // Conditionally show actions only if logged-in user is SuperAdmin
                    // and don't allow actions on other SuperAdmins
                    const showActions = isSuperAdminUI && !user.isSuperAdmin;

                    tr.innerHTML = `
                        <td class="ps-4 text-muted fw-semibold">${index + 1}</td>
                        <td class="fw-medium">
                            <div class="d-flex align-items-center">
                                <div class="avatar-circle ${avatarColor} me-2">${initials}</div>
                                <span>${user.name || 'N/A'}</span>
                            </div>
                        </td>
                        <td><a href="mailto:${user.email}" class="text-decoration-none text-muted">${user.email || 'N/A'}</a></td>
                        <td class="text-center" id="role-cell-${user.id}">${getRoleBadge(user.role)}</td>
                        <td class="text-center pe-4">
                            <div class="d-flex justify-content-center gap-2 ${showActions ? '' : 'd-none'}">
                                <button class="btn btn-sm ${changeRoleBtnClass} fw-semibold shadow-sm"
                                    id="role-btn-${user.id}"
                                    onclick="window.changeUserRole(${user.id}, '${oppositeRole}')"
                                    title="${changeRoleLabel}">
                                    <i class="fas ${changeRoleIcon} me-1"></i>${changeRoleLabel}
                                </button>
                                <button class="btn btn-sm btn-outline-danger fw-semibold shadow-sm"
                                    onclick="window.confirmDeleteUser(${user.id}, '${(user.name || 'this user').replace(/'/g, "\\'")}')"
                                    title="Delete user">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            <span class="${showActions ? 'd-none' : 'text-muted small'}">${user.isSuperAdmin ? 'Protected' : 'No Access'}</span>
                        </td>`;
                    tableBody.appendChild(tr);

                    allUserRows.push({
                        tr,
                        searchKey: `${user.name || ''} ${user.email || ''}`.toLowerCase()
                    });
                });

                const countEl = document.getElementById('userEntryCount');
                if (countEl) countEl.textContent = `Showing all ${data.length} user${data.length !== 1 ? 's' : ''}`;
                if (searchInput && searchInput.value) applyUserSearch();
            })
            .catch(err => {
                if (err.message === 'Unauthorized') return;
                if (tableBody) {
                    tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-5">
                        <div class="alert alert-danger d-inline-block shadow-sm">
                            <i class="fas fa-exclamation-triangle me-2"></i>${err.message}
                        </div></td></tr>`;
                }
                showAlert(err.message);
            })
            .finally(() => {
                if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh'; }
            });
        };

        window.changeUserRole = function (id, newRole) {
            const btn = document.getElementById(`role-btn-${id}`);
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'; }

            fetch(`https://localhost:44392/api/Auth/change-role/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newRole)
            })
            .then(res => {
                if (res.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('role'); window.location.href = 'login.html'; throw new Error('Unauthorized'); }
                if (!res.ok) return res.text().then(t => { throw new Error(t || 'Failed to change role.'); });
                return res.json();
            })
            .then(data => {
                showAlert(`Role updated to <strong>${newRole}</strong> successfully!`, 'success');
                loadUsers(); // full refresh to recalculate stats + badges
            })
            .catch(err => {
                if (err.message === 'Unauthorized') return;
                showAlert(err.message);
                if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.label || 'Change Role'; }
            });
        };

        window.confirmDeleteUser = function (id, name) {
            pendingDeleteId = id;
            const body = document.getElementById('confirmModalBody');
            if (body) body.innerHTML = `Are you sure you want to delete <strong>${name}</strong>? This action <strong>cannot be undone</strong>.`;
            if (confirmModal) confirmModal.show();
        };

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                if (!pendingDeleteId) return;
                confirmDeleteBtn.disabled = true;
                confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

                fetch(`https://localhost:44392/api/Auth/delete/${pendingDeleteId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => {
                    if (res.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('role'); window.location.href = 'login.html'; throw new Error('Unauthorized'); }
                    if (!res.ok) return res.text().then(t => { throw new Error(t || 'Failed to delete user.'); });
                    return res.json();
                })
                .then(() => {
                    if (confirmModal) confirmModal.hide();
                    showAlert('User deleted successfully.', 'success');
                    loadUsers();
                })
                .catch(err => {
                    if (err.message === 'Unauthorized') return;
                    if (confirmModal) confirmModal.hide();
                    showAlert(err.message);
                })
                .finally(() => {
                    confirmDeleteBtn.disabled = false;
                    confirmDeleteBtn.innerHTML = '<i class="fas fa-trash me-1"></i> Delete User';
                    pendingDeleteId = null;
                });
            });
        }

        if (searchInput) searchInput.addEventListener('input', applyUserSearch);

        loadUsers();
    }

    // ── Reports Page Logic ──────────────────────────────────────────────────
    if (window.location.pathname.includes('reports.html')) {
        const token = localStorage.getItem('token');
        const role  = localStorage.getItem('role');

        // Admin/SuperAdmin guard
        if (!token || (role !== 'Admin' && role !== 'SuperAdmin')) {
            window.location.href = 'login.html';
        }

        // Set year labels
        const yr = new Date().getFullYear();
        document.querySelectorAll('#currentYear, #barYear').forEach(el => { if (el) el.textContent = yr; });

        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        let pieChartInstance = null;
        let barChartInstance = null;

        const alertEl    = document.getElementById('reportsAlert');
        const refreshBtn = document.getElementById('refreshReportsBtn');

        function showAlert(msg, type = 'danger') {
            if (!alertEl) return;
            alertEl.className = `alert alert-${type} mb-4 shadow-sm`;
            alertEl.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>${msg}`;
            alertEl.classList.remove('d-none');
            setTimeout(() => alertEl.classList.add('d-none'), 6000);
        }

        function setStatCards(data) {
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            set('statTotal',      data.total);
            set('statPending',    data.pending);
            set('statInProgress', data.inProgress);
            set('statResolved',   data.resolved);

            // Resolution rate
            const rate = data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0;
            const rateEl = document.getElementById('resolutionRate');
            const barEl  = document.getElementById('resolutionBar');
            if (rateEl) rateEl.textContent = rate + '%';
            if (barEl)  {
                barEl.style.transition = 'width 1s ease';
                setTimeout(() => { barEl.style.width = rate + '%'; barEl.setAttribute('aria-valuenow', rate); }, 100);
            }
        }

        function buildPieChart(data) {
            const spinner = document.getElementById('pieSpinner');
            const wrapper = document.getElementById('pieWrapper');
            const legend  = document.getElementById('pieLegend');
            if (spinner) spinner.style.display = 'none';
            if (wrapper) wrapper.style.display = 'block';
            if (legend)  legend.classList.remove('d-none');

            if (pieChartInstance) pieChartInstance.destroy();

            const ctx = document.getElementById('pieChart').getContext('2d');
            pieChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'In Progress', 'Resolved'],
                    datasets: [{
                        data: [data.pending, data.inProgress, data.resolved],
                        backgroundColor: ['#ffc107', '#6610f2', '#198754'],
                        borderColor: ['#fff', '#fff', '#fff'],
                        borderWidth: 3,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '65%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => {
                                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
                                    return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                                }
                            }
                        }
                    },
                    animation: { animateScale: true, animateRotate: true, duration: 800 }
                }
            });
        }

        function buildBarChart(data) {
            const spinner = document.getElementById('barSpinner');
            const wrapper = document.getElementById('barWrapper');
            if (spinner) spinner.style.display = 'none';
            if (wrapper) wrapper.style.display = 'block';

            if (barChartInstance) barChartInstance.destroy();

            const ctx = document.getElementById('barChart').getContext('2d');

            // Gradient fill
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(13,110,253,0.7)');
            gradient.addColorStop(1, 'rgba(13,110,253,0.05)');

            barChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: MONTHS,
                    datasets: [{
                        label: 'Complaints',
                        data: data.monthlyData,
                        backgroundColor: gradient,
                        borderColor: '#0d6efd',
                        borderWidth: 2,
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1, precision: 0 },
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: { grid: { display: false } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: ctx => `${ctx[0].label} ${yr}`,
                                label: ctx => ` ${ctx.raw} complaint${ctx.raw !== 1 ? 's' : ''}`
                            }
                        }
                    },
                    animation: { duration: 900, easing: 'easeOutQuart' }
                }
            });
        }

        window.loadReports = function () {
            if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...'; }

            // Reset spinners
            ['pieSpinner','barSpinner'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'block'; });
            ['pieWrapper','barWrapper'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
            const legend = document.getElementById('pieLegend');
            if (legend) legend.classList.add('d-none');

            fetch('https://localhost:44392/api/GrievanceApi/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => {
                if (res.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('role'); window.location.href = 'login.html'; throw new Error('Unauthorized'); }
                if (res.status === 403) throw new Error('Access Denied: Admin privileges required.');
                if (!res.ok) throw new Error('Failed to load stats. Please try again.');
                return res.json();
            })
            .then(data => {
                setStatCards(data);
                buildPieChart(data);
                buildBarChart(data);
            })
            .catch(err => {
                if (err.message === 'Unauthorized') return;
                showAlert(err.message);
            })
            .finally(() => {
                if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh'; }
            });
        };

        loadReports();
    }

    // ── Settings Page Logic ─────────────────────────────────────────────────
    if (window.location.pathname.includes('settings.html')) {
        const token    = localStorage.getItem('token');
        const userRole = localStorage.getItem('role');
        const userEmail = localStorage.getItem('email') || '';

        // Auth guard
        if (!token) { window.location.href = 'login.html'; }

        // ── Navbar: show correct links per role ──────────────────────────────
        const adminLinks = document.getElementById('adminNavLinks');
        const userLinks  = document.getElementById('userNavLinks');
        const adminBadge = document.getElementById('roleAdminBadge');
        const navbar     = document.getElementById('settingsNavbar');

        if (userRole === 'Admin' || userRole === 'SuperAdmin') {
            if (adminLinks) adminLinks.style.removeProperty('display');
            if (adminBadge) {
                adminBadge.textContent = userRole === 'SuperAdmin' ? 'Super Admin' : 'Admin';
                adminBadge.classList.remove('d-none');
            }
        } else {
            if (userLinks) userLinks.style.removeProperty('display');
            if (navbar) navbar.style.background = '#0d6efd';
        }

        // ── Pre-fill navbar avatar + email ───────────────────────────────────
        const navAvatar = document.getElementById('navAvatar');
        const navEmailEl = document.getElementById('navEmail');
        if (userEmail) {
            const initials = userEmail.substring(0, 2).toUpperCase();
            if (navAvatar) navAvatar.textContent = initials;
            if (navEmailEl) { navEmailEl.textContent = userEmail; navEmailEl.classList.remove('d-none'); }
        }

        // ── Pre-fill page header & form ──────────────────────────────────────
        const savedName  = localStorage.getItem('name') || '';
        const headerName = document.getElementById('headerName');
        const headerEmail = document.getElementById('headerEmail');
        const headerAvatar = document.getElementById('headerAvatar');
        const profileNameInput  = document.getElementById('profileName');
        const profileEmailInput = document.getElementById('profileEmail');

        if (headerName)  headerName.textContent  = savedName  || 'Account Settings';
        if (headerEmail) headerEmail.textContent  = userEmail  || '';
        if (headerAvatar) headerAvatar.textContent = (savedName || userEmail || '?').substring(0, 2).toUpperCase();
        if (profileNameInput)  profileNameInput.value  = savedName;
        if (profileEmailInput) profileEmailInput.value = userEmail;

        const alertEl = document.getElementById('settingsAlert');
        function showSettingsAlert(msg, type = 'danger') {
            if (!alertEl) return;
            alertEl.className = `alert alert-${type} mb-4 shadow-sm`;
            alertEl.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>${msg}`;
            alertEl.classList.remove('d-none');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => alertEl.classList.add('d-none'), 6000);
        }

        // ── Update Profile form ──────────────────────────────────────────────
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', e => {
                e.preventDefault();
                const name  = profileNameInput?.value.trim();
                const email = profileEmailInput?.value.trim();
                if (!name && !email) return;

                const btn = document.getElementById('profileSubmitBtn');
                if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...'; }

                fetch('https://localhost:44392/api/Auth/update-profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ name, email })
                })
                .then(res => {
                    if (res.status === 401) { localStorage.removeItem('token'); window.location.href = 'login.html'; throw new Error('Unauthorized'); }
                    if (!res.ok) return res.text().then(t => { throw new Error(t || 'Failed to update profile.'); });
                    return res.json();
                })
                .then(data => {
                    // Sync localStorage
                    if (data.name)  { localStorage.setItem('name', data.name); if (headerName) headerName.textContent = data.name; if (headerAvatar) headerAvatar.textContent = data.name.substring(0,2).toUpperCase(); }
                    if (data.email) { localStorage.setItem('email', data.email); if (headerEmail) headerEmail.textContent = data.email; if (navEmailEl) navEmailEl.textContent = data.email; }
                    showSettingsAlert('Profile updated successfully!', 'success');
                })
                .catch(err => {
                    if (err.message === 'Unauthorized') return;
                    showSettingsAlert(err.message);
                })
                .finally(() => {
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> Save Changes'; }
                });
            });
        }

        // ── Change Password form ─────────────────────────────────────────────
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', e => {
                e.preventDefault();
                const currentPwd = document.getElementById('currentPassword')?.value;
                const newPwd     = document.getElementById('newPassword')?.value;
                const confirmPwd = document.getElementById('confirmNewPassword')?.value;

                if (!currentPwd || !newPwd || !confirmPwd) {
                    showSettingsAlert('Please fill in all password fields.');
                    return;
                }
                if (newPwd.length < 6) {
                    showSettingsAlert('New password must be at least 6 characters.');
                    return;
                }
                if (newPwd !== confirmPwd) {
                    showSettingsAlert('New passwords do not match.');
                    return;
                }

                const btn = document.getElementById('pwdSubmitBtn');
                if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...'; }

                fetch('https://localhost:44392/api/Auth/change-password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
                })
                .then(res => {
                    if (res.status === 401) { localStorage.removeItem('token'); window.location.href = 'login.html'; throw new Error('Unauthorized'); }
                    if (!res.ok) return res.text().then(t => { throw new Error(t || 'Failed to change password.'); });
                    return res.json();
                })
                .then(() => {
                    showSettingsAlert('Password changed successfully! Please log in again.', 'success');
                    passwordForm.reset();
                    const bar = document.getElementById('pwdStrengthBar');
                    const lbl = document.getElementById('pwdStrengthLabel');
                    if (bar) { bar.style.width = '0%'; bar.style.backgroundColor = ''; }
                    if (lbl) lbl.textContent = '';
                    // Force re-login after password change
                    setTimeout(() => { localStorage.removeItem('token'); localStorage.removeItem('role'); localStorage.removeItem('email'); localStorage.removeItem('name'); window.location.href = 'login.html'; }, 2500);
                })
                .catch(err => {
                    if (err.message === 'Unauthorized') return;
                    showSettingsAlert(err.message);
                })
                .finally(() => {
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-shield-alt me-1"></i> Update Password'; }
                });
            });
        }
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

// ── Password visibility toggle ─────────────────────────────────────────────
window.togglePwd = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    const icon = btn.querySelector('i');
    if (icon) { icon.className = isText ? 'fas fa-eye' : 'fas fa-eye-slash'; }
};

// ── Password strength meter ─────────────────────────────────────────────────
window.updateStrength = function(pwd) {
    const bar = document.getElementById('pwdStrengthBar');
    const lbl = document.getElementById('pwdStrengthLabel');
    if (!bar || !lbl) return;
    let score = 0;
    if (pwd.length >= 6)  score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const levels = [
        { pct: '0%',   color: '#e9ecef', label: '' },
        { pct: '25%',  color: '#dc3545', label: 'Weak' },
        { pct: '50%',  color: '#fd7e14', label: 'Fair' },
        { pct: '75%',  color: '#ffc107', label: 'Good' },
        { pct: '90%',  color: '#198754', label: 'Strong' },
        { pct: '100%', color: '#0d6efd', label: 'Very Strong' },
    ];
    const level = levels[Math.min(score, 5)];
    bar.style.width = level.pct;
    bar.style.backgroundColor = level.color;
    lbl.textContent = level.label;
    lbl.style.color = level.color;
};

window.logout = function() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    localStorage.removeItem("name");
    localStorage.removeItem("isSuperAdmin");
    window.location.href = "login.html";
};
