<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style>
/* Global resets to eliminate stray scrollbars */
html, body, #__nuxt {
  height: 100%;
}

html, body {
  margin: 0;
  padding: 0;
  overflow: hidden; /* prevent any page-level scrollbars */
  overscroll-behavior: none; /* avoid rubber band scroll on mobile */
}

/* Helpful default */
*, *::before, *::after {
  box-sizing: border-box;
}
</style>
