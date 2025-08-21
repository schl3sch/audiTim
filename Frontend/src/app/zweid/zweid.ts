import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorChartComponent } from '../sensor-chart/sensor-chart';
import { Sensor } from '../sensor.service';
import { RangeSelector } from '../range-selector/range-selector';

@Component({
  selector: 'app-zweid',
  standalone: true,
  imports: [CommonModule, SensorChartComponent, RangeSelector],
  templateUrl: './zweid.html',
})
export class Zweid implements OnInit {
  constructor(private sensor: Sensor) {}

  chartData = signal<any>(null);

  availableStart: string | null = null;
  availableStop: string | null = null;

  ngOnInit(): void {
    this.loadSensorRange();
  }

  // Ältester & neuster Timestamp pro Sensor laden
  loadSensorRange(): void {
    this.sensor.getSensorRange().subscribe({
      next: (range) => {
        this.availableStart = range.oldest;
        this.availableStop = range.newest;
        console.log('Sensor Range:', range);
      },
      error: (err) => console.error('Fehler beim Laden der Sensor-Range:', err)
    });
  }

  // Werte für ausgewählten Zeitraum laden
  loadSensorData(start: string | number, stop: string | number): void {
    console.log('Load Sensor Data:', start, stop);
    this.sensor.getSensorData(start, stop).subscribe({
      next: (resp) => {
        console.log('Sensor Data:', resp);
        this.chartData.set(resp['data']);
      },
      error: (err) => console.error('Fehler beim Laden der Sensordaten:', err)
    });
  }

  live = false;
  private liveInterval?: any;

  toggleLive(): void {
    this.live = !this.live;
    if (this.live) {
      this.startLive();
    } else {
      this.stopLive();
    }
  }

  private startLive(): void {
    // Range-Selector deaktivieren, ggf. Flag setzen
    this.loadLiveData(); // sofort laden
    this.liveInterval = setInterval(() => this.loadLiveData(), 1000); // jede Sekunde
  }

  private stopLive(): void {
    clearInterval(this.liveInterval);
    this.liveInterval = undefined;
    // Range-Selector wieder aktivieren
  }

  private loadLiveData(): void {
    this.sensor.getLiveSensorData().subscribe({
      next: (resp) => this.chartData.set(resp['data']),
      error: (err) => console.error('Fehler beim Laden der Live-Daten:', err)
    });
  }
}
