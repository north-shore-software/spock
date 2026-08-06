import type { Story } from "@ladle/react";
import { PageStory } from "@/testing/page-story";
import { DEFAULT_FIXTURES } from "@/testing/fixtures";
import { projectionDetailRoute } from "./ProjectionDetail";

export default { title: "Pages / projection-detail" };

export const Default: Story = () => (
  <PageStory route={projectionDetailRoute} url="/projections/proj-1" />
);

export const SnapshotView: Story = () => (
  // Exercises the route ALIAS: /projections/:id/snapshot/:snapshotId
  <PageStory route={projectionDetailRoute} url="/projections/proj-1/snapshot/snap-2" />
);

export const ApproveDialogOpen: Story = () => (
  // proj-3 is in "Review" — the approve dialog opens via a portal to document.body.
  <PageStory route={projectionDetailRoute} url="/projections/proj-3" />
);

export const Loading: Story = () => (
  <PageStory route={projectionDetailRoute} url="/projections/proj-1" client={{ pending: true }} />
);

export const NotFound: Story = () => (
  <PageStory
    route={projectionDetailRoute}
    url="/projections/proj-404"
    client={{ fixtures: DEFAULT_FIXTURES }}
  />
);
