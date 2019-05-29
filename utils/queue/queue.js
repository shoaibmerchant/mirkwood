import adapters from './adapters';

const DEFAULT_CONNECTION = 'development';
const DEFAULT_ADAPTER = 'bull';

class Queue {
  
  static init({ config }) {
    this.config = config;
    this.connections = {};
    this._initializeQueues();
	}

  static _initializeQueues = () => {
    Queue._initQueues(false); //=>no need to return
  }

  static _initQueues = () => {
    let connectionName = process.env['NODE_ENV'] || 'development';
    let queueConnectionParams = Queue.config[connectionName];
    try {
      queueConnectionParams.queues.forEach((queue) => {
        let queueAdapter = adapters[queue.adapter || DEFAULT_ADAPTER];
        queue = {
          ...queue,
          prefix: queueConnectionParams.prefix || '',
          persistence: queueConnectionParams.persistence
        };

        this.connections[queue.name] = new queueAdapter(queue);
      })
    } catch (err) {
      throw err;
    }
  }

  static push = (datasource, args) => {
    const queueName = args.queue.name;
    return this.connections[queueName].push(args);
  }

  static clean = (datasource, args) => {
    const queueName = args.queue.name;
    return this.connections[queueName].clean(args);
  }
}

export default Queue;
