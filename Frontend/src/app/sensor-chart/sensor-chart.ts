import 'chartjs-adapter-date-fns';
import { Component, Input, OnChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
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
  @Input() sensorResponse!: Record<string, { time: string; value: number }[]>;

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  chartData: ChartConfiguration<'line'>['data'] = {
    datasets: []
  };

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    animation: false, // wichtig für Live-Update
    scales: {
      x: {
        type: 'time',
        time: { tooltipFormat: 'HH:mm:ss', unit: 'minute' },
        title: { display: true, text: 'Time' }
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Value' }
      }
    },
    plugins: { legend: { display: true } }
  };

  private colorMap = new Map<string, string>([
    ['sensor_1', '#ff0000'],
    ['sensor_2', '#00ff00'],
    ['sensor_3', '#0000ff'],
    ['sensor_4', '#ff00ff'],
  ]);

  ngOnChanges() {
    if (!this.sensorResponse || !this.chart) return;

    const chartRef = this.chart.chart!;
    for (const [sensor, values] of Object.entries(this.sensorResponse)) {
      // Dataset suchen
      let dataset = chartRef.data.datasets.find(d => d.label === sensor);
      if (!dataset) {
        // Neues Dataset hinzufügen
        dataset = {
          type: 'line',                 
          label: sensor,
          data: [],
          borderColor: this.colorMap.get(sensor) ?? '#000000', // Fallback-Farbe
          backgroundColor: (this.colorMap.get(sensor) ?? '#000000'),
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
        };
        chartRef.data.datasets.push(dataset);
      }

      // Nur die Daten ersetzen, nicht das Dataset-Objekt selbst
      dataset.data = values.map(v => ({ x: new Date(v.time).getTime(), y: v.value }));
    }

    chartRef.update('none'); // kein Animations-Update
  }

  private getRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }
}
