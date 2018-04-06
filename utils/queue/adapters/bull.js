import Queue from 'bull'

class BullQueueAdapter {
  constructor(connection) {
    this.client = connection;
    console.log("BullQueueAdapter: ", this.client);
  }

  pushMessage() {

  }
}