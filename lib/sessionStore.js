import fileStore from 'session-file-store';
import redisStore from 'connect-redis';
import session from 'express-session';

class SessionStore {
  constructor({ config, connection }) {
    let sessionConOptions = {
      resave: false, // wont resave every change
      saveUninitialized: false, // wont save uninitialized session
      ...config[connection || process.env['NODE_ENV'] || 'development']
    };

    if (sessionConOptions.store === 'redis') {
      let redisStoreInstance = redisStore(session);

      let redisConnection = sessionConOptions.connection || {
        host: 'localhost',
        port: '6379'
      };

      sessionConOptions.store = new redisStoreInstance(redisConnection);

    } else if (sessionConOptions.store === 'file' || !sessionConOptions.store) {
      let fileStoreInstance = fileStore(session);

      sessionConOptions.store = new fileStoreInstance({
				path: sessionConOptions.path || './tmp/sessions'
			})
    }
    return sessionConOptions;
  }
}

export default SessionStore;
