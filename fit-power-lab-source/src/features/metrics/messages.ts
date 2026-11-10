import type { Messages } from "@/app/i18n";

export const messages: Messages = {
  en: {
    "metrics.title": "Training metrics",
    "metrics.noRide": "Load a ride to see its training metrics.",
    "metrics.needWeights": "Confirm your weights to estimate power and see the training metrics.",
    "metrics.stretchNote":
      "Showing only the selected stretch, from {from} to {to}. The training load and the records always use every loaded ride.",

    "metrics.settings.title": "Your reference values",
    "metrics.settings.description":
      "Power zones, IF, TSS and the training load use your FTP; heart rate zones use your maximum heart rate. Leave a box empty to use the default. Both are saved in this browser.",
    "metrics.ftp.label": "FTP (W)",
    "metrics.ftp.defaultHint":
      "Default: {value} W, estimated from your best 20 minutes in this ride.",
    "metrics.ftp.noDefault":
      "No default: the ride is shorter than 20 minutes. Enter your FTP to see IF, TSS, zones and load.",
    "metrics.maxHr.label": "Maximum heart rate (bpm)",
    "metrics.maxHr.defaultHint": "Default: {value} bpm, the highest seen in this ride.",
    "metrics.maxHr.noDefault": "No default: this ride has no heart rate data.",
    "metrics.input.invalid": "Enter a whole number between {min} and {max}, or leave it empty.",

    "metrics.section.power": "Power, work and energy",
    "metrics.section.curve": "Power curve and FTP",
    "metrics.section.zones": "Zones",
    "metrics.section.terrain": "Climbs and elevation",
    "metrics.section.movement": "Moving and stopped time",
    "metrics.section.laps": "Laps",
    "metrics.section.cadence": "Cadence and torque",
    "metrics.section.load": "Training load (all rides)",
    "metrics.section.records": "Personal records (all rides)",

    "metrics.stat.np": "Normalized power",
    "metrics.stat.if": "Intensity factor (IF)",
    "metrics.stat.tss": "Training stress (TSS)",
    "metrics.stat.ftpUsed": "FTP used",
    "metrics.stat.ftpEstimate": "Estimated FTP",
    "metrics.stat.avgPower": "Average power while pedalling",
    "metrics.stat.wkg": "Average W/kg",
    "metrics.stat.work": "Work",
    "metrics.stat.mechKcal": "Energy burned (from work)",
    "metrics.stat.deviceKcal": "Device calories (whole ride)",
    "metrics.stat.decoupling": "Aerobic decoupling",
    "metrics.stat.ascent": "Ascent (corrected)",
    "metrics.stat.descent": "Descent (corrected)",
    "metrics.stat.deviceAscent": "Device ascent (whole ride)",
    "metrics.stat.total": "Elapsed time",
    "metrics.stat.moving": "Moving time",
    "metrics.stat.stopped": "Stopped time",
    "metrics.stat.stops": "Stops",
    "metrics.stat.optimalCadence": "Best cadence",
    "metrics.stat.coasting": "Time with the cranks still",
    "metrics.stat.torque": "Average torque",
    "metrics.stat.ctl": "Fitness (CTL)",
    "metrics.stat.atl": "Fatigue (ATL)",
    "metrics.stat.tsb": "Form (TSB)",

    "metrics.value.tooShort": "Ride too short",
    "metrics.value.needsFtp": "Needs your FTP",
    "metrics.value.needsHeartRate": "Needs heart rate",
    "metrics.value.notRecorded": "Not recorded",
    "metrics.value.na": "n/a",

    "metrics.hint.kcal": "Work over 4.184 kJ per kcal and over {pct} % gross efficiency.",
    "metrics.hint.deviceKcal": "Total of the session, not only the selected stretch.",
    "metrics.hint.decoupling":
      "Drop of the power to heart rate ratio from the first half to the second. Under 5 % usually means a well-built aerobic base.",
    "metrics.hint.ftpEstimate": "95 % of the best 20 minute power.",
    "metrics.hint.torque": "Power over angular speed, while pedalling.",
    "metrics.hint.ctl": "42 day exponential average of the daily TSS.",
    "metrics.hint.atl": "7 day exponential average of the daily TSS.",
    "metrics.hint.tsb": "Fitness minus fatigue of the day before.",

    "metrics.curve.tooShort": "This ride is too short for a power curve.",
    "metrics.curve.series": "Best average power",
    "metrics.curve.chart": "Power curve, best average power for each duration: {values}",

    "metrics.zones.powerTitle": "Time in each power zone",
    "metrics.zones.heartRateTitle": "Time in each heart rate zone",
    "metrics.zones.chart": "{title}, in minutes: {values}",
    "metrics.zones.series": "Time",
    "metrics.zones.zone": "Zone",
    "metrics.zones.range": "Range",
    "metrics.zones.time": "Time",
    "metrics.zones.share": "Share",
    "metrics.zones.needsFtp":
      "There are no power zones without an FTP. Enter yours above, or ride at least 20 minutes for an estimate.",
    "metrics.zones.noHeartRate":
      "This ride has no heart rate data, so there are no heart rate zones.",
    "metrics.zones.needsMaxHr": "Enter your maximum heart rate above to see the heart rate zones.",
    "metrics.zone.power.1": "Active recovery",
    "metrics.zone.power.2": "Endurance",
    "metrics.zone.power.3": "Tempo",
    "metrics.zone.power.4": "Threshold",
    "metrics.zone.power.5": "VO2max",
    "metrics.zone.power.6": "Anaerobic capacity",
    "metrics.zone.power.7": "Neuromuscular",
    "metrics.zone.heartRate.1": "Recovery",
    "metrics.zone.heartRate.2": "Endurance",
    "metrics.zone.heartRate.3": "Tempo",
    "metrics.zone.heartRate.4": "Threshold",
    "metrics.zone.heartRate.5": "Maximum",

    "metrics.terrain.hysteresis":
      "A change of altitude only counts once it exceeds {value}, which filters the 0.2 m steps of the barometer.",
    "metrics.climbs.title": "Climbs",
    "metrics.climbs.none": "No climbs found in this ride.",
    "metrics.climbs.start": "Start",
    "metrics.climbs.length": "Length",
    "metrics.climbs.gain": "Gain",
    "metrics.climbs.grade": "Average grade",
    "metrics.climbs.category": "Category",
    "metrics.climbs.power": "Power",
    "metrics.climbs.time": "Moving time",
    "metrics.climbs.rule":
      "A climb is at least {length} long, {grade} steep on average and {gain} of gain; a descent under {dip} does not end it. The category is the length in meters times the grade in percent: 8,000 is category 4 and 80,000 is hors catégorie.",
    "metrics.category.none": "Uncategorized",
    "metrics.category.4": "Category 4",
    "metrics.category.3": "Category 3",
    "metrics.category.2": "Category 2",
    "metrics.category.1": "Category 1",
    "metrics.category.hc": "Hors catégorie",

    "metrics.movement.rule":
      "Stopped means under {speed} m/s, and a stop lasts at least {seconds} s. A pause in the recording counts as stopped time.",

    "metrics.laps.title": "Laps",
    "metrics.laps.intro":
      "Automatic laps of {length}, counted from the start of the ride or of the selected stretch.",
    "metrics.laps.none": "This ride is too short for laps.",
    "metrics.laps.lap": "Lap",
    "metrics.laps.distance": "Distance",
    "metrics.laps.time": "Time",
    "metrics.laps.speed": "Speed",
    "metrics.laps.power": "Power (W)",
    "metrics.laps.heartRate": "Heart rate (bpm)",
    "metrics.laps.partial": "last",

    "metrics.cadence.none":
      "This ride has no cadence sensor data, so there is no cadence histogram.",
    "metrics.cadence.series": "Time",
    "metrics.cadence.chart": "Time at each cadence in minutes: {values}",
    "metrics.cadence.basisEfficiency":
      "Lowest heart rate per watt among the cadences with at least {seconds} s of data.",
    "metrics.cadence.basisTime":
      "Where you spent the most time: there is not enough heart rate data to compare cadences.",
    "metrics.torque.series": "Torque",
    "metrics.torque.chart": "Average torque at each cadence in N·m: {values}",

    "metrics.load.needsFtp": "The training load needs an FTP. Enter yours above.",
    "metrics.load.needsDays":
      "Load rides from at least two different days to see the training load.",
    "metrics.load.ctl": "Fitness (CTL)",
    "metrics.load.atl": "Fatigue (ATL)",
    "metrics.load.tsb": "Form (TSB)",
    "metrics.load.chart":
      "Training load by day, from {from} to {to}. At the end: fitness (CTL) {ctl}, fatigue (ATL) {atl}, form (TSB) {tsb}.",
    "metrics.load.weekly": "Weekly load",
    "metrics.load.week": "Week starting Monday",

    "metrics.records.moreRides":
      "Load more rides to compare them: the records and the training load use every loaded ride.",
    "metrics.records.noDistances": "No loaded ride covers 5 km yet.",
    "metrics.records.noClimbs": "No climbs in the loaded rides yet.",
    "metrics.records.distanceTitle": "Best times by distance",
    "metrics.records.climbTitle": "Best climbs by VAM",
    "metrics.records.distance": "Distance",
    "metrics.records.time": "Time",
    "metrics.records.speed": "Average speed",
    "metrics.records.ride": "Ride",
    "metrics.records.date": "Date",
  },
  es: {
    "metrics.title": "Métricas de entrenamiento",
    "metrics.noRide": "Carga una salida para ver sus métricas de entrenamiento.",
    "metrics.needWeights":
      "Confirma tus pesos para estimar la potencia y ver las métricas de entrenamiento.",
    "metrics.stretchNote":
      "Se muestra solo el tramo seleccionado, de {from} a {to}. La carga de entrenamiento y los récords usan siempre todas las salidas cargadas.",

    "metrics.settings.title": "Tus valores de referencia",
    "metrics.settings.description":
      "Las zonas de potencia, el IF, el TSS y la carga de entrenamiento usan tu FTP; las zonas de frecuencia cardíaca usan tu frecuencia máxima. Deja una casilla vacía para usar el valor por defecto. Ambos se guardan en este navegador.",
    "metrics.ftp.label": "FTP (W)",
    "metrics.ftp.defaultHint":
      "Por defecto: {value} W, estimado con tus mejores 20 minutos de esta salida.",
    "metrics.ftp.noDefault":
      "Sin valor por defecto: la salida dura menos de 20 minutos. Ingresa tu FTP para ver IF, TSS, zonas y carga.",
    "metrics.maxHr.label": "Frecuencia cardíaca máxima (lpm)",
    "metrics.maxHr.defaultHint": "Por defecto: {value} lpm, la más alta de esta salida.",
    "metrics.maxHr.noDefault":
      "Sin valor por defecto: esta salida no tiene datos de frecuencia cardíaca.",
    "metrics.input.invalid":
      "Ingresa un número entero entre {min} y {max}, o deja la casilla vacía.",

    "metrics.section.power": "Potencia, trabajo y energía",
    "metrics.section.curve": "Curva de potencia y FTP",
    "metrics.section.zones": "Zonas",
    "metrics.section.terrain": "Subidas y desnivel",
    "metrics.section.movement": "Tiempo en movimiento y detenido",
    "metrics.section.laps": "Vueltas",
    "metrics.section.cadence": "Cadencia y torque",
    "metrics.section.load": "Carga de entrenamiento (todas las salidas)",
    "metrics.section.records": "Récords personales (todas las salidas)",

    "metrics.stat.np": "Potencia normalizada",
    "metrics.stat.if": "Índice de intensidad (IF)",
    "metrics.stat.tss": "Carga de entrenamiento (TSS)",
    "metrics.stat.ftpUsed": "FTP usado",
    "metrics.stat.ftpEstimate": "FTP estimado",
    "metrics.stat.avgPower": "Potencia media al pedalear",
    "metrics.stat.wkg": "W/kg promedio",
    "metrics.stat.work": "Trabajo",
    "metrics.stat.mechKcal": "Energía gastada (según el trabajo)",
    "metrics.stat.deviceKcal": "Calorías del equipo (salida completa)",
    "metrics.stat.decoupling": "Desacople aeróbico",
    "metrics.stat.ascent": "Ascenso (corregido)",
    "metrics.stat.descent": "Descenso (corregido)",
    "metrics.stat.deviceAscent": "Ascenso del equipo (salida completa)",
    "metrics.stat.total": "Tiempo transcurrido",
    "metrics.stat.moving": "Tiempo en movimiento",
    "metrics.stat.stopped": "Tiempo detenido",
    "metrics.stat.stops": "Paradas",
    "metrics.stat.optimalCadence": "Mejor cadencia",
    "metrics.stat.coasting": "Tiempo con las bielas quietas",
    "metrics.stat.torque": "Torque medio",
    "metrics.stat.ctl": "Forma física (CTL)",
    "metrics.stat.atl": "Fatiga (ATL)",
    "metrics.stat.tsb": "Frescura (TSB)",

    "metrics.value.tooShort": "Salida demasiado corta",
    "metrics.value.needsFtp": "Necesita tu FTP",
    "metrics.value.needsHeartRate": "Necesita frecuencia cardíaca",
    "metrics.value.notRecorded": "Sin registro",
    "metrics.value.na": "n/d",

    "metrics.hint.kcal": "Trabajo entre 4,184 kJ por kcal y entre {pct} % de eficiencia bruta.",
    "metrics.hint.deviceKcal": "Total de la sesión, no solo del tramo seleccionado.",
    "metrics.hint.decoupling":
      "Caída de la relación potencia sobre frecuencia cardíaca entre la primera mitad y la segunda. Menos de 5 % suele indicar una buena base aeróbica.",
    "metrics.hint.ftpEstimate": "95 % de la mejor potencia de 20 minutos.",
    "metrics.hint.torque": "Potencia sobre velocidad angular, mientras se pedalea.",
    "metrics.hint.ctl": "Promedio exponencial de 42 días del TSS diario.",
    "metrics.hint.atl": "Promedio exponencial de 7 días del TSS diario.",
    "metrics.hint.tsb": "Forma física menos fatiga del día anterior.",

    "metrics.curve.tooShort": "Esta salida es demasiado corta para una curva de potencia.",
    "metrics.curve.series": "Mejor potencia media",
    "metrics.curve.chart": "Curva de potencia, mejor potencia media para cada duración: {values}",

    "metrics.zones.powerTitle": "Tiempo en cada zona de potencia",
    "metrics.zones.heartRateTitle": "Tiempo en cada zona de frecuencia cardíaca",
    "metrics.zones.chart": "{title}, en minutos: {values}",
    "metrics.zones.series": "Tiempo",
    "metrics.zones.zone": "Zona",
    "metrics.zones.range": "Rango",
    "metrics.zones.time": "Tiempo",
    "metrics.zones.share": "Porcentaje",
    "metrics.zones.needsFtp":
      "Sin FTP no hay zonas de potencia. Ingresa el tuyo arriba o pedalea al menos 20 minutos para obtener una estimación.",
    "metrics.zones.noHeartRate":
      "Esta salida no tiene datos de frecuencia cardíaca, así que no hay zonas de frecuencia cardíaca.",
    "metrics.zones.needsMaxHr":
      "Ingresa arriba tu frecuencia cardíaca máxima para ver las zonas de frecuencia cardíaca.",
    "metrics.zone.power.1": "Recuperación activa",
    "metrics.zone.power.2": "Resistencia",
    "metrics.zone.power.3": "Tempo",
    "metrics.zone.power.4": "Umbral",
    "metrics.zone.power.5": "VO2max",
    "metrics.zone.power.6": "Capacidad anaeróbica",
    "metrics.zone.power.7": "Neuromuscular",
    "metrics.zone.heartRate.1": "Recuperación",
    "metrics.zone.heartRate.2": "Resistencia",
    "metrics.zone.heartRate.3": "Tempo",
    "metrics.zone.heartRate.4": "Umbral",
    "metrics.zone.heartRate.5": "Máxima",

    "metrics.terrain.hysteresis":
      "Un cambio de altitud solo cuenta cuando supera {value}, lo que filtra los escalones de 0,2 m del barómetro.",
    "metrics.climbs.title": "Subidas",
    "metrics.climbs.none": "No se encontraron subidas en esta salida.",
    "metrics.climbs.start": "Inicio",
    "metrics.climbs.length": "Longitud",
    "metrics.climbs.gain": "Desnivel",
    "metrics.climbs.grade": "Pendiente media",
    "metrics.climbs.category": "Categoría",
    "metrics.climbs.power": "Potencia",
    "metrics.climbs.time": "Tiempo en movimiento",
    "metrics.climbs.rule":
      "Una subida mide al menos {length}, tiene {grade} de pendiente media y {gain} de desnivel; un descenso menor a {dip} no la termina. La categoría es la longitud en metros por la pendiente en porcentaje: 8.000 es categoría 4 y 80.000 es fuera de categoría.",
    "metrics.category.none": "Sin categoría",
    "metrics.category.4": "Categoría 4",
    "metrics.category.3": "Categoría 3",
    "metrics.category.2": "Categoría 2",
    "metrics.category.1": "Categoría 1",
    "metrics.category.hc": "Fuera de categoría",

    "metrics.movement.rule":
      "Detenido significa menos de {speed} m/s, y una parada dura al menos {seconds} s. Una pausa en la grabación cuenta como tiempo detenido.",

    "metrics.laps.title": "Vueltas",
    "metrics.laps.intro":
      "Vueltas automáticas de {length}, contadas desde el inicio de la salida o del tramo seleccionado.",
    "metrics.laps.none": "Esta salida es demasiado corta para tener vueltas.",
    "metrics.laps.lap": "Vuelta",
    "metrics.laps.distance": "Distancia",
    "metrics.laps.time": "Tiempo",
    "metrics.laps.speed": "Velocidad",
    "metrics.laps.power": "Potencia (W)",
    "metrics.laps.heartRate": "Frecuencia cardíaca (lpm)",
    "metrics.laps.partial": "última",

    "metrics.cadence.none":
      "Esta salida no tiene datos del sensor de cadencia, así que no hay histograma de cadencia.",
    "metrics.cadence.series": "Tiempo",
    "metrics.cadence.chart": "Tiempo en cada cadencia, en minutos: {values}",
    "metrics.cadence.basisEfficiency":
      "Menor frecuencia cardíaca por vatio entre las cadencias con al menos {seconds} s de datos.",
    "metrics.cadence.basisTime":
      "Donde pasaste más tiempo: no hay datos de frecuencia cardíaca suficientes para comparar cadencias.",
    "metrics.torque.series": "Torque",
    "metrics.torque.chart": "Torque medio en cada cadencia, en N·m: {values}",

    "metrics.load.needsFtp": "La carga de entrenamiento necesita un FTP. Ingresa el tuyo arriba.",
    "metrics.load.needsDays":
      "Carga salidas de al menos dos días distintos para ver la carga de entrenamiento.",
    "metrics.load.ctl": "Forma física (CTL)",
    "metrics.load.atl": "Fatiga (ATL)",
    "metrics.load.tsb": "Frescura (TSB)",
    "metrics.load.chart":
      "Carga de entrenamiento por día, del {from} al {to}. Al final: forma física (CTL) {ctl}, fatiga (ATL) {atl}, frescura (TSB) {tsb}.",
    "metrics.load.weekly": "Carga semanal",
    "metrics.load.week": "Semana que empieza el lunes",

    "metrics.records.moreRides":
      "Carga más salidas para compararlas: los récords y la carga de entrenamiento usan todas las salidas cargadas.",
    "metrics.records.noDistances": "Ninguna salida cargada llega aún a 5 km.",
    "metrics.records.noClimbs": "Aún no hay subidas en las salidas cargadas.",
    "metrics.records.distanceTitle": "Mejores tiempos por distancia",
    "metrics.records.climbTitle": "Mejores subidas por VAM",
    "metrics.records.distance": "Distancia",
    "metrics.records.time": "Tiempo",
    "metrics.records.speed": "Velocidad media",
    "metrics.records.ride": "Salida",
    "metrics.records.date": "Fecha",
  },
};
