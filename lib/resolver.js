import { createResolver } from 'apollo-resolvers';
import { isInstance } from 'apollo-errors';
import { UnknownError } from './errors';
import Authenticator from './authenticator';

class Resolver {
  constructor(resolverName, fn) {
    this._resolverName = resolverName;
    return this.auth().createResolver(fn);
  }
  base() {
    return createResolver(
      null,
      (_, args, ctx, error) => {
        let env = process.env['NODE_ENV'] || 'development';
        if (env === 'production') {
          return isInstance(error) ? error : new UnknownError({ data: error })
        }
      }
    );
  }
  auth() {
    let authResolver = (_, args, ctx) => {
      // skip auth check for gqlQuery

      if (ctx.gqlQuery) {
        return Promise.resolve();
      }

      let resolverName = this._resolverName;
      let modelName = ctx.model;

      return Authenticator.checkAuthentication({
        resolverName,
        modelName
      }, ctx);
    }
    return this.base().createResolver(authResolver);
  }
}

export default Resolver;
