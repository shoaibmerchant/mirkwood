/**
 * Initialize all Components
 */
import express from 'express'
import bodyParser from 'body-parser'
import session from 'express-session'
import cors from 'cors'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { formatError, createError } from 'apollo-errors';

// GraphStack libraries
import GQL from './gql';
import SchemaGenerator from './schemagen';
import SessionStore from './sessionStore';
import Authenticator from './authenticator';

class GraphQLServer {
	constructor({ config, models, opts }) {
		this.models = models;
		this.opts = opts;
		this.config = config;

		this.opts.cors = {
			origin: '*',
			credentials: true,
			...this.opts.cors
		}

		this.schemaGenerator = new SchemaGenerator({ config });
		Authenticator.init({ config: config.auth });
	}

	_generateSchema() {
		return this.schemaGenerator.generate(this.models);
	}

	_getSchemaContext() {
		return this.schemaGenerator.getSchemaContext();
	}

	start(app) {
		let { schema, internalSchema } = this._generateSchema();
		let is_app_init = app ? true : false;

		// Initialize express app
		app = app || express();

		app.use(bodyParser.urlencoded({ extended: false }))
		app.use(bodyParser.json())

		app.use(session(new SessionStore({ config: this.config.session })));

		app.use(cors(this.opts.cors))

		app.post('/graphql', graphqlExpress((req, res) => {
			const schemaContext = this._getSchemaContext();
			const gql = new GQL({ schema: internalSchema, req, ...schemaContext });
			if (process.env['NODE_ENV'] === 'production') {
				return {
			    schema,
			    formatError, // error formatting via apollo-errors
			    context: { req: req, gql: gql }
			  };
			} else {
				return {
			    schema: internalSchema,
			    formatError, // error formatting via apollo-errors
			    context: {
						req: req,
						gql: gql,
						...schemaContext
					}
			  };
			}
		}));

		if (process.env.NODE_ENV !== 'production') {
			app.get('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));
		}

		if (!is_app_init) {
			console.log('Mirkwood server started on', this.opts.port);
			app.listen(this.opts.port);
		}
	}
}

export default GraphQLServer;
