import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import type { Schema } from '../../../../amplify/data/resource';
import { AuthService } from '../../services/auth';
import { MateriaService } from '../../services/materia';
import {
  calcularMetricasParticipacion,
  GrupoDetalle,
} from './grupo-detalle';

type Card = Schema['Card']['type'];
type Grupo = Schema['Grupo']['type'];
type LogActividad = Schema['LogActividad']['type'];
type EvaluacionPar = Schema['EvaluacionPar']['type'];

function tarjeta(
  id: string,
  asignados: string[],
  pesoEsfuerzo: 1 | 3 | 5 = 1,
  fechaLimite: string | null = null,
): Card {
  return {
    id,
    grupoId: 'group-1',
    titulo: id,
    estado: 'hecho',
    orden: 0,
    asignados,
    pesoEsfuerzo,
    fechaLimite,
    completadaEn: Math.floor(new Date(2025, 0, 2, 12).getTime() / 1000),
  } as Card;
}

function log(usuarioId: string, accion: string, entidadId: string): LogActividad {
  return {
    grupoId: 'group-1',
    usuarioId,
    accion,
    entidad: 'Card',
    entidadId,
    timestamp: Math.floor(new Date(2025, 0, 2, 12).getTime() / 1000),
  } as LogActividad;
}

function evaluacion(
  cardId: string,
  evaluadorId: string,
  evaluadoId: string,
  score: number,
): EvaluacionPar {
  return {
    id: `${cardId}-${evaluadorId}-${evaluadoId}`,
    grupoId: 'group-1',
    cardId,
    hito: 'hecho',
    evaluadorId,
    evaluadoId,
    coordinacion: score,
    comunicacion: score,
    responsabilidad: score,
    timestamp: Math.floor(new Date(2025, 0, 2, 12).getTime() / 1000),
  } as EvaluacionPar;
}

describe('calcularMetricasParticipacion', () => {
  it('distributes effort across assignees and combines available metrics to 100%', () => {
    const cards = [
      tarjeta('shared', ['user-1', 'user-2'], 3, '2025-01-02'),
      tarjeta('late', ['user-1'], 1, '2025-01-01'),
    ];
    const logs = [
      log('user-1', 'completar_card', 'shared'),
      log('user-1', 'completar_card', 'late'),
      log('user-1', 'reabrir_card', 'late'),
      log('user-3', 'revisar_card', 'shared'),
    ];

    const metrics = calcularMetricasParticipacion(
      ['user-1', 'user-2', 'user-3'],
      cards,
      logs,
      [],
    );

    expect(metrics.map((person) => person.esfuerzo)).toEqual([62.5, 37.5, 0]);
    expect(metrics[0].puntualidad).toBeCloseTo(37.5);
    expect(metrics[1].puntualidad).toBeCloseTo(62.5);
    expect(metrics[1].calidad).toBeGreaterThan(metrics[0].calidad!);
    expect(metrics[2].colaboracion).toBe(100);
    expect(metrics.every((person) => person.evaluacionPares === null)).toBe(true);
    expect(metrics.reduce((sum, person) => sum + person.participacion!, 0)).toBeCloseTo(100);
  });

  it('uses an even split when an available metric has only zero scores', () => {
    const metrics = calcularMetricasParticipacion(
      ['user-1', 'user-2'],
      [tarjeta('late-1', ['user-1'], 1, '2025-01-01'), tarjeta('late-2', ['user-2'], 1, '2025-01-01')],
      [log('user-1', 'completar_card', 'late-1'), log('user-2', 'completar_card', 'late-2')],
      [],
    );

    expect(metrics.map((person) => person.puntualidad)).toEqual([50, 50]);
  });

  it('includes peer scores only after every group member has received a non-self evaluation', () => {
    const cards = [tarjeta('shared', ['user-1', 'user-2'], 3)];
    const logs = [log('user-1', 'completar_card', 'shared')];
    const incomplete = [
      evaluacion('shared', 'user-1', 'user-2', 3),
      evaluacion('shared', 'user-2', 'user-1', 5),
      evaluacion('shared', 'user-1', 'user-1', 1),
    ];
    const completed = [...incomplete, evaluacion('shared', 'user-2', 'user-3', 4)];

    const beforeAllPeers = calcularMetricasParticipacion(
      ['user-1', 'user-2', 'user-3'],
      cards,
      logs,
      incomplete,
    );
    const afterAllPeers = calcularMetricasParticipacion(
      ['user-1', 'user-2', 'user-3'],
      cards,
      logs,
      completed,
    );

    expect(beforeAllPeers.every((person) => person.evaluacionPares === null)).toBe(true);
    expect(afterAllPeers.map((person) => person.evaluacionesRecibidas)).toEqual([1, 1, 1]);
    expect(afterAllPeers.reduce((sum, person) => sum + person.evaluacionPares!, 0)).toBeCloseTo(100);
  });

  it('ignores deleted cards even when their activity remains in the log', () => {
    const metrics = calcularMetricasParticipacion(
      ['user-1', 'user-2'],
      [],
      [log('user-1', 'completar_card', 'deleted-card')],
      [],
    );

    expect(metrics.every((person) => person.participacion === null)).toBe(true);
  });
});

describe('GrupoDetalle', () => {
  let component: GrupoDetalle;
  let fixture: ComponentFixture<GrupoDetalle>;
  let cards: Card[];
  let logs: LogActividad[];
  let materiaService: {
    obtenerGrupo: ReturnType<typeof vi.fn>;
    listarCardsDeGrupo: ReturnType<typeof vi.fn>;
    listarLogsDeGrupo: ReturnType<typeof vi.fn>;
    listarEvaluacionesDeGrupo: ReturnType<typeof vi.fn>;
    actualizarCard: ReturnType<typeof vi.fn>;
    eliminarCard: ReturnType<typeof vi.fn>;
    registrarLog: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    cards = [tarjeta('card-1', ['user-1'], 3)];
    logs = [log('user-1', 'completar_card', 'card-1')];
    materiaService = {
      obtenerGrupo: vi.fn().mockResolvedValue({
        id: 'group-1',
        nombre: 'Grupo de prueba',
        adminId: 'user-1',
        integrantes: ['user-1', 'user-2'],
      } as Grupo),
      listarCardsDeGrupo: vi.fn().mockImplementation(async () => cards),
      listarLogsDeGrupo: vi.fn().mockImplementation(async () => logs),
      listarEvaluacionesDeGrupo: vi.fn().mockResolvedValue([]),
      actualizarCard: vi.fn().mockImplementation(async (id: string, updates: any) => {
        cards = cards.map((card) => (card.id === id ? { ...card, ...updates } : card));
      }),
      eliminarCard: vi.fn().mockImplementation(async (id: string) => {
        cards = cards.filter((card) => card.id !== id);
      }),
      registrarLog: vi.fn().mockImplementation(
        async (
          grupoId: string,
          usuarioId: string,
          accion: string,
          entidad: string,
          entidadId: string,
        ) => {
          logs.push({
            grupoId,
            usuarioId,
            accion,
            entidad,
            entidadId,
            timestamp: 1,
          } as LogActividad);
        },
      ),
    };

    await TestBed.configureTestingModule({
      imports: [GrupoDetalle],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'group-1' } } },
        },
        { provide: AuthService, useValue: { getUserId: vi.fn().mockResolvedValue('user-1') } },
        { provide: MateriaService, useValue: materiaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GrupoDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes a deleted card contribution after reloading the board', async () => {
    const card = component.todasLasCards()[0];

    expect(component.metricasParticipacion()[0].esfuerzo).toBe(100);

    component.eliminarCard(card);
    expect(component.confirmacionPendiente()).not.toBeNull();
    await component.confirmarAccionPendiente();

    expect(materiaService.eliminarCard).toHaveBeenCalledWith(card.id);
    expect(materiaService.listarCardsDeGrupo).toHaveBeenCalledTimes(2);
    expect(component.metricasParticipacion().every((person) => person.participacion === null)).toBe(true);
  });

  it('renders the new task modal with visible action buttons', () => {
    component.abrirCrearCard();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const botones = Array.from(root.querySelectorAll('.modal-acciones button')).map(
      (b) => (b.textContent ?? '').trim(),
    );
    expect(botones).toContain('Cancelar');
    expect(botones).toContain('Crear');
  });

  it('creates a task with description and reloads the board even without preselected assignees', async () => {
    (materiaService as any).crearCard = vi.fn().mockImplementation(
      async (grupoId: string, titulo: string, detalles: any) => {
        const nueva = {
          id: 'card-nueva',
          grupoId,
          titulo,
          descripcion: detalles.descripcion,
          estado: 'backlog',
          orden: 1,
          pesoEsfuerzo: detalles.pesoEsfuerzo,
          asignados: detalles.asignados,
        } as Card;
        cards = [...cards, nueva];
        return nueva;
      },
    );

    component.abrirCrearCard();
    component.asignadosSeleccionados.set([]);
    await component.guardarCard();
    expect(component.error()).toBe('Ingresá un título para la tarea.');

    component.cardTitulo = 'Armar presentación';
    component.cardDescripcion = 'Diapositivas finales';
    component.cardPesoEsfuerzo = 3;
    await component.guardarCard();

    expect((materiaService as any).crearCard).toHaveBeenCalledWith('group-1', 'Armar presentación', {
      descripcion: 'Diapositivas finales',
      pesoEsfuerzo: 3,
      asignados: [],
    });
    expect(component.mostrarModalCard()).toBe(false);
    expect(component.backlog().some((c) => c.id === 'card-nueva')).toBe(true);
  });

  it('extracts filename from attachment key correctly', () => {
    expect(component.nombreAdjunto('cards/123/1729000000-tp1.pdf')).toBe('tp1.pdf');
    expect(component.nombreAdjunto('')).toBe('archivo');
  });

  it('allows completing a task without assignees or peer review on an individual board and auto-assigns the user', async () => {
    // Configura tablero individual con 1 solo integrante (sin materiaId)
    component.grupo.set({
      id: 'group-1',
      nombre: 'Tablero personal',
      adminId: 'user-1',
      integrantes: ['user-1'],
      materiaId: undefined,
    } as unknown as Grupo);

    const cardProgreso = {
      id: 'card-solo',
      grupoId: 'group-1',
      titulo: 'Mi tarea individual',
      estado: 'progreso',
      orden: 0,
      asignados: [],
    } as unknown as Card;
    cards.push(cardProgreso);

    const dragEvent = {
      previousContainer: { data: [cardProgreso] },
      container: { data: [] },
      previousIndex: 0,
      currentIndex: 0,
    } as any;

    await component.drop(dragEvent, 'hecho');

    expect(component.error()).toBeNull();
    expect(materiaService.actualizarCard).toHaveBeenCalledWith(
      'card-solo',
      expect.objectContaining({
        estado: 'hecho',
        asignados: ['user-1'],
      }),
    );
  });

  it('blocks completing a task in a multi-member group without assignees and reviewer', async () => {
    component.grupo.set({
      id: 'group-1',
      nombre: 'Grupo de equipo',
      adminId: 'user-1',
      integrantes: ['user-1', 'user-2'],
      materiaId: 'materia-1',
    } as unknown as Grupo);

    const cardSinAsignados = {
      id: 'card-equipo',
      grupoId: 'group-1',
      titulo: 'Tarea de equipo',
      estado: 'progreso',
      orden: 0,
      asignados: [],
    } as unknown as Card;

    const dragEvent = {
      previousContainer: { data: [cardSinAsignados] },
      container: { data: [] },
      previousIndex: 0,
      currentIndex: 0,
    } as any;

    await component.drop(dragEvent, 'hecho');
    expect(component.error()).toBe('Asigná al menos una persona antes de completar la tarea.');
  });

  it('allows completing a task assigned to all members of a group without deadlocking', async () => {
    component.grupo.set({
      id: 'group-1',
      nombre: 'Grupo de equipo',
      adminId: 'user-1',
      integrantes: ['user-1', 'user-2'],
      materiaId: 'materia-1',
    } as unknown as Grupo);

    const cardCompartida = {
      id: 'card-compartida',
      grupoId: 'group-1',
      titulo: 'Tarea compartida por todo el grupo',
      estado: 'revision',
      orden: 0,
      asignados: ['user-1', 'user-2'],
    } as unknown as Card;
    cards.push(cardCompartida);

    const dragEvent = {
      previousContainer: { data: [cardCompartida] },
      container: { data: [] },
      previousIndex: 0,
      currentIndex: 0,
    } as any;

    await component.drop(dragEvent, 'hecho');
    expect(component.error()).toBeNull();
    expect(materiaService.actualizarCard).toHaveBeenCalledWith(
      'card-compartida',
      expect.objectContaining({
        estado: 'hecho',
        revisadaPor: 'user-1',
      }),
    );
  });

  it('displays informational message when creating a task in a classroom group with no members', () => {
    component.grupo.set({
      id: 'group-empty',
      nombre: 'Grupo sin alumnos',
      adminId: 'docente-1',
      integrantes: [],
      materiaId: 'materia-1',
    } as unknown as Grupo);

    component.abrirCrearCard();
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const ayuda = root.querySelector('.asignados-selector .ayuda');
    expect(ayuda?.textContent).toContain('Este grupo todavía no tiene alumnos inscriptos');
  });

  it('excludes classroom teachers from integrantesGrupo and hides assignee selector on solo individual boards', async () => {
    // Caso 1: grupo de aula donde el docente quedó en integrantes por error
    component.docentesAula.set(['docente-1']);
    component.esDocente.set(true);
    component.grupo.set({
      id: 'group-aula',
      nombre: 'Grupo 1',
      adminId: 'docente-1',
      integrantes: ['docente-1', 'alumno-1'],
      materiaId: 'materia-1',
    } as unknown as Grupo);

    expect(component.integrantesGrupo()).toEqual(['alumno-1']);

    // Caso 2: tablero individual (solo 1 integrante, sin materiaId)
    component.esDocente.set(false);
    component.docentesAula.set([]);
    component.grupo.set({
      id: 'tablero-solo',
      nombre: 'Mi tablero personal',
      adminId: 'user-1',
      integrantes: ['user-1'],
      materiaId: undefined,
    } as unknown as Grupo);

    expect(component.esTableroSolo).toBe(true);
    component.abrirCrearCard();
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.asignados-selector')).toBeNull();
  });

  it('formats all activity log actions into readable Spanish descriptions', () => {
    expect(component.describirLog({ accion: 'crear_backlog' } as LogActividad)).toBe(
      'creó una tarea en Backlog',
    );
    expect(component.describirLog({ accion: 'mover_a_progreso' } as LogActividad)).toBe(
      'movió una tarea a En progreso',
    );
    expect(component.describirLog({ accion: 'completar_card' } as LogActividad)).toBe(
      'completó una tarea',
    );
    expect(component.describirLog({ accion: 'editar_grupo' } as LogActividad)).toBe(
      'cambió el nombre del grupo',
    );
  });

  it('renders all group members in calificacion banner when ungraded (null) and opens Nueva tarea, Historial, and Integrantes modals without crashing', async () => {
    (materiaService as any).obtenerMateria = vi.fn().mockResolvedValue({
      id: 'materia-1',
      nombre: 'Ingeniería',
      creadorId: 'docente-1',
      admins: [],
      profesores: [],
      alumnos: ['alumno-1', 'alumno-2', 'alumno-3'],
    });
    (materiaService as any).alumnosEnOtroGrupo = vi.fn().mockResolvedValue([]);

    component.esDocente.set(true);
    component.docentesAula.set(['docente-1']);
    component.logs.set([]);
    expect(component.calificacionGrupo()).toBeNull();
    component.grupo.set({
      id: 'group-1',
      nombre: 'Grupo 1',
      adminId: 'docente-1',
      integrantes: ['alumno-1', 'alumno-2'],
      materiaId: 'materia-1',
    } as unknown as Grupo);

    expect(() => fixture.detectChanges()).not.toThrow();

    const root: HTMLElement = fixture.nativeElement;
    const chips = root.querySelectorAll('.notas-integrantes-grid .nota-integrante-card');
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain('Sin nota');
    expect(chips[1].textContent).toContain('Sin nota');

    // Abrir modal + Nueva tarea
    component.abrirCrearCard();
    expect(() => fixture.detectChanges()).not.toThrow();
    const modalCrear = root.querySelector('.modal h3');
    expect(modalCrear?.textContent).toContain('Nueva tarea');
    expect(component.asignadosSeleccionados()).toEqual(['alumno-1', 'alumno-2']);
    component.cerrarModalCard();
    fixture.detectChanges();

    // Abrir modal Historial
    component.abrirHistorial();
    expect(() => fixture.detectChanges()).not.toThrow();
    const modalHistorial = root.querySelector('.modal-historial h3');
    expect(modalHistorial?.textContent).toContain('Historial de actividad');
    component.cerrarHistorial();
    fixture.detectChanges();

    // Abrir modal Integrantes
    await component.abrirGestionarIntegrantes();
    expect(() => fixture.detectChanges()).not.toThrow();
    const modalIntegrantes = root.querySelector('.modal h3');
    expect(modalIntegrantes?.textContent).toContain('Gestionar integrantes');
    const itemsActuales = root.querySelectorAll('.integrantes-lista .fila-integrante-directa');
    expect(itemsActuales.length).toBe(3); // 2 actuales + 1 disponible para agregar
    component.cerrarGestionarIntegrantes();
    fixture.detectChanges();
  });
});
