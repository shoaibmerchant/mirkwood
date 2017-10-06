import Types from './types';
import { UnknownError, ForbiddenError, AuthenticationRequiredError } from '../errors';

class Authenticator {

  static init({ config }) {
    this.config = config;
  }

  static authenticate({ role, user, permissions=[] }, request) {
    request.session.auth = {
      role,
      user,
      permissions
    };
    request.session.auth[role].authenticated = true;
  }

  static unauthenticate({ role }, request) {
    request.session.auth = false;
    request.session.authenticated = false;
  }

  static checkAuthentication({ modelName, resolverName }, request) {
    return new Promise((resolve, reject) => {
      let sessionAuth = request.session.auth || {};
      let sessionRole = sessionAuth.role || 'anonymous';

      let fullResolverName = [modelName, resolverName].join('.');
      let roleAcl = this.config.acl[sessionRole];

      if (roleAcl && (roleAcl.includes(fullResolverName) || roleAcl.includes('*') || roleAcl.includes([modelName, '*'].join('.')))) {
        resolve();
      } else {
        if (sessionRole === 'anonymous') {
          reject(new AuthenticationRequiredError());
        } else {
          reject(new ForbiddenError());
        }
      }
    });
  }
}

export default Authenticator;
