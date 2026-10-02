import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AulaDetalle } from './aula-detalle';

describe('AulaDetalle', () => {
  let component: AulaDetalle;
  let fixture: ComponentFixture<AulaDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AulaDetalle],
    }).compileComponents();

    fixture = TestBed.createComponent(AulaDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
