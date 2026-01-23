<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
    <Loader2 class="w-4 h-4 animate-spin text-blue-600" />
    <span class="text-sm text-gray-500 italic">Analyzing item and researching prices...</span>
  </div>
</template>
