import { AfterViewInit, Component } from '@angular/core';
import { Sensor } from '../sensor.service';
import Plotly from 'plotly.js-dist-min';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './heatmap.html',
  styleUrl: './heatmap.scss'
})

export class Heatmap implements AfterViewInit {
  frames: number[][][] = [];
  currentFrameIndex: number = 0;

  constructor(private sensor: Sensor) {}

  ngAfterViewInit(): void {
    this.loadHeatmapFrames();
  }

  private loadHeatmapFrames(): void {
    this.sensor.getHeatmapArrays().subscribe({
      next: (res) => {
        this.frames = res.frames; // JSON aus dem Backend
        this.currentFrameIndex = 0;
        this.updatePlot(this.frames[this.currentFrameIndex]);
      },
      error: (err) => {
        console.error('Fehler beim Laden der Heatmap-Frames:', err);
      }
    });
  }

  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.currentFrameIndex = +target.value;
    this.updatePlot(this.frames[this.currentFrameIndex]);
  }

  private updatePlot(z: number[][]): void {
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
        title: { text: `3D Heatmap – Frame ${this.currentFrameIndex + 1}` },
        autosize: true,
        scene: {
          xaxis: { title: { text: 'X' } },
          yaxis: { title: { text: 'Y' } },
          zaxis: { title: { text: 'Z' } },
        },
      }
    );
  }
}
