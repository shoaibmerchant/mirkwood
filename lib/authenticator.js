import jwt from 'jsonwebtoken';
import Types from './types';
import {
  UnknownError,
  ForbiddenError,
  AuthenticationRequiredError,
  AuthenticationTokenExpiredError,
  AuthenticationTokenInvalidError } from '../errors';

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
  }

  static token({ role, user, permissions=[] }) {
    const tokenConfig = this.config.token || {};
    if (!tokenConfig.secret) {
      throw 'Secret for signing JWT not specified in Auth config (auth.js)';
    }

    const token = jwt.sign({ role, user, permissions }, tokenConfig.secret, tokenConfig.options);
    return token;
  }


  static session(request) {
    if (request.session.auth) {
      return request.session.auth;
    }
    return false;
  }

  static unauthenticate({ role }, request) {
    if (request.session.auth) {
        request.session.auth = false;
    }
  }

  static checkAuthentication({ modelName, resolverName }, request) {
    const tokenConfig = this.config.token || {};
    const authorization = request.headers['authorization'];

    // default to session auth
    let userAuth = request.session.auth || {};

    if (authorization && authorization.split(' ')[0] === 'Bearer') {
      const token = authorization ? authorization.split(' ')[1] : false;

      if (!token) {
        userAuth = {};
      }

      try {
        userAuth = jwt.verify(token, tokenConfig.secret);
      } catch(err) {
        if (err && err.name === 'TokenExpiredError') { // expired
          return Promise.reject(new AuthenticationTokenExpiredError());
        }
        // return invalid error
        return Promise.reject(new AuthenticationTokenInvalidError());
      }
    }

    return new Promise((resolve, reject) => {
      let userRole = userAuth.role || 'anonymous';

      let fullResolverName = [modelName, resolverName].join('.');

      if (!modelName) { // if no modelname present, this can happen with _meta and other possible internal types
        fullResolverName = resolverName;
      }

      let roleAcl = this.config.acl[userRole];

      if (roleAcl && (roleAcl.includes(fullResolverName) || roleAcl.includes('*') || roleAcl.includes([modelName, '*'].join('.')))) {
        resolve();
      } else {
        if (userRole === 'anonymous') {
          reject(new AuthenticationRequiredError());
        } else {
          reject(new ForbiddenError());
        }
      }
    });
  }
}

export default Authenticator;
