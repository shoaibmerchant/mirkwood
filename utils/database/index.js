import Database from './database';
import DatabaseMutations from './mutations';
import DatabaseQueries from './queries';
import Types from '../../lib/types';

class DatabaseUtility {

	constructor({ config }) {
		Database.init({ config });
		this.resolvers = {
			...DatabaseQueries.resolvers(),
			...DatabaseMutations.resolvers()
		}
		this.mutationResolvers = DatabaseMutations.resolvers();
	}

	mutations(type, inputType, model) {
		return DatabaseMutations.generate(type, inputType, model);
	}

	queries(type, inputType, model) {
		return DatabaseQueries.generate(type, inputType, model);
	}

	relations(model) {
		let modelSchema = model.schema;
		let modelRelations = modelSchema.relations;
		let modelName = model.schema.name;
		let modelKey = model.key;

		let modelFields = modelSchema.fields;

		// Children or hasMany
		if (modelRelations.children && Array.isArray(modelRelations.children)) {
			modelFields['_children'] = {
				type: {
					fields: () => this._generateChildrenRelations(modelKey, modelRelations.children)
				},
				resolve: (obj) => obj
			};
		}

		// Child or hasOne
		if (modelRelations.child && Array.isArray(modelRelations.child)) {
			modelFields['_child'] = {
				type: {
					fields: () => this._generateChildRelations(modelKey, modelRelations.child)
				},
				resolve: (obj) => obj
			};
		}

		// Parent or belongs
		if (modelRelations.parent && Array.isArray(modelRelations.parent)) {
			modelFields['_parent'] = {
				type: {
					fields: () => this._generateParentRelations(modelKey, modelRelations.parent)
				},
				resolve: (obj) => obj
			};
		}

		return model;
	}

	_generateChildrenRelations(modelKey, relations) {
		let childrenRelations = {};

		relations.forEach((relation) => {
			let resolverName = [modelKey, 'children', relation.name].join('.');

			childrenRelations[relation.name] = this.resolvers['joinMany'](
				resolverName,
				Types.get(relation.type), Types.model(relation.model),
				{
					args: {
						field: {
							type: Types.String,
							defaultValue: relation.field
						},
						joinBy: {
							type: Types.String,
							defaultValue: relation.joinBy || '_id'
						}
					}
				});
		});

		return childrenRelations;
	}

	_generateChildRelations(modelKey, relations) {
		let childRelations = {};

		relations.forEach((relation) => {
			let resolverName = [modelKey, 'child', relation.name].join('.');

			childRelations[relation.name] = this.resolvers['joinOne'](
				resolverName,
				Types.get(relation.type), Types.model(relation.model),
				{
					args: {
						field: {
							type: Types.String,
							defaultValue: relation.field
						},
						joinBy: {
							type: Types.String,
							defaultValue: relation.joinBy || '_id'
						}
					}
				});
		});

		return childRelations;
	}

	_generateParentRelations(modelKey, relations) {
		let parentRelations = {};

		relations.forEach((relation) => {
			let resolverName = [modelKey, 'parent', relation.name].join('.');

			parentRelations[relation.name] = this.resolvers['joinOne'](
				resolverName,
				Types.get(relation.type), Types.model(relation.model),
				{
					args: {
						field: {
							type: Types.String,
							defaultValue: relation.field || '_id'
						},
						joinBy: {
							type: Types.String,
							defaultValue: relation.joinBy
						}
					}
				});
		});

		return parentRelations;
	}
}

export default DatabaseUtility;
