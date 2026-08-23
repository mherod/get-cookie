<script lang="ts">
import DefaultTheme from "vitepress/theme";
import HomeHeroVisual from "./components/HomeHeroVisual.vue";
import HomeStory from "./components/HomeStory.vue";

export default {
  components: {
    Layout: DefaultTheme.Layout,
    HomeHeroVisual,
    HomeStory,
  },
};
</script>

<template>
  <Layout>
    <template #home-hero-info-before>
      <p class="cookie-kicker">
        <span class="cookie-kicker__dot" aria-hidden="true"></span>
        Local profile toolkit
      </p>
    </template>

    <template #home-hero-image>
      <HomeHeroVisual />
    </template>

    <template #home-hero-actions-after>
      <div class="cookie-proof" aria-label="Supported environments">
        <span>Chrome</span>
        <span>Firefox</span>
        <span>Safari</span>
        <span class="cookie-proof__divider" aria-hidden="true"></span>
        <span>Node.js</span>
        <span>Bun</span>
      </div>
    </template>

    <template #home-features-after>
      <HomeStory />
    </template>
  </Layout>
</template>
