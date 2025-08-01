import { Component } from '@angular/core';
import Plotly from 'plotly.js-dist-min';

@Component({
  selector: 'app-heatmap',
  imports: [],
  templateUrl: './heatmap.html',
  styleUrl: './heatmap.scss'
})

export class Heatmap {
 ngAfterViewInit(): void {
  const size = 10; // ← kleineres Gitter
  const x = Array.from({ length: size }, (_, i) => i);
  const y = Array.from({ length: size }, (_, i) => i);
  const z: number[][] = [];

  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      // Skaliertes Beispiel: Hügel näher anpassen wegen kleinerem Raster
      const value =
        Math.exp(-((i - 3) ** 2 + (j - 3) ** 2) / 4) +   // kleinerer Hügel
        Math.exp(-((i - 7) ** 2 + (j - 7) ** 2) / 4);    // zweiter Hügel
      row.push(value);
    }
    z.push(row);
  }

    Plotly.newPlot('plotly-heatmap', [
      {
        z: z,
        x: x,
        y: y,
        type: 'surface',
        colorscale: 'YlOrRd',
      },
    ],
    {
      title: {
        text: '3D Heatmap',
      },
      autosize: true,
      scene: {
        xaxis: {
          title: { text: 'X' },
        },
        yaxis: {
          title: { text: 'Y' },
        },
        zaxis: {
          title: { text: 'Z' },
        },
      },
    });
  }
}
