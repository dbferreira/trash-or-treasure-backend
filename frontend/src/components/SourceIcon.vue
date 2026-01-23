<script setup lang="ts">
import { computed } from 'vue';
import { Facebook, Store, Link as LinkIcon } from 'lucide-vue-next';

const props = defineProps<{
  type: string;
}>();

const icon = computed(() => {
  const normalized = props.type.toLowerCase();
  if (normalized.includes('facebook')) return Facebook;
  if (normalized.includes('kijiji')) return Store;
  if (normalized.includes('marketplace')) return Facebook;
  return LinkIcon;
});
</script>

<template>
  <component :is="icon" class="w-3.5 h-3.5 text-blue-500" />
</template>
