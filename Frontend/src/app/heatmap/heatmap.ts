import { AfterViewInit, Component } from '@angular/core';
import { Sensor, HeatmapFrame } from '../sensor.service';
import Plotly from 'plotly.js-dist-min';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './heatmap.html',
  styleUrls: ['./heatmap.scss']
})
export class Heatmap implements AfterViewInit {
  frames: HeatmapFrame[] = [];
  currentFrameIndex: number = 0;

  constructor(private sensor: Sensor) {}

  ngAfterViewInit(): void {
    this.loadHeatmapFrames();
  }

  private loadHeatmapFrames(): void {
    this.sensor.getHeatmaps().subscribe({
      next: (res) => {
        this.frames = res.data; // vom Backend
        if (this.frames.length > 0) {
          this.currentFrameIndex = 0;
          this.updatePlot(this.frames[this.currentFrameIndex].grid);
        }
      },
      error: (err) => {
        console.error('Fehler beim Laden der Heatmap-Frames:', err);
      }
    });
  }

  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.currentFrameIndex = +target.value;
    this.updatePlot(this.frames[this.currentFrameIndex].grid);
  }

  private updatePlot(z: number[][]): void {
    const size = z.length;
    const x = Array.from({ length: size }, (_, i) => i);
    const y = Array.from({ length: size }, (_, i) => i);

    Plotly.react(
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
        title: { 
          text: `3D Heatmap – Frame ${this.currentFrameIndex + 1} (${this.frames[this.currentFrameIndex].time})` 
        },
        autosize: true,
        scene: {
          xaxis: { title: { text: 'X' } },
          yaxis: { title: { text: 'Y' } },
          zaxis: { title: { text: 'Z' } },
          camera: { eye: { x: 1.5, y: 1.5, z: 1.0 } },
          dragmode: false, // kein Rotieren / Zoomen
          },
        margin: { l: 0, r: 0, b: 0, t: 40 },
        },
        { displayModeBar: false });
  }
}
