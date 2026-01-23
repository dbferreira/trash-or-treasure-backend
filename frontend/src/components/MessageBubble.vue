<script setup lang="ts">
import type { MessageRole } from '../types';

const props = defineProps<{
  role: MessageRole;
  content: string;
}>();
</script>

<template>
  <div
    :class="[
      'px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm',
      props.role === 'user'
        ? 'bg-blue-600 text-white rounded-tr-none'
        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
    ]"
  >
    {{ props.content }}
  </div>
</template>
