import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Sensor } from '../sensor.service';
import Plotly from 'plotly.js-dist-min';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RangeSelector } from '../range-selector/range-selector';

interface PeakFrame {
  time: string;
  peakX: number;
  peakY: number;
  peakValue: number;
}

@Component({
  selector: 'app-peekmap',
  standalone: true,
  imports: [CommonModule, FormsModule, RangeSelector],
  templateUrl: './peekmap.html',
  styleUrls: ['./peekmap.scss']
})
export class Peekmap implements AfterViewInit, OnInit {
  frames: PeakFrame[] = [];
  currentFrameIndex = 0;

  availableStart: string | null = null;
  availableStop: string | null = null;

  isPlaying = false;
  playSpeed = 500; // ms pro Frame
  playInterval: any;

  live = false;
  private liveInterval?: any;

  constructor(private sensor: Sensor) {}

  ngOnInit(): void {
    this.loadAvailableRange();
  }

  ngAfterViewInit(): void {
    this.loadPeaks(); // initial
  }

    toggleLive(): void {
    this.live = !this.live;
    if (this.live) {
      this.startLive();
    } else {
      this.stopLive();
    }
  }

  private startLive() {
    this.loadLiveData(); // sofort
    this.liveInterval = setInterval(() => this.loadLiveData(), 1000);
  }

  private stopLive() {
    clearInterval(this.liveInterval);
    this.liveInterval = undefined;
  }

  private loadLiveData() {
    this.sensor.getLivePeaks().subscribe({
      next: (res) => {
        if (res.data) {
          const frame = res.data;
          if (frame.time) {
            const utcDate = new Date(frame.time);
            const deDate = new Date(
              utcDate.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
            );
            frame.time = deDate.toISOString();
          }

          this.frames = [frame];
          this.currentFrameIndex = 0;
          this.updatePlot(frame);
        }
      },
      error: (err) => console.error('Fehler beim Laden der Live-Peaks:', err)
    });
  }

  onRangeChange(range: { start?: string; stop?: string }) {
    this.sensor.postPeaksRange(range.start!, range.stop!).subscribe({
      next: (res) => {
        this.frames = res.data;
        this.currentFrameIndex = 0;
        if (this.frames.length > 0) {
          this.updatePlot(this.frames[this.currentFrameIndex]);
        }
      },
      error: (err) => console.error(err)
    });
  }

  loadAvailableRange(): void {
    this.sensor.getHeatmapRange().subscribe({
      next: (range) => {
        this.availableStart = range.oldest;
        this.availableStop = range.newest;
      },
      error: (err) => console.error('❌ Fehler beim Laden der Range:', err)
    });
  }

  private loadPeaks(): void {
    this.sensor.getPeaks().subscribe({
      next: (res) => {
        this.frames = res.data;
        if (this.frames.length > 0) {
          this.currentFrameIndex = 0;
          this.updatePlot(this.frames[this.currentFrameIndex]);
        }
      },
      error: (err) => console.error('Fehler beim Laden der Peaks:', err)
    });
  }

  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.currentFrameIndex = +target.value;
    this.updatePlot(this.frames[this.currentFrameIndex]);
  }

  private updatePlot(frame: PeakFrame): void {
    // Wertebereich PeakValue 0–8000 → Größe 5–40
    const size = 5 + (frame.peakValue / 8000) * 35;

    // PeakValue 0–8000 → Alpha 0.2–1
    const alpha = 0.2 + (frame.peakValue / 8000) * 0.8;
    const color = `rgba(255,0,0,${Math.min(1, alpha)})`;

    // // Wertebereich PeakValue 0–1000 → Größe 5–40
    // const size = 5 + (frame.peakValue / 1000) * 35;

    // // PeakValue 0–1000 → Alpha 0.2–1
    // const alpha = 0.2 + (frame.peakValue / 1000) * 0.8;
    // const color = `rgba(255,0,0,${Math.min(1, alpha)})`;

    Plotly.react(
      'plotly-peekmap',
      [
        {
          x: [frame.peakX],
          y: [frame.peakY],
          mode: 'markers',
          type: 'scatter',
          marker: {
            size: size,
            color: color,
          },
          name: 'Peak'
        }
      ],
      {
        title: { text: `Peak Frame (${frame.time})`, font: { color: 'white' } },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        autosize: true,
        xaxis: {
          range: [0, 1],
          visible: false,      // Achse ausblenden
          scaleanchor: 'y'
        },
        yaxis: {
          range: [0, 1],
          visible: false,      // Achse ausblenden
          scaleratio: 1
        },
        margin: { l: 0, r: 0, b: 0, t: 40 },
      },
      { displayModeBar: false }
    );
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
        this.updatePlot(this.frames[this.currentFrameIndex]);
      }, this.playSpeed);
    } else {
      clearInterval(this.playInterval);
    }
  }
}
