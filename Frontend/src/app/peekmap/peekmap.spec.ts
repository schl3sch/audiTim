import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Peekmap } from './peekmap';

describe('Peekmap', () => {
  let component: Peekmap;
  let fixture: ComponentFixture<Peekmap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Peekmap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Peekmap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
