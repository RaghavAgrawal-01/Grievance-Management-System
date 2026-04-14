document.addEventListener('DOMContentLoaded', () => {
    // Basic form validation for any form with class 'needs-validation'
    const forms = document.querySelectorAll('.needs-validation');

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
                    
                    if(submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing In...';
                    }
                    if(loginAlert) loginAlert.classList.add('d-none');

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
                        if (data.role && data.role.toLowerCase() === 'admin') {
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
                        if(submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerText = 'Sign In';
                        }
                    });
                }

                // If submit complaint
                if (form.id === 'complaintForm') {
                    event.preventDefault();
                    alert('Complaint submitted successfully! Your Ticket ID is #TKT-' + Math.floor(Math.random() * 10000));
                    window.location.href = 'search.html';
                }

                if (form.id === 'registerForm') {
                    event.preventDefault();
                    
                    const name = document.getElementById('fullName').value;
                    const email = document.getElementById('email').value;
                    const pwd = document.getElementById('password').value;
                    const confirmPwd = document.getElementById('confirmPassword').value;
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
                        body: JSON.stringify({ name: name, email: email, password: pwd, role: 'User' })
                    })
                    .then(response => {
                        if (!response.ok) {
                            return response.text().then(text => {
                                // Basic parsing if it returns json error or plain text
                                let errorMsg = text;
                                try {
                                    const jsonErr = JSON.parse(text);
                                    errorMsg = jsonErr.message || jsonErr.title || text;
                                } catch (e) {}
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
                    const ticketId = document.getElementById('ticketId').value;
                    const resultContainer = document.getElementById('searchResult');
                    
                    if (ticketId) {
                        resultContainer.style.display = 'block';
                        resultContainer.innerHTML = `
                            <div class="card" style="margin-top: 1.5rem;">
                                <div style="display:flex; justify-content: space-between; margin-bottom: 1rem;">
                                    <h3>Ticket ${ticketId}</h3>
                                    <span class="badge badge-in-progress">In Progress</span>
                                </div>
                                <p><strong>Category:</strong> Maintenance</p>
                                <p><strong>Date Submitted:</strong> ${new Date().toLocaleDateString()}</p>
                                <p style="margin-top: 1rem; color: var(--text-muted);">
                                    Your grievance is currently being reviewed by the respective department. We will get back to you shortly.
                                </p>
                            </div>
                        `;
                    }
                }
            }
        });

        // Clear validation errors on input
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
