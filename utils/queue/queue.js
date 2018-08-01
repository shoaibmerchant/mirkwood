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

  static _initQueues = (type, name) => {
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
        let newConnection = new queueAdapter(queue);
        if (type === true && name === queue.name) {
          throw {connection: newConnection};
        }
      })
    } catch (err) {
      if (err && err.connection) {
        return err.connection;
      }
    }
  }

  static push = (datasource, args) => {
    let queueConnection = Queue._initQueues(true, args.queue);
    return queueConnection.push(args);
  }

  static clean = (datasource, args) => {
    let queueConnection = Queue._initQueues(true, args.queue);
    return queueConnection.clean(args);
  }
}

export default Queue;