import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArrayTestComponent } from '../array-test/array-test.component';
import { Sensor } from '../sensor.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ArrayTestComponent],
  templateUrl: './admin.html',
})
export class Admin {
  textData = signal<any>(null);
  chartData = signal<any>(null); 
  reloadHeatmap = signal(false);

  constructor(private sensor: Sensor) {}

  generateDummy() {
    this.sensor.generateDummyData().subscribe(res => {
      this.textData.set(res);
      this.chartData.set(null); // Charts leeren
      this.reloadHeatmap.set(true); // Heatmap neu laden
    });
  }
}
