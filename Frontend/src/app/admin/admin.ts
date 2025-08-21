import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArrayTestComponent } from '../array-test/array-test.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ArrayTestComponent],
  templateUrl: './admin.html',
})
export class Admin {
}
