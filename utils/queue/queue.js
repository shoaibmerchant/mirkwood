import adapters from './adapters';

const DEFAULT_CONNECTION = 'development';
const DEFAULT_ADAPTER = 'bull';

class Queue {

  static init({ config }) {
    this.config = config;
    this.connections = {};

    this._initializeQueues();
	}

  static _initializeQueues = (name) => {
    let connectionName = name || process.env['NODE_ENV'] || 'development';
    let queueConnectionParams = Queue.config[connectionName];
    queueConnectionParams.queues.forEach((queue) => {
      let queueAdapter = adapters[queue.adapter || DEFAULT_ADAPTER];
      queue = {
        ...queue,
        prefix: queueConnectionParams.prefix || ''
      };
      let newConnection = new queueAdapter(queue);
    })
  }

  static push = (data, args) => {

  }
}

export default Queue;