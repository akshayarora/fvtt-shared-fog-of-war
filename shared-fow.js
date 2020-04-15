class SharedFogOfWar {

  static tokenIsPC(t) {
    // read this from configuration eventually
    const pcFolder = "PCs";
    // return t.actor != null && t.actor.folder != null && t.actor.folder.name == pcFolder;

    // return true for testing purposes right now
    return true;
  }
  
  static init() {
    console.log("shared fow init");
  }

  static setup() {
    console.log("shared fow setup");
    Patches.replaceMethod(SightLayer, "updateToken", function(token, defer, deleted, walls, forceUpdateFog) {

      let sourceId = `Token.${token.id}`;
      this.sources.vision.delete(sourceId);
      this.sources.lights.delete(sourceId);
      if ( deleted ) return defer ? null : this.update();
      if ( token.data.hidden && !game.user.isGM ) return;
      // Vision is displayed if the token is controlled, or if it is observed by a player with no tokens controlled
      /* Original Code
      let displayVision = token._controlled;
      if ( !displayVision && !game.user.isGM && !canvas.tokens.controlled.length ) {
        displayVision = token.actor && token.actor.hasPerm(game.user, "OBSERVER");
      }
      */
      // Vision is displayed if the token is controlled, or if it is observed
      let displayVision = token._controlled;
      if ( !displayVision ) {
        displayVision = token.actor && token.actor.hasPerm(game.user, "OBSERVER");
      }

      // Take no action for Tokens which are invisible or Tokens that have no sight or light
      const globalLight = canvas.scene.data.globalLight;
      let isVisionSource = this.tokenVision && token.hasSight && displayVision;
      let isLightSource = token.emitsLight;
      // If the Token is no longer a source, we don't need further work
      if ( !isVisionSource && !isLightSource ) return;
      // Prepare some common data
      const center = token.getSightOrigin();
      const maxR = globalLight ? Math.max(canvas.dimensions.width, canvas.dimensions.height) : null;
      let [cullMult, cullMin, cullMax] = this._cull;
      if ( globalLight ) cullMin = maxR;
      // Prepare vision sources
      if ( isVisionSource ) {
        // Compute vision polygons
        let dim = globalLight ? 0 : token.getLightRadius(token.data.dimSight);
        const bright = globalLight ? maxR : token.getLightRadius(token.data.brightSight);
        if ((dim === 0) && (bright === 0)) dim = canvas.dimensions.size * 0.6;
        const radius = Math.max(Math.abs(dim), Math.abs(bright));
        const {los, fov} = this.constructor.computeSight(center, radius, {
          angle: token.data.sightAngle,
          cullMult: cullMult,
          cullMin: cullMin,
          cullMax: cullMax,
          density: 6,
          rotation: token.data.rotation,
          walls: walls
        });
        // Add a vision source
        const source = new SightLayerSource({
          x: center.x,
          y: center.y,
          los: los,
          fov: fov,
          dim: dim,
          bright: bright
        });
        this.sources.vision.set(sourceId, source);
        // Update fog exploration for the token position
        this.updateFog(center.x, center.y, Math.max(dim, bright), token.data.sightAngle !== 360, forceUpdateFog);
      }
      // Prepare light sources
      if ( isLightSource ) {
        // Compute light emission polygons
        const dim = token.getLightRadius(token.data.dimLight);
        const bright = token.getLightRadius(token.data.brightLight);
        const radius = Math.max(Math.abs(dim), Math.abs(bright));
        const {fov} = this.constructor.computeSight(center, radius, {
          angle: token.data.lightAngle,
          cullMult: cullMult,
          cullMin: cullMin,
          cullMax: cullMax,
          density: 6,
          rotation: token.data.rotation,
          walls: walls
        });
        // Add a light source
        const source = new SightLayerSource({
          x: center.x,
          y: center.y,
          los: null,
          fov: fov,
          dim: dim,
          bright: bright,
          color: token.data.lightColor,
          alpha: token.data.lightAlpha
        });
        this.sources.lights.set(sourceId, source);
      }
      // Maybe update
      if ( CONFIG.debug.sight ) console.debug(`Updated SightLayer source for ${sourceId}`);
      if ( !defer ) this.update();

      //SharedFogOfWar.updateToken(token,options)
    });
  }
}

class Patches{
  static init() {
    console.log("patches init");
  }

  // Pulled these from furnace's code by KaKaRoTo
  // Would be the same code for callOriginalMethod as long as 'klass' is actually the instance
  static callOriginalFunction(klass, name, ...args) {
    return klass[this.ORIGINAL_PREFIX + name].call(klass, ...args)
  }
  static replaceMethod(klass, name, func) {
    return this.replaceFunction(klass.prototype, name, func)
  }
  static replaceFunction(klass, name, func) {
    klass[this.ORIGINAL_PREFIX + name] = klass[name]
    klass[name] = func
  }
  static replaceStaticGetter(klass, name, func) {
    let getterProperty = Object.getOwnPropertyDescriptor(klass, name);
    if (getterProperty == undefined)
      return false;
    Object.defineProperty(klass, Patches.ORIGINAL_PREFIX + name, getterProperty);
    Object.defineProperty(klass, name, { get: func });
    return true;
  }
  static replaceGetter(klass, name, func) {
    return this.replaceStaticGetter(klass.prototype, name, func)
  };

  static callOriginalGetter(klass, name) {
    return klass[this.ORIGINAL_PREFIX + name]
  }
}

Patches.ORIGINAL_PREFIX = "__shared_fow_original_";
Hooks.on('init', Patches.init);
Hooks.on('setup', SharedFogOfWar.setup);
