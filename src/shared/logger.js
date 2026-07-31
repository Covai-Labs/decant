export const logger = {
  enabled: true, // Verbose logging for development/maturation phase

  log(tag, ...messages) {
    if (this.enabled) {
      console.log(`[Decant :: ${tag} ${new Date().toLocaleTimeString()}]`, ...messages);
    }
  },

  info(tag, ...messages) {
    if (this.enabled) {
      console.info(`[Decant ℹ️ ${tag} ${new Date().toLocaleTimeString()}]`, ...messages);
    }
  },

  warn(tag, ...messages) {
    if (this.enabled) {
      console.warn(`[Decant ⚠️ ${tag} ${new Date().toLocaleTimeString()}]`, ...messages);
    }
  },

  error(tag, ...messages) {
    if (this.enabled) {
      console.error(`[Decant ❌ ${tag} ${new Date().toLocaleTimeString()}]`, ...messages);
    }
  },
};
