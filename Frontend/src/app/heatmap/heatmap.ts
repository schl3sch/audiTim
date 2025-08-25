import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Sensor, HeatmapFrame } from '../sensor.service';
import Plotly from 'plotly.js-dist-min';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RangeSelector } from '../range-selector/range-selector';

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [CommonModule, FormsModule, RangeSelector],
  templateUrl: './heatmap.html',
  styleUrls: ['./heatmap.scss']
})
export class Heatmap implements AfterViewInit, OnInit {
  frames: HeatmapFrame[] = [];
  frame: HeatmapFrame | null = null;

  currentFrameIndex = 0;

  selectedRange = '';   // Dropdown Auswahl
  customStart = '';     // Benutzerdefiniert Start
  customStop = '';      // Benutzerdefiniert Stop

  availableStart: string | null = null;
  availableStop: string | null = null;

  avg = false;

  isPlaying = false;
  playSpeed = 200; // Millisekunden pro Frame
  playInterval: any;
  
  live = false;
  private liveInterval?: any;

  constructor(private sensor: Sensor) {}

  ngOnInit(): void {
    this.loadAvailableRange();
  }

  ngAfterViewInit(): void {
    this.loadHeatmapFrames(); // Default (z.B. letzte Stunde)
  }

  onRangeChange(range: { start?: string; stop?: string }) {
    let request$;
    // Sensor-Service nur, wenn implementiert
    request$ = this.sensor.postHeatmapsRange(range.start!, range.stop!);

    request$.subscribe({
      next: (res) => {
        this.frames = res.data;
        this.currentFrameIndex = 0;
        if (this.frames.length > 0) {
          this.updatePlot(this.frames[this.currentFrameIndex].grid, false);
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

  private loadHeatmapFrames(range?: { start?: string; stop?: string }): void {
    if (range?.start && range?.stop && this.avg) {
      // single avg request
      this.sensor.postHeatmapAvg(range.start, range.stop).subscribe({
        next: (res) => {
          this.frame = res.data;
          this.updatePlot(this.frame.grid, true);
        },
        error: (err) => console.error('Fehler beim Laden der Durchschnitts-Heatmap:', err)
      });
    } else {
      // normaler Request
      let request$;
      if (range?.start && range?.stop) {
        request$ = this.sensor.postHeatmapsRange(range.start, range.stop);
      } else {
        request$ = this.sensor.getHeatmaps();
      }

      request$.subscribe({
        next: (res) => {
          this.frames = res.data;
          if (this.frames.length > 0) {
            this.currentFrameIndex = 0;
            this.updatePlot(this.frames[this.currentFrameIndex].grid, false);
          }
        },
        error: (err) => console.error('Fehler beim Laden der Heatmap-Frames:', err)
      });
    }
  }


  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.currentFrameIndex = +target.value;
    this.updatePlot(this.frames[this.currentFrameIndex].grid, false);
  }

  private updatePlot(z: number[][], singleFrame: boolean): void {
    const size = z.length;
    const x = Array.from({ length: size }, (_, i) => i);
    const y = Array.from({ length: size }, (_, i) => i);

    var heatmapText;

    if (singleFrame) 
      heatmapText = `3D Heatmap - Live Frame (${this.frame?.time})`;
    else
      heatmapText = `3D Heatmap - Frame ${this.currentFrameIndex + 1} (${this.frames[this.currentFrameIndex]?.time})`;

    Plotly.react(
      'plotly-heatmap',
      [
        {
          z,
          x,
          y,
          type: 'surface',
          colorscale: 'YlOrRd',
          opacity: 0.7,
        },
      ],
      {
        title: { text: heatmapText, font: { color: 'white' } }, // Titel auch weiß

        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',

        autosize: true,
        scene: {
          bgcolor: 'rgba(0,0,0,0)',

          xaxis: { 
            title: { text: 'X', font: { color: 'white' } }, 
            tickfont: { color: 'white' } 
          },
          yaxis: { 
            title: { text: 'Y', font: { color: 'white' } }, 
            tickfont: { color: 'white' } 
          },
          zaxis: { 
            range: [0, 50], 
            title: { text: 'Z', font: { color: 'white' } }, 
            tickfont: { color: 'white' } 
          },

          camera: { eye: { x: 1.5, y: 1.5, z: 1.0 } },
          dragmode: false,
          aspectmode: 'manual',
          aspectratio: { x: 1, y: 1, z: 1 }
        },
        margin: { l: 0, r: 0, b: 0, t: 40 },
      },
      { displayModeBar: false }
    );
  }

  // Neuer Handler, der direkt den Wert akzeptiert
  onSliderChangeValue(value: number) {
    this.currentFrameIndex = value;
    if (this.frames.length > 0) {
      this.updatePlot(this.frames[this.currentFrameIndex].grid, false);
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

  toggleLive(): void {
    this.live = !this.live;
    if (this.live) {
      this.avg = false;       // AVG ausschalten
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
    this.sensor.getLiveHeatmap().subscribe({
      next: (res) => {
        this.frame = res.data;
        this.updatePlot(this.frame.grid, true);
      },
      error: (err) => console.error('Fehler beim Laden der Heatmap-Frames:', err)
    });
  }

  toggleAVG(): void {
    this.avg = !this.avg;
    if (this.avg) {
      this.live = false;      // Live ausschalten
      this.stopLive();
      this.loadHeatmapFrames({ start: this.customStart, stop: this.customStop });
    }
  }
}
