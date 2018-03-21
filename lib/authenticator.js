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

  static user(request) {
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
          throw new AuthenticationTokenExpiredError();
        }
        // return invalid error
        throw new AuthenticationTokenInvalidError();
      }
    }

    return userAuth;
  }

  // Deprecated, use user instead
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

  static checkAuthentication({ modelName, resolverName }, ctx) {
    return new Promise((resolve, reject) => {
      const request = ctx.req;
      const tokenConfig = this.config.token || {};
      const authorization = request.headers['authorization'];
      let userAuth = this.user(request);
      let userRole = userAuth.role || 'anonymous';

      let fullResolverName = [modelName, resolverName].join('.');

      if (!modelName) { // if no modelname present, this can happen with _meta and other possible internal types
        fullResolverName = resolverName;
      }

      let acl = userAuth.user && userAuth.user.acl ? userAuth.user.acl : [];
      let roleAcl = this.config.acl[userRole];
      let anonymousAcl = this.config.acl['anonymous'];

      if (roleAcl && (roleAcl.includes(fullResolverName) || roleAcl.includes('*') || roleAcl.includes([modelName, '*'].join('.')))) {
        // dont apply iam to anonymous methods
        if ((anonymousAcl && !anonymousAcl.includes(fullResolverName)) &&
          this.config.iam) {
            if (!this.config.iamAllowed || this.config.iamAllowed.indexOf(fullResolverName) === -1) {
              if (acl.length) {
                let allowed = false;
                let allowedEntities = [];
                // Need to be discussed
                if (fullResolverName.includes('.children.') || fullResolverName.includes('.parent.') || fullResolverName === 'users.me') {
                  allowed = true;
                } else {
                  for (let idx = 0; idx < acl.length; idx++) {
                    let eachAcl = acl[idx];
                    let resolver = eachAcl.resolver;
                    let entities = eachAcl.entities;
                    if (resolver === fullResolverName) {
                      allowed = true;
                      allowedEntities = entities;
                      break;
                    }
                  }
                }

                if (allowed) {
                  if (allowedEntities.length !== 0 && allowedEntities[0] !== '*') {
                    ctx.allowedEntities = allowedEntities;
                  }
                  resolve();
                } else {
                  reject(new ForbiddenError());
                }
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        } else {
          resolve();
        }
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
