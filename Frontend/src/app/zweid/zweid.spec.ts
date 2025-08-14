import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Zweid } from './zweid';

describe('Zweid', () => {
  let component: Zweid;
  let fixture: ComponentFixture<Zweid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Zweid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Zweid);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
