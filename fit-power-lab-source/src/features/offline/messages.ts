import type { Messages } from "@/app/i18n";

export const messages: Messages = {
  en: {
    "offline.title": "Offline use",
    "offline.description":
      "Install the app on this device and keep working without a connection, with the map tiles you have already seen.",
    "offline.status.label": "Offline readiness",
    "offline.status.checking": "Checking",
    "offline.status.ready": "Ready for offline use",
    "offline.status.preparing": "Preparing offline files",
    "offline.status.unavailable": "Not active",
    "offline.status.unavailableHint":
      "Offline use needs the installed or production version of the app, opened over HTTPS or on localhost, in a browser that supports service workers.",
    "offline.tiles.label": "Saved map tiles",
    "offline.tiles.value": "{count} of {limit}",
    "offline.storage.label": "Storage used by this app",
    "offline.storage.value": "{used} of {quota}",
    "offline.storage.unknown": "Not reported by this browser",
    "offline.privacy":
      "Saved map tiles show the areas you have looked at. Clear them before sharing this device.",
    "offline.clear": "Clear saved maps",
    "offline.clear.done": "Saved maps cleared: {count} tiles removed.",
    "offline.clear.failed": "The saved maps could not be cleared.",
    "offline.install": "Install app",
    "offline.install.unavailable":
      "Installing is not offered right now. The app may already be installed, or this browser does not support it.",
    "offline.install.installed": "The app is installed on this device.",
    "offline.install.accepted": "The app was installed.",
    "offline.install.dismissed": "Installation was dismissed. You can try again.",
  },
  es: {
    "offline.title": "Uso sin conexión",
    "offline.description":
      "Instale la aplicación en este dispositivo y siga trabajando sin conexión, con las teselas del mapa que ya ha visto.",
    "offline.status.label": "Preparación sin conexión",
    "offline.status.checking": "Comprobando",
    "offline.status.ready": "Lista para usarse sin conexión",
    "offline.status.preparing": "Preparando los archivos sin conexión",
    "offline.status.unavailable": "No activa",
    "offline.status.unavailableHint":
      "El uso sin conexión requiere la versión instalada o de producción de la aplicación, abierta con HTTPS o en localhost, en un navegador que admita service workers.",
    "offline.tiles.label": "Teselas de mapa guardadas",
    "offline.tiles.value": "{count} de {limit}",
    "offline.storage.label": "Almacenamiento usado por la aplicación",
    "offline.storage.value": "{used} de {quota}",
    "offline.storage.unknown": "Este navegador no lo informa",
    "offline.privacy":
      "Las teselas guardadas muestran las zonas que ha consultado. Bórrelas antes de compartir este dispositivo.",
    "offline.clear": "Borrar mapas guardados",
    "offline.clear.done": "Mapas guardados borrados: {count} teselas eliminadas.",
    "offline.clear.failed": "No se pudieron borrar los mapas guardados.",
    "offline.install": "Instalar aplicación",
    "offline.install.unavailable":
      "Ahora mismo no se ofrece la instalación. Es posible que la aplicación ya esté instalada o que este navegador no la admita.",
    "offline.install.installed": "La aplicación está instalada en este dispositivo.",
    "offline.install.accepted": "La aplicación se instaló.",
    "offline.install.dismissed": "Se descartó la instalación. Puede intentarlo de nuevo.",
  },
};
