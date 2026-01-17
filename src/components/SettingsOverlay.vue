<template>
  <div class="fixed inset-0 z-[2600] flex items-center justify-center bg-black/70 text-white">
    <div class="w-full max-w-sm border border-white/60 bg-black/90 p-6 text-center">
      <h2 class="text-2xl font-bold mb-3">{{ t('settings.title') }}</h2>
      <div class="border border-white/40 p-4 text-left">
        <h3 class="text-sm font-bold mb-2">{{ t('settings.language') }}</h3>
        <div class="flex gap-2">
          <button
            class="flex-1 border px-3 py-2 text-sm font-semibold"
            :class="locale === 'es' ? 'bg-white text-black' : 'border-white/60'"
            type="button"
            @click="setLocale('es')"
          >
            {{ t('settings.spanish') }}
          </button>
          <button
            class="flex-1 border px-3 py-2 text-sm font-semibold"
            :class="locale === 'en' ? 'bg-white text-black' : 'border-white/60'"
            type="button"
            @click="setLocale('en')"
          >
            {{ t('settings.english') }}
          </button>
        </div>
      </div>
      <BaseButton
        full-width
        block
        base-class="cursor-pointer font-bold py-3 px-6 border-1 text-lg mx-auto block w-full mt-5"
        :label="t('stats.back')"
        @click="$emit('back')"
      />
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import BaseButton from '@/components/UI/BaseButton.vue';

defineEmits(['back']);

const { t, locale } = useI18n();

const setLocale = (value) => {
  locale.value = value;
  localStorage.setItem('locale', value);
};
</script>
