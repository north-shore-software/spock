# Design notes

## Branded param types (not implemented)

**Idea:** route params arrive as plain `string`s. Branding them, e.g.
`type ProjectId = string & { readonly __brand: "ProjectId" }`, would let the
type system tell a project id from a document id, and from any other string.

**How it would fit.** This was checked against the installed router
(1.170.46), not just assumed, before `@spock/core` wrapped TanStack. Core's
route tree has no `params` option yet, so step 3 means adding one and passing
it through to TanStack, and `CheckTree` would check selectors against the
parsed types instead of `string`.

1. **Domain types.** Brand the ids in `store.ts`:
   `Project = { id: ProjectId; … }` and
   `Org.projects: Record<ProjectId, Project>`.
2. **Bindings.** Selectors declare the branded param types:
   `(p: { orgId: OrgId; projectId: ProjectId }) => …`.
3. **Routes.** Each route that introduces a param converts it into the brand
   with `params.parse`, and back with `params.stringify`:
   ```ts
   params: {
     parse: (raw) => ({ projectId: raw.projectId as ProjectId }),
     stringify: (p) => ({ projectId: p.projectId }),
   },
   ```
   Child routes inherit the parsed type. For example, the document route
   sees `projectId: ProjectId` without parsing it again.

**What the types enforce, once it's in place.**

- **A binding on an unparsed route doesn't compile.** If a route binds a
  project but doesn't parse `$projectId`, its `projectId` is a plain `string`,
  and the binding is rejected with "Type 'string' is not assignable to type
  'ProjectId'". The tree check gives us this for free: each route's params
  come from its path, so the error shows up where the selector is attached.
  Branding extends rule 4 from "the param exists" to "the param was parsed".
- **`Link` needs branded values too.** `params={{ projectId }}` must be a
  `ProjectId`. Links built from records (`p.id`), and links that spread
  `prev` params, just work once the domain types are branded. A hand-written
  literal like `"web"` needs a cast.

**Open choices for later:**

- **Validate or only cast?** `parse` could check the id's format, or only
  cast it. Either way, it should not look the record up: missing records are
  the binding's job (`notFound()` in `beforeLoad`).
- **Where to put parse/stringify.** Keep the pairs next to the brand types,
  e.g. a `projectIdParam` helper, so `router.ts` doesn't repeat them.
- **Shared params.** The share-link route introduces all three params at once,
  so it would parse all three.
