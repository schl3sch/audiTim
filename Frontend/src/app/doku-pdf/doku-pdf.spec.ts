import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DokuPdf } from './doku-pdf';

describe('DokuPdf', () => {
  let component: DokuPdf;
  let fixture: ComponentFixture<DokuPdf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DokuPdf]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DokuPdf);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
