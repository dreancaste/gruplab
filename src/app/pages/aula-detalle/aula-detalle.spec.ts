import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MateriaService } from '../../services/materia';
import { AulaDetalle } from './aula-detalle';

describe('AulaDetalle', () => {
  let component: AulaDetalle;
  let fixture: ComponentFixture<AulaDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AulaDetalle],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: {} },
        { provide: MateriaService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AulaDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
