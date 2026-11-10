import type { Messages } from "@/app/i18n";

export const messages: Messages = {
  en: {
    "model.title": "Power model",
    "model.reset": "Reset model",
    "model.needsRide": "Load a ride and confirm your weights to use this.",
    "model.field.invalid": "Enter a number from {min} to {max}.",
    "model.preset.custom": "Custom value",

    "model.summary.title": "Live estimate",
    "model.summary.wholeRide": "Whole ride",
    "model.summary.stretch": "Selected stretch: {from} to {to}",
    "model.summary.average": "Average power while pedalling",
    "model.summary.peak": "Peak power",
    "model.summary.share": "Time pedalling",
    "model.summary.none": "Load a ride and confirm your weights to see the estimate here.",

    "model.base.title": "Base parameters",
    "model.base.description":
      "Drag area, rolling resistance and drivetrain losses. Pick a preset or type your own value.",
    "model.posture.legend": "Riding position",
    "model.posture.urban": "Urban, upright",
    "model.posture.handsUp": "Hands up (tops or hoods)",
    "model.posture.lowGrip": "Low grip (drops)",
    "model.surface.legend": "Tires and surface",
    "model.surface.asphalt": "Asphalt, road tires",
    "model.surface.gravel": "Gravel",
    "model.surface.dirt": "Dirt road",
    "model.cdA": "Drag area CdA (m²)",
    "model.crr": "Rolling resistance Crr",
    "model.efficiency": "Drivetrain efficiency (%)",

    "model.wind.title": "Wind",
    "model.wind.description":
      "Entered or estimated wind. It needs the GPS positions of the ride to know whether it blows against you.",
    "model.wind.legend": "Estimated wind",
    "model.wind.calm": "Calm",
    "model.wind.light": "Light breeze",
    "model.wind.moderate": "Moderate breeze",
    "model.wind.fresh": "Fresh breeze",
    "model.wind.speed": "Wind speed ({unit})",
    "model.wind.from": "Wind direction, coming from (degrees)",
    "model.wind.fromLabel": "Wind from the {dir} ({deg}°)",
    "model.wind.noGps": "This ride has no GPS positions, so the wind has no effect on it.",
    "model.wind.coverage":
      "The wind acts on {count} of {total} samples (those with a direction of travel).",
    "model.compass.N": "north",
    "model.compass.NE": "northeast",
    "model.compass.E": "east",
    "model.compass.SE": "southeast",
    "model.compass.S": "south",
    "model.compass.SW": "southwest",
    "model.compass.W": "west",
    "model.compass.NW": "northwest",

    "model.signal.title": "Speed and braking",
    "model.signal.description":
      "Smooth the speed to remove false spikes, and treat hard slowing down as braking.",
    "model.smoothing": "Speed smoothing (seconds, 0 = off)",
    "model.smoothing.hint":
      "Averages the speed over this window before acceleration and drag are computed.",
    "model.braking": "Detect braking",
    "model.braking.hint":
      "Slowing down faster than {limit} m/s² counts as braking: 0 W and no change of kinetic energy.",
    "model.braking.found": "Braking events in this ride: {count}",

    "model.air.title": "Air",
    "model.air.description": "Temperature and pressure decide the air density.",
    "model.temp.offset": "Temperature correction ({unit})",
    "model.temp.hint":
      "The sensor reads hot. This amount is subtracted from the device temperature.",
    "model.temp.ride": "Device average {device}, used for the air density {used}.",
    "model.temp.none": "This ride recorded no temperature.",
    "model.pressure.some":
      "{count} samples carry a real pressure; it replaces the standard atmosphere for them.",
    "model.pressure.none":
      "This ride has no pressure data, so the standard atmosphere for the altitude is used. Files that carry pressure use it automatically.",

    "model.draft.title": "Group riding",
    "model.draft.description":
      "Riding behind others cuts drag. Pick the group or enter a drag multiplier.",
    "model.draft.legend": "Group",
    "model.draft.alone": "Alone",
    "model.draft.pair": "Behind one rider",
    "model.draft.smallGroup": "Small group",
    "model.draft.peloton": "Inside a bunch",
    "model.draft.factor": "Drag multiplier (1 = alone)",
    "model.draft.reduction": "Drag reduced by {percent}%",
    "model.draft.none": "No drag reduction",
    "model.draft.wholeRide": "Applies to the whole ride.",

    "model.calibrate.title": "Calibrate with known power",
    "model.calibrate.description":
      "Enter the average power you know for a stretch (from a power meter or a test). The factor multiplies all the watts.",
    "model.calibrate.stretchRange": "Stretch: {from} to {to} (selected on the charts)",
    "model.calibrate.stretchWhole": "Stretch: the whole ride",
    "model.calibrate.known": "Known average power (W)",
    "model.calibrate.none": "There is nothing to calibrate against: the stretch has no pedalling.",
    "model.calibrate.result":
      "Estimated {estimated} W against known {known} W gives a factor of {factor}.",
    "model.calibrate.implausible":
      "This factor is far from 1. Check the weights, the stretch and the known power before applying it.",
    "model.calibrate.current": "Current factor: {factor}",
    "model.calibrate.apply": "Apply factor",
    "model.calibrate.remove": "Remove calibration",

    "model.coast.title": "Coast-down estimate",
    "model.coast.description":
      "Estimates CdA and Crr from the stretches where you neither pedalled nor braked.",
    "model.coast.none":
      "Not enough steady coasting. It needs a cadence sensor, 20 or more coasting samples and speeds that vary by at least 3 m/s.",
    "model.coast.result": "CdA {cdA} m², Crr {crr}",
    "model.coast.quality": "Fit quality (R²): {quality}, from {samples} samples",
    "model.coast.unreliable":
      "The fit is weak or the values are not plausible for a bicycle (wind, braking or sensor noise). Do not rely on it.",
    "model.coast.apply": "Apply CdA and Crr",

    "model.band.title": "Uncertainty band",
    "model.band.description":
      "Lowest and highest power if the drag area is off by {cdA}%, the rolling resistance by {crr}% and the rider mass by {mass} {unit}.",
    "model.band.chartLabel":
      "Estimated power with its uncertainty band by distance in {unit}; the average pedalling power goes from {low} W to {high} W",
    "model.band.estimate": "Estimate",
    "model.band.range": "Band",
    "model.band.figure": "Figure",
    "model.band.low": "Low",
    "model.band.high": "High",
    "model.band.average": "Average pedalling power",
    "model.band.peak": "Peak power",

    "model.hr.title": "Power and heart rate",
    "model.hr.description":
      "Learns your own relation between power and heart rate and finds the stretches that do not follow it.",
    "model.hr.none": "No relation can be read. It needs heart rate data and power that varies.",
    "model.hr.slope": "{slope} bpm per 100 W",
    "model.hr.intercept": "Heart rate at 0 W: {bpm} bpm",
    "model.hr.fit": "Fit quality (R²): {r2}, over {blocks} blocks of 30 s",
    "model.hr.noOutliers": "No stretch departs from your usual relation.",
    "model.hr.high":
      "heart rate {bpm} bpm above expected: more effort than the estimated power shows",
    "model.hr.low":
      "heart rate {bpm} bpm below expected: less effort than the estimated power shows",
    "model.hr.select": "Select the stretch {from} to {to}",

    "model.measured.title": "Measured against estimated",
    "model.measured.description":
      "When the file carries power from a meter, the estimate is compared with it.",
    "model.measured.none": "This file carries no measured power.",
    "model.measured.figure": "Figure",
    "model.measured.value": "Value",
    "model.measured.samples": "Samples compared",
    "model.measured.meanMeasured": "Mean measured power",
    "model.measured.meanEstimated": "Mean estimated power",
    "model.measured.bias": "Bias (estimated minus measured)",
    "model.measured.mae": "Mean absolute error",
    "model.measured.rmse": "Root mean square error",
    "model.measured.correlation": "Correlation",

    "model.learn.title": "Learned correction",
    "model.learn.description":
      "Learns one scale, by least squares, from every loaded ride that carries measured power.",
    "model.learn.none":
      "No loaded ride carries measured power, so there is nothing to learn from. Load rides recorded with a power meter.",
    "model.learn.result":
      "Learned from {rides} rides and {samples} samples: multiply the estimate by {scale}.",
    "model.learn.error": "Typical error {before} W before, {after} W after.",
    "model.learn.apply": "Apply to the model",
  },
  es: {
    "model.title": "Modelo de potencia",
    "model.reset": "Restablecer el modelo",
    "model.needsRide": "Carga una salida y confirma tus pesos para usar esto.",
    "model.field.invalid": "Escribe un número entre {min} y {max}.",
    "model.preset.custom": "Valor personalizado",

    "model.summary.title": "Estimación en vivo",
    "model.summary.wholeRide": "Toda la salida",
    "model.summary.stretch": "Tramo seleccionado: {from} a {to}",
    "model.summary.average": "Potencia media al pedalear",
    "model.summary.peak": "Potencia máxima",
    "model.summary.share": "Tiempo pedaleando",
    "model.summary.none": "Carga una salida y confirma tus pesos para ver aquí la estimación.",

    "model.base.title": "Parámetros base",
    "model.base.description":
      "Área de arrastre, resistencia a la rodadura y pérdidas de la transmisión. Elige un preajuste o escribe tu propio valor.",
    "model.posture.legend": "Postura",
    "model.posture.urban": "Urbana, erguido",
    "model.posture.handsUp": "Manos arriba (parte alta o manetas)",
    "model.posture.lowGrip": "Agarre bajo (parte baja del manillar)",
    "model.surface.legend": "Neumáticos y superficie",
    "model.surface.asphalt": "Asfalto, neumáticos de ruta",
    "model.surface.gravel": "Grava",
    "model.surface.dirt": "Camino de tierra",
    "model.cdA": "Área de arrastre CdA (m²)",
    "model.crr": "Resistencia a la rodadura Crr",
    "model.efficiency": "Eficiencia de la transmisión (%)",

    "model.wind.title": "Viento",
    "model.wind.description":
      "Viento ingresado o estimado. Necesita las posiciones GPS de la salida para saber si sopla en contra.",
    "model.wind.legend": "Viento estimado",
    "model.wind.calm": "Calma",
    "model.wind.light": "Brisa ligera",
    "model.wind.moderate": "Brisa moderada",
    "model.wind.fresh": "Brisa fresca",
    "model.wind.speed": "Velocidad del viento ({unit})",
    "model.wind.from": "Dirección del viento, de dónde viene (grados)",
    "model.wind.fromLabel": "Viento del {dir} ({deg}°)",
    "model.wind.noGps": "Esta salida no tiene posiciones GPS, así que el viento no la afecta.",
    "model.wind.coverage":
      "El viento actúa sobre {count} de {total} muestras (las que tienen dirección de avance).",
    "model.compass.N": "norte",
    "model.compass.NE": "noreste",
    "model.compass.E": "este",
    "model.compass.SE": "sureste",
    "model.compass.S": "sur",
    "model.compass.SW": "suroeste",
    "model.compass.W": "oeste",
    "model.compass.NW": "noroeste",

    "model.signal.title": "Velocidad y frenadas",
    "model.signal.description":
      "Suaviza la velocidad para quitar picos falsos y trata las desaceleraciones fuertes como frenadas.",
    "model.smoothing": "Suavizado de velocidad (segundos, 0 = sin suavizado)",
    "model.smoothing.hint":
      "Promedia la velocidad en esta ventana antes de calcular la aceleración y el arrastre.",
    "model.braking": "Detectar frenadas",
    "model.braking.hint":
      "Frenar a más de {limit} m/s² cuenta como frenada: 0 W y sin cambio de energía cinética.",
    "model.braking.found": "Frenadas en esta salida: {count}",

    "model.air.title": "Aire",
    "model.air.description": "La temperatura y la presión determinan la densidad del aire.",
    "model.temp.offset": "Corrección de temperatura ({unit})",
    "model.temp.hint":
      "El sensor lee caliente. Esta cantidad se resta de la temperatura del dispositivo.",
    "model.temp.ride": "Promedio del dispositivo {device}, usado para la densidad del aire {used}.",
    "model.temp.none": "Esta salida no registró temperatura.",
    "model.pressure.some":
      "{count} muestras traen una presión real; reemplaza a la atmósfera estándar en ellas.",
    "model.pressure.none":
      "Esta salida no trae presión, así que se usa la atmósfera estándar para la altitud. Los archivos que la traen la usan automáticamente.",

    "model.draft.title": "Rodar en grupo",
    "model.draft.description":
      "Rodar detrás de otros reduce el arrastre. Elige el grupo o ingresa un multiplicador de arrastre.",
    "model.draft.legend": "Grupo",
    "model.draft.alone": "Solo",
    "model.draft.pair": "Detrás de un ciclista",
    "model.draft.smallGroup": "Grupo pequeño",
    "model.draft.peloton": "Dentro del pelotón",
    "model.draft.factor": "Multiplicador de arrastre (1 = solo)",
    "model.draft.reduction": "Arrastre reducido en {percent}%",
    "model.draft.none": "Sin reducción de arrastre",
    "model.draft.wholeRide": "Se aplica a toda la salida.",

    "model.calibrate.title": "Calibrar con potencia conocida",
    "model.calibrate.description":
      "Ingresa la potencia media que conoces de un tramo (de un medidor o de una prueba). El factor multiplica todos los vatios.",
    "model.calibrate.stretchRange": "Tramo: {from} a {to} (seleccionado en las gráficas)",
    "model.calibrate.stretchWhole": "Tramo: toda la salida",
    "model.calibrate.known": "Potencia media conocida (W)",
    "model.calibrate.none": "No hay con qué calibrar: el tramo no tiene pedaleo.",
    "model.calibrate.result":
      "Estimado {estimated} W frente a {known} W conocidos da un factor de {factor}.",
    "model.calibrate.implausible":
      "Este factor está lejos de 1. Revisa los pesos, el tramo y la potencia conocida antes de aplicarlo.",
    "model.calibrate.current": "Factor actual: {factor}",
    "model.calibrate.apply": "Aplicar factor",
    "model.calibrate.remove": "Quitar calibración",

    "model.coast.title": "Estimación por bajadas sin pedalear",
    "model.coast.description":
      "Estima CdA y Crr a partir de los tramos en los que no pedaleaste ni frenaste.",
    "model.coast.none":
      "No hay suficientes bajadas constantes. Necesita un sensor de cadencia, 20 o más muestras sin pedalear y velocidades que varíen al menos 3 m/s.",
    "model.coast.result": "CdA {cdA} m², Crr {crr}",
    "model.coast.quality": "Calidad del ajuste (R²): {quality}, con {samples} muestras",
    "model.coast.unreliable":
      "El ajuste es débil o los valores no son plausibles para una bicicleta (viento, frenadas o ruido del sensor). No confíes en él.",
    "model.coast.apply": "Aplicar CdA y Crr",

    "model.band.title": "Banda de incertidumbre",
    "model.band.description":
      "Potencia mínima y máxima si el área de arrastre se equivoca en {cdA}%, la rodadura en {crr}% y la masa del ciclista en {mass} {unit}.",
    "model.band.chartLabel":
      "Potencia estimada con su banda de incertidumbre por distancia en {unit}; la potencia media al pedalear va de {low} W a {high} W",
    "model.band.estimate": "Estimación",
    "model.band.range": "Banda",
    "model.band.figure": "Cifra",
    "model.band.low": "Mínima",
    "model.band.high": "Máxima",
    "model.band.average": "Potencia media al pedalear",
    "model.band.peak": "Potencia máxima",

    "model.hr.title": "Potencia y pulso",
    "model.hr.description":
      "Aprende tu propia relación entre potencia y pulso y encuentra los tramos que no la siguen.",
    "model.hr.none":
      "No se puede leer una relación. Necesita datos de pulso y una potencia que varíe.",
    "model.hr.slope": "{slope} lpm por cada 100 W",
    "model.hr.intercept": "Pulso a 0 W: {bpm} lpm",
    "model.hr.fit": "Calidad del ajuste (R²): {r2}, sobre {blocks} bloques de 30 s",
    "model.hr.noOutliers": "Ningún tramo se aparta de tu relación habitual.",
    "model.hr.high":
      "pulso {bpm} lpm por encima de lo esperado: más esfuerzo del que muestra la potencia estimada",
    "model.hr.low":
      "pulso {bpm} lpm por debajo de lo esperado: menos esfuerzo del que muestra la potencia estimada",
    "model.hr.select": "Seleccionar el tramo {from} a {to}",

    "model.measured.title": "Medida frente a estimada",
    "model.measured.description":
      "Cuando el archivo trae potencia de un medidor, se compara la estimación con ella.",
    "model.measured.none": "Este archivo no trae potencia medida.",
    "model.measured.figure": "Cifra",
    "model.measured.value": "Valor",
    "model.measured.samples": "Muestras comparadas",
    "model.measured.meanMeasured": "Potencia media medida",
    "model.measured.meanEstimated": "Potencia media estimada",
    "model.measured.bias": "Sesgo (estimada menos medida)",
    "model.measured.mae": "Error absoluto medio",
    "model.measured.rmse": "Raíz del error cuadrático medio",
    "model.measured.correlation": "Correlación",

    "model.learn.title": "Corrección aprendida",
    "model.learn.description":
      "Aprende una escala, por mínimos cuadrados, con todas las salidas cargadas que traen potencia medida.",
    "model.learn.none":
      "Ninguna salida cargada trae potencia medida, así que no hay de dónde aprender. Carga salidas grabadas con un medidor de potencia.",
    "model.learn.result":
      "Aprendido con {rides} salidas y {samples} muestras: multiplica la estimación por {scale}.",
    "model.learn.error": "Error típico de {before} W antes y {after} W después.",
    "model.learn.apply": "Aplicar al modelo",
  },
};
