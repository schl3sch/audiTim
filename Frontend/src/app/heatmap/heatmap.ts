import { AfterViewInit, Component, OnInit } from '@angular/core';
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
export class Heatmap implements AfterViewInit, OnInit  {
  frames: HeatmapFrame[] = [];
  currentFrameIndex: number = 0;

  selectedRange: string = '';   // Dropdown Auswahl
  customStart: string = '';     // Benutzerdefiniert Start
  customStop: string = '';      // Benutzerdefiniert Stop

  availableStart: string | null = null;
  availableStop: string | null = null;

  constructor(private sensor: Sensor) {}

  ngOnInit(): void {
    this.loadAvailableRange();
  }

  ngAfterViewInit(): void {
    this.loadHeatmapFrames(); // Default (z.B. letzte Stunde)
  }

  loadAvailableRange(): void {
    this.sensor.getHeatmapRange().subscribe({
      next: (range) => {
        this.availableStart = range.oldest;
        this.availableStop = range.newest;
      },
      error: (err) => {
        console.error("❌ Fehler beim Laden der Range:", err);
      }
    });
  }

  private loadHeatmapFrames(range?: { start?: string; stop?: string }): void {
    let request$;

    if (range?.start && range?.stop) {
      // POST mit custom Range
      request$ = this.sensor.postHeatmapsRange(range.start, range.stop);
    } else {
      // Default GET
      request$ = this.sensor.getHeatmaps();
    }

    request$.subscribe({
      next: (res) => {
        this.frames = res.data;
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
          dragmode: false
        },
        margin: { l: 0, r: 0, b: 0, t: 40 },
      },
      { displayModeBar: false }
    );
  }

  onPresetRangeChange(): void {
    if (this.selectedRange === 'custom') return;

    const now = new Date();
    let start: Date;

    switch (this.selectedRange) {
      case '1h':
        start = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }

    this.loadHeatmapFrames({
      start: start.toISOString(),
      stop: now.toISOString(),
    });
  }

  loadCustomRange(): void {
    if (!this.customStart || !this.customStop) return;

    // Prüfen, dass Start vor Stop liegt
    const start = new Date(this.customStart);
    const stop = new Date(this.customStop);
    if (start >= stop) {
      alert('Start muss vor Stop liegen!');
      return;
    }

    this.loadHeatmapFrames({
      start: start.toISOString(),
      stop: stop.toISOString(),
    });
  }

  isPlaying = false;
  playSpeed = 200; // Millisekunden pro Frame
  playInterval: any;

  // Neuer Handler, der direkt den Wert akzeptiert
  onSliderChangeValue(value: number) {
    this.currentFrameIndex = value;
    if (this.frames.length > 0) {
      this.updatePlot(this.frames[this.currentFrameIndex].grid);
    }
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.playInterval = setInterval(() => {
        if (this.currentFrameIndex < this.frames.length - 1) {
          this.currentFrameIndex++;
        } else {
          this.currentFrameIndex = 0;
        }
        this.onSliderChangeValue(this.currentFrameIndex); // <-- direkt den Wert übergeben
      }, this.playSpeed);
    } else {
      clearInterval(this.playInterval);
    }
  }
}
