# SNSP Gestión Inteligente · V2.0

Plataforma de gestión de proyectos, actividades, acuerdos y calendario para el área de
Inteligencia e Información del SNSP, Querétaro.

## Cómo abrirla

1. Descomprime el ZIP en una carpeta.
2. Abre `index.html` con doble clic (Chrome, Edge o Firefox actualizados).
3. No requiere instalación, servidor ni internet. Con conexión carga las tipografías
   institucionales (Montserrat y Noto Sans); sin conexión usa las del sistema.

Los datos se guardan en el navegador del equipo, con la misma clave que la V1
(`snsp-gestion-v1`). Si ya usabas la V1 **en el mismo navegador y desde la misma ubicación
de archivo**, tus registros aparecerán automáticamente. Si cambias de carpeta o de equipo, usa
*Reportes › Respaldar datos JSON* en la versión anterior y *Restaurar respaldo JSON* en esta.

> Recomendación: descarga un respaldo JSON al menos una vez por semana. Borrar el historial
> o los datos de navegación elimina la información.

## Estructura

```
index.html              Página principal
css/styles.css          Estilos institucionales (paleta, componentes, adaptable, impresión)
js/config.js            Configuración: nombre del área, catálogos, menú, días de "por vencer"
js/utils.js             Fechas locales, semáforo, CSV, iconos
js/store.js             Datos: carga, compatibilidad V1, guardado, historial, consultas
js/ui.js                Avisos, confirmaciones, formularios, validación, gráficas
js/editors.js           Formularios de proyecto, actividad, acuerdo y reunión
js/views/*.js           Un archivo por módulo (tablero, proyectos, actividades, calendario, acuerdos, reportes)
js/app.js               Navegación, eventos, búsqueda global, inicio
```

## Modelo de datos (compatible con V1)

| Colección   | Campos V1 (sin cambios)                                   | Campos nuevos opcionales                 |
|-------------|-----------------------------------------------------------|------------------------------------------|
| projects    | id, name, goal, owner, target, progress                   | start, priority, status, area            |
| tasks       | id, name, project, owner, due, status, evidence, detail   | priority, doneAt, area, created          |
| agreements  | id, name, context, owner, due, status                     | meetingDate, project, notes, area        |
| events      | —                                                         | reuniones del calendario (nuevo)         |
| log         | —                                                         | historial de cambios (nuevo)             |
| meta        | —                                                         | schemaVersion, area, created, updated    |

`progress` ahora se calcula y se guarda automáticamente con las actividades terminadas.

## Preparación para crecer

- **Áreas**: cada registro guarda `area`; `config.js` tiene `areas` y `defaultArea`.
- **Usuarios, roles y responsables**: el campo `owner` ya alimenta listas de sugerencias y el
  reporte por responsable; puede sustituirse por un catálogo de personas sin cambiar las vistas.
- **Metas e indicadores PAT, evidencias, reportes por área**: agregar una colección en
  `store.js`, una vista en `js/views/` y una entrada en `SNSP.nav`.
- **Servidor o base de datos**: solo cambian `load()` y `save()` en `store.js`.
