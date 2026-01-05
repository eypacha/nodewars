<template>
  <div class="poi-dialog">
    <div class="poi-dialog-content">
      <div class="poi-header">
        <h3>{{ poi.name }}</h3>
        <button @click="$emit('close')" class="close-btn">✕</button>
      </div>
      <div class="poi-info">
        <span class="poi-type" :style="{ backgroundColor: poi.color }">
          {{ poi.type }}
        </span>
      </div>
      <!-- Aquí irán más botones en el futuro -->
    </div>
  </div>
</template>

<script setup>
defineProps({
  poi: {
    type: Object,
    required: true,
  },
});

defineEmits(['close']);
</script>

<style scoped>
.poi-dialog {
  pointer-events: auto;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.poi-dialog-content {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 16px;
  min-width: 200px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}

.poi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.poi-header h3 {
  color: white;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  flex: 1;
  padding-right: 8px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.poi-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.poi-type {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  text-transform: capitalize;
}
</style>
