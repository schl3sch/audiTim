import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  form;
  error = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.error = 'Bitte alle Felder korrekt ausfüllen';
      return;
    }
    const { username, email, password, confirmPassword } = this.form.value;
    if (password !== confirmPassword) {
      this.error = 'Passwörter stimmen nicht überein';
      return;
    }
    this.error = '';
    this.auth.register(username ?? '', email ?? '', password ?? '').subscribe({
      next: (res: any) => {
        // optional: Auto-login
        if (res?.token) {
          localStorage.setItem('token', res.token);
        }
        if (res?.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
        }
        this.router.navigate(['/homepage']);
      },
      error: (err) => this.error = err?.error?.error || 'Registrierung fehlgeschlagen'
    });
  }
}
