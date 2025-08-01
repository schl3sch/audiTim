import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import 'chartjs-adapter-date-fns';
import {
  Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title, TimeScale, ChartConfiguration, LineController, LineElement, PointElement
} from 'chart.js';

Chart.register(
  LineController, LineElement, PointElement, BarController, BarElement, CategoryScale, LinearScale, TimeScale, Tooltip, Legend, Title
);

@Component({
  selector: 'app-sensor-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './sensor-chart.html'
})
export class SensorChartComponent implements OnChanges {
  @Input() sensorResponse!: Record<string, { time: string; decibel: number }[]>;

  chartData!: ChartConfiguration<'line'>['data'];
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    scales: {
      x: {
        type: 'time',
        time: { tooltipFormat: 'HH:mm:ss', unit: 'minute' },
        title: { display: true, text: 'Time' }
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Decibel' }
      }
    },
    plugins: { legend: { display: true } }
  };

  private colorMap = new Map<string, string>([
    ['sensor1', '#ff0000'],
    ['sensor2', '#00ff00'],
    ['sensor3', '#0000ff'],
    ['sensor4', '#ff00ff'],
  ]);

  ngOnChanges() {
    if (!this.sensorResponse) return;

    Object.keys(this.sensorResponse).forEach(sensor => {
      if (!this.colorMap.has(sensor)) {
        this.colorMap.set(sensor, this.getRandomColor());
      }
    });

    this.chartData = {
      datasets: Object.entries(this.sensorResponse).map(([sensor, values]) => ({
        label: sensor,
        data: values.map(v => ({ x: new Date(v.time).getTime(), y: v.decibel })),
        fill: false,
        borderColor: this.colorMap.get(sensor) ?? '#000000', // fallback black
        backgroundColor: this.colorMap.get(sensor) ?? '#000000', // point color
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
        type: 'line'
      }))
    };
  }

  private getRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }
}
