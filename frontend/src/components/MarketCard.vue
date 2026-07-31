<template>
  <v-card class="mb-3" variant="outlined">
    <v-card-title class="text-h6">{{ market.name }}</v-card-title>
    <v-card-subtitle class="text-body-2">
      <v-icon size="16" class="me-1">mdi-map-marker</v-icon>{{ market.location }}
    </v-card-subtitle>
    <v-card-text class="pt-2">
      <div class="mb-2">
        <v-chip size="small" color="primary" variant="tonal" class="me-2">{{ market.scheduleRule }}</v-chip>
        <v-chip v-if="market.timeRange" size="small" variant="tonal">{{ market.timeRange }}</v-chip>
      </div>
      <div v-if="market.theme" class="text-body-2 text-medium-emphasis mb-2">
        {{ market.theme }}
      </div>
      <div v-if="market.scale" class="text-caption">
        <v-icon size="14" class="me-1">mdi-storefront</v-icon>{{ market.scale }}
      </div>
      <div v-if="market.driveTimeMin != null" class="text-caption mt-1">
        <v-icon size="14" class="me-1">mdi-car</v-icon>
        通天閣 → {{ market.driveTimeMin }} 分鐘
        <span v-if="market.tollYen != null"> · ¥{{ market.tollYen.toLocaleString() }}</span>
        <span v-if="market.route"> · {{ market.route }}</span>
      </div>
      <div v-if="market.notes" class="text-caption text-medium-emphasis mt-2">
        <v-icon size="14" class="me-1">mdi-lightbulb-outline</v-icon>{{ market.notes }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({ market: { type: Object, required: true } });
</script>
