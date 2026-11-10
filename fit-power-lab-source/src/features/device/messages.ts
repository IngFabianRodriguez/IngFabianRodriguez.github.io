import type { Messages } from "@/app/i18n";

/** Texts of the device section: device info, sensors, file quality, backup and the profile. */
export const messages: Messages = {
  en: {
    "device.title": "Device",
    "device.folder.title": "Device folder",
    "device.folder.description":
      "Choose the folder of your bike computer: the drive itself or its iGPSPORT folder. The app only reads it and never writes to it.",
    "device.folder.pick": "Choose device folder",
    "device.folder.input": "Device folder (file field)",
    "device.folder.loading": "Reading the folder…",
    "device.folder.loaded": "Folder read: {name}",
    "device.folder.blocked":
      "The browser did not allow that folder. Use the file field to choose it instead.",
    "device.folder.unreadable": "The folder could not be read.",
    "device.folder.empty":
      "No device files were found in that folder (Device.bin, user.fit or activities).",

    "device.info.title": "Device",
    "device.info.description": "Read from Device.bin.",
    "device.info.model": "Model",
    "device.info.brand": "Brand",
    "device.info.hardware": "Hardware",
    "device.info.firmware": "Firmware",
    "device.info.serial": "Serial",
    "device.info.none": "Choose the device folder to see its model and firmware.",
    "device.info.missing": "Device.bin was not found in that folder or has no known lines.",

    "device.sensors.title": "Sensors",
    "device.sensors.description": "Paired in the device profile and recorded in the active ride.",
    "device.sensors.noProfile": "Choose the device folder to see which sensors are paired.",
    "device.sensors.noRide": "Load a ride to see which sensors recorded data.",
    "device.sensor.heartRate": "Heart rate",
    "device.sensor.cadence": "Cadence",
    "device.sensor.speed": "Speed",
    "device.sensor.speedCadence": "Speed and cadence",
    "device.sensor.power": "Power",
    "device.sensorStatus.recorded": "Recorded in this ride",
    "device.sensorStatus.paired-no-data": "Paired, but no data in this ride",
    "device.sensorStatus.not-paired": "Not paired",
    "device.sensorStatus.no-data": "No data in this ride",
    "device.sensorStatus.paired": "Paired",
    "device.sensorStatus.unknown": "Unknown",

    "device.quality.title": "File quality",
    "device.quality.description":
      "Checks the active ride for lost GPS, recording gaps, altitude jumps and impossible speeds.",
    "device.quality.noRide": "Load a ride to check its quality.",
    "device.quality.score": "Quality score",
    "device.quality.scoreValue": "{score} / 100",
    "device.quality.band.good": "Good",
    "device.quality.band.fair": "Fair",
    "device.quality.band.poor": "Poor",
    "device.quality.clean": "Nothing wrong was found in this file.",
    "device.quality.severity.info": "Info",
    "device.quality.severity.warning": "Warning",
    "device.quality.severity.problem": "Problem",
    "device.quality.too-short": "The ride has too few samples to be judged.",
    "device.quality.gps-none": "No sample has a GPS position ({count} samples).",
    "device.quality.gps-lost":
      "{count} samples have no GPS position; {detail}% of the ride has one.",
    "device.quality.gaps":
      "Recording gaps while moving: {count}, {detail} lost in total. The route and power are missing there.",
    "device.quality.pauses":
      "Pauses without movement: {count}, {detail} in total. They do not lower the score.",
    "device.quality.altitude-jumps":
      "Altitude jumps while stopped: {count} (largest {detail}). The sensor is barometric.",
    "device.quality.speed-artifacts":
      "Impossible speed peaks discarded: {count} (largest gain {detail} m/s²). The power estimate ignores them.",
    "device.quality.no-heart-rate": "No heart rate was recorded (no sensor, or no signal).",
    "device.quality.heart-rate-dropouts": "The heart rate signal was missing in {count} samples.",
    "device.quality.no-cadence": "No cadence was recorded (cadence is 0 on every record).",

    "device.backup.title": "Back up activities",
    "device.backup.description":
      "Save a copy of the activities of the device as a ZIP download or in a folder of your computer. Nothing is changed on the device.",
    "device.backup.noDevice": "Choose the device folder to back up its activities.",
    "device.backup.checking": "Checking which activities are already backed up…",
    "device.backup.summary": "{total} activities on the device, {pending} not backed up yet.",
    "device.backup.onlyNew": "Only activities not backed up yet",
    "device.backup.zip": "Download ZIP",
    "device.backup.folder": "Copy to a folder…",
    "device.backup.folderHint":
      "Choose a folder on your computer, never the device. Files that already exist there are not overwritten.",
    "device.backup.nothingNew": "Nothing new to back up.",
    "device.backup.progress": "Copying {done} of {total}",
    "device.backup.result.zip":
      "ZIP download started with {count} activities. Open it and check it before deleting anything on the device.",
    "device.backup.result.folder":
      "Copied {copied}; already there {skipped}; left untouched because the name exists with other content {conflicts}; failed {failed}.",
    "device.backup.error.targetIsDevice":
      "That folder looks like the device. Choose a folder on your computer.",
    "device.backup.error.failed": "The backup could not be completed.",

    "device.guide.title": "Free up space on the device",
    "device.guide.description":
      "The app never deletes anything. This list shows which activities already have a backup, so you can delete them yourself.",
    "device.guide.noDevice": "Choose the device folder to see which activities are backed up.",
    "device.guide.none": "No activities were found on the device.",
    "device.guide.summary":
      "{backedUp} of {total} activities are backed up; deleting them would free {size}.",
    "device.guide.tableLabel": "Activities on the device",
    "device.guide.caption": "Activities on the device and whether they are backed up",
    "device.guide.column.name": "Activity",
    "device.guide.column.size": "Size",
    "device.guide.column.status": "Backup",
    "device.guide.backedUp": "Backed up",
    "device.guide.pending": "Not backed up",
    "device.guide.stepsTitle": "How to free the space",
    "device.guide.step1":
      "Back up the activities above, then open the copy to check that it works.",
    "device.guide.step2":
      "Open the device in your file manager, in the folder iGPSPORT/Activities.",
    "device.guide.step3": "Delete only the files marked Backed up. Leave List.fit alone.",
    "device.guide.step4":
      "If the device lets you delete activities from its own history menu, prefer that: the device keeps its own list (List.fit).",
    "device.guide.step5": "Eject the drive safely before unplugging it.",

    "device.profile.title": "Rider profile (user.fit)",
    "device.profile.description":
      "Edit the profile here, download the new user.fit and copy it yourself into iGPSPORT/Setting/ on the device. Keep a copy of the original first.",
    "device.profile.noFolder": "Choose the device folder to edit its profile.",
    "device.profile.noFile": "The device folder has no user.fit.",
    "device.profile.unreadable": "The user.fit of the device could not be read.",
    "device.profile.field.riderKg": "Rider weight ({unit})",
    "device.profile.field.bikeKg": "Bike weight ({unit})",
    "device.profile.field.age": "Age (years)",
    "device.profile.field.heightM": "Height (cm)",
    "device.profile.name.riderKg": "Rider weight",
    "device.profile.name.bikeKg": "Bike weight",
    "device.profile.name.age": "Age",
    "device.profile.name.heightM": "Height",
    "device.profile.error.invalid": "Enter a plain number.",
    "device.profile.error.range": "Enter a value between {range}.",
    "device.profile.unknown": "Not set",
    "device.profile.years": "{count} years",
    "device.profile.changesCaption": "Changes to the profile: on the device and after",
    "device.profile.column.field": "Field",
    "device.profile.column.before": "On the device",
    "device.profile.column.after": "After",
    "device.profile.noChanges": "No changes yet.",
    "device.profile.download": "Download edited user.fit",
    "device.profile.instructions":
      "The app does not write to the device. Copy the downloaded user.fit into iGPSPORT/Setting/ yourself, replacing the old one.",
    "device.profile.sync.title": "Weights",
    "device.profile.sync.app": "Weights in the app: rider {rider}, bike {bike}.",
    "device.profile.sync.noApp": "The app has no weights yet.",
    "device.profile.sync.device": "Weights on the device: rider {rider}, bike {bike}.",
    "device.profile.sync.noDevice": "The device profile has no weights to read.",
    "device.profile.sync.useDevice": "Use the weights from the device",
    "device.profile.sync.downloadApp": "Download user.fit with the app weights",
    "device.profile.message.applied": "The app now uses the weights of the device.",
    "device.profile.message.outOfRange":
      "The weights of the device are outside what the app accepts.",
    "device.profile.message.downloaded":
      "user.fit downloaded. Copy it into iGPSPORT/Setting/ on the device yourself.",
    "device.profile.message.invalid": "Some values are not valid for the file.",
    "device.profile.message.missing": "The file has no place to store that value.",
    "device.profile.message.noWeights": "Confirm your weights in the app first.",
  },
  es: {
    "device.title": "Dispositivo",
    "device.folder.title": "Carpeta del dispositivo",
    "device.folder.description":
      "Elija la carpeta de su ciclocomputador: la unidad completa o su carpeta iGPSPORT. La aplicación solo la lee y nunca escribe en ella.",
    "device.folder.pick": "Elegir carpeta del dispositivo",
    "device.folder.input": "Carpeta del dispositivo (campo de archivo)",
    "device.folder.loading": "Leyendo la carpeta…",
    "device.folder.loaded": "Carpeta leída: {name}",
    "device.folder.blocked":
      "El navegador no permitió esa carpeta. Use el campo de archivo para elegirla.",
    "device.folder.unreadable": "No se pudo leer la carpeta.",
    "device.folder.empty":
      "No se encontraron archivos de dispositivo en esa carpeta (Device.bin, user.fit o actividades).",

    "device.info.title": "Dispositivo",
    "device.info.description": "Leído de Device.bin.",
    "device.info.model": "Modelo",
    "device.info.brand": "Marca",
    "device.info.hardware": "Hardware",
    "device.info.firmware": "Firmware",
    "device.info.serial": "Serie",
    "device.info.none": "Elija la carpeta del dispositivo para ver su modelo y firmware.",
    "device.info.missing": "No se encontró Device.bin en esa carpeta o no tiene líneas conocidas.",

    "device.sensors.title": "Sensores",
    "device.sensors.description":
      "Emparejados en el perfil del dispositivo y registrados en la salida activa.",
    "device.sensors.noProfile":
      "Elija la carpeta del dispositivo para ver qué sensores están emparejados.",
    "device.sensors.noRide": "Cargue una salida para ver qué sensores registraron datos.",
    "device.sensor.heartRate": "Pulso",
    "device.sensor.cadence": "Cadencia",
    "device.sensor.speed": "Velocidad",
    "device.sensor.speedCadence": "Velocidad y cadencia",
    "device.sensor.power": "Potencia",
    "device.sensorStatus.recorded": "Registrado en esta salida",
    "device.sensorStatus.paired-no-data": "Emparejado, pero sin datos en esta salida",
    "device.sensorStatus.not-paired": "No emparejado",
    "device.sensorStatus.no-data": "Sin datos en esta salida",
    "device.sensorStatus.paired": "Emparejado",
    "device.sensorStatus.unknown": "Desconocido",

    "device.quality.title": "Calidad del archivo",
    "device.quality.description":
      "Revisa la salida activa: GPS perdido, huecos de grabación, saltos de altitud y velocidades imposibles.",
    "device.quality.noRide": "Cargue una salida para revisar su calidad.",
    "device.quality.score": "Puntaje de calidad",
    "device.quality.scoreValue": "{score} / 100",
    "device.quality.band.good": "Buena",
    "device.quality.band.fair": "Aceptable",
    "device.quality.band.poor": "Mala",
    "device.quality.clean": "No se encontró nada anormal en este archivo.",
    "device.quality.severity.info": "Información",
    "device.quality.severity.warning": "Aviso",
    "device.quality.severity.problem": "Problema",
    "device.quality.too-short": "La salida tiene muy pocas muestras para evaluarla.",
    "device.quality.gps-none": "Ninguna muestra tiene posición GPS ({count} muestras).",
    "device.quality.gps-lost":
      "{count} muestras no tienen posición GPS; el {detail}% de la salida sí la tiene.",
    "device.quality.gaps":
      "Huecos de grabación en movimiento: {count}, {detail} perdidos en total. Allí faltan la ruta y la potencia.",
    "device.quality.pauses":
      "Pausas sin movimiento: {count}, {detail} en total. No bajan el puntaje.",
    "device.quality.altitude-jumps":
      "Saltos de altitud estando detenido: {count} (el mayor {detail}). El sensor es barométrico.",
    "device.quality.speed-artifacts":
      "Picos de velocidad imposibles descartados: {count} (mayor aumento {detail} m/s²). La estimación de potencia los ignora.",
    "device.quality.no-heart-rate": "No se registró pulso (sin sensor o sin señal).",
    "device.quality.heart-rate-dropouts": "Faltó la señal de pulso en {count} muestras.",
    "device.quality.no-cadence":
      "No se registró cadencia (la cadencia es 0 en todos los registros).",

    "device.backup.title": "Respaldar actividades",
    "device.backup.description":
      "Guarde una copia de las actividades del dispositivo como descarga ZIP o en una carpeta de su computador. No se cambia nada en el dispositivo.",
    "device.backup.noDevice": "Elija la carpeta del dispositivo para respaldar sus actividades.",
    "device.backup.checking": "Comprobando qué actividades ya tienen respaldo…",
    "device.backup.summary":
      "{total} actividades en el dispositivo, {pending} sin respaldo todavía.",
    "device.backup.onlyNew": "Solo las actividades sin respaldo",
    "device.backup.zip": "Descargar ZIP",
    "device.backup.folder": "Copiar a una carpeta…",
    "device.backup.folderHint":
      "Elija una carpeta de su computador, nunca el dispositivo. Los archivos que ya existan allí no se sobrescriben.",
    "device.backup.nothingNew": "No hay nada nuevo que respaldar.",
    "device.backup.progress": "Copiando {done} de {total}",
    "device.backup.result.zip":
      "Se inició la descarga del ZIP con {count} actividades. Ábralo y compruébelo antes de borrar algo en el dispositivo.",
    "device.backup.result.folder":
      "Copiadas {copied}; ya estaban {skipped}; sin tocar porque el nombre existe con otro contenido {conflicts}; fallidas {failed}.",
    "device.backup.error.targetIsDevice":
      "Esa carpeta parece ser el dispositivo. Elija una carpeta de su computador.",
    "device.backup.error.failed": "No se pudo completar el respaldo.",

    "device.guide.title": "Liberar espacio en el dispositivo",
    "device.guide.description":
      "La aplicación nunca borra nada. Esta lista muestra qué actividades ya tienen respaldo para que usted las borre.",
    "device.guide.noDevice":
      "Elija la carpeta del dispositivo para ver qué actividades tienen respaldo.",
    "device.guide.none": "No se encontraron actividades en el dispositivo.",
    "device.guide.summary":
      "{backedUp} de {total} actividades tienen respaldo; borrarlas liberaría {size}.",
    "device.guide.tableLabel": "Actividades del dispositivo",
    "device.guide.caption": "Actividades del dispositivo y si tienen respaldo",
    "device.guide.column.name": "Actividad",
    "device.guide.column.size": "Tamaño",
    "device.guide.column.status": "Respaldo",
    "device.guide.backedUp": "Con respaldo",
    "device.guide.pending": "Sin respaldo",
    "device.guide.stepsTitle": "Cómo liberar el espacio",
    "device.guide.step1":
      "Respalde las actividades de arriba y abra la copia para comprobar que funciona.",
    "device.guide.step2":
      "Abra el dispositivo en su explorador de archivos, en la carpeta iGPSPORT/Activities.",
    "device.guide.step3": "Borre solo los archivos marcados Con respaldo. No toque List.fit.",
    "device.guide.step4":
      "Si el dispositivo permite borrar actividades desde su propio menú de historial, prefiera esa opción: el dispositivo mantiene su propia lista (List.fit).",
    "device.guide.step5": "Expulse la unidad de forma segura antes de desconectarla.",

    "device.profile.title": "Perfil del ciclista (user.fit)",
    "device.profile.description":
      "Edite el perfil aquí, descargue el nuevo user.fit y cópielo usted mismo en iGPSPORT/Setting/ del dispositivo. Guarde antes una copia del original.",
    "device.profile.noFolder": "Elija la carpeta del dispositivo para editar su perfil.",
    "device.profile.noFile": "La carpeta del dispositivo no tiene user.fit.",
    "device.profile.unreadable": "No se pudo leer el user.fit del dispositivo.",
    "device.profile.field.riderKg": "Peso del ciclista ({unit})",
    "device.profile.field.bikeKg": "Peso de la bicicleta ({unit})",
    "device.profile.field.age": "Edad (años)",
    "device.profile.field.heightM": "Estatura (cm)",
    "device.profile.name.riderKg": "Peso del ciclista",
    "device.profile.name.bikeKg": "Peso de la bicicleta",
    "device.profile.name.age": "Edad",
    "device.profile.name.heightM": "Estatura",
    "device.profile.error.invalid": "Escriba un número sencillo.",
    "device.profile.error.range": "Escriba un valor entre {range}.",
    "device.profile.unknown": "Sin definir",
    "device.profile.years": "{count} años",
    "device.profile.changesCaption": "Cambios al perfil: en el dispositivo y después",
    "device.profile.column.field": "Campo",
    "device.profile.column.before": "En el dispositivo",
    "device.profile.column.after": "Después",
    "device.profile.noChanges": "Aún no hay cambios.",
    "device.profile.download": "Descargar user.fit editado",
    "device.profile.instructions":
      "La aplicación no escribe en el dispositivo. Copie usted mismo el user.fit descargado en iGPSPORT/Setting/, reemplazando el anterior.",
    "device.profile.sync.title": "Pesos",
    "device.profile.sync.app": "Pesos en la aplicación: ciclista {rider}, bicicleta {bike}.",
    "device.profile.sync.noApp": "La aplicación aún no tiene pesos.",
    "device.profile.sync.device": "Pesos en el dispositivo: ciclista {rider}, bicicleta {bike}.",
    "device.profile.sync.noDevice": "El perfil del dispositivo no tiene pesos que leer.",
    "device.profile.sync.useDevice": "Usar los pesos del dispositivo",
    "device.profile.sync.downloadApp": "Descargar user.fit con los pesos de la aplicación",
    "device.profile.message.applied": "La aplicación ahora usa los pesos del dispositivo.",
    "device.profile.message.outOfRange":
      "Los pesos del dispositivo están fuera de lo que acepta la aplicación.",
    "device.profile.message.downloaded":
      "user.fit descargado. Cópielo usted mismo en iGPSPORT/Setting/ del dispositivo.",
    "device.profile.message.invalid": "Algunos valores no son válidos para el archivo.",
    "device.profile.message.missing": "El archivo no tiene dónde guardar ese valor.",
    "device.profile.message.noWeights": "Primero confirme sus pesos en la aplicación.",
  },
};
