import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrupoDetalle } from './grupo-detalle';

describe('GrupoDetalle', () => {
  let component: GrupoDetalle;
  let fixture: ComponentFixture<GrupoDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrupoDetalle],
    }).compileComponents();

    fixture = TestBed.createComponent(GrupoDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
