import type { Story } from "@ladle/react";
import { PageStory } from "@/testing/page-story";
import { DEFAULT_FIXTURES } from "@/testing/fixtures";
import { streamRoute } from "./Stream";

export default { title: "Pages / stream" };

export const Default: Story = () => <PageStory route={streamRoute} url="/stream" />;

export const Loading: Story = () => (
  <PageStory route={streamRoute} url="/stream" client={{ pending: true }} />
);

export const Empty: Story = () => (
  <PageStory route={streamRoute} url="/stream" client={{ fixtures: { view_stream: [] } }} />
);

export const LoadError: Story = () => (
  <PageStory route={streamRoute} url="/stream" client={{ failing: true }} />
);

export const FragmentOpen: Story = () => (
  <PageStory
    route={streamRoute}
    url="/stream/frag-1"
    client={{ fixtures: DEFAULT_FIXTURES }}
  />
);
