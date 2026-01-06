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
          :placeholder="$t('baseLocation.placeholder')"
          class="w-full bg-gray-900 border border-white/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white"
          :disabled="isLoading"
        />
        
        <div v-if="error" class="text-red-500 text-sm text-center">
          {{ error }}
        </div>
        
        <div class="flex gap-4">
          <button 
            type="button"
            @click="useCurrentLocation"
            class="flex-1 cursor-pointer font-bold py-3 px-4 border border-white/50 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isLoading"
          >
            {{ $t('baseLocation.useGPS') }}
          </button>
          
          <button 
            type="submit"
            class="flex-1 cursor-pointer font-bold py-3 px-4 border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isLoading || !locationInput.trim()"
          >
            <span v-if="!isLoading">{{ $t('baseLocation.confirm') }}</span>
            <span v-else>{{ $t('baseLocation.loading') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const emit = defineEmits(['location-selected', 'use-gps']);

const locationInput = ref('');
const error = ref('');
const isLoading = ref(false);

const handleSubmit = async () => {
  if (!locationInput.value.trim()) return;
  
  error.value = '';
  isLoading.value = true;
  
  try {
    // Usar Nominatim de OpenStreetMap para geocoding
    const query = encodeURIComponent(locationInput.value);
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
