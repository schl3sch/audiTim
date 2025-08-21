import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArrayTestComponent } from '../array-test/array-test.component';
import { HttpClient } from '@angular/common/http';
import { Sensor } from '../sensor.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ArrayTestComponent],
  templateUrl: './admin.html',
})
export class Admin implements OnInit {
  nodeRedStatus: boolean | null = null;
  influxStatus: boolean | null = null;

  constructor(private http: HttpClient, private sensor: Sensor) {}

 ngOnInit() {
    this.checkStatuses();
    // Optional: alle 10 Sekunden aktualisieren
    setInterval(() => this.checkStatuses(), 10000);
  }
  
checkStatuses() {
  this.sensor.getStatus().subscribe({
  next: (res) => {
    this.nodeRedStatus = res.nodeRed;
    this.influxStatus = res.influx;
  },
  error: () => {
    this.nodeRedStatus = false;
    this.influxStatus = false;
  },
});
}
}