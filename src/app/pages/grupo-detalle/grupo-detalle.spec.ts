import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MateriaService } from '../../services/materia';
import { GrupoDetalle } from './grupo-detalle';

describe('GrupoDetalle', () => {
  let component: GrupoDetalle;
  let fixture: ComponentFixture<GrupoDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrupoDetalle],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: {} },
        { provide: MateriaService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GrupoDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
