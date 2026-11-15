import type { Story } from "@ladle/react";
import { PageStory } from "@/testing/page-story";
import { importRoute } from "./Import";

export default { title: "Pages / import" };

export const Default: Story = () => <PageStory route={importRoute} />;
