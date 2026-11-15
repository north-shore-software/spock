import { useEffect, useState } from "react";
import type { CollectionName, CollectionsMap } from "@/testing/fixtures";
import { useKalaidoscopeClient } from "./use-kalaidoscope-client";

type CollectionState<N extends CollectionName> = {
  data: CollectionsMap[N];
  isLoading: boolean;
  error: Error | null;
};

/** Fetch a whole collection from the workspace client, with a real async lifecycle. */
export function useCollection<N extends CollectionName>(name: N): CollectionState<N> {
  const client = useKalaidoscopeClient();
  const [state, setState] = useState<CollectionState<N>>({
    data: [] as unknown as CollectionsMap[N],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    client
      .collection(name)
      .getFullList()
      .then((data) => live && setState({ data, isLoading: false, error: null }))
      .catch(
        (error: Error) =>
          live && setState({ data: [] as unknown as CollectionsMap[N], isLoading: false, error }),
      );
    return () => {
      live = false;
    };
  }, [client, name]);

  return state;
}

type RecordState<N extends CollectionName> = {
  record: CollectionsMap[N][number] | null;
  isLoading: boolean;
  error: Error | null;
};

/** Fetch a single record by id. */
export function useRecord<N extends CollectionName>(name: N, id: string | undefined): RecordState<N> {
  const client = useKalaidoscopeClient();
  const [state, setState] = useState<RecordState<N>>({ record: null, isLoading: true, error: null });

  useEffect(() => {
    if (!id) {
      setState({ record: null, isLoading: false, error: new Error("no id") });
      return;
    }
    let live = true;
    setState({ record: null, isLoading: true, error: null });
    client
      .collection(name)
      .getOne(id)
      .then((record) => live && setState({ record, isLoading: false, error: null }))
      .catch((error: Error) => live && setState({ record: null, isLoading: false, error }));
    return () => {
      live = false;
    };
  }, [client, name, id]);

  return state;
}
