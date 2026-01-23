<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { Camera, Image as ImageIcon, Send, Trash2, Sparkles, X } from 'lucide-vue-next';
import axios from 'axios';
import MessageBubble from './components/MessageBubble.vue';
import LoadingBubble from './components/LoadingBubble.vue';
import ResultCard from './components/ResultCard.vue';
import type { WorkflowResult, MessageRole } from './types';

interface Message {
  id: string;
  role: MessageRole;
  content?: string;
  images?: string[];
  result?: WorkflowResult;
  timestamp: Date;
  loading?: boolean;
}

// Load initial state from sessionStorage
const savedMessages = sessionStorage.getItem('messages');
const savedImages = sessionStorage.getItem('selectedImages');

const messages = ref<Message[]>(savedMessages ? JSON.parse(savedMessages) : [
  {
    id: '1',
    role: 'assistant',
    content: 'Hi! I can help you identify items and estimate their resale value. Take a photo of an item to get started!',
    timestamp: new Date(),
  }
]);

const userInput = ref('');
const selectedImages = ref<string[]>(savedImages ? JSON.parse(savedImages) : []);
const isProcessing = ref(false);
const messagesArea = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const captureInput = ref<HTMLInputElement | null>(null);
const showCamera = ref(false);
const video = ref<HTMLVideoElement | null>(null);
const MAX_IMAGE_DIMENSION = 1280;
const JPEG_QUALITY = 0.75;

// Persist state to sessionStorage
watch(messages, (newMessages) => {
  try {
    sessionStorage.setItem('messages', JSON.stringify(newMessages));
  } catch (e) {
    console.warn('Failed to save messages to sessionStorage:', e);
  }
}, { deep: true });

watch(selectedImages, (newImages) => {
  try {
    sessionStorage.setItem('selectedImages', JSON.stringify(newImages));
  } catch (e) {
    console.warn('Failed to save images to sessionStorage:', e);
  }
}, { deep: true });

const scrollToBottom = async () => {
  await nextTick();
  if (messagesArea.value) {
    messagesArea.value.scrollTop = messagesArea.value.scrollHeight;
  }
};

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => resolve(e.target?.result as string);
  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

const downscaleImage = (dataUrl: string) => new Promise<string>((resolve) => {
  const img = new Image();
  img.onload = () => {
    const maxDim = Math.max(img.width, img.height);
    if (!maxDim || maxDim <= MAX_IMAGE_DIMENSION) {
      resolve(dataUrl);
      return;
    }
    const scale = MAX_IMAGE_DIMENSION / maxDim;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(dataUrl);
      return;
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
  };
  img.onerror = () => resolve(dataUrl);
  img.src = dataUrl;
});

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files) return;

  for (const file of Array.from(files)) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const resized = await downscaleImage(dataUrl);
      selectedImages.value.push(resized);
    } catch (error) {
      console.warn('Failed to process image:', error);
    }
  }
};

const removeImage = (index: number) => {
  selectedImages.value.splice(index, 1);
};

const triggerCamera = () => {
  fileInput.value?.click();
};

const startCamera = async () => {
  try {
    showCamera.value = true;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    await nextTick();
    if (video.value) {
      video.value.srcObject = stream;
    }
  } catch (err) {
    console.error("Error accessing camera:", err);
    showCamera.value = false;
    alert("Could not access camera. Please ensure you have granted permissions.");
  }
};

const stopCamera = () => {
  if (video.value && video.value.srcObject) {
    const stream = video.value.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
    video.value.srcObject = null;
  }
  showCamera.value = false;
};

const takePhoto = () => {
  if (video.value) {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(video.value.videoWidth, video.value.videoHeight));
    canvas.width = Math.round(video.value.videoWidth * scale);
    canvas.height = Math.round(video.value.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video.value, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    selectedImages.value.push(dataUrl);
    stopCamera();
  }
};

const triggerCapture = () => {
  const canUseCamera = !!(navigator.mediaDevices?.getUserMedia) && window.isSecureContext;
  if (!canUseCamera) {
    captureInput.value?.click();
    return;
  }
  startCamera();
};

const confidenceClass = (confidence: number) => {
  if (confidence >= 80) return 'bg-green-50 text-green-700 ring-1 ring-green-200';
  if (confidence >= 60) return 'bg-teal-50 text-teal-700 ring-1 ring-teal-200';
  if (confidence >= 40) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  if (confidence >= 20) return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
  return 'bg-red-50 text-red-700 ring-1 ring-red-200';
};

const handleSubmit = async () => {
  if (isProcessing.value || selectedImages.value.length === 0) return;

  const userMsgId = Date.now().toString();
  const currentImages = [...selectedImages.value];
  const currentText = userInput.value;

  // Add user message
  messages.value.push({
    id: userMsgId,
    role: 'user',
    content: currentText,
    images: currentImages,
    timestamp: new Date(),
  });

  // Reset inputs
  userInput.value = '';
  selectedImages.value = [];
  isProcessing.value = true;
  await scrollToBottom();

  // Add loading assistant message
  const assistantMsgId = (Date.now() + 1).toString();
  messages.value.push({
    id: assistantMsgId,
    role: 'assistant',
    loading: true,
    timestamp: new Date(),
  });
  await scrollToBottom();

  try {
    // Call Mastra Workflow API
    // Note: Assuming Mastra is serving workflows at /api/workflows
    const formattedImages = currentImages.map(img => {
      const mimeMatch = img.match(/^data:(.*?);base64,/);
      return {
        url: img,
        mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg'
      };
    });

    const response = await axios.post('/api/workflows/pricingWorkflow/start-async', {
      inputData: {
        images: formattedImages,
        description: currentText ? currentText : undefined,
      }
    });

    console.log('Workflow response:', response.data);

    if (response.data.status === 'failed') {
      throw new Error(response.data.error || 'Workflow failed');
    }

    const result = response.data.steps?.['identify-and-price']?.output || response.data.results || response.data.output;

    // Update assistant message with result
    const msgIdx = messages.value.findIndex(m => m.id === assistantMsgId);
    if (msgIdx !== -1) {
      messages.value[msgIdx] = {
        ...messages.value[msgIdx],
        loading: false,
        result: result as WorkflowResult,
      };
    }
  } catch (error) {
    console.error('Workflow error:', error);
    console.log('Workflow error: ', error);
    const msgIdx = messages.value.findIndex(m => m.id === assistantMsgId);
    if (msgIdx !== -1) {
      messages.value[msgIdx] = {
        ...messages.value[msgIdx],
        loading: false,
        content: 'Sorry, I encountered an error while processing those images. Please try again.',
      };
    }
  } finally {
    isProcessing.value = false;
    await scrollToBottom();
  }
};

onMounted(() => {
  scrollToBottom();
});
</script>

<template>
  <div class="chat-container bg-gray-50 max-w-2xl mx-auto shadow-xl ring-1 ring-gray-200">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div class="flex items-center gap-2">
        <div class="bg-blue-600 p-2 rounded-lg">
          <Sparkles class="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 class="font-bold text-gray-900 leading-none">Treasure or Trash</h1>
          <span class="text-xs text-green-600 font-medium">AI Pricing Expert</span>
        </div>
      </div>
    </header>

    <!-- Messages Area -->
    <main ref="messagesArea" class="messages-area space-y-6">
      <div v-for="message in messages" :key="message.id" 
           :class="['message-animate flex flex-col', message.role === 'user' ? 'items-end' : 'items-start']">
        
        <!-- User Images -->
        <div v-if="message.images && message.images.length > 0" class="flex gap-2 mb-2 flex-wrap justify-end">
          <img v-for="(img, idx) in message.images" :key="idx" :src="img" 
               class="w-32 h-32 object-cover rounded-xl border-2 border-white shadow-sm" />
        </div>

        <!-- Text Bubble -->
        <MessageBubble v-if="message.content" :role="message.role" :content="message.content" />

        <!-- Result Card -->
        <ResultCard v-if="message.result" :result="message.result" :confidence-class="confidenceClass" />

        <!-- Loading State -->
        <LoadingBubble v-if="message.loading" />
      </div>
    </main>

    <!-- Input Area -->
    <footer class="bg-white border-t border-gray-200 p-4 absolute bottom-0 left-0 right-0 max-w-2xl mx-auto">
      <!-- Image Previews -->
      <div v-if="selectedImages.length > 0" class="flex gap-2 mb-4 pb-2">
        <div v-for="(img, idx) in selectedImages" :key="idx" class="relative shrink-0">
          <img :src="img" class="w-16 h-16 object-cover rounded-lg border border-gray-200" />
          <button @click="removeImage(idx)" 
                  class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600">
            <Trash2 class="w-3 h-3" />
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileSelect" />
        <input ref="captureInput" type="file" accept="image/*" capture="environment" class="hidden" @change="handleFileSelect" />
        
        <button @click="triggerCamera" 
                class="p-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
          <ImageIcon class="w-6 h-6" />
        </button>

        <button @click="triggerCapture" 
                class="p-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
          <Camera class="w-6 h-6" />
        </button>

        <div class="relative flex-1">
          <input v-model="userInput" 
                 @keyup.enter="handleSubmit"
                 placeholder="Add a message (optional)..." 
                 class="w-full bg-gray-100 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" />
        </div>

        <button @click="handleSubmit" 
                :disabled="isProcessing || selectedImages.length === 0"
                class="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0">
          <Send class="w-6 h-6" />
        </button>
      </div>
    </footer>

    <!-- Camera Modal -->
    <div v-if="showCamera" class="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div class="relative bg-black rounded-3xl overflow-hidden w-full max-w-md aspect-[3/4] shadow-2xl border border-gray-800">
        <video ref="video" autoplay playsinline class="w-full h-full object-cover"></video>
        
        <!-- Controls Overlay -->
        <div class="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent">
          <button @click="stopCamera" class="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all">
            <X class="w-6 h-6" />
          </button>
          
          <button @click="takePhoto" class="p-1 border-4 border-white rounded-full transition-transform active:scale-95">
            <div class="w-16 h-16 bg-white rounded-full"></div>
          </button>
          
          <div class="w-12"></div> <!-- Spacer for layout balance -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  position: relative;
}
</style>
