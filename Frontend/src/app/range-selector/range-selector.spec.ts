import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RangeSelector } from './range-selector';

describe('RangeSelector', () => {
  let component: RangeSelector;
  let fixture: ComponentFixture<RangeSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RangeSelector]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RangeSelector);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
