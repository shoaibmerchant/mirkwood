import path from 'path';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';
import CouchDbDatabaseAdapter from './couchdb';
import {GraphQLObjectType} from 'graphql';
import queries from '../database/queries';
import {set,map} from 'lodash'

class DocumentStoreUtility {
  constructor({config}) {
    // if documentstore config not found don't throw exception
    if (config) {
      this.config = config[process.env['NODE_ENV'] || 'development'];
    }

    if (!this.config) {
      this.client = null;
      return;
    }

    if (this.config.adapter === 'couchdb') {
      this.client = new CouchDbDatabaseAdapter(this.config);
    }
    this.resolvers = {
      create: this.createResolver.bind(this)
    };
  }
  createResolver(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);
    return {
      type: Types.generateType({
        fields: {
          _id: {
            type: Types.ID
          }
        }
      }),
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {

        return client.create(modelName, args.input, args.store);
      })
    };
  }

  updateResolver(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);
    return {
      type: type,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        return client.update(modelName, args);
      })
    };
  }

  deleteResolver(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);
    return {
      type: type,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        return client.delete(modelName, args);
      })
    };
  }

  createDatabase(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);
    return {
      type: type,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        return client.createDb(args);
      })
    };
  }

  replicateDatabase(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);
    return {
      type: type,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        return client.replicateDb(args);
      })
    };
  }

  oneResolver(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);
    return {
      type: type,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {

        return client.one(modelName, args);
      })
    };
  }

  fetchResolver(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);
    return {
      type: Types.generateType([type]),
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        return client.fetch(modelName, args);
      })
    };
  }

  viewResolver(resolverName, type, model, inputSchema) {
    const client = this.client;
    let args = inputSchema.args;
    let schema = model.schema;
    let modelName = schema.name;
    args = {
      ...args
    };

    let argsObjects = Types.generateArgs(args, inputSchema.name);
    return {
      type: Types.generateType([type]),
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        return client.view(modelName, args);
      })
    };
  }

  queries(type, inputType, model) {
    let schema = model.schema;
    let modelName = schema.name
    return new GraphQLObjectType({
      name: [modelName, 'documentStore_Queries'].join(''),
      fields: {
        one: this.oneResolver('documentstore.one', type, model, {
          args: {
            _id: {
              type: Types.ID
            },
            store: {
              type: Types.String
            }
          }
        }),
        all: this.fetchResolver('documentstore.fetch', type, model, {
          args: {
            store: {
              type: Types.String
            },
            key: {
              type: Types.ID
            },
            keys: {
              type: [Types.ID]
            },
            startkey: {
              type: [Types.String]
            },
            endkey: {
              type: [Types.String]
            }
          }
        }),
        view: this.viewResolver('documentstore.view', type, model, {
          args: {
            store: {
              type: Types.String
            },
            key: {
              type: Types.ID
            },
            keys: {
              type: [Types.ID]
            },
            startkey: {
              type: [Types.String]
            },
            endkey: {
              type: [Types.String]
            },
            design: {
              type: Types.String
            },
            view: {
              type: Types.String
            }
          }
        })
      }
    });
  }
  mutations(type, inputType, model) {
    let schema = model.schema;
    let modelName = schema.name;
    return new GraphQLObjectType({
      name: [modelName, 'documentStore_Mutation'].join(''),
      fields: {
        createDb: this.createDatabase('documentstore.createDb', Types.Boolean, model, {
          args: {
            name: {
              type: Types.String
            }
          }
        }),
        replicateDb: this.replicateDatabase('documentstore.replicateDb', Types.Boolean, model, {
          args: {
            source: {
              type: Types.String
            },
            target: {
              type: Types.String
            },
            createTarget: {
              type: Types.Boolean
            }
          }
        }),
        create: this.createResolver('documentstore.create', type, model, {
          args: {
            input: {
              type: inputType
            },
            store: {
              type: Types.String
            }
          }
        }),
        update: this.updateResolver('documentstore.update', Types.Boolean, model, {
          args: {
            input: {
              type: inputType
            },
            store: {
              type: Types.String
            },
            _id: {
              type: Types.ID
            }
          }
        }),
        delete: this.deleteResolver('documentstore.delete', Types.Boolean, model, {
          args: {
            _id: {
              type: Types.ID
            },
            store: {
              type: Types.String
            },
            _rev: {
              type: Types.ID
            }
          }
        })
      }
    });
  }
}

export default DocumentStoreUtility;
