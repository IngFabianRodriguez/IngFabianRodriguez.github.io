/** The browser cannot draw the 3D map (no WebGL 2). */
export class WebGlUnavailableError extends Error {
  constructor() {
    super("This browser cannot draw 3D maps (WebGL 2 is not available).");
    this.name = "WebGlUnavailableError";
  }
}

/** The browser cannot encode H.264 video. */
export class Mp4EncodingUnsupportedError extends Error {
  constructor() {
    super("This browser cannot encode H.264 video.");
    this.name = "Mp4EncodingUnsupportedError";
  }
}

/** The ride has no route to fly over: no positions, or all of them inside the hidden ends. */
export class NoRouteError extends Error {
  constructor() {
    super("This ride has no route to fly over.");
    this.name = "NoRouteError";
  }
}
