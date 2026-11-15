import type { Story } from "@ladle/react";
import { PageStory } from "@/testing/page-story";
import { splashRoute } from "./Splash";

export default { title: "Pages / splash" };

export const Default: Story = () => (
  <PageStory route={splashRoute} url="/splash" stage={{ stage: "bootstrap" }} />
);
