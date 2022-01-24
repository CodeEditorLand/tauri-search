/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
import { acceptHMRUpdate, defineStore } from "pinia";
import type { UserModule } from "~/types";
import { MeiliSearchHealth, MeiliSearchIndex, MeiliSearchInterface, MeiliSearchResponse, MeiliSearchStats } from "~/types/meilisearch";

//#region STORE
export interface SearchState {
  /** is the HTTP server of MeiliSearch reachable */
  health: boolean | "initializing";

  /** the indexes which are defined on MeiliSearch */
  indexes: MeiliSearchInterface[];

  /** database stats for MeiliSearch */
  stats?: MeiliSearchStats;

  searchStatus: "ready" | "searching" | "error" | "not-ready";

  searchResults: {id: string; _idx: string; [key: string]: unknown}[];
}

export const useSearch = defineStore("search", ({
  state: () => ({
    health: "initializing",
    indexes: [],
    stats: undefined,
    searchStatus: "not-ready",
    searchResults: [],
  }) as SearchState,
  actions: {
    async search(text: string, indexes?: string[]) {
      if(text.trim()==="") {
        this.$state.searchResults = [];
        return;
      }
      if(!indexes) {
        indexes = this.$state.indexes.map(i => i.uid);
      }
      console.group(`searching for: "${text}"`);
      console.info(`search on ${indexes.length} indexes`, indexes);
      console.time("search");
      this.$state.searchStatus = "searching";
      
      const waitFor: Promise<any>[] = [];
      for (const idx of indexes) {
        const addIndex =
          (result: MeiliSearchResponse): MeiliSearchResponse => ({
              ...result,
              hits: result.hits.map(i =>
                ({...i, _idx: idx})
              )
            });

        waitFor.push(
            get<
              MeiliSearchResponse,
              MeiliSearchResponse
            >
              (api().search(idx,text), addIndex)
        );
      }
      const results = await Promise.all(waitFor);
      this.$state.searchStatus = "ready";
      console.timeEnd("search");

      const hits = results.flatMap(i => i.hits);
      console.info(`found ${hits.length} documents`);
      console.groupEnd();
      this.$state.searchResults = hits;

      return results;
    },
    statsUpdate(s: MeiliSearchStats) {
      this.$state.stats = s;
    },
    healthUpdate(h: boolean) {
      this.$state.health = h;
    },
    indexUpdate(idx: MeiliSearchInterface[]) {
      this.$state.indexes = idx;
    }
  },
  getters: {
    dbSize: (state) =>  state.stats?.databaseSize || 0,
    indexInfo: (state) => (idx: string): MeiliSearchIndex | undefined => state.stats?.indexes[idx]
  }
}));


if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(
      useSearch,
      import.meta.hot)
  );
}
//#endregion  STORE

//#region SERVICE
/**
 * Sets up a useful API surface and background
 * checks for certain meta-data which is available
 * as a Pinia store.
 */
export const install: UserModule = ({ isClient }) => {
  if (isClient) {
    const s = useSearch();

    const { pause, resume, isActive } = useIntervalFn(async() => {
      s.indexUpdate(await indexes());
      s.statsUpdate(await stats());
    }, 2000, {immediate: true});
    
    // check health of MeiliSearch
    useIntervalFn(async() => {
      const h = await health();
      s.healthUpdate(h);
      s.$state.searchStatus = !h ? "not-ready": "ready";

      if(h === true && !isActive) resume();
      if(h === false && isActive) pause();
    }, 1000, {immediate: true});

  }
};

async function get<T extends {}, U extends {} = never>(
  url: string,
  cb?: ((r: T) => U)
) {
  const res = await fetch(url);
  if(res.ok) {
    const result = res.json();
    
    return (
      cb
        ? result.then(r => cb(r)) as Promise<U>
        : result as Promise<T>
    ) as never extends U ? Promise<T> : Promise<U>;

  } else {
    console.groupCollapsed(`Error with API`);
    console.info(`Request: GET ${url}`);
    console.warn(`Error [${res.status}]: ${res.statusText}`);
    console.groupEnd();
  }
}

function api(base: string = "http://localhost:7700") {
  return {
    search: (idx: string, text: string) => `${base}/indexes/${idx}/search?q=${text}`,
    stats: `${base}/stats`,
    health: `${base}/health`,
    indexes: `${base}/indexes`
  };
}

async function health(): Promise<boolean> {
  const response = await (
    await fetch(api().health)
  ).json() as MeiliSearchHealth;
  return response.status === "available";
}

async function indexes() {
  return await (
    await fetch(api().indexes)
  ).json() as MeiliSearchInterface[];
}

async function stats() {
  return await (
    await fetch(api().stats)
  ).json() as MeiliSearchStats;
}

//#endregion