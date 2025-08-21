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
        
        // Chart vorbereiten: für jeden Sensor ein Array mit Platzhaltern
        const sensorResponse: Record<string, { time: string; value: number }[]> = {
          sensor1: [
            { time: range.oldest, value: 0 },
            { time: range.newest, value: 0 }
          ],
          sensor2: [
            { time: range.oldest, value: 0 },
            { time: range.newest, value: 0 }
          ],
          sensor3: [
            { time: range.oldest, value: 0 },
            { time: range.newest, value: 0 }
          ],
          sensor4: [
            { time: range.oldest, value: 0 },
            { time: range.newest, value: 0 }
          ]
        };

        this.chartData.set(sensorResponse);
        console.log('Sensor Range:', range);
      },
      error: (err) => console.error('Fehler beim Laden der Sensor-Range:', err)
    });
  }

  // Werte für ausgewählten Zeitraum laden
  loadSensorData(start: string | number, stop: string | number): void {
    this.sensor.getSensorData(start, stop).subscribe({
      next: (data) => this.chartData.set(data),
      error: (err) => console.error('Fehler beim Laden der Sensordaten:', err)
    });
  }
}
