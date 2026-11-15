import type { Story } from "@ladle/react";
import { PageStory } from "@/testing/page-story";
import { projectionsRoute } from "./Projections";

export default { title: "Pages / projections" };

export const Default: Story = () => <PageStory route={projectionsRoute} url="/projections" />;

export const Loading: Story = () => (
  <PageStory route={projectionsRoute} url="/projections" client={{ pending: true }} />
);

export const Empty: Story = () => (
  <PageStory route={projectionsRoute} url="/projections" client={{ fixtures: { projections: [] } }} />
);
