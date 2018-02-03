import { GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';
import { clone, cloneDeep } from 'lodash';
import Types from './types';
import Resolver from './resolver';
import Meta from './meta';
import {
	DatabaseUtility,
	SessionUtility,
	EmailUtility,
	HttpUtility,
	FsUtility,
	ExportUtility,
 	AWSS3Utility,
	ImageUtility } from '../utils';

class SchemaGenerator {

	constructor({ config }) {
		this.utils = {
			database: new DatabaseUtility({ config: config.database }),
			email: new EmailUtility({ config: config.email }),
			http: new HttpUtility(),
			session: new SessionUtility(),
			fs: new FsUtility(),
			export: new ExportUtility(),
			awsS3: new AWSS3Utility({ config: config.aws }),
			image: new ImageUtility()
		};
	}

	generate(models) {
		let graphQLQueryObjects = {};
		let graphQLQueryObjectsWithInternal = {};
		let graphQLMutationObjects = {};
		let graphQLMutationsObjectsWithInternal = {};

		// Generate Model Type / Model Input Types
		for (let key of Object.keys(models)) {
			// set defaults
			let schema = models[key].schema;
			schema.name = schema.name ? schema.name : key;
			models[key].key = key;

			let model = this._extendModel(models[key]);

			// Store model
			Types.storeModel({
				...model
			});

			// Generate Type
			model.typeInstance = this._generateModelType(model);
			model.inputTypeInstance = this._generateModelInputType(model);
		}

		// Generate Mutations & Queries
		for (let key of Object.keys(models)) {
			// set defaults
			let schema = models[key].schema;
			let model = models[key];

			let graphQLModelType = model.typeInstance;
			let graphQLModelInputType = model.inputTypeInstance;

			// Generate Queries, Mutations
			let { graphQLQueries, graphQLQueriesWithInternal } = this._generateQueries(graphQLModelType, graphQLModelInputType, model);
			let { graphQLMutations, graphQLMutationsWithInternal } = this._generateMutations(graphQLModelType, graphQLModelInputType, model);

			graphQLQueryObjects[key] =  {
				type: graphQLQueries,
				resolve: (_, args, ctx, info) => {
					ctx.model = key;
					return true;
				}
			};

			graphQLQueryObjectsWithInternal[key] = {
				type: graphQLQueriesWithInternal,
				resolve: (_, args, ctx, info) => {
					ctx.model = key;
					return true;
				}
			}

			graphQLMutationObjects[key] =  {
				type: graphQLMutations,
				resolve: (_, args, ctx, info) => {
					ctx.model = key;
					return true;
				}
			};

			graphQLMutationsObjectsWithInternal[key] =  {
				type: graphQLMutationsWithInternal,
				resolve: (_, args, ctx, info) => {
					ctx.model = key;
					return true;
				}
			};
		}

		let graphQLMetaType = Meta.generateRootMetaType();

		graphQLQueryObjects['meta'] = {
			type: graphQLMetaType,
			resolve: () => {
				return true;
			}
		}

		graphQLQueryObjectsWithInternal['meta'] = {
			type: graphQLMetaType,
			resolve: () => {
				return true;
			}
		}

		// Generate the Schemas
		const schema = new GraphQLSchema({
			query:  new GraphQLObjectType({
				name: 'RootQuery',
				fields: graphQLQueryObjects
			}),
			mutation: new GraphQLObjectType({
				name: 'RootMutation',
				fields: graphQLMutationObjects
			})
		});

		const internalSchema = new GraphQLSchema({
			query:  new GraphQLObjectType({
				name: 'RootQuery',
				fields: graphQLQueryObjectsWithInternal
			}),
			mutation: new GraphQLObjectType({
				name: 'RootMutation',
				fields: graphQLMutationsObjectsWithInternal
			})
		});

		return { schema, internalSchema };
	}

	_extendModel(model) {
		let modelSchema = model.schema;
		modelSchema.datasource = modelSchema.datasource || {};

		if (modelSchema.datasource.timestamps) {
			modelSchema.fields = {
				...modelSchema.fields,
				_created_at: {
					type: Types.String,
					label: 'Created',
					descriptor: 'date'
				},
				_updated_at: {
					label: 'Updated',
					type: Types.String,
					descriptor: 'date'
				}
			}
		}

		return model;
	}
	_generateModelType(model) {
		model = this._generateModelRelations(model);
		model = this._generateAggregates(model);

		// Generate GraphQL Object type
		return Types.generateType(model.schema);
	}

	_generateModelInputType(model) {
		// Generate GraphQL Input Object type
		model.schema.fields = {...model.schema.fields};

		// delete related field
		if (model.schema.fields._children) {
			delete model.schema.fields._children;
		}
		// delete aggregates field
		if (model.schema.fields._aggregates) {
			delete model.schema.fields._aggregates;
		}
		// TODO: Remove parent and _child
		return Types.generateInputType(model.schema);
	}

	_generateQueries(type, inputType, model) {
		let queries = model.queries ? model.queries : {};
		let modelQueryObjects = {};
		let modelQueryInternalObjects = {};

		for (let util of Object.keys(this.utils)) {
			let utilQueryType = this.utils[util].queries(type, inputType, model);

			if (utilQueryType) {
				modelQueryObjects[util] = {
					type: utilQueryType,
					resolve: () => true
				}

			}
		}

		for (let key of Object.keys(queries)) {
			let iterQuery = queries[key];
			let iterQueryType = iterQuery.type ? Types.generateType(iterQuery.type) : type;

			if (typeof iterQuery.resolve === 'string') {

				let resolverUtility = iterQuery.resolve.split('.')[0];
				let resolverUtilityAction = iterQuery.resolve.split('.')[1];
				let resolverFunction = this.utils[resolverUtility].resolvers[resolverUtilityAction];

				if (!iterQuery.internal) {
					modelQueryObjects[key] = resolverFunction(key, iterQueryType, model, iterQuery);
				} else {
					modelQueryInternalObjects[key] = resolverFunction(key, iterQueryType, model, iterQuery);
				}
			} else if (typeof iterQuery.resolve === 'function') {
				// handle custom resolvers

				if (!iterQuery.internal) {
					modelQueryObjects[key] = {
						type: iterQueryType,
						args: Types.generateArgs(iterQuery.args, key),
						resolve: new Resolver(key, iterQuery.resolve)
					};
				} else {
					modelQueryInternalObjects[key] = {
						type: iterQueryType,
						args: Types.generateArgs(iterQuery.args, key),
						resolve: new Resolver(key, iterQuery.resolve)
					};
				}
			}
		}

		// // extend modelQueryInternalObjects
		modelQueryInternalObjects = {
			...modelQueryObjects,
			...modelQueryInternalObjects
		};

		return {
			graphQLQueries: new GraphQLObjectType({
				name: [model.schema.name, 'Queries'].join(''),
				fields: modelQueryObjects
			}),
			graphQLQueriesWithInternal: new GraphQLObjectType({
				name: [model.schema.name, 'QueriesWithInternal'].join(''),
				fields: modelQueryInternalObjects
			})
		};
	}

	_generateMutations(type, inputType, model) {
		let mutations = model.mutations ? model.mutations : {};
		let modelMutationObjects = {};
		let modelMutationInternalObjects = {};

		for (let util of Object.keys(this.utils)) {
			let utilMutationType = this.utils[util].mutations(type, inputType, model);

			if (utilMutationType) {
				modelMutationObjects[util] = {
					type: utilMutationType,
					resolve: () => true
				}
			}
		}

		for (let key of Object.keys(mutations)) {
			let iterMutation = mutations[key];
			let iterMutationType = iterMutation.type ? Types.generateType(iterMutation.type) : type;

			if (typeof iterMutation.resolve === 'string') {

				let resolverUtility = iterMutation.resolve.split('.')[0];
				let resolverUtilityAction = iterMutation.resolve.split('.')[1];
				let resolverFunction = this.utils[resolverUtility].resolvers[resolverUtilityAction];

				if (!iterMutation.internal) {
					modelMutationObjects[key] = resolverFunction(key, iterMutationType, model, iterMutation);
				} else {
					modelMutationInternalObjects[key] = resolverFunction(key, iterMutationType, model, iterMutation);
				}
			} else if (typeof iterMutation.resolve === 'function') {
				// handle custom resolvers
				if (!iterMutation.internal) {
					modelMutationObjects[key] = {
						type: iterMutationType,
						args: Types.generateArgs(iterMutation.args, key),
						resolve: new Resolver(key, iterMutation.resolve)
					};
				} else {
					modelMutationInternalObjects[key] = {
						type: iterMutationType,
						args: Types.generateArgs(iterMutation.args, key),
						resolve: new Resolver(key, iterMutation.resolve)
					};
				}
			}
		}

		// extend modelQueryInternalObjects
		modelMutationInternalObjects = {
			...modelMutationObjects,
			...modelMutationInternalObjects
		};

		return {
			graphQLMutations: new GraphQLObjectType({
				name: [model.schema.name, 'Mutations'].join(''),
				fields: modelMutationObjects
			}),
			graphQLMutationsWithInternal: new GraphQLObjectType({
				name: [model.schema.name, 'MutationsWithInternal'].join(''),
				fields: modelMutationInternalObjects
			})
		};
	}

	getSchemaContext() {
		const { utils } = this;
		let utilsContext = {};

		for (let name of Object.keys(utils)) {
			if (utils[name].context) {
					utilsContext = {
						...utilsContext,
						[name]: utils[name].context
					}
			}
		}
		return {
			utils: utilsContext
		};
	}

	_generateAggregates(model) {
		// add aggregates support
		return this.utils.database.aggregates(model);
	}

	_generateModelRelations(model) {
		let modelSchema = model.schema;
		let modelRelations = modelSchema.relations;

		if (!modelRelations) {
			return model;
		}

		// update relations with the model
		return this.utils.database.relations(model);
	}

}

export default SchemaGenerator;
