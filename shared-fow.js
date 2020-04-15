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
		Patches.replaceGetter(SightLayer, "computeSight", function(origin, options={}){
      // Unclear when Compute Sight is called, not seeing this happening
			console.log("computing sight");
			sight = Patches.callOriginalGetter(this, "computeSight", origin, options);
			return sight;
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
