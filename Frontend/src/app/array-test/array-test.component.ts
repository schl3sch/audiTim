import { Component } from '@angular/core';
import { Sensor } from '../sensor.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-array-test',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './array-test.component.html',
  styleUrl: './array-test.component.scss'
})
export class ArrayTestComponent {

  heatmap: number[][] = [];
  loading = false;
  error = '';
  constructor(private sensor: Sensor) {}

  fetchHeatmap() {
    this.loading = true;
    this.error = '';
    this.sensor.getHeatmapArray().subscribe({
      next: (res) => {
        this.heatmap = res.heatmap;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Fehler beim Abrufen der Heatmap.';
        console.error(err);
        this.loading = false;
      },
    });
  }
}
