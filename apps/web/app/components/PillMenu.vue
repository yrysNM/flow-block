<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-full border border-[#E4E9F2] bg-white px-3.5 py-2 text-sm text-ink shadow-[0_1px_2px_rgb(23_32_51/0.04)]"
      :aria-expanded="open"
      :aria-haspopup="true"
      @click="open = !open"
    >
      <span>{{ label }}</span>
      <span class="font-medium text-secondary">{{ currentLabel }}</span>
    </button>
    <div
      v-if="open"
      class="absolute left-0 z-30 mt-2 min-w-44 rounded-2xl border border-line bg-white p-1.5 shadow-card"
      role="listbox"
      :aria-label="label"
    >
      <button
        v-for="option in options"
        :key="option.id || 'all'"
        type="button"
        role="option"
        class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-background"
        :class="option.id === model ? 'bg-primary/10 font-medium text-primary' : 'text-ink'"
        :aria-selected="option.id === model"
        @click="choose(option.id)"
      >
        <span v-if="option.color" class="size-2.5 shrink-0 rounded-full" :style="{ background: option.color }" />
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface PillOption {
  id: string
  label: string
  color?: string
}

const model = defineModel<string>({ required: true })
const props = defineProps<{
  label: string
  options: PillOption[]
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const currentLabel = computed(() => props.options.find((option) => option.id === model.value)?.label ?? 'All')

function choose(id: string) {
  model.value = id
  open.value = false
}

function onPointer(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointer)
  document.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointer)
  document.removeEventListener('keydown', onKey)
})
</script>
