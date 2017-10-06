import path from 'path';
import Types from '../../lib/types';
import Resolver from '../../lib/resolver';
import Email from './email';

class EmailUtility {

	constructor({ config }) {
		Email.init({ config });
		this.resolvers = {
			send: this.sendResolver
		};
	}

	sendResolver(resolverName, type, model, inputSchema) {
		let args = inputSchema.args;

		args = {
			...args,
			template: {
				type: Types.String,
				required: true
			},
			options: {
	      fields: {
					to: {
						type: Types.String,
						required: true
					},
	        subject: {
	          type: Types.String,
	          required: true
	        },
	        from: {
	          type: Types.String,
	        },
	        cc: {
	          type: Types.String
	        },
	        bcc: {
	          type: Types.String
	        }
	      }
	    }
		};

		let argsObjects = Types.generateArgs(args, inputSchema.name);
		return {
			type: Types.Boolean,
			args: argsObjects,
			resolve: new Resolver(resolverName, (_, args, ctx) => {
				let template = [args.template,'twig'].join('.');
				let dir = path.join('models', model.key, 'templates');
				return Email.send({template, dir }, args.options, args.input);
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

export default EmailUtility;
