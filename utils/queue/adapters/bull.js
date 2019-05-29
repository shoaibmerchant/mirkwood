import Queue from 'bull';//Plugin
import CouchDB from '../../documentStore/couchdb';
import moment from 'moment';

class BullQueueAdapter {
  constructor(connection) {
    this.client = connection;
    this._initializeQueue();
    this.queues = {};
  }
  
  _initializeQueue() {
    let queueName = this._getQueueName();
    let limiter = {
      ...this.client.limiter
    };
    this.queues[queueName] = new Queue(queueName); //LEGACY: {redis: this.client.connection, limiter}
    let concurrency = this.client.concurrency || 1;
    this.queues[queueName].process(queueName, concurrency, this.client.action)
      .then(resp => { /* JOB COMPLETED */ })
      .catch(err => { /* Error */ console.log("ERROR: ",err) });

    // Local events pass the job instance...
    this._onCompleted(queueName);
    this._onFailed(queueName);
  }

  _createDocument(data, _extra_data) {
    if (this.client.persistence.adapter !== 'couchdb') {
      return false;
    }
    if (!this.client.persist) {
      return false;
    }

    const extra_data = this._getDocument(data, _extra_data);
    let doc = new CouchDB(this.client.persistence);
    doc.create(null, extra_data, this.client.persistence.database)
      .then(resp => { /*CREATED - console.log(resp);*/ })
      .catch(err => {})
  }
  
  _getDocument(job, _extra_data) {
    let d = {
      _id: job.id.toString(),
      name: job.name,
      data: job.data,
      delay: job.delay,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      stacktrace: job.stacktrace,
      returnvalue: job.returnvalue,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      ..._extra_data
    }
    return d;
  }

  _updateDocument(job_id, data, _extra) {
    if (this.client.persistence.adapter !== 'couchdb') {
      return false;
    }
    if (!this.client.persist) {
      return false;
    }

    let doc = new CouchDB(this.client.persistence);
    const _id = job_id.toString();
    const extra_data = this._getDocument(data, _extra);
    doc.update(null, {input: extra_data, _id, store: this.client.persistence.database})
      .then(resp => { /* RESPONSE */  })
      .catch(err => {})
  }
  
  _onCompleted(queueName) {
    this.queues[queueName].on('completed', (job, result) => {
      let tmp = {
        status: "COMPLETED",
        finishedOn: moment().format('YYYY-MM-DD HH:mm:ss')
      }
      this._updateDocument(job.id, job, tmp);
    });
  }

  _onFailed(queueName) {
    this.queues[queueName].on('failed', (job, result) => {
      let tmp = {
        status: "FAILED",
        failedOn: moment().format('YYYY-MM-DD HH:mm:ss')
      }
      this._updateDocument(job.id, job, tmp);
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
      this.queues[queueName].add(queueName, data.data, {...options})
        .then(resp => {
          let tmp_resp = {
            id: resp.id,
            data: resp.data
          };
          this._createDocument(resp, {status: "PENDING", jobType: data.jobType});
          resolve(tmp_resp);
        })
        .catch(err => { reject(err); });
    })
  }

  clean(data) {
    let queueName = this._getQueueName();
    return new Promise ((resolve,reject) => {
      this.queues[queueName].clean(data.grace, data.type)
        .then(resp => { resolve(resp); })
        .catch(err => { reject(err); });
    })
  }
}

export default BullQueueAdapter;