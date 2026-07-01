export class HMRCNotificationEventProcessor {
  constructor(store) {
    this.store = store;
  }

  async process(userId, notification) {
    // Minimal stub: record the event in the store if available, otherwise return it.
    if (this.store && typeof this.store.saveEvent === 'function') {
      try {
        this.store.saveEvent(notification);
      } catch (e) {
        // ignore
      }
    }
    return { processed: true, notification };
  }
}

export default HMRCNotificationEventProcessor;
