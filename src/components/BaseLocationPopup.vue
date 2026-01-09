<template>
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
    <div class="bg-black border-2 border-white p-8 shadow-2xl max-w-md w-full mx-4">
      <h2 class="text-2xl font-bold text-center mb-4">
        {{ $t('baseLocation.title') }}
      </h2>
      <p class="text-center mb-6 text-gray-300">
        {{ $t('baseLocation.description') }}
      </p>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <input 
          v-model="locationInput"
          type="text"
          :placeholder="rotatingPlaceholder"
          class="w-full bg-gray-900 border border-white/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white"
          :disabled="isLoading"
        />
        
        <div v-if="error" class="text-red-500 text-sm text-center">
          {{ error }}
        </div>
        
        <div class="flex gap-4">
          <BaseButton 
            type="button"
            class="flex-1"
            base-class="flex-1 cursor-pointer font-bold py-3 px-4 border border-white/50 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :label="$t('baseLocation.useGPS')"
            :disabled="isLoading"
            @click="useCurrentLocation"
          />
          
          <BaseButton 
            type="submit"
            class="flex-1"
            base-class="flex-1 cursor-pointer font-bold py-3 px-4 border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :label="!isLoading ? $t('baseLocation.confirm') : $t('baseLocation.loading')"
            :disabled="isLoading"
          />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseButton from '@/components/UI/BaseButton.vue';
import { BASE_LOCATION_PLACEHOLDERS_ES, BASE_LOCATION_PLACEHOLDERS_EN } from '@/constants/baseLocationPlaceholders';
const { t, locale } = useI18n();

const emit = defineEmits(['location-selected', 'use-gps']);

const locationInput = ref('');
const error = ref('');
const isLoading = ref(false);

const placeholderIndex = ref(Math.floor(Math.random() * (locale.value === 'es' ? BASE_LOCATION_PLACEHOLDERS_ES.length : BASE_LOCATION_PLACEHOLDERS_EN.length)));
let intervalId = null;

const placeholders = computed(() => {
  return locale.value === 'es' ? BASE_LOCATION_PLACEHOLDERS_ES : BASE_LOCATION_PLACEHOLDERS_EN;
});

const getPrefix = computed(() => locale.value === 'es' ? 'ej. ' : 'e.g. ');
const rotatingPlaceholder = computed(() => getPrefix.value + placeholders.value[placeholderIndex.value % placeholders.value.length]);

onMounted(() => {
  intervalId = setInterval(() => {
    placeholderIndex.value = (placeholderIndex.value + 1) % placeholders.value.length;
  }, 2000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

const handleSubmit = async () => {
  const queryText = locationInput.value.trim() || placeholders.value[placeholderIndex.value % placeholders.value.length];
  error.value = '';
  isLoading.value = true;
  try {
    const query = encodeURIComponent(queryText);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const { lat, lon, display_name } = data[0];
      emit('location-selected', {
        lat: parseFloat(lat),
        lng: parseFloat(lon),
        name: display_name
      });
    } else {
      error.value = t('baseLocation.notFound');
    }
  } catch (err) {
    console.error('Error al buscar ubicación:', err);
    error.value = t('baseLocation.error');
  } finally {
    isLoading.value = false;
  }
};

const useCurrentLocation = () => {
  emit('use-gps');
};
</script>
