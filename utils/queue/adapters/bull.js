import Queue from 'bull';//Plugin

let queues = [];
class BullQueueAdapter {
  constructor(connection) {
    this.client = connection;
    this._initializeQueue();
  }
  
  _initializeQueue() {
    let queueName = this._getQueueName();
    let limiter = {
      ...this.client.limiter
    };
    queues[queueName] = new Queue(queueName, {redis: this.client.connection, limiter});
    let concurrency = this.client.concurrency || 1;
    queues[queueName].process(queueName, concurrency, this.client.action)
      .then(resp => { console.log("Job completed, ", resp); })
      .catch(err => { console.log("SomeError: ", err); });
  }

  _getQueueName() {
    return this.client.prefix + this.client.name;
  }

  push(data) {
    let queueName = this._getQueueName();
    let options = {
      ...this.client.options,
      ...data.options //overriding default options
    };
    return new Promise ((resolve, reject) => {
      queues[queueName].add(queueName, data.message, {...options})
        .then(resp => {
          let tmp_resp = {
            id: resp.id,
            data: resp.data
          };
          resolve(tmp_resp);
        })
        .catch(err => {
          reject(err);
        });
    })
  }
}

export default BullQueueAdapter;
