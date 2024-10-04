import { writeFileSync } from "node:fs";
import { parseTypescriptAst } from "~/ast/parseTypescriptAst";
import { TypescriptMapper } from "~/mappers";
import { IApiModel } from "~/models";
import { IEnv, TypescriptBlock } from "~/types";
import { CacheKind, getCache } from "~/utils/getCache";
import { getEnv } from "~/utils/getEnv/esm/getEnv";
import { getRepoFile } from "~/utils/github/getRepoFile";
import { writeCacheFile } from "~/utils/writeCacheFile";

/**
 * Refreshes the document cache
 */
export async function refreshTypescript(options: Partial<IEnv> = {}) {
	const { org, repo, branch, tsAstPath } = { ...getEnv(), ...options };
	const { cacheFile } = await getCache(CacheKind.typescriptDocs, {
		...getEnv(),
		...options,
	});
	const ast = (await getRepoFile(
		`${org}/${repo}`,
		tsAstPath,
		branch,
	)) as TypescriptBlock;

	const simplified = await parseTypescriptAst(ast);
	writeFileSync("ast.json", JSON.stringify(ast));
	writeFileSync("simplified.json", JSON.stringify(simplified));

	const docs: IApiModel[] = simplified.symbols.map((i) =>
		TypescriptMapper(i),
	);

	await writeCacheFile(cacheFile, docs);

	return { docs, cacheFile, repo: `${org}/${repo}@${branch}` };
}
