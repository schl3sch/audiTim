import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

const API_BASE = `${window.location.protocol}//${window.location.hostname}:3000/api`;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient, private router: Router) {}

  register(username: string, email: string, password: string): Observable<any> {
    return this.http.post(`${API_BASE}/register`, { username, email, password });
  }

  login(usernameOrEmail: string, password: string): Observable<any> {
    return this.http.post(`${API_BASE}/login`, { usernameOrEmail, password }).pipe(
      map((res: any) => {
        if (res && res.token) {
          localStorage.setItem('token', res.token);
        }
        if (res && res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
        }
        return res;
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/homepage']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getUser(): any {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }
}
