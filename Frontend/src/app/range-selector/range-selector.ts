import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-range-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './range-selector.html'
})

export class RangeSelector {
  @Input() availableStart: string | null = null;
  @Input() availableStop: string | null = null;

  @Output() rangeChange = new EventEmitter<{start?: string; stop?: string}>();

  selectedRange: string = '';
  customStart: string = '';
  customStop: string = '';

  onPresetRangeChange(): void {
    if (this.selectedRange !== 'custom') {
      let now = new Date();
      let start: Date;
      switch (this.selectedRange) {
        case '1m':
          start = new Date(now.getTime() - 1000 * 60);
          break;
        case '1h':
          start = new Date(now.getTime() - 1000 * 60 * 60);
          break;
        case '24h':
          start = new Date(now.getTime() - 1000 * 60 * 60 * 24);
          break;
        case '7d':
          start = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);
          break;
        default:
          start = now;
      }
      this.rangeChange.emit({ start: start.toISOString(), stop: now.toISOString() });
    }
  }

  loadCustomRange(): void {
    if (this.customStart && this.customStop) {
      const startDate = new Date(this.customStart);
      const stopDate = new Date(this.customStop);
      this.rangeChange.emit({
        start: startDate.toISOString(),
        stop: stopDate.toISOString()
      });
    }
  }
}
