import { AfterViewInit, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Sensor } from '../sensor.service';
import Plotly from 'plotly.js-dist-min';

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [],
  templateUrl: './heatmap.html',
  styleUrl: './heatmap.scss'
})
export class Heatmap implements AfterViewInit, OnChanges {
  @Input() reload: boolean = false;

  constructor(private sensor: Sensor) {}

  ngAfterViewInit(): void {
    this.loadHeatmap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reload'] && changes['reload'].currentValue === true) {
      this.loadHeatmap();
    }
  }

  private loadHeatmap(): void {
    this.sensor.getHeatmapArray().subscribe({
      next: (res) => {
        const z = res.heatmap;
        const size = z.length;
        const x = Array.from({ length: size }, (_, i) => i);
        const y = Array.from({ length: size }, (_, i) => i);

        Plotly.newPlot(
          'plotly-heatmap',
          [
            {
              z,
              x,
              y,
              type: 'surface',
              colorscale: 'YlOrRd',
            },
          ],
          {
            title: { text: '3D Heatmap' },
            autosize: true,
            scene: {
              xaxis: { title: { text: 'X' } },
              yaxis: { title: { text: 'Y' } },
              zaxis: { title: { text: 'Z' } },
            },
          }
        );
      },
      error: (err) => {
        console.error('Fehler beim Laden der Heatmap:', err);
      },
    });
  }
}
