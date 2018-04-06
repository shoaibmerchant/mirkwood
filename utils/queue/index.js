import path from 'path';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';
import {GraphQLObjectType} from 'graphql';
import queries from '../database/queries';
import {set,map} from 'lodash'

class QueueUtility {
  constructor({config}) {
    this.config = config[process.env['NODE_ENV'] || 'development'];
    console.log("Config : ", this.config);

    this.resolvers = {
      push: this
      .pushResolver
      .bind(this)
    };
  }

  pushResolver(resolverName, type, model, inputSchema) {
    
    let schemaArgs = inputSchema.args ;
    let schema = model.schema;
    let modelName = schema.name;

    schemaArgs = {
      message: {
        type: Types.String
      },
      // ...schemaArgs,
      queue: {
        type: Types.String
      },
      persist: {
        type: Types.Boolean
      }
    };

    let argsObjects = Types.generateArgs(schemaArgs, inputSchema.name);

    return {
      type: Types.Boolean,
      args: argsObjects,
      resolve: new Resolver(resolverName, (_, args, ctx) => {
        console.log(args);
        return true
      })
    };
    
  }
  mutations(type, inputType, model) {
    return null;
  }

  queries(type, inputType, model) {
    return null;
  }
}

export default QueueUtility;