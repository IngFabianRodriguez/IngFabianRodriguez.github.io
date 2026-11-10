import type { Messages } from "@/app/i18n";

/** Texts of the settings panel (`settings.`) and of the help components (`help.`). */
export const messages: Messages = {
  en: {
    "settings.language.title": "Language",
    "settings.language.description": "Language of the whole app.",
    "settings.language.en": "English",
    "settings.language.es": "Español",
    "settings.units.title": "Units",
    "settings.units.description":
      "How distances, speeds, altitudes, temperatures and weights are shown.",
    "settings.units.metric": "Metric (km, m, °C, kg)",
    "settings.units.imperial": "Imperial (mi, ft, °F, lb)",
    "settings.theme.title": "Theme",
    "settings.theme.description": "Light or dark appearance.",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.theme.system": "Same as the system",
    "settings.map.title": "Map privacy",
    "settings.map.explain":
      "Every map tile your browser asks for tells the tile server which area you are looking at. Use a server you trust, or draw no background at all.",
    "settings.map.mode": "Map background",
    "settings.map.osm": "OpenStreetMap (public servers)",
    "settings.map.custom": "My own tile server",
    "settings.map.none": "No background (nothing is requested)",
    "settings.map.url": "Tile server address",
    "settings.map.url.hint":
      "Use http:// or https:// and the placeholders {z}, {x} and {y}, for example https://tiles.example.org/{z}/{x}/{y}.png",
    "settings.map.url.invalid":
      "This address cannot be used, so the map shows no background. It must start with http:// or https:// and contain {z}, {x} and {y}.",
    "settings.map.hide": "Meters hidden at each end of the route",
    "settings.map.hide.hint":
      "The first and the last meters of the route are not drawn, so the place you start from is not shown. 0 draws the whole route.",
    "settings.map.hide.invalid": "Enter a whole number of meters from 0 to 5000.",
    "settings.help.title": "Help",
    "settings.help.description":
      "A short introduction to how the power is estimated and what it cannot tell you.",
    "settings.help.onboarding": "Show the introduction again",
    "settings.shortcuts.title": "Keyboard shortcuts",
    "settings.shortcuts.description":
      "Shortcuts do not work while you type in a field. Press ? anywhere to see this list.",
    "settings.reset.title": "Reset",
    "settings.reset.description":
      "Restores the language, units, theme and map privacy. The power model and your weights are not changed.",
    "settings.reset.button": "Reset preferences",
    "settings.reset.done": "Preferences restored.",

    "help.shortcuts.title": "Keyboard shortcuts",
    "help.shortcuts.description": "Shortcuts do not work while you type in a field.",
    "help.shortcuts.empty": "There are no shortcuts to show.",
    "help.shortcut.help": "Show or hide this list",
    "help.shortcut.section": "Go to {section}",
    "help.shortcut.units": "Switch between metric and imperial units",
    "help.shortcut.theme": "Change the theme",
    "help.onboarding.title": "How your power is estimated",
    "help.onboarding.description": "A short introduction before you start.",
    "help.onboarding.estimate.title": "It is an estimate",
    "help.onboarding.estimate.body":
      "Your bike computer does not measure watts. The app works them out from physics: your weight and the bike's, the slope of the road, your speed and the air you push through.",
    "help.onboarding.limits.title": "What makes it less exact",
    "help.onboarding.limits.wind":
      "Wind: the app cannot see it unless you enter it in the model settings.",
    "help.onboarding.limits.drafting":
      "Riding behind someone: you push less air than the model assumes.",
    "help.onboarding.limits.position": "Your riding position: it changes how much air you push.",
    "help.onboarding.limits.speed":
      "Speed noise: small errors in the speed sensor, mostly when you start, brake or stop, move the watts.",
    "help.onboarding.limits.note":
      "Use the numbers to compare efforts and follow your progress, not as laboratory values.",
    "help.onboarding.privacy.title": "Your data stays here",
    "help.onboarding.privacy.body":
      "Your files are read and analysed on this computer and are not uploaded. The only thing that goes out is the request for the map tiles, which shows the area you are looking at. You can change that in Settings.",
    "help.onboarding.close": "Got it",
    "help.sample.button": "Load a sample ride",
    "help.sample.hint":
      "A made-up ride of about 30 minutes, to try the app without data of your own.",
    "help.sample.done": "Sample ride loaded.",
  },
  es: {
    "settings.language.title": "Idioma",
    "settings.language.description": "Idioma de toda la aplicación.",
    "settings.language.en": "English",
    "settings.language.es": "Español",
    "settings.units.title": "Unidades",
    "settings.units.description":
      "Cómo se muestran las distancias, velocidades, altitudes, temperaturas y pesos.",
    "settings.units.metric": "Métricas (km, m, °C, kg)",
    "settings.units.imperial": "Imperiales (mi, ft, °F, lb)",
    "settings.theme.title": "Tema",
    "settings.theme.description": "Apariencia clara u oscura.",
    "settings.theme.light": "Claro",
    "settings.theme.dark": "Oscuro",
    "settings.theme.system": "Igual que el sistema",
    "settings.map.title": "Privacidad del mapa",
    "settings.map.explain":
      "Cada tesela del mapa que pide tu navegador le dice al servidor de teselas qué zona estás mirando. Usa un servidor de confianza o dibuja el mapa sin fondo.",
    "settings.map.mode": "Fondo del mapa",
    "settings.map.osm": "OpenStreetMap (servidores públicos)",
    "settings.map.custom": "Mi propio servidor de teselas",
    "settings.map.none": "Sin fondo (no se pide nada)",
    "settings.map.url": "Dirección del servidor de teselas",
    "settings.map.url.hint":
      "Usa http:// o https:// y los marcadores {z}, {x} y {y}, por ejemplo https://tiles.example.org/{z}/{x}/{y}.png",
    "settings.map.url.invalid":
      "Esta dirección no se puede usar, así que el mapa se muestra sin fondo. Debe empezar por http:// o https:// y contener {z}, {x} y {y}.",
    "settings.map.hide": "Metros ocultos en cada extremo de la ruta",
    "settings.map.hide.hint":
      "Los primeros y los últimos metros de la ruta no se dibujan, para que no se vea el lugar de donde sales. Con 0 se dibuja toda la ruta.",
    "settings.map.hide.invalid": "Escribe un número entero de metros de 0 a 5000.",
    "settings.help.title": "Ayuda",
    "settings.help.description":
      "Una introducción corta a cómo se estima la potencia y qué no puede decirte.",
    "settings.help.onboarding": "Ver de nuevo la introducción",
    "settings.shortcuts.title": "Atajos de teclado",
    "settings.shortcuts.description":
      "Los atajos no funcionan mientras escribes en un campo. Pulsa ? en cualquier momento para ver esta lista.",
    "settings.reset.title": "Restablecer",
    "settings.reset.description":
      "Restablece el idioma, las unidades, el tema y la privacidad del mapa. El modelo de potencia y tus pesos no cambian.",
    "settings.reset.button": "Restablecer preferencias",
    "settings.reset.done": "Preferencias restablecidas.",

    "help.shortcuts.title": "Atajos de teclado",
    "help.shortcuts.description": "Los atajos no funcionan mientras escribes en un campo.",
    "help.shortcuts.empty": "No hay atajos para mostrar.",
    "help.shortcut.help": "Mostrar u ocultar esta lista",
    "help.shortcut.section": "Ir a {section}",
    "help.shortcut.units": "Cambiar entre unidades métricas e imperiales",
    "help.shortcut.theme": "Cambiar el tema",
    "help.onboarding.title": "Cómo se estima tu potencia",
    "help.onboarding.description": "Una introducción corta antes de empezar.",
    "help.onboarding.estimate.title": "Es una estimación",
    "help.onboarding.estimate.body":
      "Tu ciclocomputador no mide vatios. La aplicación los calcula con física: tu peso y el de la bici, la pendiente del camino, tu velocidad y el aire que atraviesas.",
    "help.onboarding.limits.title": "Qué la hace menos exacta",
    "help.onboarding.limits.wind":
      "El viento: la aplicación no lo ve a menos que lo indiques en los ajustes del modelo.",
    "help.onboarding.limits.drafting":
      "Ir a rueda de otra persona: empujas menos aire del que supone el modelo.",
    "help.onboarding.limits.position": "Tu posición en la bici: cambia cuánto aire empujas.",
    "help.onboarding.limits.speed":
      "El ruido de la velocidad: pequeños errores del sensor, sobre todo al arrancar, frenar o parar, mueven los vatios.",
    "help.onboarding.limits.note":
      "Usa los números para comparar esfuerzos y seguir tu progreso, no como valores de laboratorio.",
    "help.onboarding.privacy.title": "Tus datos se quedan aquí",
    "help.onboarding.privacy.body":
      "Tus archivos se leen y se analizan en este equipo y no se suben a ningún sitio. Lo único que sale es la petición de las teselas del mapa, que muestra la zona que estás mirando. Puedes cambiarlo en Ajustes.",
    "help.onboarding.close": "Entendido",
    "help.sample.button": "Cargar un recorrido de ejemplo",
    "help.sample.hint":
      "Un recorrido inventado de unos 30 minutos, para probar la aplicación sin datos propios.",
    "help.sample.done": "Recorrido de ejemplo cargado.",
  },
};
