import adapters from './adapters';

const DEFAULT_CONNECTION = 'development';
const DEFAULT_ADAPTER = 'bull';

class Queue {
  constructor({ config }) {
    console.log("QUEUE: ", config);
  }
}