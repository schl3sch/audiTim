import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface HeatmapFrame {
  time: string;
  grid: number[][];
}

export interface PeakFrame {
  time: string;
  peakX: number;
  peakY: number;
  peakValue: number;
}
  
// sensor.service.ts
@Injectable({ providedIn: 'root' })
export class Sensor {
  private baseUrl = 'http://localhost:3000/api'; // statt localhost? backend = Docker-Service-Name

  constructor(private http: HttpClient) {}

  getAllSensors(): Observable<any> {
    return this.http.get(`${this.baseUrl}/allsensors`);
  }

  getNewSensors(): Observable<any> {
    return this.http.get(`${this.baseUrl}/newsensors`);
  }

  // Ältester & neuster Timestamp pro Sensor
  getSensorRange(): Observable<{ oldest: string; newest: string }> {
  return this.http.get<{ oldest: string; newest: string }>(`${this.baseUrl}/sensorRange`);
  }

  // Werte für Zeitraum abfragen
  getSensorData(start: string | number, stop: string | number): Observable<Record<string,{time:string,value:number}[]>> {
    return this.http.post<Record<string,{time:string,value:number}[]>>(`${this.baseUrl}/sensorRange`, { start, stop });
  }

  getLiveSensorData(): Observable<Record<string, {time:string,value:number}[]>> {
    return this.http.get<Record<string, {time:string,value:number}[]>>(`${this.baseUrl}/sensorLive`);
  }

  getHeatmapArray(): Observable<{ data: { time: string; grid: number[][] } }> {
    return this.http.get<{ data: { time: string; grid: number[][] } }>(
      `${this.baseUrl}/getArray`
    );
  }

  getHeatmaps(): Observable<{ data: HeatmapFrame[] }> {
  return this.http.get<{ data: HeatmapFrame[] }>(`${this.baseUrl}/getAllHeatmaps`);
  }

  postHeatmapsRange(start: string, stop: string): Observable<{ data: HeatmapFrame[] }> {
  return this.http.post<{ data: HeatmapFrame[] }>(`${this.baseUrl}/postHeatmapsRange`, {
    start,
    stop,
  });
  }

  getHeatmapRange(): Observable<{ oldest: string; newest: string }> {
  return this.http.get<{ oldest: string; newest: string }>(`${this.baseUrl}/getHeatmapRange`);
  }

  
  getLiveHeatmap(): Observable<{ data: HeatmapFrame }> {
  return this.http.get<{ data: HeatmapFrame }>(`${this.baseUrl}/getLiveHeatmap`, {
  });
  }
  
  postHeatmapAvg(start: string, stop: string): Observable<{ data: HeatmapFrame }> {
  return this.http.post<{ data: HeatmapFrame }>(`${this.baseUrl}/postHeatmapAvg`, {
    start,
    stop,
  });
  }

  postPeaksRange(start: string, stop: string): Observable<{ data: PeakFrame[] }> {
    return this.http.post<{ data: PeakFrame[] }>(`${this.baseUrl}/postPeaksRange`, { start, stop });
  }

  getPeaks(): Observable<{ data: PeakFrame[] }> {
    return this.http.get<{ data: PeakFrame[] }>(`${this.baseUrl}/getPeaks`);
  }

  getLivePeaks(): Observable<{ data: PeakFrame }> {
  return this.http.get<{ data: PeakFrame }>(`${this.baseUrl}/getLivePeaks`);
  }

  getStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/status`);
  }
}

