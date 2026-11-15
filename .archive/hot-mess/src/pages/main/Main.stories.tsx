import type { Story } from "@ladle/react";
import { PageStory } from "@/testing/page-story";
import { mainRoute } from "./Main";

export default { title: "Pages / main" };

export const Default: Story = () => <PageStory route={mainRoute} />;
