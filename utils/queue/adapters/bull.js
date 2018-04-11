import Queue from 'bull';//Plugin
import CouchDB from '../../documentStore/couchdb';

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

    // Local events pass the job instance...
    this._eventProgress(queueName);
    this._eventCompleted(queueName);
  }

  _createDocument(data) {

    if (this.client.persistence.adapter !== 'couchdb') {
      return false;
    }
    const extra_data = this._getDocument(data);
    let doc = new CouchDB(this.client.persistence);
    doc.create(null, extra_data, this.client.persistence.database)
      .then(resp => {
        console.log("Document Created.");
        console.log(resp);
      })
      .catch(err => {
        console.log("Error: ", err);
      })
    
  }
  
  _getDocument(job) {
    let doc = {
      _id: job.id.toString(),
      name: job.name,
      data: job.data,
      delay: job.delay,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      stacktrace: job.stacktrace,
      returnvalue: job.returnvalue,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn
    }
    return doc;
  }

  _updateDocument(job_id, data) {
    console.log("UpdateDocument Called.");
    if (this.client.persistence.adapter !== 'couchdb') {
      return false;
    }

    let doc = new CouchDB(this.client.persistence);
    const _id = job_id.toString();
    const extra_data = this._getDocument(data);
    console.log("Data: ", extra_data);
    doc.update(null, {input: extra_data, _id, store: this.client.persistence.database})
      .then(resp => {
        console.log("Document Updated.");
        console.log(resp);
      })
      .catch(err => {
        console.log("Error: ", err);
      })

  }

  _eventProgress(queueName) {
    queues[queueName].on('progress', (job, progress) => {
      console.log(`Job ${job.id} is ${progress * 100}% ready!`);
    });
  }
  
  _eventCompleted(queueName) {
    queues[queueName].on('completed', (job, result) => {
      console.log(`Job ${job.id} completed! Result: ${result}`);
      console.log(`Job Data: ${job.data}`);
      this._updateDocument(job.id, job);
      job.remove();
    });
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
          this._createDocument(resp);
          resolve(tmp_resp);
        })
        .catch(err => {
          reject(err);
        });
    })
  }

  clean(data) {
    let queueName = this._getQueueName();
    return new Promise ((resolve,reject) => {
      queues[queueName].clean(data.grace, data.type)
        .then(resp => {
          resolve(resp);
        })
        .catch(err => {
          reject(err);
        });
    })
  }
}

export default BullQueueAdapter;
