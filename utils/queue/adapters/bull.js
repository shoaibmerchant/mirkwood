import Queue from 'bull';//Plugin

let queues = [];
class BullQueueAdapter {
  constructor(connection) {
    this.client = connection;
    this._initializeQueue();
  }
  
  _initializeQueue() {
    let queueName = this._getQueueName();
    // let password = this.client.connection.password;
    // password = password || '';
    // if (this.client.connection && password === '') {
    //   delete this.client.connection.password;
    // }
    queues[queueName] = new Queue(queueName, {redis: this.client.connection});
    queues[queueName].process(queueName, this.client.action);
  }

  _getQueueName() {
    return this.client.prefix + this.client.name;
  }

  push(data) {
    let queueName = this._getQueueName();
    let options = {
      ...this.client.options,
      ...data.options
    };
    queues[queueName].add(queueName, data.message, {...options});
  }
}

export default BullQueueAdapter;
