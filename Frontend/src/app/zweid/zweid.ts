import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorChartComponent } from '../sensor-chart/sensor-chart';
import { Sensor } from '../sensor.service';

@Component({
  selector: 'app-zweid',
  standalone: true,
  imports: [CommonModule, SensorChartComponent],
  templateUrl: './zweid.html',
})
export class Zweid {
  chartData = signal<any>(null);
  textData = signal<any>(null); // optional, falls Text angezeigt wird
  reloadHeatmap = signal(false); // optional, falls Heatmap neu geladen werden soll

  constructor(private sensor: Sensor) {}

  loadAllSensors() {
    this.sensor.getAllSensors().subscribe(res => {
      this.chartData.set(res);
      this.textData.set(null);      // Text ausblenden
      this.reloadHeatmap.set(true); // Heatmap ggf. neu laden
    });
  }

  loadNewSensors() {
    this.sensor.getNewSensors().subscribe(res => {
      this.chartData.set(res);
      this.textData.set(null);      // Text ausblenden
      this.reloadHeatmap.set(true); // Heatmap ggf. neu laden
    });
  }
}
