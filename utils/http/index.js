import Types from '../../lib/types';
import Resolver from '../../lib/resolver';
import Http from './http';

class HttpUtility {

	constructor() {
		this.resolvers = {
			request: this.requestResolver
		};
	}

	requestResolver(resolverName, type, model, inputSchema) {
		let args = inputSchema.args;

		args = {
			method: {
        type: Types.String,
        defaultValue: 'GET'
      },
			url: {
				type: Types.String,
				required: true
			},
      json: {
        type: Types.String,
        defaultValue: true
      },
      ...args,
		};

    if (!args.headers) {
      args.headers = {
				type: {
					fields: {
	          ContentType: {
	            type: Types.String,
	            defaultValue: 'application/json'
	          },
	          UserAgent: {
	            type: Types.String
	          },
	          Authorization: {
	            type: Types.String
	          }
	        }
				}
      };
    }

		let argsObjects = Types.generateArgs(args, inputSchema.name);
		return {
			type: type,
			args: argsObjects,
			resolve: new Resolver(resolverName, (_, { url, method, json, headers, body }, ctx) => {
				return Http.request({ url, method, json, headers, body })
			})
		};
	}

	mutations(type, inputType, model) {
		return false;
	}

	queries(type, inputType, model) {
		return false;
	}
}

export default HttpUtility;
