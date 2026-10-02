import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MisAulas } from './mis-aulas';

describe('MisAulas', () => {
  let component: MisAulas;
  let fixture: ComponentFixture<MisAulas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisAulas],
    }).compileComponents();

    fixture = TestBed.createComponent(MisAulas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
