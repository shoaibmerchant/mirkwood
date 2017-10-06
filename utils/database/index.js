import Database from './database';
import DatabaseMutations from './mutations';
import DatabaseQueries from './queries';

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
}

export default DatabaseUtility;
