import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  form;
  error = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      usernameOrEmail: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.error = 'Bitte alle Felder ausfüllen';
      return;
    }
    this.error = '';
    const { usernameOrEmail, password } = this.form.value;
    this.auth.login(usernameOrEmail ?? '', password ?? '').subscribe({
      next: () => this.router.navigate(['/homepage']),
      error: (err) => this.error = err?.error?.error || 'Login fehlgeschlagen'
    });
  }
}
