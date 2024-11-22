import {
	ApiModel,
	ConsolidatedModel,
	IApiModel,
	IConsolidatedModel,
	IProseModel,
	IRepoModel,
	ProseModel,
	RepoModel,
} from "~/models";
import {
	IMeilisearchTaskStatus,
	isApiDocument,
	isConsolidatedDocument,
	isProseDocument,
	isRepoDocument,
} from "~/types";

export async function pushDocs(
	docs: (IApiModel | IProseModel | IRepoModel | IConsolidatedModel)[],
	_options: { repo?: string; branch?: string } = {},
) {
	const t: Promise<IMeilisearchTaskStatus>[] = [];

	for (const doc of docs) {
		if (isProseDocument(doc)) {
			t.push(ProseModel().query.addOrReplaceDocuments(doc));
		} else if (isRepoDocument(doc)) {
			t.push(RepoModel().query.addOrReplaceDocuments(doc));
		} else if (isApiDocument(doc)) {
			t.push(ApiModel().query.addOrReplaceDocuments(doc));
		} else if (isConsolidatedDocument(doc)) {
			t.push(ConsolidatedModel().query.addOrReplaceDocuments(doc));
		}
	}
	const tasks = await Promise.all(t);

	return tasks;
}
