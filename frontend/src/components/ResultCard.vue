<script setup lang="ts">
import type { WorkflowResult } from '../types';
import { TrendingUp, ShieldCheck } from 'lucide-vue-next';
import SourceIcon from './SourceIcon.vue';

const props = defineProps<{
  result: WorkflowResult;
  confidenceClass: (confidence: number) => string;
}>();
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-md max-w-[90%] space-y-3">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h3 class="font-bold text-gray-900 text-lg">{{ props.result.item.name }}</h3>
      </div>
      <div :class="['px-2 py-1 rounded-md flex items-center gap-1 shrink-0', props.confidenceClass(props.result.confidence)]">
        <ShieldCheck class="w-4 h-4" />
        <span class="text-xs font-bold">{{ props.result.confidence }}%</span>
      </div>
    </div>

            <p class="text-gray-600 text-sm leading-relaxed">{{ props.result.item.description }}</p>


    <div class="bg-gray-50 rounded-xl p-3 flex items-center justify-between border border-gray-100">
      <div class="flex items-center gap-2">
        <TrendingUp class="w-5 h-5 text-blue-600" />
        <span class="text-sm font-medium text-gray-700">Estimated Value</span>
      </div>
      <div class="text-lg font-black text-gray-900">
        ${{ props.result.price.low }} - ${{ props.result.price.high }}
      </div>
    </div>

    <div v-if="props.result.sources?.length" class="pt-1">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sources</div>
      <div class="flex flex-wrap gap-2">
        <a
          v-for="(source, idx) in props.result.sources"
          :key="idx"
          :href="source.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-700 transition-colors"
        >
          <SourceIcon :type="source.type" />
          <span>{{ source.type }}</span>
        </a>
      </div>
    </div>
  </div>
</template>
