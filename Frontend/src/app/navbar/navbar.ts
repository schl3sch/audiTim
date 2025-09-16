import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class Navbar {
  sidebarCollapsed = false;
  darkMode = false; // aktueller Zustand

  constructor(private router: Router) {}

  toggleTheme(event: any) {
    this.darkMode = event.target.checked;
    const theme = this.darkMode ? 'dark' : 'light';

    // Bootstrap Theme
    document.documentElement.setAttribute('data-bs-theme', theme);

    // globaler class toggle für Body
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);

    localStorage.setItem('theme', theme);
  }

  ngOnInit() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.darkMode = savedTheme === 'dark';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    document.body.classList.add(savedTheme);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getUsername(): string | null {
    const u = localStorage.getItem('user');
    if (!u) return null;
    try {
      return JSON.parse(u).username;
    } catch {
      return null;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // navigate back to homepage
    this.router.navigate(['/homepage']);
  }
}
