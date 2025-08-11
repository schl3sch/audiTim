import { Component, signal } from '@angular/core';
import { Sensor } from './sensor.service';
import { CommonModule } from '@angular/common';
import { SensorChartComponent } from './sensor-chart/sensor-chart';
import { Heatmap } from './heatmap/heatmap';
import { ArrayTestComponent } from './array-test/array-test.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SensorChartComponent, Heatmap, ArrayTestComponent],
  templateUrl: './app.html'
})
export class App {
  chartData = signal<any>(null); 
  textData = signal<any>(null);
  reloadHeatmap = signal(false);
  constructor(private sensor: Sensor) {}

  generateDummy() {
    this.sensor.generateDummyData().subscribe(res => {
      this.textData.set(res);
      this.chartData.set(null); // Clear chart
      this.reloadHeatmap.set(true);
    });
  }

  loadAllSensors() {
    this.sensor.getAllSensors().subscribe(res => {
      this.chartData.set(res);
      this.textData.set(null); // Hide text
    });
  }

  loadNewSensors() {
    this.sensor.getNewSensors().subscribe(res => {
      this.chartData.set(res);
      this.textData.set(null); // Hide text
    });
  }
}
