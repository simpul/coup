<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { setUsername } from './utils/cookie';
onMounted(() => {
    window.addEventListener('beforeunload', () => {
        setUsername('');
    });
});
</script>

<style scoped>
</style>
