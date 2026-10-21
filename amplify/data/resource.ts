import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Usuario: a
    .model({
      email: a.string().required(),
      nombre: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),

  Materia: a
    .model({
      nombre: a.string().required(),
      descripcion: a.string(),
      creadorId: a.string().required(),
      admins: a.string().array(),
      profesores: a.string().array(),
      alumnos: a.string().array(),
      codigoInvitacion: a.string().required(),
      grupos: a.hasMany('Grupo', 'materiaId'),
    })
    .authorization((allow) => [allow.authenticated()]),

    Grupo: a
    .model({
      nombre: a.string().required(),
      materiaId: a.id(),
      materia: a.belongsTo('Materia', 'materiaId'),
      adminId: a.string().required(),
      integrantes: a.string().array(),
      codigoInvitacion: a.string(),
      esIndependiente: a.boolean(),
      cards: a.hasMany('Card', 'grupoId'),
    })
    .authorization((allow) => [allow.authenticated()]),

  Card: a
    .model({
      titulo: a.string().required(),
      descripcion: a.string(),
      estado: a.enum(['backlog', 'progreso', 'revision', 'hecho']),
      orden: a.integer(),
      pesoEsfuerzo: a.integer(),
      asignados: a.string().array(),
      fechaLimite: a.date(),
      revisadaPor: a.string(),
      revisadaEn: a.timestamp(),
      completadaEn: a.timestamp(),
      grupoId: a.id().required(),
      grupo: a.belongsTo('Grupo', 'grupoId'),
      adjuntos: a.string().array(),
      puntuacion: a.integer(),
      comentarioProfesor: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),

  EvaluacionPar: a
    .model({
      grupoId: a.id().required(),
      cardId: a.id().required(),
      hito: a.string().required(),
      evaluadorId: a.string().required(),
      evaluadoId: a.string().required(),
      coordinacion: a.integer().required(),
      comunicacion: a.integer().required(),
      responsabilidad: a.integer().required(),
      timestamp: a.timestamp().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  LogActividad: a
    .model({
      grupoId: a.id().required(),
      usuarioId: a.string().required(),
      accion: a.string().required(),
      entidad: a.string().required(),
      entidadId: a.string().required(),
      timestamp: a.timestamp().required(),
    })
    .authorization((allow) => [allow.authenticated().to(['read', 'create'])]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});