import Queue from 'bull';//Plugin

let queues = [];
class BullQueueAdapter {
  constructor(connection) {
    this.client = connection;
    console.log("BullQueueAdapter: ", this.client);

    this._initializeQueue();
  }
  
  _initializeQueue() {
    // console.log("CLIENT: ", this.client);
    let queueName = this.client.prefix + this.client.name;
    console.log("QUeueName:", queueName);
    let password = this.client.connection.password;
    password = password || '';
    if (this.client.connection && password === '') {
      delete this.client.connection.password;
    }
    queues[queueName] = new Queue(queueName, {redis: this.client.connection});
    queues[queueName].process(this.client.action);
  }

  pushMessage() {
    
  }
}

export default BullQueueAdapter;
